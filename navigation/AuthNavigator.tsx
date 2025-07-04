import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { t } from "i18next";
import { useAuth } from "../contexts/AuthContext";
import * as Linking from "expo-linking";
import { LinkingOptions } from "@react-navigation/native";

// Auth Screens
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/auth/ResetPasswordScreen";

// Define the auth stack param list type
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: { token?: string; type?: string };
};

// Stack navigator
const AuthStack = createNativeStackNavigator<AuthStackParamList>();

// Parse Supabase URL format (converts # to ? for proper parameter parsing)
const parseSupabaseUrl = (url: string) => {
  // If URL contains a hash fragment, we need to handle it properly for auth flows
  if (url.includes("#")) {
    // For recovery flow, preserve the hash fragment as it's needed by Supabase Auth
    if (url.includes("type=recovery") || url.includes("access_token=")) {
      console.log("Deep link received:", url);
      return url;
    }
    // For other cases, convert # to ? for proper URL parsing
    return url.replace("#", "?");
  }
  return url;
};

// Export the linking configuration to be used by the root navigator
export const authLinking: LinkingOptions<AuthStackParamList> = {
  prefixes: [
    Linking.createURL("/"),
    "https://hdf-hr.vercel.app",
    "http://localhost:8081", // For local development
  ],
  config: {
    screens: {
      ResetPassword: {
        path: "auth/reset-password",
        parse: {
          token: (token: string) => token,
          type: (type: string) => type,
        },
      },
      Login: "auth/login",
      Register: "auth/register",
      ForgotPassword: "auth/forgot-password",
    },
  },
  getInitialURL: async () => {
    try {
      const url = await Linking.getInitialURL();
      if (url != null) {
        console.log("Initial URL:", url);
        // If it's a reset password URL, don't redirect even if authenticated
        if (url.includes("/auth/reset-password")) {
          return parseSupabaseUrl(url);
        }
        // For other URLs, handle normally
        return parseSupabaseUrl(url);
      }
      return url;
    } catch (err) {
      console.error("An error occurred getting the initial URL:", err);
      return null;
    }
  },
  subscribe: (listener: (url: string) => void) => {
    const onReceiveURL = ({ url }: { url: string }) => {
      console.log("Received URL:", url);
      const parsedUrl = parseSupabaseUrl(url);
      listener(parsedUrl);
    };

    // Listen for deep link events
    const subscription = Linking.addEventListener("url", onReceiveURL);

    return () => {
      subscription.remove();
    };
  },
};

// Auth Navigator with session handling
export const AuthNavigator = () => {
  const { isAuthenticated } = useAuth();

  return (
    <AuthStack.Navigator
      initialRouteName="Login"
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        gestureEnabled: true,
        gestureDirection: "horizontal",
      }}
    >
      <AuthStack.Screen
        name="Login"
        component={LoginScreen}
        options={{
          title: t("auth.login"),
          gestureEnabled: false,
          animationTypeForReplace: isAuthenticated ? "push" : "pop",
        }}
      />
      <AuthStack.Screen
        name="Register"
        component={RegisterScreen}
        options={{
          title: t("auth.register"),
          gestureEnabled: true,
        }}
      />
      <AuthStack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{
          title: t("auth.forgotPassword"),
          gestureEnabled: true,
        }}
      />
      <AuthStack.Screen
        name="ResetPassword"
        component={ResetPasswordScreen}
        options={{
          title: t("auth.resetPassword"),
          gestureEnabled: false,
          headerBackVisible: false,
          headerLeft: () => null,
          gestureDirection: "horizontal",
          animationTypeForReplace: "push",
          headerBackButtonMenuEnabled: false,
        }}
      />
    </AuthStack.Navigator>
  );
};
