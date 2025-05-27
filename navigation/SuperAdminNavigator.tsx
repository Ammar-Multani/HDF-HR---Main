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
            icon="domain"
            label="Companies"
            isActive={activeScreen === "Companies"}
            onPress={() => handleNavigation("Companies")}
          />
          <NavItem
            icon="clipboard-text"
            label="Tasks"
            isActive={activeScreen === "Tasks"}
            onPress={() => handleNavigation("Tasks")}
          />
          <NavItem
            icon="receipt"
            label="Receipts"
            isActive={activeScreen === "Receipts"}
            onPress={() => handleNavigation("Receipts")}
          />
          <NavItem
            icon="file-document"
            label="Forms"
            isActive={activeScreen === "Forms"}
            onPress={() => handleNavigation("Forms")}
          />
          <NavItem
            icon="account-group"
            label="Users"
            isActive={activeScreen === "Users"}
            onPress={() => handleNavigation("Users")}
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

// Tab Navigator for SuperAdmin
const SuperAdminTabNavigator = () => {
  const theme = useTheme();
  const isWeb = Platform.OS === "web";
  const windowWidth = Dimensions.get("window").width;
  const isLargeScreen = isWeb && windowWidth > 768;

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
          name="Utilities"
          component={SuperAdminUtilitiesScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <MaterialCommunityIcons name="tools" color={color} size={24} />
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
  }

  // For web with large screen: Use stack navigator with WebLayout
  return (
    <WebLayout>
      <SuperAdminStack.Navigator screenOptions={{ headerShown: false }}>
        <SuperAdminStack.Screen
          name="Dashboard"
          component={SuperAdminDashboard}
        />
        <SuperAdminStack.Screen
          name="Companies"
          component={CompanyListScreen}
        />
        <SuperAdminStack.Screen
          name="Tasks"
          component={SuperAdminTasksScreen}
        />
        <SuperAdminStack.Screen
          name="Forms"
          component={SuperAdminFormsScreen}
        />
        <SuperAdminStack.Screen
          name="Receipts"
          component={ReceiptsListScreen}
        />
        <SuperAdminStack.Screen
          name="Users"
          component={SuperAdminUsersScreen}
        />
        <SuperAdminStack.Screen
          name="Profile"
          component={SuperAdminProfileScreen}
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
        <SuperAdminStack.Screen
          name="CreateTask"
          component={CreateTaskScreen}
        />
        <SuperAdminStack.Screen
          name="CreateSuperAdmin"
          component={CreateSuperAdminScreen}
        />
        <SuperAdminStack.Screen
          name="SuperAdminDetailsScreen"
          component={SuperAdminDetailsScreen}
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
          name="SuperAdminFormDetailsScreen"
          component={SuperAdminFormDetailsScreen}
        />
        <SuperAdminStack.Screen
          name="CreateReceipt"
          component={CreateReceiptScreen}
        />
        <SuperAdminStack.Screen
          name="ReceiptDetails"
          component={ReceiptDetailsScreen}
        />
        <SuperAdminStack.Screen name="EditTask" component={EditTaskScreen} />
      </SuperAdminStack.Navigator>
    </WebLayout>
  );
};

// Super Admin Navigator
export const SuperAdminNavigator = () => {
  const theme = useTheme();
  const isWeb = Platform.OS === "web";
  const windowWidth = Dimensions.get("window").width;
  const isLargeScreen = isWeb && windowWidth > 768;

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
    </SuperAdminStack.Navigator>
  );
};
