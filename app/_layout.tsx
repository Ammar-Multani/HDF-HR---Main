import React, { useEffect, useCallback, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from 'expo-router';
import { AuthProvider } from "@contexts/AuthContext";
import { ThemeProvider } from "@contexts/ThemeContext";
import { LanguageProvider } from "@contexts/LanguageContext";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import { Alert, AppState, AppStateStatus, Platform } from "react-native";
import { initEmailService } from "@utils/emailService";
import {
  prefetchCommonData,
  clearAllCache,
  resetCacheMetrics,
} from "@lib/supabase";
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

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);
  const [preAuthCheck, setPreAuthCheck] = useState<boolean | null>(null);

  // Load fonts
  const [fontsLoaded] = useFonts({
    "Poppins-Regular": require("../assets/fonts/Poppins-Regular.ttf"),
    "Poppins-Medium": require("../assets/fonts/Poppins-Medium.ttf"),
    "Poppins-SemiBold": require("../assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-Bold": require("../assets/fonts/Poppins-Bold.ttf"),
    "Poppins-Light": require("../assets/fonts/Poppins-Light.ttf"),
    "Poppins-Italic": require("../assets/fonts/Poppins-Italic.ttf"),
  });

  // Fast pre-check for auth state to speed up app loading
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const lastCheck = await AsyncStorage.getItem(AUTH_CHECK_KEY);
        const now = Date.now();

        if (lastCheck) {
          const { state, timestamp } = JSON.parse(lastCheck);
          if (now - timestamp < 5 * 60 * 1000) {
            console.log("Using recent auth pre-check result:", state);
            setPreAuthCheck(state);
            setHasCheckedAuth(true);
            return;
          }
        }

        const token = await AsyncStorage.getItem("auth_token");
        const isAuthenticated = !!token;

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
        setHasCheckedAuth(true);
      }
    };

    checkAuthState();
  }, []);

  // Manage cache maintenance
  const performCacheMaintenance = async () => {
    try {
      const lastResetStr = await AsyncStorage.getItem(LAST_CACHE_RESET_KEY);
      const now = Date.now();

      if (
        !lastResetStr ||
        now - parseInt(lastResetStr) > CACHE_METRICS_RESET_DAYS * ONE_DAY_MS
      ) {
        console.log("Performing periodic cache maintenance...");
        await resetCacheMetrics();
        await AsyncStorage.setItem(LAST_CACHE_RESET_KEY, now.toString());
      }
    } catch (error) {
      console.warn("Cache maintenance error:", error);
    }
  };

  // Prepare app resources and data
  useEffect(() => {
    const prepare = async () => {
      try {
        if (!hasCheckedAuth) {
          return;
        }

        if (preAuthCheck) {
          await Promise.all([
            performCacheMaintenance(),
            new Promise((resolve) => {
              setTimeout(() => {
                prefetchCommonData().catch(console.warn);
                resolve(null);
              }, 2000);
            }),
          ]);
        } else {
          await performCacheMaintenance();
        }
      } catch (e) {
        console.warn("Error preparing app:", e);
      } finally {
        setAppIsReady(true);
      }
    };

    prepare();
  }, [hasCheckedAuth, preAuthCheck]);

  // Set up AppState listener for background/foreground transitions
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === "active") {
        try {
          setTimeout(async () => {
            await prefetchCommonData();
          }, 2000);
        } catch (error) {
          console.warn("Background prefetch error:", error);
        }
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);

    if (preAuthCheck) {
      setTimeout(async () => {
        try {
          await prefetchCommonData();
        } catch (error) {
          console.warn("Initial prefetch error:", error);
        }
      }, 5000);
    }

    return () => {
      subscription.remove();
    };
  }, [preAuthCheck]);

  // Hide splash screen once the app is ready
  useEffect(() => {
    if (appIsReady && hasCheckedAuth && fontsLoaded) {
      const hideSplash = async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        await SplashScreen.hideAsync();
      };
      hideSplash();
    }
  }, [appIsReady, hasCheckedAuth, fontsLoaded]);

  // Function to handle deep links
  const handleDeepLink = useCallback(async (event: { url: string }) => {
    const url = event.url;
    console.log("Deep link received:", url);

    if (url.includes("reset-password")) {
      try {
        const parsed = Linking.parse(url);
        const queryParams = parsed.queryParams;

        if (queryParams?.token) {
          // Handle reset password navigation in your route structure
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
    const subscription = Linking.addEventListener("url", handleDeepLink);

    const getInitialURL = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        handleDeepLink({ url: initialUrl });
      }
    };

    getInitialURL();

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
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(app)" options={{ headerShown: false }} />
            </Stack>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
} 