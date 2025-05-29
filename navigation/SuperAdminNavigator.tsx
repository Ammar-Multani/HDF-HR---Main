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
import SuperAdminFormsScreen from "../screens/superadmin/SuperAdminFormsScreen";
import SuperAdminUtilitiesScreen from "../screens/superadmin/SuperAdminUtilitiesScreen";
import SuperAdminFormDetailsScreen from "../screens/superadmin/SuperAdminFormDetailsScreen";
import CreateReceiptScreen from "../screens/superadmin/CreateReceiptScreen";
import CreateEmployeesScreen from "../screens/superadmin/CreateEmployeesScreen";
import ReceiptsListScreen from "../screens/superadmin/ReceiptsListScreen";
import ReceiptDetailsScreen from "../screens/superadmin/ReceiptDetailsScreen";
import EditTaskScreen from "../screens/superadmin/EditTaskScreen";
import EditReceiptScreen from "../screens/superadmin/EditReceiptScreen";

// Stack navigators
const SuperAdminStack = createNativeStackNavigator();
const SuperAdminTab = createBottomTabNavigator();

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
        paddingVertical: 10,
        paddingHorizontal: 15,
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
  const [currentStackScreen, setCurrentStackScreen] = useState(null);

  const navigationItems = [
    { icon: "home", label: "Dashboard", screen: "Dashboard" },
    { icon: "domain", label: "Companies", screen: "Companies" },
    { icon: "account-group", label: "Users", screen: "Users" },
    { icon: "file-document", label: "Forms", screen: "Forms" },
    { icon: "receipt", label: "Receipts", screen: "Receipts" },
    { icon: "clipboard-text", label: "Tasks", screen: "Tasks" },
    { icon: "account-circle", label: "Profile", screen: "Profile" },
  ];

  // Define the main content screens
  const mainContent = {
    Dashboard: <SuperAdminDashboard />,
    Companies: <CompanyListScreen />,
    Users: <SuperAdminUsersScreen />,
    Forms: <SuperAdminFormsScreen />,
    Receipts: <ReceiptsListScreen />,
    Tasks: <SuperAdminTasksScreen />,
    Profile: <SuperAdminProfileScreen />,
  };

  // Create a stack navigator for the content area
  const ContentStack = createNativeStackNavigator();

  // Content area component that includes both main screens and stack screens
  const ContentArea = () => {
    return (
      <ContentStack.Navigator screenOptions={{ headerShown: false }}>
        <ContentStack.Screen name="MainContent">
          {() => mainContent[activeScreen]}
        </ContentStack.Screen>
        <ContentStack.Screen
          name="CompanyDetails"
          component={CompanyDetailsScreen}
        />
        <ContentStack.Screen
          name="CreateCompany"
          component={CreateCompanyScreen}
        />
        <ContentStack.Screen name="EditCompany" component={EditCompanyScreen} />
        <ContentStack.Screen
          name="TaskDetails"
          component={SuperAdminTaskDetailsScreen}
        />
        <ContentStack.Screen name="CreateTask" component={CreateTaskScreen} />
        <ContentStack.Screen
          name="CreateSuperAdmin"
          component={CreateSuperAdminScreen}
        />
        <ContentStack.Screen
          name="SuperAdminDetailsScreen"
          component={SuperAdminDetailsScreen}
        />
        <ContentStack.Screen
          name="EditSuperAdmin"
          component={EditSuperAdminScreen}
        />
        <ContentStack.Screen
          name="CompanyAdminDetailsScreen"
          component={CompanyAdminDetailsScreen}
        />
        <ContentStack.Screen
          name="EditCompanyAdmin"
          component={EditCompanyAdminScreen}
        />
        <ContentStack.Screen
          name="EmployeeDetailedScreen"
          component={EmployeeDetailedScreen}
        />
        <ContentStack.Screen
          name="CreateCompanyAdmin"
          component={CreateCompanyAdminScreen}
        />
        <ContentStack.Screen
          name="CreateEmployee"
          component={CreateEmployeesScreen}
        />
        <ContentStack.Screen
          name="SuperAdminFormDetailsScreen"
          component={SuperAdminFormDetailsScreen}
        />
        <ContentStack.Screen
          name="CreateReceipt"
          component={CreateReceiptScreen}
        />
        <ContentStack.Screen
          name="ReceiptDetails"
          component={ReceiptDetailsScreen}
        />
        <ContentStack.Screen name="EditTask" component={EditTaskScreen} />
        <ContentStack.Screen name="EditReceipt" component={EditReceiptScreen} />
      </ContentStack.Navigator>
    );
  };

  // Handle navigation
  const handleNavigation = (screen: string) => {
    // Check if the screen is a main navigation item
    if (navigationItems.some((item) => item.screen === screen)) {
      setActiveScreen(screen);
      navigation.navigate("MainContent");
    } else {
      // It's a stack screen
      navigation.navigate(screen);
    }
  };

  return (
    <SidebarLayout
      activeScreen={activeScreen}
      setActiveScreen={setActiveScreen}
      navigationItems={navigationItems}
      content={{
        Dashboard: <ContentArea />,
        Companies: <ContentArea />,
        Users: <ContentArea />,
        Forms: <ContentArea />,
        Receipts: <ContentArea />,
        Tasks: <ContentArea />,
        Profile: <ContentArea />,
      }}
      onNavigate={handleNavigation}
    />
  );
};

// Tab Navigator for SuperAdmin
const SuperAdminTabNavigator = () => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isLargeScreen = isWeb && width > 768;

  // For mobile or small screen: Use bottom tabs
  if (!isLargeScreen) {
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
        <SuperAdminTab.Screen
          name="Dashboard"
          component={SuperAdminDashboard}
          options={{
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="home" color={color} size={24} />
            ),
          }}
        />
        <SuperAdminTab.Screen
          name="Companies"
          component={CompanyListScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="domain" color={color} size={24} />
            ),
          }}
        />
        <SuperAdminTab.Screen
          name="Utilities"
          component={SuperAdminUtilitiesScreen}
          options={{
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="tools" color={color} size={24} />
            ),
          }}
        />
        <SuperAdminTab.Screen
          name="Users"
          component={SuperAdminUsersScreen}
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
        <SuperAdminTab.Screen
          name="Profile"
          component={SuperAdminProfileScreen}
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
      </SuperAdminTab.Navigator>
    );
  }

  // For web with large screen: Use SidebarLayout
  return <WebStackNavigator />;
};

// Super Admin Navigator
export const SuperAdminNavigator = () => {
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const isLargeScreen = isWeb && width > 768;

  if (isLargeScreen) {
    return <SuperAdminTabNavigator />;
  }

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
      <SuperAdminStack.Screen
        name="SuperAdminFormsScreen"
        component={SuperAdminFormsScreen}
      />
      <SuperAdminStack.Screen
        name="SuperAdminFormDetailsScreen"
        component={SuperAdminFormDetailsScreen}
      />
      <SuperAdminStack.Screen
        name="SuperAdminUtilitiesScreen"
        component={SuperAdminUtilitiesScreen}
      />
      <SuperAdminStack.Screen
        name="SuperAdminTasksScreen"
        component={SuperAdminTasksScreen}
      />
      <SuperAdminStack.Screen
        name="CreateReceipt"
        component={CreateReceiptScreen}
      />
      <SuperAdminStack.Screen
        name="ReceiptsListScreen"
        component={ReceiptsListScreen}
      />
      <SuperAdminStack.Screen
        name="ReceiptDetails"
        component={ReceiptDetailsScreen}
      />
      <SuperAdminStack.Screen name="EditTask" component={EditTaskScreen} />
      <SuperAdminStack.Screen
        name="EditReceipt"
        component={EditReceiptScreen}
      />
    </SuperAdminStack.Navigator>
  );
};
