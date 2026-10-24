const mongoose = require("mongoose");

const authActivitySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    email: { type: String, trim: true, lowercase: true, maxlength: 254, default: "" },
    event: { type: String, enum: ["login", "password_reset"], required: true },
    outcome: {
      type: String,
      enum: ["pending", "success", "failed", "unverified", "blocked", "challenge_rejected", "requested", "unknown_account", "invalid_link"],
      required: true,
    },
    details: { type: String, trim: true, maxlength: 160, default: "" },
    path: { type: String, trim: true, maxlength: 200, default: "" },
    ipHash: { type: String, trim: true, maxlength: 64, default: "" },
    device: { type: String, trim: true, maxlength: 32, default: "unknown" },
    browser: { type: String, trim: true, maxlength: 32, default: "unknown" },
  },
  { timestamps: true },
);

authActivitySchema.index({ user: 1, createdAt: -1 });
authActivitySchema.index({ email: 1, createdAt: -1 });

module.exports = mongoose.model("AuthActivity", authActivitySchema);
