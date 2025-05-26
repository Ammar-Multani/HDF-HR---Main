import React, { createRef, useEffect } from "react";
import {
  NavigationContainer,
  useNavigationContainerRef,
  StackActions,
} from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../contexts/AuthContext";
import { UserRole } from "../types";

// Import navigators from separate files
import { AuthNavigator } from "./AuthNavigator";
import { SuperAdminNavigator } from "./SuperAdminNavigator";
import { CompanyAdminNavigator } from "./CompanyAdminNavigator";
import { EmployeeNavigator } from "./EmployeeNavigator";

// Import linking configuration
import { linking } from "./linkingConfiguration";

// Key for navigation request from auth context
const NAVIGATE_TO_DASHBOARD_KEY = "NAVIGATE_TO_DASHBOARD";

// Create a navigation ref that can be used outside of the Navigation Provider
export const navigationRef = createRef();

// Helper function to navigate to dashboard based on user role
export const navigateToDashboard = (role: string) => {
  if (!navigationRef.current) return;

  const nav = navigationRef.current as any;

  // Reset navigation stack and go directly to the dashboard
  const resetAction = StackActions.replace("Dashboard");

  try {
    nav.dispatch(resetAction);
    console.log(`Navigated user to ${role} dashboard`);

    // Clean up the navigation flag
    AsyncStorage.removeItem(NAVIGATE_TO_DASHBOARD_KEY).catch(console.error);
  } catch (error) {
    console.error("Navigation error:", error);
  }
};

// Main Navigator - enhanced with initialAuthState for faster load times
export const AppNavigator = ({ initialAuthState = null }) => {
  const { user, userRole } = useAuth();
  const navRef = useNavigationContainerRef();

  // Set the navigationRef for use outside of the component
  useEffect(() => {
    (navigationRef as any).current = navRef;
  }, [navRef]);

  // Check for navigation requests from auth context
  useEffect(() => {
    const checkNavigationRequest = async () => {
      try {
        // Check if there's a navigation request
        const dashboardRole = await AsyncStorage.getItem(
          NAVIGATE_TO_DASHBOARD_KEY
        );

        if (dashboardRole && navRef.current && navRef.isReady()) {
          console.log(
            "Processing dashboard navigation request for role:",
            dashboardRole
          );
          navigateToDashboard(dashboardRole);
        }
      } catch (error) {
        console.error("Error checking navigation request:", error);
      }
    };

    // Check on component mount and when nav reference is ready
    if (navRef.isReady()) {
      checkNavigationRequest();
    }

    // Also set an interval to check periodically
    const intervalId = setInterval(checkNavigationRequest, 1000);
    return () => clearInterval(intervalId);
  }, [navRef]);

  // For debugging - show what screen will be displayed
  if (!user) {
    console.log("No user found, showing auth navigator");
  } else if (userRole === UserRole.SUPER_ADMIN) {
    console.log("User is super admin, showing super admin navigator");
  } else if (userRole === UserRole.COMPANY_ADMIN) {
    console.log("User is company admin, showing company admin navigator");
  } else if (userRole === UserRole.EMPLOYEE) {
    console.log("User is employee, showing employee navigator");
  } else {
    console.log("User has no role or invalid role:", userRole);
  }

  return (
    <NavigationContainer ref={navRef} linking={linking}>
      {!user ? (
        <AuthNavigator />
      ) : (
        <>
          {userRole === UserRole.SUPER_ADMIN && <SuperAdminNavigator />}
          {userRole === UserRole.COMPANY_ADMIN && <CompanyAdminNavigator />}
          {userRole === UserRole.EMPLOYEE && <EmployeeNavigator />}
          {!userRole && <AuthNavigator />}
        </>
      )}
    </NavigationContainer>
  );
};
