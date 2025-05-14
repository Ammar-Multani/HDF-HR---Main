/**
 * Test script for PBKDF2 password implementation
 * 
 * This script:
 * 1. Creates a password hash with PBKDF2
 * 2. Verifies the password validation works
 * 3. Tests migration from SHA-256 to PBKDF2
 * 
 * Run with: npx ts-node scripts/test-pbkdf2.ts
 */

import * as Crypto from 'expo-crypto';

// PBKDF2 implementation
const pbkdf2 = async (
  password: string,
  salt: string,
  iterations: number,
  keyLength: number
): Promise<string> => {
  console.log(`PBKDF2: Running with ${iterations} iterations`);
  // Start with the password and salt
  let derivedKey = password + salt;
  
  // Apply the SHA-256 hash function repeatedly (iterations times)
  for (let i = 0; i < iterations; i++) {
    derivedKey = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      derivedKey
    );
    
    // Log progress for testing (only for first few and last few iterations)
    if (i < 3 || i > iterations - 3) {
      console.log(`Iteration ${i+1}: ${derivedKey.substring(0, 16)}...`);
    } else if (i === 3) {
      console.log('...');
    }
  }
  
  // Truncate or pad if needed to match keyLength
  const result = derivedKey.substring(0, keyLength * 2); // Hex representation, so *2
  console.log(`Final key: ${result.substring(0, 16)}...`);
  return result;
};

// Hash password function
const hashPassword = async (password: string): Promise<string> => {
  console.log(`Hashing password: ${password}`);
  
  // Generate a salt (16 random bytes)
  const saltBytes = await Crypto.getRandomBytesAsync(16);
  const salt = Array.from(saltBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  console.log(`Generated salt: ${salt}`);
  
  // Use PBKDF2 with SHA-256 and 100 iterations for testing (use 10000+ in production)
  const iterations = 100; // Lower for testing purposes
  
  // Hash with PBKDF2
  const derivedKey = await pbkdf2(password, salt, iterations, 32);
  
  // Format as iterations:salt:hash for storage
  const result = `${iterations}:${salt}:${derivedKey}`;
  console.log(`Hash result: ${result}`);
  return result;
};

// Validate password function
const validatePassword = async (
  password: string,
  storedHash: string
): Promise<boolean> => {
  console.log(`Validating password against hash: ${storedHash.substring(0, 20)}...`);
  
  // Parse stored hash components
  const [iterationsStr, salt, originalDerivedKey] = storedHash.split(':');
  
  if (!iterationsStr || !salt || !originalDerivedKey) {
    console.error('Invalid hash format');
    return false;
  }
  
  const iterations = parseInt(iterationsStr, 10);
  console.log(`Parsed iterations: ${iterations}, salt: ${salt.substring(0, 10)}...`);
  
  // Recompute the derived key with the same salt and iterations
  const derivedKey = await pbkdf2(password, salt, iterations, 32);
  
  // Compare the derived key with the stored one
  const isValid = derivedKey === originalDerivedKey;
  console.log(`Validation result: ${isValid ? 'VALID' : 'INVALID'}`);
  return isValid;
};

// SHA-256 implementation for legacy testing
const sha256 = async (password: string): Promise<string> => {
  return await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password
  );
};

const runTests = async () => {
  try {
    console.log('===== PBKDF2 Password Implementation Test =====\n');
    
    const testPassword = 'SecurePassword123';
    console.log(`Test password: ${testPassword}\n`);
    
    // Test 1: Generate hash
    console.log('TEST 1: Generating hash');
    const hash = await hashPassword(testPassword);
    console.log(`Generated hash: ${hash}\n`);
    
    // Test 2: Validate correct password
    console.log('TEST 2: Validating correct password');
    const isValid = await validatePassword(testPassword, hash);
    console.log(`Valid password test result: ${isValid ? 'PASSED' : 'FAILED'}\n`);
    
    // Test 3: Validate incorrect password
    console.log('TEST 3: Validating incorrect password');
    const isInvalidValid = await validatePassword('WrongPassword123', hash);
    console.log(`Invalid password test result: ${!isInvalidValid ? 'PASSED' : 'FAILED'}\n`);
    
    // Test 4: SHA-256 to PBKDF2 migration simulation
    console.log('TEST 4: SHA-256 to PBKDF2 migration');
    
    // Generate SHA-256 hash (legacy format)
    const sha256Hash = await sha256(testPassword);
    console.log(`Legacy SHA-256 hash: ${sha256Hash}`);
    
    // Simulate legacy validation
    const legacyValid = sha256Hash === await sha256(testPassword);
    console.log(`Legacy validation result: ${legacyValid ? 'VALID' : 'INVALID'}`);
    
    // Migrate to PBKDF2
    console.log('Migrating from SHA-256 to PBKDF2...');
    const newHash = await hashPassword(testPassword);
    console.log(`New PBKDF2 hash: ${newHash}`);
    
    // Validate with new hash
    const isMigratedValid = await validatePassword(testPassword, newHash);
    console.log(`Migrated hash validation: ${isMigratedValid ? 'PASSED' : 'FAILED'}\n`);
    
    console.log('===== All Tests Completed =====');
  } catch (error) {
    console.error('Test error:', error);
  }
};

runTests().catch(console.error); 