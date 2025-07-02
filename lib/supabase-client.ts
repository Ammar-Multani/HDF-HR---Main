import "react-native-url-polyfill/auto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } from "@env";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { poolConfig, queryConfig } from "./config/database";

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

// Initialize client with pooling and query configurations
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: queryConfig.db,
  global: queryConfig.global,
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
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

// Enhanced query wrapper with connection management
export const executeQuery = async <T>(
  queryFn: () => Promise<QueryResult<T>>,
  retryCount = 0
): Promise<QueryResult<T>> => {
  try {
    if (activeConnections >= poolConfig.maxConnections) {
      throw new Error("Connection pool exhausted");
    }

    activeConnections++;
    const result = await queryFn();
    return result;
  } catch (error: any) {
    if (
      retryCount < maxRetries &&
      error.message === "Connection pool exhausted"
    ) {
      // Wait before retrying
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 * Math.pow(2, retryCount))
      );
      return executeQuery(queryFn, retryCount + 1);
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
    // Stagger prefetching to avoid overwhelming the connection pool
    setTimeout(async () => {
      await cachedQuery<{ data: CompanyData[] | null; error: any }>(
        async () => {
          const result = await executeQuery<CompanyData[]>(() =>
            Promise.resolve(
              supabase
                .from("company")
                .select("id, company_name, active")
                .limit(25)
            )
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
