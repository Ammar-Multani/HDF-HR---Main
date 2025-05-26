import AsyncStorage from "@react-native-async-storage/async-storage";
import { 
  useCacheStore, 
  CACHE_PREFIX, 
  DEFAULT_CACHE_TIME, 
  MAX_CACHE_ITEMS,
  CachePerformanceMetrics
} from "../store/cacheStore";
import { isNetworkAvailable } from "../utils/networkUtils";
import { 
  enforceCacheLimit, 
  saveToAsyncStorage, 
  getFromAsyncStorage,
  clearAsyncStorageCache,
  clearAllAsyncStorageCache,
  resetAsyncStorageCacheMetrics
} from "../utils/storageUtils";

/**
 * Tracks cache performance metrics
 */
export const trackCachePerformance = async (
  isHit: boolean,
  responseTime: number,
  isError = false
): Promise<void> => {
  try {
    // Update Zustand store metrics
    useCacheStore.getState().updateMetrics(isHit, responseTime, isError);
  } catch (err) {
    // Don't let metrics tracking interrupt normal operation
    console.warn("Failed to track cache metrics:", err);
  }
};

/**
 * Enhanced cached fetch function for Supabase using Zustand for in-memory caching
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
    persistToStorage?: boolean; // Whether to also persist to AsyncStorage
  }
): Promise<{ data: T | null; error: any; fromCache?: boolean }> => {
  const finalCacheKey = `${CACHE_PREFIX}${cacheKey}`;
  const { 
    cacheTtl = DEFAULT_CACHE_TIME, 
    forceRefresh = false,
    criticalData = false,
    persistToStorage = true
  } = options || {};
  
  const startTime = Date.now();
  let fromCache = false;
  let error = null;
  
  // Try to get data from Zustand cache first, unless forceRefresh is true
  if (!forceRefresh) {
    const cachedEntry = useCacheStore.getState().getCache<T>(finalCacheKey);
    
    if (cachedEntry) {
      const { data, timestamp } = cachedEntry;
      const now = Date.now();
      
      // Check if cache is still valid (not expired)
      if (now - timestamp < cacheTtl) {
        fromCache = true;
        const responseTime = Date.now() - startTime;
        await trackCachePerformance(true, responseTime);
        return { data, error: null, fromCache: true };
      }
    }
    
    // If not in Zustand cache, try AsyncStorage as fallback
    if (persistToStorage) {
      try {
        const cachedData = await getFromAsyncStorage<T>(finalCacheKey);
        
        if (cachedData) {
          const { data, timestamp } = cachedData;
          const now = Date.now();
          
          // Check if cache is still valid (not expired)
          if (now - timestamp < cacheTtl) {
            // Also update Zustand cache for future fast access
            useCacheStore.getState().setCache(finalCacheKey, data);
            
            fromCache = true;
            const responseTime = Date.now() - startTime;
            await trackCachePerformance(true, responseTime);
            return { data, error: null, fromCache: true };
          }
        }
      } catch (error) {
        console.warn("Error reading from AsyncStorage cache:", error);
        // Continue to fetch from API if cache read fails
      }
    }
  }
  
  // Check network before attempting fetch
  const networkAvailable = await isNetworkAvailable();
  
  // If network is unavailable and we have any cached data (even if expired),
  // return it for critical data
  if (!networkAvailable && criticalData) {
    // First check Zustand cache
    const cachedEntry = useCacheStore.getState().getCache<T>(finalCacheKey);
    if (cachedEntry) {
      const { data } = cachedEntry;
      console.log(`Network unavailable, using stale Zustand cache for: ${cacheKey}`);
      return { 
        data, 
        error: { message: "Using stale data due to network being unavailable" },
        fromCache: true 
      };
    }
    
    // Then try AsyncStorage as fallback
    if (persistToStorage) {
      try {
        const cachedData = await getFromAsyncStorage<T>(finalCacheKey);
        if (cachedData) {
          const { data } = cachedData;
          console.log(`Network unavailable, using stale AsyncStorage cache for: ${cacheKey}`);
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
    let result: { data: T | null; error: any } | undefined;
    
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
    
    // Ensure result is defined
    if (!result) {
      const responseTime = Date.now() - startTime;
      await trackCachePerformance(false, responseTime, true);
      return { data: null, error: { message: "Failed to fetch data after retries" } };
    }
    
    // If the fetch was successful, update the caches
    if (!result.error && result.data) {
      // Update Zustand cache
      useCacheStore.getState().setCache(finalCacheKey, result.data);
      
      // Also update AsyncStorage if persistToStorage is true
      if (persistToStorage) {
        await saveToAsyncStorage(finalCacheKey, result.data);
        
        // Occasionally clean up old cache entries
        await enforceCacheLimit(MAX_CACHE_ITEMS);
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
 * Clear a specific cache entry
 */
export const clearCache = async (cacheKey: string): Promise<void> => {
  try {
    const finalCacheKey = `${CACHE_PREFIX}${cacheKey}`;
    
    if (cacheKey.includes('*')) {
      // Pattern matching for clearing multiple cache keys
      const pattern = cacheKey.replace('*', '');
      
      // Clear from Zustand
      const zustandCache = useCacheStore.getState().cache;
      const zustandKeys = Object.keys(zustandCache);
      const matchingZustandKeys = zustandKeys.filter(key => key.includes(pattern));
      
      matchingZustandKeys.forEach(key => {
        useCacheStore.getState().removeCache(key);
      });
      
      // Clear from AsyncStorage
      await clearAsyncStorageCache(cacheKey);
    } else {
      // Clear from Zustand
      useCacheStore.getState().removeCache(finalCacheKey);
      
      // Clear from AsyncStorage
      await clearAsyncStorageCache(finalCacheKey);
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
    // Clear Zustand cache
    useCacheStore.getState().clearAllCache();
    
    // Clear AsyncStorage cache
    await clearAllAsyncStorageCache();
  } catch (error) {
    console.error("Error clearing all cache:", error);
  }
};

/**
 * Get cache performance metrics
 * Useful for monitoring and debugging
 */
export const getCacheMetrics = async (): Promise<CachePerformanceMetrics> => {
  // Return Zustand metrics which are always up-to-date
  return useCacheStore.getState().metrics;
};

/**
 * Reset cache performance metrics
 * Call this periodically (e.g., once per day) to reset stats
 */
export const resetCacheMetrics = async (): Promise<void> => {
  try {
    // Reset Zustand metrics
    useCacheStore.getState().resetMetrics();
    
    // Reset AsyncStorage metrics
    await resetAsyncStorageCacheMetrics();
  } catch (error) {
    console.error("Error resetting cache metrics:", error);
  }
}; 