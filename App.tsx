import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AppNavigator } from "./navigation";
import * as SplashScreen from "expo-splash-screen";
import { QueryProvider } from "./lib/query";

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  useEffect(() => {
    // Hide splash screen after the app is ready
    const hideSplash = async () => {
      await SplashScreen.hideAsync();
    };

    // You can add any initialization logic here
    // For example, loading fonts, checking auth state, etc.
    hideSplash();
  }, []);

  return (
    <QueryProvider>
      <AuthProvider>
        <SafeAreaProvider>
          <ThemeProvider>
            <AppNavigator />
            <StatusBar style="auto" />
          </ThemeProvider>
        </SafeAreaProvider>
      </AuthProvider>
    </QueryProvider>
  );
}
