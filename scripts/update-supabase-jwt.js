/**
 * Supabase JWT Secret Update Helper
 *
 * This script helps generate commands to update the JWT secret in Supabase
 * to match the one used in your application.
 *
 * It provides step-by-step instructions to ensure your JWT authentication
 * works properly.
 */

const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Load environment variables
dotenv.config({ path: ".env" });

// Check if environment variables are available
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const jwtSecret = process.env.EXPO_PUBLIC_JWT_SECRET;

if (!jwtSecret) {
  console.error("❌ Missing EXPO_PUBLIC_JWT_SECRET environment variable");
  console.error("Please check your .env file.");
  process.exit(1);
}

console.log("========== SUPABASE JWT SECRET UPDATE HELPER ==========");
console.log(
  "\n🔑 Your current JWT secret (first few chars):",
  jwtSecret.substring(0, 3) + "..."
);

// Check if Supabase CLI is installed
let hasSupabaseCLI = false;
try {
  execSync("supabase --version", { stdio: "ignore" });
  hasSupabaseCLI = true;
} catch (error) {
  // Supabase CLI not installed
}

console.log("\n📋 UPDATING YOUR JWT SECRET IN SUPABASE");
console.log("\nTo fix JWT authentication issues, follow these steps:");

console.log("\n1️⃣ OPTION 1: Update via Supabase Dashboard (Recommended)");
console.log("   a. Go to Supabase Dashboard → Project Settings → API");
console.log("   b. Scroll down to JWT Settings");
console.log("   c. Ensure JWT verification is enabled");
console.log("   d. Enter this exact JWT secret:");
console.log("\n   " + jwtSecret);
console.log("\n   e. Click Save");

if (hasSupabaseCLI) {
  console.log("\n2️⃣ OPTION 2: Update via Supabase CLI");
  console.log("   Run the following command:");
  console.log(
    "\n   supabase secrets set --env-file .env SUPABASE_JWT_SECRET=EXPO_PUBLIC_JWT_SECRET"
  );
  console.log(
    "\n   Note: This requires linking your project with the Supabase CLI first."
  );
}

console.log("\n🔄 VERIFYING THE UPDATE");
console.log("Once you've updated the JWT secret, run:");
console.log("\n   node scripts/verify-jwt-config.js");
console.log(
  "\nThis will confirm if your JWT configuration is working properly."
);

console.log("\n❓ TROUBLESHOOTING");
console.log("If you're still having issues:");
console.log("1. Make sure your JWT implementation uses standard HMAC-SHA256");
console.log("2. Verify your JWT token format: header.payload.signature");
console.log(
  "3. Check that your token contains the required claims: sub, role, etc."
);
console.log(
  "4. Restart your app completely to ensure it's using the updated configuration"
);

console.log("\n✅ FINAL STEPS");
console.log("After updating your JWT secret, you should:");
console.log("1. Logout all users and make them login again to get new tokens");
console.log("2. Update any stored tokens in your development environment");
console.log("3. Test RLS policies with different user roles");

console.log("\n=======================================================");
