const { rateLimit } = require("express-rate-limit");
const { RecaptchaEnterpriseServiceClient } = require("@google-cloud/recaptcha-enterprise");

let recaptchaClient;

function getRecaptchaClient(projectId) {
  if (recaptchaClient) return recaptchaClient;

  const credentialJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  const credentialJsonBase64 = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64;
  if (credentialJson || credentialJsonBase64) {
    let credentials;
    const credentialVariable = credentialJsonBase64
      ? "GOOGLE_SERVICE_ACCOUNT_JSON_BASE64"
      : "GOOGLE_SERVICE_ACCOUNT_JSON";
    const jsonCandidates = credentialJsonBase64
      ? [Buffer.from(credentialJsonBase64, "base64").toString("utf8")]
      : [
          credentialJson,
          Buffer.from(credentialJson.trim(), "base64").toString("utf8"),
        ];
    let parseError;
    try {
      for (const json of jsonCandidates) {
        try {
          credentials = JSON.parse(json);
          break;
        } catch (error) {
          parseError = error;
        }
      }
      if (!credentials) throw parseError;
    } catch (error) {
      const configurationError = new Error(`${credentialVariable} must contain valid service-account JSON or its base64 encoding.`);
      configurationError.code = "INVALID_RECAPTCHA_CREDENTIALS";
      throw configurationError;
    }
    if (!credentials.client_email || !credentials.private_key) {
      const configurationError = new Error(`${credentialVariable} must contain client_email and private_key fields.`);
      configurationError.code = "INVALID_RECAPTCHA_CREDENTIALS";
      throw configurationError;
    }
    recaptchaClient = new RecaptchaEnterpriseServiceClient({ projectId, credentials });
    return recaptchaClient;
  }

  const isRender = process.env.RENDER === "true" || Boolean(process.env.RENDER_SERVICE_ID);
  if (isRender && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    throw new Error(
      "Render needs GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_SERVICE_ACCOUNT_JSON_BASE64, or a GOOGLE_APPLICATION_CREDENTIALS secret-file path for reCAPTCHA Enterprise.",
    );
  }

  recaptchaClient = new RecaptchaEnterpriseServiceClient({ projectId });
  return recaptchaClient;
}

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

  const isRender = process.env.RENDER === "true" || Boolean(process.env.RENDER_SERVICE_ID);
  if (
    isRender &&
    !process.env.GOOGLE_SERVICE_ACCOUNT_JSON &&
    !process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 &&
    !process.env.GOOGLE_APPLICATION_CREDENTIALS
  ) {
    console.error(
      "reCAPTCHA Enterprise is unavailable: configure a service-account secret in Render.",
    );
    return res.status(503).json({
      success: false,
      message: "Google reCAPTCHA Enterprise credentials are not configured. Please contact the site administrator.",
    });
  }

  const token = req.body?.["g-recaptcha-response"];
  if (typeof token !== "string" || !token) {
    return res.status(400).json({ success: false, message: "Complete the CAPTCHA and try again." });
  }

  try {
    const client = getRecaptchaClient(projectId);
    const expectedAction = action.toUpperCase().replace(/[^A-Z0-9]+/g, "_");
    const [assessment] = await client.createAssessment({
      parent: client.projectPath(projectId),
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
    if (error.code === "INVALID_RECAPTCHA_CREDENTIALS") {
      return res.status(503).json({
        success: false,
        message: "Google reCAPTCHA Enterprise credentials are invalid. Please contact the site administrator.",
      });
    }
    return res.status(503).json({ success: false, message: "CAPTCHA verification is temporarily unavailable." });
  }
};
