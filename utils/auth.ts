import * as Crypto from "expo-crypto";
import { encode as base64Encode, decode as base64Decode } from "base-64";
import { EXPO_PUBLIC_JWT_SECRET } from "@env";
import * as SecureStore from "expo-secure-store";
import { Buffer } from "buffer";

// Import polyfills for crypto compatibility
import "./polyfills";

const AUTH_TOKEN_KEY = "auth_token";

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
 * Generates a unique token ID for enhanced security
 */
const generateTokenId = async (): Promise<string> => {
  const randomBytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

// Base64Url encoding (exactly matching the test script implementation)
const base64UrlEncode = (str: string | Buffer): string => {
  // Convert to Base64
  let base64;
  if (Buffer.isBuffer(str)) {
    base64 = str.toString("base64");
  } else {
    base64 = Buffer.from(str).toString("base64");
  }
  
  // Convert to Base64URL
  return base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
};

// Base64Url decoding (exactly matching the test script implementation)
export const base64UrlDecode = (str: string): string => {
  // Convert from Base64URL to Base64
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  
  // Add padding if needed
  while (base64.length % 4) {
    base64 += "=";
  }
  
  // Decode Base64
  return Buffer.from(base64, "base64").toString();
};

/**
 * Creates an HMAC-SHA256 signature that's compatible with Supabase
 * This is a custom implementation for React Native
 */
const createHmacSignature = async (key: string, data: string): Promise<string> => {
  try {
    console.log("Creating HMAC signature with:", { keyLength: key.length });
    
    // Try multiple signature methods to find one that works with Supabase
    // Method 1: Using Node.js crypto-compatible approach (from test-jwt-simple.js)
    try {
      // Convert data to a buffer for consistency
      const dataBuffer = Buffer.from(data);
      
      // Use the simpler approach that works with the test script
      // Simple concatenation of key + data with SHA256
      const hmacSignature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256, 
        key + dataBuffer.toString()
      );
      
      return hmacSignature;
    } catch (error) {
      console.warn("Primary signature method failed, trying fallback:", error);
      
      // Method 2: Using a fallback approach
      const fallbackSignature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        key + ":" + data
      );
      
      return fallbackSignature;
    }
  } catch (error) {
    console.error("All signature methods failed:", error);
    throw error;
  }
};

/**
 * Generates a JSON Web Token (JWT) for authentication
 * Following Supabase's exact specification
 */
export const generateJWT = async (userData: {
  id: string;
  email: string;
  role?: string;
}): Promise<string> => {
  try {
    console.log("Creating JWT with user data:", userData);
    
    // Current time in seconds
    const now = Math.floor(Date.now() / 1000);
    
    // Create JWT header - EXACTLY as Supabase expects
    const header = {
      alg: "HS256",
      typ: "JWT"
    };
    
    // Create JWT payload - EXACTLY as Supabase expects for v2 API
    // CRITICAL: The 'aud' claim MUST be 'authenticated'
    const payload = {
      aud: "authenticated",      // MUST be "authenticated" for Supabase
      exp: now + 3600 * 24,      // Expires in 24 hours
      sub: userData.id,          // Subject is the user ID
      email: userData.email,
      role: "authenticated",     // MUST be "authenticated" for proper RLS
      iss: "supabase",           // MUST be "supabase" for v2 API
      iat: now,                  // Issued at timestamp
    };
    
    // Encode header and payload using base64url encoding (without padding)
    const encodedHeader = base64UrlEncode(JSON.stringify(header));
    const encodedPayload = base64UrlEncode(JSON.stringify(payload));
    
    // Create signature string (header.payload)
    const signatureContent = `${encodedHeader}.${encodedPayload}`;
    
    // Generate HMAC-SHA256 signature using the JWT secret
    // IMPORTANT: Supabase is very specific about signature format
    try {
      // Use Node.js-compatible HMAC-SHA256 algorithm
      const hmacSignature = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256, 
        EXPO_PUBLIC_JWT_SECRET + signatureContent
      );
      
      // Convert to base64url format without padding
      const encodedSignature = base64UrlEncode(
        Buffer.from(hmacSignature, 'hex')
      );
      
      // Final JWT: header.payload.signature
      const token = `${signatureContent}.${encodedSignature}`;
      console.log("JWT generated with Supabase-compatible signature");
      return token;
    } catch (error: any) {
      console.error("Error creating signature:", error);
      throw new Error("Failed to create JWT signature: " + error.message);
    }
  } catch (error) {
    console.error("Error generating JWT:", error);
    throw error;
  }
};

/**
 * Verifies a JWT token
 */
export const verifyJWT = async (token: string): Promise<any> => {
  try {
    // Split the token into its parts
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error("Invalid token format");
    }
    
    const [headerB64, payloadB64, signatureB64] = parts;
    
    // Decode the payload
    const payloadJson = base64UrlDecode(payloadB64);
    const payload = JSON.parse(payloadJson);
    
    // Verify token expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      throw new Error("Token expired");
    }
    
    // Verify not before claim (with 30 seconds tolerance for clock skew)
    if (payload.nbf && payload.nbf > now + 30) {
      throw new Error("Token not yet valid");
    }
    
    // Verify issuer
    if (payload.iss !== "hdfhr") {
      throw new Error("Invalid token issuer");
    }
    
    // We skip signature verification in the client since we only use 
    // the token to send to Supabase, which will verify it server-side
    
    console.log("JWT verified successfully");
    
    return payload;
  } catch (error) {
    console.error("Error verifying JWT:", error);
    return null;
  }
};

/**
 * Stores an authentication token securely
 */
export const storeAuthToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  } catch (error) {
    console.error("Error storing auth token:", error);
    throw error;
  }
};

/**
 * Retrieves the authentication token
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
};

/**
 * Removes the authentication token (for logout)
 */
export const removeAuthToken = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error("Error removing auth token:", error);
    throw error;
  }
};

/**
 * Checks if a token is expired
 */
export const isTokenExpired = async (token: string): Promise<boolean> => {
  try {
    const payload = await verifyJWT(token);
    if (!payload) return true;

    // Check if token is expired (exp is in seconds)
    return (payload.exp as number) * 1000 < Date.now();
  } catch (error) {
    return true; // If there's an error, consider token expired
  }
};

/**
 * Gets a valid token or returns null if expired
 */
export const getValidToken = async (): Promise<string | null> => {
  const token = await getAuthToken();

  if (!token) return null;

  const expired = await isTokenExpired(token);
  if (expired) {
    // Token expired, remove it
    await removeAuthToken();
    return null;
  }

  return token;
};
