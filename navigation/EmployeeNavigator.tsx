import React, { useState } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import { useNavigationContainerRef } from "@react-navigation/native";
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

// Tab Navigator for Employee
const EmployeeTabNavigator = () => {
  const theme = useTheme();
  const isWeb = Platform.OS === "web";
  const windowWidth = Dimensions.get("window").width;
  const isLargeScreen = isWeb && windowWidth > 768;
  const nav = useNavigationContainerRef();
  const [activeScreen, setActiveScreen] = useState("Dashboard");

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

// Employee Navigator
export const EmployeeNavigator = () => (
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
