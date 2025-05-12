import { createClient } from "@supabase/supabase-js";
import { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } from "@env";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_TOKEN_KEY = "auth_token";

const supabaseUrl = EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Create Supabase client without auth configuration
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Returns a Supabase client with authentication headers
 * Use this for all authenticated requests
 */
export const getAuthenticatedClient = async () => {
  try {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);

    if (!token) {
      console.warn("No authentication token found");
      return supabase; // Return unauthenticated client if no token
    }

    console.log("Creating authenticated client with JWT token");

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
