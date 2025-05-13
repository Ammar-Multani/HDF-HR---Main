import { generateJWT, verifyJWT } from "./auth";

export async function testJWT() {
  try {
    console.log("Testing JWT generation...");

    const userData = {
      id: "9b493703-31b0-406a-9be2-6a991448a245",
      email: "test@example.com",
      role: "superadmin",
    };

    const token = await generateJWT(userData);
    console.log("JWT generation successful:", token.substring(0, 20) + "...");

    const decoded = await verifyJWT(token);
    console.log("JWT verification successful:", decoded);

    return true;
  } catch (error) {
    console.error("JWT test failed:", error);
    return false;
  }
}
