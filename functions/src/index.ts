import * as functions from "firebase-functions";
import fetch from "node-fetch";

interface EmailRequest {
  to: string;
  from: {
    email: string;
    name: string;
  };
  subject: string;
  html: string;
  text: string;
  mailtrapToken: string;
}

export const sendEmail = functions.https.onRequest(
  async (request, response) => {
    try {
      const { to, from, subject, html, text, mailtrapToken } =
        request.body as EmailRequest;

      console.log("📧 Received email request:", {
        to,
        subject,
        from: from.email,
      });

      // Send email using Mailtrap API
      const mailtrapResponse = await fetch(
        "https://send.api.mailtrap.io/api/send",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Api-Token": mailtrapToken,
          },
          body: JSON.stringify({
            from: {
              email: from.email,
              name: from.name,
            },
            to: [{ email: to }],
            subject,
            html,
            text,
          }),
        }
      );

      const result = await mailtrapResponse.json();

      if (!mailtrapResponse.ok) {
        console.error("❌ Mailtrap API Error:", result);
        response.status(500).json({
          error: `Failed to send email via Mailtrap: ${result.message || "Unknown error"}`,
        });
        return;
      }

      console.log("✅ Email sent successfully:", {
        to,
        messageId: result.message_id,
      });

      response.json({
        success: true,
        messageId: result.message_id,
      });
    } catch (error: any) {
      console.error("❌ Error sending email:", error);
      response.status(500).json({
        error: error.message || "Internal server error",
      });
    }
  }
);
