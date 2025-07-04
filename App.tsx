import React, { useEffect, useCallback, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AppNavigator } from "./navigation";
import { authLinking } from "./navigation/AuthNavigator";
import { NavigationContainer } from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import { Alert, AppState, AppStateStatus, Platform } from "react-native";
import { initEmailService } from "./utils/emailService";
import { logDebug } from "./utils/logger";
import {
  prefetchCommonData,
  clearAllCache,
  resetCacheMetrics,
  CACHE_PREFIX,
} from "./lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";
import { supabase } from "./lib/supabase";

// Navigation state key
const NAVIGATION_STATE_KEY = "@navigation_state";

// Types for deep linking
interface DeepLinkEvent {
  url: string;
}

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Initialize EmailJS
initEmailService();

// Constants for cache management
const LAST_CACHE_RESET_KEY = "last_cache_reset";
const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const CACHE_METRICS_RESET_DAYS = 3; // Reset metrics every 3 days
const AUTH_CHECK_KEY = "auth_check"; // Key for auth pre-check
const LOADING_TIMEOUT = 10000; // 10 seconds timeout for loading state
const INITIAL_LOAD_KEY = "initial_load_complete"; // Key to track initial load

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [preAuthCheck, setPreAuthCheck] = useState<boolean | null>(null);
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Load fonts
  const [fontsLoaded] = useFonts({
    "Poppins-Regular": require("./assets/fonts/Poppins-Regular.ttf"),
    "Poppins-Medium": require("./assets/fonts/Poppins-Medium.ttf"),
    "Poppins-SemiBold": require("./assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-Bold": require("./assets/fonts/Poppins-Bold.ttf"),
    "Poppins-Light": require("./assets/fonts/Poppins-Light.ttf"),
    "Poppins-Italic": require("./assets/fonts/Poppins-Italic.ttf"),
  });

  // Check if this is initial load
  useEffect(() => {
    const checkInitialLoad = async () => {
      try {
        const value = await AsyncStorage.getItem(INITIAL_LOAD_KEY);
        setIsInitialLoad(!value);
      } catch (error) {
        console.error("Error checking initial load:", error);
        setIsInitialLoad(true);
      }
    };
    checkInitialLoad();
  }, []);

  // Reset cache if loading takes too long - ONLY during initial load
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;

    const setupTimeout = async () => {
      if (!appIsReady && isInitialLoad) {
        // Double check if it's really initial load before setting timeout
        const value = await AsyncStorage.getItem(INITIAL_LOAD_KEY);
        if (!value) {
          timeoutId = setTimeout(async () => {
            console.warn("Initial loading timeout - clearing cache...");
            try {
              await clearAllCache();
              await AsyncStorage.removeItem(NAVIGATION_STATE_KEY);
              await AsyncStorage.removeItem(AUTH_CHECK_KEY);
              if (Platform.OS === "web") {
                window.location.reload();
              }
            } catch (error) {
              console.error("Error clearing cache on timeout:", error);
            }
          }, LOADING_TIMEOUT);
          setLoadingTimeout(timeoutId);
        }
      }
    };

    setupTimeout();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (loadingTimeout) {
        clearTimeout(loadingTimeout);
      }
    };
  }, [appIsReady, isInitialLoad]);

  // Mark initial load as complete when app becomes ready
  useEffect(() => {
    const markInitialLoadComplete = async () => {
      if (appIsReady && isInitialLoad) {
        try {
          await AsyncStorage.setItem(INITIAL_LOAD_KEY, "true");
          setIsInitialLoad(false);
        } catch (error) {
          console.error("Error marking initial load complete:", error);
        }
      }
    };
    markInitialLoadComplete();
  }, [appIsReady, isInitialLoad]);

  // Fast pre-check for auth state to speed up app loading
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        // First, check if we've already done this check recently
        const lastCheck = await AsyncStorage.getItem(AUTH_CHECK_KEY);
        const now = Date.now();

        if (lastCheck) {
          const { state, timestamp } = JSON.parse(lastCheck);
          // If check is recent (within 5 minutes), use it
          if (now - timestamp < 5 * 60 * 1000) {
            logDebug("Using recent auth pre-check result:", state);
            setPreAuthCheck(state);
            setHasCheckedAuth(true);
            return;
          }
        }

        // Otherwise do a quick check for auth token and verify with Supabase
        const token = await AsyncStorage.getItem("auth_token");
        let isAuthenticated = false;

        if (token) {
          // Verify the token with Supabase
          const { data } = await supabase.auth.getSession();
          isAuthenticated = !!data.session;

          // If token exists but session doesn't, clear the token
          if (!isAuthenticated) {
            await AsyncStorage.removeItem("auth_token");
          }
        }

        // Store the result for future quick checks
        await AsyncStorage.setItem(
          AUTH_CHECK_KEY,
          JSON.stringify({
            state: isAuthenticated,
            timestamp: now,
          })
        );

        logDebug("Fresh auth pre-check result:", isAuthenticated);
        setPreAuthCheck(isAuthenticated);
        setHasCheckedAuth(true);
      } catch (error) {
        console.error("Error in auth pre-check:", error);
        setHasCheckedAuth(true); // Continue anyway

        // Clear potentially corrupted auth state
        try {
          await AsyncStorage.removeItem(AUTH_CHECK_KEY);
          await AsyncStorage.removeItem("auth_token");
        } catch (e) {
          console.error("Error clearing auth state:", e);
        }
      }
    };

    checkAuthState();
  }, []);

  // Manage cache maintenance
  const performCacheMaintenance = async () => {
    try {
      // Check when we last reset cache metrics
      const lastResetStr = await AsyncStorage.getItem(LAST_CACHE_RESET_KEY);
      const now = Date.now();

      // Only perform maintenance if it hasn't been done in the last day
      // (reduced from 3 days to 1 day but made less aggressive)
      if (!lastResetStr || now - parseInt(lastResetStr) > ONE_DAY_MS) {
        logDebug("Performing periodic cache maintenance...");

        // Instead of resetting metrics, just clean up old entries
        const cacheKeys = await AsyncStorage.getAllKeys();
        const oldCacheKeys = cacheKeys.filter((key) => {
          return key.startsWith(CACHE_PREFIX) && key !== AUTH_CHECK_KEY;
        });

        // Only remove entries older than 1 day
        for (const key of oldCacheKeys) {
          try {
            const value = await AsyncStorage.getItem(key);
            if (value) {
              const { timestamp } = JSON.parse(value);
              if (now - timestamp > ONE_DAY_MS) {
                await AsyncStorage.removeItem(key);
              }
            }
          } catch (err) {
            // Ignore individual key errors
            console.warn(`Error processing cache key ${key}:`, err);
          }
        }

        // Store the timestamp of this maintenance
        await AsyncStorage.setItem(LAST_CACHE_RESET_KEY, now.toString());
      }
    } catch (error) {
      console.warn("Cache maintenance error:", error);
      // Non-critical, so continue app initialization
    }
  };

  // Prepare app resources and data
  useEffect(() => {
    const prepare = async () => {
      try {
        if (!hasCheckedAuth) {
          return; // Wait for auth check first
        }

        // Check if we need to force reload after sign-out
        const forceReload = await AsyncStorage.getItem(
          "FORCE_RELOAD_AFTER_SIGNOUT"
        );
        if (forceReload === "true") {
          // Clear the flag
          await AsyncStorage.removeItem("FORCE_RELOAD_AFTER_SIGNOUT");

          // For web, force a page reload
          if (Platform.OS === "web") {
            window.location.reload();
            return;
          } else {
            // For mobile, clear auth state
            const keys = await AsyncStorage.getAllKeys();
            const authKeys = keys.filter(
              (key) =>
                key.startsWith("supabase.auth.") ||
                key === "auth_token" ||
                key === "auth_check"
            );

            if (authKeys.length > 0) {
              await AsyncStorage.multiRemove(authKeys);
              await supabase.auth.initialize();
            }
          }
        }

        // Different preparation based on auth state
        // If user is authenticated, just do minimal preparation
        if (preAuthCheck) {
          await performCacheMaintenance();
        }
      } catch (e) {
        console.warn("Error preparing app:", e);
      } finally {
        // Mark app as ready
        setAppIsReady(true);
      }
    };

    prepare();
  }, [hasCheckedAuth, preAuthCheck]);

  // Set up AppState listener for background/foreground transitions
  useEffect(() => {
    let lastActiveTime = Date.now();

    // Handle app state changes
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        // Only update if app was in background for more than 5 minutes
        const now = Date.now();
        const backgroundTime = now - lastActiveTime;
        const STALE_DATA_THRESHOLD = 5 * 60 * 1000; // 5 minutes

        if (backgroundTime > STALE_DATA_THRESHOLD) {
          try {
            await performCacheMaintenance();
          } catch (error) {
            console.warn("Background maintenance error:", error);
          }
        }
      } else if (nextAppState === "background") {
        lastActiveTime = Date.now();
      }
    };

    // Subscribe to app state changes
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    // Clean up
    return () => {
      subscription.remove();
    };
  }, []);

  // Hide splash screen once the app is ready
  useEffect(() => {
    if (appIsReady && hasCheckedAuth && fontsLoaded) {
      SplashScreen.hideAsync().catch(console.warn);
    }
  }, [appIsReady, hasCheckedAuth, fontsLoaded]);

  // Function to handle deep links
  const handleDeepLink = useCallback(async (event: DeepLinkEvent) => {
    const url = event.url;
    logDebug("Deep link received:", url);

    // For password reset links
    if (url.includes("reset-password")) {
      try {
        // Parse the URL
        const parsed = Linking.parse(url);
        const queryParams = parsed.queryParams ?? {};

        // If token exists in URL, navigate to reset password screen
        if (queryParams.token) {
          // We'll use the navigationRef to navigate
          // This will be handled in AppNavigator
        } else {
          Alert.alert(
            "Invalid Link",
            "The password reset link is invalid or expired."
          );
        }
      } catch (error) {
        console.error("Error handling deep link:", error);
        Alert.alert("Error", "Could not process the password reset link.");
      }
    }
  }, []);

  useEffect(() => {
    // Set up deep link handlers
    const subscription = Linking.addEventListener("url", handleDeepLink);

    // Check for initial URL
    const getInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink({ url: initialUrl });
      }
    };

    getInitialURL();

    // Clean up
    return () => {
      subscription.remove();
    };
  }, [handleDeepLink]);

  // If not ready, show nothing
  if (!appIsReady || !hasCheckedAuth || !fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <AppNavigator />
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
      <StatusBar style="auto" />
    </SafeAreaProvider>
  );
}
