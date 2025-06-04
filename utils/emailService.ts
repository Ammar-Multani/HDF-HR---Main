import {
  generatePasswordResetEmail,
  generateAdminInviteEmail,
  generateSuperAdminWelcomeEmail,
} from "./emailTemplates";
import { supabase } from "../lib/supabase";

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 3600000; // 1 hour in milliseconds
const MAX_ATTEMPTS = 4; // Maximum password reset attempts per hour

// Store for rate limiting
const resetAttempts = new Map<string, { count: number; timestamp: number }>();

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
 * Send a password reset email using Supabase Edge Function
 *
 * @param email The recipient's email address
 * @param resetToken The password reset token
 * @returns Promise with the result of the operation
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

    // Create reset link with token using the Netlify domain
    const resetLink = `${process.env.EXPO_PUBLIC_APP_URL || "https://hdfhr.netlify.app"}/reset-password?token=${resetToken}`;
    console.log("Reset link generated:", resetLink);

    // Generate HTML content
    const htmlContent = generatePasswordResetEmail(resetToken);

    // Plain text version
    const textContent = `Reset your password by clicking this link: ${resetLink}. This link will expire in 1 hour.`;

    // Create the request body
    const body = {
      to: email,
      subject: "Reset Your Password - HDF HR",
      html: htmlContent,
      text: textContent,
    };

    // Get the function URL from environment variable
    const functionUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-email`;

    console.log("Preparing request to:", functionUrl);
    console.log("Request body:", JSON.stringify(body, null, 2));

    // Make the request directly using fetch with environment variables
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        Origin: process.env.EXPO_PUBLIC_APP_URL || "https://hdfhr.netlify.app",
      },
      body: JSON.stringify(body),
    });

    console.log("Response status:", response.status);
    console.log(
      "Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });

      return {
        success: false,
        error: new Error(`Failed to send email: ${response.statusText}`),
      };
    }

    const result = await response.json();
    console.log("Success response:", result);

    if (!result.success) {
      return {
        success: false,
        error: new Error(result.error || "Failed to send email"),
      };
    }

    console.log("Password reset email sent successfully to:", email);
    return { success: true };
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
 *
 * @param email The admin's email address
 * @param password The admin's temporary password
 * @param companyName The company name
 * @returns Promise with the result of the operation
 */
export const sendCompanyAdminInviteEmail = async (
  email: string,
  password: string,
  companyName: string
) => {
  try {
    console.log("Starting company admin invitation email process for:", email);

    // Generate HTML content
    const htmlContent = generateAdminInviteEmail(email, password, companyName);

    // Plain text version
    const textContent =
      `Welcome to ${companyName} on HDF HR!\n\n` +
      `Your admin account has been created with the following credentials:\n\n` +
      `Email: ${email}\n` +
      `Temporary Password: ${password}\n\n` +
      `Please log in at: ${process.env.EXPO_PUBLIC_APP_URL || "https://hdfhr.netlify.app"}/login\n\n` +
      `IMPORTANT: Change your password immediately after logging in. ` +
      `This temporary password will expire in 7 days.\n\n` +
      `Need help? Contact us at ${process.env.EXPO_PUBLIC_SENDGRID_FROM_EMAIL || "info@hdf.ch"}`;

    // Create the request body
    const body = {
      to: email,
      subject: `Welcome to ${companyName} on HDF HR - Your Admin Account`,
      html: htmlContent,
      text: textContent,
    };

    // Get the function URL from environment variable
    const functionUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-email`;

    console.log("Preparing request to:", functionUrl);
    console.log("Request body length:", {
      html: htmlContent.length,
      text: textContent.length,
    });

    // Make the request directly using fetch with environment variables
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        Origin: process.env.EXPO_PUBLIC_APP_URL || "https://hdfhr.netlify.app",
      },
      body: JSON.stringify(body),
    });

    console.log("Response status:", response.status);
    console.log(
      "Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });

      return {
        success: false,
        error: new Error(
          `Failed to send invitation email: ${response.statusText}`
        ),
      };
    }

    const result = await response.json();
    console.log("Success response:", result);

    if (!result.success) {
      return {
        success: false,
        error: new Error(result.error || "Failed to send invitation email"),
      };
    }

    console.log("Company admin invitation email sent successfully to:", email);
    return { success: true };
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
 *
 * @param name The admin's name
 * @param email The admin's email
 * @param password The admin's initial password
 * @returns Promise with the result of the operation
 */
export const sendSuperAdminWelcomeEmail = async (
  name: string,
  email: string,
  password: string
) => {
  try {
    console.log("Starting super admin welcome email process for:", email);

    // Generate HTML content
    const htmlContent = generateSuperAdminWelcomeEmail(name, email, password);

    // Plain text version
    const textContent =
      `Welcome to HDF HR!\n\n` +
      `Hello ${name},\n\n` +
      `You've been granted Super Admin access to the HDF HR platform. Here are your login credentials:\n\n` +
      `Email: ${email}\n` +
      `Initial Password: ${password}\n\n` +
      `Please log in at: ${process.env.EXPO_PUBLIC_APP_URL || "https://hdfhr.netlify.app"}/login\n\n` +
      `IMPORTANT: Change your password immediately after logging in. ` +
      `Your initial password will expire in 7 days.\n\n` +
      `Need help? Contact us at ${process.env.EXPO_PUBLIC_SENDGRID_FROM_EMAIL || "info@hdf.ch"}`;

    // Create the request body
    const body = {
      to: email,
      subject: "Welcome to HDF HR - Your Super Admin Account",
      html: htmlContent,
      text: textContent,
    };

    // Get the function URL from environment variable
    const functionUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-email`;

    console.log("Preparing request to:", functionUrl);
    console.log("Request body length:", {
      html: htmlContent.length,
      text: textContent.length,
    });

    // Make the request directly using fetch with environment variables
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        Origin: process.env.EXPO_PUBLIC_APP_URL || "https://hdfhr.netlify.app",
      },
      body: JSON.stringify(body),
    });

    console.log("Response status:", response.status);
    console.log(
      "Response headers:",
      Object.fromEntries(response.headers.entries())
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error response:", {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });

      return {
        success: false,
        error: new Error(
          `Failed to send welcome email: ${response.statusText}`
        ),
      };
    }

    const result = await response.json();
    console.log("Success response:", result);

    if (!result.success) {
      return {
        success: false,
        error: new Error(result.error || "Failed to send welcome email"),
      };
    }

    console.log("Super admin welcome email sent successfully to:", email);
    return { success: true };
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
