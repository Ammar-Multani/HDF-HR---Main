import React, { createRef, useEffect, useState } from "react";
import {
  NavigationContainer,
  useNavigationContainerRef,
  StackActions,
  ParamListBase,
} from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "../contexts/AuthContext";
import { UserRole } from "../types";
import { Dimensions, Platform, Text } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// Import navigators from separate files
import { AuthNavigator } from "./AuthNavigator";
import { SuperAdminNavigator } from "./SuperAdminNavigator";
import { CompanyAdminNavigator } from "./CompanyAdminNavigator";
import { EmployeeNavigator } from "./EmployeeNavigator";

// Import linking configuration
import { linking } from "./linkingConfiguration";

// Keys for storage
const NAVIGATION_STATE_KEY = "@navigation_state";
const NAVIGATE_TO_DASHBOARD_KEY = "NAVIGATE_TO_DASHBOARD";

// Create a navigation ref that can be used outside of the Navigation Provider
export const navigationRef = createRef();

// Create root stack navigator
const RootStack = createNativeStackNavigator();

// Add window dimensions hook
const useWindowDimensions = () => {
  const [dimensions, setDimensions] = useState({
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  });

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: Dimensions.get("window").width,
        height: Dimensions.get("window").height,
      });
    };

    if (Platform.OS === "web") {
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  return dimensions;
};

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
  const { width } = useWindowDimensions();
  const [isReady, setIsReady] = useState(false);
  const [initialState, setInitialState] = useState<any>(null);

  // Load saved navigation state
  useEffect(() => {
    const loadNavigationState = async () => {
      try {
        const savedState = await AsyncStorage.getItem(NAVIGATION_STATE_KEY);
        if (savedState) {
          setInitialState(JSON.parse(savedState));
        }
      } catch (err) {
        console.warn("Failed to load navigation state:", err);
      } finally {
        setIsReady(true);
      }
    };

    loadNavigationState();
  }, []);

  // Set the navigationRef for use outside of the component
  useEffect(() => {
    (navigationRef as any).current = navRef;
  }, [navRef]);

  // Save navigation state on changes
  const handleStateChange = async (state: any) => {
    try {
      await AsyncStorage.setItem(NAVIGATION_STATE_KEY, JSON.stringify(state));
    } catch (err) {
      console.warn("Failed to save navigation state:", err);
    }
  };

  // Force navigation update on window resize
  useEffect(() => {
    if (navRef.current && navRef.isReady()) {
      const currentRoute = navRef.current.getCurrentRoute();
      if (currentRoute) {
        // @ts-ignore - We know these routes exist
        navRef.current.navigate(currentRoute.name);
      }
    }
  }, [width]);

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

  if (!isReady) {
    return null; // or a loading indicator
  }

  return (
    <NavigationContainer
      ref={navRef}
      linking={linking}
      initialState={initialState}
      onStateChange={handleStateChange}
      fallback={<Text>Loading...</Text>}
    >
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <RootStack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <>
            {userRole === UserRole.SUPER_ADMIN && (
              <RootStack.Screen
                name="SuperAdmin"
                component={SuperAdminNavigator}
              />
            )}
            {userRole === UserRole.COMPANY_ADMIN && (
              <RootStack.Screen
                name="CompanyAdmin"
                component={CompanyAdminNavigator}
              />
            )}
            {userRole === UserRole.EMPLOYEE && (
              <RootStack.Screen name="Employee" component={EmployeeNavigator} />
            )}
            {/* Add auth screens for deep linking even when logged in */}
            <RootStack.Screen
              name="AuthScreens"
              component={AuthNavigator}
              options={{ presentation: "modal" }}
            />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
};
