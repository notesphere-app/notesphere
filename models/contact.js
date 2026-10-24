const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const contactSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },

  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    maxlength: 254,
  },
  subject: {
    type: String,
    enum: [
      "General question",
      "Report a bug",
      "Report a note",
      "Partnership",
      "Feature request",
      "Something else",
    ],
    required: true,
  },

  message: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  msgDate: {
    type: Date,
    required: true,
    default: Date.now,
  },
  isSeen: {
    type: Boolean,
    default: false,
  },
  isGuest: {
    type: Boolean,
    default: true,
  },
  ipHash: {
    type: String,
    default: "",
  },
  device: {
    category: { type: String, enum: ["mobile", "tablet", "desktop", "unknown"], default: "unknown" },
    browser: { type: String, default: "unknown" },
  },
  source: {
    type: String,
    maxlength: 200,
    default: "",
  },
});

contactSchema.index({ isSeen: 1, msgDate: -1 });

module.exports = mongoose.model("Contact", contactSchema);
