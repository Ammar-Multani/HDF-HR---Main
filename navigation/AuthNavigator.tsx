import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

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
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
    <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <AuthStack.Screen
      name="ResetPassword"
      component={ResetPasswordScreen}
      initialParams={{ token: null }}
    />
  </AuthStack.Navigator>
);
