const { rateLimit } = require("express-rate-limit");

function createRateLimiter(windowMs, limit, message) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { success: false, message },
  });
}

module.exports.rateLimits = {
  signup: createRateLimiter(15 * 60 * 1000, 5, "Too many signup attempts. Try again later."),
  login: createRateLimiter(15 * 60 * 1000, 15, "Too many login attempts. Try again later."),
  otp: createRateLimiter(15 * 60 * 1000, 5, "Too many verification attempts. Try again later."),
  passwordReset: createRateLimiter(60 * 60 * 1000, 5, "Too many password reset requests. Try again later."),
  contact: createRateLimiter(60 * 60 * 1000, 5, "Too many messages were sent. Try again later."),
  subscribe: createRateLimiter(60 * 60 * 1000, 5, "Too many subscription requests. Try again later."),
  chat: createRateLimiter(60 * 1000, 12, "You are sending messages too quickly. Please wait a moment."),
  download: createRateLimiter(10 * 60 * 1000, 30, "Too many downloads. Please wait before trying again."),
  contribution: createRateLimiter(15 * 60 * 1000, 5, "Too many contribution attempts. Please wait and try again."),
};

module.exports.verifyRecaptcha = (action) => async (req, res, next) => {
  const secret = process.env.GOOGLE_RECAPTCHA_SECRET_KEY;
  const siteKey = process.env.GOOGLE_RECAPTCHA_SITE_KEY;
  if (!secret || !siteKey) {
    if (process.env.NODE_ENV !== "production") return next();
    return res.status(503).json({
      success: false,
      message: "Google reCAPTCHA is not configured. Please contact the site administrator.",
    });
  }

  const token = req.body?.["g-recaptcha-response"];
  if (typeof token !== "string" || !token) {
    return res.status(400).json({ success: false, message: "Complete the CAPTCHA and try again." });
  }

  try {
    const verification = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: req.ip }),
      signal: AbortSignal.timeout(5000),
    });
    if (!verification.ok) {
      return res.status(503).json({ success: false, message: "CAPTCHA verification is temporarily unavailable." });
    }
    const result = await verification.json();
    if (!result.success || result.action !== action || Number(result.score) < 0.5) {
      return res.status(403).json({ success: false, message: "CAPTCHA verification failed. Please try again." });
    }
    return next();
  } catch (error) {
    console.error("Google reCAPTCHA verification failed:", error.message);
    return res.status(503).json({ success: false, message: "CAPTCHA verification is temporarily unavailable." });
  }
};
