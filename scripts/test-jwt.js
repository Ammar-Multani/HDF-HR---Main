// Run this with: node -r babel-register scripts/test-jwt.js

// Load polyfills first
require("../utils/polyfills");

// Import the test
const { testJWT } = require("../utils/testJWT");

// Run the test
async function runTest() {
  console.log("Starting JWT test...");
  try {
    await testJWT();
    console.log("JWT test completed");
  } catch (error) {
    console.error("JWT test error:", error);
  }
}

runTest();
