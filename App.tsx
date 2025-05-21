import React, { useEffect, useCallback, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { AppNavigator } from "./navigation";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import { Alert, AppState, AppStateStatus, Platform } from "react-native";
import { initEmailService } from "./utils/emailService";
import {
  prefetchCommonData,
  clearAllCache,
  resetCacheMetrics,
} from "./lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFonts } from "expo-font";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Initialize EmailJS
initEmailService();

// Constants for cache management
const LAST_CACHE_RESET_KEY = "last_cache_reset";
const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const CACHE_METRICS_RESET_DAYS = 3; // Reset metrics every 3 days
const AUTH_CHECK_KEY = "auth_check"; // Key for auth pre-check

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [preAuthCheck, setPreAuthCheck] = useState<boolean | null>(null);

  // Load fonts
  const [fontsLoaded] = useFonts({
    "Poppins-Regular": require("./assets/fonts/Poppins-Regular.ttf"),
    "Poppins-Medium": require("./assets/fonts/Poppins-Medium.ttf"),
    "Poppins-SemiBold": require("./assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-Bold": require("./assets/fonts/Poppins-Bold.ttf"),
    "Poppins-Light": require("./assets/fonts/Poppins-Light.ttf"),
    "Poppins-Italic": require("./assets/fonts/Poppins-Italic.ttf"),
  });

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
            console.log("Using recent auth pre-check result:", state);
            setPreAuthCheck(state);
            setHasCheckedAuth(true);
            return;
          }
        }

        // Otherwise do a quick check for auth token
        const token = await AsyncStorage.getItem("auth_token");
        const isAuthenticated = !!token;

        // Store the result for future quick checks
        await AsyncStorage.setItem(
          AUTH_CHECK_KEY,
          JSON.stringify({
            state: isAuthenticated,
            timestamp: now,
          })
        );

        console.log("Fresh auth pre-check result:", isAuthenticated);
        setPreAuthCheck(isAuthenticated);
        setHasCheckedAuth(true);
      } catch (error) {
        console.error("Error in auth pre-check:", error);
        setHasCheckedAuth(true); // Continue anyway
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

      if (
        !lastResetStr ||
        now - parseInt(lastResetStr) > CACHE_METRICS_RESET_DAYS * ONE_DAY_MS
      ) {
        console.log("Performing periodic cache maintenance...");

        // Reset cache performance metrics periodically
        await resetCacheMetrics();

        // Store the timestamp of this reset
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

        // Different preparation based on auth state
        // If user is authenticated, we can begin prefetching data immediately
        if (preAuthCheck) {
          await Promise.all([
            performCacheMaintenance(),
            new Promise((resolve) => {
              // Delay prefetch slightly to prioritize UI rendering
              setTimeout(() => {
                prefetchCommonData().catch(console.warn);
                resolve(null);
              }, 2000);
            }),
          ]);
        } else {
          // If not authenticated, just do minimal preparation
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
    // Handle app state changes
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        // App came to foreground - good time to prefetch data
        try {
          // Prefetch common data after a slight delay to avoid interfering with UI
          setTimeout(async () => {
            await prefetchCommonData();
          }, 2000);
        } catch (error) {
          console.warn("Background prefetch error:", error);
        }
      }
    };

    // Subscribe to app state changes
    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    // Initial prefetch after delay - only if authenticated
    if (preAuthCheck) {
      setTimeout(async () => {
        try {
          await prefetchCommonData();
        } catch (error) {
          console.warn("Initial prefetch error:", error);
        }
      }, 5000);
    }

    // Clean up
    return () => {
      subscription.remove();
    };
  }, [preAuthCheck]);

  // Hide splash screen once the app is ready
  useEffect(() => {
    if (appIsReady && hasCheckedAuth && fontsLoaded) {
      const hideSplash = async () => {
        // Wait a moment to ensure auth context has initialized
        await new Promise((resolve) => setTimeout(resolve, 100));
        await SplashScreen.hideAsync();
      };
      hideSplash();
    }
  }, [appIsReady, hasCheckedAuth, fontsLoaded]);

  // Function to handle deep links
  const handleDeepLink = useCallback(async (event) => {
    const url = event.url;
    console.log("Deep link received:", url);

    // For password reset links
    if (url.includes("reset-password")) {
      try {
        // Parse the URL
        const { queryParams } = Linking.parse(url);
        console.log("Reset password params:", queryParams);

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
          <AuthProvider initialAuthState={preAuthCheck}>
            <StatusBar style="auto" />
            <AppNavigator />
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
