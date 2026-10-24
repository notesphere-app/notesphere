if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const brevo = require("@getbrevo/brevo");
const { getEmailSender, getSupportEmail } = require("./emailSender");

function escapeHtml(value) {
  return String(value || "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

module.exports.welComeEmail = async ({ name, email }) => {
  if (!process.env.BREVO_API_KEY) throw new Error("BREVO_API_KEY must be configured to send email.");
  const siteUrl = (process.env.DOMAIN || "https://notesphere.online").replace(/\/$/, "");
  const safeName = escapeHtml(name || "there");
  const supportEmail = escapeHtml(getSupportEmail());
  const apiInstance = new brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

  const htmlContent = `<!doctype html>
  <html><body style="margin:0;background:#f7f9fc;font-family:Arial,sans-serif;color:#1f2937">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 12px">
      <tr><td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #e5eaf1;border-radius:16px;overflow:hidden">
          <tr><td style="background:#022e5a;padding:28px 32px;color:#fff">
            <div style="font-size:24px;font-weight:700">Note<span style="color:#5ca6f0">Sphere</span></div>
            <div style="margin-top:8px;color:#dbeafe;font-size:14px">Your student notes library</div>
          </td></tr>
          <tr><td style="padding:32px">
            <h1 style="font-size:22px;margin:0 0 16px;color:#022e5a">Welcome, ${safeName}!</h1>
            <p style="font-size:15px;line-height:1.7;margin:0 0 18px">Your NoteSphere account is ready. Browse notes by course and semester, save useful resources, and share links to notes you have permission to publish.</p>
            <p style="margin:24px 0"><a href="${siteUrl}/notes" style="display:inline-block;background:#0878e8;color:#fff;text-decoration:none;padding:12px 20px;border-radius:24px;font-weight:700">Browse notes</a></p>
            <p style="font-size:13px;line-height:1.6;color:#64748b">Need help? Contact <a href="mailto:${supportEmail}" style="color:#0878e8">${supportEmail}</a>.</p>
          </td></tr>
          <tr><td style="padding:18px 32px;background:#f8fafc;color:#64748b;font-size:12px">NoteSphere · <a href="${siteUrl}" style="color:#0878e8">${siteUrl}</a></td></tr>
        </table>
      </td></tr>
    </table>
  </body></html>`;

  await apiInstance.sendTransacEmail({
    sender: getEmailSender(),
    to: [{ email, name: name || undefined }],
    subject: "Welcome to NoteSphere",
    htmlContent,
    textContent: `Welcome to NoteSphere, ${name || "there"}! Browse notes at ${siteUrl}/notes. Need help? Email ${getSupportEmail()}.`,
  });
};
