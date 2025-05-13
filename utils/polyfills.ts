/**
 * Global polyfills for Expo environment
 */

// Import crypto polyfill for jose library (JWT handling)
import "react-native-get-random-values";
import * as ExpoCrypto from "expo-crypto";
import { Buffer } from "buffer";

/**
 * Polyfill for structuredClone
 * This function provides a fallback for environments where structuredClone is not available
 */

// Polyfill for structuredClone
if (typeof global.structuredClone !== "function") {
  global.structuredClone = function (obj: any) {
    return JSON.parse(JSON.stringify(obj));
  };
}

// Polyfill Buffer
global.Buffer = global.Buffer || Buffer;

// Add hmacSha256Async function to ExpoCrypto if it doesn't exist
if (!ExpoCrypto.hmacSha256Async) {
  ExpoCrypto.hmacSha256Async = async (key: string, data: string): Promise<string> => {
    // Create a key from the secret
    const keyData = Buffer.from(key);
    const dataToSign = Buffer.from(data);

    // Use digestStringAsync with the key+data
    const result = await ExpoCrypto.digestStringAsync(
      ExpoCrypto.CryptoDigestAlgorithm.SHA256,
      dataToSign.toString() + keyData.toString()
    );
    
    return result;
  };
}

// Complete crypto polyfill implementation for jose
const subtle = {
  async digest(algorithm: string, data: BufferSource): Promise<ArrayBuffer> {
    const result = await ExpoCrypto.digestStringAsync(
      ExpoCrypto.CryptoDigestAlgorithm.SHA256,
      data.toString()
    );
    return Buffer.from(result, "hex");
  },

  // Implement required subtle crypto methods for jose
  async importKey(
    format: string,
    keyData: BufferSource | JsonWebKey,
    algorithm: string | any,
    extractable: boolean,
    keyUsages: string[]
  ): Promise<CryptoKey> {
    // Simple implementation that just stores the key data
    return {
      type: "secret",
      extractable,
      algorithm,
      usages: keyUsages,
      // @ts-ignore
      _keyData: keyData,
    };
  },

  // Sign implementation for HMAC
  async sign(
    algorithm: string | any,
    key: CryptoKey,
    data: BufferSource
  ): Promise<ArrayBuffer> {
    try {
      // @ts-ignore
      const keyData = key._keyData;
      const keyBuffer = Buffer.from(keyData.toString());
      const dataBuffer = Buffer.from(data.toString());
      
      // Use SHA-256 as a HMAC function
      const hmacResult = await ExpoCrypto.digestStringAsync(
        ExpoCrypto.CryptoDigestAlgorithm.SHA256,
        dataBuffer.toString('hex') + keyBuffer.toString('hex')
      );
      
      return Buffer.from(hmacResult, "hex");
    } catch (error) {
      console.error("Error in crypto.subtle.sign:", error);
      throw error;
    }
  },

  // Verify implementation for HMAC
  async verify(
    algorithm: string | any,
    key: CryptoKey,
    signature: BufferSource,
    data: BufferSource
  ): Promise<boolean> {
    try {
      // @ts-ignore
      const keyData = key._keyData;
      const keyBuffer = Buffer.from(keyData.toString());
      const dataBuffer = Buffer.from(data.toString());
      
      // Calculate the expected signature
      const hmacResult = await ExpoCrypto.digestStringAsync(
        ExpoCrypto.CryptoDigestAlgorithm.SHA256,
        dataBuffer.toString('hex') + keyBuffer.toString('hex')
      );
      
      const calculatedSignature = Buffer.from(hmacResult, "hex");
      const providedSignature = Buffer.from(signature.toString());
      
      // Compare signatures
      return calculatedSignature.toString("hex") === providedSignature.toString("hex");
    } catch (error) {
      console.error("Error in crypto.subtle.verify:", error);
      return false;
    }
  },
};

// Add crypto polyfill
if (typeof global.crypto === "undefined") {
  // @ts-ignore
  global.crypto = {
    getRandomValues: ExpoCrypto.getRandomValues,
    subtle: subtle,
  };
} else if (typeof global.crypto.subtle === "undefined") {
  // Just add the subtle property if crypto exists but subtle doesn't
  // @ts-ignore
  global.crypto.subtle = subtle;
}

export {};
