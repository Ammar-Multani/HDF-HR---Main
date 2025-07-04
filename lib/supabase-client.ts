import {
  createClient,
  SupabaseClient,
  AuthFlowType,
} from "@supabase/supabase-js";
import { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } from "@env";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { poolConfig, queryConfig } from "./config/database";
import { Platform } from "react-native";

// Export all cache-related functionality
export * from "./services/cacheService";
export * from "./store/cacheStore";
export * from "./utils/networkUtils";
export * from "./utils/storageUtils";

// Import cachedQuery directly
import { cachedQuery } from "./services/cacheService";
import { isNetworkAvailable } from "./utils/networkUtils";

// Create Supabase client with enhanced configuration
const supabaseUrl = EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Enhanced session configuration
const AUTH_CONFIG = {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: Platform.OS === "web",
  storageKey: "auth_token_v2",
  flowType: "pkce" as AuthFlowType,
  debug: process.env.NODE_ENV === "development",
  storage: {
    ...AsyncStorage,
    setItem: async (key: string, value: string) => {
      try {
        // Store with timestamp for expiry checking
        const storageValue = JSON.stringify({
          value,
          timestamp: Date.now(),
        });

        await AsyncStorage.setItem(key, storageValue);

        // Backup critical auth data with retry mechanism
        if (key.includes("auth_token")) {
          const retryStorage = async (attempts = 3) => {
            try {
              await AsyncStorage.setItem("auth_backup_token", storageValue);
              // Only use localStorage on web platform
              if (Platform.OS === "web") {
                try {
                  window.localStorage.setItem(key, storageValue);
                } catch (e) {
                  // Ignore localStorage errors on web
                }
              }
            } catch (error) {
              if (attempts > 0) {
                await new Promise((resolve) => setTimeout(resolve, 1000));
                return retryStorage(attempts - 1);
              }
              throw error;
            }
          };
          await retryStorage();
        }
      } catch (error) {
        console.error("Storage error:", error);
      }
    },
    getItem: async (key: string) => {
      try {
        // Only try web localStorage on web platform
        if (Platform.OS === "web") {
          try {
            const webValue = window.localStorage.getItem(key);
            if (webValue) {
              const { value, timestamp } = JSON.parse(webValue);
              // Check if stored value is still valid (24 hours)
              if (Date.now() - timestamp <= 24 * 60 * 60 * 1000) {
                return value;
              }
              // Clean up expired value
              window.localStorage.removeItem(key);
            }
          } catch (e) {
            // Ignore localStorage errors on web
          }
        }

        const value = await AsyncStorage.getItem(key);
        if (value) {
          const { value: storedValue, timestamp } = JSON.parse(value);
          // Check if stored value is still valid (24 hours)
          if (Date.now() - timestamp <= 24 * 60 * 60 * 1000) {
            return storedValue;
          }
          // Clean up expired value
          await AsyncStorage.removeItem(key);
        }

        // Try backup if main token is missing
        if (key.includes("auth_token")) {
          const backupValue = await AsyncStorage.getItem("auth_backup_token");
          if (backupValue) {
            const { value: storedValue, timestamp } = JSON.parse(backupValue);
            if (Date.now() - timestamp <= 24 * 60 * 60 * 1000) {
              return storedValue;
            }
            await AsyncStorage.removeItem("auth_backup_token");
          }
        }
        return null;
      } catch (error) {
        console.error("Storage error:", error);
        return null;
      }
    },
    removeItem: async (key: string) => {
      try {
        const removeWithRetry = async (attempts = 3) => {
          try {
            await AsyncStorage.removeItem(key);
            if (key.includes("auth_token")) {
              await AsyncStorage.removeItem("auth_backup_token");
            }
            // Only use localStorage on web platform
            if (Platform.OS === "web") {
              try {
                window.localStorage.removeItem(key);
              } catch (e) {
                // Ignore localStorage errors on web
              }
            }
          } catch (error) {
            if (attempts > 0) {
              await new Promise((resolve) => setTimeout(resolve, 1000));
              return removeWithRetry(attempts - 1);
            }
            throw error;
          }
        };
        await removeWithRetry();
      } catch (error) {
        console.error("Storage error:", error);
      }
    },
  },
  lockAcquireTimeout: 15000,
  lockRefreshTimeout: 20000,
  retryAttempts: 3,
  autoRefreshThreshold: 60,
  sessionCheckInterval: 20000, // 20 seconds for responsive session checks
};

// Initialize client with platform-specific configurations
const platformConfig = Platform.select({
  web: {
    detectSessionInUrl: true,
    flowType: "pkce" as AuthFlowType,
  },
  default: {
    detectSessionInUrl: false,
    flowType: "pkce" as AuthFlowType,
    // Disable features that depend on document
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      storage: AsyncStorage,
      storageKey: "auth_token_v2",
      detectSessionInUrl: false,
    },
  },
});

// Initialize client with pooling and query configurations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  ...queryConfig,
  auth: {
    ...AUTH_CONFIG,
    ...platformConfig.auth,
    ...queryConfig.auth,
    // Only enable debug logs in development
    debug:
      process.env.NODE_ENV === "development" &&
      process.env.DEBUG_AUTH === "true",
  },
});

// Add connection pool monitoring
let activeConnections = 0;
const maxRetries = 3;

// Type for Supabase query result
type QueryResult<T> = {
  data: T | null;
  error: any;
};

// Enhanced query wrapper with connection management and retry logic
export const executeQuery = async <T>(
  queryFn: () => Promise<QueryResult<T>>,
  retryCount = 0,
  options: {
    requiresAuth?: boolean;
    bypassCache?: boolean;
    retryOnError?: boolean;
  } = {}
): Promise<QueryResult<T>> => {
  const {
    requiresAuth = false,
    bypassCache = false,
    retryOnError = true,
  } = options;

  try {
    // Check network availability
    if (!(await isNetworkAvailable())) {
      throw new Error("No network connection available");
    }

    // Check auth if required
    if (requiresAuth) {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Authentication required");
      }
    }

    if (activeConnections >= poolConfig.maxConnections) {
      throw new Error("Connection pool exhausted");
    }

    activeConnections++;
    const result = await queryFn();

    // Handle specific error cases
    if (result.error) {
      if (result.error.code === "PGRST301" && retryOnError) {
        // Token expired, try to refresh
        const {
          data: { session },
        } = await supabase.auth.refreshSession();
        if (session && retryCount < maxRetries) {
          return executeQuery(queryFn, retryCount + 1, options);
        }
      }
      throw result.error;
    }

    return result;
  } catch (error: any) {
    // Implement exponential backoff for retries
    if (retryCount < maxRetries && retryOnError) {
      const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return executeQuery(queryFn, retryCount + 1, options);
    }

    return { data: null, error };
  } finally {
    activeConnections--;
  }
};

// Type for company data
interface CompanyData {
  id: number;
  company_name: string;
  active: boolean;
}

/**
 * Prefetch commonly used data in the background
 * Call after login or during idle periods
 */
export const prefetchCommonData = async (): Promise<void> => {
  try {
    // Check if we have a valid session first
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) return;

    // Stagger prefetching to avoid overwhelming the connection pool
    setTimeout(async () => {
      await cachedQuery<{ data: CompanyData[] | null; error: any }>(
        async () => {
          const result = await executeQuery<CompanyData[]>(
            () =>
              Promise.resolve(
                supabase
                  .from("company")
                  .select("id, company_name, active")
                  .limit(25)
              ),
            0,
            { requiresAuth: true }
          );
          return {
            data: { data: result.data, error: result.error },
            error: null,
          };
        },
        "prefetch_companies",
        { cacheTtl: 15 * 60 * 1000 } // 15 minutes
      );
    }, 2000);

    // Prefetch any other important data with delays
  } catch (error) {
    console.warn("Background prefetch failed:", error);
    // Non-critical, so just log and continue
  }
};

// Add session monitoring with improved cleanup
supabase.auth.onAuthStateChange((event, session) => {
  console.log("Auth state change:", event);

  if (event === "SIGNED_OUT") {
    console.log("User signed out - cleaning up");

    // Only clear specific auth-related items
    const authKeysToRemove = [
      "FORCE_RELOAD_AFTER_SIGNOUT",
      "auth_token",
      "auth_check",
    ];

    // Don't clear session data on normal page refreshes
    if (!document.hidden) {
      AsyncStorage.multiRemove(authKeysToRemove).catch((err) =>
        console.warn("Error clearing auth data:", err)
      );
    }
  }
});
