if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

const brevo = require("@getbrevo/brevo");
const { getEmailSender, getSupportEmail } = require("./emailSender");
const { renderEmail } = require("./emailTemplate");

module.exports.welComeEmail = async ({ name, email }) => {
  if (!process.env.BREVO_API_KEY) throw new Error("BREVO_API_KEY must be configured to send email.");
  const siteUrl = (process.env.DOMAIN || "https://notesphere.online").replace(/\/$/, "");
  const apiInstance = new brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(brevo.TransactionalEmailsApiApiKeys.apiKey, process.env.BREVO_API_KEY);

  const htmlContent = renderEmail({
    title: "Welcome to NoteSphere",
    greeting: name || "there",
    paragraphs: ["Your account is ready. Browse notes by course and semester, save useful resources, and share links to notes you have permission to publish."],
    actionLabel: "Browse notes",
    actionUrl: `${siteUrl}/notes`,
  });

  await apiInstance.sendTransacEmail({
    sender: getEmailSender(),
    to: [{ email, name: name || undefined }],
    subject: "Welcome to NoteSphere",
    htmlContent,
    textContent: `Welcome to NoteSphere, ${name || "there"}! Browse notes at ${siteUrl}/notes. Need help? Email ${getSupportEmail()}.`,
  });
};
