import React, { useState, useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import {
  useNavigationContainerRef,
  useNavigation,
} from "@react-navigation/native";
import {
  View,
  StyleSheet,
  Platform,
  Dimensions,
  Pressable,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Text from "../components/Text";
import { SidebarLayout } from "./components/SidebarLayout";
import { t } from "i18next";

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
import CompanyAdminEditTaskScreen from "../screens/companyadmin/CompanyAdminEditTaskScreen";
import CreateEmployeeAccidentReportScreen from "../screens/companyadmin/CreateEmployeeAccidentReportScreen.web";
import CreateEmployeeIllnessReportScreen from "../screens/companyadmin/CreateEmployeeIllnessReportScreen.web";
import CreateEmployeeStaffDepartureReportScreen from "../screens/companyadmin/CreateEmployeeStaffDepartureScreen.web";

// Stack navigators
const CompanyAdminStack = createNativeStackNavigator();
const CompanyAdminTab = createBottomTabNavigator();

// Add a custom hook for window dimensions
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

    // Set up event listener
    if (Platform.OS === "web") {
      window.addEventListener("resize", handleResize);

      // Clean up
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  return dimensions;
};

// Web Layout with SidebarLayout
const WebStackNavigator = () => {
  const [activeScreen, setActiveScreen] = useState("Dashboard");
  const navigation = useNavigation();

  const navigationItems = [
    {
      icon: "home" as const,
      label: t("navigation.dashboard"),
      screen: "Dashboard",
    },
    {
      icon: "account-group" as const,
      label: t("navigation.employees"),
      screen: "Employees",
    },
    {
      icon: "clipboard-text" as const,
      label: t("navigation.tasks"),
      screen: "Tasks",
    },
    {
      icon: "file-document" as const,
      label: t("navigation.forms"),
      screen: "FormSubmissions",
    },
    {
      icon: "account-circle" as const,
      label: t("navigation.profile"),
      screen: "Profile",
    },
  ];

  // Define the main content screens
  const mainContent = {
    Dashboard: <CompanyAdminDashboard />,
    Employees: <EmployeeListScreen />,
    Tasks: <CompanyAdminTasksScreen />,
    FormSubmissions: <FormSubmissionsScreen />,
    Profile: <CompanyAdminProfileScreen />,
  };

  // Create a stack navigator for the content area
  const ContentStack = createNativeStackNavigator();

  // Content area component that includes both main screens and stack screens
  const ContentArea = () => {
    return (
      <ContentStack.Navigator
        screenOptions={{
          headerShown: false,
          animation: "none",
        }}
        initialRouteName={activeScreen}
      >
        {/* Main screens */}
        <ContentStack.Screen
          name="Dashboard"
          component={CompanyAdminDashboard}
          options={{ title: t("navigation.dashboard") }}
        />
        <ContentStack.Screen
          name="Employees"
          component={EmployeeListScreen}
          options={{ title: t("navigation.employees") }}
        />
        <ContentStack.Screen
          name="Tasks"
          component={CompanyAdminTasksScreen}
          options={{ title: t("navigation.tasks") }}
        />
        <ContentStack.Screen
          name="FormSubmissions"
          component={FormSubmissionsScreen}
          options={{ title: t("navigation.forms") }}
        />
        <ContentStack.Screen
          name="Profile"
          component={CompanyAdminProfileScreen}
          options={{ title: t("navigation.profile") }}
        />

        {/* Stack screens */}
        <ContentStack.Screen
          name="EmployeeDetails"
          component={EmployeeDetailsScreen}
          options={{ title: t("navigation.employeeDetails") }}
        />
        <ContentStack.Screen
          name="CreateEmployee"
          component={CreateEmployeeScreen}
          options={{ title: t("navigation.createEmployee") }}
        />
        <ContentStack.Screen
          name="EditEmployee"
          component={EditEmployeeScreen}
          options={{ title: t("navigation.editEmployee") }}
        />
        <ContentStack.Screen
          name="TaskDetails"
          component={CompanyAdminTaskDetailsScreen}
          options={{ title: t("navigation.taskDetails") }}
        />
        <ContentStack.Screen
          name="CreateTask"
          component={CompanyAdminCreateTaskScreen}
          options={{ title: t("navigation.createTask") }}
        />
        <ContentStack.Screen
          name="EditTask"
          component={CompanyAdminEditTaskScreen}
          options={{ title: t("navigation.editTask") }}
        />
        <ContentStack.Screen
          name="FormDetails"
          component={FormDetailsScreen}
          options={{ title: t("navigation.formDetails") }}
        />
        <ContentStack.Screen
          name="CreateEmployeeAccidentReport"
          component={CreateEmployeeAccidentReportScreen}
          options={{ title: t("navigation.createEmployeeAccidentReport") }}
        />
        <ContentStack.Screen
          name="CreateEmployeeIllnessReport"
          component={CreateEmployeeIllnessReportScreen}
          options={{ title: t("navigation.createEmployeeIllnessReport") }}
        />
        <ContentStack.Screen
          name="CreateEmployeeStaffDepartureReport"
          component={CreateEmployeeStaffDepartureReportScreen}
          options={{
            title: t("navigation.createEmployeeStaffDepartureReport"),
          }}
        />
      </ContentStack.Navigator>
    );
  };

  // Handle navigation
  const handleNavigation = (screen: string) => {
    setActiveScreen(screen);
    // @ts-ignore - Ignore the typing error as we know these routes exist
    navigation.navigate(screen);
  };

  return (
    <SidebarLayout
      activeScreen={activeScreen}
      setActiveScreen={setActiveScreen}
      navigationItems={navigationItems}
      content={{
        Dashboard: <ContentArea />,
        Employees: <ContentArea />,
        Tasks: <ContentArea />,
        FormSubmissions: <ContentArea />,
        Profile: <ContentArea />,
      }}
      onNavigate={handleNavigation}
    />
  );
};

// Tab Navigator for CompanyAdmin
const CompanyAdminTabNavigator = () => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isLargeScreen = isWeb && width > 768;

  // For mobile or small screen: Use bottom tabs
  if (!isLargeScreen) {
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
          tabBarBackground: () => (
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
                  "rgba(10,185,129,255)",
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
          ),
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
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="home" color={color} size={24} />
            ),
          }}
        />
        <CompanyAdminTab.Screen
          name="Employees"
          component={EmployeeListScreen}
          options={{
            tabBarIcon: ({ color }) => (
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
            tabBarIcon: ({ color }) => (
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
            tabBarIcon: ({ color }) => (
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
            tabBarIcon: ({ color }) => (
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
  }

  // For web with large screen: Use SidebarLayout
  return <WebStackNavigator />;
};

// Company Admin Navigator
export const CompanyAdminNavigator = () => {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isLargeScreen = isWeb && width > 768;

  if (isLargeScreen) {
    return <CompanyAdminTabNavigator />;
  }

  return (
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
        name="EditTask"
        component={CompanyAdminEditTaskScreen}
      />
      <CompanyAdminStack.Screen
        name="FormDetails"
        component={FormDetailsScreen}
      />
      <CompanyAdminStack.Screen
        name="CreateEmployeeAccidentReport"
        component={CreateEmployeeAccidentReportScreen}
      />
      <CompanyAdminStack.Screen
        name="CreateEmployeeIllnessReport"
        component={CreateEmployeeIllnessReportScreen}
      />
      <CompanyAdminStack.Screen
        name="CreateEmployeeStaffDepartureReport"
        component={CreateEmployeeStaffDepartureReportScreen}
      />
    </CompanyAdminStack.Navigator>
  );
};
