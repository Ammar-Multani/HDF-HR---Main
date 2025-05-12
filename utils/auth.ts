import * as Crypto from "expo-crypto";
import { encode as base64Encode } from "base-64";

/**
 * Hashes a password using SHA-256
 * Note: In a production app, use a stronger algorithm like bcrypt or Argon2
 * This is for demo purposes only
 */
export const hashPassword = async (password: string): Promise<string> => {
  // In a real app, add a salt and use a stronger algorithm
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password
  );
  return hash;
};

/**
 * Validates if a password matches a hash
 * Note: In a production app, use a proper password validation function
 */
export const validatePassword = async (
  password: string,
  hash: string
): Promise<boolean> => {
  const passwordHash = await hashPassword(password);
  return passwordHash === hash;
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
