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
}

/**
 * Returns a Supabase client with authentication headers for RLS
 * Use this for all authenticated requests
 */
export const getAuthenticatedClient = async () => {
  const token = await getValidToken();

  if (!token) {
    console.warn("No valid token found, using unauthenticated client");
    return supabase;
  }

  return createAuthClient(token);
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
