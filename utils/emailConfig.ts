import { Linking } from "react-native";
import qs from "qs";

interface EmailConfig {
  transport: {
    sendMail: (options: {
      to: string;
      subject: string;
      html: string;
      text: string;
      from?: string;
    }) => Promise<any>;
  };
  from: string;
}

const isDevelopment = process.env.NODE_ENV === "development";
console.log("Email environment:", isDevelopment ? "development" : "production");

// Development configuration using Firebase
const developmentConfig: EmailConfig = {
  transport: {
    sendMail: async (mailOptions) => {
      try {
        console.log("📧 Development email request:", {
          to: mailOptions.to,
          subject: mailOptions.subject,
        });

        // Send to Firebase Function endpoint
        const response = await fetch(
          process.env.EXPO_PUBLIC_FIREBASE_EMAIL_FUNCTION_URL || "",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: mailOptions.to,
              from: {
                email: process.env.EXPO_PUBLIC_SENDGRID_FROM_EMAIL,
                name: process.env.EXPO_PUBLIC_SENDGRID_FROM_NAME,
              },
              subject: mailOptions.subject,
              html: mailOptions.html,
              text: mailOptions.text,
              mailtrapToken: process.env.EXPO_PUBLIC_MAILTRAP_API_TOKEN, // Pass token to Firebase
            }),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          console.error("Firebase Function Error:", result);
          throw new Error(
            `Failed to send email via Firebase: ${result.error || "Unknown error"}`
          );
        }

        console.log("📧 Email sent successfully via Firebase:", {
          to: mailOptions.to,
          messageId: result.messageId,
          success: true,
        });

        return {
          success: true,
          result: {
            messageId: result.messageId,
            preview: "Email sent via Firebase Function",
          },
        };
      } catch (error: any) {
        console.error("❌ Development email error:", {
          message: error?.message,
          stack: error?.stack,
        });
        throw error;
      }
    },
  },
  from: `${process.env.EXPO_PUBLIC_SENDGRID_FROM_NAME} <${process.env.EXPO_PUBLIC_SENDGRID_FROM_EMAIL}>`,
};

// Production configuration using SendGrid
const productionConfig: EmailConfig = {
  transport: {
    sendMail: async (mailOptions) => {
      try {
        console.log("📧 Production email request:", {
          to: mailOptions.to,
          subject: mailOptions.subject,
        });

        const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_SENDGRID_API_KEY}`,
          },
          body: JSON.stringify({
            personalizations: [
              {
                to: [{ email: mailOptions.to }],
              },
            ],
            from: {
              email: process.env.EXPO_PUBLIC_SENDGRID_FROM_EMAIL,
              name: process.env.EXPO_PUBLIC_SENDGRID_FROM_NAME,
            },
            subject: mailOptions.subject,
            content: [
              {
                type: "text/html",
                value: mailOptions.html,
              },
            ],
          }),
        });

        if (!response.ok) {
          const errorData = await response.text();
          console.error("SendGrid API Error:", errorData);
          throw new Error("Failed to send email via SendGrid");
        }

        return { success: true };
      } catch (error: any) {
        console.error("❌ Production email error:", {
          message: error?.message,
          stack: error?.stack,
        });
        throw error;
      }
    },
  },
  from: `${process.env.EXPO_PUBLIC_SENDGRID_FROM_NAME} <${process.env.EXPO_PUBLIC_SENDGRID_FROM_EMAIL}>`,
};

// Export the appropriate configuration based on environment
export const emailConfig: EmailConfig = isDevelopment
  ? developmentConfig
  : productionConfig;
