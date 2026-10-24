const crypto = require("crypto");
const brevo = require("@getbrevo/brevo");
const Contact = require("../models/contact");
const Subscriber = require("../models/subscriber");
const { getDeviceDetails, hashIp } = require("../utils/requestMetadata");
const { getEmailSender } = require("../utils/emailSender");
const { renderEmail } = require("../utils/emailTemplate");

const OTP_EXPIRY_MS = 10 * 60 * 1000;
const OTP_RESEND_DELAY_MS = 60 * 1000;

const emailApi = new brevo.TransactionalEmailsApi();
if (process.env.BREVO_API_KEY) {
  emailApi.setApiKey(
    brevo.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY,
  );
}

function hashOtp(email, otp) {
  const secret = process.env.SECRET;
  if (!secret) throw new Error("SECRET must be configured to verify subscriptions.");
  return crypto
    .createHmac("sha256", secret)
    .update(`${email}:${otp}`)
    .digest("hex");
}

module.exports.contact = async (req, res) => {
  const { name, email, subject, message } = req.body;
  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const cleanMessage = typeof message === "string" ? message.trim() : "";
  const allowedSubjects = [
    "General question",
    "Report a bug",
    "Report a note",
    "Partnership",
    "Feature request",
    "Something else",
  ];

  if (
    !cleanName ||
    cleanName.length > 100 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) ||
    cleanEmail.length > 254 ||
    !allowedSubjects.includes(subject) ||
    !cleanMessage ||
    cleanMessage.length > 1000
  ) {
    return res.status(400).json({
      success: false,
      message: "Please provide a valid name, email, subject, and message (up to 1,000 characters).",
    });
  }

  const referrer = req.get("referer");
  let source = "";
  if (referrer) {
    try {
      source = new URL(referrer).pathname.slice(0, 200);
    } catch {
      source = "";
    }
  }

  await Contact.create({
    user: req.user?._id,
    name: cleanName,
    email: cleanEmail,
    subject,
    message: cleanMessage,
    isGuest: !req.user,
    ipHash: hashIp(req.ip),
    device: getDeviceDetails(req.get("user-agent") || ""),
    source,
  });

  res.json({ success: true, message: "Message sent successfully." });
};

module.exports.subscribe = async (req, res) => {
  const email =
    typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ success: false, message: "Enter a valid email address." });
  }

  const existing = await Subscriber.findOne({ email }).select(
    "+verificationCodeHash +verificationCodeExpires",
  );
  if (existing?.isActive && existing.isVerified) {
    return res.json({ success: true, message: "This email is already subscribed." });
  }

  const verifiedAccount = req.user?.isVerified && req.user.email === email;
  if (verifiedAccount) {
    await Subscriber.findOneAndUpdate(
      { email },
      {
        $set: { isActive: true, isVerified: true, subscribedAt: new Date() },
        $unset: {
          verificationCodeHash: 1,
          verificationCodeExpires: 1,
          verificationAttempts: 1,
        },
      },
      { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
    );
    return res.json({ success: true, message: "You are now subscribed." });
  }

  if (
    existing?.verificationRequestedAt &&
    Date.now() - existing.verificationRequestedAt.getTime() < OTP_RESEND_DELAY_MS
  ) {
    return res.status(202).json({
      success: true,
      verificationRequired: true,
      email,
      message: "A code was recently sent. Please check your inbox before requesting another.",
    });
  }

  if (!process.env.BREVO_API_KEY || !process.env.SECRET) {
    return res.status(503).json({
      success: false,
      message: "Email verification is temporarily unavailable. Please try again later.",
    });
  }

  const otp = crypto.randomInt(100000, 1000000).toString();
  const requestedAt = new Date();
  const subscriber =
    existing ||
    new Subscriber({
      email,
      subscribedAt: requestedAt,
      isActive: false,
      isVerified: false,
    });
  subscriber.verificationCodeHash = hashOtp(email, otp);
  subscriber.verificationCodeExpires = new Date(Date.now() + OTP_EXPIRY_MS);
  subscriber.verificationRequestedAt = requestedAt;
  subscriber.verificationAttempts = 0;
  await subscriber.save();

  try {
    const htmlContent = renderEmail({
      title: "Verify your newsletter subscription",
      greeting: "there",
      paragraphs: ["Enter this code to confirm that you want to receive NoteSphere updates."],
      code: otp,
      notice: "This code expires in 10 minutes. If you did not request this, ignore this email.",
    });
    await emailApi.sendTransacEmail({
      sender: getEmailSender(),
      to: [{ email }],
      subject: "Verify your NoteSphere newsletter subscription",
      htmlContent,
      textContent: `Your NoteSphere newsletter verification code is ${otp}. It expires in 10 minutes. If you did not request this, ignore this email.`,
    });
  } catch (error) {
    subscriber.verificationCodeHash = undefined;
    subscriber.verificationCodeExpires = undefined;
    subscriber.verificationRequestedAt = undefined;
    await subscriber.save();
    console.error("Newsletter verification email failed:", error);
    return res.status(502).json({
      success: false,
      message: "We could not send the verification email. Please try again later.",
    });
  }

  return res.status(202).json({
    success: true,
    verificationRequired: true,
    email,
    message: "Enter the 6-digit code sent to your email to confirm your subscription.",
  });
};

module.exports.verifySubscription = async (req, res) => {
  const email =
    typeof req.body.email === "string" ? req.body.email.trim().toLowerCase() : "";
  const otp = typeof req.body.otp === "string" ? req.body.otp.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ success: false, message: "Enter a valid email and 6-digit code." });
  }

  const subscriber = await Subscriber.findOne({ email }).select(
    "+verificationCodeHash +verificationCodeExpires +verificationAttempts",
  );
  if (!subscriber || !subscriber.verificationCodeHash) {
    return res.status(400).json({
      success: false,
      message: "No active verification request was found. Please request a new code.",
    });
  }
  if (!subscriber.verificationCodeExpires || subscriber.verificationCodeExpires < new Date()) {
    return res.status(400).json({
      success: false,
      message: "That code has expired. Please request a new one.",
    });
  }

  const expected = Buffer.from(subscriber.verificationCodeHash, "hex");
  const supplied = Buffer.from(hashOtp(email, otp), "hex");
  if (expected.length !== supplied.length || !crypto.timingSafeEqual(expected, supplied)) {
    subscriber.verificationAttempts = (subscriber.verificationAttempts || 0) + 1;
    if (subscriber.verificationAttempts >= 5) {
      subscriber.verificationCodeHash = undefined;
      subscriber.verificationCodeExpires = undefined;
      await subscriber.save();
      return res.status(429).json({
        success: false,
        message: "Too many incorrect codes. Request a new verification code.",
      });
    }
    await subscriber.save();
    return res.status(400).json({ success: false, message: "That verification code is incorrect." });
  }

  subscriber.isVerified = true;
  subscriber.isActive = true;
  subscriber.subscribedAt = new Date();
  subscriber.verificationCodeHash = undefined;
  subscriber.verificationCodeExpires = undefined;
  subscriber.verificationAttempts = 0;
  await subscriber.save();
  return res.json({ success: true, message: "Email verified. You are now subscribed." });
};

module.exports.saveCookieConsent = async (req, res) => {
  if (typeof req.body.accepted !== "boolean") {
    return res.status(400).json({ success: false, message: "A cookie choice is required." });
  }
  const accepted = req.body.accepted === true;
  req.session.cookieConsent = {
    accepted,
    recordedAt: new Date().toISOString(),
  };
  res.json({ success: true });
};

module.exports.carriers = async (req, res) => {
  res.render("others/careers.ejs");
};
