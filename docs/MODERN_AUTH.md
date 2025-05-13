# Modern Authentication with Expo and Supabase

This guide explains the modern authentication system implemented in this project, which uses custom JWT authentication with Supabase Row Level Security (RLS).

## Overview

Our authentication system provides:

1. **Secure JWT Generation** - Using the `jose` library for standards-compliant JWT tokens
2. **Secure Token Storage** - Using `expo-secure-store` for encrypted token storage
3. **Token Expiration Management** - Automatic expiration checks and token refresh
4. **Efficient Data Fetching** - React Query integration for caching and optimized data access
5. **Row Level Security** - Working seamlessly with Supabase RLS policies

## Key Components

### 1. JWT Generation (utils/auth.ts)

We use the `jose` library to generate and verify JWT tokens:

```typescript
export const generateJWT = async (userData: {
  id: string;
  email: string;
  role?: string;
}): Promise<string> => {
  const secret = new TextEncoder().encode(EXPO_PUBLIC_JWT_SECRET);

  return await new SignJWT({
    email: userData.email,
    role: userData.role || "user",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(userData.id)
    .setIssuedAt()
    .setExpirationTime("24h")
    .setIssuer("hdfhr")
    .sign(secret);
};
```

### 2. Secure Token Storage (utils/auth.ts)

We use `expo-secure-store` to securely store authentication tokens:

```typescript
export const storeAuthToken = async (token: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  } catch (error) {
    console.error("Error storing auth token:", error);
    throw error;
  }
};
```

### 3. Authentication Client (lib/supabase.ts)

Our authentication client checks for token validity before making requests:

```typescript
export const getAuthenticatedClient = async () => {
  try {
    // Get valid token (handles expiration check)
    const token = await getValidToken();

    if (!token) {
      console.warn("No valid authentication token found");
      return supabase; // Return unauthenticated client if no token
    }

    // Create a client with JWT auth
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
  } catch (error) {
    console.error("Error getting authenticated client:", error);
    return supabase; // Return unauthenticated client on error
  }
};
```

### 4. React Query Integration (lib/query.tsx)

We use React Query to efficiently manage data fetching with authentication:

```typescript
export function useSupabaseQuery<T>(
  queryKey: any[],
  queryFn: SupabaseQueryFn<T>,
  options = {}
): UseQueryResult<T, PostgrestError> {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const client = await getAuthenticatedClient();
      const { data, error } = await queryFn(client);

      if (error) {
        throw error;
      }

      return data as T;
    },
    ...options,
  });
}
```

## Example Usage

### Fetching User Data

```jsx
import { useUser } from "../lib/query";

function UserProfile({ userId }) {
  const { data: user, isLoading, error } = useUser(userId);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <View>
      <Text>Name: {user.name}</Text>
      <Text>Email: {user.email}</Text>
    </View>
  );
}
```

### Updating User Data

```jsx
import { useUpdateUser } from "../lib/query";

function UpdateProfileForm({ userId }) {
  const updateUser = useUpdateUser();

  const handleSubmit = async (values) => {
    try {
      await updateUser.mutateAsync({
        id: userId,
        data: values,
      });
      alert("Profile updated successfully!");
    } catch (error) {
      alert("Error updating profile");
    }
  };

  return <Form onSubmit={handleSubmit}>{/* Form fields */}</Form>;
}
```

## Authentication Flow

1. **Login**: User enters credentials → Server validates → JWT generated with user info and role
2. **Token Storage**: JWT stored securely using expo-secure-store
3. **Request Authentication**: Each request retrieves the token, checks validity
4. **Automatic Refresh**: Expired tokens are detected and user is prompted to re-authenticate
5. **RLS Enforcement**: Supabase enforces Row Level Security based on JWT claims

## Benefits

- **Security**: Proper JWT implementation and secure storage
- **Performance**: Optimized data fetching with React Query
- **Maintainability**: Separation of concerns and clean abstractions
- **Developer Experience**: Simple hooks-based API for data fetching

## Row Level Security Integration

Our authentication system works seamlessly with Supabase RLS policies, which are defined in the `supabase/migrations/consolidated_rls_policies.sql` file. These policies enforce access rules based on JWT claims.
