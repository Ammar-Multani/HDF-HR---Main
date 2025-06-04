import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { t } from "i18next";

// Auth Screens
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/auth/ResetPasswordScreen";

// Stack navigator
const AuthStack = createNativeStackNavigator();

// Auth Navigator
export const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen
      name="Login"
      component={LoginScreen}
      options={{ title: t("auth.login") }}
    />
    <AuthStack.Screen
      name="Register"
      component={RegisterScreen}
      options={{ title: t("auth.register") }}
    />
    <AuthStack.Screen
      name="ForgotPassword"
      component={ForgotPasswordScreen}
      options={{ title: t("auth.forgotPassword") }}
    />
    <AuthStack.Screen
      name="ResetPassword"
      component={ResetPasswordScreen}
      initialParams={{ token: null }}
      options={{ title: t("auth.resetPassword") }}
    />
  </AuthStack.Navigator>
);
