import React, { useState } from "react";
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
const EmployeeStack = createNativeStackNavigator();
const EmployeeTab = createBottomTabNavigator();

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
      icon: "file-document" as const,
      label: t("navigation.forms"),
      screen: "Forms",
    },
    {
      icon: "account-circle" as const,
      label: t("navigation.profile"),
      screen: "Profile",
    },
  ];

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
          component={EmployeeDashboard}
          options={{ title: t("navigation.dashboard") }}
        />
        <ContentStack.Screen
          name="Forms"
          component={EmployeeFormsScreen}
          options={{ title: t("navigation.forms") }}
        />
        <ContentStack.Screen
          name="Profile"
          component={EmployeeProfileScreen}
          options={{ title: t("navigation.profile") }}
        />

        {/* Stack screens */}
        <ContentStack.Screen
          name="CreateAccidentReport"
          component={CreateAccidentReportScreen}
          options={{ title: t("navigation.createAccidentReport") }}
        />
        <ContentStack.Screen
          name="CreateIllnessReport"
          component={CreateIllnessReportScreen}
          options={{ title: t("navigation.createIllnessReport") }}
        />
        <ContentStack.Screen
          name="CreateStaffDeparture"
          component={CreateStaffDepartureScreen}
          options={{ title: t("navigation.createStaffDeparture") }}
        />
        <ContentStack.Screen
          name="FormDetails"
          component={EmployeeFormDetailsScreen}
          options={{ title: t("navigation.formDetails") }}
        />
        <ContentStack.Screen
          name="TaskDetails"
          component={EmployeeTaskDetailsScreen}
          options={{ title: t("navigation.taskDetails") }}
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
        Forms: <ContentArea />,
        Profile: <ContentArea />,
      }}
      onNavigate={handleNavigation}
    />
  );
};

// Tab Navigator for Employee
const EmployeeTabNavigator = () => {
  const theme = useTheme();
  const isWeb = Platform.OS === "web";
  const windowWidth = Dimensions.get("window").width;
  const isLargeScreen = isWeb && windowWidth > 768;

  // For web with large screen: Use SidebarLayout
  if (isLargeScreen) {
    return <WebStackNavigator />;
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
      <EmployeeTab.Screen
        name="Dashboard"
        component={EmployeeDashboard}
        options={{
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons name="home" color={color} size={24} />
          ),
        }}
      />
      <EmployeeTab.Screen
        name="Forms"
        component={EmployeeFormsScreen}
        options={{
          tabBarIcon: ({ color }) => (
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
          tabBarIcon: ({ color }) => (
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

// Employee Navigator
export const EmployeeNavigator = () => {
  const isWeb = Platform.OS === "web";
  const windowWidth = Dimensions.get("window").width;
  const isLargeScreen = isWeb && windowWidth > 768;

  if (isLargeScreen) {
    return <EmployeeTabNavigator />;
  }

  return (
    <EmployeeStack.Navigator screenOptions={{ headerShown: false }}>
      <EmployeeStack.Screen
        name="EmployeeTabs"
        component={EmployeeTabNavigator}
      />
      <EmployeeStack.Screen
        name="CreateAccidentReport"
        component={CreateAccidentReportScreen}
        options={{ title: "Create Accident Report - HDF HR" }}
      />
      <EmployeeStack.Screen
        name="CreateIllnessReport"
        component={CreateIllnessReportScreen}
        options={{ title: "Create Illness Report - HDF HR" }}
      />
      <EmployeeStack.Screen
        name="CreateStaffDeparture"
        component={CreateStaffDepartureScreen}
        options={{ title: "Create Staff Departure - HDF HR" }}
      />
      <EmployeeStack.Screen
        name="FormDetails"
        component={EmployeeFormDetailsScreen}
        options={{ title: "Form Details - HDF HR" }}
      />
      <EmployeeStack.Screen
        name="TaskDetails"
        component={EmployeeTaskDetailsScreen}
        options={{ title: "Task Details - HDF HR" }}
      />
    </EmployeeStack.Navigator>
  );
};
