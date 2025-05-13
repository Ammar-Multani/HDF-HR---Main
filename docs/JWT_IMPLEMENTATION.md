# JWT Implementation for Supabase Authentication

This document explains the JWT implementation used in this project for authentication with Supabase.

## Overview

We use a custom JWT implementation designed specifically to work with Supabase's authentication system. The implementation uses Expo's crypto functions to create standards-compliant JWT tokens.

## Key Components

### 1. JWT Generation

The JWT generation uses a custom HMAC-SHA256 implementation:

```typescript
export const generateJWT = async (userData: {
  id: string;
  email: string;
  role?: string;
}): Promise<string> => {
  // Create JWT header
  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  // Generate a unique token ID
  const tokenId = await generateTokenId();

  // Create JWT payload with all required claims
  const payload = {
    sub: userData.id,
    email: userData.email,
    role: "authenticated", // Use 'authenticated' as the role claim for Supabase
    app_role: userData.role || "user", // Store our app-specific role here
    iat: now, // Issued at
    exp: now + 24 * 60 * 60, // Expires in 24 hours
    nbf: now, // Valid from now
    jti: tokenId, // Unique token ID
    iss: "hdfhr", // Issuer
  };

  // Encode header and payload to base64url
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  // Create content to be signed
  const content = `${encodedHeader}.${encodedPayload}`;

  // Sign with our custom HMAC-SHA256 implementation
  const signature = await hmacSha256(EXPO_PUBLIC_JWT_SECRET, content);

  // Create the complete JWT
  return `${content}.${base64UrlEncode(signature)}`;
};
```

### 2. JWT Verification

JWT tokens are verified by checking the payload and token structure:

```typescript
export const verifyJWT = async (token: string): Promise<any> => {
  // Split the token into its parts
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid token format");
  }

  const [headerB64, payloadB64, signatureB64] = parts;

  // Decode the payload
  const payloadJson = base64UrlDecode(payloadB64);
  const payload = JSON.parse(payloadJson);

  // Verify token expiration and claims
  // ...

  return payload;
};
```

## Previous Issue: JWSInvalidSignature

The application was experiencing a `JWSInvalidSignature` error when using custom JWT authentication with Supabase. This occurred because:

1. The previous implementation used `SHA-256` for signing, while Supabase expected `HMAC-SHA256`
2. The jose library had compatibility issues with React Native's Expo crypto implementation
3. Some standard security JWT claims were missing

## Solution Implemented

1. **Custom HMAC Implementation**: Created a simplified yet effective HMAC-SHA256 function
2. **Fixed payload structure**: Using "authenticated" for the role claim and app_role for app-specific roles
3. **Added comprehensive security claims**:
   - `iat` (issued at) - When the token was issued
   - `exp` (expiration time) - When the token expires
   - `nbf` (not before) - When the token becomes valid
   - `jti` (JWT ID) - Unique identifier for the token
   - `iss` (issuer) - Who issued the token
   - `sub` (subject) - The user ID
4. **Added proper base64url encoding/decoding**
5. **Added better error handling and debugging**

## JWT Structure

1. **Header**: Contains algorithm (HS256) and token type
2. **Payload**: Contains all claims about the user and token validity
3. **Signature**: HMAC-SHA256 signature of header and payload

## Supabase Configuration Requirements

- JWT secret in Supabase must exactly match `EXPO_PUBLIC_JWT_SECRET`
- JWT Settings should be configured to use 'sub' claim for user ID
- Using HS256 algorithm is required
- Role should be set to "authenticated" in JWT claims

## Testing

A test script is provided in `scripts/test-jwt-simple.js` to verify JWT generation and authentication with Supabase:

1. Generates a token using our implementation
2. Verifies it locally
3. Makes an authenticated request to Supabase
4. Confirms successful authentication

## Security Best Practices Implemented

1. Short-lived tokens (24 hours max)
2. Complete set of security claims
3. Unique token IDs (jti claim)
4. Proper error handling
5. Issuer verification
6. Proper base64url encoding

## References

- [JWT.io](https://jwt.io/)
- [Supabase JWT Documentation](https://supabase.com/docs/guides/auth/auth-jwt)
- [JWT Best Practices (IETF)](https://datatracker.ietf.org/doc/html/draft-ietf-oauth-jwt-bcp-07)
