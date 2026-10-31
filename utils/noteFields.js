const mongoose = require("mongoose");
const Course = require("../models/course");
const University = require("../models/university");
const College = require("../models/college");

const noteTypes = ["handwritten", "typed", "solved", "pdf"];

function readText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function readIds(value) {
  const entries = Array.isArray(value) ? value : [value];
  return [...new Set(entries.filter((entry) => typeof entry === "string").map((entry) => entry.trim()))];
}

function readKeywords(value) {
  const entries = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return [...new Set(entries.map(readText).filter(Boolean))];
}

async function parseNoteFields(body, { allowInactiveCourse = false } = {}) {
  const title = readText(body.title);
  const description = readText(body.description);
  const metaDescription = readText(body.metaDescription);
  const subject = readText(body.subject);
  const noteCategory = readText(body.noteCategory) || "General";
  const specialization = readText(body.specialization);
  const sourceUrl = readText(body.sourceUrl);
  const type = readText(body.type);
  const courseId = readText(body.courseId);
  const universityIds = readIds(body.universities);
  const collegeIds = readIds(body.colleges);
  const keywords = readKeywords(body.keywords);

  if (
    !title ||
    title.length > 160 ||
    description.length > 2000 ||
    metaDescription.length > 300 ||
    subject.length < 1 ||
    subject.length > 100 ||
    noteCategory.length > 80 ||
    specialization.length > 100 ||
    !noteTypes.includes(type) ||
    keywords.length > 20 ||
    keywords.some((keyword) => keyword.length > 60) ||
    universityIds.length < 1 ||
    universityIds.length > 20 ||
    collegeIds.length < 1 ||
    collegeIds.length > 100 ||
    universityIds.some((id) => !mongoose.Types.ObjectId.isValid(id)) ||
    collegeIds.some((id) => !mongoose.Types.ObjectId.isValid(id)) ||
    !mongoose.Types.ObjectId.isValid(courseId)
  ) {
    return { error: "Please complete the required note fields and choose valid campus details." };
  }

  let url;
  try {
    url = new URL(sourceUrl);
  } catch {
    return { error: "Enter a valid HTTP or HTTPS note URL." };
  }
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) {
    return { error: "Enter a valid HTTP or HTTPS note URL." };
  }

  const course = await Course.findOne({
    _id: courseId,
    ...(allowInactiveCourse ? {} : { isActive: true }),
  });
  if (!course) return { error: "Choose an active course." };

  const semester = Number(body.semester);
  if (!Number.isInteger(semester) || semester < 1 || semester > course.semesterCount) {
    return { error: "Choose a valid semester for the selected course." };
  }
  const normalizedSpecialization = specialization || (course.specializations.length ? "" : "General");
  if (
    course.specializations.length &&
    !course.specializations.some((entry) => entry.toLowerCase() === normalizedSpecialization.toLowerCase())
  ) {
    return { error: "Choose a valid specialization for the selected course." };
  }

  const [universities, colleges] = await Promise.all([
    University.find({ _id: { $in: universityIds }, isActive: true }).sort({ name: 1 }),
    College.find({
      _id: { $in: collegeIds },
      university: { $in: universityIds },
      isActive: true,
    }).sort({ name: 1 }),
  ]);
  if (universities.length !== universityIds.length || colleges.length !== collegeIds.length) {
    return { error: "Choose active colleges that belong to the selected universities." };
  }

  return {
    course,
    universities,
    colleges,
    values: {
      title,
      description,
      metaDescription,
      keywords,
      sourceUrl: url.toString(),
      course: course.name,
      courseId: course._id,
      noteCategory,
      specialization: normalizedSpecialization,
      semester,
      universities: universities.map((university) => university._id),
      colleges: colleges.map((college) => college._id),
      university: universities[0].name,
      college: colleges[0].name,
      subject,
      type,
    },
  };
}

module.exports = { parseNoteFields, noteTypes };
