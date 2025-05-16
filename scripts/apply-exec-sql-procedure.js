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

async function applyExecSqlProcedure() {
  try {
    console.log("Creating exec_sql stored procedure in Supabase...");

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, "create-exec-sql-procedure.sql");
    const sql = fs.readFileSync(sqlFilePath, "utf8");

    // Execute the SQL directly
    const { error } = await supabase
      .rpc("exec_sql", { sql_query: sql })
      .catch((err) => {
        // If the function doesn't exist yet, we need to use raw SQL
        // This will create the function we need
        return supabase.from("_exec_sql").rpc("sql", { query: sql });
      });

    if (error) {
      console.error("Error applying SQL procedure:", error);
      return;
    }

    console.log("✅ exec_sql stored procedure created successfully!");
  } catch (error) {
    console.error("Error:", error);
  }
}

// Execute the function
applyExecSqlProcedure();
