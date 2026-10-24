function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function renderEmail({
  title,
  greeting,
  paragraphs = [],
  code,
  actionLabel,
  actionUrl,
  notice,
  siteUrl = process.env.DOMAIN || "https://notesphere.online",
  supportEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM || "support.notesphere@gmail.com",
}) {
  const safeTitle = escapeHtml(title);
  const safeGreeting = escapeHtml(greeting);
  const safeParagraphs = paragraphs
    .map((paragraph) => `<p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.65;">${escapeHtml(paragraph)}</p>`)
    .join("");
  const codeBlock = code
    ? `<p style="margin:22px 0 8px;color:#475569;font-size:14px;">Your verification code:</p><p style="margin:0 0 22px;padding:14px 18px;border-radius:10px;background:#eff6ff;color:#0878e8;font-size:28px;font-weight:700;letter-spacing:8px;text-align:center;">${escapeHtml(code)}</p>`
    : "";
  const actionBlock = actionLabel && actionUrl
    ? `<p style="margin:24px 0;text-align:center;"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;padding:12px 22px;border-radius:10px;background:#0878e8;color:#fff;font-size:15px;font-weight:700;text-decoration:none;">${escapeHtml(actionLabel)}</a></p><p style="margin:0 0 18px;color:#64748b;font-size:13px;line-height:1.6;word-break:break-word;">If the button does not work, copy this link into your browser:<br><a href="${escapeHtml(actionUrl)}" style="color:#0878e8;">${escapeHtml(actionUrl)}</a></p>`
    : "";
  const noticeBlock = notice
    ? `<p style="margin:20px 0 0;padding:12px 14px;border-left:3px solid #0878e8;border-radius:6px;background:#f1f7fe;color:#475569;font-size:13px;line-height:1.6;">${escapeHtml(notice)}</p>`
    : "";
  const safeSiteUrl = escapeHtml(siteUrl.replace(/\/$/, ""));
  const safeSupportEmail = escapeHtml(supportEmail);

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${safeTitle} | NoteSphere</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;border:1px solid #e2e8f0;border-radius:14px;background:#fff;overflow:hidden;">
        <tr><td style="padding:20px 24px;background:#022e5a;color:#fff;">
          <a href="${safeSiteUrl}" style="color:#fff;text-decoration:none;font-size:21px;font-weight:700;">NoteSphere</a>
          <div style="margin-top:4px;color:#dbeafe;font-size:12px;">Student notes, courses, and learning resources</div>
        </td></tr>
        <tr><td style="padding:26px 24px;">
          <h1 style="margin:0 0 16px;color:#022e5a;font-size:22px;line-height:1.35;">${safeTitle}</h1>
          <p style="margin:0 0 16px;color:#0f172a;font-size:15px;font-weight:600;">Hello ${safeGreeting},</p>
          ${safeParagraphs}${codeBlock}${actionBlock}${noticeBlock}
          <p style="margin:24px 0 0;color:#64748b;font-size:13px;line-height:1.6;">Need help? <a href="mailto:${safeSupportEmail}" style="color:#0878e8;">${safeSupportEmail}</a></p>
        </td></tr>
        <tr><td style="padding:14px 24px;border-top:1px solid #e2e8f0;background:#f8fafc;color:#64748b;font-size:12px;">
          <a href="${safeSiteUrl}" style="color:#0878e8;text-decoration:none;">${safeSiteUrl.replace(/^https?:\/\//, "")}</a> · Automated message from NoteSphere
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { renderEmail };
