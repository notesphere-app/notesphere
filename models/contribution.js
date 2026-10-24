const mongoose = require("mongoose");

const contributionSchema = new mongoose.Schema(
  {
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String, unique: true, sparse: true },
    amount: { type: Number, required: true, min: 1000, max: 100000000 },
    currency: { type: String, enum: ["INR"], default: "INR" },
    status: { type: String, enum: ["created", "paid"], default: "created" },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    isGuest: { type: Boolean, default: true },
    contributorName: { type: String, trim: true, maxlength: 100, default: "" },
    contributorEmail: { type: String, trim: true, lowercase: true, maxlength: 254, default: "" },
    sourcePage: { type: String, trim: true, maxlength: 200, default: "" },
    paymentMethod: { type: String, trim: true, maxlength: 40, default: "" },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true },
);

contributionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Contribution", contributionSchema);
