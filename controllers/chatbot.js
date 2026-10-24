const Course = require("../models/course");
const Note = require("../models/note");
const { GoogleGenAI, Modality } = require("@google/genai");

function generateLiveReply({ apiKey, model, systemPrompt, contents }) {
  let session;
  let timeout;
  let completionTimer;
  let settled = false;
  let turnComplete = false;
  let reply = "";

  return new Promise((resolve, reject) => {
    const finish = (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      clearTimeout(completionTimer);
      if (session) {
        try {
          session.close();
        } catch (closeError) {
          console.error("Could not close Gemini Live API session:", closeError.message);
        }
      }
      if (error) reject(error);
      else resolve(reply.trim());
    };

    timeout = setTimeout(() => finish(new Error("Gemini Live API request timed out.")), 15000);

    (async () => {
      try {
        const ai = new GoogleGenAI({ apiKey });
        session = await ai.live.connect({
          model,
          config: {
            responseModalities: [Modality.AUDIO],
            outputAudioTranscription: {},
            systemInstruction: systemPrompt,
            temperature: 0.3,
            maxOutputTokens: 500,
          },
          callbacks: {
            onmessage: (message) => {
              const serverContent = message.serverContent;
              const transcription = serverContent?.outputTranscription;
              if (transcription?.text) reply += transcription.text;

              if (transcription?.finished) {
                finish();
              } else if (serverContent?.turnComplete) {
                turnComplete = true;
                completionTimer = setTimeout(() => finish(), 1000);
              } else if (turnComplete && transcription?.text) {
                clearTimeout(completionTimer);
                completionTimer = setTimeout(() => finish(), 1000);
              }
            },
            onerror: (error) => finish(error),
            onclose: (event) => {
              if (!settled) finish(new Error(event.reason || "Gemini Live API connection closed unexpectedly."));
            },
          },
        });

        if (settled) {
          session.close();
          return;
        }

        session.sendClientContent({ turns: contents, turnComplete: true });
      } catch (error) {
        finish(error);
      }
    })();
  });
}

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

  const model = "gemini-3.8-live";
  try {
    const reply = await generateLiveReply({ apiKey, model, systemPrompt, contents });
    if (!reply) {
      return res.status(502).json({ success: false, message: "The assistant returned an empty response. Please try again." });
    }
    return res.json({ success: true, reply: reply.slice(0, 4000) });
  } catch (error) {
    const message = typeof error?.message === "string" ? error.message : "";
    const status = Number(error?.status) || 0;
    console.error("Gemini Live API request failed:", { status, message: message.slice(0, 500), model });
    if (status === 429 || /quota|resource[_ ]exhausted|rate limit/i.test(message)) {
      return res.status(503).json({
        success: false,
        message: "The AI assistant has reached its current usage limit. Please wait a little and try again.",
      });
    }
    if (status === 401 || status === 403 || /api key|unauthorized|permission denied/i.test(message)) {
      return res.status(503).json({
        success: false,
        message: "The AI assistant API key is invalid or does not have access to this model. Please contact the site administrator.",
      });
    }
    if (status === 404 || /model.*not found|not supported/i.test(message)) {
      return res.status(503).json({
        success: false,
        message: "The configured Gemini Live model is unavailable. Please contact the site administrator.",
      });
    }
    return res.status(502).json({ success: false, message: "The assistant is temporarily unavailable. Please try again." });
  }
};
