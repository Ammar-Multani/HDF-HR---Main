import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Function to get system user
async function getSystemUser(supabaseClient: any) {
  const systemEmail = "system@maintenance.internal";

  // Get existing system user
  const { data: systemUser, error: fetchError } = await supabaseClient
    .from("users")
    .select("id")
    .eq("email", systemEmail)
    .single();

  if (fetchError) {
    throw new Error(
      `System user not found. Please run the create_system_user.sql script first. Error: ${fetchError.message}`
    );
  }

  return systemUser.id;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create a Supabase client with the Auth context of the function
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get system user ID
    const systemUserId = await getSystemUser(supabaseClient);
    console.log("Using system user ID:", systemUserId);

    // Archive logs older than 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // First, copy old logs to archive
    const { data: archivedLogs, error: archiveError } = await supabaseClient
      .from("activity_logs")
      .select("*")
      .lt("created_at", sixMonthsAgo.toISOString());

    if (archiveError) {
      throw archiveError;
    }

    if (archivedLogs && archivedLogs.length > 0) {
      // Add archived_at timestamp to each log
      const logsWithArchiveDate = archivedLogs.map((log) => ({
        ...log,
        archived_at: new Date().toISOString(),
      }));

      // Insert into archive table
      const { error: insertError } = await supabaseClient
        .from("activity_logs_archive")
        .insert(logsWithArchiveDate);

      if (insertError) {
        throw insertError;
      }

      // Delete archived logs from original table
      const { error: deleteError } = await supabaseClient
        .from("activity_logs")
        .delete()
        .lt("created_at", sixMonthsAgo.toISOString());

      if (deleteError) {
        throw deleteError;
      }
    }

    // Delete logs from archive that are older than 1 year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const { error: deleteOldError } = await supabaseClient
      .from("activity_logs_archive")
      .delete()
      .lt("created_at", oneYearAgo.toISOString());

    if (deleteOldError) {
      throw deleteOldError;
    }

    // Log the maintenance activity using system user ID
    const { error: logError } = await supabaseClient
      .from("activity_logs")
      .insert({
        user_id: systemUserId,
        activity_type: "SYSTEM_MAINTENANCE",
        description: "Automated log maintenance completed",
        metadata: {
          archived_count: archivedLogs?.length || 0,
          archive_date: new Date().toISOString(),
          maintenance_type: "log_archival_and_deletion",
        },
      });

    if (logError) {
      console.error("Error logging maintenance activity:", logError);
      throw logError;
    }

    return new Response(
      JSON.stringify({
        message: "Log maintenance completed successfully",
        archived_count: archivedLogs?.length || 0,
        system_user_id: systemUserId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Function error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
