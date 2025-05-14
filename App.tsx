import React, { useEffect, useCallback } from "react";
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

    // Hide splash screen after the app is ready
    const hideSplash = async () => {
      await SplashScreen.hideAsync();
    };

    hideSplash();

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
