const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const blogsSchema = new Schema({
  title: String,
  id: String,
  shortdescription: String,
  content: String,
  image: {
    url: String,
    filename: String,
  },
  imageTitle: String,
  author: {
    type: Schema.Types.ObjectId,
    ref: "User",
  },
  category: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
  },
  Keywords: String,
  externalLinks: [
    {
      type: String,
    },
  ],
  optionalDetails: {
    type: String,
    default: null,
  },
  isvalid: {
    type: Boolean,
    default: false,
  },
  blocked: {
    type: Boolean,
    default: false,
  },
  comments: [
    {
      text: String,
      createdAt: { type: Date, default: Date.now },
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
  ],
  usersSeen: [
    {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  adminVerified: {
    type: Boolean,
    default: false,
  },
});

module.exports = mongoose.model("Blog", blogsSchema);
