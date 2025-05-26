import { create } from "zustand";

// Cache configuration
export const CACHE_PREFIX = "supabase_cache_";
export const DEFAULT_CACHE_TIME = 10 * 60 * 1000; // 10 minutes
export const MAX_CACHE_ITEMS = 300;
export const CACHE_PERFORMANCE_KEY = "cache_performance";
export const SLOW_QUERY_THRESHOLD = 3000; // 3 seconds

// Cache entry interface
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Performance tracking
export interface CachePerformanceMetrics {
  hits: number;
  misses: number;
  errors: number;
  avgResponseTime: number;
  totalRequests: number;
}

// Zustand store for in-memory caching
interface CacheStore {
  cache: Record<string, CacheEntry<any>>;
  metrics: CachePerformanceMetrics;
  setCache: <T>(key: string, data: T) => void;
  getCache: <T>(key: string) => CacheEntry<T> | undefined;
  removeCache: (key: string) => void;
  clearAllCache: () => void;
  updateMetrics: (isHit: boolean, responseTime: number, isError?: boolean) => void;
  resetMetrics: () => void;
}

// Create Zustand store
export const useCacheStore = create<CacheStore>((set, get) => ({
  cache: {},
  metrics: {
    hits: 0,
    misses: 0,
    errors: 0,
    avgResponseTime: 0,
    totalRequests: 0
  },
  setCache: <T>(key: string, data: T) => {
    set((state) => {
      const newCache = { ...state.cache };
      newCache[key] = {
        data,
        timestamp: Date.now()
      };
      
      // Enforce in-memory cache size limit
      const keys = Object.keys(newCache);
      if (keys.length > MAX_CACHE_ITEMS) {
        // Find oldest entries
        const oldestKeys = keys
          .map(k => ({ key: k, timestamp: newCache[k].timestamp }))
          .sort((a, b) => a.timestamp - b.timestamp)
          .slice(0, Math.ceil(keys.length * 0.2))
          .map(item => item.key);
          
        // Remove oldest entries
        oldestKeys.forEach(k => {
          delete newCache[k];
        });
      }
      
      return { cache: newCache };
    });
  },
  getCache: <T>(key: string): CacheEntry<T> | undefined => {
    return get().cache[key];
  },
  removeCache: (key: string) => {
    set((state) => {
      const newCache = { ...state.cache };
      delete newCache[key];
      return { cache: newCache };
    });
  },
  clearAllCache: () => {
    set({ cache: {} });
  },
  updateMetrics: (isHit: boolean, responseTime: number, isError = false) => {
    set((state) => {
      const metrics = { ...state.metrics };
      
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
      
      return { metrics };
    });
  },
  resetMetrics: () => {
    set({
      metrics: {
        hits: 0,
        misses: 0,
        errors: 0,
        avgResponseTime: 0,
        totalRequests: 0
      }
    });
  }
})); 