import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  StatusBar,
  Dimensions,
} from "react-native";
import { useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { supabase, isNetworkAvailable } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import { TaskStatus, FormStatus } from "../../types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Text from "../../components/Text";
import { globalStyles } from "../../utils/globalStyles";
import DynamicChart from "../../components/DynamicChart";
import Shimmer from "../../components/Shimmer";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

// Add this interface above the component
interface CompanyData {
  company_name: string;
}

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
  });

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
      });
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
        style={[styles.container, { backgroundColor: theme.colors.backgroundSecondary }]}
      >
        <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
        <AppHeader
          showProfileMenu={true}
          userEmail={user?.email || ""}
          isAdmin={true}
          onSignOut={signOut}
          showHelpButton={false}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.welcomeHeader}>
            <Shimmer width={250} height={28} style={{ marginBottom: 8 }} />
            <Shimmer width={200} height={16} />
          </View>

          {/* Total Employees Stats Card Shimmer */}
          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <Shimmer width={120} height={20} />
              <Shimmer width={60} height={16} />
            </View>
            <Shimmer width={90} height={32} style={{ marginTop: 12 }} />
          </View>

          {/* Monthly Employee Chart Shimmer */}
          <View style={styles.chartCard}>
            <Shimmer width={200} height={24} style={{ marginBottom: 24 }} />
            <Shimmer
              width={width - 42}
              height={220}
              style={{ marginBottom: 16 }}
            />
          </View>

          {/* Total Tasks Stats Card Shimmer */}
          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <Shimmer width={100} height={20} />
              <Shimmer width={60} height={16} />
            </View>
            <Shimmer width={90} height={32} style={{ marginTop: 12 }} />
          </View>

          {/* Task Status Cards Shimmer */}
          <View style={styles.statCardsContainer}>
            {[1, 2, 3].map((_, index) => (
              <View key={index} style={styles.statCardSmall}>
                <Shimmer width={80} height={16} style={{ marginBottom: 8 }} />
                <Shimmer width={60} height={24} style={{ marginBottom: 8 }} />
                <Shimmer width={24} height={24} style={{ borderRadius: 12 }} />
              </View>
            ))}
          </View>

          {/* Total Forms Stats Card Shimmer */}
          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <Shimmer width={100} height={20} />
              <Shimmer width={60} height={16} />
            </View>
            <Shimmer width={90} height={32} style={{ marginTop: 12 }} />
          </View>

          {/* Monthly Forms Chart Shimmer */}
          <View style={styles.chartCard}>
            <Shimmer width={200} height={24} style={{ marginBottom: 24 }} />
            <Shimmer
              width={width - 42}
              height={220}
              style={{ marginBottom: 16 }}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.backgroundSecondary }]}
    >
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
      <AppHeader
        showProfileMenu={true}
        userEmail={user?.email || ""}
        isAdmin={true}
        onSignOut={signOut}
        showHelpButton={false}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
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

        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text variant={"medium"} style={styles.statLabel}>
              Total Employees
            </Text>
            <Text
              variant={"bold"}
              style={[
                styles.statGrowth,
                stats.employeeGrowth.startsWith("-")
                  ? styles.negativeGrowth
                  : {},
              ]}
            >
              {stats.employeeGrowth}
            </Text>
          </View>
          <Text variant={"bold"} style={styles.statValue}>
            {stats.totalEmployees.toLocaleString()}
          </Text>
        </View>

        <View style={styles.chartCard}>
          <Text variant={"bold"} style={styles.sectionTitle}>
            Monthly Employee Onboarding
          </Text>
          <DynamicChart
            monthlyData={stats.monthlyEmployees}
            monthLabels={stats.monthLabels}
            width={width - 10}
          />
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text variant={"medium"} style={styles.statLabel}>
              Total Tasks
            </Text>
            <Text
              variant={"bold"}
              style={[
                styles.statGrowth,
                stats.tasksGrowth.startsWith("-") ? styles.negativeGrowth : {},
              ]}
            >
              {stats.tasksGrowth}
            </Text>
          </View>
          <Text variant={"bold"} style={styles.statValue}>
            {stats.totalTasks.toLocaleString()}
          </Text>
        </View>

        <View style={styles.statCardsContainer}>
          <View style={styles.statCardSmall}>
            <Text variant={"medium"} style={styles.statCardLabel}>
              Pending
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

          <View style={styles.statCardSmall}>
            <Text variant={"medium"} style={styles.statCardLabel}>
              Completed
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

          <View style={styles.statCardSmall}>
            <Text variant={"medium"} style={styles.statCardLabel}>
              Overdue
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

        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text variant={"medium"} style={styles.statLabel}>
              Total Forms
            </Text>
            <Text
              variant={"bold"}
              style={[
                styles.statGrowth,
                stats.formsGrowth.startsWith("-") ? styles.negativeGrowth : {},
              ]}
            >
              {stats.formsGrowth}
            </Text>
          </View>
          <Text variant={"bold"} style={styles.statValue}>
            {stats.totalForms.toLocaleString()}
          </Text>
        </View>

        <View style={styles.chartCard}>
          <Text variant={"bold"} style={styles.sectionTitle}>
            Monthly Forms Submitted
          </Text>
          <DynamicChart
            monthlyData={stats.monthlyForms}
            monthLabels={stats.monthLabels}
            width={width - 10}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 90, // Extra padding for bottom tab bar
  },
  welcomeHeader: {
    marginBottom: 16,
    marginTop: 5,
    marginLeft: 5,
  },
  welcomeTitle: {
    fontSize: 22,
    color: "#333",
    paddingBottom: 3,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 16,
    color: "#333",
  },
  statsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 11,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 16,
    color: "#333",
  },
  statGrowth: {
    fontSize: 14,
    color: "#4CAF50",
  },
  negativeGrowth: {
    color: "#F44336",
  },
  statValue: {
    fontSize: 25,
    color: "#111",
  },
  statCardsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  statCardSmall: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    width: (width - 42) / 3,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    alignItems: "flex-start",
  },
  statCardLabel: {
    fontSize: 14,
    color: "#555",
    marginBottom: 8,
  },
  statCardValue: {
    fontSize: 20,
    color: "#111",
    marginBottom: 8,
  },
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    paddingBottom: 10,
    marginBottom: 16,
    minHeight: 280,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
});

export default CompanyAdminDashboard;
