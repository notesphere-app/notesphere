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
  },
  subject: {
    type: String,
    enum: [
      "Course Inquiry",
      "Certification Questions",
      "Technical Support",
      "Billing and Payments",
      "Partnership Opportunities",
      "Service",
      "other",
    ],
    required: true,
  },

  message: {
    type: String,
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

  gps: {
    latitude: Number,
    longitude: Number,
  },
});

module.exports = mongoose.model("Contact", contactSchema);
