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
    // @ts-ignore
    const keyData = key._keyData;
    const hmacResult = await ExpoCrypto.hmacSha256Async(
      keyData.toString(),
      data.toString()
    );
    return Buffer.from(hmacResult, "hex");
  },

  // Verify implementation for HMAC
  async verify(
    algorithm: string | any,
    key: CryptoKey,
    signature: BufferSource,
    data: BufferSource
  ): Promise<boolean> {
    // @ts-ignore
    const keyData = key._keyData;
    const hmacResult = await ExpoCrypto.hmacSha256Async(
      keyData.toString(),
      data.toString()
    );
    const calculatedSignature = Buffer.from(hmacResult, "hex");
    const providedSignature = Buffer.from(signature.toString());

    return (
      calculatedSignature.toString("hex") === providedSignature.toString("hex")
    );
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
