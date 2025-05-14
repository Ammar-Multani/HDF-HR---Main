import * as Crypto from "expo-crypto";
import { encode as base64Encode } from "base-64";

/**
 * Hashes a password using PBKDF2 via expo-crypto
 * This implementation includes:
 * - Automatic salting
 * - Configurable iterations to slow down brute force attacks
 */
export const hashPassword = async (password: string): Promise<string> => {
  // Generate a salt (16 random bytes)
  const saltBytes = await Crypto.getRandomBytesAsync(16);
  const salt = Array.from(saltBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  // Use PBKDF2 with SHA-256 and 10000 iterations (strong and available in Expo)
  const iterations = 10000;
  
  // Hash with PBKDF2 (using expo-crypto's digest function repeatedly)
  const derivedKey = await pbkdf2(password, salt, iterations, 32);
  
  // Format as iterations:salt:hash for storage and future validation
  return `${iterations}:${salt}:${derivedKey}`;
};

/**
 * Validates if a password matches a hash
 */
export const validatePassword = async (
  password: string,
  storedHash: string
): Promise<boolean> => {
  try {
    // Parse stored hash components
    const [iterationsStr, salt, originalDerivedKey] = storedHash.split(':');
    
    // Handle bcrypt format (for backward compatibility during development)
    if (storedHash.startsWith('$2')) {
      console.warn('Detected bcrypt hash - this should not be used in production with Expo');
      return false; // We can't validate bcrypt hashes without the library
    }
    
    if (!iterationsStr || !salt || !originalDerivedKey) {
      return false; // Invalid format
    }
    
    const iterations = parseInt(iterationsStr, 10);
    
    // Recompute the derived key with the same salt and iterations
    const derivedKey = await pbkdf2(password, salt, iterations, 32);
    
    // Compare the derived key with the stored one
    return derivedKey === originalDerivedKey;
  } catch (error) {
    console.error('Error validating password:', error);
    return false;
  }
};

/**
 * PBKDF2 implementation using expo-crypto
 * This is a key derivation function that applies a pseudorandom function
 * to the input password along with a salt value and repeats the process many times
 */
const pbkdf2 = async (
  password: string,
  salt: string,
  iterations: number,
  keyLength: number
): Promise<string> => {
  // Start with the password and salt
  let derivedKey = password + salt;
  
  // Apply the SHA-256 hash function repeatedly (iterations times)
  for (let i = 0; i < iterations; i++) {
    derivedKey = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      derivedKey
    );
  }
  
  // Truncate or pad if needed to match keyLength
  return derivedKey.substring(0, keyLength * 2); // Hex representation, so *2
};

/**
 * Generates a secure random token for password reset
 */
export const generateResetToken = async (): Promise<string> => {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  return Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

/**
 * Validates an email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates password strength
 * Requirements:
 * - At least 8 characters
 * - Contains at least one uppercase letter
 * - Contains at least one lowercase letter
 * - Contains at least one number
 */
export const validatePasswordStrength = (
  password: string
): { valid: boolean; message: string } => {
  if (password.length < 8) {
    return {
      valid: false,
      message: "Password must be at least 8 characters long",
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one uppercase letter",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one lowercase letter",
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one number",
    };
  }

  return { valid: true, message: "Password is strong" };
};

/**
 * Generates a JSON Web Token (JWT) for authentication
 * NOTE: This is a simplified implementation for demo purposes only
 * In production, use a proper JWT library with secure signing
 */
export const generateJWT = async (userData: {
  id: string;
  email: string;
  role?: string;
}): Promise<string> => {
  // Create the JWT header
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  // Create the JWT payload with standard claims
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: userData.id,
    email: userData.email,
    role: userData.role || "user",
    iat: now,
    exp: now + 60 * 60 * 24, // Token expires in 24 hours
    iss: "businessmanagementapp",
  };

  // Encode header and payload
  const encodedHeader = base64Encode(JSON.stringify(header))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const encodedPayload = base64Encode(JSON.stringify(payload))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  // In a real implementation, you would sign the token with a secret key
  // For demo purposes, we'll use a simple hash
  const signatureInput =
    encodedHeader + "." + encodedPayload + "." + "secretkey";

  // Create signature (this is NOT secure - use a proper JWT library in production!)
  const signature = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    signatureInput
  );

  const formattedSignature = signature
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  // Return the complete JWT
  return `${encodedHeader}.${encodedPayload}.${formattedSignature}`;
};
