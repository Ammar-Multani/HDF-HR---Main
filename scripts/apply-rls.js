// Script to apply RLS policies to Supabase

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Check if Supabase CLI is installed
function checkSupabaseCLI() {
  try {
    execSync("supabase --version", { stdio: "pipe" });
    return true;
  } catch (error) {
    console.error("❌ Supabase CLI is not installed or not in PATH.");
    console.log("   Please install it by following the instructions at:");
    console.log("   https://supabase.com/docs/guides/cli");
    return false;
  }
}

// Apply RLS policies
async function applyRLSPolicies() {
  console.log("🔒 Applying RLS policies to Supabase...");

  // Step 1: Check for Supabase CLI
  if (!checkSupabaseCLI()) {
    return;
  }

  // Step 2: Confirm with user
  const answer = await new Promise((resolve) => {
    rl.question(
      "⚠️ This will apply RLS policies to your Supabase project. Continue? (y/n): ",
      resolve
    );
  });

  if (answer.toLowerCase() !== "y") {
    console.log("Operation cancelled by user.");
    rl.close();
    return;
  }

  try {
    // Step 3: Run the SQL file using Supabase CLI
    console.log("Applying consolidated RLS policies...");

    // Determine the path to the SQL file
    const sqlFilePath = path.join(
      __dirname,
      "..",
      "supabase",
      "migrations",
      "consolidated_rls_policies.sql"
    );

    if (!fs.existsSync(sqlFilePath)) {
      console.error(`❌ SQL file not found at: ${sqlFilePath}`);
      rl.close();
      return;
    }

    // Run the SQL file through Supabase CLI
    try {
      execSync(`supabase db execute --file ${sqlFilePath}`, {
        stdio: "inherit",
      });
      console.log("✅ RLS policies applied successfully!");

      // Reminder about JWT secret
      console.log(
        "\n🔑 IMPORTANT: Make sure to set the JWT secret in Supabase project settings:"
      );
      console.log("1. Go to Supabase Dashboard -> Project Settings -> API");
      console.log("2. Find the JWT Settings section");
      console.log(
        "3. Enter the same JWT secret that you have in your .env file (EXPO_PUBLIC_JWT_SECRET)"
      );
      console.log("4. Make sure JWT verification is enabled");
    } catch (error) {
      console.error("❌ Failed to apply RLS policies:", error.message);
    }
  } catch (error) {
    console.error("Error:", error.message);
  } finally {
    rl.close();
  }
}

// Run the script
applyRLSPolicies();
