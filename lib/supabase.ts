import { createClient } from "@supabase/supabase-js";
import { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } from "@env";
import { getValidToken } from "../utils/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_TOKEN_KEY = "auth_token";

// Create Supabase client
export const supabase = createClient(
  EXPO_PUBLIC_SUPABASE_URL,
  EXPO_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

/**
 * Creates a Supabase client with the provided JWT token for authentication
 */
export function createAuthClient(jwt: string) {
  if (!jwt || typeof jwt !== 'string') {
    console.error('Invalid JWT token provided to createAuthClient:', jwt);
    throw new Error('Invalid JWT token');
  }
  
  console.log(`Creating Supabase client with authorization: Bearer ${jwt.substring(0, 10)}...`);
  
  try {
    return createClient(EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      },
    });
  } catch (error) {
    console.error('Error creating authenticated Supabase client:', error);
    throw error;
  }
}

/**
 * Gets an authenticated Supabase client with the JWT token
 * We need this for Row Level Security (RLS) policies to work
 */
export const getAuthenticatedClient = async () => {
  try {
    // Get a valid JWT token from secure storage
    const token = await getValidToken();
    
    if (!token) {
      console.error("No valid token available for authentication");
      throw new Error("Authentication required - please log in");
    }
    
    console.log("Setting up authenticated client with token");
    
    // IMPORTANT: Instead of setting a session, use the headers approach 
    // which is more reliable for custom JWT implementations
    const authClient = createClient(EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
    
    // Verify the client works by making a simple query
    try {
      const { data, error } = await authClient
        .from("company")
        .select("id")
        .limit(1);
        
      if (error) {
        console.error("Authentication test query failed:", error);
        throw error;
      }
      
      console.log("Authentication successful - RLS policies are working");
      return authClient;
    } catch (queryError: any) {
      console.error("Test query failed:", queryError);
      
      // Special handling for signature errors
      if (queryError.message?.includes("JWSInvalidSignature")) {
        throw new Error("JWT signature verification failed. The token was rejected by Supabase.");
      }
      
      throw queryError;
    }
  } catch (error: any) {
    console.error("Error getting authenticated client:", error);
    
    // Provide more specific error messages for common JWT issues
    if (error.message?.includes("JWSInvalidSignature")) {
      throw new Error("JWT signature verification failed. Please ensure your JWT secret matches Supabase's configuration.");
    } else if (error.message?.includes("JWT")) {
      throw new Error(`JWT authentication error: ${error.message}`);
    }
    
    throw error;
  }
};

/**
 * Gets the current auth token from AsyncStorage
 */
export const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error("Error getting auth token:", error);
    return null;
  }
};
