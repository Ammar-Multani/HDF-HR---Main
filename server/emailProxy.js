const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

app.post("/send-email", async (req, res) => {
  try {
    const { to, from, subject, html, text } = req.body;

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
          "Api-Token": process.env.MAILTRAP_API_TOKEN,
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
      res.status(500).json({
        error: `Failed to send email via Mailtrap: ${result.message || "Unknown error"}`,
      });
      return;
    }

    console.log("✅ Email sent successfully:", {
      to,
      messageId: result.message_id,
    });

    res.json({
      success: true,
      messageId: result.message_id,
    });
  } catch (error) {
    console.error("❌ Error sending email:", error);
    res.status(500).json({
      error: error.message || "Internal server error",
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Email proxy server running on port ${PORT}`);
});
