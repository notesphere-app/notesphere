const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const subscriberSchema = new Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    unique: true,
    trim: true,
  },
  subscribedAt: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: false,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  verificationCodeHash: {
    type: String,
    select: false,
  },
  verificationCodeExpires: {
    type: Date,
    select: false,
  },
  verificationRequestedAt: {
    type: Date,
  },
  verificationAttempts: {
    type: Number,
    default: 0,
    select: false,
  },
});

subscriberSchema.index({ isActive: 1, subscribedAt: -1 });

module.exports = mongoose.model("Subscriber", subscriberSchema);
