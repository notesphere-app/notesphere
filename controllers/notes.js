const mongoose = require("mongoose");
const Note = require("../models/note");
const Course = require("../models/course");
const Download = require("../models/download");
const { getDeviceDetails } = require("../utils/requestMetadata");
const { validateComment } = require("../utils/commentFilter.cjs");

module.exports.index = async (req, res) => {
  const filters = { isPublished: true };
  const search = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
  if (mongoose.Types.ObjectId.isValid(req.query.course)) {
    filters.courseId = req.query.course;
  }
  for (const field of ["specialization", "university", "college"]) {
    if (typeof req.query[field] === "string" && req.query[field].trim()) {
      filters[field] = req.query[field].trim().slice(0, 160);
    }
  }
  const semester = Number(req.query.semester);
  if (Number.isInteger(semester) && semester >= 1 && semester <= 12) {
    filters.semester = semester;
  }
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filters.$or = [
      { title: { $regex: escaped, $options: "i" } },
      { description: { $regex: escaped, $options: "i" } },
      { subject: { $regex: escaped, $options: "i" } },
    ];
  }

  const [notes, courses] = await Promise.all([
    Note.find(filters)
    .populate("author", "name username avatar")
    .sort({ createdAt: -1 })
      .limit(100),
    Course.find({ isActive: true }).sort({ name: 1 }).select("name specializations semesterCount universities"),
  ]);

  const savedIds = new Set((req.user?.savedNotes || []).map(String));
  const noteCards = notes.map((note) => ({
    id: note._id.toString(),
    title: note.title,
    excerpt: note.description || "Open the shared notes link.",
    cover: "/images/logo.png",
    course: note.course.toLowerCase().replace(/[^a-z0-9]+/g, ""),
    courseId: note.courseId?.toString() || "",
    courseLabel: note.course,
    specialization: note.specialization || "",
    university: note.university || "",
    college: note.college || "",
    semester: note.semester || 1,
    subject: note.subject,
    type: note.type,
    typeLabel: note.type,
    pages: 0,
    size: "External link",
    downloads: note.downloadCount,
    upvotes: note.likes.length,
    rating: "—",
    votes: note.likes.length,
    author: note.author?.name || note.author?.username || "Notesphere user",
    avatar: note.author?.avatar || "/images/logo.png",
    date: note.createdAt.toLocaleDateString(),
    uploadedAt: Math.floor(note.createdAt.getTime() / 1000),
    featured: false,
    upvotedByMe: Boolean(req.user && note.likes.some((id) => id.equals(req.user._id))),
    savedByMe: savedIds.has(note._id.toString()),
  }));

  res.render("notesphere/notes.ejs", {
    storedNotes: noteCards,
    catalogCourses: courses,
    filters: req.query,
    stats: [
      { label: "Notes uploaded", value: notes.length, suffix: "" },
      {
        label: "Downloads served",
        value: notes.reduce((total, note) => total + note.downloadCount, 0),
        suffix: "",
      },
      { label: "Active contributors", value: new Set(notes.map((note) => String(note.author?._id))).size, suffix: "" },
      { label: "Courses covered", value: new Set(notes.map((note) => note.course)).size, suffix: "" },
    ],
  });
};

module.exports.newForm = async (req, res) => {
  const courses = await Course.find({ isActive: true })
    .sort({ name: 1 })
    .select("name");
  res.render("notesphere/new-note.ejs", { courses });
};

module.exports.create = async (req, res) => {
  const { title, description, sourceUrl, courseId, specialization, university, college, semester, subject, type } = req.body || {};
  const cleanTitle = typeof title === "string" ? title.trim() : "";
  const cleanSubject = typeof subject === "string" ? subject.trim() : "";
  const cleanSpecialization = typeof specialization === "string" ? specialization.trim() : "";
  const cleanUniversity = typeof university === "string" ? university.trim() : "";
  const cleanCollege = typeof college === "string" ? college.trim() : "";
  const cleanDescription = typeof description === "string" ? description.trim() : "";
  const validTypes = ["handwritten", "typed", "solved", "pdf"];
  let url;
  try {
    url = new URL(typeof sourceUrl === "string" ? sourceUrl.trim() : "");
  } catch {
    req.flash("error", "Enter a valid HTTP or HTTPS note URL.");
    return res.redirect("/notes/new");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    !cleanTitle ||
    cleanTitle.length > 160 ||
    cleanSubject.length > 100 ||
    !cleanSubject ||
    cleanDescription.length > 2000 ||
    !mongoose.Types.ObjectId.isValid(courseId) ||
    !validTypes.includes(type)
  ) {
    req.flash("error", "Please complete all required note fields with a valid public URL.");
    return res.redirect("/notes/new");
  }

  const courseRecord = await Course.findOne({ _id: courseId, isActive: true });
  const semesterNumber = Number(semester);
  const universityRecord = courseRecord?.universities.find(
    (entry) => entry.name.toLowerCase() === cleanUniversity.toLowerCase(),
  );
  if (
    !courseRecord ||
    !Number.isInteger(semesterNumber) ||
    semesterNumber < 1 ||
    semesterNumber > courseRecord.semesterCount ||
    (courseRecord.specializations.length &&
      !courseRecord.specializations.some((entry) => entry.toLowerCase() === cleanSpecialization.toLowerCase())) ||
    !universityRecord ||
    !universityRecord.colleges.some((entry) => entry.toLowerCase() === cleanCollege.toLowerCase())
  ) {
    req.flash("error", "Choose a valid course, specialization, semester, university, and college.");
    return res.redirect("/notes/new");
  }

  const note = await Note.create({
    title: cleanTitle,
    description: cleanDescription,
    sourceUrl: url.toString(),
    course: courseRecord.name,
    courseId: courseRecord._id,
    specialization: cleanSpecialization,
    university: universityRecord.name,
    college: universityRecord.colleges.find((entry) => entry.toLowerCase() === cleanCollege.toLowerCase()),
    semester: semesterNumber,
    subject: cleanSubject,
    type,
    author: req.user._id,
    isPublished: req.user.role === "admin",
    moderationStatus: req.user.role === "admin" ? "approved" : "pending",
    moderatedAt: req.user.role === "admin" ? new Date() : null,
    moderatedBy: req.user.role === "admin" ? req.user._id : null,
  });
  req.flash(
    "success",
    req.user.role === "admin"
      ? "Your note is published and available in the library."
      : "Your note was submitted for review. You can see its status in My notes; it will appear in the library after an admin approves it.",
  );
  res.redirect(`/notes/${note._id}`);
};

module.exports.show = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    req.flash("error", "That note could not be found.");
    return res.redirect("/notes");
  }
  const note = await Note.findOne({
    _id: req.params.id,
    $or: [
      { isPublished: true },
      ...(req.user ? [{ author: req.user._id }, ...(req.user.role === "admin" ? [{}] : [])] : []),
    ],
  })
    .populate("author", "name username avatar")
    .populate("moderatedBy", "name")
    .populate("comments.user", "name username avatar");
  if (!note) {
    req.flash("error", "That note could not be found.");
    return res.redirect("/notes");
  }
  res.render("notesphere/show-note.ejs", {
    note,
    resourceSource: describeResourceSource(note.sourceUrl),
    canModerate: req.user?.role === "admin",
    downloadProfileRequired: req.query.downloadProfile === "1",
    savedCampus: req.user
      ? { university: req.user.university || "", college: req.user.college || "" }
      : req.session.downloadCampus || { university: "", college: "" },
    upvotedByMe: Boolean(req.user && note.likes.some((id) => id.equals(req.user._id))),
    savedByMe: Boolean(req.user?.savedNotes?.some((id) => id.equals(note._id))),
  });
};

module.exports.toggleLike = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ success: false, message: "Note not found." });
  }
  const note = await Note.findOne({ _id: req.params.id, isPublished: true });
  if (!note) return res.status(404).json({ success: false, message: "Note not found." });
  const alreadyLiked = note.likes.some((id) => id.equals(req.user._id));
  const update = alreadyLiked
    ? { $pull: { likes: req.user._id } }
    : { $addToSet: { likes: req.user._id } };
  const updated = await Note.findByIdAndUpdate(note._id, update, { new: true });
  res.json({ success: true, liked: !alreadyLiked, count: updated.likes.length });
};

module.exports.toggleSave = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ success: false, message: "Note not found." });
  }
  const note = await Note.findOne({ _id: req.params.id, isPublished: true }).select("_id");
  if (!note) return res.status(404).json({ success: false, message: "Note not found." });
  const isSaved = (req.user.savedNotes || []).some((id) => id.equals(note._id));
  await req.user.updateOne(
    isSaved
      ? { $pull: { savedNotes: note._id } }
      : { $addToSet: { savedNotes: note._id } },
  );
  res.json({ success: true, saved: !isSaved });
};

module.exports.addComment = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    req.flash("error", "Note not found.");
    return res.redirect("/notes");
  }
  const note = await Note.findOne({ _id: req.params.id, isPublished: true });
  if (!note) {
    req.flash("error", "Note not found.");
    return res.redirect("/notes");
  }
  const result = validateComment(req.body.text);
  if (!result.valid) {
    req.flash("error", "Please enter a meaningful comment that follows the community guidelines.");
    return res.redirect(`/notes/${note._id}`);
  }
  note.comments.push({ text: result.text, user: req.user._id });
  await note.save();
  req.flash("success", "Comment added.");
  res.redirect(`/notes/${note._id}`);
};

module.exports.download = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    req.flash("error", "Note not found.");
    return res.redirect("/notes");
  }
  const note = await Note.findOne({ _id: req.params.id, isPublished: true });
  if (!note) {
    req.flash("error", "Note not found.");
    return res.redirect("/notes");
  }
  const savedCampus = req.user
    ? { university: req.user.university || "", college: req.user.college || "" }
    : req.session.downloadCampus || {};
  if (!savedCampus.university || !savedCampus.college) {
    return res.redirect(`/notes/${note._id}?downloadProfile=1`);
  }
  return res.render("notesphere/download-note.ejs", {
    note,
    resourceSource: describeResourceSource(note.sourceUrl),
    adminVerified: note.moderationStatus === "approved" && Boolean(note.moderatedBy),
  });
};

module.exports.confirmDownload = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    req.flash("error", "Note not found.");
    return res.redirect("/notes");
  }
  const note = await Note.findOne({ _id: req.params.id, isPublished: true });
  if (!note) {
    req.flash("error", "Note not found.");
    return res.redirect("/notes");
  }
  const university = typeof req.body.university === "string" ? req.body.university.trim().slice(0, 160) : "";
  const college = typeof req.body.college === "string" ? req.body.college.trim().slice(0, 160) : "";
  if (!university || !college || university.length < 2 || college.length < 2) {
    req.flash("error", "Enter both your university and college.");
    return res.redirect(`/notes/${note._id}?downloadProfile=1`);
  }

  if (note.courseId) {
    const course = await Course.findById(note.courseId);
    if (course) {
      let universityRecord = course.universities.find(
        (entry) => entry.name.toLowerCase() === university.toLowerCase(),
      );
      if (!universityRecord) {
        universityRecord = { name: university, colleges: [] };
        course.universities.push(universityRecord);
      }
      if (!universityRecord.colleges.some((entry) => entry.toLowerCase() === college.toLowerCase())) {
        universityRecord.colleges.push(college);
      }
      await course.save();
    }
  }

  if (req.user) {
    req.user.university = university;
    req.user.college = college;
    await req.user.save();
  } else {
    req.session.downloadCampus = { university, college };
  }
  return res.redirect(`/notes/${note._id}/download`);
};

module.exports.openDownload = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    req.flash("error", "Note not found.");
    return res.redirect("/notes");
  }
  const note = await Note.findOne({ _id: req.params.id, isPublished: true });
  if (!note) {
    req.flash("error", "Note not found.");
    return res.redirect("/notes");
  }
  const savedCampus = req.user
    ? { university: req.user.university || "", college: req.user.college || "" }
    : req.session.downloadCampus || {};
  if (!savedCampus.university || !savedCampus.college) {
    return res.redirect(`/notes/${note._id}?downloadProfile=1`);
  }
  return recordDownload(req, res, note, savedCampus.university, savedCampus.college);
};

function describeResourceSource(sourceUrl) {
  let hostname;
  try {
    hostname = new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return { hostname: "Unavailable", provider: "External host" };
  }
  if (hostname === "drive.google.com" || hostname === "docs.google.com") {
    return { hostname, provider: "Google Drive / Google Docs" };
  }
  if (hostname === "dropbox.com" || hostname.endsWith(".dropbox.com")) {
    return { hostname, provider: "Dropbox" };
  }
  if (hostname === "onedrive.live.com" || hostname.endsWith(".sharepoint.com")) {
    return { hostname, provider: "Microsoft OneDrive / SharePoint" };
  }
  return { hostname, provider: hostname };
}

async function recordDownload(req, res, note, university, college) {
  const agent = req.get("user-agent") || "";
  await Promise.all([
    Download.create({
      note: note._id,
      course: note.courseId || null,
      user: req.user?._id || null,
      isGuest: !req.user,
      university,
      college,
      device: getDeviceDetails(agent),
    }),
    Note.updateOne({ _id: note._id }, { $inc: { downloadCount: 1 } }),
  ]);
  res.redirect(note.sourceUrl);
}

module.exports.courseOptions = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ message: "Course not found." });
  }
  const course = await Course.findOne({ _id: req.params.id, isActive: true })
    .select("name specializations semesterCount universities")
    .lean();
  if (!course) return res.status(404).json({ message: "Course not found." });
  res.json(course);
};

module.exports.mine = async (req, res) => {
  const notes = await Note.find({ author: req.user._id }).sort({ createdAt: -1 }).limit(100).lean();
  res.render("notesphere/my-notes.ejs", { notes });
};
