"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const functions = require("firebase-functions");
const node_fetch_1 = require("node-fetch");
exports.sendEmail = functions.https.onRequest(async (request, response) => {
    try {
        const { to, from, subject, html, text, mailtrapToken } = request.body;
        console.log("📧 Received email request:", {
            to,
            subject,
            from: from.email,
        });
        // Send email using Mailtrap API
        const mailtrapResponse = await (0, node_fetch_1.default)("https://send.api.mailtrap.io/api/send", {
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
        });
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
    }
    catch (error) {
        console.error("❌ Error sending email:", error);
        response.status(500).json({
            error: error.message || "Internal server error",
        });
    }
});
//# sourceMappingURL=index.js.map