/**
 * Test script for bcrypt password migration
 * 
 * This script:
 * 1. Creates a test user with the new bcrypt hashing
 * 2. Verifies the password validation works
 * 3. Tests migration functionality for existing SHA-256 hashed passwords
 * 
 * Run with: npx ts-node scripts/test-bcrypt-migration.ts
 */

import * as Crypto from "expo-crypto";
import * as bcrypt from 'bcryptjs';

// Old SHA-256 implementation for testing
const oldHashPassword = async (password: string): Promise<string> => {
  console.log("Using old SHA-256 hashing method...");
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password
  );
  console.log("Generated SHA-256 hash:", hash);
  return hash;
};

// New bcrypt implementation
const newHashPassword = async (password: string): Promise<string> => {
  console.log("Using new bcrypt hashing method...");
  const saltRounds = 10;
  console.log("Using salt rounds:", saltRounds);
  const salt = await bcrypt.genSalt(saltRounds);
  console.log("Generated salt:", salt);
  const hash = await bcrypt.hash(password, salt);
  console.log("Generated bcrypt hash:", hash);
  return hash;
};

// Functions to test password validation
const oldValidatePassword = async (password: string, hash: string): Promise<boolean> => {
  console.log("Validating with old SHA-256 method...");
  const passwordHash = await oldHashPassword(password);
  const isValid = passwordHash === hash;
  console.log("SHA-256 validation result:", isValid);
  return isValid;
};

const newValidatePassword = async (password: string, hash: string): Promise<boolean> => {
  console.log("Validating with new bcrypt method...");
  const isValid = await bcrypt.compare(password, hash);
  console.log("bcrypt validation result:", isValid);
  return isValid;
};

// Migration function to handle both old and new hashes
const migrateOnLogin = async (password: string, storedHash: string): Promise<{ isValid: boolean, newHash?: string }> => {
  console.log("Testing migration logic...");
  console.log("Input password:", password);
  console.log("Stored hash:", storedHash);
  
  // Try validating with bcrypt first (for users who already migrated)
  console.log("Attempting bcrypt validation first...");
  let isValid = await newValidatePassword(password, storedHash);
  
  if (isValid) {
    console.log("Password valid with new hash format, no migration needed");
    return { isValid: true };
  }
  
  // Try the old SHA-256 validation
  console.log("Attempting SHA-256 validation as fallback...");
  isValid = await oldValidatePassword(password, storedHash);
  
  if (isValid) {
    console.log("Password valid with old hash, migrating to new format");
    const newHash = await newHashPassword(password);
    console.log("New migrated hash:", newHash);
    return { isValid: true, newHash };
  }
  
  console.log("Password invalid with both methods");
  return { isValid: false };
};

const runTests = async () => {
  try {
    console.log("==============================================");
    console.log("STARTING BCRYPT MIGRATION TESTS");
    console.log("==============================================");
    
    const testPassword = "SecurePassword123";
    console.log("Test password:", testPassword);
    
    // Test 1: Generate hash with the new method
    console.log("\n==============================================");
    console.log("TEST 1: NEW BCRYPT HASHING");
    console.log("==============================================");
    const newHash = await newHashPassword(testPassword);
    console.log("New bcrypt hash:", newHash);
    
    // Test 2: Validate password with the new method
    console.log("\n==============================================");
    console.log("TEST 2: NEW BCRYPT VALIDATION");
    console.log("==============================================");
    const isValidNewHash = await newValidatePassword(testPassword, newHash);
    console.log("Password validation with bcrypt:", isValidNewHash ? "✓ PASSED" : "✗ FAILED");
    
    // Test 3: Generate hash with the old method
    console.log("\n==============================================");
    console.log("TEST 3: OLD SHA-256 HASHING");
    console.log("==============================================");
    const oldHash = await oldHashPassword(testPassword);
    console.log("Old SHA-256 hash:", oldHash);
    
    // Test 4: Validate password with the old method
    console.log("\n==============================================");
    console.log("TEST 4: OLD SHA-256 VALIDATION");
    console.log("==============================================");
    const isValidOldHash = await oldValidatePassword(testPassword, oldHash);
    console.log("Password validation with SHA-256:", isValidOldHash ? "✓ PASSED" : "✗ FAILED");
    
    // Test 5: Migration from old to new
    console.log("\n==============================================");
    console.log("TEST 5: MIGRATION ON LOGIN");
    console.log("==============================================");
    const migrationResult = await migrateOnLogin(testPassword, oldHash);
    console.log("Migration result:", migrationResult);
    console.log("Migration successful:", migrationResult.isValid && !!migrationResult.newHash ? "✓ PASSED" : "✗ FAILED");
    
    if (migrationResult.newHash) {
      // Test 6: Verify the migrated hash works with new validation
      console.log("\n==============================================");
      console.log("TEST 6: VERIFY MIGRATED HASH");
      console.log("==============================================");
      const isValidMigratedHash = await newValidatePassword(testPassword, migrationResult.newHash);
      console.log("Validation with migrated hash:", isValidMigratedHash ? "✓ PASSED" : "✗ FAILED");
    }
    
    console.log("\n==============================================");
    console.log("ALL TESTS COMPLETED");
    console.log("==============================================");
  } catch (error) {
    console.error("ERROR IN TESTS:", error);
  }
};

// Run the tests
console.log("Starting bcrypt migration test script...");
runTests().catch(error => console.error("Unhandled error:", error)); 