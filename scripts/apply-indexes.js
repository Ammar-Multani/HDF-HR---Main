const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

// Load environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // You'll need to add this to your .env file

if (!supabaseUrl || !supabaseServiceKey) {
  console.error(
    "Error: Supabase URL or service key not found in environment variables"
  );
  console.error("Make sure to add SUPABASE_SERVICE_KEY to your .env file");
  process.exit(1);
}

// Create Supabase client with admin privileges
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyIndexes() {
  try {
    console.log("Starting database index creation...");

    // Read the SQL file
    const sqlFilePath = path.join(__dirname, "add-database-indexes.sql");
    const sqlCommands = fs.readFileSync(sqlFilePath, "utf8");

    // Execute the SQL commands
    const { error } = await supabase.rpc("exec_sql", {
      sql_query: sqlCommands,
    });

    if (error) {
      console.error("Error applying indexes:", error.message);
      process.exit(1);
    }

    console.log("✅ Database indexes created successfully!");
    console.log(
      "This should significantly improve query performance and reduce slow query warnings."
    );
  } catch (error) {
    console.error("Unexpected error:", error.message);
    process.exit(1);
  }
}

applyIndexes();
