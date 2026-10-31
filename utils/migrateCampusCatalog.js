const mongoose = require("mongoose");
const { findOrCreateUniversity, findOrCreateCollege } = require("./campusCatalog");

async function migrateCampusCatalog() {
  const courseCursor = mongoose.connection
    .collection("courses")
    .find({ universities: { $type: "array" } })
    .batchSize(100);

  for await (const course of courseCursor) {
    for (const entry of course.universities || []) {
      if (typeof entry.name !== "string" || !entry.name.trim()) continue;
      const university = await findOrCreateUniversity(entry.name);
      for (const collegeName of entry.colleges || []) {
        if (typeof collegeName === "string" && collegeName.trim()) {
          await findOrCreateCollege(collegeName, university._id);
        }
      }
    }
    await mongoose.connection.collection("courses").updateOne(
      { _id: course._id },
      { $unset: { universities: "" } },
    );
  }

  const noteCursor = mongoose.connection
    .collection("notes")
    .find({
      $or: [
        { university: { $type: "string", $ne: "" }, universities: { $exists: false } },
        { college: { $type: "string", $ne: "" }, colleges: { $exists: false } },
      ],
    })
    .batchSize(100);

  for await (const note of noteCursor) {
    const universityName = typeof note.university === "string" ? note.university.trim() : "";
    const collegeName = typeof note.college === "string" ? note.college.trim() : "";
    const associations = {};
    if (universityName) {
      const university = await findOrCreateUniversity(universityName);
      associations.universities = university._id;
      if (collegeName) {
        const college = await findOrCreateCollege(collegeName, university._id);
        associations.colleges = college._id;
      }
    }

    await mongoose.connection.collection("notes").updateOne(
      { _id: note._id },
      Object.keys(associations).length
        ? { $addToSet: associations }
        : { $set: { universities: note.universities || [], colleges: note.colleges || [] } },
    );
  }
}

module.exports = migrateCampusCatalog;
