module.exports.getEmailSender = () => {
  const email = process.env.ADMIN_EMAIL || process.env.EMAIL_FROM;
  if (!email) {
    throw new Error("ADMIN_EMAIL must be set to a verified sender address.");
  }
  return {
    email,
    name: process.env.EMAIL_FROM_NAME || "NoteSphere",
  };
};

module.exports.getSupportEmail = () =>
  process.env.ADMIN_EMAIL || process.env.EMAIL_FROM || "support.notesphere@gmail.com";
