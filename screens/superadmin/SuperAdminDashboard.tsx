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
import OnboardingChart from "../../components/OnboardingChart";

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

      // Calculate monthly onboarded companies for all months of the current year
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

      // Get data for all 12 months of the current year
      const currentYear = today.getFullYear();
      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(currentYear, month, 1);
        const monthEnd = new Date(currentYear, month + 1, 0);

        const { count, error } = await supabase
          .from("company")
          .select("*", { count: "exact", head: true })
          .gte("created_at", monthStart.toISOString())
          .lte("created_at", monthEnd.toISOString());

        if (error) {
          console.error("Error fetching monthly data:", error);
        } else {
          monthlyData.push({
            month: monthNames[month],
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

  // if (loading && !refreshing) {
  //   return (
  //     <SafeAreaView
  //       style={[styles.container, { backgroundColor: theme.colors.background }]}
  //     >
  //       <AppHeader
  //         showProfileMenu={true}
  //         userEmail={user?.email || ""}
  //         isAdmin={true}
  //         onSignOut={signOut}
  //         showHelpButton={false}
  //         title="Dashboard"
  //       />
  //       <LoadingIndicator />
  //     </SafeAreaView>
  //   );
  // }

  const chartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    propsForDots: {
      r: "5",
      strokeWidth: "2",
      stroke: "#3b82f6",
    },
    propsForBackgroundLines: {
      strokeDasharray: "", // Solid lines instead of dashed
      strokeWidth: 1,
      stroke: "#e5e7eb",
    },
    fillShadowGradient: "#3b82f6",
    fillShadowGradientOpacity: 0.1,
    labelColor: (opacity = 1) => `rgba(75, 85, 99, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForLabels: {
      fontSize: 11,
      fontWeight: "400",
      fill: "#6b7280",
    },
  };

  // Calculate the dynamic y-axis max value based on the current data
  const calculateYAxisMax = (data: number[]) => {
    if (!data || data.length === 0) return 2;

    const maxValue = Math.max(...data);

    // If max value is 0, return a default of 2
    if (maxValue === 0) return 2;

    // For very small values (≤2), use exactly 2
    if (maxValue <= 2) return 2;

    // For small values, round up to the next integer
    if (maxValue <= 5) return Math.ceil(maxValue);

    // For medium values, use multiples of 2
    if (maxValue <= 10) return Math.ceil(maxValue / 2) * 2;

    // For larger values, use multiples of 5
    if (maxValue <= 30) return Math.ceil(maxValue / 5) * 5;

    // For even larger values, use multiples of 10
    if (maxValue <= 100) return Math.ceil(maxValue / 10) * 10;

    // For even larger values, use multiples of 100
    return Math.ceil(maxValue / 100) * 100;
  };

  // Get dynamic y-axis max
  const yAxisMax = calculateYAxisMax(stats.monthlyOnboarded);

  // Create clean y-axis with even divisions
  const getYAxisLabels = (max: number) => {
    const result = [];
    let step;

    if (max <= 2) step = 1;
    else if (max <= 5) step = 1;
    else if (max <= 10) step = 2;
    else if (max <= 30) step = 5;
    else if (max <= 100) step = 10;
    else step = 100;

    for (let i = 0; i <= max; i += step) {
      result.push(i);
    }
    return result;
  };

  const yAxisLabels = getYAxisLabels(yAxisMax);

  // Group months into quarters for display
  const getQuarterlyLabels = (labels: string[], data: number[]) => {
    // Return quarter labels with month ranges
    return ["Jan-Mar", "Apr-Jun", "Jul-Sep", "Oct-Dec"];
  };

  // Aggregate monthly data into quarterly data
  const getQuarterlyData = (monthlyData: number[]) => {
    if (!monthlyData.length) {
      // Sample quarterly data if no data is available
      return [35, 55, 70, 85];
    }

    // If we have less than 12 months, pad the array
    const paddedData = [...monthlyData];
    while (paddedData.length < 12) {
      paddedData.push(0);
    }

    // Group into quarters (sum of values in each quarter)
    const quarterlyData = [
      paddedData[0] + paddedData[1] + paddedData[2],
      paddedData[3] + paddedData[4] + paddedData[5],
      paddedData[6] + paddedData[7] + paddedData[8],
      paddedData[9] + paddedData[10] + paddedData[11],
    ];

    return quarterlyData;
  };

  // For better grid appearance with small numbers
  const getSegmentCount = (max: number) => {
    if (max <= 2) return 2;
    if (max <= 5) return max;
    return 5;
  };

  // Add max value to chart config with custom formatter to prevent repeating labels
  const dynamicChartConfig = {
    ...chartConfig,
    max: yAxisMax,
    formatYLabel: (value: string) => {
      const num = parseInt(value, 10);
      // Only return labels that are in our calculated set
      return yAxisLabels.includes(num) ? num.toString() : "";
    },
    // Adjust the number of decimals for small values
    decimalPlaces: yAxisMax <= 2 ? 0 : 0,
  };

  const chartData = {
    labels: getQuarterlyLabels(stats.monthLabels, stats.monthlyOnboarded),
    datasets: [
      {
        data: getQuarterlyData(stats.monthlyOnboarded),
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        strokeWidth: 2,
      },
    ],
  };

  // Change the title back to "by Month" to match the screenshot
  const chartTitle = "Companies Onboarded by Month";

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
            <Text style={styles.chartTitle}>Companies Onboarded by Month</Text>
            <OnboardingChart
              monthlyData={stats.monthlyOnboarded}
              monthLabels={stats.monthLabels}
              width={width - 5}
            />
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 100,
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
    fontSize: 25,
    fontWeight: "bold",
    color: "#111",
  },
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    paddingBottom: 5,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 16,
    color: "#333",
  },
});

export default SuperAdminDashboard;
