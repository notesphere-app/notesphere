const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const blogViewSchema = new Schema(
  {
    blog: { type: Schema.Types.ObjectId, ref: "Blog", required: true },
    visitorHash: { type: String, required: true, maxlength: 64 },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

blogViewSchema.index({ blog: 1, visitorHash: 1 }, { unique: true });

module.exports = mongoose.model("BlogView", blogViewSchema);
