import React, { createRef, useEffect } from "react";
import {
  NavigationContainer,
  useNavigationContainerRef,
  StackActions,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useAuth } from "../contexts/AuthContext";
import { UserRole } from "../types";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Auth Screens
import LoginScreen from "../screens/auth/LoginScreen";
import RegisterScreen from "../screens/auth/RegisterScreen";
import ForgotPasswordScreen from "../screens/auth/ForgotPasswordScreen";
import ResetPasswordScreen from "../screens/auth/ResetPasswordScreen";

// Super Admin Screens
import SuperAdminDashboard from "../screens/superadmin/SuperAdminDashboard";
import CompanyListScreen from "../screens/superadmin/CompanyListScreen";
import CompanyDetailsScreen from "../screens/superadmin/CompanyDetailsScreen";
import CreateCompanyScreen from "../screens/superadmin/CreateCompanyScreen";
import EditCompanyScreen from "../screens/superadmin/EditCompanyScreen";
import SuperAdminTasksScreen from "../screens/superadmin/SuperAdminTasksScreen";
import SuperAdminTaskDetailsScreen from "../screens/superadmin/SuperAdminTaskDetailsScreen";
import CreateTaskScreen from "../screens/superadmin/CreateTaskScreen";
import SuperAdminProfileScreen from "../screens/superadmin/SuperAdminProfileScreen";
import SuperAdminUsersScreen from "../screens/superadmin/SuperAdminUsersScreen";
import CreateSuperAdminScreen from "../screens/superadmin/CreateSuperAdminScreen";

// Company Admin Screens
import CompanyAdminDashboard from "../screens/companyadmin/CompanyAdminDashboard";
import EmployeeListScreen from "../screens/companyadmin/EmployeeListScreen";
import EmployeeDetailsScreen from "../screens/companyadmin/EmployeeDetailsScreen";
import CreateEmployeeScreen from "../screens/companyadmin/CreateEmployeeScreen";
import EditEmployeeScreen from "../screens/companyadmin/EditEmployeeScreen";
import CompanyAdminTasksScreen from "../screens/companyadmin/CompanyAdminTasksScreen";
import CompanyAdminTaskDetailsScreen from "../screens/companyadmin/CompanyAdminTaskDetailsScreen";
import CompanyAdminCreateTaskScreen from "../screens/companyadmin/CompanyAdminCreateTaskScreen";
import FormSubmissionsScreen from "../screens/companyadmin/FormSubmissionsScreen";
import FormDetailsScreen from "../screens/companyadmin/FormDetailsScreen";
import CompanyAdminProfileScreen from "../screens/companyadmin/CompanyAdminProfileScreen";

// Employee Screens
import EmployeeDashboard from "../screens/employee/EmployeeDashboard";
import CreateAccidentReportScreen from "../screens/employee/CreateAccidentReportScreen";
import CreateIllnessReportScreen from "../screens/employee/CreateIllnessReportScreen";
import CreateStaffDepartureScreen from "../screens/employee/CreateStaffDepartureScreen";
import EmployeeFormsScreen from "../screens/employee/EmployeeFormsScreen";
import EmployeeFormDetailsScreen from "../screens/employee/EmployeeFormDetailsScreen";
import EmployeeProfileScreen from "../screens/employee/EmployeeProfileScreen";
import EmployeeTasksScreen from "../screens/employee/EmployeeTasksScreen";
import EmployeeTaskDetailsScreen from "../screens/employee/EmployeeTaskDetailsScreen";

// Stack navigators
const AuthStack = createNativeStackNavigator();
const SuperAdminStack = createNativeStackNavigator();
const CompanyAdminStack = createNativeStackNavigator();
const EmployeeStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();

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

// Configure linking
const linking = {
  prefixes: [
    "hdf-hr://", // Your app's URL scheme
    "https://*.yourdomain.com", // Your website domain (update this)
  ],
  config: {
    screens: {
      // Auth screens
      ResetPassword: {
        path: "reset-password",
        parse: {
          token: (token) => token,
        },
      },
      Login: "login",
      Register: "register",
      ForgotPassword: "forgot-password",
      // Add other screens as needed
    },
  },
};

// Auth Navigator
const AuthNavigator = () => (
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

// Super Admin Navigator
const SuperAdminNavigator = () => (
  <SuperAdminStack.Navigator screenOptions={{ headerShown: false }}>
    <SuperAdminStack.Screen name="Dashboard" component={SuperAdminDashboard} />
    <SuperAdminStack.Screen name="Companies" component={CompanyListScreen} />
    <SuperAdminStack.Screen
      name="CompanyDetails"
      component={CompanyDetailsScreen}
    />
    <SuperAdminStack.Screen
      name="CreateCompany"
      component={CreateCompanyScreen}
    />
    <SuperAdminStack.Screen name="EditCompany" component={EditCompanyScreen} />
    <SuperAdminStack.Screen name="Tasks" component={SuperAdminTasksScreen} />
    <SuperAdminStack.Screen
      name="TaskDetails"
      component={SuperAdminTaskDetailsScreen}
    />
    <SuperAdminStack.Screen name="CreateTask" component={CreateTaskScreen} />
    <SuperAdminStack.Screen
      name="Profile"
      component={SuperAdminProfileScreen}
    />
    <SuperAdminStack.Screen name="Users" component={SuperAdminUsersScreen} />
    <SuperAdminStack.Screen
      name="CreateSuperAdmin"
      component={CreateSuperAdminScreen}
    />
  </SuperAdminStack.Navigator>
);

// Company Admin Navigator
const CompanyAdminNavigator = () => (
  <CompanyAdminStack.Navigator screenOptions={{ headerShown: false }}>
    <CompanyAdminStack.Screen
      name="Dashboard"
      component={CompanyAdminDashboard}
    />
    <CompanyAdminStack.Screen name="Employees" component={EmployeeListScreen} />
    <CompanyAdminStack.Screen
      name="EmployeeDetails"
      component={EmployeeDetailsScreen}
    />
    <CompanyAdminStack.Screen
      name="CreateEmployee"
      component={CreateEmployeeScreen}
    />
    <CompanyAdminStack.Screen
      name="EditEmployee"
      component={EditEmployeeScreen}
    />
    <CompanyAdminStack.Screen
      name="Tasks"
      component={CompanyAdminTasksScreen}
    />
    <CompanyAdminStack.Screen
      name="TaskDetails"
      component={CompanyAdminTaskDetailsScreen}
    />
    <CompanyAdminStack.Screen
      name="CreateTask"
      component={CompanyAdminCreateTaskScreen}
    />
    <CompanyAdminStack.Screen
      name="FormSubmissions"
      component={FormSubmissionsScreen}
    />
    <CompanyAdminStack.Screen
      name="FormDetails"
      component={FormDetailsScreen}
    />
    <CompanyAdminStack.Screen
      name="Profile"
      component={CompanyAdminProfileScreen}
    />
  </CompanyAdminStack.Navigator>
);

// Employee Navigator
const EmployeeNavigator = () => (
  <EmployeeStack.Navigator screenOptions={{ headerShown: false }}>
    <EmployeeStack.Screen name="Dashboard" component={EmployeeDashboard} />
    <EmployeeStack.Screen
      name="CreateAccidentReport"
      component={CreateAccidentReportScreen}
    />
    <EmployeeStack.Screen
      name="CreateIllnessReport"
      component={CreateIllnessReportScreen}
    />
    <EmployeeStack.Screen
      name="CreateStaffDeparture"
      component={CreateStaffDepartureScreen}
    />
    <EmployeeStack.Screen name="Forms" component={EmployeeFormsScreen} />
    <EmployeeStack.Screen
      name="FormDetails"
      component={EmployeeFormDetailsScreen}
    />
    <EmployeeStack.Screen name="Tasks" component={EmployeeTasksScreen} />
    <EmployeeStack.Screen
      name="TaskDetails"
      component={EmployeeTaskDetailsScreen}
    />
    <EmployeeStack.Screen name="Profile" component={EmployeeProfileScreen} />
  </EmployeeStack.Navigator>
);

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
