const mongoose = require("mongoose");
const Course = require("../models/course");
const Note = require("../models/note");

function parseCourseInput(body) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const semesters = Number(body.semesterCount);
  const specializations = (typeof body.specializations === "string" ? body.specializations : "")
    .split(/\r?\n/)
    .map((value) => value.trim())
    .filter(Boolean);
  const universities = (typeof body.universities === "string" ? body.universities : "")
    .split(/\r?\n/)
    .map((line) => {
      const [universityName, collegeList = ""] = line.split("|");
      return {
        name: universityName.trim(),
        colleges: collegeList.split(",").map((college) => college.trim()).filter(Boolean),
      };
    })
    .filter((university) => university.name);

  if (
    !name ||
    name.length > 120 ||
    !Number.isInteger(semesters) ||
    semesters < 1 ||
    semesters > 12 ||
    specializations.length > 40 ||
    specializations.some((value) => value.length > 100) ||
    universities.length > 100 ||
    universities.some((university) =>
      university.name.length > 160 ||
      !university.colleges.length ||
      university.colleges.length > 100 ||
      university.colleges.some((college) => college.length > 160),
    )
  ) {
    return null;
  }

  const normalizedUniversities = [];
  for (const university of universities) {
    const existing = normalizedUniversities.find(
      (item) => item.name.toLowerCase() === university.name.toLowerCase(),
    );
    if (existing) {
      for (const college of university.colleges) {
        if (!existing.colleges.some((item) => item.toLowerCase() === college.toLowerCase())) {
          existing.colleges.push(college);
        }
      }
    } else {
      normalizedUniversities.push({
        name: university.name,
        colleges: [...new Set(university.colleges)],
      });
    }
  }

  return {
    name,
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    semesterCount: semesters,
    specializations: [...new Set(specializations)],
    universities: normalizedUniversities,
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
  const editId = typeof req.body.courseId === "string" ? req.body.courseId : "";
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
    await Course.findByIdAndUpdate(editId, courseData, { runValidators: true });
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

module.exports.listNotes = async (req, res) => {
  const [notes, courses] = await Promise.all([
    Note.find().populate("author", "name email").sort({ createdAt: -1 }).limit(200).lean(),
    Course.find().sort({ name: 1 }).select("name semesterCount specializations universities").lean(),
  ]);
  res.render("admin/notes.ejs", {
    notes: notes.map((note) => ({
      ...note,
      moderationStatus: note.isPublished ? "approved" : note.moderationStatus || "pending",
    })),
    courses,
  });
};

module.exports.updateNote = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    req.flash("error", "Note not found.");
    return res.redirect("/admin/notes");
  }
  const note = await Note.findById(req.params.id);
  const course = mongoose.Types.ObjectId.isValid(req.body.courseId)
    ? await Course.findById(req.body.courseId)
    : null;
  if (!note || !course) {
    req.flash("error", "Choose a valid note and course.");
    return res.redirect("/admin/notes");
  }
  const semester = Number(req.body.semester);
  const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
  const subject = typeof req.body.subject === "string" ? req.body.subject.trim() : "";
  const description = typeof req.body.description === "string" ? req.body.description.trim() : "";
  const university = typeof req.body.university === "string" ? req.body.university.trim() : "";
  const college = typeof req.body.college === "string" ? req.body.college.trim() : "";
  const type = typeof req.body.type === "string" ? req.body.type : "";
  const moderationStatus = typeof req.body.moderationStatus === "string" ? req.body.moderationStatus : "";
  const sourceUrl = typeof req.body.sourceUrl === "string" ? req.body.sourceUrl.trim() : "";
  let parsedUrl;
  try {
    parsedUrl = new URL(sourceUrl);
  } catch {
    req.flash("error", "Enter a valid HTTP or HTTPS resource link.");
    return res.redirect("/admin/notes");
  }
  const specialization = typeof req.body.specialization === "string" ? req.body.specialization.trim() : "";
  if (
    !title || title.length > 160 || !subject || subject.length > 100 ||
    description.length > 2000 || university.length > 160 || college.length > 160 ||
    !["http:", "https:"].includes(parsedUrl.protocol) || parsedUrl.username || parsedUrl.password ||
    !Number.isInteger(semester) || semester < 1 || semester > course.semesterCount ||
    !["handwritten", "typed", "solved", "pdf"].includes(type) ||
    !["pending", "approved", "rejected"].includes(moderationStatus) ||
    (course.specializations.length &&
      !course.specializations.some((value) => value.toLowerCase() === specialization.toLowerCase()))
  ) {
    req.flash("error", "Check the note title, subject, specialization, semester, and public URL.");
    return res.redirect("/admin/notes");
  }
  note.title = title;
  note.subject = subject;
  note.description = description;
  note.sourceUrl = parsedUrl.toString();
  note.courseId = course._id;
  note.course = course.name;
  note.specialization = specialization;
  note.semester = semester;
  note.university = university;
  note.college = college;
  note.type = type;
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
