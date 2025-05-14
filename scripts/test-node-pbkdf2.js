/**
 * Simple test for PBKDF2 using Node's crypto
 */
const crypto = require("crypto");

// Simple test function
function testPbkdf2() {
  console.log("Testing PBKDF2 password hashing");

  // Test parameters
  const password = "MySecurePassword123";
  const salt = crypto.randomBytes(16).toString("hex");
  const iterations = 10000;
  const keylen = 32;
  const digest = "sha256";

  console.log(`Password: ${password}`);
  console.log(`Salt: ${salt}`);
  console.log(`Iterations: ${iterations}`);

  // Test hash creation
  console.log("\nHashing password...");
  crypto.pbkdf2(
    password,
    salt,
    iterations,
    keylen,
    digest,
    (err, derivedKey) => {
      if (err) {
        console.error("Error:", err);
        return;
      }

      const hash = derivedKey.toString("hex");
      console.log(`Derived key: ${hash}`);

      // Format the complete hash as iterations:salt:hash
      const fullHash = `${iterations}:${salt}:${hash}`;
      console.log(`\nComplete hash for storage: ${fullHash}`);

      // Test verification
      console.log("\nVerifying password...");

      // Parse the stored hash
      const [storedIterations, storedSalt, storedHash] = fullHash.split(":");

      // Re-derive the key with the same parameters
      crypto.pbkdf2(
        password,
        storedSalt,
        parseInt(storedIterations, 10),
        keylen,
        digest,
        (err, verifyKey) => {
          if (err) {
            console.error("Verification error:", err);
            return;
          }

          const verifyHash = verifyKey.toString("hex");
          const isValid = verifyHash === storedHash;

          console.log(`Password valid: ${isValid ? "YES ✓" : "NO ✗"}`);

          // Test wrong password
          console.log("\nTesting with wrong password...");
          crypto.pbkdf2(
            "WrongPassword123",
            storedSalt,
            parseInt(storedIterations, 10),
            keylen,
            digest,
            (err, wrongKey) => {
              if (err) {
                console.error("Error:", err);
                return;
              }

              const wrongHash = wrongKey.toString("hex");
              const isWrongValid = wrongHash === storedHash;

              console.log(
                `Wrong password valid: ${isWrongValid ? "YES (BAD!)" : "NO (GOOD!) ✓"}`
              );
              console.log("\nTest completed");
            }
          );
        }
      );
    }
  );
}

// Run the test
testPbkdf2();
