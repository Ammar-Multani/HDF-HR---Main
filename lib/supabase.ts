import { createClient } from "@supabase/supabase-js";
import { EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY } from "@env";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

const AUTH_TOKEN_KEY = "auth_token";

// Cache configuration
const CACHE_PREFIX = "supabase_cache_";
const DEFAULT_CACHE_TIME = 5 * 60 * 1000; // 5 minutes in milliseconds
const MAX_CACHE_ITEMS = 200; // Limit total cache entries for large user base
const CACHE_PERFORMANCE_KEY = "cache_performance";

const supabaseUrl = EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Performance tracking
interface CachePerformanceMetrics {
  hits: number;
  misses: number;
  errors: number;
  avgResponseTime: number;
  totalRequests: number;
}

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

/**
 * Tracks cache performance metrics
 */
export const trackCachePerformance = async (
  isHit: boolean,
  responseTime: number,
  isError = false
): Promise<void> => {
  try {
    const metricsJson = await AsyncStorage.getItem(CACHE_PERFORMANCE_KEY);
    let metrics: CachePerformanceMetrics = metricsJson 
      ? JSON.parse(metricsJson) 
      : { hits: 0, misses: 0, errors: 0, avgResponseTime: 0, totalRequests: 0 };
    
    if (isError) {
      metrics.errors++;
    } else if (isHit) {
      metrics.hits++;
    } else {
      metrics.misses++;
    }
    
    metrics.totalRequests++;
    
    // Calculate rolling average
    metrics.avgResponseTime = 
      (metrics.avgResponseTime * (metrics.totalRequests - 1) + responseTime) / 
      metrics.totalRequests;
    
    await AsyncStorage.setItem(CACHE_PERFORMANCE_KEY, JSON.stringify(metrics));
    
    // Log slow queries (over 1 second)
    if (responseTime > 1000) {
      console.warn(`Slow query detected: ${responseTime}ms`);
    }
  } catch (err) {
    // Don't let metrics tracking interrupt normal operation
    console.warn("Failed to track cache metrics:", err);
  }
};

/**
 * Check network connectivity before making requests
 * This function is more reliable with a timeout
 */
export const isNetworkAvailable = async (): Promise<boolean> => {
  try {
    // Add a timeout to the network check
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(true), 3000); // Default to true after 3 seconds to prevent blocking
    });
    
    const networkCheckPromise = new Promise<boolean>(async (resolve) => {
      try {
        const state = await NetInfo.fetch();
        // Only return false if we're definitely offline
        resolve(!(state.isConnected === false && state.isInternetReachable === false));
      } catch (e) {
        // If there's any error checking connectivity, assume we're online
        console.warn("Error checking network:", e);
        resolve(true);
      }
    });
    
    // Race the timeout against the actual check
    return await Promise.race([networkCheckPromise, timeoutPromise]);
  } catch (error) {
    console.warn("Error in isNetworkAvailable:", error);
    // Default to true if there's any error in the check
    return true;
  }
};

/**
 * Enhanced cached fetch function for Supabase
 * This will cache the results of read operations to improve performance
 * 
 * @param fetchFn - Function that executes the Supabase query
 * @param cacheKey - Unique key to identify the cached data
 * @param options - Cache options
 */
export const cachedQuery = async <T>(
  fetchFn: () => Promise<{ data: T | null; error: any }>,
  cacheKey: string,
  options?: {
    cacheTtl?: number;
    forceRefresh?: boolean;
    criticalData?: boolean; // Flag for data that must be available
  }
): Promise<{ data: T | null; error: any; fromCache?: boolean }> => {
  const finalCacheKey = `${CACHE_PREFIX}${cacheKey}`;
  const { 
    cacheTtl = DEFAULT_CACHE_TIME, 
    forceRefresh = false,
    criticalData = false
  } = options || {};
  
  const startTime = Date.now();
  let fromCache = false;
  let error = null;
  
  // Limit cache size periodically
  await enforceCacheLimit();
  
  // Try to get data from cache first, unless forceRefresh is true
  if (!forceRefresh) {
    try {
      const cachedData = await AsyncStorage.getItem(finalCacheKey);
      
      if (cachedData) {
        const { data, timestamp } = JSON.parse(cachedData);
        const now = Date.now();
        
        // Check if cache is still valid (not expired)
        if (now - timestamp < cacheTtl) {
          fromCache = true;
          const responseTime = Date.now() - startTime;
          await trackCachePerformance(true, responseTime);
          return { data, error: null, fromCache: true };
        }
      }
    } catch (error) {
      console.warn("Error reading from cache:", error);
      // Continue to fetch from API if cache read fails
    }
  }
  
  // Check network before attempting fetch
  const networkAvailable = await isNetworkAvailable();
  
  // If network is unavailable and we have any cached data (even if expired),
  // return it for critical data
  if (!networkAvailable && criticalData) {
    try {
      const cachedData = await AsyncStorage.getItem(finalCacheKey);
      if (cachedData) {
        const { data } = JSON.parse(cachedData);
        console.log(`Network unavailable, using stale cache for: ${cacheKey}`);
        return { 
          data, 
          error: { message: "Using stale data due to network being unavailable" },
          fromCache: true 
        };
      }
    } catch (err) {
      // Continue if reading stale cache fails
    }
  }
  
  // Don't attempt to fetch if network is unavailable
  if (!networkAvailable) {
    const responseTime = Date.now() - startTime;
    await trackCachePerformance(false, responseTime, true);
    return { 
      data: null, 
      error: { message: "Network connection unavailable" }
    };
  }
  
  // Fetch fresh data from Supabase
  try {
    // Implement retry logic with exponential backoff for network resilience
    let attempts = 0;
    const maxAttempts = 3;
    let result;
    
    while (attempts < maxAttempts) {
      try {
        result = await fetchFn();
        break; // Exit loop if successful
      } catch (err) {
        attempts++;
        if (attempts >= maxAttempts) throw err;
        
        // Exponential backoff
        const delay = 1000 * Math.pow(2, attempts - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // If the fetch was successful, update the cache
    if (!result.error && result.data) {
      try {
        const cacheData = {
          data: result.data,
          timestamp: Date.now(),
        };
        await AsyncStorage.setItem(finalCacheKey, JSON.stringify(cacheData));
      } catch (error) {
        console.warn("Error saving to cache:", error);
        // Continue even if caching fails
      }
    } else {
      error = result.error;
    }
    
    const responseTime = Date.now() - startTime;
    await trackCachePerformance(false, responseTime, !!result.error);
    
    return result;
  } catch (error) {
    console.error("Error in cachedQuery:", error);
    const responseTime = Date.now() - startTime;
    await trackCachePerformance(false, responseTime, true);
    return { data: null, error };
  }
};

/**
 * Enforce cache size limit to prevent memory issues
 */
export const enforceCacheLimit = async (): Promise<void> => {
  try {
    // Only check occasionally to avoid performance impact (1 in 10 chance)
    if (Math.random() < 0.1) {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      
      if (cacheKeys.length > MAX_CACHE_ITEMS) {
        // Get creation timestamps for cache items to remove oldest
        const keyTimestamps = await Promise.all(
          cacheKeys.map(async (key) => {
            try {
              const value = await AsyncStorage.getItem(key);
              if (value) {
                const { timestamp } = JSON.parse(value);
                return { key, timestamp };
              }
              return { key, timestamp: Date.now() }; // Default to current time if parsing fails
            } catch {
              return { key, timestamp: Date.now() }; // Default to current time if retrieval fails
            }
          })
        );
        
        // Sort by timestamp (oldest first) and remove oldest 20% of items
        const sortedKeys = keyTimestamps
          .sort((a, b) => a.timestamp - b.timestamp)
          .map(item => item.key)
          .slice(0, Math.ceil(cacheKeys.length * 0.2));
        
        if (sortedKeys.length > 0) {
          await AsyncStorage.multiRemove(sortedKeys);
          console.log(`Removed ${sortedKeys.length} old cache items`);
        }
      }
    }
  } catch (error) {
    console.warn("Error enforcing cache limit:", error);
    // Don't let cache management disrupt normal operations
  }
};

/**
 * Clear a specific cache entry
 */
export const clearCache = async (cacheKey: string): Promise<void> => {
  try {
    if (cacheKey.includes('*')) {
      // Pattern matching for clearing multiple cache keys
      const pattern = cacheKey.replace('*', '');
      const keys = await AsyncStorage.getAllKeys();
      const matchingKeys = keys.filter(key => 
        key.startsWith(CACHE_PREFIX) && key.includes(pattern)
      );
      
      if (matchingKeys.length > 0) {
        await AsyncStorage.multiRemove(matchingKeys);
        console.log(`Cleared ${matchingKeys.length} cache entries matching: ${pattern}`);
      }
    } else {
      await AsyncStorage.removeItem(`${CACHE_PREFIX}${cacheKey}`);
    }
  } catch (error) {
    console.error("Error clearing cache:", error);
  }
};

/**
 * Clear all cache entries
 */
export const clearAllCache = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
      console.log(`Cleared ${cacheKeys.length} cache entries`);
    }
  } catch (error) {
    console.error("Error clearing all cache:", error);
  }
};

/**
 * Get cache performance metrics
 * Useful for monitoring and debugging
 */
export const getCacheMetrics = async (): Promise<CachePerformanceMetrics | null> => {
  try {
    const metricsJson = await AsyncStorage.getItem(CACHE_PERFORMANCE_KEY);
    if (metricsJson) {
      return JSON.parse(metricsJson);
    }
    return null;
  } catch (error) {
    console.error("Error getting cache metrics:", error);
    return null;
  }
};

/**
 * Reset cache performance metrics
 * Call this periodically (e.g., once per day) to reset stats
 */
export const resetCacheMetrics = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CACHE_PERFORMANCE_KEY);
  } catch (error) {
    console.error("Error resetting cache metrics:", error);
  }
};

/**
 * Prefetch commonly used data in the background
 * Call after login or during idle periods
 */
export const prefetchCommonData = async (): Promise<void> => {
  try {
    // Stagger prefetching to avoid overwhelming the device
    setTimeout(async () => {
      await cachedQuery(
        () => supabase
          .from("company")
          .select("id, company_name, active")
          .limit(25),
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
