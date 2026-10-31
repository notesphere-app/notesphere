const mongoose = require("mongoose");
const Course = require("../models/course");
const Note = require("../models/note");
const University = require("../models/university");
const College = require("../models/college");
const { parseNoteFields } = require("../utils/noteFields");

function parseCourseInput(body) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const semesters = Number(body.semesterCount);
  const specializations = (typeof body.specializations === "string" ? body.specializations : "")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
  if (
    !name ||
    name.length > 120 ||
    !Number.isInteger(semesters) ||
    semesters < 1 ||
    semesters > 12 ||
    specializations.length > 40 ||
    specializations.some((value) => value.length > 100)
  ) {
    return null;
  }

  return {
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    semesterCount: semesters,
    specializations: [...new Set(specializations)],
  };
}

module.exports.listCourses = async (req, res) => {
  const courses = await Course.find().sort({ name: 1 }).lean();
  const selected = mongoose.Types.ObjectId.isValid(req.query.edit)
    ? courses.find((course) => String(course._id) === req.query.edit)
    : null;
  res.render("admin/courses.ejs", { courses, selected });
};

module.exports.saveCourse = async (req, res) => {
  const courseData = parseCourseInput(req.body);
  if (!courseData) {
    req.flash("error", "Check the course name, semester count, specializations, and campus list.");
    return res.redirect("/admin/courses");
  }
  const editId = req.params.id || (typeof req.body.courseId === "string" ? req.body.courseId : "");
  if (editId && !mongoose.Types.ObjectId.isValid(editId)) {
    req.flash("error", "Course not found.");
    return res.redirect("/admin/courses");
  }
  const duplicate = await Course.findOne({
    slug: courseData.slug,
    ...(editId ? { _id: { $ne: editId } } : {}),
  }).select("_id");
  if (duplicate) {
    req.flash("error", "A course with that name already exists.");
    return res.redirect("/admin/courses");
  }

  if (editId) {
    const course = await Course.findById(editId);
    if (!course) {
      req.flash("error", "Course not found.");
      return res.redirect("/admin/courses");
    }
    course.set(courseData);
    await course.save();
    req.flash("success", "Course updated.");
  } else {
    await Course.create({ ...courseData, createdBy: req.user._id });
    req.flash("success", "Course created.");
  }
  res.redirect("/admin/courses");
};

module.exports.toggleCourse = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    req.flash("error", "Course not found.");
    return res.redirect("/admin/courses");
  }
  const course = await Course.findById(req.params.id);
  if (!course) {
    req.flash("error", "Course not found.");
    return res.redirect("/admin/courses");
  }
  course.isActive = !course.isActive;
  await course.save();
  req.flash("success", `Course ${course.isActive ? "published" : "archived"}.`);
  res.redirect("/admin/courses");
};

module.exports.deleteCourse = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    req.flash("error", "Course not found.");
    return res.redirect("/admin/courses");
  }
  const [course, notesUsingCourse] = await Promise.all([
    Course.findById(req.params.id),
    Note.countDocuments({ courseId: req.params.id }),
  ]);
  if (!course) {
    req.flash("error", "Course not found.");
    return res.redirect("/admin/courses");
  }
  if (notesUsingCourse) {
    req.flash("error", "This course is used by notes. Archive it instead of deleting it.");
    return res.redirect("/admin/courses");
  }
  await course.deleteOne();
  req.flash("success", "Course deleted.");
  res.redirect("/admin/courses");
};

module.exports.listNotes = async (req, res) => {
  const [notes, courses, universities, colleges] = await Promise.all([
    Note.find()
      .populate("author", "name email")
      .populate("universities", "name")
      .populate("colleges", "name")
      .sort({ createdAt: -1 })
      .limit(200)
      .lean(),
    Course.find().sort({ name: 1 }).select("name semesterCount specializations").lean(),
    University.find({ isActive: true }).sort({ name: 1 }).lean(),
    College.find({ isActive: true }).sort({ name: 1 }).lean(),
  ]);
  res.render("admin/notes.ejs", {
    notes: notes.map((note) => ({
      ...note,
      moderationStatus: note.isPublished ? "approved" : note.moderationStatus || "pending",
    })),
    courses,
    universities,
    colleges,
  });
};

module.exports.updateNote = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    req.flash("error", "Note not found.");
    return res.redirect("/admin/notes");
  }
  const note = await Note.findById(req.params.id);
  if (!note) {
    req.flash("error", "Note not found.");
    return res.redirect("/admin/notes");
  }
  const moderationStatus = typeof req.body.moderationStatus === "string" ? req.body.moderationStatus : "";
  const parsed = await parseNoteFields(req.body || {}, { allowInactiveCourse: true });
  if (parsed.error || !["pending", "approved", "rejected"].includes(moderationStatus)) {
    req.flash("error", parsed.error || "Choose a valid moderation status.");
    return res.redirect("/admin/notes");
  }
  note.set(parsed.values);
  note.isPublished = moderationStatus === "approved";
  note.moderationStatus = moderationStatus;
  note.moderatedAt = moderationStatus === "pending" ? null : new Date();
  note.moderatedBy = moderationStatus === "pending" ? null : req.user._id;
  await note.save();
  req.flash("success", "Note updated.");
  res.redirect("/admin/notes");
};

module.exports.moderateNote = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    req.flash("error", "Note not found.");
    return res.redirect("/admin/notes");
  }
  const status = req.body.status;
  if (!["approved", "rejected"].includes(status)) {
    req.flash("error", "Choose a valid moderation action.");
    return res.redirect("/admin/notes");
  }
  const note = await Note.findById(req.params.id);
  if (!note) {
    req.flash("error", "Note not found.");
    return res.redirect("/admin/notes");
  }
  note.moderationStatus = status;
  note.isPublished = status === "approved";
  note.moderatedAt = new Date();
  note.moderatedBy = req.user._id;
  await note.save();
  req.flash("success", status === "approved" ? "Note approved and published." : "Note rejected and kept private.");
  res.redirect("/admin/notes");
};

module.exports.deleteNote = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    req.flash("error", "Note not found.");
    return res.redirect("/admin/notes");
  }
  await Note.findByIdAndDelete(req.params.id);
  req.flash("success", "Note removed.");
  res.redirect("/admin/notes");
};
