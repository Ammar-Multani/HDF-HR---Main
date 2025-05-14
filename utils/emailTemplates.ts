/**
 * Email templates for various notifications
 */

/**
 * Generate a password reset email
 * @param token The reset token
 * @param appUrl The base URL of your application
 * @returns The HTML content for the email
 */
export const generatePasswordResetEmail = (token: string, appUrl: string = 'https://yourdomain.com') => {
  // For mobile apps, use app scheme for direct opening
  const resetLink = `hdf-hr://reset-password?token=${token}`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #2196F3;
          padding: 20px;
          text-align: center;
        }
        .header h1 {
          color: white;
          margin: 0;
        }
        .content {
          padding: 20px;
          background-color: #f9f9f9;
        }
        .button {
          display: inline-block;
          background-color: #2196F3;
          color: white !important;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #666;
          padding: 20px;
        }
        .link-box {
          background-color: #f5f5f5;
          padding: 10px;
          border-radius: 4px;
          word-break: break-all;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>HDF HR</h1>
        </div>
        <div class="content">
          <h2>Reset Your Password</h2>
          <p>We received a request to reset your password. If you didn't make this request, you can safely ignore this email.</p>
          <p>To reset your password, click the button below:</p>
          <div style="text-align: center;">
            <a href="${resetLink}" class="button">Reset Password</a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p class="link-box">${resetLink}</p>
          <p><strong>This link will expire in 1 hour for security reasons.</strong></p>
          <p>If you have any questions, please contact our support at aamultani@outlook.com</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} HDF HR. All rights reserved.</p>
          <p>This is an automated message, please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate a welcome email for new users
 * @param username The user's name or email
 * @param appUrl The base URL of your application
 * @returns The HTML content for the email
 */
export const generateWelcomeEmail = (username: string, appUrl: string = 'https://yourdomain.com') => {
  const loginLink = `${appUrl}/login`;
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to HDF HR</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #2196F3;
          padding: 20px;
          text-align: center;
        }
        .header h1 {
          color: white;
          margin: 0;
        }
        .content {
          padding: 20px;
          background-color: #f9f9f9;
        }
        .button {
          display: inline-block;
          background-color: #2196F3;
          color: white;
          text-decoration: none;
          padding: 10px 20px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          font-size: 12px;
          color: #666;
          padding: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>HDF HR</h1>
        </div>
        <div class="content">
          <h2>Welcome to HDF HR!</h2>
          <p>Hello ${username},</p>
          <p>Thank you for registering with HDF HR. We're excited to have you on board!</p>
          <p>Click the button below to log in to your account:</p>
          <a href="${loginLink}" class="button">Log In</a>
          <p>If you have any questions or need assistance, please contact support.</p>
        </div>
        <div class="footer">
          <p>&copy; ${new Date().getFullYear()} HDF HR. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}; 