import React, { createRef, useEffect } from "react";
import {
  NavigationContainer,
  useNavigationContainerRef,
  StackActions,
  CommonActions,
} from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import { useAuth } from "../contexts/AuthContext";
import { UserRole } from "../types";
import * as Linking from "expo-linking";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View,
  StyleSheet,
  Platform,
  Dimensions,
  Pressable,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import Text from "../components/Text";
import { globalStyles } from "../utils/globalStyles";

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
import SuperAdminDetailsScreen from "../screens/superadmin/SuperAdminDetailsScreen";
import CompanyAdminDetailsScreen from "../screens/superadmin/CompanyAdminDetailsScreen";
import EmployeeDetailedScreen from "../screens/superadmin/EmployeeDetailedScreen";
import EditSuperAdminScreen from "../screens/superadmin/EditSuperAdminScreen";
import EditCompanyAdminScreen from "../screens/superadmin/EditCompanyAdminScreen";
import CreateCompanyAdminScreen from "../screens/superadmin/CreateCompanyAdminScreen";

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
import CreateEmployeesScreen from "../screens/superadmin/CreateEmployeesScreen";

// Stack navigators
const AuthStack = createNativeStackNavigator();
const SuperAdminStack = createNativeStackNavigator();
const CompanyAdminStack = createNativeStackNavigator();
const EmployeeStack = createNativeStackNavigator();
const RootStack = createNativeStackNavigator();
// Tab navigator for SuperAdmin
const SuperAdminTab = createBottomTabNavigator();
// Tab navigator for CompanyAdmin
const CompanyAdminTab = createBottomTabNavigator();
// Tab navigator for Employee
const EmployeeTab = createBottomTabNavigator();

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
          token: (token: string) => token,
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
const SuperAdminNavigator = () => {
  const theme = useTheme();

  return (
    <SuperAdminStack.Navigator screenOptions={{ headerShown: false }}>
      <SuperAdminStack.Screen
        name="SuperAdminTabs"
        component={SuperAdminTabNavigator}
      />
      <SuperAdminStack.Screen
        name="CompanyDetails"
        component={CompanyDetailsScreen}
      />
      <SuperAdminStack.Screen
        name="CreateCompany"
        component={CreateCompanyScreen}
      />
      <SuperAdminStack.Screen
        name="EditCompany"
        component={EditCompanyScreen}
      />
      <SuperAdminStack.Screen
        name="TaskDetails"
        component={SuperAdminTaskDetailsScreen}
      />
      <SuperAdminStack.Screen name="CreateTask" component={CreateTaskScreen} />
      <SuperAdminStack.Screen
        name="CreateSuperAdmin"
        component={CreateSuperAdminScreen}
      />
      <SuperAdminStack.Screen
        name="SuperAdminDetailsScreen"
        component={SuperAdminDetailsScreen}
      />
      <SuperAdminStack.Screen
        name="SuperAdminProfileScreen"
        component={SuperAdminProfileScreen}
      />
      <SuperAdminStack.Screen
        name="EditSuperAdmin"
        component={EditSuperAdminScreen}
      />
      <SuperAdminStack.Screen
        name="CompanyAdminDetailsScreen"
        component={CompanyAdminDetailsScreen}
      />
      <SuperAdminStack.Screen
        name="EditCompanyAdmin"
        component={EditCompanyAdminScreen}
      />
      <SuperAdminStack.Screen
        name="EmployeeDetailedScreen"
        component={EmployeeDetailedScreen}
      />
      <SuperAdminStack.Screen
        name="CreateCompanyAdmin"
        component={CreateCompanyAdminScreen}
      />
      <SuperAdminStack.Screen
        name="CreateEmployee"
        component={CreateEmployeesScreen}
      />
    </SuperAdminStack.Navigator>
  );
};

// Tab Navigator for SuperAdmin
const SuperAdminTabNavigator = () => {
  const theme = useTheme();
  const isWeb = Platform.OS === "web";
  const windowWidth = Dimensions.get("window").width;
  const isLargeScreen = isWeb && windowWidth > 768;
  const nav = useNavigationContainerRef();
  const [activeScreen, setActiveScreen] = React.useState("Dashboard");

  const renderTabBarBackground = () => {
    return (
      <View
        style={{
          borderRadius: 25,
          borderWidth: 1,
          borderColor: "rgb(207, 207, 207)",
          overflow: "hidden",
          ...StyleSheet.absoluteFillObject,
        }}
      >
        <LinearGradient
          colors={[
            "rgba(6,169,169,255)",
            "rgba(38,127,161,255)",
            "rgba(54,105,157,255)",
            "rgba(74,78,153,255)",
            "rgba(94,52,149,255)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
    );
  };

  // Use conditional rendering based on platform/screen size
  if (isLargeScreen) {
    // Web with large screen: Use custom sidebar layout
    return (
      <View style={{ flexDirection: "row", height: "100%" }}>
        {/* Sidebar Navigation */}
        <View
          style={{
            width: 220,
            height: "100%",
            backgroundColor: "transparent",
            paddingTop: 20,
            paddingBottom: 20,
            borderRightWidth: 0,
            position: "relative",
          }}
        >
          {/* Background gradient */}
          <LinearGradient
            colors={[
              "rgba(6,169,169,255)",
              "rgba(38,127,161,255)",
              "rgba(54,105,157,255)",
              "rgba(74,78,153,255)",
              "rgba(94,52,149,255)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Logo at the top */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingVertical: 24,
              marginBottom: 10,
              alignItems: "center",
              borderBottomWidth: 1,
              borderBottomColor: "rgba(255, 255, 255, 0.1)",
            }}
          >
            <View
              style={{
                width: 150,
                height: 50,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {/* Option 1: Use an image logo */}
              <Image
                source={require("../assets/splash-icon-mono.png")}
                style={{
                  width: 160,
                  height: 120,
                  resizeMode: "contain",
                  alignSelf: "center",
                }}
              />
            </View>
          </View>

          {/* Navigation Items */}
          <View style={{ paddingLeft: 20, paddingRight: 20, marginTop: 20 }}>
            <NavItem
              icon="home"
              label="Dashboard"
              isActive={activeScreen === "Dashboard"}
              onPress={() => setActiveScreen("Dashboard")}
            />
            <NavItem
              icon="domain"
              label="Companies"
              isActive={activeScreen === "Companies"}
              onPress={() => setActiveScreen("Companies")}
            />
            <NavItem
              icon="clipboard-text"
              label="Tasks"
              isActive={activeScreen === "Tasks"}
              onPress={() => setActiveScreen("Tasks")}
            />
            <NavItem
              icon="account-group"
              label="Users"
              isActive={activeScreen === "Users"}
              onPress={() => setActiveScreen("Users")}
            />
            <NavItem
              icon="account-circle"
              label="Profile"
              isActive={activeScreen === "Profile"}
              onPress={() => setActiveScreen("Profile")}
            />
          </View>
        </View>

        {/* Main Content */}
        <View style={{ flex: 1 }}>
          {activeScreen === "Dashboard" && <SuperAdminDashboard />}
          {activeScreen === "Companies" && <CompanyListScreen />}
          {activeScreen === "Tasks" && <SuperAdminTasksScreen />}
          {activeScreen === "Users" && <SuperAdminUsersScreen />}
          {activeScreen === "Profile" && <SuperAdminProfileScreen />}
        </View>
      </View>
    );
  }

  // Mobile or small screen: Use bottom tabs
  return (
    <SuperAdminTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          elevation: 7,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          height: 70,
          paddingTop: 7.5,
          paddingBottom: 10,
          paddingHorizontal: 5,
          marginHorizontal: 13,
          marginBottom: 10,
          borderRadius: 25,

          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
        },
        tabBarBackground: renderTabBarBackground,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: "Poppins-Medium",
          color: "#fff",
        },
        tabBarActiveTintColor: "#fff",
        tabBarInactiveTintColor: "rgba(255, 255, 255, 0.7)",
      }}
    >
      <SuperAdminTab.Screen
        name="Dashboard"
        component={SuperAdminDashboard}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={24} />
          ),
        }}
      />
      <SuperAdminTab.Screen
        name="Companies"
        component={CompanyListScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="domain" color={color} size={24} />
          ),
        }}
      />
      <SuperAdminTab.Screen
        name="Tasks"
        component={SuperAdminTasksScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="clipboard-text"
              color={color}
              size={24}
            />
          ),
        }}
      />
      <SuperAdminTab.Screen
        name="Users"
        component={SuperAdminUsersScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account-group"
              color={color}
              size={24}
            />
          ),
        }}
      />
      <SuperAdminTab.Screen
        name="Profile"
        component={SuperAdminProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account-circle"
              color={color}
              size={24}
            />
          ),
        }}
      />
    </SuperAdminTab.Navigator>
  );
};

// Custom navigation item component for sidebar
interface NavItemProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  onPress: () => void;
  isActive?: boolean;
}

const NavItem = ({ icon, label, onPress, isActive = false }: NavItemProps) => {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 10,
        marginBottom: 10,
        backgroundColor: isActive ? "rgba(255, 255, 255, 0.15)" : "transparent",
      }}
    >
      <MaterialCommunityIcons
        name={icon}
        color="#fff"
        size={24}
        style={{ marginRight: 16 }}
      />
      <View
        style={{
          height: 36,
          flex: 1,
          borderRadius: 8,
          justifyContent: "center",
        }}
      >
        <Text variant={"semibold"} style={{ fontSize: 16, color: "#fff" }}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
};

// Company Admin Navigator
const CompanyAdminNavigator = () => (
  <CompanyAdminStack.Navigator screenOptions={{ headerShown: false }}>
    <CompanyAdminStack.Screen
      name="CompanyAdminTabs"
      component={CompanyAdminTabNavigator}
    />
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
      name="TaskDetails"
      component={CompanyAdminTaskDetailsScreen}
    />
    <CompanyAdminStack.Screen
      name="CreateTask"
      component={CompanyAdminCreateTaskScreen}
    />
    <CompanyAdminStack.Screen
      name="FormDetails"
      component={FormDetailsScreen}
    />
  </CompanyAdminStack.Navigator>
);

// Tab Navigator for CompanyAdmin
const CompanyAdminTabNavigator = () => {
  const theme = useTheme();
  const isWeb = Platform.OS === "web";
  const windowWidth = Dimensions.get("window").width;
  const isLargeScreen = isWeb && windowWidth > 768;
  const nav = useNavigationContainerRef();
  const [activeScreen, setActiveScreen] = React.useState("Dashboard");

  const renderTabBarBackground = () => {
    return (
      <View
        style={{
          borderRadius: 25,
          borderWidth: 1,
          borderColor: "rgb(207, 207, 207)",
          overflow: "hidden",
          ...StyleSheet.absoluteFillObject,
        }}
      >
        <LinearGradient
          colors={[
            "rgba(6,169,169,255)",
            "rgba(38,127,161,255)",
            "rgba(54,105,157,255)",
            "rgba(74,78,153,255)",
            "rgba(94,52,149,255)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
    );
  };

  // Use conditional rendering based on platform/screen size
  if (isLargeScreen) {
    // Web with large screen: Use custom sidebar layout
    return (
      <View style={{ flexDirection: "row", height: "100%" }}>
        {/* Sidebar Navigation */}
        <View
          style={{
            width: 220,
            height: "100%",
            backgroundColor: "transparent",
            paddingTop: 20,
            paddingBottom: 20,
            borderRightWidth: 0,
            position: "relative",
          }}
        >
          {/* Background gradient */}
          <LinearGradient
            colors={[
              "rgba(6,169,169,255)",
              "rgba(38,127,161,255)",
              "rgba(54,105,157,255)",
              "rgba(74,78,153,255)",
              "rgba(94,52,149,255)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Logo at the top */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingVertical: 24,
              marginBottom: 10,
              alignItems: "center",
              borderBottomWidth: 1,
              borderBottomColor: "rgba(255, 255, 255, 0.1)",
            }}
          >
            <View
              style={{
                width: 150,
                height: 50,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {/* Logo image */}
              <Image
                source={require("../assets/splash-icon-mono.png")}
                style={{
                  width: 160,
                  height: 120,
                  resizeMode: "contain",
                  alignSelf: "center",
                }}
              />
            </View>
          </View>

          {/* Navigation Items */}
          <View style={{ paddingLeft: 20, paddingRight: 20, marginTop: 20 }}>
            <NavItem
              icon="home"
              label="Dashboard"
              isActive={activeScreen === "Dashboard"}
              onPress={() => setActiveScreen("Dashboard")}
            />
            <NavItem
              icon="account-group"
              label="Employees"
              isActive={activeScreen === "Employees"}
              onPress={() => setActiveScreen("Employees")}
            />
            <NavItem
              icon="clipboard-text"
              label="Tasks"
              isActive={activeScreen === "Tasks"}
              onPress={() => setActiveScreen("Tasks")}
            />
            <NavItem
              icon="file-document"
              label="Forms"
              isActive={activeScreen === "FormSubmissions"}
              onPress={() => setActiveScreen("FormSubmissions")}
            />
            <NavItem
              icon="account-circle"
              label="Profile"
              isActive={activeScreen === "Profile"}
              onPress={() => setActiveScreen("Profile")}
            />
          </View>
        </View>

        {/* Main Content */}
        <View style={{ flex: 1 }}>
          {activeScreen === "Dashboard" && <CompanyAdminDashboard />}
          {activeScreen === "Employees" && <EmployeeListScreen />}
          {activeScreen === "Tasks" && <CompanyAdminTasksScreen />}
          {activeScreen === "FormSubmissions" && <FormSubmissionsScreen />}
          {activeScreen === "Profile" && <CompanyAdminProfileScreen />}
        </View>
      </View>
    );
  }

  // Mobile or small screen: Use bottom tabs
  return (
    <CompanyAdminTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          elevation: 7,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          height: 70,
          paddingTop: 7.5,
          paddingBottom: 10,
          paddingHorizontal: 5,
          marginHorizontal: 13,
          marginBottom: 10,
          borderRadius: 25,

          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
        },
        tabBarBackground: renderTabBarBackground,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: "Poppins-Medium",
          color: "#fff",
        },
        tabBarActiveTintColor: "#fff",
        tabBarInactiveTintColor: "rgba(255, 255, 255, 0.7)",
      }}
    >
      <CompanyAdminTab.Screen
        name="Dashboard"
        component={CompanyAdminDashboard}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={24} />
          ),
        }}
      />
      <CompanyAdminTab.Screen
        name="Employees"
        component={EmployeeListScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account-group"
              color={color}
              size={24}
            />
          ),
        }}
      />
      <CompanyAdminTab.Screen
        name="Tasks"
        component={CompanyAdminTasksScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="clipboard-text"
              color={color}
              size={24}
            />
          ),
        }}
      />
      <CompanyAdminTab.Screen
        name="FormSubmissions"
        component={FormSubmissionsScreen}
        options={{
          tabBarLabel: "Forms",
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="file-document"
              color={color}
              size={24}
            />
          ),
        }}
      />
      <CompanyAdminTab.Screen
        name="Profile"
        component={CompanyAdminProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account-circle"
              color={color}
              size={24}
            />
          ),
        }}
      />
    </CompanyAdminTab.Navigator>
  );
};

// Employee Navigator
const EmployeeNavigator = () => (
  <EmployeeStack.Navigator screenOptions={{ headerShown: false }}>
    <EmployeeStack.Screen
      name="EmployeeTabs"
      component={EmployeeTabNavigator}
    />
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
    <EmployeeStack.Screen
      name="FormDetails"
      component={EmployeeFormDetailsScreen}
    />
    {/* <EmployeeStack.Screen
      name="TaskDetails"
      component={EmployeeTaskDetailsScreen}
    /> */}
  </EmployeeStack.Navigator>
);

// Tab Navigator for Employee
const EmployeeTabNavigator = () => {
  const theme = useTheme();
  const isWeb = Platform.OS === "web";
  const windowWidth = Dimensions.get("window").width;
  const isLargeScreen = isWeb && windowWidth > 768;
  const nav = useNavigationContainerRef();
  const [activeScreen, setActiveScreen] = React.useState("Dashboard");

  const renderTabBarBackground = () => {
    return (
      <View
        style={{
          borderRadius: 25,
          borderWidth: 1,
          borderColor: "rgb(207, 207, 207)",
          overflow: "hidden",
          ...StyleSheet.absoluteFillObject,
        }}
      >
        <LinearGradient
          colors={[
            "rgba(6,169,169,255)",
            "rgba(38,127,161,255)",
            "rgba(54,105,157,255)",
            "rgba(74,78,153,255)",
            "rgba(94,52,149,255)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={StyleSheet.absoluteFillObject}
        />
      </View>
    );
  };

  // Use conditional rendering based on platform/screen size
  if (isLargeScreen) {
    // Web with large screen: Use custom sidebar layout
    return (
      <View style={{ flexDirection: "row", height: "100%" }}>
        {/* Sidebar Navigation */}
        <View
          style={{
            width: 220,
            height: "100%",
            backgroundColor: "transparent",
            paddingTop: 20,
            paddingBottom: 20,
            borderRightWidth: 0,
            position: "relative",
          }}
        >
          {/* Background gradient */}
          <LinearGradient
            colors={[
              "rgba(6,169,169,255)",
              "rgba(38,127,161,255)",
              "rgba(54,105,157,255)",
              "rgba(74,78,153,255)",
              "rgba(94,52,149,255)",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Logo at the top */}
          <View
            style={{
              paddingHorizontal: 20,
              paddingVertical: 24,
              marginBottom: 10,
              alignItems: "center",
              borderBottomWidth: 1,
              borderBottomColor: "rgba(255, 255, 255, 0.1)",
            }}
          >
            <View
              style={{
                width: 150,
                height: 50,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {/* Logo image */}
              <Image
                source={require("../assets/splash-icon-mono.png")}
                style={{
                  width: 160,
                  height: 120,
                  resizeMode: "contain",
                  alignSelf: "center",
                }}
              />
            </View>
          </View>

          {/* Navigation Items */}
          <View style={{ paddingLeft: 20, paddingRight: 20, marginTop: 20 }}>
            <NavItem
              icon="home"
              label="Dashboard"
              isActive={activeScreen === "Dashboard"}
              onPress={() => setActiveScreen("Dashboard")}
            />
            <NavItem
              icon="file-document"
              label="Forms"
              isActive={activeScreen === "Forms"}
              onPress={() => setActiveScreen("Forms")}
            />
            <NavItem
              icon="account-circle"
              label="Profile"
              isActive={activeScreen === "Profile"}
              onPress={() => setActiveScreen("Profile")}
            />
          </View>
        </View>

        {/* Main Content */}
        <View style={{ flex: 1 }}>
          {activeScreen === "Dashboard" && <EmployeeDashboard />}
          {activeScreen === "Forms" && <EmployeeFormsScreen />}
          {activeScreen === "Profile" && <EmployeeProfileScreen />}
        </View>
      </View>
    );
  }

  // Mobile or small screen: Use bottom tabs
  return (
    <EmployeeTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          elevation: 7,
          backgroundColor: "transparent",
          borderTopWidth: 0,
          height: 70,
          paddingTop: 7.5,
          paddingBottom: 10,
          paddingHorizontal: 5,
          marginHorizontal: 13,
          marginBottom: 10,
          borderRadius: 25,

          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
        },
        tabBarBackground: renderTabBarBackground,
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: "Poppins-Medium",
          color: "#fff",
        },
        tabBarActiveTintColor: "#fff",
        tabBarInactiveTintColor: "rgba(255, 255, 255, 0.7)",
      }}
    >
      <EmployeeTab.Screen
        name="Dashboard"
        component={EmployeeDashboard}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={24} />
          ),
        }}
      />
      <EmployeeTab.Screen
        name="Forms"
        component={EmployeeFormsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="file-document"
              color={color}
              size={24}
            />
          ),
        }}
      />
      <EmployeeTab.Screen
        name="Profile"
        component={EmployeeProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons
              name="account-circle"
              color={color}
              size={24}
            />
          ),
        }}
      />
    </EmployeeTab.Navigator>
  );
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
