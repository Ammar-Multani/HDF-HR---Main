import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  StatusBar,
  Image,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Text, useTheme, Avatar } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { supabase, isNetworkAvailable } from "../../lib/supabase";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import { TaskStatus } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LineChart } from "react-native-chart-kit";

const { width } = Dimensions.get("window");

interface CompanyData {
  name: string;
  employee_count: number;
  growth_percentage?: string;
}

interface MonthlyData {
  month: string;
  count: number;
}

const SuperAdminDashboard = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalCompaniesGrowth: "+0%",
    activeCompanies: 0,
    totalTasks: 0,
    tasksGrowth: "+0%",
    pendingTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    monthlyOnboarded: [] as number[],
    monthLabels: [] as string[],
    topCompanies: [] as CompanyData[],
  });

  const checkNetworkStatus = async () => {
    const isAvailable = await isNetworkAvailable();
    setNetworkStatus(isAvailable);
    return isAvailable;
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

      // Calculate company growth - fetch last month's count
      const lastMonthDate = new Date();
      lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
      const { count: lastMonthCompanies, error: lastMonthError } =
        await supabase
          .from("company")
          .select("*", { count: "exact", head: true })
          .lt("created_at", lastMonthDate.toISOString());

      // Calculate growth percentage
      let companyGrowth = "+0%";
      if (lastMonthCompanies && totalCompanies && lastMonthCompanies > 0) {
        const growthRate =
          ((totalCompanies - lastMonthCompanies) / lastMonthCompanies) * 100;
        companyGrowth =
          (growthRate >= 0 ? "+" : "") + growthRate.toFixed(1) + "%";
      }

      // Fetch tasks count - use 'tasks' table instead of 'task'
      const { count: totalTasks, error: tasksError } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true });

      // Fetch last month's task count
      const { count: lastMonthTasks, error: lastMonthTasksError } =
        await supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .lt("created_at", lastMonthDate.toISOString());

      // Calculate tasks growth
      let tasksGrowth = "+0%";
      if (lastMonthTasks && totalTasks && lastMonthTasks > 0) {
        const growthRate =
          ((totalTasks - lastMonthTasks) / lastMonthTasks) * 100;
        tasksGrowth =
          (growthRate >= 0 ? "+" : "") + growthRate.toFixed(1) + "%";
      }

      // Fetch pending tasks count (open + in progress + awaiting response)
      const { count: pendingTasks, error: pendingTasksError } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .in("status", [
          TaskStatus.OPEN,
          TaskStatus.IN_PROGRESS,
          TaskStatus.AWAITING_RESPONSE,
        ]);

      // Fetch completed tasks count
      const { count: completedTasks, error: completedTasksError } =
        await supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("status", TaskStatus.COMPLETED);

      // Fetch overdue tasks count
      const { count: overdueTasks, error: overdueTasksError } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .eq("status", TaskStatus.OVERDUE);

      // Fetch top companies by employee count - get all companies first
      const { data: companies, error: companiesListError } = await supabase
        .from("company")
        .select("id, company_name")
        .order("created_at", { ascending: false });

      // If we have companies, calculate employee counts for each one
      let topCompanies: CompanyData[] = [];
      if (companies && companies.length > 0) {
        // Get employee counts for each company
        const companiesWithCounts = await Promise.all(
          companies.map(async (company) => {
            // Count employees for this company
            const { count, error } = await supabase
              .from("company_user")
              .select("*", { count: "exact", head: true })
              .eq("company_id", company.id);

            return {
              id: company.id,
              name: company.company_name,
              employee_count: count || 0,
            };
          })
        );

        // Sort by employee count and take top 5
        topCompanies = companiesWithCounts
          .sort((a, b) => b.employee_count - a.employee_count)
          .slice(0, 5)
          .map((company) => ({
            name: company.name,
            employee_count: company.employee_count,
            growth_percentage: `+${Math.floor(Math.random() * 20) + 1}%`, // Placeholder for growth
          }));
      }

      // Calculate monthly onboarded companies for the last 5 months
      const today = new Date();
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
      const monthlyData: MonthlyData[] = [];

      // Get data for the last 5 months
      for (let i = 4; i >= 0; i--) {
        const date = new Date();
        date.setMonth(today.getMonth() - i);
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
        const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

        const { count, error } = await supabase
          .from("company")
          .select("*", { count: "exact", head: true })
          .gte("created_at", monthStart.toISOString())
          .lte("created_at", monthEnd.toISOString());

        if (error) {
          console.error("Error fetching monthly data:", error);
        } else {
          monthlyData.push({
            month: monthNames[date.getMonth()],
            count: count || 0,
          });
        }
      }

      // Check for any errors
      if (
        companiesError ||
        activeCompaniesError ||
        tasksError ||
        pendingTasksError ||
        completedTasksError ||
        overdueTasksError ||
        companiesListError ||
        lastMonthError ||
        lastMonthTasksError
      ) {
        console.error("Error fetching dashboard data:", {
          companiesError,
          activeCompaniesError,
          tasksError,
          pendingTasksError,
          completedTasksError,
          overdueTasksError,
          companiesListError,
          lastMonthError,
          lastMonthTasksError,
        });

        if (!error) {
          setError("Failed to fetch some dashboard data");
        }
      }

      setStats({
        totalCompanies: totalCompanies || 0,
        totalCompaniesGrowth: companyGrowth,
        activeCompanies: activeCompanies || 0,
        totalTasks: totalTasks || 0,
        tasksGrowth: tasksGrowth,
        pendingTasks: pendingTasks || 0,
        completedTasks: completedTasks || 0,
        overdueTasks: overdueTasks || 0,
        monthlyOnboarded: monthlyData.map((item) => item.count),
        monthLabels: monthlyData.map((item) => item.month),
        topCompanies: topCompanies,
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to fetch dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
        <AppHeader
          showProfileMenu={true}
          userEmail={user?.email || ""}
          isAdmin={true}
          onSignOut={signOut}
          showHelpButton={false}
          title="Dashboard"
        />
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  const chartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    color: (opacity = 1) => `rgba(66, 133, 244, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: "#4285F4",
    },
    propsForBackgroundLines: {
      strokeDasharray: "5, 5",
      strokeWidth: 1,
      stroke: "#e0e0e0",
    },
    fillShadowGradient: "#4285F4",
    fillShadowGradientOpacity: 0.2,
  };

  const chartData = {
    labels:
      stats.monthLabels.length > 0
        ? stats.monthLabels
        : ["Jan", "Feb", "Mar", "Apr", "May"],
    datasets: [
      {
        data:
          stats.monthlyOnboarded.length > 0
            ? stats.monthlyOnboarded
            : [0, 0, 0, 0, 0],
        color: (opacity = 1) => `rgba(66, 133, 244, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

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
          title="Dashboard"
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Total Companies</Text>
              <Text style={styles.statGrowth}>
                {stats.totalCompaniesGrowth}
              </Text>
            </View>
            <Text style={styles.statValue}>
              {stats.totalCompanies.toLocaleString()}
            </Text>
          </View>

          <View style={styles.statsCard}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Tasks</Text>
              <Text
                style={[
                  styles.statGrowth,
                  stats.tasksGrowth.startsWith("-")
                    ? styles.negativeGrowth
                    : {},
                ]}
              >
                {stats.tasksGrowth}
              </Text>
            </View>
            <Text style={styles.statValue}>
              {stats.totalTasks.toLocaleString()}
            </Text>
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>Companies Onboarded</Text>
            {stats.monthlyOnboarded.some((count) => count > 0) ? (
              <LineChart
                data={chartData}
                width={width - 48}
                height={200}
                chartConfig={chartConfig}
                bezier
                style={styles.chart}
                withHorizontalLines={true}
                withVerticalLines={true}
                withDots={true}
                withShadow={false}
                withInnerLines={true}
                fromZero={true}
              />
            ) : (
              <View style={styles.emptyChartContainer}>
                <MaterialCommunityIcons
                  name="chart-line"
                  size={48}
                  color={theme.colors.outlineVariant}
                />
                <Text style={styles.emptyStateText}>
                  No onboarding data available
                </Text>
              </View>
            )}
          </View>

          <Text style={styles.sectionTitle}>Top Companies</Text>

          {stats.topCompanies.map((company, index) => (
            <View key={index} style={styles.companyCard}>
              <View style={styles.companyInfo}>
                <Text style={styles.companyName}>{company.name}</Text>
                <Text style={styles.companyEmployees}>
                  {company.employee_count} employees
                </Text>
              </View>
              <Text style={styles.companyGrowth}>
                {company.growth_percentage}
              </Text>
            </View>
          ))}

          {stats.topCompanies.length === 0 && (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons
                name="domain"
                size={48}
                color={theme.colors.outlineVariant}
              />
              <Text style={styles.emptyStateText}>No companies found</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.tabBar}>
          <View style={[styles.tabItem, styles.activeTab]}>
            <MaterialCommunityIcons
              name="home"
              size={24}
              color={theme.colors.primary}
            />
            <Text style={[styles.tabText, styles.activeTabText]}>
              Dashboard
            </Text>
          </View>

          <View
            style={styles.tabItem}
            onTouchEnd={() => navigation.navigate("Companies" as never)}
          >
            <MaterialCommunityIcons name="domain" size={24} color="#777" />
            <Text style={styles.tabText}>Companies</Text>
          </View>

          <View
            style={styles.tabItem}
            onTouchEnd={() => navigation.navigate("Tasks" as never)}
          >
            <MaterialCommunityIcons
              name="clipboard-text"
              size={24}
              color="#777"
            />
            <Text style={styles.tabText}>Tasks</Text>
          </View>

          <View
            style={styles.tabItem}
            onTouchEnd={() => navigation.navigate("Forms" as never)}
          >
            <MaterialCommunityIcons
              name="file-document"
              size={24}
              color="#777"
            />
            <Text style={styles.tabText}>Forms</Text>
          </View>

          <View
            style={styles.tabItem}
            onTouchEnd={() => navigation.navigate("Settings" as never)}
          >
            <MaterialCommunityIcons name="cog" size={24} color="#777" />
            <Text style={styles.tabText}>Settings</Text>
          </View>
        </View>
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
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 100,
  },
  statsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  statGrowth: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "bold",
  },
  negativeGrowth: {
    color: "#F44336",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#111",
  },
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginVertical: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 250,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  chart: {
    borderRadius: 12,
    paddingRight: 16,
  },
  emptyChartContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 16,
    color: "#333",
  },
  companyCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  companyEmployees: {
    fontSize: 14,
    color: "#666",
  },
  companyGrowth: {
    fontSize: 14,
    color: "#4CAF50",
    fontWeight: "bold",
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
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eaeaea",
    paddingVertical: 10,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 65,
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#4285F4",
  },
  tabText: {
    fontSize: 12,
    color: "#777",
    marginTop: 2,
  },
  activeTabText: {
    color: "#4285F4",
    fontWeight: "600",
  },
});

export default SuperAdminDashboard;
