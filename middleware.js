const ExpressError = require("./utils/ExpressError.js");
const User = require("./models/user");
const { blogsSchema } = require("./schema.js");

module.exports.isLoggedIn = (req, res, next) => {
  if (req.isAuthenticated() && (req.user.isBlocked || !req.user.isActive)) {
    return req.logout((error) => {
      if (error) return next(error);
      req.flash("error", "This account is currently unavailable.");
      return res.redirect("/login");
    });
  }
  if (!req.isAuthenticated()) {
    if (req.get("accept")?.includes("application/json")) {
      return res.status(401).json({
        success: false,
        message: "Please log in to use this feature.",
      });
    }
    req.session.redirectUrl = safeLocalRedirect(req.originalUrl);
    req.flash("error", "you are not logedin!");
    return res.redirect("/login");
  }
  next();
};

module.exports.saveRedirectUrl = (req, res, next) => {
  if (req.session.redirectUrl) {
    res.locals.redirectUrl = safeLocalRedirect(req.session.redirectUrl);
  }
  next();
};

module.exports.safeLocalRedirect = (url) =>
  typeof url === "string" && url.startsWith("/") && !url.startsWith("//") && !url.includes("\\")
    ? url
    : "/";

module.exports.isOwner = async (req, res, next) => {
  let { id } = req.params;
  let msg = await Message.findById(id).populate("sender");
  if (!msg.sender.equals(res.locals.currUser)) {
    req.flash("error", "You can't delete this message!");
    return res.redirect(`/inbox`);
  }
  next();
};

module.exports.isAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin" || req.user.isBlocked || !req.user.isActive) {
    req.flash("warning", "You do not have permission to access this page.");
    return res.redirect("/");
  }
  next();
};

module.exports.isVerified = async (req, res, next) => {
  const { email } = req.body; // 👍 extract only email

  const user = await User.findOne({ email });
  if (!user) {
    req.flash("error", "User not found.");
    return res.redirect("/login");
  }

  if (!user.isVerified) {
    req.flash("error", "Please verify your email first.");
    return res.redirect(`/verify-email?email=${email}`);
  }

  next();
};

module.exports.validateBlog = (req, res, next) => {
  let { error } = blogsSchema.validate(req.body);
  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};
