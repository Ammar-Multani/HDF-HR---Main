import {
  generatePasswordResetEmail,
  generateAdminInviteEmail,
  generateSuperAdminWelcomeEmail,
} from "./emailTemplates";
import { getEmailConfig } from "./emailConfig";
import nodemailer from "nodemailer";

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 3600000; // 1 hour in milliseconds
const MAX_ATTEMPTS = 4; // Maximum password reset attempts per hour

// Store for rate limiting
const resetAttempts = new Map<string, { count: number; timestamp: number }>();

/**
 * Send email using the appropriate service based on environment
 */
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  text: string
) {
  const config = getEmailConfig();
  const isDevelopment = process.env.EXPO_PUBLIC_NODE_ENV === "development";

  if (isDevelopment) {
    // Use Mailtrap for development
    const transporter = nodemailer.createTransport(config.transport);

    try {
      const info = await transporter.sendMail({
        from: config.from,
        to,
        subject,
        html,
        text,
      });

      console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
      return { success: true };
    } catch (error) {
      console.error("Mailtrap send error:", error);
      return {
        success: false,
        error: new Error("Failed to send email through Mailtrap"),
      };
    }
  } else {
    // Use Supabase for production
    try {
      const response = await fetch(config.transport.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...config.transport.headers,
        },
        body: JSON.stringify({
          to,
          subject,
          html,
          text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to send email: ${errorText}`);
      }

      const result = await response.json();
      return { success: result.success, error: result.error };
    } catch (error) {
      console.error("Supabase send error:", error);
      return {
        success: false,
        error: new Error("Failed to send email through Supabase"),
      };
    }
  }
}

/**
 * Initialize email service
 */
export const initEmailService = () => {
  console.log("Email service initialized");
  // Clear rate limiting data periodically
  setInterval(() => {
    const now = Date.now();
    for (const [email, data] of resetAttempts.entries()) {
      if (now - data.timestamp > RATE_LIMIT_WINDOW) {
        resetAttempts.delete(email);
      }
    }
  }, RATE_LIMIT_WINDOW);
};

/**
 * Check if an email has exceeded rate limits for password reset
 * @param email The email address to check
 * @returns boolean indicating if rate limit is exceeded
 */
const checkRateLimit = (email: string): boolean => {
  const now = Date.now();
  const attempts = resetAttempts.get(email);

  if (!attempts) {
    resetAttempts.set(email, { count: 1, timestamp: now });
    return false;
  }

  if (now - attempts.timestamp > RATE_LIMIT_WINDOW) {
    // Reset if window has passed
    resetAttempts.set(email, { count: 1, timestamp: now });
    return false;
  }

  if (attempts.count >= MAX_ATTEMPTS) {
    return true;
  }

  // Increment attempt count
  resetAttempts.set(email, {
    count: attempts.count + 1,
    timestamp: attempts.timestamp,
  });
  return false;
};

/**
 * Send a password reset email
 */
export const sendPasswordResetEmail = async (
  email: string,
  resetToken: string
) => {
  try {
    console.log("Starting password reset email process for:", email);

    // Check rate limiting
    if (checkRateLimit(email)) {
      console.log("Rate limit exceeded for:", email);
      return {
        success: false,
        error: new Error("Too many reset attempts. Please try again later."),
      };
    }

    const resetLink = `${process.env.EXPO_PUBLIC_APP_URL || "https://hdfhr.netlify.app"}/reset-password?token=${resetToken}`;
    const htmlContent = generatePasswordResetEmail(resetToken);
    const textContent = `Reset your password by clicking this link: ${resetLink}. This link will expire in 1 hour.`;

    return await sendEmail(
      email,
      "Reset Your Password - HDF HR",
      htmlContent,
      textContent
    );
  } catch (err) {
    const error = err as Error;
    console.error("Error in sendPasswordResetEmail:", {
      message: error.message,
      error,
    });
    return {
      success: false,
      error: new Error("An unexpected error occurred. Please try again."),
    };
  }
};

/**
 * Send an invitation email to a new company admin
 */
export const sendCompanyAdminInviteEmail = async (
  email: string,
  password: string,
  companyName: string
) => {
  try {
    console.log("Starting company admin invitation email process for:", email);

    const htmlContent = generateAdminInviteEmail(email, password, companyName);
    const textContent =
      `Welcome to ${companyName} on HDF HR!\n\n` +
      `Your admin account has been created with the following credentials:\n\n` +
      `Email: ${email}\n` +
      `Temporary Password: ${password}\n\n` +
      `Please log in at: ${process.env.EXPO_PUBLIC_APP_URL || "https://hdfhr.netlify.app"}/login\n\n` +
      `IMPORTANT: Change your password immediately after logging in. ` +
      `This temporary password will expire in 7 days.\n\n` +
      `Need help? Contact us at ${process.env.EXPO_PUBLIC_SENDGRID_FROM_EMAIL}`;

    return await sendEmail(
      email,
      `Welcome to ${companyName} on HDF HR - Your Admin Account`,
      htmlContent,
      textContent
    );
  } catch (err) {
    const error = err as Error;
    console.error("Error in sendCompanyAdminInviteEmail:", {
      message: error.message,
      error,
    });
    return {
      success: false,
      error: new Error(
        "An unexpected error occurred while sending the invitation email. Please try again."
      ),
    };
  }
};

/**
 * Send a welcome email to a new super admin
 */
export const sendSuperAdminWelcomeEmail = async (
  name: string,
  email: string,
  password: string
) => {
  try {
    console.log("Starting super admin welcome email process for:", email);

    const htmlContent = generateSuperAdminWelcomeEmail(name, email, password);
    const textContent =
      `Welcome to HDF HR!\n\n` +
      `Hello ${name},\n\n` +
      `You've been granted Super Admin access to the HDF HR platform. Here are your login credentials:\n\n` +
      `Email: ${email}\n` +
      `Initial Password: ${password}\n\n` +
      `Please log in at: ${process.env.EXPO_PUBLIC_APP_URL || "https://hdfhr.netlify.app"}/login\n\n` +
      `IMPORTANT: Change your password immediately after logging in. ` +
      `Your initial password will expire in 7 days.\n\n` +
      `Need help? Contact us at ${process.env.EXPO_PUBLIC_SENDGRID_FROM_EMAIL}`;

    return await sendEmail(
      email,
      "Welcome to HDF HR - Your Super Admin Account",
      htmlContent,
      textContent
    );
  } catch (err) {
    const error = err as Error;
    console.error("Error in sendSuperAdminWelcomeEmail:", {
      message: error.message,
      error,
    });
    return {
      success: false,
      error: new Error(
        "An unexpected error occurred while sending the welcome email. Please try again."
      ),
    };
  }
};
