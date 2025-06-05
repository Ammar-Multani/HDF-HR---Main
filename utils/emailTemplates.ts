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
        ${sharedStyles}
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
        ${sharedStyles}
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
        ${sharedStyles}
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
        ${sharedStyles}
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

// Update the shared styles that will be used across all email templates
const sharedStyles = `
  :root {
    color-scheme: light dark;
  }
  
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    line-height: 1.6;
    color: #333;
    margin: 0;
    padding: 0;
    background: #f8f9fa;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  .container {
    max-width: 600px;
    margin: 0 auto;
    padding: 20px;
    box-sizing: border-box;
  }
  .card {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-radius: 24px;
    padding: clamp(24px, 5vw, 40px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.2);
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
      #10B981,
      #0EA5E9,
      #6366F1,
      #8B5CF6
    );
  }
  .header {
    text-align: center;
    margin-bottom: clamp(24px, 4vw, 32px);
    padding: clamp(24px, 4vw, 32px);
    background: linear-gradient(
      135deg,
      rgba(16, 185, 129, 0.08),
      rgba(99, 102, 241, 0.08)
    );
    border-radius: 20px;
    border: 1px solid rgba(16, 185, 129, 0.15);
  }
  .logo {
    width: clamp(80px, 15vw, 120px);
    height: auto;
    margin-bottom: clamp(16px, 3vw, 24px);
    transition: transform 0.3s ease;
  }
  .logo:hover {
    transform: scale(1.05);
  }
  .title {
    font-size: clamp(24px, 4vw, 28px);
    font-weight: 650;
    background: linear-gradient(
      90deg,
      #10B981,
      #0EA5E9,
      #6366F1
    );
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    margin: 0 0 clamp(12px, 2vw, 16px) 0;
    letter-spacing: -0.02em;
    line-height: 1.3;
  }
  .subtitle {
    font-size: clamp(15px, 2.5vw, 17px);
    color: #666;
    margin-bottom: clamp(24px, 4vw, 32px);
    line-height: 1.6;
  }
  .button {
    display: inline-block;
    text-decoration: none;
    padding: clamp(14px, 2.5vw, 16px) clamp(24px, 4vw, 32px);
    border-radius: 100px;
    font-weight: 600;
    font-size: clamp(14px, 2.5vw, 16px);
    margin: clamp(20px, 3vw, 24px) 0;
    text-align: center;
    letter-spacing: 0.3px;
    position: relative;
    z-index: 1;
    overflow: hidden;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    border: none;
    color: white !important;
    background: linear-gradient(
      90deg,
      #10B981,
      #0EA5E9,
      #6366F1,
      #8B5CF6
    );
    background-size: 200% auto;
    box-shadow: 0 4px 15px rgba(16, 185, 129, 0.25);
  }
  .button:hover {
    transform: translateY(-2px);
    background-position: right center;
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.35);
  }
  .link-box {
    background: rgba(16, 185, 129, 0.05);
    padding: clamp(16px, 3vw, 20px);
    border-radius: 16px;
    border: 1px solid rgba(16, 185, 129, 0.15);
    margin: clamp(20px, 3vw, 24px) 0;
    word-break: break-all;
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, Monaco, monospace;
    font-size: clamp(12px, 2vw, 14px);
    color: #0EA5E9;
    position: relative;
  }
  .link-box::before {
    content: '🔗';
    position: absolute;
    top: -12px;
    left: 20px;
    background: #fff;
    padding: 0 8px;
    font-size: 16px;
    border-radius: 100px;
  }
  .warning-box {
    display: flex;
    align-items: flex-start;
    gap: clamp(12px, 2vw, 16px);
    background: rgba(99, 102, 241, 0.05);
    padding: clamp(16px, 3vw, 20px);
    border-radius: 16px;
    margin: clamp(24px, 4vw, 32px) 0;
    border: 1px solid rgba(99, 102, 241, 0.15);
  }
  .warning-icon {
    font-size: clamp(20px, 3.5vw, 24px);
    line-height: 1;
  }
  .support-box {
    background: linear-gradient(
      135deg,
      rgba(16, 185, 129, 0.05),
      rgba(99, 102, 241, 0.05)
    );
    padding: clamp(24px, 4vw, 32px);
    border-radius: 20px;
    margin: clamp(24px, 4vw, 32px) 0;
    border: 1px solid rgba(16, 185, 129, 0.15);
  }
  .support-title {
    font-size: clamp(18px, 3vw, 20px);
    font-weight: 600;
    color: #0EA5E9;
    margin: 0 0 clamp(12px, 2vw, 16px) 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .footer {
    text-align: center;
    font-size: clamp(12px, 2vw, 14px);
    color: #666;
    padding: clamp(24px, 4vw, 32px) 0;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    margin-top: clamp(32px, 5vw, 40px);
  }
  .social-links {
    margin: clamp(20px, 3vw, 24px) 0;
    display: flex;
    justify-content: center;
    gap: clamp(12px, 2vw, 16px);
    flex-wrap: wrap;
    align-items: center;
    text-align: center;
    width: 100%;

  }
  .social-links a {
    color: #0EA5E9;
    text-decoration: none;
    padding: 8px clamp(12px, 2vw, 16px);
    border-radius: 100px;
    background: rgba(14, 165, 233, 0.1);
    transition: all 0.3s ease;
    font-size: clamp(12px, 2vw, 14px);
    white-space: nowrap;
  }
  .social-links a:hover {
    background: rgba(14, 165, 233, 0.2);
    transform: translateY(-1px);
  }
  .credentials-box {
    background: rgba(16, 185, 129, 0.05);
    padding: clamp(20px, 3vw, 24px);
    border-radius: 16px;
    border: 1px solid rgba(16, 185, 129, 0.15);
    margin: clamp(20px, 3vw, 24px) 0;
  }
  .credentials-title {
    font-size: clamp(16px, 2.5vw, 18px);
    font-weight: 600;
    color: #0EA5E9;
    margin: 0 0 clamp(12px, 2vw, 16px) 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .credential-item {
    background: rgba(255, 255, 255, 0.5);
    padding: clamp(10px, 2vw, 16px);
    border-radius: 12px;
    margin: 8px 0;
    border: 1px solid rgba(16, 185, 129, 0.1);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
  }
  .credential-label {
    font-size: clamp(12px, 2vw, 14px);
    color: #666;
    margin-bottom: 4px;
  }
  .credential-value {
    font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, Monaco, monospace;
    font-size: clamp(13px, 2.2vw, 15px);
    color: #0EA5E9;
    word-break: break-all;
  }
  .feature-box {
    background: linear-gradient(
      135deg,
      rgba(16, 185, 129, 0.05),
      rgba(99, 102, 241, 0.05)
    );
    padding: clamp(24px, 4vw, 32px);
    border-radius: 20px;
    margin: clamp(24px, 4vw, 32px) 0;
    border: 1px solid rgba(16, 185, 129, 0.15);
  }
  .feature-title {
    font-size: clamp(18px, 3vw, 20px);
    font-weight: 600;
    color: #0EA5E9;
    margin: 0 0 clamp(16px, 3vw, 20px) 0;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .feature-list {
    list-style-type: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: clamp(12px, 2vw, 16px);
  }
  .feature-list li {
    padding-left: clamp(28px, 4vw, 32px);
    position: relative;
    display: flex;
    align-items: center;
  }
  .feature-list li::before {
    content: '';
    position: absolute;
    left: 0;
    width: clamp(18px, 2.5vw, 20px);
    height: clamp(18px, 2.5vw, 20px);
    background: linear-gradient(
      135deg,
      #10B981,
      #0EA5E9
    );
    border-radius: 50%;
  }
  .feature-list li::after {
    content: '✓';
    position: absolute;
    left: clamp(4px, 0.8vw, 5px);
    color: white;
    font-size: clamp(11px, 1.8vw, 12px);
    font-weight: bold;
  }
  @media (prefers-color-scheme: dark) {
    body {
      background: #0a0a0a;
      color: #fff;
    }
    .card {
      background: rgba(30, 30, 30, 0.95);
      border-color: rgba(255, 255, 255, 0.1);
    }
    .header {
      background: linear-gradient(
        135deg,
        rgba(16, 185, 129, 0.12),
        rgba(99, 102, 241, 0.12)
      );
      border-color: rgba(16, 185, 129, 0.2);
    }
    .subtitle {
      color: #aaa;
    }
    .link-box {
      background: rgba(16, 185, 129, 0.1);
      border-color: rgba(16, 185, 129, 0.2);
      color: #10B981;
    }
    .link-box::before {
      background: #1e1e1e;
    }
    .warning-box {
      background: rgba(99, 102, 241, 0.1);
      border-color: rgba(99, 102, 241, 0.2);
    }
    .support-box {
      background: linear-gradient(
        135deg,
        rgba(16, 185, 129, 0.1),
        rgba(99, 102, 241, 0.1)
      );
      border-color: rgba(16, 185, 129, 0.2);
    }
    .footer {
      color: #aaa;
      border-color: rgba(255, 255, 255, 0.1);
    }
    .social-links a {
      background: rgba(14, 165, 233, 0.15);
      color: #10B981;
    }
    .social-links a:hover {
      background: rgba(14, 165, 233, 0.25);
    }
    .credentials-box {
      background: rgba(16, 185, 129, 0.1);
      border-color: rgba(16, 185, 129, 0.2);
    }
    .credential-item {
      background: rgba(30, 30, 30, 0.8);
      border-color: rgba(16, 185, 129, 0.2);
    }
    .credential-label {
      color: #aaa;
    }
    .credential-value {
      color: #10B981;
    }
    .feature-box {
      background: linear-gradient(
        135deg,
        rgba(16, 185, 129, 0.1),
        rgba(99, 102, 241, 0.1)
      );
      border-color: rgba(16, 185, 129, 0.2);
    }
  }
  @media (max-width: 480px) {
    .container {
      padding: 16px;
    }
    .card {
      padding: 20px;
      border-radius: 20px;
    }
    .header {
      padding: 20px;
      margin-bottom: 20px;
    }
    .warning-box {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
    .social-links {
      flex-direction: column;
      align-items: stretch;
    }
    .social-links a {
      text-align: center;
    }
    .credentials-box,
    .feature-box {
      padding: 16px;
      border-radius: 16px;
    }
    .feature-list {
      gap: 10px;
    }
    .feature-list li {
      padding-left: 26px;
    }
    .feature-list li::before {
      width: 16px;
      height: 16px;
    }
    .feature-list li::after {
      left: 3px;
      font-size: 10px;
    }
  }
`;
