import React, { useState, useEffect } from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import {
  useNavigationContainerRef,
  useNavigation,
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
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";

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
import CompanyReceiptsListScreen from "../screens/companyadmin/CompanyReceiptsListScreen.web";
import CreateCompanyReceiptScreen from "../screens/companyadmin/CreateCompanyReceiptScreen.web";
import CompanyReceiptDetailsScreen from "../screens/companyadmin/CompanyReceiptDetailsScreen.web";
import CompanyActivityLogsScreen from "../screens/companyadmin/CompanyActivityLogsScreen";

// Stack navigators
const CompanyAdminStack = createNativeStackNavigator();
const CompanyAdminTab = createBottomTabNavigator();
const ContentStack = createNativeStackNavigator();

// Update the RootStackParamList type
type RootStackParamList = {
  CompanyAdminTabs: undefined;
  MainContent: undefined;
  DashboardScreen: undefined;
  EmployeesScreen: undefined;
  TasksScreen: undefined;
  FormSubmissionsScreen: undefined;
  ProfileScreen: undefined;
  EmployeeDetails: { id: string };
  CreateEmployee: undefined;
  EditEmployee: { id: string };
  TaskDetails: { id: string };
  CreateTask: undefined;
  EditTask: { id: string };
  FormDetails: { id: string };
  CreateEmployeeAccidentReport: undefined;
  CreateEmployeeIllnessReport: undefined;
  CreateEmployeeStaffDepartureReport: undefined;
  ReceiptsScreen: undefined;
  CreateCompanyReceipt: undefined;
  CompanyReceiptDetails: { id: string };
  ActivityLogs: undefined;
};

// Add type for company response
type CompanyResponse = {
  company_id: string;
  company: {
    can_upload_receipts: boolean;
  } | null;
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

// Content area component that includes both main screens and stack screens
const ContentArea = () => {
  return (
    <ContentStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "none",
      }}
    >
      <ContentStack.Group>
        <ContentStack.Screen
          name="MainContent"
          component={MainContentNavigator}
        />
      </ContentStack.Group>

      <ContentStack.Group
        screenOptions={{
          presentation: "modal",
          animation: "slide_from_right",
        }}
      >
        <ContentStack.Screen
          name="EmployeeDetails"
          component={EmployeeDetailsScreen}
        />
        <ContentStack.Screen
          name="CreateEmployee"
          component={CreateEmployeeScreen}
        />
        <ContentStack.Screen
          name="EditEmployee"
          component={EditEmployeeScreen}
        />
        <ContentStack.Screen
          name="TaskDetails"
          component={CompanyAdminTaskDetailsScreen}
        />
        <ContentStack.Screen
          name="CreateTask"
          component={CompanyAdminCreateTaskScreen}
        />
        <ContentStack.Screen
          name="EditTask"
          component={CompanyAdminEditTaskScreen}
        />
        <ContentStack.Screen name="FormDetails" component={FormDetailsScreen} />
        <ContentStack.Screen
          name="CreateEmployeeAccidentReport"
          component={CreateEmployeeAccidentReportScreen}
        />
        <ContentStack.Screen
          name="CreateEmployeeIllnessReport"
          component={CreateEmployeeIllnessReportScreen}
        />
        <ContentStack.Screen
          name="CreateEmployeeStaffDepartureReport"
          component={CreateEmployeeStaffDepartureReportScreen}
        />
        <ContentStack.Screen
          name="CreateCompanyReceipt"
          component={CreateCompanyReceiptScreen}
        />
        <ContentStack.Screen
          name="CompanyReceiptDetails"
          component={CompanyReceiptDetailsScreen}
        />
        <ContentStack.Screen
          name="ActivityLogs"
          component={CompanyActivityLogsScreen}
        />
      </ContentStack.Group>
    </ContentStack.Navigator>
  );
};

// MainContentNavigator for the main screens
const MainContentNavigator = () => {
  return (
    <ContentStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "none",
      }}
      initialRouteName="DashboardScreen"
    >
      <ContentStack.Screen
        name="DashboardScreen"
        component={CompanyAdminDashboard}
      />
      <ContentStack.Screen
        name="EmployeesScreen"
        component={EmployeeListScreen}
      />
      <ContentStack.Screen
        name="TasksScreen"
        component={CompanyAdminTasksScreen}
      />
      <ContentStack.Screen
        name="FormSubmissionsScreen"
        component={FormSubmissionsScreen}
      />
      <ContentStack.Screen
        name="ReceiptsScreen"
        component={CompanyReceiptsListScreen}
      />
      <ContentStack.Screen
        name="ProfileScreen"
        component={CompanyAdminProfileScreen}
      />
    </ContentStack.Navigator>
  );
};

// Web Layout with SidebarLayout
const WebStackNavigator = () => {
  const [activeScreen, setActiveScreen] = useState("DashboardScreen");
  const [canUploadReceipts, setCanUploadReceipts] = useState(false);
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { user } = useAuth();

  useEffect(() => {
    fetchCompanyPermissions();
  }, []);

  const fetchCompanyPermissions = async () => {
    if (!user) return;

    try {
      const { data: companyUser, error: companyUserError } = await supabase
        .from("company_user")
        .select("company_id, company:company_id(can_upload_receipts)")
        .eq("id", user.id)
        .single();

      if (companyUserError) throw companyUserError;

      if (companyUser) {
        // Properly access the can_upload_receipts property
        const can_upload = companyUser.company
          ? (companyUser.company as any).can_upload_receipts
          : false;
        setCanUploadReceipts(can_upload ?? false);
      }
    } catch (error) {
      console.error("Error fetching company permissions:", error);
    }
  };

  const baseNavigationItems = [
    {
      icon: "home" as const,
      label: t("navigation.dashboard"),
      screen: "DashboardScreen",
    },
    {
      icon: "account-group" as const,
      label: t("navigation.employees"),
      screen: "EmployeesScreen",
    },
    {
      icon: "clipboard-text" as const,
      label: t("navigation.tasks"),
      screen: "TasksScreen",
    },
    {
      icon: "file-document" as const,
      label: t("navigation.forms"),
      screen: "FormSubmissionsScreen",
    },
    {
      icon: "account-circle" as const,
      label: t("navigation.profile"),
      screen: "ProfileScreen",
    },
  ];

  const navigationItems = canUploadReceipts
    ? [
        ...baseNavigationItems.slice(0, -1),
        {
          icon: "receipt" as const,
          label: t("navigation.receipts"),
          screen: "ReceiptsScreen",
        },
        baseNavigationItems[baseNavigationItems.length - 1],
      ]
    : baseNavigationItems;

  // Handle navigation
  const handleNavigation = (screen: string) => {
    setActiveScreen(screen);
    navigation.navigate("MainContent");
    // Use a timeout to ensure MainContent is mounted before navigating to the screen
    setTimeout(() => {
      // @ts-ignore - Ignore the typing error as we know these routes exist
      navigation.navigate(screen);
    }, 0);
  };

  return (
    <SidebarLayout
      activeScreen={activeScreen}
      setActiveScreen={setActiveScreen}
      navigationItems={navigationItems}
      content={<ContentArea />}
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
  const { user } = useAuth();
  const [canUploadReceipts, setCanUploadReceipts] = useState(false);

  useEffect(() => {
    fetchCompanyPermissions();
  }, []);

  const fetchCompanyPermissions = async () => {
    if (!user) return;

    try {
      const { data: companyUser, error: companyUserError } = await supabase
        .from("company_user")
        .select("company_id, company:company_id(can_upload_receipts)")
        .eq("id", user.id)
        .single();

      if (companyUserError) throw companyUserError;

      if (companyUser) {
        // Properly access the can_upload_receipts property
        const can_upload = companyUser.company
          ? (companyUser.company as any).can_upload_receipts
          : false;
        setCanUploadReceipts(can_upload ?? false);
      }
    } catch (error) {
      console.error("Error fetching company permissions:", error);
    }
  };

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
        {canUploadReceipts && (
          <CompanyAdminTab.Screen
            name="Receipts"
            component={CompanyReceiptsListScreen}
            options={{
              tabBarIcon: ({ color }) => (
                <MaterialCommunityIcons
                  name="receipt"
                  color={color}
                  size={24}
                />
              ),
            }}
          />
        )}
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
    return <WebStackNavigator />;
  }

  return (
    <CompanyAdminStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <CompanyAdminStack.Screen
        name="CompanyAdminTabs"
        component={CompanyAdminTabNavigator}
      />

      <CompanyAdminStack.Group
        screenOptions={{
          presentation: "modal",
          animation: "slide_from_right",
        }}
      >
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
        <CompanyAdminStack.Screen
          name="CreateCompanyReceipt"
          component={CreateCompanyReceiptScreen}
        />
        <CompanyAdminStack.Screen
          name="CompanyReceiptDetails"
          component={CompanyReceiptDetailsScreen}
        />
        <CompanyAdminStack.Screen
          name="ActivityLogs"
          component={CompanyActivityLogsScreen}
        />
      </CompanyAdminStack.Group>
    </CompanyAdminStack.Navigator>
  );
};
