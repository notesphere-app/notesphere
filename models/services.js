const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const serviceSchema = new Schema(
  {
  }
);

module.exports = mongoose.model("Service", serviceSchema);
