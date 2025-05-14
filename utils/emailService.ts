import { generatePasswordResetEmail } from './emailTemplates';

// Your SendGrid API Key
const SENDGRID_API_KEY = '';
// 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
// The sender email details
const FROM_EMAIL = 'aamultani@outlook.com';
const FROM_NAME = 'HDF HR System';

/**
 * Initialize email service
 */
export const initEmailService = () => {
  console.log('SendGrid email service ready');
};

/**
 * Send a password reset email using SendGrid's v3 API directly
 * This approach works in React Native by avoiding the Node.js package
 * 
 * @param email The recipient's email address
 * @param resetToken The password reset token
 * @returns Promise with the result of the operation
 */
export const sendPasswordResetEmail = async (email: string, resetToken: string) => {
  try {
    // Create reset link with token
    const resetLink = `hdf-hr://reset-password?token=${resetToken}`;
    
    // Generate HTML content
    const htmlContent = generatePasswordResetEmail(resetToken);
    
    // Plain text version
    const textContent = `Reset your password by clicking this link: ${resetLink}. This link will expire in 1 hour.`;
    
    // Prepare request data for SendGrid V3 API
    const data = {
      personalizations: [
        {
          to: [{ email }],
          subject: "Reset Your Password - HDF HR"
        }
      ],
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME
      },
      content: [
        {
          type: "text/plain",
          value: textContent
        },
        {
          type: "text/html",
          value: htmlContent
        }
      ]
    };
    
    // Make API request to SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SENDGRID_API_KEY}`
      },
      body: JSON.stringify(data)
    });
    
    if (response.ok || response.status === 202) {
      console.log('Password reset email sent successfully via SendGrid API');
      return { success: true };
    } else {
      const errorData = await response.text();
      console.error('Failed to send password reset email:', errorData);
      return { success: false, error: errorData || 'Failed to send email' };
    }
  } catch (error) {
    console.error('Error sending password reset email:', error);
    return { success: false, error };
  }
}; 