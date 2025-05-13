import * as Crypto from "expo-crypto";
import { encode as base64Encode, decode as base64Decode } from "base-64";
import { EXPO_PUBLIC_JWT_SECRET } from "@env";
import * as SecureStore from "expo-secure-store";
import { Buffer } from "buffer";

const AUTH_TOKEN_KEY = "auth_token";

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
 * Simple JSON Web Token implementation to avoid WebCrypto API issues
 */

// Helper function to create the JWT header
const createHeader = () => {
  return {
    alg: "HS256",
    typ: "JWT",
  };
};

// Helper function to create a signature for the JWT
async function createSignature(
  encodedHeader: string,
  encodedPayload: string,
  secret: string
): Promise<string> {
  const data = `${encodedHeader}.${encodedPayload}`;

  // For debugging JWT signature issues
  console.log(
    "Creating JWT signature for data:",
    data.substring(0, 20) + "..."
  );
  console.log(
    "Using JWT secret (first few chars):",
    secret.substring(0, 3) + "..."
  );

  // Use digestStringAsync with the secret as a key
  const signature = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    data + secret
  );

  return base64UrlEncode(signature);
}

// Base64Url encoding
function base64UrlEncode(str: string): string {
  return base64Encode(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Base64Url decoding
function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) {
    str += "=";
  }
  return base64Decode(str);
}

// Helper to encode an object to base64url
function encodeObject(obj: any): string {
  return base64UrlEncode(JSON.stringify(obj));
}

/**
 * Generates a JSON Web Token (JWT) for authentication
 */
export const generateJWT = async (userData: {
  id: string;
  email: string;
  role?: string;
}): Promise<string> => {
  try {
    // Create header and payload
    const header = createHeader();
    const currentTime = Math.floor(Date.now() / 1000);

    const payload = {
      sub: userData.id,
      email: userData.email,
      role: userData.role || "user",
      iat: currentTime,
      exp: currentTime + 24 * 60 * 60, // 24 hours
      iss: "hdfhr",
    };

    // Encode header and payload
    const encodedHeader = encodeObject(header);
    const encodedPayload = encodeObject(payload);

    // Create signature
    const signature = await createSignature(
      encodedHeader,
      encodedPayload,
      EXPO_PUBLIC_JWT_SECRET
    );

    // Combine to form JWT
    return `${encodedHeader}.${encodedPayload}.${signature}`;
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
    const [headerB64, payloadB64, signatureB64] = token.split(".");

    if (!headerB64 || !payloadB64 || !signatureB64) {
      throw new Error("Invalid token format");
    }

    // Create the expected signature using the same method as when generating
    const data = `${headerB64}.${payloadB64}`;
    console.log(
      "Verifying JWT signature for data:",
      data.substring(0, 20) + "..."
    );

    // Generate expected signature using the same method
    const expectedSignature = await createSignature(
      headerB64,
      payloadB64,
      EXPO_PUBLIC_JWT_SECRET
    );

    // Compare signatures
    if (signatureB64 !== expectedSignature) {
      console.error(
        "JWT Signature Mismatch:",
        "Expected:",
        expectedSignature.substring(0, 10) + "...",
        "Got:",
        signatureB64.substring(0, 10) + "..."
      );
      throw new Error("Invalid signature");
    }

    // Decode payload
    const payload = JSON.parse(base64UrlDecode(payloadB64));

    // Check expiration
    const currentTime = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < currentTime) {
      throw new Error("Token expired");
    }

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
    return payload.exp * 1000 < Date.now();
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
