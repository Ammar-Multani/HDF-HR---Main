import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// Environment variables
const NODE_ENV = Deno.env.get("NODE_ENV") || "production";
const SENDGRID_API_KEY = Deno.env.get("SENDGRID_API_KEY") || "";
const FROM_EMAIL = Deno.env.get("SENDGRID_FROM_EMAIL") || "";
const FROM_NAME = Deno.env.get("SENDGRID_FROM_NAME") || "";

// Mailtrap credentials
const MAILTRAP_HOST = Deno.env.get("MAILTRAP_HOST") || "";
const MAILTRAP_PORT = parseInt(Deno.env.get("MAILTRAP_PORT") || "2525");
const MAILTRAP_USER = Deno.env.get("MAILTRAP_USER") || "";
const MAILTRAP_PASS = Deno.env.get("MAILTRAP_PASS") || "";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function sendWithMailtrap(
  to: string,
  subject: string,
  html: string,
  text: string
) {
  // Use Mailtrap's API instead of SMTP for Edge Function compatibility
  const message = {
    from: {
      email: FROM_EMAIL,
      name: FROM_NAME,
    },
    to: [
      {
        email: to,
      },
    ],
    subject: subject,
    html: html,
    text: text,
    category: "Welcome Email",
  };

  // Note: Replace 3772478 with your inbox ID from the Mailtrap API URL
  const response = await fetch(
    "https://sandbox.api.mailtrap.io/api/send/3772478",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MAILTRAP_PASS}`,
      },
      body: JSON.stringify(message),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mailtrap API error: ${errorText}`);
  }

  return response;
}

async function sendWithSendGrid(
  to: string,
  subject: string,
  html: string,
  text: string
) {
  if (!SENDGRID_API_KEY) {
    console.error("SendGrid API key is missing");
    throw new Error("SendGrid API key is not configured");
  }

  if (!FROM_EMAIL || !FROM_NAME) {
    console.error("SendGrid sender details missing:", {
      FROM_EMAIL,
      FROM_NAME,
    });
    throw new Error("SendGrid sender details are not configured");
  }

  const data = {
    personalizations: [
      {
        to: [{ email: to }],
      },
    ],
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

  console.log("Sending with SendGrid:", {
    to,
    from: FROM_EMAIL,
    fromName: FROM_NAME,
    subject,
    apiKeyLength: SENDGRID_API_KEY.length,
  });

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SENDGRID_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    console.log("SendGrid API response status:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SendGrid API error response:", {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: errorText,
      });
      throw new Error(`SendGrid API error: ${errorText}`);
    }

    return response;
  } catch (error) {
    console.error("SendGrid request failed:", error);
    throw error;
  }
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

    // Get and validate request body
    let body;
    try {
      body = await req.json();
      console.log("Received request body:", body);
    } catch (e) {
      console.error("Failed to parse request body:", e);
      throw new Error("Invalid request body");
    }

    const { to, subject, html, text } = body;

    // Validate required fields
    if (!to) throw new Error("Recipient email is required");
    if (!subject) throw new Error("Email subject is required");
    if (!html && !text)
      throw new Error("Email content (html or text) is required");

    console.log("Sending email with data:", {
      to,
      from: FROM_EMAIL,
      subject,
      contentLength: {
        text: text?.length || 0,
        html: html?.length || 0,
      },
      environment: NODE_ENV,
    });

    // Send email based on environment
    let response;
    if (NODE_ENV === "development") {
      // Verify Mailtrap configuration
      if (!MAILTRAP_HOST || !MAILTRAP_USER || !MAILTRAP_PASS) {
        console.error("Mailtrap configuration missing");
        throw new Error("Mailtrap is not properly configured");
      }
      response = await sendWithMailtrap(to, subject, html, text);
    } else {
      // Verify SendGrid configuration
      if (!SENDGRID_API_KEY || !FROM_EMAIL || !FROM_NAME) {
        console.error("SendGrid configuration missing");
        throw new Error("SendGrid is not properly configured");
      }
      response = await sendWithSendGrid(to, subject, html, text);
    }

    return new Response(
      JSON.stringify({
        success: true,
        environment: NODE_ENV,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Function error:", error.message);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack,
        environment: NODE_ENV,
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
