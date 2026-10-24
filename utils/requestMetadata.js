const crypto = require("crypto");

function getDeviceDetails(userAgent = "") {
  const ua = userAgent.toLowerCase();
  const category = /ipad|tablet|playbook|silk/.test(ua)
    ? "tablet"
    : /mobile|iphone|ipod|android/.test(ua)
      ? "mobile"
      : userAgent
        ? "desktop"
        : "unknown";
  const browser = /edg\//.test(ua)
    ? "Edge"
    : /opr\//.test(ua)
      ? "Opera"
      : /firefox\//.test(ua)
        ? "Firefox"
        : /chrome\//.test(ua)
          ? "Chrome"
          : /safari\//.test(ua)
            ? "Safari"
            : "unknown";

  return { category, browser };
}

function hashIp(ip) {
  if (!ip || !process.env.SECRET) return "";
  return crypto.createHmac("sha256", process.env.SECRET).update(ip).digest("hex");
}

module.exports = { getDeviceDetails, hashIp };
