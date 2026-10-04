const { saveRedirectUrl } = require("../middleware.js");
const User = require("../models/user.js");
const bcrypt = require("bcrypt");
const brevo = require("@getbrevo/brevo");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const { createCanvas } = require("canvas");

// Load environment variables (only in development)
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

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

  const domain = process.env.DOMAIN || "https://rootshield.in";

  // HTML Email Template with RootShield Theme
  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email | RootShield</title>
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
          <span class="logo-gradient">RootShield</span>
        </div>
        <div class="subtitle">Email Verification Required</div>
      </div>
      
      <!-- Content -->
      <div class="content">
        <div class="greeting">
          Hello ${user.name || user.username || "Future Security Professional"},
        </div>
        
        <div class="message">
          <p>Thank you for choosing <strong>RootShield</strong> – India's leading cybersecurity and web development education platform.</p>
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
          Never share this OTP with anyone. RootShield representatives will never ask for your OTP or password. Keep your account credentials secure.
        </div>
        
        <div class="support-info">
          <p><strong>Need assistance?</strong></p>
          <p>If you didn't request this verification or need help, please contact our support team immediately:</p>
          <p>📧 <a href="mailto:info.theloopsystem@gmail.com" class="contact-link">info.theloopsystem@gmail.com</a></p>
        </div>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <p>
          <strong>RootShield Security Team</strong><br>
          Udyam Registered Education Platform • Delhi, India
        </p>
        <div style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
          <p>
            This is an automated security email. Please do not reply directly.<br>
            Protecting your learning journey is our priority.
          </p>
          <p style="margin-top: 15px;">
            © ${new Date().getFullYear()} RootShield. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  // Plain text version
  const textContent = `
  ROOTSHIELD EMAIL VERIFICATION
  ==============================
  
  Hello ${user.name || user.username || "Future Security Professional"},
  
  Thank you for choosing RootShield - India's leading cybersecurity and web development education platform.
  
  EMAIL VERIFICATION REQUIRED:
  
  Your One-Time Password (OTP): ${otp}
  
  ⚠️ IMPORTANT NOTES:
  • This OTP expires in ${OTP_EXPIRY_MINUTES} minutes
  • Never share this code with anyone
  • RootShield staff will NEVER ask for your OTP
  
  🔒 SECURITY REMINDER:
  Keep your account credentials secure. If you didn't request this verification, please contact our security team immediately.
  
  📞 SUPPORT:
  Email: info.theloopsystem@gmail.com
  Website: ${domain}
  
  ---
  RootShield | Udyam Registered Education Platform
  Cybersecurity & Web Development Education
  Delhi, India
  
  This is an automated security message. Please do not reply.
  © ${new Date().getFullYear()} RootShield. All rights reserved.
  `;

  try {
    await emailApi.sendTransacEmail({
      sender: { email: "info.theloopsystem@gmail.com", name: "RootShield Verification" },
      to: [{ email: user.email, name: user.name || user.username }],
      subject: "🔐 Verify Your Email | RootShield Account Activation",
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
  const domain = process.env.DOMAIN || "https://rootshield.in";

  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to RootShield | Your Cybersecurity Journey Begins</title>
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
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        padding: 50px 20px;
        text-align: center;
        color: white;
      }
      
      .logo {
        font-size: 42px;
        font-weight: 800;
        margin-bottom: 10px;
        letter-spacing: -1px;
      }
      
      .logo-gradient {
        background: linear-gradient(90deg, #34d399 0%, #10b981 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      
      .success-icon {
        font-size: 48px;
        margin-bottom: 20px;
      }
      
      .content {
        padding: 40px;
      }
      
      .greeting {
        font-size: 24px;
        font-weight: 700;
        color: #111827;
        margin-bottom: 25px;
      }
      
      .message {
        color: #4b5563;
        margin-bottom: 35px;
        font-size: 16px;
        line-height: 1.8;
      }
      
      .cta-button {
        display: inline-block;
        background: linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%);
        color: white;
        padding: 18px 45px;
        text-decoration: none;
        border-radius: 14px;
        font-weight: 600;
        font-size: 17px;
        text-align: center;
        margin: 30px 0;
        box-shadow: 0 6px 20px rgba(37, 99, 235, 0.25);
        transition: all 0.3s ease;
      }
      
      .features-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 20px;
        margin: 40px 0;
      }
      
      .feature-card {
        background: #f8fafc;
        border-radius: 12px;
        padding: 25px;
        border: 1px solid #e2e8f0;
      }
      
      .feature-icon {
        font-size: 32px;
        margin-bottom: 15px;
        color: #3b82f6;
      }
      
      .feature-title {
        font-weight: 600;
        color: #1e40af;
        margin-bottom: 10px;
      }
      
      .security-card {
        background-color: #f0f9ff;
        border-radius: 12px;
        padding: 24px;
        margin: 30px 0;
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
          padding: 40px 20px;
        }
        
        .features-grid {
          grid-template-columns: 1fr;
        }
        
        .cta-button {
          display: block;
          width: 100%;
          box-sizing: border-box;
        }
      }
    </style>
  </head>
  <body>
    <div class="email-container">
      <div class="header">
        <div class="success-icon">🎉</div>
        <div class="logo">
          <span class="logo-gradient">RootShield</span>
        </div>
        <div style="font-size: 16px; opacity: 0.9; letter-spacing: 1.5px;">Account Successfully Verified</div>
      </div>
      
      <div class="content">
        <div class="greeting">
          Welcome to RootShield, ${user.name || user.username || "Security Professional"}!
        </div>
        
        <div class="message">
          <p>Congratulations! Your RootShield account has been successfully verified and activated.</p>
          <p>You are now part of India's premier cybersecurity and web development education community. Get ready to enhance your skills with industry-recognized Courcess and certifications.</p>
        </div>
        
        <div style="text-align: center;">
          <a href="${domain}/dashboard" class="cta-button">
            🚀 Access Your Dashboard
          </a>
        </div>
        
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">🔐</div>
            <div class="feature-title">Cybersecurity Mastery</div>
            <div>Learn ethical hacking, network security, and penetration testing from industry experts.</div>
          </div>
          
          <div class="feature-card">
            <div class="feature-icon">💻</div>
            <div class="feature-title">Web Development</div>
            <div>Master full-stack development with modern frameworks and best practices.</div>
          </div>
        </div>
        
        <div class="security-card">
          <strong>🔒 Account Security Tips:</strong>
          <ul style="margin-top: 10px; padding-left: 20px;">
            <li>Use a strong, unique password</li>
            <li>Enable two-factor authentication when available</li>
            <li>Never share your login credentials</li>
            <li>Regularly review account activity</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin-top: 40px;">
          <p style="color: #4b5563; font-size: 15px;">
            Need assistance? Our support team is here to help.
          </p>
          <p style="margin-top: 10px;">
            📧 <a href="mailto:info.theloopsystem@gmail.com" class="contact-link">info.theloopsystem@gmail.com</a> | 
            🌐 <a href="${domain}" class="contact-link">Visit RootShield</a>
          </p>
        </div>
      </div>
      
      <div class="footer">
        <p>
          <strong>RootShield Education Platform</strong><br>
          Udyam Registered • Delhi, India
        </p>
        <div style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
          <p>
            This is an automated welcome email. Please do not reply directly.<br>
            Protecting your educational journey is our commitment.
          </p>
          <p style="margin-top: 15px;">
            © ${new Date().getFullYear()} RootShield. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  </body>
  </html>
  `;

  try {
    await apiInstance.sendTransacEmail({
      sender: { email: "info.theloopsystem@gmail.com", name: "RootShield Welcome Team" },
      to: [{ email: user.email, name: user.name || user.username }],
      subject: "🎉 Welcome to RootShield! Your Account is Now Active",
      htmlContent: htmlContent,
    });

    console.log(`✅ Welcome email sent to: ${user.email}`);
  } catch (emailErr) {
    console.error(
      `❌ Failed to send welcome email to ${user.email}:`,
      emailErr,
    );
  }
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

module.exports.login = async (req, res) => {
  req.flash("success", "Welcome back to Root-Shield!");
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

module.exports.verifyEmail = async (req, res) => {
  try {
    const { otp } = req.body;
    const { id } = req.params;

    if (!otp || otp.length !== 6) {
      req.flash("warning", "Please enter a valid 6-digit OTP.");
      return res.redirect(`/verify-email?email=${req.body.email || ""}`);
    }

    const user = await User.findById(id);

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
    req.login(user, (err) => {
      if (err) {
        console.error("❌ Auto-login error after verification:", err);
        req.flash(
          "success",
          "Email verified successfully! Please log in to continue.",
        );
        return res.redirect("/login");
      }
      req.flash(
        "success",
        "Email verified successfully! Welcome to RootShield.",
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

    // Find user
    const user = await User.findById(id);
    // Dummy recent activity
    const recentActivity = [
      {
        _id: "1",
        action: "enrollment",
        description: "Enrolled in 'Ethical Hacking Fundamentals' course",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    ];

    // Render the template with ALL required variables
    res.render("users/profile.ejs", {
      user,
      recentActivity,
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
    const { name, mobile, email } = req.body || {};

    if (!name && !mobile && !email) {
      return res.status(400).json({
        success: false,
        message: "No data provided",
      });
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
        updatedAt: new Date(),
      },
      { new: true },
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
      message: err.message,
      stack: err.stack, // remove later in production
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

