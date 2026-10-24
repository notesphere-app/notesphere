const { rateLimit } = require("express-rate-limit");
const { RecaptchaEnterpriseServiceClient } = require("@google-cloud/recaptcha-enterprise");

let recaptchaClient;

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
  const siteKey = process.env.GOOGLE_RECAPTCHA_SITE_KEY;
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT;
  if (!siteKey || !projectId) {
    return res.status(503).json({
      success: false,
      message: "Google reCAPTCHA Enterprise is not configured. Please contact the site administrator.",
    });
  }

  const token = req.body?.["g-recaptcha-response"];
  if (typeof token !== "string" || !token) {
    return res.status(400).json({ success: false, message: "Complete the CAPTCHA and try again." });
  }

  try {
    if (!recaptchaClient) {
      recaptchaClient = new RecaptchaEnterpriseServiceClient();
    }
    const expectedAction = action.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
    const [assessment] = await recaptchaClient.createAssessment({
      parent: recaptchaClient.projectPath(projectId),
      assessment: {
        event: { token, siteKey },
      },
    });
    const tokenProperties = assessment.tokenProperties;
    if (!tokenProperties?.valid) {
      console.warn("reCAPTCHA Enterprise rejected a token:", tokenProperties?.invalidReason || "unknown reason");
      return res.status(403).json({ success: false, message: "CAPTCHA verification failed. Please try again." });
    }
    if (tokenProperties.action !== expectedAction) {
      console.warn("reCAPTCHA Enterprise action mismatch:", tokenProperties.action || "missing action");
      return res.status(403).json({ success: false, message: "CAPTCHA verification failed. Please try again." });
    }

    const thresholdSetting = process.env.GOOGLE_RECAPTCHA_SCORE_THRESHOLD;
    const configuredThreshold =
      typeof thresholdSetting === "string" && thresholdSetting.trim()
        ? Number(thresholdSetting)
        : NaN;
    const scoreThreshold =
      Number.isFinite(configuredThreshold) && configuredThreshold >= 0 && configuredThreshold <= 1
        ? configuredThreshold
        : 0.5;
    const score = Number(assessment.riskAnalysis?.score);
    if (!Number.isFinite(score) || score < scoreThreshold) {
      return res.status(403).json({ success: false, message: "CAPTCHA verification failed. Please try again." });
    }

    return next();
  } catch (error) {
    console.error("Google reCAPTCHA Enterprise assessment failed:", {
      message: error.message,
      code: error.code,
    });
    return res.status(503).json({ success: false, message: "CAPTCHA verification is temporarily unavailable." });
  }
};
