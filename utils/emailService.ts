import {
  generatePasswordResetEmail,
  generateAdminInviteEmail,
  generateSuperAdminWelcomeEmail,
} from "./emailTemplates";
import { supabase } from "../lib/supabase";

/**
 * Initialize email service
 */
export const initEmailService = () => {
  console.log("Email service initialized");
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

    // Create reset link with token using the Netlify domain
    const resetLink = `https://hdfhr.netlify.app/reset-password?token=${resetToken}`;
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

    // Get the function URL from Supabase project
    const functionUrl =
      "https://rvbcezyxmlwpqpugslvg.supabase.co/functions/v1/send-email";

    console.log("Preparing request to:", functionUrl);
    console.log("Request body:", JSON.stringify(body, null, 2));

    // Make the request directly using fetch
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2YmNlenl4bWx3cHFwdWdzbHZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyMDAxNzksImV4cCI6MjA2Mjc3NjE3OX0.XK1SFE0QcDpkZxWV4GvQmGF2IrZKd9XOOEY1EMgrWfw",
        Origin: "https://hdfhr.netlify.app",
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
      `Please log in at: https://hdfhr.netlify.app/login\n\n` +
      `IMPORTANT: Change your password immediately after logging in. ` +
      `This temporary password will expire in 7 days.\n\n` +
      `Need help? Contact us at info@hdf.ch`;

    // Create the request body
    const body = {
      to: email,
      subject: `Welcome to ${companyName} on HDF HR - Your Admin Account`,
      html: htmlContent,
      text: textContent,
    };

    // Get the function URL from Supabase project
    const functionUrl =
      "https://rvbcezyxmlwpqpugslvg.supabase.co/functions/v1/send-email";

    console.log("Preparing request to:", functionUrl);
    console.log("Request body length:", {
      html: htmlContent.length,
      text: textContent.length,
    });

    // Make the request directly using fetch
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2YmNlenl4bWx3cHFwdWdzbHZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyMDAxNzksImV4cCI6MjA2Mjc3NjE3OX0.XK1SFE0QcDpkZxWV4GvQmGF2IrZKd9XOOEY1EMgrWfw",
        Origin: "https://hdfhr.netlify.app",
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
      `Please log in at: https://hdfhr.netlify.app/login\n\n` +
      `IMPORTANT: Change your password immediately after logging in. ` +
      `Your initial password will expire in 7 days.\n\n` +
      `Need help? Contact us at info@hdf.ch`;

    // Create the request body
    const body = {
      to: email,
      subject: "Welcome to HDF HR - Your Super Admin Account",
      html: htmlContent,
      text: textContent,
    };

    // Get the function URL from Supabase project
    const functionUrl =
      "https://rvbcezyxmlwpqpugslvg.supabase.co/functions/v1/send-email";

    console.log("Preparing request to:", functionUrl);
    console.log("Request body length:", {
      html: htmlContent.length,
      text: textContent.length,
    });

    // Make the request directly using fetch
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization:
          "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2YmNlenl4bWx3cHFwdWdzbHZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyMDAxNzksImV4cCI6MjA2Mjc3NjE3OX0.XK1SFE0QcDpkZxWV4GvQmGF2IrZKd9XOOEY1EMgrWfw",
        Origin: "https://hdfhr.netlify.app",
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
