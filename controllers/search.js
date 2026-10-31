const Note = require("../models/note");
const Blog = require("../models/blog");

const pages = [
  { title: "Home", url: "/", icon: "fa-house", aliases: "home start homepage" },
  { title: "Browse notes", url: "/notes", icon: "fa-book-open", aliases: "notes study material library download" },
  { title: "Blogs", url: "/blogs", icon: "fa-pen-to-square", aliases: "blogs articles study tips" },
  { title: "About NoteSphere", url: "/about", icon: "fa-circle-info", aliases: "about how it works" },
  { title: "Contact form", url: "/contact", icon: "fa-envelope", aliases: "contact form support help message feedback reach us" },
  { title: "Privacy policy", url: "/privacy", icon: "fa-shield-halved", aliases: "privacy data policy" },
  { title: "Terms of service", url: "/terms", icon: "fa-file-contract", aliases: "terms rules service" },
];

function tokens(value) {
  return String(value || "").toLowerCase().match(/[a-z0-9]+/g) || [];
}

function editDistance(left, right) {
  const rows = Array.from({ length: left.length + 1 }, (_, index) => [index]);
  for (let column = 0; column <= right.length; column += 1) rows[0][column] = column;
  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const substitution = rows[row - 1][column - 1] + (left[row - 1] === right[column - 1] ? 0 : 1);
      rows[row][column] = Math.min(
        rows[row - 1][column] + 1,
        rows[row][column - 1] + 1,
        substitution,
      );
      if (
        row > 1 &&
        column > 1 &&
        left[row - 1] === right[column - 2] &&
        left[row - 2] === right[column - 1]
      ) {
        rows[row][column] = Math.min(rows[row][column], rows[row - 2][column - 2] + 1);
      }
    }
  }
  return rows[left.length][right.length];
}

function relevance(queryTokens, text) {
  const words = tokens(text);
  if (!queryTokens.length || !words.length) return 0;
  let score = 0;
  for (const queryToken of queryTokens) {
    let best = 0;
    for (const word of words) {
      if (word === queryToken) best = 1;
      else if (word.startsWith(queryToken) || queryToken.startsWith(word)) best = Math.max(best, 0.85);
      else if (Math.abs(word.length - queryToken.length) <= 2) {
        const distance = editDistance(word, queryToken);
        const threshold = queryToken.length > 6 ? 2 : 1;
        if (distance <= threshold) best = Math.max(best, 0.9 - distance * 0.1);
      }
    }
    score += best;
  }
  return score / queryTokens.length;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function makeSearchRegex(queryTokens) {
  return new RegExp(queryTokens.map(escapeRegex).join("|"), "i");
}

async function findResults(query, resultLimit) {
  const queryTokens = tokens(query).slice(0, 8);
  if (!queryTokens.length) return [];
  const regex = makeSearchRegex(queryTokens);
  const [matchedNotes, matchedBlogs] = await Promise.all([
    Note.find({
      isPublished: true,
      $or: ["title", "description", "subject", "course", "noteCategory", "keywords"].map((field) => ({
        [field]: regex,
      })),
    })
      .select("title description subject course noteCategory keywords downloadCount createdAt")
      .sort({ downloadCount: -1, createdAt: -1 })
      .limit(100)
      .lean(),
    Blog.find({
      blocked: false,
      $or: ["title", "shortdescription", "content", "category"].map((field) => ({ [field]: regex })),
    })
      .select("title shortdescription content category id createdAt")
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),
  ]);
  const [recentNotes, recentBlogs] = await Promise.all([
    matchedNotes.length < 10
      ? Note.find({ isPublished: true })
          .select("title description subject course noteCategory keywords downloadCount createdAt")
          .sort({ downloadCount: -1, createdAt: -1 })
          .limit(100)
          .lean()
      : [],
    matchedBlogs.length < 10
      ? Blog.find({ blocked: false })
          .select("title shortdescription content category id createdAt")
          .sort({ createdAt: -1 })
          .limit(100)
          .lean()
      : [],
  ]);
  const uniqueDocuments = (documents) => [...new Map(documents.map((document) => [String(document._id), document])).values()];
  const notes = uniqueDocuments([...matchedNotes, ...recentNotes]);
  const blogs = uniqueDocuments([...matchedBlogs, ...recentBlogs]);

  const contentResults = [
    ...notes.map((note) => {
      const text = [note.title, note.subject, note.course, note.noteCategory, note.description, ...(note.keywords || [])].join(" ");
      return {
        title: note.title,
        subtitle: [note.course, note.subject, note.noteCategory].filter(Boolean).join(" · ") || "Study notes",
        url: `/notes/${note._id}`,
        icon: "fa-solid fa-file-lines",
        score: relevance(queryTokens, text) * 1.15,
        date: note.createdAt,
        downloads: note.downloadCount || 0,
      };
    }),
    ...blogs.map((blog) => ({
      title: blog.title,
      subtitle: [blog.category, blog.shortdescription].filter(Boolean).join(" · ") || "NoteSphere blog",
      url: `/blogs/${encodeURIComponent(blog.id || String(blog._id))}`,
      icon: "fa-solid fa-pen-to-square",
      score: relevance(queryTokens, [blog.title, blog.shortdescription, blog.category, blog.content].join(" ")) * 1.1,
      date: blog.createdAt,
    })),
  ];
  const pageResults = pages.map((page) => ({
    title: page.title,
    subtitle: "Page · " + page.url,
    url: page.url,
    icon: `fa-solid ${page.icon}`,
    score: relevance(queryTokens, `${page.title} ${page.aliases}`) * 1.05,
  }));
  return [...contentResults, ...pageResults]
    .filter((result) => result.score >= 0.68)
    .sort((left, right) =>
      right.score - left.score ||
      (right.downloads || 0) - (left.downloads || 0) ||
      new Date(right.date || 0) - new Date(left.date || 0),
    )
    .slice(0, resultLimit)
    .map(({ score, date, downloads, ...result }) => result);
}

module.exports.search = async (req, res) => {
  const query = typeof req.query.q === "string" ? req.query.q.trim().slice(0, 100) : "";
  const parsedLimit = Number.parseInt(req.query.limit, 10);
  const limit = Number.isInteger(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 20) : 20;
  const results = await findResults(query, limit);
  if (req.get("accept")?.includes("application/json")) {
    return res.json({ query, results });
  }
  res.render("search.ejs", { query, results });
};
