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

// Stack navigators
const CompanyAdminStack = createNativeStackNavigator();
const CompanyAdminTab = createBottomTabNavigator();

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

// Web layout component that includes the sidebar
const WebLayout = ({ children }: { children: React.ReactNode }) => {
  const navigation = useNavigation<any>();
  const [activeScreen, setActiveScreen] = useState("Dashboard");

  const handleNavigation = (screen: string) => {
    setActiveScreen(screen);
    navigation.navigate(screen);
  };

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
            "rgba(10,185,129,255)",
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
            onPress={() => handleNavigation("Dashboard")}
          />
          <NavItem
            icon="account-group"
            label="Employees"
            isActive={activeScreen === "Employees"}
            onPress={() => handleNavigation("Employees")}
          />
          <NavItem
            icon="clipboard-text"
            label="Tasks"
            isActive={activeScreen === "Tasks"}
            onPress={() => handleNavigation("Tasks")}
          />
          <NavItem
            icon="file-document"
            label="Forms"
            isActive={activeScreen === "FormSubmissions"}
            onPress={() => handleNavigation("FormSubmissions")}
          />
          <NavItem
            icon="account-circle"
            label="Profile"
            isActive={activeScreen === "Profile"}
            onPress={() => handleNavigation("Profile")}
          />
        </View>
      </View>

      {/* Main Content */}
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
};

// Tab Navigator for CompanyAdmin
const CompanyAdminTabNavigator = () => {
  const theme = useTheme();
  const isWeb = Platform.OS === "web";
  const windowWidth = Dimensions.get("window").width;
  const isLargeScreen = isWeb && windowWidth > 768;

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
  }

  // For web with large screen: Use stack navigator with WebLayout
  return (
    <WebLayout>
      <CompanyAdminStack.Navigator screenOptions={{ headerShown: false }}>
        <CompanyAdminStack.Screen
          name="Dashboard"
          component={CompanyAdminDashboard}
        />
        <CompanyAdminStack.Screen
          name="Employees"
          component={EmployeeListScreen}
        />
        <CompanyAdminStack.Screen
          name="Tasks"
          component={CompanyAdminTasksScreen}
        />
        <CompanyAdminStack.Screen
          name="FormSubmissions"
          component={FormSubmissionsScreen}
        />
        <CompanyAdminStack.Screen
          name="Profile"
          component={CompanyAdminProfileScreen}
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
      </CompanyAdminStack.Navigator>
    </WebLayout>
  );
};

// Company Admin Navigator
export const CompanyAdminNavigator = () => {
  const isWeb = Platform.OS === "web";
  const windowWidth = Dimensions.get("window").width;
  const isLargeScreen = isWeb && windowWidth > 768;

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
    </CompanyAdminStack.Navigator>
  );
};
