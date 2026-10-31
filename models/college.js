const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const collegeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    normalizedName: { type: String, required: true, trim: true, lowercase: true },
    university: { type: Schema.Types.ObjectId, ref: "University", required: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

collegeSchema.index({ university: 1, normalizedName: 1 }, { unique: true });
collegeSchema.index({ university: 1, isActive: 1, name: 1 });

module.exports = mongoose.model("College", collegeSchema);
