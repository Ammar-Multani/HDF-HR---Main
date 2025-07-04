import { SupabaseClientOptions } from "@supabase/supabase-js";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Custom type definitions for pool configuration
interface PoolConfig {
  maxConnections: number;
  minConnections: number;
  idleTimeoutMillis: number;
  connectionTimeoutMillis: number;
  maxUses: number;
  maxLifetimeSeconds: number;
}

// Import only ClientConfig from supabase
type ClientConfig = SupabaseClientOptions<"public">;

export const poolConfig: PoolConfig = {
  maxConnections: 20, // Maximum number of connections in the pool
  minConnections: 4, // Minimum number of connections to maintain
  idleTimeoutMillis: 10000, // How long a connection can remain idle (10 seconds)
  connectionTimeoutMillis: 5000, // Connection acquisition timeout (5 seconds)
  maxUses: 7500, // Maximum number of times to use a connection before recycling
  maxLifetimeSeconds: 3600, // Maximum lifetime of a connection (1 hour)
};

export const queryConfig: ClientConfig = {
  auth: Platform.select({
    web: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    default: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storage: AsyncStorage,
    },
  }),
  db: {
    schema: "public",
  },
  global: {
    headers: {
      "x-app-version": process.env.APP_VERSION || "1.0.0",
    },
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      const timeout = 30000; // 30 second timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      return fetch(input, {
        ...init,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));
    },
  },
};
