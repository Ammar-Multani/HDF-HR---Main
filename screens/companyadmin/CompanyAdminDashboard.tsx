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
import LoadingIndicator from "../../components/LoadingIndicator";
import { TaskStatus, FormStatus } from "../../types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Text from "../../components/Text";
import { globalStyles } from "../../utils/globalStyles";

const { width } = Dimensions.get("window");

const CompanyAdminDashboard = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
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
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching company ID:", error);
        return null;
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

      // Calculate last month date for growth calculations
      const lastMonthDate = new Date();
      lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);

      // Fetch employees count
      const { count: totalEmployees, error: employeesError } = await supabase
        .from("company_user")
        .select("*", { count: "exact", head: true })
        .eq("company_id", currentCompanyId);

      // Fetch last month's employee count
      const { count: lastMonthEmployees, error: lastMonthEmployeesError } = await supabase
        .from("company_user")
        .select("*", { count: "exact", head: true })
        .eq("company_id", currentCompanyId)
        .lt("created_at", lastMonthDate.toISOString());

      // Calculate employee growth percentage
      let employeeGrowth = "+0%";
      if (lastMonthEmployees && totalEmployees && lastMonthEmployees > 0) {
        const growthRate = ((totalEmployees - lastMonthEmployees) / lastMonthEmployees) * 100;
        employeeGrowth = (growthRate >= 0 ? "+" : "") + growthRate.toFixed(1) + "%";
      }

      // Fetch active employees count
      const { count: activeEmployees, error: activeEmployeesError } =
        await supabase
          .from("company_user")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .eq("active_status", "active");

      // Fetch tasks count
      const { count: totalTasks, error: tasksError } = await supabase
        .from("task")
        .select("*", { count: "exact", head: true })
        .eq("company_id", currentCompanyId);

      // Fetch last month's task count
      const { count: lastMonthTasks, error: lastMonthTasksError } = await supabase
        .from("task")
        .select("*", { count: "exact", head: true })
        .eq("company_id", currentCompanyId)
        .lt("created_at", lastMonthDate.toISOString());

      // Calculate tasks growth
      let tasksGrowth = "+0%";
      if (lastMonthTasks && totalTasks && lastMonthTasks > 0) {
        const growthRate = ((totalTasks - lastMonthTasks) / lastMonthTasks) * 100;
        tasksGrowth = (growthRate >= 0 ? "+" : "") + growthRate.toFixed(1) + "%";
      }

      // Fetch pending tasks count (open + in progress + awaiting response)
      const { count: pendingTasks, error: pendingTasksError } = await supabase
        .from("task")
        .select("*", { count: "exact", head: true })
        .eq("company_id", currentCompanyId)
        .in("status", [
          TaskStatus.OPEN,
          TaskStatus.IN_PROGRESS,
          TaskStatus.AWAITING_RESPONSE,
        ]);

      // Fetch completed tasks count
      const { count: completedTasks, error: completedTasksError } =
        await supabase
          .from("task")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .eq("status", TaskStatus.COMPLETED);

      // Fetch overdue tasks count
      const { count: overdueTasks, error: overdueTasksError } = await supabase
        .from("task")
        .select("*", { count: "exact", head: true })
        .eq("company_id", currentCompanyId)
        .eq("status", TaskStatus.OVERDUE);

      // Fetch forms count (accident reports + illness reports + staff departure reports)
      const { count: accidentReports, error: accidentError } = await supabase
        .from("accident_report")
        .select("*", { count: "exact", head: true })
        .eq("company_id", currentCompanyId);

      const { count: illnessReports, error: illnessError } = await supabase
        .from("illness_report")
        .select("*", { count: "exact", head: true })
        .eq("company_id", currentCompanyId);

      const { count: departureReports, error: departureError } = await supabase
        .from("staff_departure_report")
        .select("*", { count: "exact", head: true })
        .eq("company_id", currentCompanyId);

      // Fetch pending forms count
      const { count: pendingAccidentReports, error: pendingAccidentError } =
        await supabase
          .from("accident_report")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .in("status", [FormStatus.DRAFT, FormStatus.PENDING]);

      const { count: pendingIllnessReports, error: pendingIllnessError } =
        await supabase
          .from("illness_report")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .in("status", [FormStatus.DRAFT, FormStatus.PENDING]);

      const { count: pendingDepartureReports, error: pendingDepartureError } =
        await supabase
          .from("staff_departure_report")
          .select("*", { count: "exact", head: true })
          .eq("company_id", currentCompanyId)
          .in("status", [FormStatus.DRAFT, FormStatus.PENDING]);

      const totalForms =
        (accidentReports || 0) +
        (illnessReports || 0) +
        (departureReports || 0);
      
      const pendingForms =
        (pendingAccidentReports || 0) +
        (pendingIllnessReports || 0) +
        (pendingDepartureReports || 0);

      // Last month's forms data
      const { count: lastMonthAccidentReports } = await supabase
        .from("accident_report")
        .select("*", { count: "exact", head: true })
        .eq("company_id", currentCompanyId)
        .lt("created_at", lastMonthDate.toISOString());

      const { count: lastMonthIllnessReports } = await supabase
        .from("illness_report")
        .select("*", { count: "exact", head: true })
        .eq("company_id", currentCompanyId)
        .lt("created_at", lastMonthDate.toISOString());

      const { count: lastMonthDepartureReports } = await supabase
        .from("staff_departure_report")
        .select("*", { count: "exact", head: true })
        .eq("company_id", currentCompanyId)
        .lt("created_at", lastMonthDate.toISOString());

      const lastMonthForms = 
        (lastMonthAccidentReports || 0) +
        (lastMonthIllnessReports || 0) +
        (lastMonthDepartureReports || 0);

      // Calculate forms growth
      let formsGrowth = "+0%";
      if (lastMonthForms && totalForms && lastMonthForms > 0) {
        const growthRate = ((totalForms - lastMonthForms) / lastMonthForms) * 100;
        formsGrowth = (growthRate >= 0 ? "+" : "") + growthRate.toFixed(1) + "%";
      }

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
    return <LoadingIndicator />;
  }

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
            Company Admin Dashboard
          </Text>
          <Text style={styles.welcomeSubtitle}>
            Manage your company data and operations
          </Text>
        </View>

        {/* Employees Section */}
        <Text variant={"bold"} style={styles.sectionTitle}>
          Employees
        </Text>
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text variant={"medium"} style={styles.statLabel}>
              Total Employees
            </Text>
            <Text 
              variant={"bold"} 
              style={[
                styles.statGrowth,
                stats.employeeGrowth.startsWith("-") ? styles.negativeGrowth : {}
              ]}
            >
              {stats.employeeGrowth}
            </Text>
          </View>
          <Text variant={"bold"} style={styles.statValue}>
            {stats.totalEmployees.toLocaleString()}
          </Text>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text variant={"medium"} style={styles.statLabel}>
              Active Employees
            </Text>
          </View>
          <Text variant={"bold"} style={styles.statValue}>
            {stats.activeEmployees.toLocaleString()}
          </Text>
        </View>

        {/* Tasks Section */}
        <Text variant={"bold"} style={styles.sectionTitle}>
          Tasks
        </Text>
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text variant={"medium"} style={styles.statLabel}>
              Total Tasks
            </Text>
            <Text
              variant={"bold"}
              style={[
                styles.statGrowth,
                stats.tasksGrowth.startsWith("-") ? styles.negativeGrowth : {}
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
            <MaterialCommunityIcons name="clipboard-clock" size={24} color="#F59E0B" />
          </View>
          
          <View style={styles.statCardSmall}>
            <Text variant={"medium"} style={styles.statCardLabel}>
              Completed
            </Text>
            <Text variant={"bold"} style={styles.statCardValue}>
              {stats.completedTasks}
            </Text>
            <MaterialCommunityIcons name="clipboard-check" size={24} color="#10B981" />
          </View>
          
          <View style={styles.statCardSmall}>
            <Text variant={"medium"} style={styles.statCardLabel}>
              Overdue
            </Text>
            <Text variant={"bold"} style={styles.statCardValue}>
              {stats.overdueTasks}
            </Text>
            <MaterialCommunityIcons name="clipboard-alert" size={24} color="#EF4444" />
          </View>
        </View>

        {/* Forms Section */}
        <Text variant={"bold"} style={styles.sectionTitle}>
          Forms
        </Text>
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text variant={"medium"} style={styles.statLabel}>
              Total Forms
            </Text>
            <Text
              variant={"bold"}
              style={[
                styles.statGrowth,
                stats.formsGrowth.startsWith("-") ? styles.negativeGrowth : {}
              ]}
            >
              {stats.formsGrowth}
            </Text>
          </View>
          <Text variant={"bold"} style={styles.statValue}>
            {stats.totalForms.toLocaleString()}
          </Text>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text variant={"medium"} style={styles.statLabel}>
              Pending Forms
            </Text>
          </View>
          <Text variant={"bold"} style={styles.statValue}>
            {stats.pendingForms.toLocaleString()}
          </Text>
        </View>
      </ScrollView>
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
    marginTop: 16,
    marginBottom: 12,
    color: "#333",
    marginLeft: 5,
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
});

export default CompanyAdminDashboard;
