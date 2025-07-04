import * as Crypto from "expo-crypto";
import { encode as base64Encode } from "base-64";
import { t } from "i18next";

/**
 * @deprecated This function is deprecated and will be removed once migration to Supabase Auth is complete.
 * Please use Supabase Auth's built-in methods for user creation and password management.
 *
 * Example:
 * ```typescript
 * const { data, error } = await supabase.auth.signUp({
 *   email: 'example@email.com',
 *   password: 'example-password'
 * });
 * ```
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    // Generate a salt (16 random bytes)
    const saltBytes = await Crypto.getRandomBytesAsync(16);
    const salt = Array.from(saltBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Use SHA-256 for simple hashing since this is temporary
    const hash = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      password + salt
    );

    // Format as iterations:salt:hash for compatibility with existing format
    return `1:${salt}:${hash}`;
  } catch (error) {
    console.error("Error hashing password:", error);
    throw error;
  }
};

/**
 * Validates if a password matches a hash
 * Note: This is kept for backward compatibility but no longer used with Supabase Auth
 */
export const validatePassword = async (
  password: string,
  storedHash: string
): Promise<boolean> => {
  try {
    // Parse stored hash components
    const [iterationsStr, salt, originalDerivedKey] = storedHash.split(":");

    if (!iterationsStr || !salt || !originalDerivedKey) {
      return false; // Invalid format
    }

    const iterations = parseInt(iterationsStr, 10);

    // Recompute the derived key with the same salt and iterations
    const derivedKey = await pbkdf2(password, salt, iterations, 32);

    // Compare the derived key with the stored one
    return derivedKey === originalDerivedKey;
  } catch (error) {
    console.error("Error validating password:", error);
    return false;
  }
};

/**
 * Optimized PBKDF2 implementation
 * Note: This is kept for backward compatibility but no longer used with Supabase Auth
 */
const pbkdf2 = async (
  password: string,
  salt: string,
  iterations: number,
  keyLength: number
): Promise<string> => {
  // Initial hash of password + salt
  let derivedKey = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password + salt
  );

  // Optimize by reducing the number of digest operations
  // We'll use a batch approach to reduce overhead
  const batchSize = 10;
  const fullBatches = Math.floor(iterations / batchSize);
  const remainder = iterations % batchSize;

  // Process full batches
  for (let batch = 0; batch < fullBatches; batch++) {
    // For each batch, concatenate the previous result multiple times
    let batchInput = derivedKey;
    for (let i = 1; i < batchSize; i++) {
      batchInput += derivedKey;
    }

    derivedKey = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      batchInput
    );
  }

  // Process remainder
  for (let i = 0; i < remainder; i++) {
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
 * Generates a secure random token with expiration time
 * @param expiresInMinutes Minutes until token expires (default: 60)
 * @returns Object containing token and expiration timestamp
 */
export const generateSecureToken = async (expiresInMinutes = 60) => {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  const token = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Set expiration time
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMinutes);

  return {
    token,
    expiresAt: expiresAt.toISOString(),
  };
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
  const jwtSecret = process.env.EXPO_PUBLIC_JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT secret is not configured");
  }

  // Create the JWT header
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  // Generate a random UUID using expo-crypto
  const randomBytes = await Crypto.getRandomBytesAsync(16);
  const jti = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Create the JWT payload with standard claims
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: userData.id,
    email: userData.email,
    role: userData.role || "user",
    iat: now,
    exp: now + 60 * 60 * 24 * 7, // Token expires in 7 days
    iss: "hdfhr",
    aud: "hdfhr",
    jti: jti, // Use our generated UUID
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

  // Create signature using SHA-256
  const signatureInput = encodedHeader + "." + encodedPayload;
  const hash = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    signatureInput + jwtSecret
  );

  // Convert the hash to base64URL format
  const formattedSignature = base64Encode(hash)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  // Return the complete JWT
  return `${encodedHeader}.${encodedPayload}.${formattedSignature}`;
};

// Add these interfaces at the top of the file
export interface AdminUser {
  id: string;
  email: string;
  role: string;
  status: boolean; // boolean for superadmin
  table: "admin";
}

export interface CompanyUser {
  id: string;
  email: string;
  role: string;
  active_status: string; // 'active' | 'inactive' for company users
  table: "company_user";
}

export type UserStatus = {
  isActive: boolean;
  message: string;
};

/**
 * Checks if a user is active based on admin and company user data
 */
export const checkUserStatus = async (
  adminData: AdminUser | null,
  companyUserData: CompanyUser | null
): Promise<UserStatus> => {
  // Check admin status first
  if (adminData) {
    // Admin status is a boolean
    if (adminData.status === false) {
      return {
        isActive: false,
        message: t(
          "auth.accountInactive",
          "Your admin account is inactive. Please contact support."
        ),
      };
    }
    // If admin and active, allow access
    return { isActive: true, message: "" };
  }

  // Then check company user status
  if (companyUserData) {
    // Company user status is a string
    if (
      companyUserData.active_status === "inactive" ||
      companyUserData.active_status === "suspended"
    ) {
      return {
        isActive: false,
        message: t(
          "auth.accountInactive",
          "Your account is inactive. Please contact your administrator."
        ),
      };
    }
    // If company user and active, allow access
    return { isActive: true, message: "" };
  }

  // If no user data found in either table
  return {
    isActive: false,
    message: t(
      "auth.accountNotConfigured",
      "Your account is not properly configured. Please contact support."
    ),
  };
};

export const APP_URL =
  process.env.EXPO_PUBLIC_APP_URL || "https://hdf-hr.vercel.app";
