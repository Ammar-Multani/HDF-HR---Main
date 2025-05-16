const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Get Supabase URL and key from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Missing Supabase credentials. Make sure EXPO_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in your .env file."
  );
  process.exit(1);
}

// Create Supabase client with service role key for admin privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyTaskTables() {
  try {
    console.log("Creating task tables in Supabase...");

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, "create-task-tables.sql");
    const sql = fs.readFileSync(sqlFilePath, "utf8");

    // Execute the SQL using Supabase's RPC call
    const { error } = await supabase.rpc("exec_sql", { sql_query: sql });

    if (error) {
      console.error("Error applying SQL:", error);
      return;
    }

    console.log("✅ Task tables created successfully!");
  } catch (error) {
    console.error("Error:", error);
  }
}

// Execute the function
applyTaskTables();
