/**
 * Verify JWT Configuration
 *
 * This script helps diagnose JWT configuration issues between your app and Supabase.
 * It will:
 * 1. Generate a JWT token using your app's secret
 * 2. Test this token with a direct API call to Supabase
 * 3. Provide diagnostic information about any mismatches
 */

const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");
const dotenv = require("dotenv");
const fs = require("fs");
const path = require("path");

// Load environment variables
dotenv.config({ path: ".env" });

// Check if environment variables are available
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const jwtSecret = process.env.EXPO_PUBLIC_JWT_SECRET;

if (!supabaseUrl || !supabaseKey || !jwtSecret) {
  console.error("❌ Missing required environment variables:");
  if (!supabaseUrl) console.error("  - EXPO_PUBLIC_SUPABASE_URL");
  if (!supabaseKey) console.error("  - EXPO_PUBLIC_SUPABASE_ANON_KEY");
  if (!jwtSecret) console.error("  - EXPO_PUBLIC_JWT_SECRET");
  console.error("\nPlease check your .env file.");
  process.exit(1);
}

console.log("🔍 Verifying JWT configuration with Supabase...");
console.log(`JWT Secret (first few chars): ${jwtSecret.substring(0, 3)}...`);

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Generate a JWT token using Node's native crypto
 */
function generateToken(payload, secret) {
  // Create the JWT header
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  // Base64Url encode the header and payload
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  // Create the content to be signed
  const content = `${encodedHeader}.${encodedPayload}`;

  // Create the signature with HMAC-SHA256
  const signature = crypto
    .createHmac("sha256", secret)
    .update(content)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // Return the JWT token
  return `${content}.${signature}`;
}

// Helper function for base64url encoding
function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Test JWT generation and verification
async function testJwtWithSupabase() {
  try {
    // Sample payload similar to what your app uses
    // Important: We set role to "authenticated" and put the actual role in app_role
    // This mirrors what our auth.ts file does
    const payload = {
      sub: "9b493703-31b0-406a-9be2-6a991448a245", // Super admin user ID
      email: "aamultani.enacton@gmail.com",
      app_role: "superadmin", // Store our app-specific role here
      role: "authenticated", // Using authenticated role that exists in Supabase
      iss: "hdfhr",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600, // expires in 1 hour
    };

    console.log("📝 Generating JWT with payload:", payload);

    // Generate token with Node.js crypto
    const token = generateToken(payload, jwtSecret);
    console.log("🔑 Generated JWT:", token.substring(0, 20) + "...");

    // Use the token to make an authenticated request to Supabase
    const authClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    console.log("🔄 Testing JWT with Supabase...");

    // Try to access the companies table (which requires auth)
    const { data, error } = await authClient
      .from("company")
      .select("*")
      .limit(1);

    if (error) {
      console.error("❌ JWT verification failed with Supabase:", error.message);

      if (
        error.message.includes("JWSError") ||
        error.message.includes("signature")
      ) {
        console.log("\n🔧 DIAGNOSIS:");
        console.log(
          "The JWT signature verification is failing. Possible causes:"
        );
        console.log(
          "1. The JWT_SECRET in your app does not match the JWT secret in Supabase project settings"
        );
        console.log(
          "2. The JWT signing algorithm implementation is incompatible with Supabase"
        );
        console.log("\n📋 NEXT STEPS:");
        console.log(
          "1. Verify the JWT secret in Supabase Project Settings > API > JWT Settings"
        );
        console.log(
          "2. Make sure it exactly matches your EXPO_PUBLIC_JWT_SECRET value"
        );
        console.log(
          "3. If using a custom JWT implementation, ensure it uses HMAC-SHA256 properly"
        );
      } else if (
        error.message.includes("role") &&
        error.message.includes("does not exist")
      ) {
        console.log("\n🔧 DIAGNOSIS:");
        console.log(
          "The JWT role claim contains a value that does not exist in Supabase."
        );
        console.log(
          "Valid PostgreSQL roles typically include: anon, authenticated, service_role"
        );
        console.log("\n📋 NEXT STEPS:");
        console.log(
          "1. Update your JWT implementation to use 'authenticated' as the role claim"
        );
        console.log(
          "2. Store your app-specific roles in a different claim (e.g., app_role)"
        );
      }

      return false;
    }

    console.log("✅ JWT verification succeeded with Supabase!");
    console.log(`Retrieved ${data.length} records from the company table`);

    return true;
  } catch (err) {
    console.error("❌ Error testing JWT:", err.message);
    return false;
  }
}

// Main function
async function main() {
  console.log("======= JWT CONFIGURATION VERIFICATION =======");

  const success = await testJwtWithSupabase();

  if (success) {
    console.log(
      "\n🎉 Congratulations! Your JWT configuration is working correctly."
    );
    console.log(
      "Your app should now be able to properly authenticate with Supabase."
    );
  } else {
    console.log(
      "\n⚠️ Your JWT configuration has issues that need to be resolved."
    );
    console.log(
      "Please follow the diagnostic steps above to fix the problems."
    );
  }

  console.log("\n==============================================");
}

// Run the script
main();
