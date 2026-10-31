const mongoose = require("mongoose");
const University = require("../models/university");
const College = require("../models/college");
const Note = require("../models/note");
const { normalizeCatalogName } = require("../utils/campusCatalog");

function readName(value) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function validName(name) {
  return name.length >= 2 && name.length <= 160;
}

module.exports.list = async (req, res) => {
  const universities = await University.find()
    .sort({ name: 1 })
    .populate({ path: "colleges", options: { sort: { name: 1 } } })
    .lean();
  res.render("admin/universities.ejs", { universities });
};

module.exports.createUniversity = async (req, res) => {
  const name = readName(req.body.name);
  if (!validName(name)) {
    req.flash("error", "University name must be between 2 and 160 characters.");
    return res.redirect("/admin/universities");
  }
  try {
    await University.create({
      name,
      normalizedName: normalizeCatalogName(name),
      createdBy: req.user._id,
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
    req.flash("error", "That university already exists.");
    return res.redirect("/admin/universities");
  }
  req.flash("success", "University created.");
  res.redirect("/admin/universities");
};

module.exports.updateUniversity = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    req.flash("error", "University not found.");
    return res.redirect("/admin/universities");
  }
  const name = readName(req.body.name);
  if (!validName(name)) {
    req.flash("error", "University name must be between 2 and 160 characters.");
    return res.redirect("/admin/universities");
  }
  try {
    const university = await University.findByIdAndUpdate(
      req.params.id,
      { name, normalizedName: normalizeCatalogName(name) },
      { runValidators: true, new: true },
    );
    if (!university) {
      req.flash("error", "University not found.");
      return res.redirect("/admin/universities");
    }
  } catch (error) {
    if (error.code !== 11000) throw error;
    req.flash("error", "That university already exists.");
    return res.redirect("/admin/universities");
  }
  req.flash("success", "University updated.");
  res.redirect("/admin/universities");
};

module.exports.deleteUniversity = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    req.flash("error", "University not found.");
    return res.redirect("/admin/universities");
  }
  const [university, collegeCount, noteCount] = await Promise.all([
    University.findById(req.params.id),
    College.countDocuments({ university: req.params.id }),
    Note.countDocuments({ universities: req.params.id }),
  ]);
  if (!university) {
    req.flash("error", "University not found.");
    return res.redirect("/admin/universities");
  }
  if (collegeCount || noteCount) {
    req.flash("error", "Remove this university's colleges and note associations before deleting it.");
    return res.redirect("/admin/universities");
  }
  await university.deleteOne();
  req.flash("success", "University deleted.");
  res.redirect("/admin/universities");
};

module.exports.createCollege = async (req, res) => {
  const name = readName(req.body.name);
  const universityId = typeof req.body.universityId === "string" ? req.body.universityId : "";
  if (!validName(name) || !mongoose.Types.ObjectId.isValid(universityId)) {
    req.flash("error", "Choose a university and enter a college name between 2 and 160 characters.");
    return res.redirect("/admin/universities");
  }
  const university = await University.findById(universityId);
  if (!university) {
    req.flash("error", "University not found.");
    return res.redirect("/admin/universities");
  }
  try {
    await College.create({
      name,
      normalizedName: normalizeCatalogName(name),
      university: university._id,
      createdBy: req.user._id,
    });
  } catch (error) {
    if (error.code !== 11000) throw error;
    req.flash("error", "That college already exists for this university.");
    return res.redirect("/admin/universities");
  }
  req.flash("success", "College created.");
  res.redirect("/admin/universities");
};

module.exports.updateCollege = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    req.flash("error", "College not found.");
    return res.redirect("/admin/universities");
  }
  const name = readName(req.body.name);
  if (!validName(name)) {
    req.flash("error", "College name must be between 2 and 160 characters.");
    return res.redirect("/admin/universities");
  }
  try {
    const college = await College.findById(req.params.id);
    if (!college) {
      req.flash("error", "College not found.");
      return res.redirect("/admin/universities");
    }
    college.name = name;
    college.normalizedName = normalizeCatalogName(name);
    await college.save();
  } catch (error) {
    if (error.code !== 11000) throw error;
    req.flash("error", "That college already exists for this university.");
    return res.redirect("/admin/universities");
  }
  req.flash("success", "College updated.");
  res.redirect("/admin/universities");
};

module.exports.deleteCollege = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    req.flash("error", "College not found.");
    return res.redirect("/admin/universities");
  }
  const [college, noteCount] = await Promise.all([
    College.findById(req.params.id),
    Note.countDocuments({ colleges: req.params.id }),
  ]);
  if (!college) {
    req.flash("error", "College not found.");
    return res.redirect("/admin/universities");
  }
  if (noteCount) {
    req.flash("error", "This college is linked to notes. Remove those note associations before deleting it.");
    return res.redirect("/admin/universities");
  }
  await college.deleteOne();
  req.flash("success", "College deleted.");
  res.redirect("/admin/universities");
};
