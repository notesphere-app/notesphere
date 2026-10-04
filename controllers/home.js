const User = require("../models/user");
const Servise = require("../models/services");
const Blog = require("../models/blog");
const { all } = require("axios");

module.exports.homePage = async (req, res, next) => {
  if (!req.user) {
    const totalUsers = (await User.find()).length;

    const blogs = await Blog.find()
      .populate("author")
      .sort({ createdAt: -1 })
      .limit(6);

    res.render("notesphere/home.ejs", {
      totalUsers,
      blogs,
    });
  } else {
    next();
  }
};

module.exports.index = async (req, res) => {
  try {
    const totalUsers = (await User.find()).length;
  
    const blogs = await Blog.find()
      .populate("author")
      .sort({ createdAt: -1 })
      .limit(6);

    res.render("notesphere/home.ejs", {
      totalUsers,
      blogs,
    });
  } catch (error) {
    console.log(error);
    req.flash("error", "Something went wrong!");
    res.redirect("/login");
  }
};

module.exports.profile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const links = await Link.find({ user: req.user._id });

    const totalLinks = links.length;
    const totalClicks = links.reduce((sum, link) => sum + link.clicks, 0);

    res.render("users/profile.ejs", {
      User: user,
      totalLinks,
      totalClicks,
      links,
    });
  } catch (err) {
    req.flash("error", "Unable to load profile");
    res.redirect("/");
  }
};

module.exports.dashBoard = (req, res) => {
  res.render("TinyLink/healthz.ejs");
};

module.exports.about = (req, res) => {
  res.render("others/about.ejs");
};
module.exports.privacy = (req, res) => {
  res.render("others/privacy.ejs");
};
module.exports.terms = (req, res) => {
  res.render("others/terms.ejs");
};
module.exports.contact = (req, res) => {
  res.render("others/contact.ejs");
};