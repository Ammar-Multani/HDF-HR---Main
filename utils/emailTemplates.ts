/**
 * Email templates for various notifications
 */

/**
 * Generate a password reset email
 * @param token The reset token
 * @returns The HTML content for the email
 */
export const generatePasswordResetEmail = (token: string) => {
  const resetLink = `https://hdfhr.netlify.app/reset-password?token=${token}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background: #f8f9fa;
          -webkit-text-size-adjust: 100%;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          box-sizing: border-box;
        }
        .card {
          background: #ffffff;
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(0, 0, 0, 0.1);
          margin-bottom: 24px;
          position: relative;
          overflow: hidden;
        }
        .card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 6px;
          background: linear-gradient(
            90deg,
            rgba(10,185,129,1),
            rgba(6,169,169,1),
            rgba(38,127,161,1),
            rgba(54,105,157,1),
            rgba(74,78,153,1),
            rgba(94,52,149,1)
          );
        }
        .header {
          text-align: center;
          margin-bottom: 32px;
          padding: 32px;
          background: linear-gradient(
            135deg,
            rgba(10,185,129,0.1),
            rgba(94,52,149,0.1)
          );
          border-radius: 16px;
          border: 1px solid rgba(10,185,129,0.2);
        }
        .logo {
          width: 120px;
          height: auto;
          margin-bottom: 24px;
        }
        .title {
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(
            90deg,
            rgba(10,185,129,1),
            rgba(38,127,161,1),
            rgba(94,52,149,1)
          );
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 16px 0;
          letter-spacing: -0.5px;
        }
        .subtitle {
          font-size: 17px;
          color: #666;
          margin-bottom: 32px;
          line-height: 1.6;
        }
        .button {
          display: inline-block;
          text-decoration: none;
          padding: 16px 32px;
          border-radius: 100px;
          font-weight: 600;
          font-size: 16px;
          margin: 24px 0;
          text-align: center;
          letter-spacing: 0.3px;
          position: relative;
          z-index: 1;
          overflow: hidden;
          transition: all 0.3s ease;
          border: none;
          color: white !important;
          background: linear-gradient(
            90deg,
            rgba(10,185,129,1),
            rgba(6,169,169,1),
            rgba(38,127,161,1)
          );
          box-shadow: 0 4px 15px rgba(10,185,129,0.3);
        }
        .button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(10,185,129,0.4);
        }
        .link-box {
          background: rgba(10,185,129,0.05);
          padding: 20px;
          border-radius: 16px;
          border: 1px solid rgba(10,185,129,0.2);
          margin: 24px 0;
          word-break: break-all;
          font-family: 'SF Mono', Consolas, Monaco, monospace;
          font-size: 14px;
          color: rgba(38,127,161,1);
          position: relative;
        }
        .link-box::before {
          content: '🔗';
          position: absolute;
          top: -12px;
          left: 20px;
          background: white;
          padding: 0 8px;
          font-size: 16px;
        }
        .warning {
          display: flex;
          align-items: center;
          background: rgba(94,52,149,0.05);
          padding: 20px;
          border-radius: 16px;
          margin: 32px 0;
          border: 1px solid rgba(94,52,149,0.2);
        }
        .warning-icon {
          margin-right: 16px;
          font-size: 24px;
        }
        .support-box {
          background: linear-gradient(
            135deg,
            rgba(10,185,129,0.05),
            rgba(38,127,161,0.05)
          );
          padding: 32px;
          border-radius: 20px;
          margin: 32px 0;
          border: 1px solid rgba(10,185,129,0.15);
        }
        .support-title {
          font-size: 20px;
          font-weight: 600;
          color: rgba(38,127,161,1);
          margin: 0 0 16px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .footer {
          text-align: center;
          font-size: 14px;
          color: #666;
          padding: 32px 0;
          border-top: 1px solid rgba(0,0,0,0.1);
          margin-top: 40px;
        }
        .social-links {
          margin: 24px 0;
          display: flex;
          justify-content: center;
          gap: 16px;
        }
        .social-links a {
          color: rgba(38,127,161,1);
          text-decoration: none;
          padding: 8px 16px;
          border-radius: 100px;
          background: rgba(38,127,161,0.1);
          transition: all 0.3s ease;
        }
        .social-links a:hover {
          background: rgba(38,127,161,0.2);
        }
        @media (max-width: 480px) {
          .container {
            padding: 12px;
          }
          .card {
            padding: 24px;
            border-radius: 16px;
          }
          .header {
            padding: 20px !important;
          }
          .title {
            font-size: 24px !important;
          }
          .subtitle {
            font-size: 15px !important;
          }
          .button {
            width: 100% !important;
            padding: 14px 20px !important;
            box-sizing: border-box;
          }
          .credentials-box,
          .warning-box,
          .support-box,
          .feature-box {
            padding: 20px !important;
          }
          .social-links {
            flex-direction: column !important;
            gap: 8px !important;
          }
          .social-links a {
            width: 100% !important;
            box-sizing: border-box;
            text-align: center;
          }
          .feature-list li {
            font-size: 14px;
          }
          .credential-item {
            padding: 12px !important;
          }
          .credential-value {
            font-size: 13px !important;
            word-break: break-all;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="header">
            <img src="https://hdfhr.netlify.app/assets/assets/splash-icon-dark.06cf42ad68b1100016570ca669fd11fb.png" alt="HDF HR" class="logo">
            <h1 class="title">Reset Your Password</h1>
            <p class="subtitle">We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
          </div>
          
          <div style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Password</a>
          </div>

          <div class="link-box">
            ${resetLink}
          </div>

          <div class="warning">
            <span class="warning-icon">⚠️</span>
            <span>This link will expire in 1 hour for security reasons. Please reset your password promptly.</span>
          </div>

          <div class="support-box">
            <h3 class="support-title">
              <span>💬</span>
              <span>Need Help?</span>
            </h3>
            <p style="margin: 0;">Our support team is here to assist you with any questions or concerns:</p>
            <p style="margin: 12px 0;">
              📧 Email: <a href="mailto:info@hdf.ch" style="color: rgba(38,127,161,1);">info@hdf.ch</a>
            </p>
          </div>
        </div>

        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} HDF HR. All rights reserved.</p>
          <p>This is an automated message, please do not reply.</p>
          <div class="social-links">
            <a href="https://hdfhr.netlify.app">Visit Website</a>
            <a href="mailto:info@hdf.ch">Contact Support</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate a welcome email for new users
 * @param name The user's full name
 * @param email The user's email
 * @param password The user's initial password
 * @param companyName The company name
 * @returns The HTML content for the email
 */
export const generateWelcomeEmail = (
  name: string,
  email: string,
  password: string,
  companyName: string
) => {
  const loginLink = "https://hdfhr.netlify.app/login";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to ${companyName}</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background: #f8f9fa;
          -webkit-text-size-adjust: 100%;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          box-sizing: border-box;
        }
        .card {
          background: #ffffff;
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(0, 0, 0, 0.1);
          margin-bottom: 24px;
          position: relative;
          overflow: hidden;
        }
        .card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 6px;
          background: linear-gradient(
            90deg,
            rgba(10,185,129,1),
            rgba(6,169,169,1),
            rgba(38,127,161,1),
            rgba(54,105,157,1),
            rgba(74,78,153,1),
            rgba(94,52,149,1)
          );
        }
        .header {
          text-align: center;
          margin-bottom: 32px;
          padding: 32px;
          background: linear-gradient(
            135deg,
            rgba(10,185,129,0.1),
            rgba(94,52,149,0.1)
          );
          border-radius: 16px;
          border: 1px solid rgba(10,185,129,0.2);
        }
        .logo {
          width: 120px;
          height: auto;
          margin-bottom: 24px;
        }
        .title {
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(
            90deg,
            rgba(10,185,129,1),
            rgba(38,127,161,1),
            rgba(94,52,149,1)
          );
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 16px 0;
          letter-spacing: -0.5px;
        }
        .subtitle {
          font-size: 17px;
          color: #666;
          margin-bottom: 32px;
          line-height: 1.6;
        }
        .credentials-box {
          background: rgba(10,185,129,0.05);
          padding: 24px;
          border-radius: 16px;
          border: 1px solid rgba(10,185,129,0.2);
          margin: 24px 0;
        }
        .credentials-title {
          font-size: 18px;
          font-weight: 600;
          color: rgba(38,127,161,1);
          margin: 0 0 16px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .credential-item {
          background: white;
          padding: 12px 16px;
          border-radius: 8px;
          margin: 8px 0;
          border: 1px solid rgba(10,185,129,0.1);
        }
        .credential-label {
          font-size: 14px;
          color: #666;
          margin-bottom: 4px;
        }
        .credential-value {
          font-family: 'SF Mono', Consolas, Monaco, monospace;
          font-size: 15px;
          color: rgba(38,127,161,1);
        }
        .button {
          display: inline-block;
          text-decoration: none;
          padding: 16px 32px;
          border-radius: 100px;
          font-weight: 600;
          font-size: 16px;
          margin: 24px 0;
          text-align: center;
          letter-spacing: 0.3px;
          position: relative;
          z-index: 1;
          overflow: hidden;
          transition: all 0.3s ease;
          border: none;
          color: white !important;
          background: linear-gradient(
            90deg,
            rgba(10,185,129,1),
            rgba(6,169,169,1),
            rgba(38,127,161,1)
          );
          box-shadow: 0 4px 15px rgba(10,185,129,0.3);
        }
        .button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(10,185,129,0.4);
        }
        .button::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            90deg,
            rgba(38,127,161,1),
            rgba(74,78,153,1),
            rgba(94,52,149,1)
          );
          opacity: 0;
          z-index: -1;
          transition: opacity 0.3s ease;
        }
        .button:hover::before {
          opacity: 1;
        }
        .feature-box {
          background: linear-gradient(
            135deg,
            rgba(10,185,129,0.05),
            rgba(38,127,161,0.05)
          );
          padding: 32px;
          border-radius: 20px;
          margin: 32px 0;
          border: 1px solid rgba(10,185,129,0.15);
        }
        .feature-title {
          font-size: 20px;
          font-weight: 600;
          color: rgba(38,127,161,1);
          margin: 0 0 20px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .feature-list {
          list-style-type: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 16px;
        }
        .feature-list li {
          padding-left: 32px;
          position: relative;
          display: flex;
          align-items: center;
        }
        .feature-list li::before {
          content: '';
          position: absolute;
          left: 0;
          width: 20px;
          height: 20px;
          background: linear-gradient(
            135deg,
            rgba(10,185,129,1),
            rgba(38,127,161,1)
          );
          border-radius: 50%;
        }
        .feature-list li::after {
          content: '✓';
          position: absolute;
          left: 5px;
          color: white;
          font-size: 12px;
          font-weight: bold;
        }
        .warning-box {
          background: rgba(94,52,149,0.05);
          padding: 20px;
          border-radius: 16px;
          margin: 32px 0;
          border: 1px solid rgba(94,52,149,0.2);
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }
        .warning-icon {
          font-size: 24px;
          line-height: 1;
        }
        .support-box {
          background: rgba(94,52,149,0.05);
          padding: 32px;
          border-radius: 20px;
          margin: 32px 0;
          border: 1px solid rgba(94,52,149,0.15);
        }
        .footer {
          text-align: center;
          font-size: 14px;
          color: #666;
          padding: 32px 0;
          border-top: 1px solid rgba(0,0,0,0.1);
          margin-top: 40px;
        }
        .social-links {
          margin: 24px 0;
          display: flex;
          justify-content: center;
          gap: 16px;
        }
        .social-links a {
          color: rgba(38,127,161,1);
          text-decoration: none;
          padding: 8px 16px;
          border-radius: 100px;
          background: rgba(38,127,161,0.1);
          transition: all 0.3s ease;
        }
        .social-links a:hover {
          background: rgba(38,127,161,0.2);
        }
        @media (max-width: 480px) {
          .container {
            padding: 12px;
          }
          .card {
            padding: 24px;
            border-radius: 16px;
          }
          .header {
            padding: 20px !important;
          }
          .title {
            font-size: 24px !important;
          }
          .subtitle {
            font-size: 15px !important;
          }
          .button {
            width: 100% !important;
            padding: 14px 20px !important;
            box-sizing: border-box;
          }
          .credentials-box,
          .warning-box,
          .support-box,
          .feature-box {
            padding: 20px !important;
          }
          .social-links {
            flex-direction: column !important;
            gap: 8px !important;
          }
          .social-links a {
            width: 100% !important;
            box-sizing: border-box;
            text-align: center;
          }
          .feature-list li {
            font-size: 14px;
          }
          .credential-item {
            padding: 12px !important;
          }
          .credential-value {
            font-size: 13px !important;
            word-break: break-all;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="header">
            <img src="https://hdfhr.netlify.app/assets/assets/splash-icon-dark.06cf42ad68b1100016570ca669fd11fb.png" alt="HDF HR" class="logo">
            <h1 class="title">Welcome to ${companyName}</h1>
            <p class="subtitle">Hello ${name}, we're thrilled to have you join us! Your account has been successfully created.</p>
          </div>

          <div class="credentials-box">
            <h3 class="credentials-title">
              <span>🔐</span>
              <span>Your Login Credentials</span>
            </h3>
            <div class="credential-item">
              <div class="credential-label">Email Address</div>
              <div class="credential-value">${email}</div>
            </div>
            <div class="credential-item">
              <div class="credential-label">Initial Password</div>
              <div class="credential-value">${password}</div>
            </div>
          </div>
          
          <div style="text-align: center;">
            <a href="${loginLink}" class="button">Log In to Your Account</a>
          </div>

          <div class="feature-box">
            <h3 class="feature-title">
              <span>✨</span>
              <span>What you can do with HDF HR:</span>
            </h3>
            <ul class="feature-list">
              <li>Manage your profile efficiently</li>
              <li>Create forms and its requests</li>
              <li>Submit and manage leave requests</li>
              <li>Stay updated with company responses</li>
            </ul>
          </div>

          <div class="warning-box">
            <span class="warning-icon">⚠️</span>
            <div>
              <strong>Important Security Notice:</strong>
              <p style="margin: 8px 0 0 0;">For security purposes, please change your password immediately after your first login. Your initial password will expire in 7 days.</p>
            </div>
          </div>

          <div class="support-box">
            <h3 class="feature-title">
              <span>💬</span>
              <span>Need Help Getting Started?</span>
            </h3>
            <p style="margin: 8px 0;">Our support team is here to help you:</p>
            <p style="margin: 8px 0;">
              📧 Email: <a href="mailto:info@hdf.ch" style="color: rgba(38,127,161,1);">info@hdf.ch</a>
            </p>
          </div>
        </div>

        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} HDF HR. All rights reserved.</p>
          <p>This is an automated message, please do not reply.</p>
          <div class="social-links">
            <a href="https://hdfhr.netlify.app">Visit Website</a>
            <a href="mailto:info@hdf.ch">Contact Support</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate an invitation email for company admins
 * @param email The admin's email
 * @param password The admin's initial password
 * @param companyName The company name
 * @returns The HTML content for the email
 */
export const generateAdminInviteEmail = (
  email: string,
  password: string,
  companyName: string
) => {
  const loginLink = "https://hdfhr.netlify.app/login";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to ${companyName} on HDF HR</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background: #f8f9fa;
          -webkit-text-size-adjust: 100%;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          box-sizing: border-box;
        }
        .card {
          background: #ffffff;
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(0, 0, 0, 0.1);
          margin-bottom: 24px;
          position: relative;
          overflow: hidden;
        }
        .card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 6px;
          background: linear-gradient(
            90deg,
            rgba(10,185,129,1),
            rgba(6,169,169,1),
            rgba(38,127,161,1),
            rgba(54,105,157,1),
            rgba(74,78,153,1),
            rgba(94,52,149,1)
          );
        }
        .header {
          text-align: center;
          margin-bottom: 32px;
          padding: 32px;
          background: linear-gradient(
            135deg,
            rgba(10,185,129,0.1),
            rgba(94,52,149,0.1)
          );
          border-radius: 16px;
          border: 1px solid rgba(10,185,129,0.2);
        }
        .logo {
          width: 120px;
          height: auto;
          margin-bottom: 24px;
        }
        .title {
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(
            90deg,
            rgba(10,185,129,1),
            rgba(38,127,161,1),
            rgba(94,52,149,1)
          );
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 16px 0;
          letter-spacing: -0.5px;
        }
        .subtitle {
          font-size: 17px;
          color: #666;
          margin-bottom: 32px;
          line-height: 1.6;
        }
        .credentials-box {
          background: rgba(10,185,129,0.05);
          padding: 24px;
          border-radius: 16px;
          border: 1px solid rgba(10,185,129,0.2);
          margin: 24px 0;
        }
        .credentials-title {
          font-size: 18px;
          font-weight: 600;
          color: rgba(38,127,161,1);
          margin: 0 0 16px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .credential-item {
          background: white;
          padding: 12px 16px;
          border-radius: 8px;
          margin: 8px 0;
          border: 1px solid rgba(10,185,129,0.1);
        }
        .credential-label {
          font-size: 14px;
          color: #666;
          margin-bottom: 4px;
        }
        .credential-value {
          font-family: 'SF Mono', Consolas, Monaco, monospace;
          font-size: 15px;
          color: rgba(38,127,161,1);
        }
        .button {
          display: inline-block;
          text-decoration: none;
          padding: 16px 32px;
          border-radius: 100px;
          font-weight: 600;
          font-size: 16px;
          margin: 24px 0;
          text-align: center;
          letter-spacing: 0.3px;
          position: relative;
          z-index: 1;
          overflow: hidden;
          transition: all 0.3s ease;
          border: none;
          color: white !important;
          background: linear-gradient(
            90deg,
            rgba(10,185,129,1),
            rgba(6,169,169,1),
            rgba(38,127,161,1)
          );
          box-shadow: 0 4px 15px rgba(10,185,129,0.3);
        }
        .button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(10,185,129,0.4);
        }
        .button::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            90deg,
            rgba(38,127,161,1),
            rgba(74,78,153,1),
            rgba(94,52,149,1)
          );
          opacity: 0;
          z-index: -1;
          transition: opacity 0.3s ease;
        }
        .button:hover::before {
          opacity: 1;
        }
        .feature-box {
          background: linear-gradient(
            135deg,
            rgba(10,185,129,0.05),
            rgba(38,127,161,0.05)
          );
          padding: 32px;
          border-radius: 20px;
          margin: 32px 0;
          border: 1px solid rgba(10,185,129,0.15);
        }
        .feature-title {
          font-size: 20px;
          font-weight: 600;
          color: rgba(38,127,161,1);
          margin: 0 0 20px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .feature-list {
          list-style-type: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 16px;
        }
        .feature-list li {
          padding-left: 32px;
          position: relative;
          display: flex;
          align-items: center;
        }
        .feature-list li::before {
          content: '';
          position: absolute;
          left: 0;
          width: 20px;
          height: 20px;
          background: linear-gradient(
            135deg,
            rgba(10,185,129,1),
            rgba(38,127,161,1)
          );
          border-radius: 50%;
        }
        .feature-list li::after {
          content: '✓';
          position: absolute;
          left: 5px;
          color: white;
          font-size: 12px;
          font-weight: bold;
        }
        .warning-box {
          background: rgba(94,52,149,0.05);
          padding: 20px;
          border-radius: 16px;
          margin: 32px 0;
          border: 1px solid rgba(94,52,149,0.2);
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }
        .warning-icon {
          font-size: 24px;
          line-height: 1;
        }
        .support-box {
          background: rgba(94,52,149,0.05);
          padding: 32px;
          border-radius: 20px;
          margin: 32px 0;
          border: 1px solid rgba(94,52,149,0.15);
        }
        .footer {
          text-align: center;
          font-size: 14px;
          color: #666;
          padding: 32px 0;
          border-top: 1px solid rgba(0,0,0,0.1);
          margin-top: 40px;
        }
        .social-links {
          margin: 24px 0;
          display: flex;
          justify-content: center;
          gap: 16px;
        }
        .social-links a {
          color: rgba(38,127,161,1);
          text-decoration: none;
          padding: 8px 16px;
          border-radius: 100px;
          background: rgba(38,127,161,0.1);
          transition: all 0.3s ease;
        }
        .social-links a:hover {
          background: rgba(38,127,161,0.2);
        }
        @media (max-width: 480px) {
          .container {
            padding: 12px;
          }
          .card {
            padding: 24px;
            border-radius: 16px;
          }
          .header {
            padding: 20px !important;
          }
          .title {
            font-size: 24px !important;
          }
          .subtitle {
            font-size: 15px !important;
          }
          .button {
            width: 100% !important;
            padding: 14px 20px !important;
            box-sizing: border-box;
          }
          .credentials-box,
          .warning-box,
          .support-box,
          .feature-box {
            padding: 20px !important;
          }
          .social-links {
            flex-direction: column !important;
            gap: 8px !important;
          }
          .social-links a {
            width: 100% !important;
            box-sizing: border-box;
            text-align: center;
          }
          .feature-list li {
            font-size: 14px;
          }
          .credential-item {
            padding: 12px !important;
          }
          .credential-value {
            font-size: 13px !important;
            word-break: break-all;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="header">
            <img src="https://hdfhr.netlify.app/assets/assets/splash-icon-dark.06cf42ad68b1100016570ca669fd11fb.png" alt="HDF HR" class="logo">
            <h1 class="title">Welcome to ${companyName}</h1>
            <p class="subtitle">You've been invited to manage your company's HR platform on HDF HR. Your admin account has been created successfully.</p>
          </div>
          
          <div class="credentials-box">
            <h3 class="credentials-title">
              <span>🔐</span>
              <span>Your Login Credentials</span>
            </h3>
            <div class="credential-item">
              <div class="credential-label">Email Address</div>
              <div class="credential-value">${email}</div>
            </div>
            <div class="credential-item">
              <div class="credential-label">Temporary Password</div>
              <div class="credential-value">${password}</div>
            </div>
          </div>

          <div style="text-align: center;">
            <a href="${loginLink}" class="button">Log In to Your Account</a>
          </div>

          <div class="feature-box">
            <h3 class="feature-title">
              <span>✨</span>
              <span>As a Company Admin, you can:</span>
            </h3>
            <ul class="feature-list">
              <li>Manage employee profiles and access status</li>
              <li>Configure company details</li>
              <li>Handle forms and requests</li>
              <li>Create and manage tasks</li>
              <li>Manage receipts and documents</li>
            </ul>
          </div>

          <div class="warning-box">
            <span class="warning-icon">⚠️</span>
            <div>
              <strong>Important Security Notice:</strong>
              <p style="margin: 8px 0 0 0;">Please change your password immediately after your first login for security purposes. Your temporary password will expire in 7 days.</p>
            </div>
          </div>

          <div class="support-box">
            <h3 class="feature-title">
              <span>💬</span>
              <span>Need Help Getting Started?</span>
            </h3>
            <p style="margin: 8px 0;">Our support team is here to help you set up your company's HR platform:</p>
            <p style="margin: 8px 0;">
              📧 Email: <a href="mailto:info@hdf.ch" style="color: rgba(38,127,161,1);">info@hdf.ch</a>
            </p>
          </div>
        </div>

        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} HDF HR. All rights reserved.</p>
          <p>This is an automated message, please do not reply.</p>
          <div class="social-links">
            <a href="https://hdfhr.netlify.app">Visit Website</a>
            <a href="mailto:info@hdf.ch">Contact Support</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate a welcome email for super admins
 * @param name The admin's name
 * @param email The admin's email
 * @param password The admin's initial password
 * @returns The HTML content for the email
 */
export const generateSuperAdminWelcomeEmail = (
  name: string,
  email: string,
  password: string
) => {
  const loginLink = "https://hdfhr.netlify.app/login";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to HDF HR as Super Admin</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
          background: #f8f9fa;
          -webkit-text-size-adjust: 100%;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          box-sizing: border-box;
        }
        .card {
          background: #ffffff;
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
          border: 1px solid rgba(0, 0, 0, 0.1);
          margin-bottom: 24px;
          position: relative;
          overflow: hidden;
        }
        .card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 6px;
          background: linear-gradient(
            90deg,
            rgba(10,185,129,1),
            rgba(6,169,169,1),
            rgba(38,127,161,1),
            rgba(54,105,157,1),
            rgba(74,78,153,1),
            rgba(94,52,149,1)
          );
        }
        .header {
          text-align: center;
          margin-bottom: 32px;
          padding: 32px;
          background: linear-gradient(
            135deg,
            rgba(10,185,129,0.1),
            rgba(94,52,149,0.1)
          );
          border-radius: 16px;
          border: 1px solid rgba(10,185,129,0.2);
        }
        .logo {
          width: 120px;
          height: auto;
          margin-bottom: 24px;
        }
        .title {
          font-size: 28px;
          font-weight: 700;
          background: linear-gradient(
            90deg,
            rgba(10,185,129,1),
            rgba(38,127,161,1),
            rgba(94,52,149,1)
          );
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          margin: 0 0 16px 0;
          letter-spacing: -0.5px;
        }
        .subtitle {
          font-size: 17px;
          color: #666;
          margin-bottom: 32px;
          line-height: 1.6;
        }
        .credentials-box {
          background: rgba(10,185,129,0.05);
          padding: 24px;
          border-radius: 16px;
          border: 1px solid rgba(10,185,129,0.2);
          margin: 24px 0;
        }
        .credentials-title {
          font-size: 18px;
          font-weight: 600;
          color: rgba(38,127,161,1);
          margin: 0 0 16px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .credential-item {
          background: white;
          padding: 12px 16px;
          border-radius: 8px;
          margin: 8px 0;
          border: 1px solid rgba(10,185,129,0.1);
        }
        .credential-label {
          font-size: 14px;
          color: #666;
          margin-bottom: 4px;
        }
        .credential-value {
          font-family: 'SF Mono', Consolas, Monaco, monospace;
          font-size: 15px;
          color: rgba(38,127,161,1);
        }
        .button {
          display: inline-block;
          text-decoration: none;
          padding: 16px 32px;
          border-radius: 100px;
          font-weight: 600;
          font-size: 16px;
          margin: 24px 0;
          text-align: center;
          letter-spacing: 0.3px;
          position: relative;
          z-index: 1;
          overflow: hidden;
          transition: all 0.3s ease;
          border: none;
          color: white !important;
          background: linear-gradient(
            90deg,
            rgba(10,185,129,1),
            rgba(6,169,169,1),
            rgba(38,127,161,1),
            rgba(74,78,153,1),
            rgba(94,52,149,1)
          );
          box-shadow: 0 4px 15px rgba(10,185,129,0.3);
        }
        .button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(10,185,129,0.4);
        }
        .button::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            90deg,
            rgba(38,127,161,1),
            rgba(74,78,153,1),
            rgba(94,52,149,1)
          );
          opacity: 0;
          z-index: -1;
          transition: opacity 0.3s ease;
        }
        .button:hover::before {
          opacity: 1;
        }
        .feature-box {
          background: linear-gradient(
            135deg,
            rgba(10,185,129,0.05),
            rgba(38,127,161,0.05)
          );
          padding: 32px;
          border-radius: 20px;
          margin: 32px 0;
          border: 1px solid rgba(10,185,129,0.15);
        }
        .feature-title {
          font-size: 20px;
          font-weight: 600;
          color: rgba(38,127,161,1);
          margin: 0 0 20px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .feature-list {
          list-style-type: none;
          padding: 0;
          margin: 0;
          display: grid;
          gap: 16px;
        }
        .feature-list li {
          padding-left: 32px;
          position: relative;
          display: flex;
          align-items: center;
        }
        .feature-list li::before {
          content: '';
          position: absolute;
          left: 0;
          width: 20px;
          height: 20px;
          background: linear-gradient(
            135deg,
            rgba(10,185,129,1),
            rgba(38,127,161,1)
          );
          border-radius: 50%;
        }
        .feature-list li::after {
          content: '✓';
          position: absolute;
          left: 5px;
          color: white;
          font-size: 12px;
          font-weight: bold;
        }
        .warning-box {
          background: rgba(94,52,149,0.05);
          padding: 20px;
          border-radius: 16px;
          margin: 32px 0;
          border: 1px solid rgba(94,52,149,0.2);
          display: flex;
          align-items: flex-start;
          gap: 16px;
        }
        .warning-icon {
          font-size: 24px;
          line-height: 1;
        }
        .support-box {
          background: rgba(94,52,149,0.05);
          padding: 32px;
          border-radius: 20px;
          margin: 32px 0;
          border: 1px solid rgba(94,52,149,0.15);
        }
        .footer {
          text-align: center;
          font-size: 14px;
          color: #666;
          padding: 32px 0;
          border-top: 1px solid rgba(0,0,0,0.1);
          margin-top: 40px;
        }
        .social-links {
          margin: 24px 0;
          display: flex;
          justify-content: center;
          gap: 16px;
        }
        .social-links a {
          color: rgba(38,127,161,1);
          text-decoration: none;
          padding: 8px 16px;
          border-radius: 100px;
          background: rgba(38,127,161,0.1);
          transition: all 0.3s ease;
        }
        .social-links a:hover {
          background: rgba(38,127,161,0.2);
        }
        @media (max-width: 480px) {
          .container {
            padding: 12px;
          }
          .card {
            padding: 24px;
            border-radius: 16px;
          }
          .header {
            padding: 20px !important;
          }
          .title {
            font-size: 24px !important;
          }
          .subtitle {
            font-size: 15px !important;
          }
          .button {
            width: 100% !important;
            padding: 14px 20px !important;
            box-sizing: border-box;
          }
          .credentials-box,
          .warning-box,
          .support-box,
          .feature-box {
            padding: 20px !important;
          }
          .social-links {
            flex-direction: column !important;
            gap: 8px !important;
          }
          .social-links a {
            width: 100% !important;
            box-sizing: border-box;
            text-align: center;
          }
          .feature-list li {
            font-size: 14px;
          }
          .credential-item {
            padding: 12px !important;
          }
          .credential-value {
            font-size: 13px !important;
            word-break: break-all;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <div class="header">
            <img src="https://hdfhr.netlify.app/assets/assets/splash-icon-dark.06cf42ad68b1100016570ca669fd11fb.png" alt="HDF HR" class="logo">
            <h1 class="title">Welcome to HDF HR</h1>
            <p class="subtitle">Hello ${name}, you've been granted Super Admin access to the HDF HR platform.</p>
          </div>
          
          <div class="credentials-box">
            <h3 class="credentials-title">
              <span>🔐</span>
              <span>Your Login Credentials</span>
            </h3>
            <div class="credential-item">
              <div class="credential-label">Email Address</div>
              <div class="credential-value">${email}</div>
            </div>
            <div class="credential-item">
              <div class="credential-label">Initial Password</div>
              <div class="credential-value">${password}</div>
            </div>
          </div>

          <div style="text-align: center;">
            <a href="${loginLink}" class="button">Access Your Account</a>
          </div>

          <div class="feature-box">
            <h3 class="feature-title">
              <span>✨</span>
              <span>As a Super Admin, you can:</span>
            </h3>
            <ul class="feature-list">
              <li>Create and manage companies</li>
              <li>Manage company administrators</li>
              <li>Monitor system-wide activities</li>
              <li>Create tasks for company admins</li>
              <li>Create and manage receipts and documents</li>
              <li>Manage forms</li>
              <li>Manage company settings</li>
              <li>Manage employee profiles</li>
              <li>Manage employee access</li>
            </ul>
          </div>

          <div class="warning-box">
            <span class="warning-icon">⚠️</span>
            <div>
              <strong>Important Security Notice:</strong>
              <p style="margin: 8px 0 0 0;">For security purposes, please change your password immediately after your first login. Your initial password will expire in 7 days.</p>
            </div>
          </div>

          <div class="support-box">
            <h3 class="feature-title">
              <span>💬</span>
              <span>Need Assistance?</span>
            </h3>
            <p style="margin: 8px 0;">If you need any help or have questions about your super admin access:</p>
            <p style="margin: 8px 0;">
              📧 Email: <a href="mailto:info@hdf.ch" style="color: rgba(38,127,161,1);">info@hdf.ch</a>
            </p>
          </div>
        </div>

        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} HDF HR. All rights reserved.</p>
          <p>This is an automated message, please do not reply.</p>
          <div class="social-links">
            <a href="https://hdfhr.netlify.app">Visit Website</a>
            <a href="mailto:info@hdf.ch">Contact Support</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};
