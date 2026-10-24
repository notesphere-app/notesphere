const User = require("../models/user");
const crypto = require("crypto");
const Contact = require("../models/contact");
const Subscriber = require("../models/subscriber");
const Course = require("../models/course");
const Note = require("../models/note");
const Download = require("../models/download");
const Contribution = require("../models/contribution");
const AuthActivity = require("../models/authActivity");
const Blog = require("../models/blog");
const mongoose = require("mongoose");

module.exports.adminDashboard = async (req, res) => {
  try {
    // Get stats
    const [totalUsers, totalCourses] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments({ isActive: true }),
    ]);

    // Get recent 30 days data for growth calculation
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const previousUsers = await User.countDocuments({
      createdAt: { $lt: thirtyDaysAgo },
    });
    const currentUsers = totalUsers - previousUsers;
    const userGrowth =
      previousUsers > 0
        ? Math.round(((currentUsers - previousUsers) / previousUsers) * 100)
        : 100;

    // Get revenue data
    const contributionTotal = await Contribution.aggregate([
      { $match: { status: "paid" } },
      { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
    ]);
    const totalRevenue = (contributionTotal[0]?.total || 0) / 100;

    // Get pending actions
    const [pendingContacts, pendingSubscribers, recentDownloads] = await Promise.all([
      Contact.countDocuments({ isSeen: false }),
      Subscriber.countDocuments({ isVerified: false }),
      Download.find().populate("note", "title").populate("user", "name email")
        .sort({ downloadedAt: -1 }).limit(10).lean(),
    ]);
    const pendingActions = pendingContacts + pendingSubscribers;

    // Get recent users (last 10)
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("name email role isVerified isBlocked createdAt");

    const recentActivities = recentDownloads.map((download) => ({
      type: "system",
      title: "Note downloaded",
      description: `${download.note?.title || "A note"} · ${download.university || "University not provided"} · ${download.college || "College not provided"}`,
      timestamp: download.downloadedAt,
      user: download.user || null,
    }));

    res.render("admin/dashboard.ejs", {
      stats: {
        totalUsers,
        totalCourses,
        totalDownloads: await Download.countDocuments(),
        totalRevenue,
        paidContributionCount: contributionTotal[0]?.count || 0,
        pendingActions,
        userGrowth,
        courseGrowth: 12, // You can calculate this similar to userGrowth
        revenueGrowth: 8, // You can calculate this similar to userGrowth
        activeSessions: Math.floor(Math.random() * 100) + 50, // For demo
        uptime: "99.9%",
      },
      recentUsers,
      recentActivities,
      recentDownloads,
      moment: require("moment"),
      // csrfToken: req.csrfToken(),
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).render("error", {
      message: error.message,
      statusCode: 500,
    });
  }
};

module.exports.index = async (req, res) => {
  res.redirect("/admin/dashboard");
};

// Update your controller
module.exports.contactSubmissions = async (req, res) => {
  try {
    const { filter } = req.query;
    let query = {};

    // Apply filters
    if (filter === "unread") {
      query.isSeen = false;
    } else if (filter === "read") {
      query.isSeen = true;
    }

    const contacts = await Contact.find(query)
      .populate("user")
      .sort({ msgDate: -1 }); // Newest first

    res.render("admin/contact.ejs", {
      contacts,
      filter: filter || "all",
    });
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to load contact submissions");
    res.redirect("/admin");
  }
};

// Add these new controller functions
module.exports.toggleSeen = async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await Contact.findById(id);

    if (!contact) {
      req.flash("error", "Contact not found");
      return res.redirect("/admin/contacts");
    }

    contact.isSeen = !contact.isSeen;
    await contact.save();

    req.flash("success", `Marked as ${contact.isSeen ? "read" : "unread"}`);
    res.redirect("/admin/contacts");
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to update contact status");
    res.redirect("/admin/contacts");
  }
};

module.exports.getContactDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const contact = await Contact.findById(id).populate("user");

    if (!contact) {
      return res.status(404).json({ error: "Contact not found" });
    }

    res.json(contact);
  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to fetch contact details" });
  }
};

module.exports.deleteContact = async (req, res) => {
  try {
    const { id } = req.params;
    await Contact.findByIdAndDelete(id);

    req.flash("success", "Contact message deleted successfully");
    res.redirect("/admin/contacts");
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to delete contact message");
    res.redirect("/admin/contacts");
  }
};

module.exports.subscribers = async (req, res) => {
  try {
    const { filter, search } = req.query;

    let query = {};

    // Apply status filter
    if (filter === "active") {
      query.isActive = true;
      query.isVerified = true;
    } else if (filter === "inactive") {
      query.isActive = false;
    }

    // Apply search filter
    if (search) {
      query.email = { $regex: search, $options: "i" };
    }

    const subscribers = await Subscriber.find(query).sort({ subscribedAt: -1 });

    res.render("admin/subscribers.ejs", {
      subscribers,
      filter: filter || "all",
    });
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to load subscribers");
    res.redirect("/admin");
  }
};

module.exports.createSubscriber = async (req, res) => {
  try {
    const { email, isActive = true } = req.body;
    const shouldActivate = isActive === true || isActive === "true";

    // Check if subscriber already exists
    const existingSubscriber = await Subscriber.findOne({
      email: email.toLowerCase(),
    });
    if (existingSubscriber) {
      return res.status(400).json({
        message: "Subscriber with this email already exists",
      });
    }

    const subscriber = new Subscriber({
      email: email.toLowerCase(),
      isActive: shouldActivate,
      isVerified: shouldActivate,
      subscribedAt: new Date(),
    });

    await subscriber.save();

    res.status(201).json({
      success: true,
      message: "Subscriber added successfully",
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "Failed to add subscriber",
    });
  }
};

module.exports.toggleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const subscriber = await Subscriber.findById(id);

    if (!subscriber) {
      req.flash("error", "Subscriber not found");
      return res.redirect("/admin/subscribers");
    }

    if (!subscriber.isActive && !subscriber.isVerified) {
      req.flash("warning", "This email must be verified before it can be activated.");
      return res.redirect("/admin/subscribers");
    }

    subscriber.isActive = !subscriber.isActive;
    await subscriber.save();

    req.flash(
      "success",
      `Subscriber ${subscriber.isActive ? "activated" : "deactivated"} successfully`,
    );
    res.redirect("/admin/subscribers");
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to update subscriber status");
    res.redirect("/admin/subscribers");
  }
};

module.exports.deleteSubscriber = async (req, res) => {
  try {
    const { id } = req.params;
    await Subscriber.findByIdAndDelete(id);

    req.flash("success", "Subscriber deleted successfully");
    res.redirect("/admin/subscribers");
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to delete subscriber");
    res.redirect("/admin/subscribers");
  }
};

module.exports.bulkAction = async (req, res) => {
  try {
    const { action, subscriberIds } = req.body;

    if (!action || !subscriberIds || subscriberIds.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid request" });
    }

    switch (action) {
      case "activate":
        await Subscriber.updateMany(
          { _id: { $in: subscriberIds }, isVerified: true },
          { $set: { isActive: true } },
        );
        break;

      case "deactivate":
        await Subscriber.updateMany(
          { _id: { $in: subscriberIds } },
          { $set: { isActive: false } },
        );
        break;

      case "delete":
        await Subscriber.deleteMany({ _id: { $in: subscriberIds } });
        break;

      default:
        return res
          .status(400)
          .json({ success: false, message: "Invalid action" });
    }

    res.json({ success: true, message: "Bulk action completed successfully" });
  } catch (err) {
    console.log(err);
    res
      .status(500)
      .json({ success: false, message: "Failed to perform bulk action" });
  }
};

module.exports.exportSubscribers = async (req, res) => {
  try {
    const subscribers = await Subscriber.find().sort({ subscribedAt: -1 });

    let csvContent = "Email,Status,Subscribed Date,Subscribed Time\n";

    subscribers.forEach((subscriber) => {
      const date = new Date(subscriber.subscribedAt);
      const formattedDate = date.toLocaleDateString();
      const formattedTime = date.toLocaleTimeString();
      const status = subscriber.isActive ? "Active" : "Inactive";

      csvContent += `"${subscriber.email}","${status}","${formattedDate}","${formattedTime}"\n`;
    });

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=subscribers-${new Date().toISOString().split("T")[0]}.csv`,
    );
    res.send(csvContent);
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to export subscribers");
    res.redirect("/admin/subscribers");
  }
};

module.exports.listUsers = async (req, res) => {
  const users = await User.find()
    .select("name email mobile role isActive isBlocked isVerified university college createdAt")
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();
  res.render("admin/users.ejs", { users });
};

module.exports.updateUser = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    req.flash("error", "User not found.");
    return res.redirect("/admin/users");
  }
  const user = await User.findById(req.params.id);
  if (!user) {
    req.flash("error", "User not found.");
    return res.redirect("/admin/users");
  }
  const { name, mobile, university, college, role, isActive, isBlocked, isVerified } = req.body;
  const cleanName = typeof name === "string" ? name.trim() : "";
  const cleanMobile = typeof mobile === "string" ? mobile.trim() : "";
  const cleanUniversity = typeof university === "string" ? university.trim() : "";
  const cleanCollege = typeof college === "string" ? college.trim() : "";
  if (
    !cleanName || cleanName.length > 100 ||
    (cleanMobile && !/^[0-9+() -]{7,20}$/.test(cleanMobile)) ||
    cleanUniversity.length > 160 || cleanCollege.length > 160 ||
    !["user", "admin"].includes(role) ||
    !["true", "false"].includes(isActive) ||
    !["true", "false"].includes(isBlocked) ||
    !["true", "false"].includes(isVerified)
  ) {
    req.flash("error", "Check the user details and status values.");
    return res.redirect(`/admin/users/${user._id}`);
  }
  if (
    String(user._id) === String(req.user._id) &&
    (role !== "admin" || isActive !== "true" || isBlocked === "true")
  ) {
    req.flash("error", "You cannot remove or disable your own administrator access.");
    return res.redirect(`/admin/users/${user._id}`);
  }
  if (user.role === "admin" && role !== "admin") {
    const activeAdmins = await User.countDocuments({ role: "admin", isActive: true, isBlocked: false });
    if (activeAdmins <= 1) {
      req.flash("error", "The last active administrator cannot be demoted.");
      return res.redirect(`/admin/users/${user._id}`);
    }
  }
  if (cleanMobile && cleanMobile !== user.mobile) {
    const duplicateMobile = await User.exists({ mobile: cleanMobile, _id: { $ne: user._id } });
    if (duplicateMobile) {
      req.flash("error", "That mobile number is already assigned to another account.");
      return res.redirect(`/admin/users/${user._id}`);
    }
  }
  user.name = cleanName;
  user.mobile = cleanMobile || undefined;
  user.university = cleanUniversity;
  user.college = cleanCollege;
  user.role = role;
  user.isActive = isActive === "true";
  user.isBlocked = isBlocked === "true";
  user.isVerified = isVerified === "true";
  await user.save();
  req.flash("success", "User account updated.");
  res.redirect(`/admin/users/${user._id}`);
};

module.exports.userDetails = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    req.flash("error", "User not found.");
    return res.redirect("/admin/users");
  }
  const user = await User.findById(req.params.id)
    .select("-hash -salt -otp -resetPasswordToken -verificationToken")
    .populate("savedNotes", "title course semester")
    .populate("savedBlogs", "title")
    .lean();
  if (!user) {
    req.flash("error", "User not found.");
    return res.redirect("/admin/users");
  }
  const [
    notes,
    downloads,
    contacts,
    authActivities,
    contributions,
    likedNotes,
    commentedNotes,
    likedBlogs,
    commentedBlogs,
  ] = await Promise.all([
    Note.find({ author: user._id }).sort({ createdAt: -1 }).limit(100).lean(),
    Download.find({ user: user._id }).populate("note", "title").sort({ downloadedAt: -1 }).limit(100).lean(),
    Contact.find({ user: user._id }).sort({ msgDate: -1 }).limit(100).lean(),
    AuthActivity.find({
      $or: [{ user: user._id }, ...(user.email ? [{ email: user.email }] : [])],
    }).sort({ createdAt: -1 }).limit(200).lean(),
    Contribution.find({ user: user._id }).sort({ createdAt: -1 }).limit(100).lean(),
    Note.find({ likes: user._id }).select("title course subject").sort({ updatedAt: -1 }).limit(100).lean(),
    Note.find({ "comments.user": user._id }).select("title comments").sort({ updatedAt: -1 }).limit(100).lean(),
    Blog.find({ likes: user._id }).select("title id").sort({ updatedAt: -1 }).limit(100).lean(),
    Blog.find({ "comments.user": user._id }).select("title id comments").sort({ updatedAt: -1 }).limit(100).lean(),
  ]);
  res.render("admin/userDetails.ejs", {
    user,
    notes,
    downloads,
    contacts,
    authActivities,
    contributions,
    likedNotes,
    commentedNotes: commentedNotes.map((note) => ({
      title: note.title,
      comments: note.comments.filter((comment) => String(comment.user) === String(user._id)),
    })),
    likedBlogs,
    commentedBlogs: commentedBlogs.map((blog) => ({
      title: blog.title,
      id: blog.id,
      comments: blog.comments.filter((comment) => String(comment.user) === String(user._id)),
    })),
  });
};

module.exports.downloads = async (req, res) => {
  const downloads = await Download.find()
    .populate("note", "title course subject")
    .populate("course", "name")
    .populate("user", "name email")
    .sort({ downloadedAt: -1 })
    .limit(500)
    .lean();
  res.render("admin/downloads.ejs", { downloads });
};

module.exports.contributions = async (req, res) => {
  const contributions = await Contribution.find()
    .populate("user", "name email")
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  res.render("admin/contributions.ejs", { contributions });
};

module.exports.authActivity = async (req, res) => {
  const activities = await AuthActivity.find()
    .populate("user", "name email")
    .sort({ createdAt: -1 })
    .limit(500)
    .lean();
  res.render("admin/auth-activity.ejs", { activities });
};
