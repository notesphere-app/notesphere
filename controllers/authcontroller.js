const crypto = require("crypto");
const User = require("../models/user.js");

// Load .env in development
if (process.env.NODE_ENV !== "production") {
  require("dotenv").config();
}

module.exports.restform = async (req, res) => {
  res.render("emailer/emailSent.ejs", {
    message: "Please enter your registered email address.",
    alertmsg: false,
  });
};

module.exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.render("emailer/emailSent.ejs", {
        message:
          "This email address is not registered with RootShield. Please verify your email and try again.",
        alertmsg: true,
      });
    }

    // Generate secure token
    const token = crypto.randomBytes(20).toString("hex");
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Auto-detect domain
    const domain =
      process.env.DOMAIN ||
      (process.env.NODE_ENV === "production"
        ? "https://notesphere.online"
        : "http://localhost:3000");
    const resetLink = `${domain}/reset-password/${token}`;

    const brevo = require("@getbrevo/brevo");
    const apiInstance = new brevo.TransactionalEmailsApi();
    apiInstance.setApiKey(
      brevo.TransactionalEmailsApiApiKeys.apiKey,
      process.env.BREVO_API_KEY,
    );

    // PROFESSIONAL EMAIL HTML - MATCHING ROOTSHIELD THEME
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password | RootShield</title>
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
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
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
            font-weight: 700;
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
            margin-bottom: 24px;
          }
          
          .message {
            color: #4b5563;
            margin-bottom: 32px;
            font-size: 15px;
          }
          
          .reset-button {
            display: inline-block;
            background: linear-gradient(135deg, #2563eb 0%, #0ea5e9 100%);
            color: white;
            padding: 16px 40px;
            text-decoration: none;
            border-radius: 12px;
            font-weight: 600;
            font-size: 16px;
            text-align: center;
            margin: 30px 0;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
            transition: all 0.3s ease;
          }
          
          .reset-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(37, 99, 235, 0.3);
          }
          
          .link-container {
            background-color: #f8fafc;
            border-radius: 10px;
            padding: 20px;
            margin: 30px 0;
            border: 1px solid #e2e8f0;
            word-break: break-all;
          }
          
          .link {
            color: #2563eb;
            text-decoration: none;
            font-size: 14px;
          }
          
          .expiry-note {
            background-color: #fef3c7;
            border-left: 4px solid #f59e0b;
            padding: 16px;
            border-radius: 8px;
            margin: 30px 0;
            color: #92400e;
          }
          
          .security-note {
            background-color: #f0f9ff;
            border-left: 4px solid #0ea5e9;
            padding: 16px;
            border-radius: 8px;
            margin: 30px 0;
            color: #075985;
          }
          
          .icon {
            display: inline-block;
            margin-right: 8px;
            vertical-align: middle;
          }
          
          .footer {
            background-color: #f9fafb;
            padding: 30px 40px;
            text-align: center;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 13px;
          }
          
          .contact-info {
            margin-top: 20px;
            font-size: 13px;
            color: #4b5563;
          }
          
          .contact-link {
            color: #2563eb;
            text-decoration: none;
          }
          
          @media (max-width: 600px) {
            .content, .footer {
              padding: 30px 20px;
            }
            
            .header {
              padding: 30px 20px;
            }
            
            .reset-button {
              display: block;
              margin: 20px 0;
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
            <div class="subtitle">Secure Your Digital Future</div>
          </div>
          
          <!-- Content -->
          <div class="content">
            <div class="greeting">
              Hello ${user.name || user.username || "RootShield User"},
            </div>
            
            <div class="message">
              We received a request to reset your password for your RootShield account. 
              If you made this request, please use the button below to securely reset your password.
            </div>
            
            <div style="text-align: center;">
              <a href="${resetLink}" class="reset-button">
                Reset Your Password
              </a>
            </div>
            
            <div class="link-container">
              <span class="icon">🔗</span>
              <strong>Alternative Method:</strong> If the button doesn't work, copy and paste this link into your browser:<br><br>
              <a href="${resetLink}" class="link">${resetLink}</a>
            </div>
            
            <div class="expiry-note">
              <span class="icon">⏰</span>
              <strong>Important:</strong> This password reset link is valid for <strong>1 hour</strong> only. After this time, you'll need to request a new reset link.
            </div>
            
            <div class="security-note">
              <span class="icon">🔒</span>
              <strong>Security Notice:</strong> If you didn't request this password reset, please ignore this email. 
              Your account security is important to us, and no changes have been made to your account.
            </div>
            
            <div style="margin-top: 40px;">
              <p style="color: #4b5563; font-size: 14px;">
                Need help or have questions? Our support team is here to assist you.
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div class="footer">
            <p>
              <strong>RootShield</strong><br>
              Cybersecurity & Web Development Education Platform<br>
              Udyam Registered • Delhi, India
            </p>
            
            <div class="contact-info">
              <p>
                📧 <a href="mailto:support.notesphere@gmail.com" class="contact-link">support.notesphere@gmail.com</a> | 
                🌐 <a href="https://notesphere.online" class="contact-link">notesphere.online</a>
              </p>
              <p style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
                This is an automated message. Please do not reply directly to this email.<br>
                © ${new Date().getFullYear()} RootShield. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Plain text version for email clients that don't support HTML
    const textContent = `
      Reset Your RootShield Password
      ===============================

      Hello ${user.name || user.username || "RootShield User"},

      We received a request to reset your password for your RootShield account.

      To reset your password, please visit the following link:
      ${resetLink}

      This link will expire in 1 hour.

      If you didn't request this password reset, please ignore this email.
      Your account security is important to us, and no changes have been made to your account.

      Need help? Contact our support team at support@notesphere.online

      ---
      RootShield
      Cybersecurity & Web Development Education Platform
      Udyam Registered • Delhi, India
      https://notesphere.online
    `;

    // SEND EMAIL 
    await apiInstance.sendTransacEmail({
      sender: { email: "support.notesphere@gmail.com", name: "RootShield Security" },
      to: [{ email: user.email, name: user.name || user.username }],
      subject: "🔒 Reset Your Password | RootShield Account Security",
      htmlContent: htmlContent,
      textContent: textContent,
    });

    req.flash(
      "success",
      "Password reset instructions have been sent to your email. Please check your inbox (and spam folder) for further instructions.",
    );
    return res.redirect("/login");
  } catch (err) {
    console.error("Brevo Email Error:", err);
    req.flash(
      "error",
      "We encountered an issue sending the reset email. Please try again in a few moments or contact support if the problem persists.",
    );
    return res.redirect("/login");
  }
};

// SHOW RESET PAGE
module.exports.getResetPassword = async (req, res) => {
  const user = await User.findOne({
    resetPasswordToken: req.params.token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    req.flash(
      "error",
      "This password reset link has expired or is invalid. Please request a new password reset link.",
    );
    return res.redirect("/login");
  }

  res.render("emailer/reset.ejs", {
    token: req.params.token,
    message: req.query.message || null,
    alertmsg: req.query.error || null,
  });
};

// RESET PASSWORD FINAL SUBMIT
module.exports.postResetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  const user = await User.findOne({
    resetPasswordToken: token,
    resetPasswordExpires: { $gt: Date.now() },
  });

  if (!user) {
    req.flash(
      "error",
      "This password reset link has expired. For security reasons, please request a new password reset link.",
    );
    return res.redirect("/login");
  }

  // Validate password length
  if (password.length < 8) {
    req.flash(
      "error",
      "Password must be at least 8 characters long for security.",
    );
    return res.redirect(`/reset-password/${token}`);
  }

  // Passport-local-mongoose method
  user.setPassword(password, async (err, updatedUser) => {
    if (err) {
      req.flash(
        "error",
        "We encountered an issue updating your password. Please try again or contact support if the problem continues.",
      );
      return res.redirect(`/reset-password/${token}`);
    }

    updatedUser.resetPasswordToken = undefined;
    updatedUser.resetPasswordExpires = undefined;
    await updatedUser.save();

    // Send confirmation email
    try {
      const brevo = require("@getbrevo/brevo");
      const apiInstance = new brevo.TransactionalEmailsApi();
      apiInstance.setApiKey(
        brevo.TransactionalEmailsApiApiKeys.apiKey,
        process.env.BREVO_API_KEY,
      );

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Updated | RootShield</title>
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
              border-radius: 16px;
              overflow: hidden;
              box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
              border: 1px solid #e5e7eb;
            }
            
            .header {
              background: linear-gradient(135deg, #10b981 0%, #059669 100%);
              padding: 40px 20px;
              text-align: center;
              color: white;
            }
            
            .logo {
              font-size: 36px;
              font-weight: 700;
              margin-bottom: 10px;
              letter-spacing: -0.5px;
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
              font-size: 20px;
              font-weight: 600;
              color: #111827;
              margin-bottom: 24px;
            }
            
            .message {
              color: #4b5563;
              margin-bottom: 32px;
              font-size: 15px;
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
            
            @media (max-width: 600px) {
              .content, .footer {
                padding: 30px 20px;
              }
            }
          </style>
        </head>
        <body>
          <div class="email-container">
            <div class="header">
              <div class="success-icon">✅</div>
              <div class="logo">
                <span class="logo-gradient">RootShield</span>
              </div>
              <div style="font-size: 14px; opacity: 0.9; letter-spacing: 1px;">Password Successfully Updated</div>
            </div>
            
            <div class="content">
              <div class="greeting">
                Hello ${user.name || user.username || "RootShield User"},
              </div>
              
              <div class="message">
                <p>This is a confirmation that your RootShield account password was successfully updated on ${new Date().toLocaleString()}.</p>
                <p>If you made this change, no further action is required.</p>
              </div>
              
              <div class="security-card">
                <strong>🔒 Security Tips:</strong>
                <ul style="margin-top: 10px; padding-left: 20px;">
                  <li>Use a unique password for RootShield that you don't use elsewhere</li>
                  <li>Consider enabling two-factor authentication when available</li>
                  <li>Never share your password with anyone</li>
                  <li>Regularly update your passwords for optimal security</li>
                </ul>
              </div>
              
              <div style="margin-top: 30px;">
                <p style="color: #4b5563; font-size: 14px;">
                  If you did not make this change, please contact our security team immediately at <strong>support.notesphere@gmail.com</strong>
                </p>
              </div>
            </div>
            
            <div class="footer">
              <p>
                <strong>RootShield Security Team</strong><br>
                Protecting your digital learning journey
              </p>
              <p style="margin-top: 15px; font-size: 12px; color: #9ca3af;">
                This is an automated security notification. Please do not reply.<br>
                © ${new Date().getFullYear()} RootShield. All rights reserved.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      await apiInstance.sendTransacEmail({
        sender: {
          email: "support.notesphere@gmail.com",
          name: "RootShield Security",
        },
        to: [{ email: user.email, name: user.name || user.username }],
        subject:
          "✅ Password Successfully Updated | RootShield Security Notification",
        htmlContent: htmlContent,
      });
    } catch (emailErr) {
      console.error("Confirmation email error:", emailErr);
      // Don't fail the reset process if confirmation email fails
    }

    req.flash(
      "success",
      "Your password has been successfully updated! You can now log in with your new password.",
    );
    res.redirect("/login");
  });
};
