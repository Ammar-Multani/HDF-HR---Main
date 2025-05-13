/**
 * JWT Configuration Fixer
 *
 * This script diagnoses JWT signature verification issues between your app
 * and Supabase by checking and fixing secret formats.
 */

const dotenv = require("dotenv");
const crypto = require("crypto");
const fs = require("fs");

// Load environment variables
dotenv.config();

const EXPO_PUBLIC_JWT_SECRET = process.env.EXPO_PUBLIC_JWT_SECRET;

if (!EXPO_PUBLIC_JWT_SECRET) {
  console.error("❌ Error: EXPO_PUBLIC_JWT_SECRET is not defined in .env file");
  process.exit(1);
}

console.log("==== JWT CONFIGURATION DIAGNOSIS ====");
console.log(
  `JWT Secret (first few chars): ${EXPO_PUBLIC_JWT_SECRET.substring(0, 3)}...`
);

// Check if the JWT secret is likely base64 encoded
function isBase64(str) {
  const base64Regex = /^[A-Za-z0-9+/=]+$/;
  return base64Regex.test(str) && str.length % 4 === 0;
}

// Function to generate a test JWT with a bare-minimum approach
function generateTestJWT(payload, secret) {
  // Create header and encode
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = Buffer.from(JSON.stringify(header))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // Encode payload
  const encodedPayload = Buffer.from(JSON.stringify(payload))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  // Create data string
  const data = `${encodedHeader}.${encodedPayload}`;

  // Generate signature - very basic approach that matches our app implementation
  const signature = crypto
    .createHash("sha256")
    .update(data + secret)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return `${data}.${signature}`;
}

// Generate a test JWT with our secret
const testPayload = {
  sub: "00000000-0000-0000-0000-000000000000",
  role: "authenticated",
  exp: Math.floor(Date.now() / 1000) + 3600,
};

console.log("\n🔍 ANALYZING JWT SECRET FORMAT...");

// Check if secret is likely base64 encoded
if (isBase64(EXPO_PUBLIC_JWT_SECRET)) {
  console.log(
    "✅ JWT secret appears to be base64 encoded (correct format for Supabase)"
  );
} else {
  console.log(
    "⚠️ JWT secret may not be in base64 format. Consider encoding it properly."
  );
}

// Generate test JWT with current secret
const jwtWithCurrentSecret = generateTestJWT(
  testPayload,
  EXPO_PUBLIC_JWT_SECRET
);
console.log("\n🔑 Test JWT with current secret:");
console.log(jwtWithCurrentSecret.substring(0, 40) + "...");

console.log("\n📝 INSTRUCTIONS FOR FIXING JWT SIGNATURE ISSUES:");
console.log("1. In Supabase dashboard -> Settings -> API -> JWT Settings:");
console.log("   a. Make sure JWT verification is enabled");
console.log("   b. Use this EXACT string as your JWT secret:");
console.log("\n   " + EXPO_PUBLIC_JWT_SECRET);
console.log("\n   c. Do NOT modify, encode, or decode this string");

// Check if our JWT signing approach matches Supabase's expectations
console.log("\n2. Our JWT signing approach in the app:");
console.log("   - We use a basic approach: SHA256(header.payload + secret)");
console.log("   - This must match how Supabase validates JWTs");

console.log("\n3. After updating the secret in Supabase, test authentication:");
console.log("   - Run the TestScreen in your app");
console.log('   - If you still get "JWSInvalidSignature" errors:');
console.log("     1. Check for any hidden characters/whitespace in the secret");
console.log("     2. Try using a fully standards-compliant JWT library");

// Update .env file with instructions if needed
const envPath = "./.env";
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  if (!envContent.includes("# JWT Configuration")) {
    console.log(
      "\n📄 Adding comments to .env file to explain JWT configuration..."
    );
    const updatedContent =
      envContent +
      `
# JWT Configuration 
# IMPORTANT: The JWT secret must be EXACTLY the same in Supabase
# Do not modify, encode, or decode this value when copying to Supabase
# EXPO_PUBLIC_JWT_SECRET=${EXPO_PUBLIC_JWT_SECRET}
`;
    fs.writeFileSync(envPath, updatedContent);
    console.log("✅ Updated .env file with JWT configuration comments");
  }
}

console.log("\n==== END OF JWT DIAGNOSIS ====");
