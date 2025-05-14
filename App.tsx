import React, { useEffect, useCallback, useState } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppNavigator } from "./navigation";
import * as SplashScreen from "expo-splash-screen";
import * as Linking from "expo-linking";
import { Alert } from "react-native";
import { initEmailService } from "./utils/emailService";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Initialize EmailJS
initEmailService();

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);

  // Prepare app resources and data
  useEffect(() => {
    const prepare = async () => {
      try {
        // Perform any initialization tasks here
        // This runs in parallel with AuthProvider initialization
        await Promise.all([
          // Add any other async initialization here if needed
          new Promise((resolve) => setTimeout(resolve, 50)), // Small delay to ensure UI is ready
        ]);
      } catch (e) {
        console.warn("Error preparing app:", e);
      } finally {
        // Mark app as ready
        setAppIsReady(true);
      }
    };

    prepare();
  }, []);

  // Hide splash screen once the app is ready
  useEffect(() => {
    if (appIsReady) {
      const hideSplash = async () => {
        await SplashScreen.hideAsync();
      };
      hideSplash();
    }
  }, [appIsReady]);

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

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppNavigator />
          <StatusBar style="auto" />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
