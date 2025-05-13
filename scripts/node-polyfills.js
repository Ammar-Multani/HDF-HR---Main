/**
 * Node.js polyfills for jose library (JWT handling)
 * This is a simplified version of utils/polyfills.ts for Node.js testing
 */

// Crypto is already available in Node.js, but we still need to configure
// proper polyfills for jose to work correctly in our testing environment

const crypto = require("crypto");

// Add subtle crypto polyfill for jose if it doesn't exist
if (
  typeof global.crypto === "undefined" ||
  typeof global.crypto.subtle === "undefined"
) {
  // Implement the basic WebCrypto API subset needed for jose HMAC-SHA256
  const subtle = {
    // HMAC key import
    async importKey(format, keyData, algorithm, extractable, keyUsages) {
      return {
        type: "secret",
        algorithm: { name: "HMAC", hash: { name: "SHA-256" } },
        extractable,
        usages: keyUsages,
        _keyMaterial: keyData,
      };
    },

    // HMAC signing
    async sign(algorithm, key, data) {
      // Convert BufferSource to Buffer if needed
      const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
      // Convert key._keyMaterial to Buffer if needed
      const keyBuffer = Buffer.isBuffer(key._keyMaterial)
        ? key._keyMaterial
        : Buffer.from(key._keyMaterial);

      // Create HMAC
      const hmac = crypto.createHmac("sha256", keyBuffer);
      hmac.update(dataBuffer);
      return Buffer.from(hmac.digest());
    },

    // HMAC verification
    async verify(algorithm, key, signature, data) {
      // Convert BufferSource to Buffer
      const dataBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
      const sigBuffer = Buffer.isBuffer(signature)
        ? signature
        : Buffer.from(signature);
      const keyBuffer = Buffer.isBuffer(key._keyMaterial)
        ? key._keyMaterial
        : Buffer.from(key._keyMaterial);

      // Create HMAC for verification
      const hmac = crypto.createHmac("sha256", keyBuffer);
      hmac.update(dataBuffer);
      const expectedSignature = hmac.digest();

      // Compare signatures
      return Buffer.compare(Buffer.from(expectedSignature), sigBuffer) === 0;
    },
  };

  // Add subtle crypto to global.crypto
  if (typeof global.crypto === "undefined") {
    global.crypto = {
      subtle,
      getRandomValues: (array) => {
        const bytes = crypto.randomBytes(array.length);
        array.set(bytes);
        return array;
      },
    };
  } else {
    global.crypto.subtle = subtle;
  }
}

// Ensure TextEncoder is available
if (typeof global.TextEncoder === "undefined") {
  global.TextEncoder = require("util").TextEncoder;
}

console.log("Node.js polyfills for jose loaded successfully");

module.exports = {};
