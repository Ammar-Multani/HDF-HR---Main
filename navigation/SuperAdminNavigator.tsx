import React, { useState, useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import {
  useNavigationContainerRef,
  useNavigation,
  useRoute,
  NavigationProp,
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
import ActivityLogsScreen from "../screens/superadmin/ActivityLogsScreen";
import SuperAdminCreateEmployeeAccidentReportScreen from "../screens/superadmin/SuperAdminCreateEmployeeAccidentReportScreen.web";
import SuperAdminCreateEmployeeIllnessReportScreen from "../screens/superadmin/SuperAdminCreateEmployeeIllnessReportScreen.web";
import SuperAdminCreateEmployeeStaffDepartureScreen from "../screens/superadmin/SuperAdminCreateEmployeeStaffDepartureScreen.web";
// Stack navigators
const SuperAdminStack = createNativeStackNavigator();
const SuperAdminTab = createBottomTabNavigator();
const ContentStack = createNativeStackNavigator();
const WebContentStack = createNativeStackNavigator();

// Update the RootStackParamList type
type RootStackParamList = {
  MainContent: undefined;
  MainTabs: undefined;
  Dashboard: undefined;
  Companies: undefined;
  Users: undefined;
  Forms: undefined;
  Receipts: undefined;
  Tasks: undefined;
  Profile: undefined;
  CompanyDetails: { companyId: string };
  CreateCompany: undefined;
  EditCompany: { companyId: string };
  TaskDetails: { id: string };
  CreateTask: undefined;
  EditTask: { id: string };
  CreateSuperAdmin: undefined;
  SuperAdminDetailsScreen: { id: string };
  EditSuperAdmin: { id: string };
  CompanyAdminDetailsScreen: { id: string };
  EditCompanyAdmin: { id: string };
  CreateCompanyAdmin: undefined;
  CreateEmployee: undefined;
  SuperAdminFormDetailsScreen: { id: string };
  CreateReceipt: undefined;
  ReceiptDetails: { id: string };
  EditReceipt: { id: string };
  ActivityLogs: undefined;
  EmployeeDetails: { id: string };
  ReceiptsListScreen: undefined;
  SuperAdminFormsScreen: undefined;
  SuperAdminTasksScreen: undefined;
  Utilities: undefined;
  SuperAdminCreateEmployeeAccidentReport: undefined;
  SuperAdminCreateEmployeeIllnessReport: undefined;
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
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  const navigationItems = [
    {
      icon: "home",
      label: t("navigation.dashboard"),
      screen: "Dashboard",
    },
    {
      icon: "domain",
      label: t("navigation.companies"),
      screen: "Companies",
    },
    {
      icon: "account-group",
      label: t("navigation.users"),
      screen: "Users",
    },
    {
      icon: "file-document",
      label: t("navigation.forms"),
      screen: "Forms",
    },
    {
      icon: "receipt",
      label: t("navigation.receipts"),
      screen: "Receipts",
    },
    {
      icon: "clipboard-text",
      label: t("navigation.tasks"),
      screen: "Tasks",
    },
    {
      icon: "account-circle",
      label: t("navigation.profile"),
      screen: "Profile",
    },
  ];

  // Handle navigation
  const handleNavigation = (screen: string) => {
    setActiveScreen(screen);
    // Navigate to MainContent first, then to the specific screen
    navigation.navigate("MainContent");
    // Use a timeout to ensure MainContent is mounted before navigating to the screen
    setTimeout(() => {
      (navigation as any).navigate(screen);
    }, 0);
  };

  return (
    <SidebarLayout
      activeScreen={activeScreen}
      setActiveScreen={setActiveScreen}
      navigationItems={navigationItems}
      content={
        <WebContentStack.Navigator
          screenOptions={{
            headerShown: false,
            animation: "none",
            presentation: "containedModal",
            contentStyle: {
              backgroundColor: "transparent",
            },
          }}
        >
          <WebContentStack.Group>
            <WebContentStack.Screen name="MainContent">
              {() => (
                <ContentStack.Navigator
                  screenOptions={{
                    headerShown: false,
                    animation: "none",
                  }}
                  initialRouteName="Dashboard"
                >
                  <ContentStack.Screen
                    name="Dashboard"
                    component={SuperAdminDashboard}
                  />
                  <ContentStack.Screen
                    name="Companies"
                    component={CompanyListScreen}
                  />
                  <ContentStack.Screen
                    name="Users"
                    component={SuperAdminUsersScreen}
                  />
                  <ContentStack.Screen
                    name="Forms"
                    component={SuperAdminFormsScreen}
                  />
                  <ContentStack.Screen
                    name="Receipts"
                    component={ReceiptsListScreen}
                  />
                  <ContentStack.Screen
                    name="Tasks"
                    component={SuperAdminTasksScreen}
                  />
                  <ContentStack.Screen
                    name="Profile"
                    component={SuperAdminProfileScreen}
                  />
                </ContentStack.Navigator>
              )}
            </WebContentStack.Screen>
          </WebContentStack.Group>

          <WebContentStack.Group
            screenOptions={{
              presentation: "containedModal",
              contentStyle: {
                backgroundColor: "#f8fafc",
              },
            }}
          >
            <WebContentStack.Screen
              name="CompanyDetails"
              component={CompanyDetailsScreen}
            />
            <WebContentStack.Screen
              name="CreateCompany"
              component={CreateCompanyScreen}
            />
            <WebContentStack.Screen
              name="EditCompany"
              component={EditCompanyScreen}
            />
            <WebContentStack.Screen
              name="TaskDetails"
              component={SuperAdminTaskDetailsScreen}
            />
            <WebContentStack.Screen
              name="CreateTask"
              component={CreateTaskScreen}
            />
            <WebContentStack.Screen
              name="EditTask"
              component={EditTaskScreen}
            />
            <WebContentStack.Screen
              name="CreateSuperAdmin"
              component={CreateSuperAdminScreen}
            />
            <WebContentStack.Screen
              name="SuperAdminDetailsScreen"
              component={SuperAdminDetailsScreen}
            />
            <WebContentStack.Screen
              name="EditSuperAdmin"
              component={EditSuperAdminScreen}
            />
            <WebContentStack.Screen
              name="CompanyAdminDetailsScreen"
              component={CompanyAdminDetailsScreen}
            />
            <WebContentStack.Screen
              name="EditCompanyAdmin"
              component={EditCompanyAdminScreen}
            />
            <WebContentStack.Screen
              name="CreateCompanyAdmin"
              component={CreateCompanyAdminScreen}
            />
            <WebContentStack.Screen
              name="CreateEmployee"
              component={CreateEmployeesScreen}
            />
            <WebContentStack.Screen
              name="SuperAdminFormDetailsScreen"
              component={SuperAdminFormDetailsScreen}
            />
            <WebContentStack.Screen
              name="CreateReceipt"
              component={CreateReceiptScreen}
            />
            <WebContentStack.Screen
              name="ReceiptDetails"
              component={ReceiptDetailsScreen}
            />
            <WebContentStack.Screen
              name="EditReceipt"
              component={EditReceiptScreen}
            />
            <WebContentStack.Screen
              name="ActivityLogs"
              component={ActivityLogsScreen}
            />
            <WebContentStack.Screen
              name="EmployeeDetails"
              component={EmployeeDetailedScreen}
            />
            <WebContentStack.Screen
              name="SuperAdminCreateEmployeeAccidentReport"
              component={SuperAdminCreateEmployeeAccidentReportScreen}
            />
            <WebContentStack.Screen
              name="SuperAdminCreateEmployeeIllnessReport"
              component={SuperAdminCreateEmployeeIllnessReportScreen}
            />
            <WebContentStack.Screen
              name="SuperAdminCreateEmployeeStaffDeparture"
              component={SuperAdminCreateEmployeeStaffDepartureScreen}
            />
          </WebContentStack.Group>
        </WebContentStack.Navigator>
      }
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
          options={{
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="home" color={color} size={24} />
            ),
          }}
        >
          {() => (
            <ContentStack.Navigator
              screenOptions={{
                headerShown: false,
                animation: "none",
              }}
            >
              <ContentStack.Screen
                name="DashboardMain"
                component={SuperAdminDashboard}
              />
            </ContentStack.Navigator>
          )}
        </SuperAdminTab.Screen>

        <SuperAdminTab.Screen
          name="Companies"
          options={{
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="domain" color={color} size={24} />
            ),
          }}
        >
          {() => (
            <ContentStack.Navigator
              screenOptions={{
                headerShown: false,
                animation: "none",
              }}
            >
              <ContentStack.Screen
                name="CompaniesList"
                component={CompanyListScreen}
              />
              <ContentStack.Screen
                name="CompanyDetails"
                component={CompanyDetailsScreen}
              />
              <ContentStack.Screen
                name="CreateCompany"
                component={CreateCompanyScreen}
              />
              <ContentStack.Screen
                name="EditCompany"
                component={EditCompanyScreen}
              />
            </ContentStack.Navigator>
          )}
        </SuperAdminTab.Screen>

        <SuperAdminTab.Screen
          name="Users"
          options={{
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons
                name="account-group"
                color={color}
                size={24}
              />
            ),
          }}
        >
          {() => (
            <ContentStack.Navigator
              screenOptions={{
                headerShown: false,
                animation: "none",
              }}
            >
              <ContentStack.Screen
                name="UsersList"
                component={SuperAdminUsersScreen}
              />
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
                name="CreateCompanyAdmin"
                component={CreateCompanyAdminScreen}
              />
              <ContentStack.Screen
                name="CreateEmployee"
                component={CreateEmployeesScreen}
              />
              <ContentStack.Screen
                name="EmployeeDetails"
                component={EmployeeDetailedScreen}
              />
            </ContentStack.Navigator>
          )}
        </SuperAdminTab.Screen>

        <SuperAdminTab.Screen
          name="Utilities"
          options={{
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons name="tools" color={color} size={24} />
            ),
          }}
        >
          {() => (
            <ContentStack.Navigator
              screenOptions={{
                headerShown: false,
                animation: "none",
              }}
            >
              <ContentStack.Screen
                name="UtilitiesMain"
                component={SuperAdminUtilitiesScreen}
              />
              <ContentStack.Screen
                name="FormsList"
                component={SuperAdminFormsScreen}
              />
              <ContentStack.Screen
                name="SuperAdminFormDetailsScreen"
                component={SuperAdminFormDetailsScreen}
              />
              <ContentStack.Screen
                name="TasksList"
                component={SuperAdminTasksScreen}
              />
              <ContentStack.Screen
                name="TaskDetails"
                component={SuperAdminTaskDetailsScreen}
              />
              <ContentStack.Screen
                name="CreateTask"
                component={CreateTaskScreen}
              />
              <ContentStack.Screen name="EditTask" component={EditTaskScreen} />
              <ContentStack.Screen
                name="ReceiptsList"
                component={ReceiptsListScreen}
              />
              <ContentStack.Screen
                name="CreateReceipt"
                component={CreateReceiptScreen}
              />
              <ContentStack.Screen
                name="ReceiptDetails"
                component={ReceiptDetailsScreen}
              />
              <ContentStack.Screen
                name="EditReceipt"
                component={EditReceiptScreen}
              />
            </ContentStack.Navigator>
          )}
        </SuperAdminTab.Screen>

        <SuperAdminTab.Screen
          name="Profile"
          options={{
            tabBarIcon: ({ color }) => (
              <MaterialCommunityIcons
                name="account-circle"
                color={color}
                size={24}
              />
            ),
          }}
        >
          {() => (
            <ContentStack.Navigator
              screenOptions={{
                headerShown: false,
                animation: "none",
              }}
            >
              <ContentStack.Screen
                name="ProfileMain"
                component={SuperAdminProfileScreen}
              />
            </ContentStack.Navigator>
          )}
        </SuperAdminTab.Screen>
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
    return <WebStackNavigator />;
  }

  // For mobile/small screens, use a single stack navigator with nested tab navigator
  return (
    <SuperAdminStack.Navigator screenOptions={{ headerShown: false }}>
      <SuperAdminStack.Screen
        name="MainTabs"
        component={SuperAdminTabNavigator}
      />

      {/* Additional stack screens for utilities navigation */}
      <SuperAdminStack.Screen
        name="ReceiptsListScreen"
        component={ReceiptsListScreen}
      />
      <SuperAdminStack.Screen
        name="SuperAdminFormsScreen"
        component={SuperAdminFormsScreen}
      />
      <SuperAdminStack.Screen
        name="SuperAdminTasksScreen"
        component={SuperAdminTasksScreen}
      />
      <SuperAdminStack.Screen
        name="SuperAdminFormDetailsScreen"
        component={SuperAdminFormDetailsScreen}
      />
      <SuperAdminStack.Screen
        name="TaskDetails"
        component={SuperAdminTaskDetailsScreen}
      />
      <SuperAdminStack.Screen name="CreateTask" component={CreateTaskScreen} />
      <SuperAdminStack.Screen name="EditTask" component={EditTaskScreen} />
      <SuperAdminStack.Screen
        name="CreateReceipt"
        component={CreateReceiptScreen}
      />
      <SuperAdminStack.Screen
        name="ReceiptDetails"
        component={ReceiptDetailsScreen}
      />
      <SuperAdminStack.Screen
        name="EditReceipt"
        component={EditReceiptScreen}
      />
      <SuperAdminStack.Screen
        name="SuperAdminCreateEmployeeAccidentReport"
        component={SuperAdminCreateEmployeeAccidentReportScreen}
      />
      <SuperAdminStack.Screen
        name="SuperAdminCreateEmployeeIllnessReport"
        component={SuperAdminCreateEmployeeIllnessReportScreen}
      />
      <SuperAdminStack.Screen
        name="SuperAdminCreateEmployeeStaffDeparture"
        component={SuperAdminCreateEmployeeStaffDepartureScreen}
      />
    </SuperAdminStack.Navigator>
  );
};
