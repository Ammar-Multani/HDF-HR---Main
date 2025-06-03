import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY") || "";
const FROM_EMAIL = Deno.env.get("SENDGRID_FROM_EMAIL") || "";
const FROM_NAME = Deno.env.get("SENDGRID_FROM_NAME") || "";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Headers":
          "*, authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    // Verify request method
    if (req.method !== "POST") {
      throw new Error("Method not allowed");
    }

    // Verify API key is configured
    if (!SENDGRID_API_KEY) {
      console.error("SendGrid API key not configured");
      throw new Error("Email service not properly configured");
    }

    if (!FROM_EMAIL || !FROM_NAME) {
      console.error("Sender email configuration missing");
      throw new Error("Email service not properly configured");
    }

    // Log request headers for debugging
    console.log("Request headers:", Object.fromEntries(req.headers.entries()));

    // Get and validate request body
    let body;
    try {
      body = await req.json();
      console.log("Received request body:", body);
    } catch (e) {
      console.error("Failed to parse request body:", e);
      throw new Error("Invalid request body");
    }

    const { to, subject, html, text }: EmailRequest = body;

    // Validate required fields
    if (!to) {
      throw new Error("Recipient email is required");
    }
    if (!subject) {
      throw new Error("Email subject is required");
    }
    if (!html && !text) {
      throw new Error("Email content (html or text) is required");
    }

    // Prepare email data
    const data = {
      personalizations: [{ to: [{ email: to }] }],
      from: {
        email: FROM_EMAIL,
        name: FROM_NAME,
      },
      subject,
      content: [
        {
          type: "text/plain",
          value: text || "",
        },
        {
          type: "text/html",
          value: html || "",
        },
      ],
    };

    console.log("Sending email with data:", {
      to,
      from: FROM_EMAIL,
      subject,
      contentLength: {
        text: text?.length || 0,
        html: html?.length || 0,
      },
    });

    // Send email via SendGrid
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const responseText = await response.text();
    console.log("SendGrid API response:", {
      status: response.status,
      statusText: response.statusText,
      body: responseText,
    });

    if (!response.ok) {
      throw new Error(`SendGrid API error: ${responseText}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Function error:", error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
