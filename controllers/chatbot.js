const Course = require("../models/course");
const Note = require("../models/note");

module.exports.reply = async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ success: false, message: "The assistant is not configured yet." });
  }
  const message = typeof req.body.message === "string" ? req.body.message.trim() : "";
  if (!message || message.length > 1000) {
    return res.status(400).json({ success: false, message: "Enter a message up to 1,000 characters." });
  }

  const [courses, notes] = await Promise.all([
    Course.find({ isActive: true }).sort({ name: 1 }).limit(40)
      .select("name specializations semesterCount universities").lean(),
    Note.find({ isPublished: true }).sort({ createdAt: -1 }).limit(30)
      .select("title course specialization semester subject university college").lean(),
  ]);
  const catalog = {
    courses: courses.map(({ name, specializations, semesterCount, universities }) => ({
      name,
      specializations,
      semesters: semesterCount,
      universities: universities.map((university) => ({
        name: university.name,
        colleges: university.colleges,
      })),
    })),
    notes: notes.map(({ title, course, specialization, semester, subject, university, college }) => ({
      title, course, specialization, semester, subject, university, college,
    })),
  };
  const systemPrompt = [
    "You are NoteSphere Assistant, a concise, friendly guide for the NoteSphere student notes library.",
    "Help users find published notes and courses using only the catalog below. Never invent availability, prices, features, or policies.",
    "Explain that a note can be opened from its detail page, and users can browse/search at /notes.",
    "Useful pages: Home /, Notes /notes, Blogs /blogs, About /about, Contact /contact, Profile /profile.",
    "Users sign in at /login and create an account at /signup. Note submissions are URL links and require an account.",
    "If the requested course or campus is not listed, say it is not currently in the catalog and suggest the Contact page.",
    `Current catalog data: ${JSON.stringify(catalog)}`,
  ].join("\n");

  const history = Array.isArray(req.body.history)
    ? req.body.history.slice(-6).filter((item) =>
      item &&
      ["user", "model"].includes(item.role) &&
      typeof item.text === "string" &&
      item.text.length <= 1000,
    )
    : [];
  const contents = history.map((item) => ({
    role: item.role,
    parts: [{ text: item.text }],
  }));
  contents.push({ role: "user", parts: [{ text: message }] });

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 500, temperature: 0.3 },
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const apiError = errorBody.error || {};
      const apiMessage = typeof apiError.message === "string" ? apiError.message : "";
      const apiStatus = typeof apiError.status === "string" ? apiError.status : "";
      console.error("Gemini API request failed:", {
        status: response.status,
        apiStatus,
        message: apiMessage.slice(0, 500),
        model,
      });

      if (response.status === 429 || apiStatus === "RESOURCE_EXHAUSTED") {
        return res.status(503).json({
          success: false,
          message: "The free AI assistant has reached its current usage limit. Please wait a little and try again.",
        });
      }
      if (response.status === 401 || response.status === 403) {
        return res.status(503).json({
          success: false,
          message: "The AI assistant API key is invalid or does not have access to this model. Please contact the site administrator.",
        });
      }
      if (response.status === 404) {
        return res.status(503).json({
          success: false,
          message: "The configured free Gemini model is unavailable. Please contact the site administrator.",
        });
      }
      return res.status(502).json({ success: false, message: "The assistant could not respond just now. Please try again." });
    }
    const result = await response.json();
    const reply = result.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim();
    if (!reply) {
      return res.status(502).json({ success: false, message: "The assistant returned an empty response. Please try again." });
    }
    return res.json({ success: true, reply: reply.slice(0, 4000) });
  } catch (error) {
    console.error("Gemini request failed:", error.message);
    return res.status(502).json({ success: false, message: "The assistant is temporarily unavailable. Please try again." });
  }
};
