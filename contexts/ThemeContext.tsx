import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { useColorScheme } from "react-native";
import {
  MD3LightTheme,
  MD3DarkTheme,
  Provider as PaperProvider,
  configureFonts,
} from "react-native-paper";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as NavigationBar from "expo-navigation-bar";

// Define the font configuration
const fontConfig = {
  fontFamily: "Poppins-Regular",
  fonts: {
    regular: {
      fontFamily: "Poppins-Regular",
    },
    medium: {
      fontFamily: "Poppins-Medium",
    },
    light: {
      fontFamily: "Poppins-Light",
    },
    thin: {
      fontFamily: "Poppins-Light",
    },
  },
};

// Define custom theme colors
const lightTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    // Main brand colors
    primary: "rgba(38,127,161,255)", // Logo's blue-teal color
    primaryLight: "rgba(38,127,161,0.8)", // Softer version for hover states
    primaryDark: "rgba(28,107,141,255)", // Darker version for active states
    secondary: "rgba(10,185,129,255)", // Logo's vibrant teal
    secondaryLight: "rgba(10,185,129,0.8)", // Softer version
    tertiary: "rgba(6,169,169,255)", // Logo's teal variant
    quaternary: "rgba(54,105,157,255)", // Logo's deeper blue
    quinary: "rgba(74,78,153,255)", // Logo's blue-purple
    senary: "rgba(94,52,149,255)", // Logo's purple

    // Background and surface colors
    background: "#FFFFFF",
    backgroundSecondary: "#F8F9FA",
    backgroundTertiary: "rgb(237, 250, 255)", // Subtle background variation using primary color with low opacity
    surface: "#FFFFFF",
    surfaceVariant: "#F8FAFC", // Subtle surface variation
    surfaceHover: "rgba(38,127,161,0.04)", // Very subtle hover state
    surfaceSelected: "rgba(38,127,161,0.08)", // Subtle selected state

    // Status colors
    success: "rgba(10,185,129,255)", // Using logo teal for success
    error: "#EF4444",
    warning: "#F59E0B",
    info: "rgba(38,127,161,255)", // Using primary for info

    // Text and content colors
    onSurface: "#1F2937",
    onSurfaceLight: "#374151", // Slightly lighter text
    onBackground: "#1F2937",
    onBackgroundLight: "#374151", // Slightly lighter text
    onSurfaceVariant: "#64748B",
    onSurfaceDisabled: "rgba(31,41,55,0.38)", // Disabled text
    text: "#0F172A",
    textSecondary: "#334155", // Secondary text color
    textTertiary: "#64748B", // Tertiary text color

    // Border and divider colors
    border: "#e0e0e0",
    divider: "#E2E8F0",
    outline: "#e0e0e0", // Subtle outline using primary

    // Navigation and system
    navigationBar: "#FFFFFF",
    statusBar: "#FFFFFF",
    elevation: "rgba(38,127,161,0.05)", // Very subtle shadow color
  },
  fonts: configureFonts({ config: fontConfig }),
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: "#3B82F6",
    secondary: "#38BDF8",
    tertiary: "#8B5CF6",
    background: "rgb(30, 30, 50)",
    backgroundTertiary: "rgb(237, 250, 255)",
    surface: "#1E293B",
    error: "#F87171",
    onSurface: "#F1F5F9",
    onBackground: "#F1F5F9",
    onSurfaceVariant: "#94A3B8",
    text: "#FFFFFF",
    navigationBar: "#1E293B",
  },
  fonts: configureFonts({ config: fontConfig }),
};

type ThemeType = "light" | "dark" | "system";

interface ThemeContextType {
  theme: typeof lightTheme | typeof darkTheme;
  themeType: ThemeType;
  setThemeType: (theme: ThemeType) => void;
  isDarkMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const colorScheme = useColorScheme();
  const [themeType, setThemeType] = useState<ThemeType>("light");

  useEffect(() => {
    // Load saved theme preference
    const loadTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem("themePreference");
        if (savedTheme) {
          setThemeType(savedTheme as ThemeType);
        }
      } catch (error) {
        console.error("Failed to load theme preference:", error);
      }
    };

    loadTheme();
  }, []);

  const setThemeTypeAndSave = async (newTheme: ThemeType) => {
    setThemeType(newTheme);
    try {
      await AsyncStorage.setItem("themePreference", newTheme);
    } catch (error) {
      console.error("Failed to save theme preference:", error);
    }
  };

  // Determine if dark mode based on theme type and system preference
  const isDarkMode =
    themeType === "dark" || (themeType === "system" && colorScheme === "dark");

  // Select the appropriate theme object
  const theme = isDarkMode ? darkTheme : lightTheme;

  // Update navigation bar when theme changes
  useEffect(() => {
    const updateNavigationBar = async () => {
      try {
        await NavigationBar.setBackgroundColorAsync(theme.colors.navigationBar);
        await NavigationBar.setButtonStyleAsync(isDarkMode ? "light" : "dark");
      } catch (error) {
        console.error("Failed to update navigation bar:", error);
      }
    };

    updateNavigationBar();
  }, [theme, isDarkMode]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeType,
        setThemeType: setThemeTypeAndSave,
        isDarkMode,
      }}
    >
      <PaperProvider theme={theme}>{children}</PaperProvider>
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
