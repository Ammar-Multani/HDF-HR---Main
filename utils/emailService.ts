import { generatePasswordResetEmail } from "./emailTemplates";
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

    // Create reset link with token
    const resetLink = `hdf-hr://reset-password?token=${resetToken}`;
    console.log("Reset link generated:", resetLink);

    // Generate HTML content
    const htmlContent = generatePasswordResetEmail(resetToken);

    // Plain text version
    const textContent = `Reset your password by clicking this link: ${resetLink}. This link will expire in 1 hour.`;

    const requestBody = {
      to: email,
      subject: "Reset Your Password - HDF HR",
      html: htmlContent,
      text: textContent,
    };

    console.log("Preparing Edge Function request with data:", {
      to: email,
      subject: "Reset Your Password - HDF HR",
      contentLength: {
        html: htmlContent.length,
        text: textContent.length,
      },
    });

    // Call our Supabase Edge Function
    const { data, error } = await supabase.functions.invoke("send-email", {
      method: "POST",
      body: JSON.stringify(requestBody),
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("Edge Function response:", { data, error });

    if (error) {
      console.error("Supabase Edge Function error:", {
        message: error.message,
        name: error.name,
        details: error,
      });

      // Check for specific error types
      if (error.message?.includes("Failed to send a request")) {
        return {
          success: false,
          error: new Error(
            "Unable to connect to email service. Please try again later."
          ),
        };
      }

      if (error.message?.includes("non-2xx status code")) {
        return {
          success: false,
          error: new Error(
            "Email service configuration error. Please contact support."
          ),
        };
      }

      return { success: false, error };
    }

    if (!data?.success) {
      console.error("Email service error:", data);
      return {
        success: false,
        error: new Error(
          data?.error || "Failed to send email. Please try again later."
        ),
      };
    }

    console.log("Password reset email sent successfully to:", email);
    return { success: true };
  } catch (err) {
    const error = err as Error;
    console.error("Error in sendPasswordResetEmail:", {
      message: error.message,
      stack: error.stack,
      error,
    });
    return {
      success: false,
      error: new Error("An unexpected error occurred. Please try again."),
    };
  }
};
