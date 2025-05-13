/**
 * JWT Testing Script with Jose Library
 *
 * This script tests the new JWT implementation using the jose library.
 * It generates a token and immediately verifies it with Supabase.
 */

require("./node-polyfills"); // Load Node.js compatible polyfills first
const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");

// Output basic diagnostics
console.log("Starting Jose JWT test script");

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

// Import jose dynamically since it's an ESM module
async function runTest() {
  try {
    // Dynamically import jose
    console.log("Importing jose library...");
    const jose = await import("jose");
    console.log("Jose library imported successfully");

    // Create regular Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log("Created Supabase client");

    /**
     * Generate a JWT token using the jose library
     */
    async function generateTokenWithJose(userData) {
      try {
        console.log("Creating secret key");
        // Create the secret key
        const secret = new TextEncoder().encode(jwtSecret);

        console.log("Generating token ID");
        // Generate a unique token ID
        const tokenId = Array.from(crypto.getRandomValues(new Uint8Array(16)))
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");

        // Current time in seconds
        const now = Math.floor(Date.now() / 1000);

        console.log("Building JWT payload");
        // Create and sign the JWT
        const token = await new jose.SignJWT({
          email: userData.email,
          role: "authenticated", // Use authenticated role that exists in Supabase
          app_role: userData.role, // Store our app-specific role here
        })
          .setProtectedHeader({ alg: "HS256", typ: "JWT" })
          .setSubject(userData.id)
          .setIssuedAt()
          .setExpirationTime("1h") // Expires in 1 hour
          .setNotBefore(now) // Valid from now
          .setJti(tokenId) // Add unique token ID
          .setIssuer("hdfhr")
          .sign(secret);

        console.log("JWT signing complete");
        return token;
      } catch (error) {
        console.error("Error in generateTokenWithJose:", error);
        throw error;
      }
    }

    /**
     * Verify a JWT token using the jose library
     */
    async function verifyTokenWithJose(token) {
      try {
        console.log("Creating verification secret key");
        const secret = new TextEncoder().encode(jwtSecret);

        console.log("Verifying JWT");
        const { payload } = await jose.jwtVerify(token, secret, {
          algorithms: ["HS256"], // Only allow HS256 algorithm
          issuer: "hdfhr",
          clockTolerance: 30, // 30 seconds tolerance for clock skew
        });

        return { verified: true, payload };
      } catch (error) {
        console.error("Error in verifyTokenWithJose:", error);
        return { verified: false, error: error.message };
      }
    }

    /**
     * Test JWT with Supabase
     */
    async function testJwtWithSupabase() {
      try {
        // Sample user data
        const userData = {
          id: "9b493703-31b0-406a-9be2-6a991448a245", // Super admin user ID
          email: "aamultani.enacton@gmail.com",
          role: "superadmin",
        };

        console.log("📝 Generating JWT with jose for user:", userData);

        // Generate token with jose
        const token = await generateTokenWithJose(userData);
        console.log("🔑 Generated JWT:", token.substring(0, 20) + "...");

        // Verify locally with jose
        const verifyResult = await verifyTokenWithJose(token);
        if (verifyResult.verified) {
          console.log("✅ Local verification successful!");
          console.log("Payload:", verifyResult.payload);
        } else {
          console.log("❌ Local verification failed:", verifyResult.error);
          return false;
        }

        console.log("Creating authenticated client");
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
        console.log("Querying company table");
        const { data, error } = await authClient
          .from("company")
          .select("*")
          .limit(1);

        if (error) {
          console.error(
            "❌ JWT verification failed with Supabase:",
            error.message
          );

          if (
            error.message.includes("JWSError") ||
            error.message.includes("signature")
          ) {
            console.log("\n🔧 DIAGNOSIS:");
            console.log(
              "The JWT signature verification is still failing. Possible causes:"
            );
            console.log(
              "1. The JWT_SECRET in your app does not match the JWT secret in Supabase project settings"
            );
            console.log(
              "2. The JWT signing algorithm implementation may still have issues"
            );
            console.log("\n📋 NEXT STEPS:");
            console.log(
              "1. Double-check the JWT secret in Supabase Project Settings > API > JWT Settings"
            );
            console.log(
              "2. Make sure it exactly matches your EXPO_PUBLIC_JWT_SECRET value"
            );
            console.log(
              "3. Check jose library implementation details and crypto polyfills"
            );
          } else if (
            error.message.includes("role") &&
            error.message.includes("does not exist")
          ) {
            console.log("\n🔧 DIAGNOSIS:");
            console.log(
              "The JWT role claim is still invalid. Make sure it's exactly 'authenticated'"
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
        console.error("❌ Error in test:", error);
        return false;
      }
    }

    // Run the test
    console.log("Starting test");
    const success = await testJwtWithSupabase();

    if (success) {
      console.log(
        "\n🎉 SUCCESS: JWT authentication working with jose library!"
      );
    } else {
      console.log("\n❌ FAILED: JWT authentication not working properly.");
    }
  } catch (error) {
    console.error("Uncaught error:", error);
  }
}

// Start the test
runTest();
