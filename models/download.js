const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const downloadSchema = new Schema({
  note: { type: Schema.Types.ObjectId, ref: "Note", required: true },
  course: { type: Schema.Types.ObjectId, ref: "Course", default: null },
  user: { type: Schema.Types.ObjectId, ref: "User", default: null },
  isGuest: { type: Boolean, default: true },
  university: { type: String, trim: true, maxlength: 160, default: "" },
  college: { type: String, trim: true, maxlength: 160, default: "" },
  device: {
    category: {
      type: String,
      enum: ["mobile", "tablet", "desktop", "unknown"],
      default: "unknown",
    },
    browser: { type: String, default: "unknown" },
  },
  downloadedAt: { type: Date, default: Date.now },
});

downloadSchema.index({ note: 1, downloadedAt: -1 });
downloadSchema.index({ user: 1, downloadedAt: -1 });

module.exports = mongoose.model("Download", downloadSchema);
