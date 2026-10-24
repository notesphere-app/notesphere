const { saveRedirectUrl } = require("../middleware.js");
const passport = require("passport");
const User = require("../models/user.js");
const bcrypt = require("bcrypt");
const brevo = require("@getbrevo/brevo");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");
const recordLogin = require("../utils/loginHistory");
const Download = require("../models/download");
const Note = require("../models/note");
const { getEmailSender, getSupportEmail } = require("../utils/emailSender");
const { welComeEmail: welcomeEmail } = require("../utils/sendWelcomeEmail");
const { recordAuthActivity, completeAuthActivity, getEmail } = require("../utils/authActivity");

// Load environment variables (only in development)
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}
const supportEmail = getSupportEmail();

// Configure Brevo API
const apiInstance = new brevo.TransactionalEmailsApi();
apiInstance.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY,
);

const emailApi = new brevo.TransactionalEmailsApi();
emailApi.setApiKey(
  brevo.TransactionalEmailsApiApiKeys.apiKey,
  process.env.BREVO_API_KEY,
);

// Constants for better maintainability
const OTP_EXPIRY_MINUTES = 10;
const OTP_EXPIRY_MS = OTP_EXPIRY_MINUTES * 60 * 1000;
const RESET_TOKEN_EXPIRY_MS = 60 * 60 * 1000; // 1 hour

// Professional OTP Email Template
async function sendVerificationOTP(user) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Store OTP with expiry
  user.otp = otp;
  user.otpExpires = Date.now() + OTP_EXPIRY_MS;
  await user.save();

  const domain = (process.env.DOMAIN || "https://notesphere.online").replace(/\/$/, "");

  // HTML Email Template with NoteSphere Theme
  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email | NoteSphere</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
      
      body {
        font-family: 'Inter', Arial, sans-serif;
        line-height: 1.6;
        color: #374151;
        margin: 0;
        padding: 0;
        background-color: #f9fafb;
      }
      
      .email-container {
        max-width: 600px;
        margin: 0 auto;
        background-color: #ffffff;
        border-radius: 20px;
        overflow: hidden;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
        border: 1px solid #e5e7eb;
      }
      
      .header {
        background: linear-gradient(135deg, #1e40af 0%, #0ea5e9 100%);
        padding: 40px 20px;
        text-align: center;
        color: white;
      }
      
      .logo {
        font-size: 36px;
        font-weight: 800;
        margin-bottom: 10px;
        letter-spacing: -0.5px;
      }
      
      .logo-gradient {
        background: linear-gradient(90deg, #60a5fa 0%, #22d3ee 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      
      .subtitle {
        font-size: 14px;
        opacity: 0.9;
        letter-spacing: 1px;
        text-transform: uppercase;
        font-weight: 500;
      }
      
      .content {
        padding: 40px;
      }
      
      .greeting {
        font-size: 20px;
        font-weight: 600;
        color: #111827;
        margin-bottom: 20px;
      }
      
      .message {
        color: #4b5563;
        margin-bottom: 30px;
        font-size: 15px;
        line-height: 1.7;
      }
      
      .otp-container {
        text-align: center;
        margin: 40px 0;
      }
      
      .otp-code {
        display: inline-block;
        padding: 20px 30px;
        font-size: 36px;
        font-weight: 700;
        letter-spacing: 8px;
        background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
        border: 2px solid #0ea5e9;
        border-radius: 16px;
        color: #0369a1;
        box-shadow: 0 4px 20px rgba(14, 165, 233, 0.15);
      }
      
      .expiry-notice {
        background-color: #fef3c7;
        border-left: 4px solid #f59e0b;
        padding: 16px;
        border-radius: 8px;
        margin: 30px 0;
        color: #92400e;
        font-size: 14px;
      }
      
      .security-error {
        background-color: #fef2f2;
        border-left: 4px solid #ef4444;
        padding: 16px;
        border-radius: 8px;
        margin: 30px 0;
        color: #991b1b;
        font-size: 14px;
      }
      
      .support-info {
        background-color: #f0f9ff;
        border-radius: 12px;
        padding: 25px;
        margin: 40px 0;
        border: 1px solid #bae6fd;
      }
      
      .footer {
        background-color: #f9fafb;
        padding: 30px 40px;
        text-align: center;
        border-top: 1px solid #e5e7eb;
        color: #6b7280;
        font-size: 13px;
      }
      
      .contact-link {
        color: #2563eb;
        text-decoration: none;
        font-weight: 500;
      }
      
      @media (max-width: 600px) {
        .content, .footer {
          padding: 30px 20px;
        }
        
        .header {
          padding: 30px 20px;
        }
        
        .otp-code {
          font-size: 28px;
          letter-spacing: 6px;
          padding: 15px 20px;
        }
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <!-- Header -->
      <div class="header">
        <div class="logo">
          <span class="logo-gradient">NoteSphere</span>
        </div>
        <div class="subtitle">Email Verification Required</div>
      </div>
      
      <!-- Content -->
      <div class="content">
        <div class="greeting">
          Hello ${user.name || user.username || "NoteSphere user"},
        </div>
        
        <div class="message">
          <p>Thanks for joining NoteSphere, a community for finding and sharing student notes.</p>
          <p>To complete your registration and activate your account, please use the One-Time Password (OTP) below:</p>
        </div>
        
        <div class="otp-container">
          <div class="otp-code">${otp}</div>
        </div>
        
        <div class="expiry-notice">
          ⏰ <strong>Expires in ${OTP_EXPIRY_MINUTES} minutes</strong><br>
          This OTP is valid for ${OTP_EXPIRY_MINUTES} minutes only. After this time, you'll need to request a new verification code.
        </div>
        
        <div class="security-error">
          🔒 <strong>Security Notice</strong><br>
          Never share this OTP with anyone. NoteSphere representatives will never ask for your OTP or password. Keep your account credentials secure.
        </div>
        
        <div class="support-info">
          <p><strong>Need assistance?</strong></p>
          <p>If you didn't request this verification or need help, please contact our support team immediately:</p>
          <p>📧 <a href="mailto:${supportEmail}" class="contact-link">${supportEmail}</a></p>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <p>
          <strong>NoteSphere Security Team</strong><br>
          Udyam Registered Education Platform • Delhi, India
        </p>
        <div style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
          <p>
            This is an automated security email. Please do not reply directly.<br>
            Protecting your learning journey is our priority.
          </p>
          <p style="margin-top: 15px;">
            © ${new Date().getFullYear()} NoteSphere. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  // Plain text version
  const textContent = `
  NOTESPHERE EMAIL VERIFICATION
  ==============================
  
  Hello ${user.name || user.username || "NoteSphere user"},
  
  Thanks for joining NoteSphere, a community for finding and sharing student notes.
  
  EMAIL VERIFICATION REQUIRED:
  
  Your One-Time Password (OTP): ${otp}
  
  ⚠️ IMPORTANT NOTES:
  • This OTP expires in ${OTP_EXPIRY_MINUTES} minutes
  • Never share this code with anyone
  • NoteSphere staff will NEVER ask for your OTP
  
  🔒 SECURITY REMINDER:
  Keep your account credentials secure. If you didn't request this verification, please contact our security team immediately.
  
  📞 SUPPORT:
  Email: ${supportEmail}
  Website: ${domain}
  
  ---
  NoteSphere | Student notes library
  Browse and share notes at ${domain}
  
  This is an automated security message. Please do not reply.
  © ${new Date().getFullYear()} NoteSphere. All rights reserved.
  `;

  try {
    await emailApi.sendTransacEmail({
      sender: getEmailSender(),
      to: [{ email: user.email, name: user.name || user.username }],
      subject: "🔐 Verify Your Email | NoteSphere Account Activation",
      htmlContent: htmlContent,
      textContent: textContent,
    });

    console.log(`✅ Verification OTP sent to: ${user.email}`);
  } catch (emailErr) {
    console.error(
      `❌ Failed to send verification email to ${user.email}:`,
      emailErr,
    );
    throw new Error("Failed to send verification email. Please try again.");
  }

  return otp;
}

// Professional Welcome Email Template
async function sendWelcomeEmail(user) {
  await welcomeEmail({ name: user.name, email: user.email });
}

// CONTROLLER FUNCTIONS

module.exports.renderSignupForm = async (req, res) => {
  try {
    res.render("users/signup.ejs");
  } catch (err) {
    console.error("❌ Error loading signup form:", err);
    req.flash("primary", "Unable to load registration page. Please try again.");
    res.redirect("/");
  }
};

module.exports.signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const username = email.split("@")[0];

    // Create new user instance
    const newUser = new User({ name, email, username });

    // Register user (with passport-local-mongoose)
    const registeredUser = await User.register(newUser, password);

    req.flash("success", "OTP sent to your email. Please verify your email.");
    res.redirect(`/verify-email?email=${email}`);
  } catch (err) {
    console.error("Signup error:", err.message);
    req.flash("error", err.message);
    res.redirect("/signup");
  }
};

module.exports.renderLoginForm = (req, res) => {
  try {
    if (res.locals.currUser) {
      req.flash("info", "You are already logged in.");
      return res.redirect("/");
    }
    res.render("users/login.ejs");
  } catch (err) {
    console.error("❌ Error loading login form:", err);
    req.flash("error", "Unable to load login page. Please try again.");
    res.redirect("/");
  }
};

module.exports.startLoginActivity = async (req, res, next) => {
  try {
    const email = getEmail(req.body?.email);
    const knownUser = email ? await User.findOne({ email }).select("_id email") : null;
    const activity = await recordAuthActivity(req, {
      event: "login",
      outcome: "pending",
      user: knownUser,
      email,
    });
    req.authActivityId = activity._id;
    req.loginAuditUser = knownUser;
    req.loginAuditEmail = email;
    res.once("finish", () => {
      if (!req.authActivityCompleted) {
        req.authActivityCompleted = true;
        completeAuthActivity(req, {
          outcome: "challenge_rejected",
          user: req.loginAuditUser,
          email: req.loginAuditEmail,
          details: "Login stopped before credential verification",
        }).catch((error) => console.error("Login activity finalization failed:", error.message));
      }
    });
    next();
  } catch (error) {
    next(error);
  }
};

module.exports.authenticateLocal = (req, res, next) => {
  passport.authenticate("local", async (error, user, info) => {
    const finishAudit = async (outcome, targetUser, details) => {
      if (req.authActivityCompleted) return;
      req.authActivityCompleted = true;
      await completeAuthActivity(req, {
        outcome,
        user: targetUser,
        email: req.loginAuditEmail,
        details,
      });
    };
    try {
      if (error) {
        await finishAudit("failed", req.loginAuditUser, "Authentication service error");
        return next(error);
      }
      if (!user) {
        await finishAudit("failed", req.loginAuditUser, "Invalid credentials");
        req.flash("error", info?.message || "Invalid email or password.");
        return res.redirect("/login");
      }
      if (!user.isVerified) {
        await finishAudit("unverified", user, "Email verification required");
        req.flash("error", "Please verify your email first.");
        return res.redirect(`/verify-email?email=${encodeURIComponent(user.email || "")}`);
      }
      if (user.isBlocked || !user.isActive) {
        await finishAudit("blocked", user, "Account unavailable");
        req.flash("error", "This account is currently unavailable.");
        return res.redirect("/login");
      }
      req.logIn(user, async (loginError) => {
        if (loginError) {
          try {
            await finishAudit("failed", user, "Session creation failed");
            return next(loginError);
          } catch (auditError) {
            return next(auditError);
          }
        }
        try {
          await finishAudit("success", user, "Local login");
          next();
        } catch (auditError) {
          next(auditError);
        }
      });
    } catch (auditError) {
      next(auditError);
    }
  })(req, res, next);
};

module.exports.login = async (req, res) => {
  await recordLogin(req.user, req, req.user.authMethod || "local");
  req.flash("success", "Welcome back to NoteSphere!");
  const redirectUrl = res.locals.redirectUrl || "/";
  res.redirect(redirectUrl);
};
module.exports.logout = (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.flash("success", "You have been logged out successfully!");
    res.redirect("/");
  });
};

// OTP VERIFICATION FUNCTIONS
module.exports.renderVerifyEmailForm = async (req, res) => {
  const { email } = req.query;
  if (!email) return res.redirect("/login");
  const user = await User.findOne({ email: email });
  await sendVerificationOTP(user);
  res.render("emailer/otp.ejs", { user });
};

module.exports.verifyEmail = async (req, res, next) => {
  try {
    const { otp } = req.body;
    const { id } = req.params;

    if (!otp || otp.length !== 6) {
      req.flash("warning", "Please enter a valid 6-digit OTP.");
      return res.redirect(`/verify-email?email=${req.body.email || ""}`);
    }

    const user = await User.findById(id)
      .populate("savedNotes", "title course subject")
      .populate("savedBlogs", "title id");

    if (!user) {
      req.flash(
        "error",
        "Invalid verification request. Please try signing up again.",
      );
      return res.redirect("/signup");
    }

    if (user.isVerified) {
      req.flash("info", "Your email is already verified. Please log in.");
      return res.redirect("/login");
    }

    if (!user.otp || !user.otpExpires) {
      req.flash(
        "warning",
        "No active OTP found. Please request a new verification code.",
      );
      return res.redirect(`/verify-email?email=${user.email}`);
    }

    if (user.otp !== otp) {
      req.flash("warning", "Invalid OTP. Please check the code and try again.");
      return res.redirect(`/verify-email?email=${user.email}`);
    }

    if (user.otpExpires < Date.now()) {
      req.flash(
        "warning",
        "OTP has expired. Please request a new verification code.",
      );
      return res.redirect(`/verify-email?email=${user.email}`);
    }

    // Mark email as verified
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Send welcome email
    await sendWelcomeEmail(user);

    // Auto-login the user
    req.login(user, async (err) => {
      if (err) {
        console.error("❌ Auto-login error after verification:", err);
        req.flash(
          "success",
          "Email verified successfully! Please log in to continue.",
        );
        return res.redirect("/login");
      }
      try {
        await recordLogin(user, req, user.authMethod || "local");
      } catch (loginHistoryError) {
        return next(loginHistoryError);
      }
      req.flash(
        "success",
        "Email verified successfully! Welcome to NoteSphere.",
      );
      res.redirect("/");
    });
  } catch (err) {
    console.error("❌ Email verification error:", err);
    req.flash(
      "error",
      "We encountered an issue verifying your email. Please try again.",
    );
    res.redirect(`/verify-email?email=${req.body.email || ""}`);
  }
};

module.exports.resendOtp = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);

    if (!user) {
      req.flash("error", "User account not found.");
      return res.redirect("/signup");
    }

    if (user.isvalid) {
      req.flash("info", "Your email is already verified. Please log in.");
      return res.redirect("/login");
    }

    // Rate limiting: Check if OTP was recently sent
    if (user.otpExpires && user.otpExpires > Date.now() - 60000) {
      req.flash(
        "primary",
        "Please wait at least 1 minute before requesting a new OTP.",
      );
      return res.redirect(`/verify-email?email=${user.email}`);
    }

    await sendVerificationOTP(user);

    req.flash(
      "success",
      "A new verification code has been sent to your email. Please check your inbox.",
    );
    res.redirect(`/verify-email?email=${user.email}`);
  } catch (err) {
    console.error("❌ OTP resend error:", err);
    req.flash("error", "Unable to send verification code. Please try again.");
    res.redirect(`/verify-email?email=${req.query.email || ""}`);
  }
};

module.exports.profile = async (req, res) => {
  try {
    const id = req.user._id; // Assuming req.user is set by auth middleware

    const [user, downloads, noteCount, publishedNoteCount] = await Promise.all([
      User.findById(id).populate("savedNotes", "title course subject").populate("savedBlogs", "title"),
      Download.find({ user: id }).populate("note", "title").sort({ downloadedAt: -1 }).limit(10).lean(),
      Note.countDocuments({ author: id }),
      Note.countDocuments({ author: id, isPublished: true }),
    ]);
    if (!user) {
      req.flash("error", "Your profile could not be found.");
      return res.redirect("/");
    }
    const recentActivity = downloads.map((download) => ({
      action: "download",
      description: `Downloaded ${download.note?.title || "a note"}`,
      createdAt: download.downloadedAt,
    }));

    res.render("users/profile.ejs", {
      user,
      recentActivity,
      noteCount,
      publishedNoteCount,
      moment: require("moment"),
    });
  } catch (err) {
    console.log(err);
    req.flash("error", "Something went wrong");
    res.redirect("/");
  }
};

// controllers/userController.js

module.exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    // Safely read body
    const { name, mobile, email, university, college } = req.body || {};
    const cleanUniversity = typeof university === "string" ? university.trim() : "";
    const cleanCollege = typeof college === "string" ? college.trim() : "";

    if (!name && !mobile && !email && !university && !college) {
      return res.status(400).json({
        success: false,
        message: "No data provided",
      });
    }
    if (cleanUniversity.length > 160 || cleanCollege.length > 160) {
      return res.status(400).json({ success: false, message: "University and college names must be 160 characters or fewer." });
    }

    // ✅ Email duplicate check
    if (email) {
      const existingUser = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: userId },
      });

      if (existingUser) {
        return res.json({
          success: false,
          message: "Email already in use",
        });
      }
    }

    // ✅ Mobile duplicate check
    if (mobile) {
      const existingUser = await User.findOne({
        mobile,
        _id: { $ne: userId },
      });

      if (existingUser) {
        return res.json({
          success: false,
          message: "Mobile number already in use",
        });
      }
    }

    // ✅ Update user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        name,
        mobile,
        email: email?.toLowerCase(),
        university: cleanUniversity,
        college: cleanCollege,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true },
    );

    // ✅ Log activity
    // await Activity.create({
    //   user: userId,
    //   action: "profile_update",
    //   description: "Updated profile information",
    //   details: { fields: ["name", "email", "mobile"] },
    // });

    // ✅ Send JSON success
    return res.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (err) {
    console.error("UPDATE PROFILE ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Unable to update your profile right now.",
    });
  }
};

module.exports.changePassword = async (req, res) => {
  try {
    const userId = req.user._id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validation
    if (newPassword !== confirmPassword) {
      req.flash("error", "New passwords do not match");
      return res.redirect("/profile#security");
    }

    if (newPassword.length < 6) {
      req.flash("warning", "Password must be at least 6 characters long");
      return res.redirect("/profile#security");
    }

    const user = await User.findById(userId);

    // Verify current password (assuming you have password field in user schema)
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      req.flash("error", "Current password is incorrect");
      return res.redirect("/profile#security");
    }

    // Update password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    // Log activity
    await Activity.create({
      user: userId,
      action: "password_change",
      description: "Changed account password",
    });

    req.flash("success", "Password changed successfully");
    res.redirect("/profile#security");
  } catch (err) {
    console.log(err);
    req.flash("error", "Failed to change password");
    res.redirect("/profile#security");
  }
};
