import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  StatusBar,
  Dimensions,
  Platform,
  TouchableOpacity,
} from "react-native";
import { useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { supabase, isNetworkAvailable } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import { TaskStatus, FormStatus } from "../../types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Text from "../../components/Text";
import { globalStyles, createTextStyle } from "../../utils/globalStyles";
import DynamicChart from "../../components/DynamicChart";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

// Add this interface above the component
interface CompanyData {
  company_name: string;
}

// Add EmployeeData interface after CompanyData interface
interface EmployeeData {
  id: string;
  name: string;
  forms_count: number;
}

// Add Shimmer component
interface ShimmerProps {
  width: number | string;
  height: number;
  style?: any;
}

const Shimmer: React.FC<ShimmerProps> = ({ width, height, style }) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: withRepeat(
            withSequence(
              withTiming(typeof width === "number" ? -width : -200, {
                duration: 800,
              }),
              withTiming(typeof width === "number" ? width : 200, {
                duration: 800,
              })
            ),
            -1
          ),
        },
      ],
    };
  });

  return (
    <View
      style={[
        {
          width,
          height,
          backgroundColor: "#E8E8E8",
          overflow: "hidden",
          borderRadius: 4,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            width: "100%",
            height: "100%",
            position: "absolute",
            backgroundColor: "transparent",
          },
          animatedStyle,
        ]}
      >
        <LinearGradient
          colors={["transparent", "rgba(255, 255, 255, 0.4)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: "100%", height: "100%" }}
        />
      </Animated.View>
    </View>
  );
};

const CompanyAdminDashboard = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("");
  const [networkStatus, setNetworkStatus] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAllEmployees, setShowAllEmployees] = useState(false);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    employeeGrowth: "+0%",
    totalTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    tasksGrowth: "+0%",
    totalForms: 0,
    pendingForms: 0,
    formsGrowth: "+0%",
    monthlyEmployees: [] as number[],
    monthlyForms: [] as number[],
    monthLabels: [] as string[],
    topEmployees: [] as EmployeeData[],
  });

  const [windowDimensions, setWindowDimensions] = useState({
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  });

  // Add window resize listener
  useEffect(() => {
    if (Platform.OS === "web") {
      const handleResize = () => {
        setWindowDimensions({
          width: Dimensions.get("window").width,
          height: Dimensions.get("window").height,
        });
      };

      window.addEventListener("resize", handleResize);

      // Cleanup
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // Use windowDimensions.width instead of direct width reference
  const isLargeScreen = windowDimensions.width >= 1440;
  const isMediumScreen =
    windowDimensions.width >= 768 && windowDimensions.width < 1440;

  const checkNetworkStatus = async () => {
    const isAvailable = await isNetworkAvailable();
    setNetworkStatus(isAvailable);
    return isAvailable;
  };

  const fetchCompanyId = async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("company_user")
        .select("company_id, company:company_id(company_name)")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching company ID:", error);
        return null;
      }

      // Check if company data exists and set the company name
      if (data && data.company) {
        // @ts-ignore - The company object structure is verified in CompanyAdminProfileScreen
        setCompanyName(data.company.company_name || "");
      }

      return data?.company_id || null;
    } catch (error) {
      console.error("Error fetching company ID:", error);
      return null;
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check network status
      const networkAvailable = await checkNetworkStatus();
      if (!networkAvailable) {
        setError("You're offline. Dashboard data may be outdated.");
      }

      // Get company ID if not already set
      const currentCompanyId = companyId || (await fetchCompanyId());
      if (!currentCompanyId) {
        console.error("No company ID found");
        setLoading(false);
        return;
      }

      setCompanyId(currentCompanyId);

      // Get today's date and reset hours to start of day
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get current month and year
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();

      // Calculate the starting month index to show 5 months of data
      const startMonthIndex =
        currentMonth >= 4 ? currentMonth - 4 : 12 + (currentMonth - 4);

      // Create array of the 5 most recent months to display
      const recentMonths: number[] = [];
      for (let i = 0; i < 5; i++) {
        // Calculate month index (handling year wraparound)
        const monthIndex = (startMonthIndex + i) % 12;
        recentMonths.push(monthIndex);
      }

      const monthNames = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "Jun",
        "Jul",
        "Aug",
        "Sep",
        "Oct",
        "Nov",
        "Dec",
      ];

      // Run all main dashboard queries in parallel for better performance
      const [
        { count: totalEmployees, error: employeesError },
        { count: todayEmployees, error: todayEmployeesError },
        { count: activeEmployees, error: activeEmployeesError },
        { count: totalTasks, error: tasksError },
        { count: todayTasks, error: todayTasksError },
        { count: pendingTasks, error: pendingTasksError },
        { count: completedTasks, error: completedTasksError },
        { count: overdueTasks, error: overdueTasksError },
        { count: accidentReports, error: accidentError },
        { count: illnessReports, error: illnessError },
        { count: departureReports, error: departureError },
        { count: todayAccidentReports, error: todayAccidentError },
        { count: todayIllnessReports, error: todayIllnessError },
        { count: todayDepartureReports, error: todayDepartureError },
        { count: pendingAccidentReports, error: pendingAccidentError },
        { count: pendingIllnessReports, error: pendingIllnessError },
        { count: pendingDepartureReports, error: pendingDepartureError },
      ] = await Promise.all([
        // Fetch employees count
        supabase
          .from("company_user")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId),

        // Today's employees count
        supabase
          .from("company_user")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .gte("created_at", today.toISOString()),

        // Fetch active employees count
        supabase
          .from("company_user")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .eq("active_status", "active"),

        // Fetch tasks count
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId),

        // Today's tasks count
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .gte("created_at", today.toISOString()),

        // Fetch pending tasks count (open + in progress + awaiting response)
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .in("status", [
            TaskStatus.OPEN,
            TaskStatus.IN_PROGRESS,
            TaskStatus.AWAITING_RESPONSE,
          ]),

        // Fetch completed tasks count
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .eq("status", TaskStatus.COMPLETED),

        // Fetch overdue tasks count
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .eq("status", TaskStatus.OVERDUE),

        // Fetch accident reports count
        supabase
          .from("accident_report")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId),

        // Fetch illness reports count
        supabase
          .from("illness_report")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId),

        // Fetch departure reports count
        supabase
          .from("staff_departure_report")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId),

        // Today's accident reports
        supabase
          .from("accident_report")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .gte("created_at", today.toISOString()),

        // Today's illness reports
        supabase
          .from("illness_report")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .gte("submission_date", today.toISOString()),

        // Today's departure reports
        supabase
          .from("staff_departure_report")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .gte("created_at", today.toISOString()),

        // Pending accident reports
        supabase
          .from("accident_report")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .in("status", [FormStatus.DRAFT, FormStatus.PENDING]),

        // Pending illness reports
        supabase
          .from("illness_report")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .in("status", [FormStatus.DRAFT, FormStatus.PENDING]),

        // Pending departure reports
        supabase
          .from("staff_departure_report")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .in("status", [FormStatus.DRAFT, FormStatus.PENDING]),
      ]);

      // Calculate totals and growth percentages
      const totalForms =
        (accidentReports || 0) +
        (illnessReports || 0) +
        (departureReports || 0);

      const todayForms =
        (todayAccidentReports || 0) +
        (todayIllnessReports || 0) +
        (todayDepartureReports || 0);

      const pendingForms =
        (pendingAccidentReports || 0) +
        (pendingIllnessReports || 0) +
        (pendingDepartureReports || 0);

      // Calculate employee growth percentage
      let employeeGrowth = "+0%";
      if (totalEmployees && todayEmployees) {
        if (totalEmployees === todayEmployees) {
          employeeGrowth = "+100%";
        } else {
          const previousEmployees = totalEmployees - todayEmployees;
          const growthRate =
            previousEmployees > 0
              ? (todayEmployees / previousEmployees) * 100
              : 0;
          employeeGrowth =
            (growthRate > 0 ? "+" : "") + growthRate.toFixed(1) + "%";
        }
      }

      // Calculate tasks growth percentage
      let tasksGrowth = "+0%";
      if (totalTasks && todayTasks) {
        if (totalTasks === todayTasks) {
          tasksGrowth = "+100%";
        } else {
          const previousTasks = totalTasks - todayTasks;
          const growthRate =
            previousTasks > 0 ? (todayTasks / previousTasks) * 100 : 0;
          tasksGrowth =
            (growthRate > 0 ? "+" : "") + growthRate.toFixed(1) + "%";
        }
      }

      // Calculate forms growth percentage
      let formsGrowth = "+0%";
      if (totalForms && todayForms) {
        if (totalForms === todayForms) {
          formsGrowth = "+100%";
        } else {
          const previousForms = totalForms - todayForms;
          const growthRate =
            previousForms > 0 ? (todayForms / previousForms) * 100 : 0;
          formsGrowth =
            (growthRate > 0 ? "+" : "") + growthRate.toFixed(1) + "%";
        }
      }

      // Prepare monthly data fetch operations for employees and forms
      const allMonthsEmployeeData = new Array(12).fill(0);
      const allMonthsFormData = new Array(12).fill(0);

      // Create arrays of promises for each month's data
      const monthlyEmployeePromises = [];
      const monthlyAccidentFormPromises = [];
      const monthlyIllnessFormPromises = [];
      const monthlyDepartureFormPromises = [];

      for (let month = 0; month < 12; month++) {
        // Calculate the proper date range - handle year wraparound
        const dateYear = currentMonth >= month ? currentYear : currentYear - 1;
        const monthStart = new Date(dateYear, month, 1);
        const monthEnd = new Date(dateYear, month + 1, 0);

        // Employee data promise
        monthlyEmployeePromises.push(
          supabase
            .from("company_user")
            .select("*", { count: "exact", head: true })
            .eq("company_id", currentCompanyId)
            .gte("created_at", monthStart.toISOString())
            .lte("created_at", monthEnd.toISOString())
        );

        // Form data promises
        monthlyAccidentFormPromises.push(
          supabase
            .from("accident_report")
            .select("*", { count: "exact", head: true })
            .eq("company_id", currentCompanyId)
            .gte("created_at", monthStart.toISOString())
            .lte("created_at", monthEnd.toISOString())
        );

        monthlyIllnessFormPromises.push(
          supabase
            .from("illness_report")
            .select("*", { count: "exact", head: true })
            .eq("company_id", currentCompanyId)
            .gte("submission_date", monthStart.toISOString())
            .lte("submission_date", monthEnd.toISOString())
        );

        monthlyDepartureFormPromises.push(
          supabase
            .from("staff_departure_report")
            .select("*", { count: "exact", head: true })
            .eq("company_id", currentCompanyId)
            .gte("created_at", monthStart.toISOString())
            .lte("created_at", monthEnd.toISOString())
        );
      }

      // Execute all monthly data promises in parallel
      const [
        monthlyEmployeeResults,
        monthlyAccidentResults,
        monthlyIllnessResults,
        monthlyDepartureResults,
      ] = await Promise.all([
        Promise.all(monthlyEmployeePromises),
        Promise.all(monthlyAccidentFormPromises),
        Promise.all(monthlyIllnessFormPromises),
        Promise.all(monthlyDepartureFormPromises),
      ]);

      // Process monthly results
      for (let month = 0; month < 12; month++) {
        // Process employee data
        allMonthsEmployeeData[month] = monthlyEmployeeResults[month].count || 0;

        // Process form data
        const monthAccidentCount = monthlyAccidentResults[month].count || 0;
        const monthIllnessCount = monthlyIllnessResults[month].count || 0;
        const monthDepartureCount = monthlyDepartureResults[month].count || 0;

        allMonthsFormData[month] =
          monthAccidentCount + monthIllnessCount + monthDepartureCount;
      }

      // Extract data for recent months only
      const recentMonthsEmployeeData = recentMonths.map(
        (index) => allMonthsEmployeeData[index]
      );
      const recentMonthsFormData = recentMonths.map(
        (index) => allMonthsFormData[index]
      );
      const recentMonthsLabels = recentMonths.map((index) => monthNames[index]);

      setStats({
        totalEmployees: totalEmployees || 0,
        activeEmployees: activeEmployees || 0,
        employeeGrowth: employeeGrowth,
        totalTasks: totalTasks || 0,
        pendingTasks: pendingTasks || 0,
        completedTasks: completedTasks || 0,
        overdueTasks: overdueTasks || 0,
        tasksGrowth: tasksGrowth,
        totalForms: totalForms,
        pendingForms: pendingForms,
        formsGrowth: formsGrowth,
        monthlyEmployees: recentMonthsEmployeeData,
        monthlyForms: recentMonthsFormData,
        monthLabels: recentMonthsLabels,
        topEmployees: [],
      });

      // Fetch top employees by forms count for this company
      const [
        { data: accidentForms, error: accidentFormsError },
        { data: illnessForms, error: illnessFormsError },
        { data: departureForms, error: departureFormsError },
        { data: companyEmployees, error: companyEmployeesError },
      ] = await Promise.all([
        supabase
          .from("accident_report")
          .select("employee_id")
          .eq("company_id", currentCompanyId)
          .neq("status", FormStatus.DRAFT),
        supabase
          .from("illness_report")
          .select("employee_id")
          .eq("company_id", currentCompanyId)
          .neq("status", FormStatus.DRAFT),
        supabase
          .from("staff_departure_report")
          .select("employee_id")
          .eq("company_id", currentCompanyId)
          .neq("status", FormStatus.DRAFT),
        supabase
          .from("company_user")
          .select("id, first_name, last_name")
          .eq("company_id", currentCompanyId)
          .eq("role", "employee")
          .limit(100),
      ]);

      if (
        accidentFormsError ||
        illnessFormsError ||
        departureFormsError ||
        companyEmployeesError
      ) {
        console.error("Error fetching forms or employees data:", {
          accidentFormsError,
          illnessFormsError,
          departureFormsError,
          companyEmployeesError,
        });
      } else {
        // Count forms per employee
        const employeeFormCounts: Record<string, number> = {};

        // Initialize all employees with 0 forms
        if (companyEmployees) {
          companyEmployees.forEach((employee) => {
            employeeFormCounts[employee.id] = 0;
          });
        }

        // Count accident reports
        if (accidentForms) {
          accidentForms.forEach((form) => {
            if (form.employee_id) {
              employeeFormCounts[form.employee_id] =
                (employeeFormCounts[form.employee_id] || 0) + 1;
            }
          });
        }

        // Count illness reports
        if (illnessForms) {
          illnessForms.forEach((form) => {
            if (form.employee_id) {
              employeeFormCounts[form.employee_id] =
                (employeeFormCounts[form.employee_id] || 0) + 1;
            }
          });
        }

        // Count departure reports
        if (departureForms) {
          departureForms.forEach((form) => {
            if (form.employee_id) {
              employeeFormCounts[form.employee_id] =
                (employeeFormCounts[form.employee_id] || 0) + 1;
            }
          });
        }

        // Process all employees with their form counts
        if (companyEmployees) {
          const employeesWithFormCounts = companyEmployees.map((employee) => ({
            id: employee.id,
            name: `${employee.first_name || ""} ${employee.last_name || ""}`.trim(),
            forms_count: employeeFormCounts[employee.id] || 0,
          }));

          // Sort by form count (highest first)
          const topEmployees = employeesWithFormCounts.sort(
            (a, b) => b.forms_count - a.forms_count
          );

          // Update stats with top employees
          setStats((prevStats) => ({
            ...prevStats,
            topEmployees,
          }));
        }
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Error fetching dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const onRefresh = async () => {
    const isConnected = await checkNetworkStatus();
    if (!isConnected) {
      setError("Cannot refresh while offline");
      return;
    }

    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
        <AppHeader
          showProfileMenu={true}
          userEmail={user?.email || ""}
          isAdmin={true}
          onSignOut={signOut}
          showHelpButton={false}
          showLogo={Platform.OS !== "web"}
          title={Platform.OS === "web" ? "" : undefined}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {Platform.OS !== "web" && (
            <View style={styles.welcomeHeader}>
              <Shimmer width={200} height={28} style={styles.skeletonTitle} />
              <Shimmer
                width={300}
                height={16}
                style={styles.skeletonSubtitle}
              />
            </View>
          )}

          <View style={[styles.statsGridContainer, { gap: 16 }]}>
            {[1, 2, 3, 4].map((_, index) => (
              <View
                key={index}
                style={[
                  styles.statsGridItem,
                  {
                    width: isLargeScreen
                      ? "23.5%"
                      : isMediumScreen
                        ? "31.33%"
                        : "100%",
                    minWidth: isMediumScreen || isLargeScreen ? 275 : "100%",
                    marginBottom: isMediumScreen || isLargeScreen ? 0 : 16,
                  },
                ]}
              >
                <View style={[styles.statsCard, styles.skeletonStatsCard]}>
                  <View style={styles.statRow}>
                    <Shimmer
                      width={140}
                      height={16}
                      style={{ marginBottom: 4 }}
                    />
                    <Shimmer
                      width={45}
                      height={14}
                      style={{ marginLeft: "auto" }}
                    />
                  </View>
                  <Shimmer width={90} height={36} style={{ marginTop: 20 }} />
                </View>
              </View>
            ))}
          </View>

          <View
            style={[
              styles.chartsContainer,
              { flexDirection: isLargeScreen ? "row" : "column" },
            ]}
          >
            {[1, 2].map((_, index) => (
              <View
                key={index}
                style={[
                  styles.chartWrapper,
                  {
                    flex: isLargeScreen ? 1 : undefined,
                    width: "100%",
                    maxWidth: isLargeScreen ? "50%" : 1000,
                    marginBottom: isLargeScreen ? 0 : 24,
                  },
                ]}
              >
                <View style={styles.chartCard}>
                  <Shimmer
                    width={200}
                    height={24}
                    style={{ marginBottom: 24, marginLeft: 24, marginTop: 24 }}
                  />
                  <Shimmer
                    width="90%"
                    height={200}
                    style={{ marginHorizontal: "5%" }}
                  />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
      <View style={styles.container}>
        <AppHeader
          showProfileMenu={true}
          userEmail={user?.email || ""}
          isAdmin={true}
          onSignOut={signOut}
          showHelpButton={false}
          showLogo={Platform.OS !== "web"}
          title={
            Platform.OS === "web"
              ? companyName
                ? `${companyName} Dashboard`
                : "Company Admin Dashboard"
              : undefined
          }
          subtitle={
            Platform.OS === "web"
              ? "Manage your company data and operations"
              : undefined
          }
        />

        <Animated.View style={styles.container} entering={FadeIn.duration(300)}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {Platform.OS !== "web" && (
              <View style={styles.welcomeHeader}>
                <Text variant={"bold"} style={styles.welcomeTitle}>
                  {companyName
                    ? `${companyName} Dashboard`
                    : "Company Admin Dashboard"}
                </Text>
                <Text style={styles.welcomeSubtitle}>
                  Manage your company data and operations
                </Text>
              </View>
            )}

            <View
              style={[
                styles.statsGridContainer,
                {
                  justifyContent: isLargeScreen ? "flex-start" : "center",
                  gap: isMediumScreen || isLargeScreen ? 24 : 16,
                  marginBottom: isMediumScreen || isLargeScreen ? 32 : 24,
                },
              ]}
            >
              {/* Stats Grid Items */}
              {[
                {
                  label: "Total Employees",
                  value: stats.totalEmployees,
                  growth: stats.employeeGrowth,
                },
                {
                  label: "Total Tasks",
                  value: stats.totalTasks,
                  growth: stats.tasksGrowth,
                },
                {
                  label: "Total Forms",
                  value: stats.totalForms,
                  growth: stats.formsGrowth,
                },
                {
                  label: "Active Employees",
                  value: stats.activeEmployees,
                  growth: "+0%",
                },
              ].map((stat, index) => (
                <View
                  key={index}
                  style={[
                    styles.statsGridItem,
                    {
                      width: isLargeScreen
                        ? "23.5%" // Approximately 25% - 18px gap
                        : isMediumScreen
                          ? "31%" // Approximately 33.33% - 16px gap
                          : "100%",
                      minWidth: isMediumScreen || isLargeScreen ? 275 : "100%",
                      marginBottom: isMediumScreen || isLargeScreen ? 0 : 16,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statsCard,
                      {
                        padding: isMediumScreen || isLargeScreen ? 24 : 20,
                      },
                    ]}
                  >
                    <View style={styles.statRow}>
                      <Text variant={"medium"} style={styles.statLabel}>
                        {stat.label}
                      </Text>
                      <Text
                        variant={"bold"}
                        style={[
                          styles.statGrowth,
                          stat.growth.startsWith("-")
                            ? styles.negativeGrowth
                            : {},
                        ]}
                      >
                        {stat.growth}
                      </Text>
                    </View>
                    <Text variant={"bold"} style={styles.statValue}>
                      {stat.value.toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <View
              style={[
                styles.chartsContainer,
                { flexDirection: isLargeScreen ? "row" : "column" },
              ]}
            >
              <View
                style={[
                  styles.chartWrapper,
                  {
                    flex: isLargeScreen ? 1 : undefined,
                    width: "100%",
                    maxWidth: isLargeScreen ? "50%" : 1000,
                    marginBottom: isLargeScreen ? 0 : 24,
                  },
                ]}
              >
                <View style={styles.chartCard}>
                  <Text variant={"bold"} style={styles.sectionTitle}>
                    Monthly Employee Onboarding
                  </Text>
                  <DynamicChart
                    monthlyData={stats.monthlyEmployees}
                    monthLabels={stats.monthLabels}
                    width={
                      Platform.OS === "web"
                        ? isLargeScreen
                          ? Math.min((windowDimensions.width - 72) / 2, 600)
                          : isMediumScreen
                            ? Math.min((windowDimensions.width - 48) / 2, 850)
                            : Math.min(windowDimensions.width - 48, 1000)
                        : windowDimensions.width - 32
                    }
                  />
                </View>
              </View>

              <View
                style={[
                  styles.chartWrapper,
                  {
                    flex: isLargeScreen ? 1 : undefined,
                    width: "100%",
                    maxWidth: isLargeScreen ? "50%" : 1000,
                    marginBottom: isLargeScreen ? 0 : 24,
                  },
                ]}
              >
                <View style={styles.chartCard}>
                  <Text variant={"bold"} style={styles.sectionTitle}>
                    Monthly Forms Submitted
                  </Text>
                  <DynamicChart
                    monthlyData={stats.monthlyForms}
                    monthLabels={stats.monthLabels}
                    width={
                      Platform.OS === "web"
                        ? isLargeScreen
                          ? Math.min((windowDimensions.width - 72) / 2, 600)
                          : isMediumScreen
                            ? Math.min((windowDimensions.width - 48) / 2, 850)
                            : Math.min(windowDimensions.width - 48, 1000)
                        : windowDimensions.width - 32
                    }
                  />
                </View>
              </View>
            </View>

            <View
              style={[
                styles.gridContainer,
                { flexDirection: isLargeScreen ? "row" : "column" },
              ]}
            >
              {/* Top Employees Card */}
              <View
                style={[
                  styles.gridItem,
                  {
                    flex: isLargeScreen ? 1 : undefined,
                    width: "100%",
                    maxWidth: isLargeScreen ? "50%" : 1000,
                    marginBottom: isLargeScreen ? 0 : 24,
                  },
                ]}
              >
                <View style={styles.listCard}>
                  <Text variant={"bold"} style={styles.sectionTitle}>
                    Top Performing Employees
                  </Text>
                  {stats.topEmployees.length > 0 ? (
                    <>
                      {stats.topEmployees
                        .slice(
                          0,
                          showAllEmployees ? stats.topEmployees.length : 3
                        )
                        .map((employee, index) => (
                          <View
                            key={index}
                            style={[
                              styles.employeeCard,
                              index ===
                                (showAllEmployees
                                  ? stats.topEmployees.length
                                  : Math.min(3, stats.topEmployees.length)) -
                                  1 && {
                                borderBottomWidth: 0,
                                marginBottom: 0,
                              },
                            ]}
                          >
                            <View style={styles.employeeInfo}>
                              <Text
                                variant={"bold"}
                                style={styles.employeeName}
                              >
                                {employee.name}
                              </Text>
                            </View>
                            <View style={styles.formsCountContainer}>
                              <Text variant={"bold"} style={styles.formsCount}>
                                {employee.forms_count}
                              </Text>
                              <Text style={styles.formsLabel}>Forms</Text>
                            </View>
                          </View>
                        ))}
                      {stats.topEmployees.length > 3 && (
                        <TouchableOpacity
                          style={styles.showMoreButton}
                          onPress={() => setShowAllEmployees(!showAllEmployees)}
                        >
                          <Text style={styles.showMoreText}>
                            {showAllEmployees ? "Show Less" : "Show More"}
                          </Text>
                          <MaterialCommunityIcons
                            name={
                              showAllEmployees ? "chevron-up" : "chevron-down"
                            }
                            size={16}
                            color="#3b82f6"
                          />
                        </TouchableOpacity>
                      )}
                    </>
                  ) : (
                    <View style={styles.emptyState}>
                      <MaterialCommunityIcons
                        name="account-group"
                        size={48}
                        color={theme.colors.outlineVariant}
                      />
                      <Text style={styles.emptyStateText}>
                        No employee data found
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Task Status Cards */}
              <View
                style={[
                  styles.gridItem,
                  {
                    flex: isLargeScreen ? 1 : undefined,
                    width: "100%",
                    maxWidth: isLargeScreen ? "50%" : 1000,
                  },
                ]}
              >
                <View style={styles.taskCardsWrapper}>
                  <View style={styles.taskCardsGrid}>
                    <View
                      style={[
                        styles.statCardSmall,
                        { width: "100%", marginBottom: 14 },
                      ]}
                    >
                      <Text variant={"medium"} style={styles.statCardLabel}>
                        Pending Tasks
                      </Text>
                      <Text variant={"bold"} style={styles.statCardValue}>
                        {stats.pendingTasks}
                      </Text>
                      <MaterialCommunityIcons
                        name="clipboard-clock"
                        size={24}
                        color="#F59E0B"
                      />
                    </View>

                    <View
                      style={[
                        styles.statCardSmall,
                        { width: "100%", marginBottom: 16 },
                      ]}
                    >
                      <Text variant={"medium"} style={styles.statCardLabel}>
                        Completed Tasks
                      </Text>
                      <Text variant={"bold"} style={styles.statCardValue}>
                        {stats.completedTasks}
                      </Text>
                      <MaterialCommunityIcons
                        name="clipboard-check"
                        size={24}
                        color="#10B981"
                      />
                    </View>

                    <View
                      style={[
                        styles.statCardSmall,
                        { width: "100%", marginBottom: 0 },
                      ]}
                    >
                      <Text variant={"medium"} style={styles.statCardLabel}>
                        Overdue Tasks
                      </Text>
                      <Text variant={"bold"} style={styles.statCardValue}>
                        {stats.overdueTasks}
                      </Text>
                      <MaterialCommunityIcons
                        name="clipboard-alert"
                        size={24}
                        color="#EF4444"
                      />
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Platform.OS === "web" ? (width >= 768 ? 24 : 16) : 16,
    paddingVertical: Platform.OS === "web" ? (width >= 768 ? 24 : 16) : 16,
    paddingBottom: 90,
    maxWidth: Platform.OS === "web" ? 1400 : undefined,
    alignSelf: "center",
    width: "100%",
  },
  welcomeHeader: {
    marginBottom: Platform.OS === "web" ? 24 : 16,
    marginTop: Platform.OS === "web" ? 8 : 5,
    marginLeft: 5,
  },
  welcomeTitle: {
    ...createTextStyle({
      fontWeight: "600",
      fontSize: Platform.OS === "web" ? (width >= 768 ? 28 : 22) : 22,
    }),
    color: "#333",
    paddingBottom: 3,
  },
  welcomeSubtitle: {
    ...createTextStyle({
      fontWeight: "400",
      fontSize: Platform.OS === "web" ? (width >= 768 ? 16 : 14) : 14,
    }),
    color: "#666",
  },
  statsGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
    marginBottom: 24,
    justifyContent: "space-between",
  },
  statsGridItem: {
    // Base styles only, dynamic values applied inline
  },
  statsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    height: "100%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  skeletonStatsCard: {
    padding: Platform.OS === "web" ? 24 : 20,
    minHeight: 120,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  statLabel: {
    ...createTextStyle({
      fontWeight: "500",
      fontSize: Platform.OS === "web" ? (width >= 768 ? 14 : 13) : 13,
    }),
    color: "#333",
    right: 5,
    paddingRight: 3,
  },
  statGrowth: {
    fontSize: 10,
    color: "#4CAF50",
  },
  negativeGrowth: {
    color: "#F44336",
  },
  statValue: {
    ...createTextStyle({
      fontWeight: "600",
      fontSize: Platform.OS === "web" ? (width >= 768 ? 32 : 25) : 25,
    }),
    color: "#111",
    marginTop: Platform.OS === "web" ? 16 : 8,
  },
  chartsContainer: {
    flexDirection: width >= 1440 ? "row" : "column",
    gap: 24,
    marginBottom: 24,
    width: "100%",
    alignItems: "center",
  },
  chartWrapper: {
    flex: width >= 1440 ? 1 : undefined,
    width: "100%",
    maxWidth: width >= 1440 ? "50%" : 1000,
    marginBottom: width >= 1440 ? 0 : 24,
  },
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 0,
    marginBottom: Platform.OS === "web" ? 0 : 1,
    minHeight: width >= 768 ? 290 : 290,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flex: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  sectionTitle: {
    ...createTextStyle({
      fontWeight: "600",
      fontSize: Platform.OS === "web" ? (width >= 768 ? 18 : 16) : 16,
    }),
    marginBottom: Platform.OS === "web" ? (width >= 768 ? 20 : 16) : 16,
    color: "#374151",
    paddingHorizontal: Platform.OS === "web" ? 24 : 16,
    paddingTop: Platform.OS === "web" ? 24 : 16,
  },
  gridContainer: {
    gap: 24,
    width: "100%",
    marginBottom: 24,
  },
  gridItem: {
    flex: 1,
  },
  taskCardsWrapper: {
    
  },
  taskCardsGrid: {
    width: "100%",
  },
  statCardSmall: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: Platform.OS === "web" ? (width >= 768 ? 24 : 20) : 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statCardLabel: {
    fontSize: Platform.OS === "web" ? (width >= 768 ? 14 : 13) : 13,
    color: "#555",
    marginBottom: 8,
  },
  statCardValue: {
    fontSize: Platform.OS === "web" ? (width >= 768 ? 24 : 20) : 20,
    color: "#111",
    marginBottom: 8,
  },
  skeleton: {
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    overflow: "hidden",
  },
  skeletonTitle: {
    marginBottom: 8,
  },
  skeletonSubtitle: {
    marginBottom: 24,
  },
  listCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: Platform.OS === "web" ? (width >= 768 ? 24 : 16) : 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  employeeCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: Platform.OS === "web" ? (width >= 768 ? 20 : 16) : 16,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    ...createTextStyle({
      fontWeight: "600",
      fontSize: Platform.OS === "web" ? (width >= 768 ? 16 : 14) : 14,
    }),
    color: "#333",
  },
  formsCountContainer: {
    alignItems: "center",
  },
  formsCount: {
    fontSize: 18,
    color: "#3b82f6",
  },
  formsLabel: {
    fontSize: 12,
    color: "#666",
  },
  showMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  showMoreText: {
    color: "#3b82f6",
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    marginRight: 5,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    marginTop: 8,
    fontSize: 16,
    color: "#999",
  },
});

export default CompanyAdminDashboard;
