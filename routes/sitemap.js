const express = require("express");
const router = express.Router();

const Blog = require("../models/blog");

router.get("/sitemap.xml", async (req, res) => {
  const baseUrl = "https://rootshield.in";

  let urls = `
    <url><loc>${baseUrl}/</loc></url>
	<url><loc>${baseUrl}/login</loc></url>
	<url><loc>${baseUrl}/signup</loc></url>
	<url><loc>${baseUrl}/careers</loc></url>
	<url><loc>${baseUrl}/privacy</loc></url>
	<url><loc>${baseUrl}/terms</loc></url>
    <url><loc>${baseUrl}/about</loc></url>
    <url><loc>${baseUrl}/contact</loc></url>
    <url><loc>${baseUrl}/blogs</loc></url>
    <url><loc>${baseUrl}/courses</loc></url>
  `;

  // Blogs
  const blogs = await Blog.find({}, "id");

  blogs.forEach((blog) => {
    urls += `
      <url>
        <loc>${baseUrl}/blogs/${blog.id}</loc>
      </url>`;
  });


  const xml = `<?xml version="1.0" encoding="UTF-8"?>
  <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${urls}
  </urlset>`;

  res.header("Content-Type", "application/xml");
  res.send(xml);
});

module.exports = router;
