/**
 * JWT Testing Utility for React Native
 * 
 * This file provides functions to test JWT generation and validation
 * to help diagnose authentication issues with Supabase.
 */

import { generateJWT, verifyJWT, base64UrlDecode } from "./auth";
import { supabase } from "../lib/supabase";
import { Buffer } from "buffer";

/**
 * Test the JWT implementation
 * This function attempts to:
 * 1. Generate a valid JWT
 * 2. Verify it locally
 * 3. Check the format and claims
 */
export const testJWT = async (): Promise<boolean> => {
  try {
    console.log("Testing JWT implementation...");
    
    // Sample user data for testing
    const userData = {
      id: "test-user-id-123456789",
      email: "test@example.com",
      role: "authenticated",
    };
    
    // Step 1: Generate a JWT
    const token = await generateJWT(userData);
    console.log("Generated test token:", token.substring(0, 20) + "...");
    
    // Step 2: Analyze JWT structure
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error("Invalid token format - should have 3 parts separated by dots");
      return false;
    }
    
    try {
      // Decode header
      const headerJson = base64UrlDecode(parts[0]);
      const header = JSON.parse(headerJson);
      console.log("Header:", header);
      
      // Verify algorithm is correct
      if (header.alg !== "HS256") {
        console.error("Error: Algorithm should be 'HS256', found:", header.alg);
        return false;
      }
      
      // Decode payload
      const payloadJson = base64UrlDecode(parts[1]);
      const payload = JSON.parse(payloadJson);
      console.log("Payload:", payload);
      
      // Check required claims
      const requiredClaims = ["sub", "role", "iat", "exp", "iss"];
      const missingClaims = requiredClaims.filter(claim => !(claim in payload));
      
      if (missingClaims.length > 0) {
        console.error("Error: Missing required claims:", missingClaims.join(', '));
        return false;
      }
      
      // Check role claim is exactly "authenticated"
      if (payload.role !== "authenticated") {
        console.error(`Error: role should be 'authenticated', found: ${payload.role}`);
        return false;
      }
      
      // Verify token hasn't expired
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp < now) {
        console.error("Error: Token is expired");
        return false;
      }
      
      console.log("JWT structure and claims look good!");
      
      // Step 3: Verify the token locally
      const verificationResult = await verifyJWT(token);
      
      if (!verificationResult) {
        console.error("Error: Local token verification failed");
        return false;
      }
      
      console.log("Local token verification successful!");
      return true;
    } catch (error) {
      console.error("Error analyzing JWT:", error);
      return false;
    }
  } catch (error) {
    console.error("Error testing JWT:", error);
    return false;
  }
};

/**
 * Full JWT test with Supabase
 * This attempts to use the JWT with Supabase to verify it works end-to-end
 */
export const testJWTWithSupabase = async (): Promise<{
  success: boolean;
  message: string;
  details?: string;
}> => {
  try {
    // First run the local test
    const localTestResult = await testJWT();
    
    if (!localTestResult) {
      return {
        success: false,
        message: "Local JWT generation failed",
        details: "Check console logs for more details",
      };
    }
    
    // Generate a test token
    const userData = {
      id: "test-user-id-123456789",
      email: "test@example.com",
      role: "authenticated",
    };
    
    const token = await generateJWT(userData);
    
    // Try to use the token with Supabase
    try {
      // Create authenticated client
      const { data, error } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: "",
      });
      
      if (error) {
        return {
          success: false,
          message: "Failed to establish session with Supabase",
          details: error.message,
        };
      }
      
      // Try a simple query
      const { data: testData, error: queryError } = await supabase
        .from("test_table")
        .select("*")
        .limit(1);
      
      if (queryError) {
        // If it's a table not found error but not an auth error, that's actually good!
        if (queryError.code === "PGRST116" || 
            queryError.message.includes("does not exist") ||
            queryError.message.includes("not found")) {
          return {
            success: true,
            message: "JWT authentication successful with Supabase!",
            details: "The query failed because the test table doesn't exist, but authentication worked!",
          };
        }
        
        return {
          success: false,
          message: "JWT authentication succeeded but query failed",
          details: queryError.message,
        };
      }
      
      return {
        success: true,
        message: "JWT works correctly with Supabase!",
        details: `Retrieved ${testData?.length || 0} records from the test table`,
      };
    } catch (error) {
      return {
        success: false,
        message: "Error testing JWT with Supabase",
        details: error instanceof Error ? error.message : String(error),
      };
    }
  } catch (error) {
    return {
      success: false,
      message: "Error running JWT test",
      details: error instanceof Error ? error.message : String(error),
    };
  }
};
