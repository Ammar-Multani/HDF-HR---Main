/**
 * JWT Testing Script with Direct Implementation
 *
 * This script tests the JWT implementation without the jose library dependency.
 */

const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");
const dotenv = require("dotenv");
const Buffer = require("buffer").Buffer;

// Output basic diagnostics
console.log("Starting Direct JWT test script");

// Load environment variables
dotenv.config({ path: ".env" });
console.log("Loaded environment variables");

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const jwtSecret = process.env.EXPO_PUBLIC_JWT_SECRET;

console.log("Supabase URL:", supabaseUrl ? "Found" : "Not found");
console.log("Supabase Key:", supabaseKey ? "Found" : "Not found");
console.log("JWT Secret:", jwtSecret ? "Found" : "Not found");

if (!supabaseUrl || !supabaseKey || !jwtSecret) {
  console.error("❌ Error: Environment variables not found!");
  console.error(
    "Make sure EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, and EXPO_PUBLIC_JWT_SECRET are set."
  );
  process.exit(1);
}

// Create regular Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);
console.log("Created Supabase client");

// Base64Url encoding
function base64UrlEncode(str) {
  // Convert to Base64
  let base64 = Buffer.from(str).toString("base64");

  // Convert to Base64URL
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Base64Url decoding
function base64UrlDecode(str) {
  // Convert from Base64URL to Base64
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");

  // Add padding if needed
  while (base64.length % 4) {
    base64 += "=";
  }

  // Decode Base64
  return Buffer.from(base64, "base64").toString();
}

/**
 * Generate a JWT token using direct implementation
 */
function generateJWT(userData) {
  try {
    console.log("Generating JWT token for:", userData);

    // Create token ID
    const tokenId = crypto.randomBytes(16).toString("hex");

    // Current time in seconds
    const now = Math.floor(Date.now() / 1000);

    // Create header
    const header = {
      alg: "HS256",
      typ: "JWT",
    };

    // Create payload
    const payload = {
      sub: userData.id,
      email: userData.email,
      role: "authenticated", // Use the standard Supabase role
      app_role: userData.role, // Store our custom role
      iat: now,
      exp: now + 3600, // 1 hour expiration
      nbf: now,
      jti: tokenId,
      iss: "hdfhr",
    };

    // Encode header and payload
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));

    // Create the content to be signed
    const content = `${encodedHeader}.${encodedPayload}`;

    // Create signature with proper HMAC-SHA256
    const signature = crypto
      .createHmac("sha256", jwtSecret)
      .update(content)
      .digest("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    // Combine to get the complete JWT
    const token = `${content}.${signature}`;

    console.log("JWT generated successfully");

    return token;
  } catch (error) {
    console.error("Error generating JWT:", error);
    throw error;
  }
}

// Add a function to analyze JWT structure
function analyzeJwt(token) {
  try {
    console.log("\n🔍 ANALYZING JWT FORMAT:");

    // Split the token
    const parts = token.split(".");
    if (parts.length !== 3) {
      console.error(
        "Invalid JWT format - should have 3 parts separated by dots"
      );
      return false;
    }

    // Decode header
    const headerJson = base64UrlDecode(parts[0]);
    const header = JSON.parse(headerJson);
    console.log("Header:", header);

    // Check header properties
    if (header.alg !== "HS256") {
      console.error("Warning: Algorithm should be 'HS256', found:", header.alg);
    }

    if (header.typ !== "JWT") {
      console.error("Warning: Type should be 'JWT', found:", header.typ);
    }

    // Decode payload
    const payloadJson = base64UrlDecode(parts[1]);
    const payload = JSON.parse(payloadJson);
    console.log("Payload:", payload);

    // Check required claims
    const requiredClaims = ["sub", "role", "iat", "exp", "iss"];
    const missingClaims = requiredClaims.filter((claim) => !(claim in payload));

    if (missingClaims.length > 0) {
      console.error(
        "Warning: Missing required claims:",
        missingClaims.join(", ")
      );
    }

    // Check role claim
    if (payload.role !== "authenticated") {
      console.error(
        `Warning: role should be 'authenticated', found: ${payload.role}`
      );
    }

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      console.error("Warning: Token is expired");
    }

    // Signature analysis
    console.log("Signature (base64url):", parts[2].substring(0, 10) + "...");

    return true;
  } catch (error) {
    console.error("Error analyzing JWT:", error);
    return false;
  }
}

/**
 * Test JWT with Supabase
 */
async function testJWT() {
  try {
    // Sample user data
    const userData = {
      id: "9b493703-31b0-406a-9be2-6a991448a245", // Super admin user ID
      email: "aamultani.enacton@gmail.com",
      role: "superadmin",
    };

    // Generate JWT
    const token = generateJWT(userData);
    console.log("Generated token:", token.substring(0, 20) + "...");

    // Decode JWT payload for verification
    const parts = token.split(".");
    if (parts.length !== 3) {
      console.error("Invalid token format");
      return false;
    }

    const payloadJson = base64UrlDecode(parts[1]);
    const payload = JSON.parse(payloadJson);
    console.log("Decoded payload:", payload);

    // Analyze JWT structure
    console.log("\n📋 Detailed JWT Analysis");
    analyzeJwt(token);

    // Generate a reference token using Node's native crypto
    console.log("\n🔄 Comparing with reference implementation");

    // Verify that token is not expired
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp < nowSeconds) {
      console.error(
        "❌ Token is expired! Current time:",
        nowSeconds,
        "Token expiration:",
        payload.exp
      );
      return false;
    }

    // Check that token is valid for use (not before check)
    if (payload.nbf && payload.nbf > nowSeconds) {
      console.error(
        "❌ Token is not yet valid! Current time:",
        nowSeconds,
        "Valid from:",
        payload.nbf
      );
      return false;
    }

    // Create authenticated client
    console.log("Creating authenticated Supabase client");
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

    // Test with Supabase
    console.log("Testing JWT with Supabase...");
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
        console.log("2. The JWT signing algorithm implementation is incorrect");
        console.log("\n📋 NEXT STEPS:");
        console.log(
          "1. Double-check the JWT secret in Supabase Project Settings > API > JWT Settings"
        );
        console.log(
          "2. Make sure it exactly matches your EXPO_PUBLIC_JWT_SECRET value"
        );
      } else if (
        error.message.includes("role") &&
        error.message.includes("does not exist")
      ) {
        console.log("\n🔧 DIAGNOSIS:");
        console.log(
          "The JWT role claim is invalid. Make sure it's exactly 'authenticated'"
        );
        console.log(
          "Valid PostgreSQL roles typically include: anon, authenticated, service_role"
        );
      }

      return false;
    }

    console.log("✅ JWT verification succeeded with Supabase!");
    console.log(`Retrieved ${data.length} records from the company table`);

    return true;
  } catch (error) {
    console.error("❌ Error testing JWT:", error);
    return false;
  }
}

// Run the test
testJWT()
  .then((success) => {
    if (success) {
      console.log("\n🎉 SUCCESS: JWT authentication working properly!");
    } else {
      console.log("\n❌ FAILED: JWT authentication not working properly.");
    }
  })
  .catch((error) => {
    console.error("Unexpected error:", error);
  });
