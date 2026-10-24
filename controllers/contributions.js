const crypto = require("crypto");
const axios = require("axios");
const Contribution = require("../models/contribution");

const MIN_AMOUNT_PAISE = 1000;
const MAX_AMOUNT_PAISE = 100000000;

function getRazorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return null;
  }
  return { keyId, keySecret };
}

module.exports.createOrder = async (req, res) => {
  const { amount } = req.body || {};
  const rawName = typeof req.body?.name === "string" ? req.body.name.trim() : "";
  const rawEmail = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const submittedSource = typeof req.body?.sourcePage === "string" ? req.body.sourcePage.trim() : "";
  const sourcePage = /^\/(?!\/)[\w./-]{0,199}$/.test(submittedSource) ? submittedSource : "/";
  const contributorName = req.user
    ? String(req.user.name || req.user.username || "").trim().slice(0, 100)
    : rawName.slice(0, 100);
  const contributorEmail = req.user
    ? String(req.user.email || "").trim().toLowerCase().slice(0, 254)
    : rawEmail.slice(0, 254);
  const amountInRupees = Number(amount);
  const amountInPaise = Math.round(amountInRupees * 100);

  if (
    !Number.isFinite(amountInRupees) ||
    !Number.isInteger(amountInRupees) ||
    !Number.isSafeInteger(amountInPaise) ||
    amountInPaise < MIN_AMOUNT_PAISE ||
    amountInPaise > MAX_AMOUNT_PAISE
  ) {
    return res.status(400).json({
      success: false,
      message: "Choose an amount between ₹10 and ₹10,00,000.",
    });
  }
  if (
    (!req.user && rawName.length > 100) ||
    (!req.user && rawEmail.length > 254) ||
    (contributorEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contributorEmail))
  ) {
    return res.status(400).json({ success: false, message: "Check the optional name and email details." });
  }

  const credentials = getRazorpayCredentials();
  if (!credentials) {
    return res.status(503).json({
      success: false,
      message: "Online contributions are temporarily unavailable. Please try again later.",
    });
  }

  try {
    const receipt = `ns_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`;
    const { data: order } = await axios.post(
      "https://api.razorpay.com/v1/orders",
      {
        amount: amountInPaise,
        currency: "INR",
        receipt,
        notes: { product: "NoteSphere voluntary contribution" },
      },
      {
        auth: { username: credentials.keyId, password: credentials.keySecret },
        timeout: 10000,
      },
    );

    await Contribution.create({
      razorpayOrderId: order.id,
      amount: amountInPaise,
      user: req.user?._id || null,
      isGuest: !req.user,
      contributorName,
      contributorEmail,
      sourcePage,
    });

    return res.status(201).json({
      success: true,
      keyId: credentials.keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      name: "NoteSphere",
      description: "Voluntary contribution to support our student-run learning library",
      prefill: { name: contributorName, email: contributorEmail },
    });
  } catch (error) {
    console.error("Razorpay order creation failed:", error.response?.status || error.message);
    return res.status(502).json({
      success: false,
      message: "We could not start the payment. Please try again.",
    });
  }
};

module.exports.verifyPayment = async (req, res) => {
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body || {};
  if (
    typeof orderId !== "string" ||
    typeof paymentId !== "string" ||
    typeof signature !== "string" ||
    !orderId ||
    !paymentId ||
    !signature
  ) {
    return res.status(400).json({ success: false, message: "Payment verification details are incomplete." });
  }

  const credentials = getRazorpayCredentials();
  if (!credentials) {
    return res.status(503).json({ success: false, message: "Payment verification is unavailable." });
  }

  const expectedSignature = crypto
    .createHmac("sha256", credentials.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest();
  let suppliedSignature;
  try {
    suppliedSignature = Buffer.from(signature, "hex");
  } catch {
    suppliedSignature = Buffer.alloc(0);
  }
  if (
    suppliedSignature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(expectedSignature, suppliedSignature)
  ) {
    return res.status(400).json({ success: false, message: "Payment verification failed." });
  }

  try {
    const contribution = await Contribution.findOne({ razorpayOrderId: orderId });
    if (!contribution) {
      return res.status(404).json({ success: false, message: "The contribution order could not be found." });
    }
    if (contribution.status === "paid" && contribution.razorpayPaymentId === paymentId) {
      return res.json({ success: true, message: "Thank you for supporting NoteSphere." });
    }
    if (contribution.status !== "created") {
      return res.status(409).json({ success: false, message: "This contribution order has already been processed." });
    }

    const { data: payment } = await axios.get(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,
      {
        auth: { username: credentials.keyId, password: credentials.keySecret },
        timeout: 10000,
      },
    );
    if (
      payment.id !== paymentId ||
      payment.order_id !== orderId ||
      payment.amount !== contribution.amount ||
      payment.currency !== contribution.currency
    ) {
      return res.status(400).json({ success: false, message: "The payment details do not match this contribution." });
    }
    if (payment.status !== "captured") {
      return res.status(409).json({ success: false, message: "The payment has not been captured yet. Please retry shortly." });
    }

    contribution.razorpayPaymentId = paymentId;
    contribution.status = "paid";
    contribution.paidAt = new Date();
    contribution.paymentMethod = typeof payment.method === "string" ? payment.method.slice(0, 40) : "";
    await contribution.save();
    return res.json({ success: true, message: "Thank you for supporting NoteSphere." });
  } catch (error) {
    console.error("Razorpay payment verification persistence failed:", error.message);
    return res.status(500).json({
      success: false,
      message: "Payment was received, but we could not confirm it right now. Please contact support with your payment ID.",
    });
  }
};
