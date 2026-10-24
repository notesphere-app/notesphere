module.exports.getEmailSender = () => {
  const email = process.env.EMAIL_FROM;
  if (!email) {
    throw new Error("EMAIL_FROM must be set to a verified sender address.");
  }
  return {
    email,
    name: process.env.EMAIL_FROM_NAME || "NoteSphere",
  };
};

module.exports.getSupportEmail = () =>
  "support.notesphere@gmail.com";
