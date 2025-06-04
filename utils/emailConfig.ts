import nodemailer from "nodemailer";

interface EmailConfig {
  transport: any;
  from: string;
}

/**
 * Get email configuration based on environment
 * @returns EmailConfig object with transport and from address
 */
export const getEmailConfig = (): EmailConfig => {
  const isDevelopment = process.env.EXPO_PUBLIC_NODE_ENV === "development";

  if (isDevelopment) {
    // Mailtrap configuration for development
    return {
      transport: {
        host: process.env.EXPO_PUBLIC_MAILTRAP_HOST,
        port: parseInt(process.env.EXPO_PUBLIC_MAILTRAP_PORT || "2525"),
        auth: {
          user: process.env.EXPO_PUBLIC_MAILTRAP_USER,
          pass: process.env.EXPO_PUBLIC_MAILTRAP_PASS,
        },
      },
      from: `${process.env.EXPO_PUBLIC_SENDGRID_FROM_NAME} <${process.env.EXPO_PUBLIC_SENDGRID_FROM_EMAIL}>`,
    };
  }

  // Production configuration using Supabase
  return {
    transport: {
      url: `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-email`,
      headers: {
        Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
        Origin: process.env.EXPO_PUBLIC_APP_URL || "https://hdfhr.netlify.app",
      },
    },
    from: `${process.env.EXPO_PUBLIC_SENDGRID_FROM_NAME} <${process.env.EXPO_PUBLIC_SENDGRID_FROM_EMAIL}>`,
  };
};
