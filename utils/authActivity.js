const AuthActivity = require("../models/authActivity");
const { getDeviceDetails, hashIp } = require("./requestMetadata");

function getEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 254) : "";
}

function getRequestPath(req) {
  return typeof req.path === "string" ? req.path.slice(0, 200) : "";
}

async function recordAuthActivity(req, { event, outcome, user = null, email = "", details = "" }) {
  const deviceDetails = getDeviceDetails(req.get("user-agent") || "");
  return AuthActivity.create({
    user: user?._id || user || null,
    email: getEmail(email || user?.email),
    event,
    outcome,
    details: typeof details === "string" ? details.slice(0, 160) : "",
    path: getRequestPath(req),
    ipHash: hashIp(req.ip),
    device: deviceDetails.category,
    browser: deviceDetails.browser,
  });
}

async function completeAuthActivity(req, update) {
  if (!req.authActivityId) return;
  await AuthActivity.updateOne(
    { _id: req.authActivityId, outcome: "pending" },
    {
      $set: {
        user: update.user?._id || null,
        email: getEmail(update.email || update.user?.email),
        outcome: update.outcome,
        details: typeof update.details === "string" ? update.details.slice(0, 160) : "",
      },
    },
  );
}

module.exports = { recordAuthActivity, completeAuthActivity, getEmail };
