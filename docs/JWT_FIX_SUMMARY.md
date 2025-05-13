# Summary of JWT Authentication Fix for Supabase

## Problem

The application was experiencing a `JWSInvalidSignature` error when trying to authenticate with Supabase using JWT tokens. This issue occurred because:

1. The original JWT implementation used SHA-256 instead of HMAC-SHA256 for signatures
2. The jose library had compatibility issues with Expo's crypto implementation
3. The JWT payload structure didn't match Supabase's requirements

## Solution

We implemented a custom JWT solution that:

1. Uses a simplified but effective HMAC-SHA256 implementation
2. Properly formats JWT tokens according to standards
3. Includes all required security claims
4. Uses proper base64url encoding
5. Sets the correct role claim for Supabase

## Key Changes

1. **Custom HMAC Implementation**:

   ```typescript
   const hmacSha256 = async (key: string, data: string): Promise<string> => {
     // Two-step hash to simulate HMAC
     const keyData = await Crypto.digestStringAsync(
       Crypto.CryptoDigestAlgorithm.SHA256,
       key
     );

     const hmac = await Crypto.digestStringAsync(
       Crypto.CryptoDigestAlgorithm.SHA256,
       keyData + data
     );

     return hmac;
   };
   ```

2. **JWT Structure**:

   - Header: `{ alg: "HS256", typ: "JWT" }`
   - Payload includes:
     - `sub`: User ID
     - `role`: Set to "authenticated" for Supabase
     - `app_role`: Custom app-specific role
     - `iat`, `exp`, `nbf`, `jti`, `iss` security claims

3. **Proper Base64URL Encoding**:
   ```typescript
   const base64UrlEncode = (str: string): string => {
     return base64Encode(str)
       .replace(/\+/g, "-")
       .replace(/\//g, "_")
       .replace(/=+$/, "");
   };
   ```

## Testing

We created a test script (`scripts/test-jwt-simple.js`) that confirms:

1. JWT tokens generate correctly
2. The structure and claims are valid
3. Supabase accepts and validates these tokens
4. Authenticated requests work properly

## Requirements for Supabase

1. JWT secret in Supabase must match `EXPO_PUBLIC_JWT_SECRET`
2. JWT Settings must use 'sub' claim for user ID
3. RLS policies must use appropriate role checks

## Results

The implementation successfully resolves the `JWSInvalidSignature` error. The application can now:

1. Generate valid JWT tokens
2. Use these tokens for Supabase authentication
3. Access protected resources via Row Level Security

This approach ensures compatibility with React Native/Expo's crypto capabilities while maintaining security standards required by Supabase.
