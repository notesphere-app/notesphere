const express = require("express");
const router = express.Router();

const Blog = require("../models/blog");
const Note = require("../models/note");

router.get("/sitemap.xml", async (req, res) => {
  const baseUrl = "https://notesphere.online";
  const [blogs, notes] = await Promise.all([
    Blog.find({ blocked: false, id: { $type: "string", $ne: "" } }).select("id").lean(),
    Note.find({ isPublished: true }).select("_id").lean(),
  ]);
  const staticPaths = ["/", "/notes", "/blogs", "/about", "/contact", "/privacy", "/terms", "/cookies"];
  const locations = [
    ...staticPaths.map((pathname) => `${baseUrl}${pathname}`),
    ...blogs.map((blog) => `${baseUrl}/blogs/${encodeURIComponent(blog.id)}`),
    ...notes.map((note) => `${baseUrl}/notes/${note._id}`),
  ];
  const escapeXml = (value) =>
    value.replace(/[<>&'"]/g, (character) => ({
      "<": "&lt;",
      ">": "&gt;",
      "&": "&amp;",
      "'": "&apos;",
      '"': "&quot;",
    })[character]);
  const urls = locations.map((location) => `<url><loc>${escapeXml(location)}</loc></url>`).join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls}
  </urlset>`;

  res.header("Content-Type", "application/xml; charset=utf-8");
  res.send(xml);
});

module.exports = router;
