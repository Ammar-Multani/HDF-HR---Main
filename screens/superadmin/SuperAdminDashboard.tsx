import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, RefreshControl, StatusBar } from "react-native";
import { Text, useTheme, FAB } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../lib/supabase";
import AppHeader from "../../components/AppHeader";
import DashboardCard from "../../components/DashboardCard";
import LoadingIndicator from "../../components/LoadingIndicator";
import { TaskStatus } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { LinearGradient } from "expo-linear-gradient";

const SuperAdminDashboard = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalCompanies: 0,
    activeCompanies: 0,
    totalTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
  });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch companies count
      const { count: totalCompanies, error: companiesError } = await supabase
        .from("company")
        .select("*", { count: "exact", head: true });

      // Fetch active companies count
      const { count: activeCompanies, error: activeCompaniesError } =
        await supabase
          .from("company")
          .select("*", { count: "exact", head: true })
          .eq("active", true);

      // Fetch tasks count
      const { count: totalTasks, error: tasksError } = await supabase
        .from("task")
        .select("*", { count: "exact", head: true });

      // Fetch pending tasks count (open + in progress + awaiting response)
      const { count: pendingTasks, error: pendingTasksError } = await supabase
        .from("task")
        .select("*", { count: "exact", head: true })
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
          .eq("status", TaskStatus.COMPLETED);

      // Fetch overdue tasks count
      const { count: overdueTasks, error: overdueTasksError } = await supabase
        .from("task")
        .select("*", { count: "exact", head: true })
        .eq("status", TaskStatus.OVERDUE);

      if (
        companiesError ||
        activeCompaniesError ||
        tasksError ||
        pendingTasksError ||
        completedTasksError ||
        overdueTasksError
      ) {
        console.error("Error fetching dashboard data:", {
          companiesError,
          activeCompaniesError,
          tasksError,
          pendingTasksError,
          completedTasksError,
          overdueTasksError,
        });
        return;
      }

      setStats({
        totalCompanies: totalCompanies || 0,
        activeCompanies: activeCompanies || 0,
        totalTasks: totalTasks || 0,
        pendingTasks: pendingTasks || 0,
        completedTasks: completedTasks || 0,
        overdueTasks: overdueTasks || 0,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <AppHeader
          showProfileMenu={true}
          userEmail={user?.email || ""}
          isAdmin={true}
          onSignOut={signOut}
          showHelpButton={false}
        />
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  const getGradientColors = () => {
    return theme.dark
      ? (["#151729", "#2a2e43"] as const)
      : (["#f0f8ff", "#e6f2ff"] as const);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
       <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
            <LinearGradient
        colors={getGradientColors()}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
      <AppHeader
        showProfileMenu={true}
        userEmail={user?.email || ""}
        isAdmin={true} // Always true since this is SuperAdmin dashboard
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
        <Text
          style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
        >
          Companies
        </Text>

        <View style={styles.cardsContainer}>
          <DashboardCard
            title="Total Companies"
            count={stats.totalCompanies}
            icon="domain"
            color={theme.colors.primary}
            onPress={() => navigation.navigate("Companies" as never)}
          />

          <DashboardCard
            title="Active Companies"
            count={stats.activeCompanies}
            icon="domain-plus"
            color={theme.colors.tertiary}
            onPress={() => navigation.navigate("Companies" as never)}
          />
        </View>

        <Text
          style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
        >
          Tasks
        </Text>

        <View style={styles.cardsContainer}>
          <DashboardCard
            title="Total Tasks"
            count={stats.totalTasks}
            icon="clipboard-list"
            color={theme.colors.primary}
            onPress={() => navigation.navigate("Tasks" as never)}
          />

          <DashboardCard
            title="Pending Tasks"
            count={stats.pendingTasks}
            icon="clipboard-clock"
            color="#F59E0B" // Amber
            onPress={() => navigation.navigate("Tasks" as never)}
          />

          <DashboardCard
            title="Completed Tasks"
            count={stats.completedTasks}
            icon="clipboard-check"
            color="#10B981" // Green
            onPress={() => navigation.navigate("Tasks" as never)}
          />

          <DashboardCard
            title="Overdue Tasks"
            count={stats.overdueTasks}
            icon="clipboard-alert"
            color="#EF4444" // Red
            onPress={() => navigation.navigate("Tasks" as never)}
          />
        </View>
      </ScrollView>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate("CreateCompany" as never)}
        color={theme.colors.surface}
      />
      </LinearGradient>
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
    padding: 22,
  },
  sectionTitle: {
    fontSize: 25,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 12,
  },
  cardsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default SuperAdminDashboard;
