import { createClient } from "@supabase/supabase-js";
import { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } from "@env";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Export all cache-related functionality
export * from "./services/cacheService";
export * from "./store/cacheStore";
export * from "./utils/networkUtils";
export * from "./utils/storageUtils";

// Import cachedQuery directly
import { cachedQuery } from "./services/cacheService";
import { isNetworkAvailable } from "./utils/networkUtils";

// Create Supabase client
const supabaseUrl = EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Prefetch commonly used data in the background
 * Call after login or during idle periods
 */
export const prefetchCommonData = async (): Promise<void> => {
  try {
    // Stagger prefetching to avoid overwhelming the device
    setTimeout(async () => {
      await cachedQuery<any>(
        async () => {
          const result = await supabase
            .from("company")
            .select("id, company_name, active")
            .limit(25);

          return result;
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
