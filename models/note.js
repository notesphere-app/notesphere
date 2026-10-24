const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const noteSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    description: { type: String, trim: true, maxlength: 2000, default: "" },
    sourceUrl: { type: String, required: true, trim: true, maxlength: 2048 },
    course: { type: String, required: true, trim: true, maxlength: 80 },
    courseId: { type: Schema.Types.ObjectId, ref: "Course" },
    specialization: { type: String, trim: true, maxlength: 100, default: "" },
    semester: { type: Number, min: 1, max: 12 },
    university: { type: String, trim: true, maxlength: 160, default: "" },
    college: { type: String, trim: true, maxlength: 160, default: "" },
    subject: { type: String, required: true, trim: true, maxlength: 100 },
    type: {
      type: String,
      enum: ["handwritten", "typed", "solved", "pdf"],
      default: "pdf",
    },
    author: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isPublished: { type: Boolean, default: false },
    moderationStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    moderatedAt: { type: Date, default: null },
    moderatedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
    comments: [
      {
        text: { type: String, required: true, maxlength: 1000 },
        user: { type: Schema.Types.ObjectId, ref: "User", required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    downloadCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

noteSchema.index({ isPublished: 1, course: 1, createdAt: -1 });
noteSchema.index({ isPublished: 1, courseId: 1, specialization: 1, semester: 1 });
noteSchema.index({ isPublished: 1, university: 1, college: 1 });

module.exports = mongoose.model("Note", noteSchema);
