const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

// Load environment variables (consider using dotenv package in a real app)
const SUPABASE_URL = process.env.SUPABASE_URL || "your_supabase_url";
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_KEY || "your_supabase_service_key";

// Create Supabase client with service key for admin privileges
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function runMigration() {
  try {
    console.log("Starting database migration...");

    // Read the migration SQL file
    const sqlFilePath = path.join(
      __dirname,
      "../migrations/update_assigned_to_field.sql"
    );
    const sqlContent = fs.readFileSync(sqlFilePath, "utf8");

    // Split the SQL into separate statements
    const statements = sqlContent
      .split(";")
      .map((statement) => statement.trim())
      .filter((statement) => statement.length > 0);

    // Execute each statement
    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 80)}...`);

      const { error } = await supabase.rpc("exec_sql", {
        query: statement + ";",
      });

      if (error) {
        throw new Error(`Failed to execute SQL: ${error.message}`);
      }
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

runMigration();

/*
To run this migration:
1. Save your Supabase URL and service key as environment variables:
   export SUPABASE_URL=your_supabase_url
   export SUPABASE_SERVICE_KEY=your_supabase_service_key

2. Install dependencies if needed:
   npm install @supabase/supabase-js

3. Run the script:
   node scripts/run_migration.js
*/
