if (process.env.NODE_ENV != "production") {
  require("dotenv").config();
}
const brevo = require("@getbrevo/brevo");

module.exports.welComeEmail = async ({ name, email }) => {
  // Initialize Brevo API instance
  const apiInstance = new brevo.TransactionalEmailsApi();
  apiInstance.setApiKey(
    brevo.TransactionalEmailsApiApiKeys.apiKey,
    process.env.BREVO_API_KEY,
  );

  // ROOTSHIELD THEME - WELCOME EMAIL HTML
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
                background: linear-gradient(135deg, #1e40af 0%, #0ea5e9 100%);
                padding: 50px 20px;
                text-align: center;
                color: white;
                position: relative;
                overflow: hidden;
              }
              
              .header::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M0,0 L100,0 L100,100 Z" fill="white" opacity="0.05"/></svg>');
                background-size: cover;
              }
              
              .logo {
                font-size: 42px;
                font-weight: 800;
                margin-bottom: 12px;
                letter-spacing: -1px;
                position: relative;
                z-index: 1;
              }
              
              .logo-gradient {
                background: linear-gradient(90deg, #60a5fa 0%, #22d3ee 50%, #60a5fa 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
                background-size: 200% auto;
                animation: gradient 3s linear infinite;
              }
              
              @keyframes gradient {
                0% { background-position: 0% center; }
                100% { background-position: 200% center; }
              }
              
              .subtitle {
                font-size: 16px;
                opacity: 0.95;
                letter-spacing: 1.5px;
                text-transform: uppercase;
                font-weight: 600;
                margin-bottom: 5px;
                position: relative;
                z-index: 1;
              }
              
              .tagline {
                font-size: 14px;
                opacity: 0.8;
                font-weight: 400;
                position: relative;
                z-index: 1;
              }
              
              .content {
                padding: 50px 40px;
              }
              
              .greeting {
                font-size: 24px;
                font-weight: 700;
                color: #111827;
                margin-bottom: 25px;
                background: linear-gradient(90deg, #1e40af 0%, #0ea5e9 100%);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                background-clip: text;
              }
              
              .welcome-message {
                color: #4b5563;
                margin-bottom: 35px;
                font-size: 16px;
                line-height: 1.8;
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
                transition: transform 0.3s ease, box-shadow 0.3s ease;
              }
              
              .feature-card:hover {
                transform: translateY(-5px);
                box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
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
                font-size: 16px;
              }
              
              .feature-desc {
                color: #6b7280;
                font-size: 14px;
                line-height: 1.6;
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
                margin: 40px 0 30px;
                box-shadow: 0 6px 20px rgba(37, 99, 235, 0.25);
                transition: all 0.3s ease;
                border: none;
              }
              
              .cta-button:hover {
                transform: translateY(-3px);
                box-shadow: 0 10px 25px rgba(37, 99, 235, 0.35);
              }
              
              .security-badge {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                padding: 12px 25px;
                border-radius: 10px;
                display: inline-flex;
                align-items: center;
                gap: 10px;
                font-weight: 600;
                font-size: 14px;
                margin: 30px 0;
              }
              
              .next-steps {
                background-color: #f0f9ff;
                border-radius: 15px;
                padding: 30px;
                margin: 40px 0;
                border: 1px solid #bae6fd;
              }
              
              .next-steps-title {
                color: #075985;
                font-weight: 700;
                margin-bottom: 20px;
                font-size: 18px;
              }
              
              .steps-list {
                list-style: none;
                padding: 0;
                margin: 0;
              }
              
              .steps-list li {
                padding: 12px 0;
                border-bottom: 1px solid #dbeafe;
                color: #1e40af;
                font-weight: 500;
              }
              
              .steps-list li:last-child {
                border-bottom: none;
              }
              
              .steps-list .step-number {
                display: inline-block;
                width: 28px;
                height: 28px;
                background: #3b82f6;
                color: white;
                border-radius: 50%;
                text-align: center;
                line-height: 28px;
                margin-right: 12px;
                font-size: 14px;
                font-weight: 600;
              }
              
              .footer {
                background-color: #f9fafb;
                padding: 40px;
                text-align: center;
                border-top: 1px solid #e5e7eb;
                color: #6b7280;
              }
              
              .contact-info {
                margin-top: 25px;
                font-size: 14px;
                color: #4b5563;
              }
              
              .contact-link {
                color: #2563eb;
                text-decoration: none;
                font-weight: 500;
              }
              
              .social-links {
                margin-top: 20px;
              }
              
              .social-icon {
                display: inline-block;
                width: 36px;
                height: 36px;
                background: #e5e7eb;
                border-radius: 50%;
                line-height: 36px;
                margin: 0 8px;
                color: #6b7280;
                text-decoration: none;
                font-size: 14px;
              }
              
              @media (max-width: 600px) {
                .content, .footer {
                  padding: 35px 25px;
                }
                
                .header {
                  padding: 40px 20px;
                }
                
                .logo {
                  font-size: 36px;
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
              <!-- Header -->
              <div class="header">
                <div class="logo">
                  <span class="logo-gradient">RootShield</span>
                </div>
                <div class="subtitle">Welcome Aboard</div>
                <div class="tagline">Your Cybersecurity Journey Begins</div>
              </div>
              
              <!-- Content -->
              <div class="content">
                <div class="greeting">
                  Welcome to RootShield, ${name}!
                </div>
                
                <div class="welcome-message">
                  <p>Thank you for joining <strong>RootShield</strong> – India's premier platform for cybersecurity and web development education. We're excited to have you as part of our growing community of security enthusiasts and developers.</p>
                  
                  <p>Your account has been successfully created and verified via Google. You now have full access to our platform's features and learning resources.</p>
                </div>
                
                <!-- Features Grid -->
                <div class="features-grid">
                  <div class="feature-card">
                    <div class="feature-icon">🔐</div>
                    <div class="feature-title">Cybersecurity Courses</div>
                    <div class="feature-desc">Learn ethical hacking, network security, and penetration testing from industry experts.</div>
                  </div>
                  
                  <div class="feature-card">
                    <div class="feature-icon">💻</div>
                    <div class="feature-title">Web Development</div>
                    <div class="feature-desc">Master full-stack development with modern frameworks and best practices.</div>
                  </div>
                  
                  <div class="feature-card">
                    <div class="feature-icon">📜</div>
                    <div class="feature-title">Udyam Certifications</div>
                    <div class="feature-desc">Earn government-recognized certifications that boost your career prospects.</div>
                  </div>
                  
                  <div class="feature-card">
                    <div class="feature-icon">👨‍🏫</div>
                    <div class="feature-title">Expert Instructors</div>
                    <div class="feature-desc">Learn from professionals with 10+ years of real-world experience.</div>
                  </div>
                </div>
                
                <!-- CTA Button -->
                <div style="text-align: center;">
                  <a href="${process.env.DOMAIN || "https://rootshield.in"}/dashboard" class="cta-button">
                    🚀 Go to Your Dashboard
                  </a>
                </div>
                
                <!-- Security Badge -->
                <div style="text-align: center;">
                  <div class="security-badge">
                    <span>🔒</span> Account Secured via Google OAuth
                  </div>
                </div>
                
                <!-- Next Steps -->
                <div class="next-steps">
                  <div class="next-steps-title">🎯 Recommended First Steps</div>
                  <ul class="steps-list">
                    <li>
                      <span class="step-number">1</span>
                      Complete your profile with additional details
                    </li>
                    <li>
                      <span class="step-number">2</span>
                      Explore our cybersecurity learning paths
                    </li>
                    <li>
                      <span class="step-number">3</span>
                      Enroll in a free introductory course
                    </li>
                    <li>
                      <span class="step-number">4</span>
                      Join our Discord community for support
                    </li>
                  </ul>
                </div>
                
                <!-- Support Section -->
                <div style="margin-top: 40px; text-align: center;">
                  <p style="color: #4b5563; font-size: 15px;">
                    Need assistance or have questions about getting started?
                  </p>
                  <p style="margin-top: 10px;">
                    📧 <a href="mailto:info@rootshield.in" class="contact-link">info@rootshield.in</a> | 
                    🌐 <a href="${process.env.DOMAIN || "https://rootshield.in"}" class="contact-link">Visit Our Website</a>
                  </p>
                </div>
              </div>
              
              <!-- Footer -->
              <div class="footer">
                <div>
                  <strong>RootShield</strong><br>
                  <span style="font-size: 13px;">Udyam Registered Education Platform</span>
                </div>
                
                <div class="contact-info">
                  <p>📍 Delhi, India<br>
                  📧 <a href="mailto:info@rootshield.in" class="contact-link">info@rootshield.in</a><br>
                  🔗 <a href="${process.env.DOMAIN || "https://rootshield.in"}" class="contact-link">rootshield.in</a></p>
                </div>
                
                <div class="social-links">
                  <a href="https://twitter.com/rootshield" class="social-icon">𝕏</a>
                  <a href="https://linkedin.com/company/rootshield" class="social-icon">in</a>
                  <a href="https://github.com/rootshield" class="social-icon">{} </a>
                  <a href="https://discord.gg/rootshield" class="social-icon">#</a>
                </div>
                
                <div style="margin-top: 25px; font-size: 12px; color: #9ca3af;">
                  <p>
                    This is an automated welcome email. Please do not reply directly.<br>
                    Protecting your data is our priority. Read our 
                    <a href="${process.env.DOMAIN || "https://rootshield.in"}/privacy" style="color: #6b7280; text-decoration: underline;">Privacy Policy</a>.
                  </p>
                  <p style="margin-top: 15px;">
                    © ${new Date().getFullYear()} RootShield. All rights reserved.<br>
                    MSME Registered • GST Compliant
                  </p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;

  // Plain text version
  const textContent = `
          WELCOME TO ROOTSHIELD
          =====================
          
          Hello ${name},
          
          Welcome to RootShield - India's premier platform for cybersecurity and web development education!
          
          Your account has been successfully created and verified via Google authentication. 
          You now have full access to our learning platform.
          
          🎯 WHAT YOU CAN DO NOW:
          
          1. Complete your profile with additional details
          2. Explore our cybersecurity learning paths
          3. Enroll in a free introductory course
          4. Join our community for support and networking
          
          🔐 ACCOUNT DETAILS:
          - Email: ${email}
          - Sign-in method: Google
          - Account status: Verified & Active
          
          🚀 GET STARTED:
          Visit your dashboard: ${process.env.DOMAIN || "https://rootshield.in"}/dashboard
          
          📚 OUR OFFERINGS:
          • Cybersecurity Courses (Ethical Hacking, Network Security, etc.)
          • Web Development Programs
          • Udyam-Recognized Certifications
          • Industry Expert Instructors
          
          💼 CERTIFICATIONS:
          All our courses provide Udyam-registered certifications that are recognized 
          by the Indian government and enhance your career prospects.
          
          📞 NEED HELP?
          Email: info@rootshield.in
          Website: ${process.env.DOMAIN || "https://rootshield.in"}
          
          ---
          RootShield | Udyam Registered Education Platform
          Delhi, India | info@rootshield.in | rootshield.in
          
          This is an automated welcome email. Please do not reply directly.
          © ${new Date().getFullYear()} RootShield. All rights reserved.
        `;

  try {
    await apiInstance.sendTransacEmail({
      sender: {
        email: "info@rootshield.in",
        name: "RootShield Welcome Team",
      },
      to: [{ email, name }],
      subject: "🎉 Welcome to RootShield! Your Cybersecurity Journey Begins",
      htmlContent: htmlContent,
      textContent: textContent,
    });

    console.log("✅ Welcome email sent to:", email);
  } catch (emailErr) {
    console.error("❌ Failed to send welcome email:", emailErr);
    // Don't fail user creation if email fails
  }
};
