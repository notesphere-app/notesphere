const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const blogCategories = require("../utils/blogCategories");

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
  category: { type: String, enum: blogCategories, required: true },
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
      text: { type: String, required: true, maxlength: 1000 },
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
  guestViewCount: {
    type: Number,
    default: 0,
    min: 0,
  },
  likes: [{ type: Schema.Types.ObjectId, ref: "User" }],
  adminVerified: {
    type: Boolean,
    default: false,
  },
});

blogsSchema.index({ blocked: 1, createdAt: -1 });

module.exports = mongoose.model("Blog", blogsSchema);
