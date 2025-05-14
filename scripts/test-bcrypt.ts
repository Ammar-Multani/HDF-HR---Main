/**
 * Simple test script for bcrypt password hashing and validation
 * 
 * This script:
 * 1. Creates a password hash with bcrypt
 * 2. Verifies the password validation works
 * 
 * Run with: npx ts-node scripts/test-bcrypt.ts
 */

const bcrypt = require('bcryptjs');

const testBcrypt = async () => {
  try {
    console.log("==============================================");
    console.log("TESTING BCRYPT PASSWORD HASHING");
    console.log("==============================================");
    
    const testPassword = "SecurePassword123";
    console.log("Test password:", testPassword);
    
    // Generate salt and hash
    console.log("\nGenerating salt...");
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    console.log("Generated salt:", salt);
    
    // Hash the password
    console.log("\nHashing password...");
    const hash = await bcrypt.hash(testPassword, salt);
    console.log("Generated hash:", hash);
    
    // Validate the password
    console.log("\nValidating password...");
    const isValid = await bcrypt.compare(testPassword, hash);
    console.log("Password validation result:", isValid ? "✓ PASSED" : "✗ FAILED");
    
    // Validate incorrect password
    console.log("\nValidating incorrect password...");
    const isInvalidPasswordValid = await bcrypt.compare("WrongPassword123", hash);
    console.log("Incorrect password validation result:", !isInvalidPasswordValid ? "✓ PASSED" : "✗ FAILED");
    
    console.log("\n==============================================");
    console.log("BCRYPT TEST COMPLETED SUCCESSFULLY");
    console.log("==============================================");
  } catch (error) {
    console.error("ERROR IN BCRYPT TEST:", error);
  }
};

// Run the test
console.log("Starting bcrypt test script...");
testBcrypt().catch(error => console.error("Unhandled error:", error)); 