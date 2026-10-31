const University = require("../models/university");
const College = require("../models/college");

function normalizeCatalogName(name) {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

async function findOrCreateUniversity(name, createdBy = null) {
  const cleanName = name.trim().replace(/\s+/g, " ");
  const normalizedName = normalizeCatalogName(cleanName);
  try {
    return await University.findOneAndUpdate(
      { normalizedName },
      { $setOnInsert: { name: cleanName, normalizedName, createdBy } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
    const university = await University.findOne({ normalizedName });
    if (!university) throw error;
    return university;
  }
}

async function findOrCreateCollege(name, universityId, createdBy = null) {
  const cleanName = name.trim().replace(/\s+/g, " ");
  const normalizedName = normalizeCatalogName(cleanName);
  try {
    return await College.findOneAndUpdate(
      { university: universityId, normalizedName },
      { $setOnInsert: { name: cleanName, normalizedName, university: universityId, createdBy } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
    const college = await College.findOne({ university: universityId, normalizedName });
    if (!college) throw error;
    return college;
  }
}

module.exports = {
  normalizeCatalogName,
  findOrCreateUniversity,
  findOrCreateCollege,
};
