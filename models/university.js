const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const universitySchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    normalizedName: { type: String, required: true, trim: true, lowercase: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);

universitySchema.virtual("colleges", {
  ref: "College",
  localField: "_id",
  foreignField: "university",
});
universitySchema.set("toObject", { virtuals: true });
universitySchema.set("toJSON", { virtuals: true });

universitySchema.index({ normalizedName: 1 }, { unique: true });
universitySchema.index({ isActive: 1, name: 1 });

module.exports = mongoose.model("University", universitySchema);
