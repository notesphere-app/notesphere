const User = require("../models/user");
const Blog = require("../models/blog");
const Note = require("../models/note");
const Course = require("../models/course");
const moment = require("moment");

async function renderHome(req, res) {
  const [
    totalUsers,
    totalNotes,
    contributors,
    downloads,
    totalCourses,
    activeCourses,
    notesByCourse,
    notes,
    latestNotes,
    blogs,
    trendingSubjects,
  ] = await Promise.all([
    User.countDocuments({ role: { $ne: "admin" }, isBlocked: { $ne: true }, isActive: { $ne: false } }),
    Note.countDocuments({ isPublished: true }),
    Note.distinct("author", { isPublished: true }),
    Note.aggregate([
      { $match: { isPublished: true } },
      { $group: { _id: null, total: { $sum: "$downloadCount" } } },
    ]),
    Course.countDocuments({ isActive: true }),
    Course.find({ isActive: true }).select("_id name slug semesterCount specializations").sort({ name: 1 }).limit(8).lean(),
    Note.aggregate([
      { $match: { isPublished: true, courseId: { $exists: true, $ne: null } } },
      { $group: { _id: "$courseId", total: { $sum: 1 } } },
    ]),
    Note.find({ isPublished: true })
      .populate("author", "name username avatar")
      .sort({ downloadCount: -1, createdAt: -1 })
      .limit(6)
      .lean(),
    Note.find({ isPublished: true })
      .populate("author", "name username")
      .sort({ createdAt: -1 })
      .limit(4)
      .lean(),
    Blog.find({ blocked: false })
      .populate("author", "name username avatar")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean(),
    Note.aggregate([
      { $match: { isPublished: true, subject: { $type: "string", $ne: "" } } },
      { $group: { _id: "$subject", total: { $sum: 1 } } },
      { $sort: { total: -1, _id: 1 } },
      { $limit: 8 },
    ]),
  ]);

  const displayNotes = notes.map((note, index) => ({
    id: String(note._id),
    title: note.title || "Untitled note",
    excerpt: note.description || "Open this note to view its shared resource.",
    cover: "/images/note-thumbnail.svg",
    tag: note.subject || note.course || "Study notes",
    author: note.author?.name || note.author?.username || "NoteSphere student",
    avatar: note.author?.avatar || "/images/logo.png",
    date: note.createdAt ? moment(note.createdAt).fromNow() : "Recently added",
    pages: note.type ? note.type.charAt(0).toUpperCase() + note.type.slice(1) : "Shared resource",
    downloads: Number(note.downloadCount || 0).toLocaleString("en-IN"),
    downloadsNum: Number(note.downloadCount || 0),
    upvotes: Array.isArray(note.likes) ? note.likes.length : 0,
    recency: note.createdAt ? new Date(note.createdAt).getTime() : 0,
    featured: index === 0,
    featuredBelow: index === 1,
  }));
  const downloadTotal = downloads[0]?.total || 0;

  const latestBlogs = blogs.map((blog) => ({
    id: blog.id || String(blog._id),
    title: blog.title || "Untitled article",
    excerpt: blog.shortdescription || "Read this article from the NoteSphere community.",
    cover: blog.image?.url || "/images/logo.png",
    author: blog.author?.name || blog.author?.username || "NoteSphere editor",
    avatar: blog.author?.avatar || "/images/logo.png",
    date: blog.createdAt ? moment(blog.createdAt).format("MMM D, YYYY") : "Recently published",
    likes: Array.isArray(blog.likes) ? blog.likes.length : 0,
    comments: Array.isArray(blog.comments) ? blog.comments.length : 0,
  }));

  const activityFeed = latestNotes.map((note) => ({
    who: note.author?.name || note.author?.username || "A student",
    action: `shared ${note.title || "a note"}`,
    tag: note.subject || note.course || "Study notes",
  }));
  const noteCountsByCourse = new Map(notesByCourse.map((item) => [String(item._id), item.total]));
  const homeCourses = activeCourses.map((course) => ({
    id: String(course._id),
    name: course.name,
    slug: course.slug,
    semesterCount: course.semesterCount,
    specializations: course.specializations || [],
    noteCount: noteCountsByCourse.get(String(course._id)) || 0,
  }));
  const latestNote = latestNotes[0];
  const heroNote = latestNote
    ? {
        id: String(latestNote._id),
        title: latestNote.title,
        description: latestNote.description || "Open this shared resource to learn more.",
        course: latestNote.course,
        subject: latestNote.subject,
        author: latestNote.author?.name || latestNote.author?.username || "NoteSphere student",
        createdAt: latestNote.createdAt,
      }
    : null;

  res.render("notesphere/home.ejs", {
    homeStats: [
      { label: "Published notes", value: totalNotes, suffix: "" },
      { label: "Community members", value: totalUsers, suffix: "" },
      { label: "Downloads recorded", value: downloadTotal, suffix: "" },
      { label: "Active courses", value: totalCourses, suffix: "" },
    ],
    featuredNotes: displayNotes,
    homeBlogs: latestBlogs,
    homeActivity: activityFeed,
    homeSubjects: trendingSubjects.map((item) => item._id),
    homeCourses,
    heroNote,
    totalUsers,
  });
}

module.exports.homePage = async (req, res, next) => {
  try {
    await renderHome(req, res);
  } catch (error) {
    next(error);
  }
};

module.exports.index = module.exports.homePage;

module.exports.dashBoard = (req, res) => {
  res.render("TinyLink/healthz.ejs");
};

module.exports.about = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalNotes,
      contributors,
      downloadStats,
      totalCourses,
      recentMembers,
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: "admin" }, isBlocked: { $ne: true }, isActive: { $ne: false } }),
      Note.countDocuments({ isPublished: true }),
      Note.distinct("author", { isPublished: true }),
      Note.aggregate([
        { $match: { isPublished: true } },
        { $group: { _id: null, total: { $sum: "$downloadCount" } } },
      ]),
      Course.countDocuments({ isActive: true }),
      User.find({ role: { $ne: "admin" }, isBlocked: { $ne: true }, isActive: { $ne: false } })
        .select("name username avatar createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean(),
    ]);

    res.render("others/about.ejs", {
      communityStats: [
        { label: "Published notes", value: totalNotes, suffix: "" },
        { label: "Student contributors", value: contributors.length, suffix: "" },
        { label: "Downloads recorded", value: downloadStats[0]?.total || 0, suffix: "" },
        { label: "Active courses", value: totalCourses, suffix: "" },
      ],
      totalUsers,
      recentMembers,
    });
  } catch (error) {
    next(error);
  }
};

module.exports.privacy = (req, res) => {
  res.render("others/privacy.ejs");
};
module.exports.terms = (req, res) => {
  res.render("others/terms.ejs");
};
module.exports.cookies = (req, res) => {
  res.render("others/cookies.ejs");
};
module.exports.contact = (req, res) => {
  res.render("others/contact.ejs");
};
