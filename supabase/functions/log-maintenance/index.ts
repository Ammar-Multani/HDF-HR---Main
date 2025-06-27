import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const logDebug = (...args: unknown[]) => {
  const env = Deno.env.get("NODE_ENV") || "production";
  if (env !== "production") {
    console.log(...args);
  }
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

// Function to check if logs count exceeds threshold
async function checkLogsCount(
  supabaseClient: any,
  tableName: string,
  threshold: number
) {
  const { count, error } = await supabaseClient
    .from(tableName)
    .select("*", { count: "exact", head: true });

  if (error) {
    throw error;
  }

  return count > threshold;
}

// Function to archive logs
async function archiveLogs(
  supabaseClient: any,
  olderThanDate: Date,
  systemUserId: string
) {
  // First, copy old logs to archive
  const { data: archivedLogs, error: archiveError } = await supabaseClient
    .from("activity_logs")
    .select("*")
    .lt("created_at", olderThanDate.toISOString());

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
      .lt("created_at", olderThanDate.toISOString());

    if (deleteError) {
      throw deleteError;
    }

    // Log the maintenance activity using system user ID
    const { error: logError } = await supabaseClient
      .from("activity_logs")
      .insert({
        user_id: systemUserId,
        activity_type: "SYSTEM_MAINTENANCE",
        description: "Automated log maintenance completed by system",
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

    return archivedLogs.length;
  }

  return 0;
}

// Function to handle overflow logs
async function handleOverflowLogs(
  supabaseClient: any,
  tableName: string,
  threshold: number,
  systemUserId: string
) {
  const { count, error: countError } = await supabaseClient
    .from(tableName)
    .select("*", { count: "exact", head: true });

  if (countError) {
    throw countError;
  }

  if (count <= threshold) {
    return 0;
  }

  // Calculate how many logs to archive (oldest logs)
  const overflowCount = count - threshold + 100; // Archive extra 100 to avoid frequent maintenance

  // Get the date of the Nth oldest log
  const { data: oldestLogs, error: oldestError } = await supabaseClient
    .from(tableName)
    .select("created_at")
    .order("created_at", { ascending: true })
    .limit(overflowCount);

  if (oldestError) {
    throw oldestError;
  }

  if (!oldestLogs || oldestLogs.length === 0) {
    return 0;
  }

  const cutoffDate = new Date(oldestLogs[oldestLogs.length - 1].created_at);

  if (tableName === "activity_logs") {
    // Archive logs older than cutoff date
    return await archiveLogs(supabaseClient, cutoffDate, systemUserId);
  } else if (tableName === "activity_logs_archive") {
    // Delete logs from archive that are older than cutoff date
    const { data: deletedLogs, error: deleteError } = await supabaseClient
      .from("activity_logs_archive")
      .delete()
      .lt("created_at", cutoffDate.toISOString())
      .select();

    if (deleteError) {
      throw deleteError;
    }

    return deletedLogs?.length || 0;
  }

  return 0;
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
    logDebug("Using system user ID:", systemUserId);

    // Archive logs older than 3 months
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const archivedCount = await archiveLogs(
      supabaseClient,
      threeMonthsAgo,
      systemUserId
    );

    // Check if logs count exceeds threshold and handle overflow
    const mainTableThreshold = 700;
    const archiveTableThreshold = 1000;

    const mainTableOverflowCount = await handleOverflowLogs(
      supabaseClient,
      "activity_logs",
      mainTableThreshold,
      systemUserId
    );

    const archiveTableOverflowCount = await handleOverflowLogs(
      supabaseClient,
      "activity_logs_archive",
      archiveTableThreshold,
      systemUserId
    );

    // Delete logs from archive that are older than 1 year
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const { data: deletedOldLogs, error: deleteOldError } = await supabaseClient
      .from("activity_logs_archive")
      .delete()
      .lt("created_at", oneYearAgo.toISOString())
      .select();

    if (deleteOldError) {
      throw deleteOldError;
    }

    // Log the final maintenance summary
    const { error: summaryLogError } = await supabaseClient
      .from("activity_logs")
      .insert({
        user_id: systemUserId,
        activity_type: "SYSTEM_MAINTENANCE",
        description: "Log maintenance summary",
        metadata: {
          time_based_archived_count: archivedCount,
          main_table_overflow_archived: mainTableOverflowCount,
          archive_table_overflow_deleted: archiveTableOverflowCount,
          old_archive_deleted_count: deletedOldLogs?.length || 0,
          maintenance_date: new Date().toISOString(),
        },
      });

    if (summaryLogError) {
      console.error("Error logging maintenance summary:", summaryLogError);
    }

    return new Response(
      JSON.stringify({
        message: "Log maintenance completed successfully",
        time_based_archived_count: archivedCount,
        main_table_overflow_archived: mainTableOverflowCount,
        archive_table_overflow_deleted: archiveTableOverflowCount,
        old_archive_deleted_count: deletedOldLogs?.length || 0,
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
