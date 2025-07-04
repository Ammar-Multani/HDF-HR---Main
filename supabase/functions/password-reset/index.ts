import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

// Initialize Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function handlePasswordReset(token: string, newPassword: string) {
  try {
    // First, get the email from our custom tokens table
    const { data: tokenData, error: tokenError } = await supabase
      .from("password_reset_tokens")
      .select("email, used, expires_at")
      .eq("token", token)
      .single();

    if (tokenError || !tokenData?.email) {
      throw new Error("Invalid reset token");
    }

    if (tokenData.used) {
      throw new Error("This reset link has already been used");
    }

    // Check if token has expired
    const expiresAt = new Date(tokenData.expires_at);
    const now = new Date();
    const bufferTime = 5 * 60 * 1000; // 5 minutes buffer

    if (expiresAt.getTime() + bufferTime < now.getTime()) {
      throw new Error("This reset link has expired");
    }

    // Find the user by email
    const {
      data: { users },
      error: listError,
    } = await supabase.auth.admin.listUsers();

    if (listError) {
      throw listError;
    }

    const user = users.find(
      (u) => u.email?.toLowerCase() === tokenData.email.toLowerCase()
    );

    if (!user) {
      throw new Error("User not found");
    }

    // Use admin API to update the user's password
    const { data: userData, error: userError } =
      await supabase.auth.admin.updateUserById(user.id, {
        password: newPassword,
      });

    if (userError) {
      throw userError;
    }

    // Mark the token as used
    await supabase
      .from("password_reset_tokens")
      .update({ used: true })
      .eq("token", token);

    return { success: true };
  } catch (error) {
    console.error("Password reset error:", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "An unexpected error occurred",
    };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  try {
    if (req.method !== "POST") {
      throw new Error(`Method ${req.method} not allowed`);
    }

    const { token, password } = await req.json();

    if (!token || !password) {
      throw new Error("Token and password are required");
    }

    const result = await handlePasswordReset(token, password);

    if (!result.success) {
      throw new Error(result.error);
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
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
