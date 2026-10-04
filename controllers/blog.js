const User = require("../models/user.js");
const Blog = require("../models/blog.js");
const { required } = require("joi");
const { cloudinary } = require("../Cloudconfig");
const path = require("path");
const mongoose = require("mongoose");
const { validateComment } = require("../utils/commentFilter.cjs");

const fonts = {
  Jakarta: {
    normal: "fonts/PlusJakartaSans-Regular.ttf",
    bold: "fonts/PlusJakartaSans-Bold.ttf",
    italics: "fonts/PlusJakartaSans-Italic.ttf",
    bolditalics: "fonts/PlusJakartaSans-BoldItalic.ttf",
  },
};

module.exports.index = async (req, res) => {
  const cat = req.query.category;
  const search = req.query.q;
  const page = parseInt(req.query.page) || 1;
  const limit = 12; // Number of blogs per page

  const query = {};
  if (cat) query.category = cat;
  if (search) query.title = { $regex: search, $options: "i" };

  // query.isvalid = true;
  query.blocked = false;

  const totalBlogs = await Blog.countDocuments(query);
  const allBlogs = await Blog.find(query)
    .populate("author")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const totalPages = Math.ceil(totalBlogs / limit);

  res.render("blogs/index.ejs", {
    allBlogs,
    cat,
    currentPage: page,
    totalPages,
    category: cat || "",
    search: search || "",
  });
};

module.exports.renderNewForm = (req, res) => {
  const cat = undefined;
  res.render("blogs/new.ejs", { cat });
};

module.exports.showBlog = async (req, res) => {
  const { id } = req.params;

  let blog = await Blog.findOne({ id: id })
    .populate("author")
    .populate("usersSeen")
    .populate({
      path: "comments.user",
    });

  if (!blog && mongoose.Types.ObjectId.isValid(id)) {
    blog = await Blog.findById(id)
      .populate("author")
      .populate("usersSeen")
      .populate({
        path: "comments.user",
      });
  }

  if (!blog) {
    req.flash("error", "Blog you requested for does not exist!");
    return res.redirect("/blogs");
  }

  // Track views
  if (req.user && !blog.usersSeen.some((u) => u._id.equals(req.user._id))) {
    blog.usersSeen.push(req.user._id);
    await blog.save();
  }

  // ✅ Show all comments (no pagination)
  const paginatedComments = blog.comments.sort(
    (a, b) => b.createdAt - a.createdAt,
  );
  const totalComments = blog.comments.length;

  // ✅ Fetch all related blogs (no pagination)
  const relatedBlogs = await Blog.find({
    category: blog.category,
    _id: { $ne: blog._id }, // exclude current blog
    blocked: false,
    // isvalid: true,
  })
    .populate("author")
    .limit(10);

  const dynamicMeta = {
    title: blog.title + " | RootShield Blog",
    description: blog.shortdescription,
    keywords: blog.keywords,
    image: blog.image.url,
  };

  res.render("blogs/show.ejs", {
    meta: dynamicMeta,
    blog,
    comments: paginatedComments,
    currentPage: 1,
    totalPages: 1,
    relatedBlogs, // ✅ all related blogs directly
  });
};

module.exports.createBlog = async (req, res, next) => {
  try {
    const newblog = new Blog(req.body);

    function generateIdFromTitle(title) {
      if (!title || typeof title !== "string") return "";

      return title
        .toLowerCase() // convert to lowercase
        .trim() // remove leading/trailing spaces
        .replace(/&/g, "and") // replace & with 'and'
        .replace(/[\s]+/g, "-") // replace spaces (and multiple spaces) with -
        .replace(/[^\w\-]+/g, "") // remove all non-alphanumeric except -
        .replace(/\-+/g, "-") // replace multiple - with single -
        .replace(/^\-+|\-+$/g, ""); // remove leading/trailing -
    }

    newblog.id = generateIdFromTitle(req.body.title);

    if (req.file) {
      const url = req.file.path;
      const filename = req.file.filename;
      newblog.image = { url, filename }; // ✅ only if image is uploaded
    }

    newblog.author = req.user._id;

    await newblog.save();

    req.flash(
      "success",
      "Your blog has been submitted successfully! It will be reviewed shortly and published once approved by our team.",
    );

    res.redirect("/blogs");
  } catch (err) {
    console.error("❌ Blog creation error:", err);
    next(err);
  }
};

module.exports.renderEditForm = async (req, res) => {
  let { id } = req.params;
  const blog = await Blog.findById(id);
  if (!blog) {
    req.flash("error", "Blog you requested for does not exist!");
    return res.redirect("/blogs");
  }
  const cat = undefined;
  let originalImageUrl = blog.image.url;
  if (blog.image && blog.image.url) {
    originalImageUrl = originalImageUrl.replace(
      "/upload",
      "/upload/w_1000,c_limit,f_auto,q_auto",
    );
  }

  res.render("blogs/edit.ejs", { blog, cat, originalImageUrl });
};

module.exports.renderViewrsPage = async (req, res) => {
  const { id } = req.params;
  const page = parseInt(req.query.page) || 1;
  const limit = 10; // 10 viewers per page
  const skip = (page - 1) * limit;

  const blog = await Blog.findById(id).populate("usersSeen");

  if (!blog) {
    req.flash("error", "Blog you requested for does not exist!");
    return res.redirect("/blogs");
  }

  const totalViewers = blog.usersSeen.length;
  const paginatedViewers = blog.usersSeen.slice(skip, skip + limit);
  const totalPages = Math.ceil(totalViewers / limit);

  const cat = undefined;
  res.render("blogs/seenusers.ejs", {
    blog,
    viewers: paginatedViewers,
    totalPages,
    currentPage: page,
    totalViewers,
    cat,
  });
};

module.exports.updateBlog = async (req, res) => {
  const { id } = req.params;

  try {
    const blog = await Blog.findById(id);
    if (!blog) {
      req.flash("error", "Blog not found.");
      return res.redirect("/blogs");
    }

    // Update blog fields
    Object.assign(blog, req.body);
    blog.updatedAt = Date.now();

    // If new image is uploaded
    if (req.file) {
      // Delete old image from Cloudinary
      if (blog.image && blog.image.filename) {
        await cloudinary.uploader.destroy(blog.image.filename);
      }
      blog.image = {
        url: req.file.path,
        filename: req.file.filename,
      };
    }

    blog.isvalid = false;
    await blog.save();

    req.flash(
      "success",
      "Your blog has been successfully updated and sent for review. You can view it under the 'Profile' section in the navigation bar. Our team will review it shortly, and it will be made public soon.",
    );

    res.redirect(`/blogs/${blog._id}`);
  } catch (err) {
    console.error("Error updating blog:", err);
    req.flash("error", "Something went wrong while updating the blog.");
    res.redirect("/blogs");
  }
};

module.exports.destroyBlog = async (req, res) => {
  let { id } = req.params;
  let deleteBlog = await Blog.findByIdAndDelete(id);
  req.flash("success", "Blog Deleted!");
  const url = new URL(req.get("Referrer"));
  redirectUrl = url.pathname === "/blogs/yourblogs" ? url.pathname : "/blogs";

  res.redirect(redirectUrl);
};

//comment post

module.exports.addComment = async (req, res) => {
  const { id } = req.params;

  if (!req.user) {
    req.flash("error", "You must be logged in to comment.");
    return res.redirect(`/blogs/${id}`);
  }

  const { text } = req.body;

  const commentErrorMessages = {
    abusive: "Please avoid using abusive or offensive language.",
    "adult-content": "Adult or explicit content is not allowed.",
    "adult-link": "18+ or unsafe links are not allowed.",
    "adult-emoji": "Inappropriate emojis are not allowed.",
    "too-short": "Comment is too short. Please write something meaningful.",
    "too-long": "Comment is too long.",
    "too-many-links": "Too many links in a comment.",
    "ip-link": "IP-based links are not allowed.",
    "adult-tld": "Adult domain extensions are not allowed.",
    "spam-pattern": "Spam-like text is not allowed.",
  };

  const result = validateComment(text);

  if (!result.valid) {
    const message =
      commentErrorMessages[result.reason] ||
      "Your comment violates our community guidelines.";

    req.flash("error", message);
    return res.redirect(`/blogs/${id}`);
  }

  const blog = await Blog.findById(id);

  blog.comments.push({
    text: result.text,
    user: req.user._id,
  });

  await blog.save();

  req.flash("success", "Comment added successfully!");
  res.redirect(`/blogs/${id}`);
};

// controllers/blogs.js
module.exports.deleteComment = async (req, res) => {
  const { id, comment } = req.params;

  const blog = await Blog.findById(id);

  if (!blog) {
    req.flash("error", "Blog not found");
    return res.redirect("/blogs");
  }

  // Optional: find the comment and check permission before deletion
  const targetComment = blog.comments.find((c) => c._id.equals(comment));
  if (!targetComment) {
    req.flash("error", "Comment not found");
    return res.redirect(`/blogs/${id}`);
  }

  // Optional: Only allow comment owner or admin
  if (!targetComment.user.equals(req.user._id)) {
    req.flash("error", "You are not allowed to delete this comment");
    return res.redirect(`/blogs/${id}`);
  }

  // Pull the comment
  await Blog.findByIdAndUpdate(id, {
    $pull: { comments: { _id: comment } },
  });

  req.flash("success", "Comment deleted!");
  res.redirect(`/blogs/${id}`);
};

module.exports.yourBlogs = async (req, res) => {
  try {
    const perPage = 20;
    const page = parseInt(req.query.page) || 1;

    const totalBlogs = await Blog.countDocuments({ author: req.user._id });

    const blogs = await Blog.find({ author: req.user._id })
      .populate("author")
      .populate("comments.user")
      .populate("usersSeen")
      .sort({ createdAt: -1 }) // latest first
      .skip((page - 1) * perPage)
      .limit(perPage);

    const cat = undefined;
    res.render("blogs/yourblogs.ejs", {
      allBlogs: blogs,
      currentPage: page,
      totalPages: Math.ceil(totalBlogs / perPage),
      totalBlogs,
      cat,
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Unable to fetch your blogs.");
    res.redirect("/blogs");
  }
};

// download blog controller

// Helper: image ko base64 me convert karo
async function getBase64Image(url) {
  const response = await axios.get(url, { responseType: "arraybuffer" });
  return (
    "data:image/jpeg;base64," + Buffer.from(response.data).toString("base64")
  );
}
