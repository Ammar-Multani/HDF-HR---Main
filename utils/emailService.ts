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

    // Create the request body
    const body = {
      to: email,
      subject: "Reset Your Password - HDF HR",
      html: htmlContent,
      text: textContent,
    };

    // Get the anon key from Supabase client
    const anonKey = supabase.supabaseKey;
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

    if (!anonKey || !supabaseUrl) {
      console.error("Missing Supabase configuration");
      return {
        success: false,
        error: new Error(
          "Application configuration error. Please contact support."
        ),
      };
    }

    const functionUrl = `${supabaseUrl}/functions/v1/send-email`;

    console.log("Preparing request to:", functionUrl);
    console.log("Request body:", JSON.stringify(body, null, 2));

    // Make the request directly using fetch
    const response = await fetch(functionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${anonKey}`,
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
