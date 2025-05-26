import AsyncStorage from "@react-native-async-storage/async-storage";
import { CACHE_PREFIX, CACHE_PERFORMANCE_KEY } from "../store/cacheStore";

export const AUTH_TOKEN_KEY = "auth_token";

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
 * Enforce cache size limit to prevent memory issues
 */
export const enforceCacheLimit = async (maxItems: number): Promise<void> => {
  try {
    // Only check occasionally to avoid performance impact (1 in 10 chance)
    if (Math.random() < 0.1) {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      
      if (cacheKeys.length > maxItems) {
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
 * Save cache data to AsyncStorage
 */
export const saveToAsyncStorage = async <T>(key: string, data: T): Promise<void> => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(key, JSON.stringify(cacheData));
  } catch (error) {
    console.warn("Error saving to AsyncStorage:", error);
  }
};

/**
 * Get cache data from AsyncStorage
 */
export const getFromAsyncStorage = async <T>(key: string): Promise<{ data: T; timestamp: number } | null> => {
  try {
    const cachedData = await AsyncStorage.getItem(key);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    return null;
  } catch (error) {
    console.warn("Error reading from AsyncStorage:", error);
    return null;
  }
};

/**
 * Clear a specific cache entry from AsyncStorage
 */
export const clearAsyncStorageCache = async (cacheKey: string): Promise<void> => {
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
      await AsyncStorage.removeItem(cacheKey);
    }
  } catch (error) {
    console.error("Error clearing cache from AsyncStorage:", error);
  }
};

/**
 * Clear all cache entries from AsyncStorage
 */
export const clearAllAsyncStorageCache = async (): Promise<void> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
      console.log(`Cleared ${cacheKeys.length} cache entries from AsyncStorage`);
    }
  } catch (error) {
    console.error("Error clearing all cache from AsyncStorage:", error);
  }
};

/**
 * Reset cache performance metrics in AsyncStorage
 */
export const resetAsyncStorageCacheMetrics = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CACHE_PERFORMANCE_KEY);
  } catch (error) {
    console.error("Error resetting cache metrics in AsyncStorage:", error);
  }
}; 