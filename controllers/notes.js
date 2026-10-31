const mongoose = require("mongoose");
const User = require("../models/user");
const Note = require("../models/note");
const Course = require("../models/course");
const University = require("../models/university");
const College = require("../models/college");
const Download = require("../models/download");
const { getDeviceDetails } = require("../utils/requestMetadata");
const { validateComment } = require("../utils/commentFilter.cjs");
const { parseNoteFields } = require("../utils/noteFields");
const { findOrCreateUniversity, findOrCreateCollege, normalizeCatalogName } = require("../utils/campusCatalog");

module.exports.index = async (req, res) => {
  const filters = { isPublished: true };
  const search = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
  if (mongoose.Types.ObjectId.isValid(req.query.course)) {
    filters.courseId = req.query.course;
  }
  if (typeof req.query.specialization === "string" && req.query.specialization.trim()) {
    filters.specialization = req.query.specialization.trim().slice(0, 100);
  }
  const campusConditions = [];
  const universityFilter = typeof req.query.university === "string" ? req.query.university.trim().slice(0, 160) : "";
  const collegeFilter = typeof req.query.college === "string" ? req.query.college.trim().slice(0, 160) : "";
  const universityRecord = universityFilter
    ? await University.findOne({ normalizedName: normalizeCatalogName(universityFilter) }).select("_id")
    : null;
  if (universityFilter) {
    const escaped = universityFilter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    campusConditions.push({
      $or: [
        { university: { $regex: `^${escaped}$`, $options: "i" } },
        ...(universityRecord ? [{ universities: universityRecord._id }] : []),
      ],
    });
  }
  if (collegeFilter) {
    const collegeId = await College.findOne({
      normalizedName: normalizeCatalogName(collegeFilter),
      ...(universityFilter && universityRecord ? { university: universityRecord._id } : {}),
    }).select("_id");
    const escaped = collegeFilter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    campusConditions.push({
      $or: [
        { college: { $regex: `^${escaped}$`, $options: "i" } },
        ...(collegeId ? [{ colleges: collegeId._id }] : []),
      ],
    });
  }
  if (campusConditions.length) filters.$and = campusConditions;
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
      { noteCategory: { $regex: escaped, $options: "i" } },
      { keywords: { $regex: escaped, $options: "i" } },
    ];
  }

  const [notes, courses] = await Promise.all([
    Note.find(filters)
    .populate("author", "name username avatar")
    .populate("universities", "name")
    .populate("colleges", "name")
    .sort({ createdAt: -1 })
      .limit(100),
    Course.find({ isActive: true }).sort({ name: 1 }).select("name specializations semesterCount"),
  ]);

  const savedIds = new Set((req.user?.savedNotes || []).map(String));
  const noteCards = notes.map((note) => ({
    id: note._id.toString(),
    title: note.title,
    excerpt: note.description || "Open the shared notes link.",
    cover: "/images/note-thumbnail.svg",
    course: note.course.toLowerCase().replace(/[^a-z0-9]+/g, ""),
    courseId: note.courseId?.toString() || "",
    courseLabel: note.course,
    specialization: note.specialization || "",
    university: note.universities?.map((university) => university.name).join(", ") || note.university || "",
    college: note.colleges?.map((college) => college.name).join(", ") || note.college || "",
    noteCategory: note.noteCategory || "General",
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
  res.render("notesphere/new-note.ejs", { courses, note: null });
};

module.exports.editForm = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    req.flash("error", "Note not found.");
    return res.redirect("/notes/mine");
  }
  const note = await Note.findOne({
    _id: req.params.id,
    $or: [{ author: req.user._id }, ...(req.user.role === "admin" ? [{}] : [])],
  })
    .populate("universities", "name")
    .populate("colleges", "name");
  if (!note) {
    req.flash("error", "You can only edit your own notes.");
    return res.redirect("/notes/mine");
  }
  const courses = await Course.find({ isActive: true }).sort({ name: 1 }).select("name");
  if (!note.courseId) {
    const legacyCourse = courses.find(
      (course) => course.name.trim().toLowerCase() === String(note.course || "").trim().toLowerCase(),
    );
    if (legacyCourse) note.courseId = legacyCourse._id;
  }
  res.render("notesphere/new-note.ejs", { courses, note });
};

module.exports.update = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    req.flash("error", "Note not found.");
    return res.redirect("/notes/mine");
  }
  const note = await Note.findOne({
    _id: req.params.id,
    $or: [{ author: req.user._id }, ...(req.user.role === "admin" ? [{}] : [])],
  });
  if (!note) {
    req.flash("error", "You can only edit your own notes.");
    return res.redirect("/notes/mine");
  }
  const parsed = await parseNoteFields(req.body || {}, { allowInactiveCourse: req.user.role === "admin" });
  if (parsed.error) {
    req.flash("error", parsed.error);
    return res.redirect(`/notes/${note._id}/edit`);
  }

  note.set(parsed.values);
  if (req.user.role !== "admin") {
    note.isPublished = false;
    note.moderationStatus = "pending";
    note.moderatedAt = null;
    note.moderatedBy = null;
  }
  await note.save();
  req.flash(
    "success",
    req.user.role === "admin"
      ? "Note updated."
      : "Note updated and sent for admin review. It will remain private until approved.",
  );
  res.redirect(`/notes/${note._id}`);
};

module.exports.destroy = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    req.flash("error", "Note not found.");
    return res.redirect("/notes/mine");
  }
  const note = await Note.findOne({
    _id: req.params.id,
    $or: [{ author: req.user._id }, ...(req.user.role === "admin" ? [{}] : [])],
  });
  if (!note) {
    req.flash("error", "You can only delete your own notes.");
    return res.redirect("/notes/mine");
  }
  await note.deleteOne();
  req.flash("success", "Note deleted.");
  res.redirect("/notes/mine");
};

module.exports.create = async (req, res) => {
  const parsed = await parseNoteFields(req.body || {});
  if (parsed.error) {
    req.flash("error", parsed.error);
    return res.redirect("/notes/new");
  }

  const note = await Note.create({
    ...parsed.values,
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
    .populate("universities", "name")
    .populate("colleges", "name")
    .populate("moderatedBy", "name")
    .populate("comments.user", "name username avatar");
  if (!note) {
    req.flash("error", "That note could not be found.");
    return res.redirect("/notes");
  }
  res.render("notesphere/show-note.ejs", {
    note,
    meta: {
      title: `${note.title} | NoteSphere Notes`,
      description: note.metaDescription || note.description || `Study notes for ${note.subject} in ${note.course}.`,
      keywords: (note.keywords || []).join(", "),
      image: `${(process.env.DOMAIN || "https://notesphere.online").replace(/\/$/, "")}/images/note-thumbnail.svg`,
    },
    resourceSource: describeResourceSource(note.sourceUrl),
    canModerate: req.user?.role === "admin",
    canEditNote: Boolean(req.user && (req.user.role === "admin" || note.author?._id.equals(req.user._id))),
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
  const condition = {
    _id: note._id,
    isPublished: true,
    ...(alreadyLiked ? { likes: req.user._id } : { likes: { $ne: req.user._id } }),
  };
  const update = alreadyLiked
    ? { $pull: { likes: req.user._id } }
    : { $addToSet: { likes: req.user._id } };
  const updated = await Note.findOneAndUpdate(condition, update, { new: true });
  if (!updated) {
    return res.status(409).json({ success: false, message: "Your like changed in another request. Please try again." });
  }
  res.json({ success: true, liked: !alreadyLiked, count: updated.likes.length });
};

module.exports.toggleSave = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ success: false, message: "Note not found." });
  }
  const note = await Note.findOne({ _id: req.params.id, isPublished: true }).select("_id");
  if (!note) return res.status(404).json({ success: false, message: "Note not found." });
  const isSaved = (req.user.savedNotes || []).some((id) => id.equals(note._id));
  const updated = await User.updateOne(
    {
      _id: req.user._id,
      ...(isSaved ? { savedNotes: note._id } : { savedNotes: { $ne: note._id } }),
    },
    isSaved
      ? { $pull: { savedNotes: note._id } }
      : { $addToSet: { savedNotes: note._id } },
  );
  if (!updated.modifiedCount) {
    return res.status(409).json({ success: false, message: "Your saved list changed in another request. Please try again." });
  }
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
  const note = await Note.findOne({ _id: req.params.id, isPublished: true })
    .populate("universities", "name")
    .populate("colleges", "name");
  if (!note) {
    req.flash("error", "Note not found.");
    return res.redirect("/notes");
  }
  return res.redirect(`/notes/${note._id}?downloadProfile=1`);
};

module.exports.confirmDownload = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    req.flash("error", "Note not found.");
    return res.redirect("/notes");
  }
  const note = await Note.findOne({ _id: req.params.id, isPublished: true })
    .populate("universities", "name")
    .populate("colleges", "name");
  if (!note) {
    req.flash("error", "Note not found.");
    return res.redirect("/notes");
  }
  const universityName = typeof req.body.university === "string" ? req.body.university.trim().replace(/\s+/g, " ") : "";
  const collegeName = typeof req.body.college === "string" ? req.body.college.trim().replace(/\s+/g, " ") : "";
  if (
    universityName.length < 2 ||
    universityName.length > 160 ||
    collegeName.length < 2 ||
    collegeName.length > 160
  ) {
    req.flash("error", "Enter both your university and college.");
    return res.redirect(`/notes/${note._id}?downloadProfile=1`);
  }

  const university = await findOrCreateUniversity(universityName, req.user?._id || null);
  const college = await findOrCreateCollege(collegeName, university._id, req.user?._id || null);

  if (req.user) {
    req.user.university = university.name;
    req.user.college = college.name;
    await req.user.save();
  } else {
    req.session.downloadCampus = { university: university.name, college: college.name };
  }
  return res.render("notesphere/download-note.ejs", {
    note,
    resourceSource: describeResourceSource(note.sourceUrl),
    adminVerified: note.moderationStatus === "approved" && Boolean(note.moderatedBy),
  });
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
    .select("name specializations semesterCount")
    .lean();
  if (!course) return res.status(404).json({ message: "Course not found." });
  const universities = await University.find({ isActive: true }).sort({ name: 1 }).lean();
  const universityIds = universities.map((university) => university._id);
  const colleges = await College.find({ university: { $in: universityIds }, isActive: true })
    .sort({ name: 1 })
    .lean();
  res.json({
    ...course,
    universities: universities.map((university) => ({
      _id: String(university._id),
      name: university.name,
      colleges: colleges
        .filter((college) => String(college.university) === String(university._id))
        .map((college) => ({ _id: String(college._id), name: college.name })),
    })),
  });
};

module.exports.mine = async (req, res) => {
  const notes = await Note.find({ author: req.user._id })
    .select("title description course subject semester moderationStatus isPublished createdAt likes downloadCount")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  res.render("notesphere/my-notes.ejs", { notes });
};
