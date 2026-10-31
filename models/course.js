const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const courseSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
    specializations: [{ type: String, trim: true, maxlength: 100 }],
    semesterCount: { type: Number, required: true, min: 1, max: 12 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

courseSchema.index({ isActive: 1, name: 1 });

module.exports = mongoose.model("Course", courseSchema);
