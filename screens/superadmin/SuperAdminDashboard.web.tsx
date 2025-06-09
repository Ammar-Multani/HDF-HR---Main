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
  Platform,
} from "react-native";
import { useTheme, Avatar, Divider, Button, Surface } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { supabase, isNetworkAvailable } from "../../lib/supabase";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import { TaskStatus, FormStatus } from "../../types";
import { useAuth } from "../../contexts/AuthContext";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Text from "../../components/Text";
import { globalStyles, createTextStyle } from "../../utils/globalStyles";
import { useTranslation } from "react-i18next";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import DynamicChart from "../../components/DynamicChart";
import ActivityLogTimeline from "../../components/ActivityLogTimeline";

const { width } = Dimensions.get("window");

// Number of items to show initially in each card
const INITIAL_ITEMS_TO_SHOW = 3;

interface CompanyData {
  name: string;
  employee_count: number;
  growth_percentage?: string;
}

interface EmployeeData {
  id: string;
  name: string;
  forms_count: number;
  company_name?: string;
}

interface ShimmerProps {
  width: number | string;
  height: number;
  style?: any; // Using any for style prop as it can accept various style objects
}

// Add Shimmer component
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

const SuperAdminDashboard = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [networkStatus, setNetworkStatus] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  // State for expanding cards
  const [showAllCompanies, setShowAllCompanies] = useState(false);
  const [showAllEmployees, setShowAllEmployees] = useState(false);

  const [stats, setStats] = useState({
    totalCompanies: 0,
    totalCompaniesGrowth: "+0%",
    activeCompanies: 0,
    totalEmployees: 0,
    employeeGrowth: "+0%",
    totalTasks: 0,
    tasksGrowth: "+0%",
    pendingTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    totalForms: 0,
    formsGrowth: "+0%",
    monthlyOnboarded: [] as number[],
    monthLabels: [] as string[],
    monthlyForms: [] as number[],
    topCompanies: [] as CompanyData[],
    topEmployees: [] as EmployeeData[],
    latestActivities: [] as ActivityLog[],
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

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check network status
      const networkAvailable = await checkNetworkStatus();
      if (!networkAvailable) {
        setError(t("superAdmin.dashboard.offline"));
      }

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

      // Run all main dashboard queries in parallel
      const [
        { count: totalCompanies, error: companiesError },
        { count: activeCompanies, error: activeCompaniesError },
        { count: totalEmployees, error: employeesError },
        { count: todayEmployees, error: todayEmployeesError },
        { count: todayCompanies, error: todayCompaniesError },
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
        { data: companies, error: companiesListError },
      ] = await Promise.all([
        // Total companies count
        supabase.from("company").select("*", { count: "exact", head: true }),

        // Active companies count
        supabase
          .from("company")
          .select("*", { count: "exact", head: true })
          .eq("active", true),

        // Total employees count
        supabase
          .from("company_user")
          .select("*", { count: "exact", head: true })
          .eq("role", "employee"),

        // Today's employees count
        supabase
          .from("company_user")
          .select("*", { count: "exact", head: true })
          .eq("role", "employee")
          .gte("created_at", today.toISOString()),

        // Today's companies count
        supabase
          .from("company")
          .select("*", { count: "exact", head: true })
          .gte("created_at", today.toISOString()),

        // Total tasks count
        supabase.from("tasks").select("*", { count: "exact", head: true }),

        // Today's tasks count
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .gte("created_at", today.toISOString()),

        // Pending tasks count
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .in("status", [
            TaskStatus.OPEN,
            TaskStatus.IN_PROGRESS,
            TaskStatus.AWAITING_RESPONSE,
          ]),

        // Completed tasks count
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("status", TaskStatus.COMPLETED),

        // Overdue tasks count
        supabase
          .from("tasks")
          .select("*", { count: "exact", head: true })
          .eq("status", TaskStatus.OVERDUE),

        // Accident reports count
        supabase
          .from("accident_report")
          .select("*", { count: "exact", head: true })
          .neq("status", FormStatus.DRAFT),

        // Illness reports count
        supabase
          .from("illness_report")
          .select("*", { count: "exact", head: true })
          .neq("status", FormStatus.DRAFT),

        // Departure reports count
        supabase
          .from("staff_departure_report")
          .select("*", { count: "exact", head: true })
          .neq("status", FormStatus.DRAFT),

        // Today's accident reports
        supabase
          .from("accident_report")
          .select("*", { count: "exact", head: true })
          .neq("status", FormStatus.DRAFT)
          .gte("created_at", today.toISOString()),

        // Today's illness reports
        supabase
          .from("illness_report")
          .select("*", { count: "exact", head: true })
          .neq("status", FormStatus.DRAFT)
          .gte("submission_date", today.toISOString()),

        // Today's departure reports
        supabase
          .from("staff_departure_report")
          .select("*", { count: "exact", head: true })
          .neq("status", FormStatus.DRAFT)
          .gte("created_at", today.toISOString()),

        // Companies list
        supabase
          .from("company")
          .select("id, company_name")
          .order("created_at", { ascending: false }),
      ]);

      // Calculate totals and growth rates
      const totalForms =
        (accidentReports || 0) +
        (illnessReports || 0) +
        (departureReports || 0);
      const todayForms =
        (todayAccidentReports || 0) +
        (todayIllnessReports || 0) +
        (todayDepartureReports || 0);

      // Calculate company growth percentage
      let companyGrowth = "+0%";
      if (totalCompanies && todayCompanies) {
        if (totalCompanies === todayCompanies) {
          companyGrowth = "+100%";
        } else {
          const previousCompanies = totalCompanies - todayCompanies;
          const growthRate =
            previousCompanies > 0
              ? (todayCompanies / previousCompanies) * 100
              : 0;
          companyGrowth =
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

      // Process company data - gather employee counts in parallel
      let topCompanies: CompanyData[] = [];
      let topEmployees: EmployeeData[] = [];

      if (companies && companies.length > 0) {
        // Get more companies for the "Show More" functionality
        const companiesSlice = companies.slice(0, 20); // Increase to 20 instead of 10

        // Get employee counts for companies in parallel
        const companiesWithCountPromises = companiesSlice.map(
          async (company) => {
            // Get total employee count for company
            const { count: totalCount, error: totalError } = await supabase
              .from("company_user")
              .select("*", { count: "exact", head: true })
              .eq("company_id", company.id)
              .eq("role", "employee");

            // Get today's employee count for company
            const { count: todayCount, error: todayError } = await supabase
              .from("company_user")
              .select("*", { count: "exact", head: true })
              .eq("company_id", company.id)
              .eq("role", "employee")
              .gte("created_at", today.toISOString());

            // Calculate growth percentage
            let growthPercentage = "+0%";
            if (totalCount && todayCount) {
              if (totalCount === todayCount) {
                growthPercentage = "+100%"; // All employees added today
              } else {
                const previousCount = totalCount - todayCount;
                const growthRate =
                  previousCount > 0 ? (todayCount / previousCount) * 100 : 0;
                growthPercentage =
                  (growthRate > 0 ? "+" : "") + growthRate.toFixed(1) + "%";
              }
            }

            return {
              id: company.id,
              name: company.company_name,
              employee_count: totalCount || 0,
              growth_percentage: growthPercentage,
            };
          }
        );

        const companiesWithCounts = await Promise.all(
          companiesWithCountPromises
        );

        // Still get all the processed data, not just top 5
        topCompanies = companiesWithCounts
          .sort((a, b) => b.employee_count - a.employee_count)
          .map((company) => ({
            name: company.name,
            employee_count: company.employee_count,
            growth_percentage: company.growth_percentage,
          }));
      }

      // Fetch top employees by forms count
      // First, get all forms data with employee IDs
      const [
        { data: accidentForms, error: accidentFormsError },
        { data: illnessForms, error: illnessFormsError },
        { data: departureForms, error: departureFormsError },
        { data: allEmployees, error: allEmployeesError },
      ] = await Promise.all([
        supabase
          .from("accident_report")
          .select("employee_id")
          .neq("status", FormStatus.DRAFT),
        supabase
          .from("illness_report")
          .select("employee_id")
          .neq("status", FormStatus.DRAFT),
        supabase
          .from("staff_departure_report")
          .select("employee_id")
          .neq("status", FormStatus.DRAFT),
        supabase
          .from("company_user")
          .select(
            "id, first_name, last_name, company_id, company:company_id(company_name)"
          )
          .eq("role", "employee")
          .limit(100),
      ]);

      if (
        accidentFormsError ||
        illnessFormsError ||
        departureFormsError ||
        allEmployeesError
      ) {
        console.error("Error fetching forms or employees data:", {
          accidentFormsError,
          illnessFormsError,
          departureFormsError,
          allEmployeesError,
        });
      } else {
        // Count forms per employee
        const employeeFormCounts: Record<string, number> = {};

        // Initialize all employees with 0 forms
        if (allEmployees) {
          allEmployees.forEach((employee) => {
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
        if (allEmployees) {
          // Map employee details with form counts
          const employeesWithFormCounts = allEmployees.map((employee) => ({
            id: employee.id,
            name: `${employee.first_name || ""} ${employee.last_name || ""}`.trim(),
            forms_count: employeeFormCounts[employee.id] || 0,
            company_name:
              (employee as any).company?.company_name || "Unknown Company",
          }));

          // Sort by form count (highest first) but don't limit to 10 anymore
          topEmployees = employeesWithFormCounts.sort(
            (a, b) => b.forms_count - a.forms_count
          );
        }
      }

      // Prepare monthly data fetch operations for the past year
      const allMonthsCompanyData = new Array(12).fill(0);
      const allMonthsFormData = new Array(12).fill(0);

      // Create arrays of promises for each month's data
      const monthlyCompanyPromises = [];
      const monthlyAccidentFormPromises = [];
      const monthlyIllnessFormPromises = [];
      const monthlyDepartureFormPromises = [];

      for (let month = 0; month < 12; month++) {
        // Calculate the proper date range - handle year wraparound
        const dateYear = currentMonth >= month ? currentYear : currentYear - 1;
        const monthStart = new Date(dateYear, month, 1);
        const monthEnd = new Date(dateYear, month + 1, 0);

        // Company data promise
        monthlyCompanyPromises.push(
          supabase
            .from("company")
            .select("*", { count: "exact", head: true })
            .gte("created_at", monthStart.toISOString())
            .lte("created_at", monthEnd.toISOString())
        );

        // Form data promises
        monthlyAccidentFormPromises.push(
          supabase
            .from("accident_report")
            .select("*", { count: "exact", head: true })
            .neq("status", FormStatus.DRAFT)
            .gte("created_at", monthStart.toISOString())
            .lte("created_at", monthEnd.toISOString())
        );

        monthlyIllnessFormPromises.push(
          supabase
            .from("illness_report")
            .select("*", { count: "exact", head: true })
            .neq("status", FormStatus.DRAFT)
            .gte("submission_date", monthStart.toISOString())
            .lte("submission_date", monthEnd.toISOString())
        );

        monthlyDepartureFormPromises.push(
          supabase
            .from("staff_departure_report")
            .select("*", { count: "exact", head: true })
            .neq("status", FormStatus.DRAFT)
            .gte("created_at", monthStart.toISOString())
            .lte("created_at", monthEnd.toISOString())
        );
      }

      // Execute all monthly data promises in parallel
      const [
        monthlyCompanyResults,
        monthlyAccidentResults,
        monthlyIllnessResults,
        monthlyDepartureResults,
      ] = await Promise.all([
        Promise.all(monthlyCompanyPromises),
        Promise.all(monthlyAccidentFormPromises),
        Promise.all(monthlyIllnessFormPromises),
        Promise.all(monthlyDepartureFormPromises),
      ]);

      // Process monthly results
      for (let month = 0; month < 12; month++) {
        // Process company data
        allMonthsCompanyData[month] = monthlyCompanyResults[month].count || 0;

        // Process form data
        const monthAccidentCount = monthlyAccidentResults[month].count || 0;
        const monthIllnessCount = monthlyIllnessResults[month].count || 0;
        const monthDepartureCount = monthlyDepartureResults[month].count || 0;

        allMonthsFormData[month] =
          monthAccidentCount + monthIllnessCount + monthDepartureCount;
      }

      // Extract data for recent months only
      const recentMonthsCompanyData = recentMonths.map(
        (index) => allMonthsCompanyData[index]
      );
      const recentMonthsFormData = recentMonths.map(
        (index) => allMonthsFormData[index]
      );
      const recentMonthsLabels = recentMonths.map((index) => monthNames[index]);

      // Check for any errors
      const errorsFound =
        companiesError ||
        activeCompaniesError ||
        employeesError ||
        todayEmployeesError ||
        tasksError ||
        pendingTasksError ||
        completedTasksError ||
        overdueTasksError ||
        companiesListError ||
        todayCompaniesError ||
        todayTasksError ||
        accidentError ||
        illnessError ||
        departureError ||
        todayAccidentError ||
        todayIllnessError ||
        todayDepartureError;

      if (errorsFound) {
        console.error("Error fetching dashboard data:", {
          companiesError,
          activeCompaniesError,
          employeesError,
          todayEmployeesError,
          tasksError,
          pendingTasksError,
          completedTasksError,
          overdueTasksError,
          companiesListError,
          todayCompaniesError,
          todayTasksError,
          accidentError,
          illnessError,
          departureError,
          todayAccidentError,
          todayIllnessError,
          todayDepartureError,
        });

        if (!error) {
          setError("Failed to fetch some dashboard data");
        }
      }

      // Add this new fetch call for latest activities
      const { data: latestActivities, error: activitiesError } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (activitiesError) {
        console.error("Error fetching latest activities:", activitiesError);
      }

      // Update state with all the data
      setStats({
        totalCompanies: totalCompanies || 0,
        totalCompaniesGrowth: companyGrowth,
        activeCompanies: activeCompanies || 0,
        totalEmployees: totalEmployees || 0,
        employeeGrowth: employeeGrowth,
        totalTasks: totalTasks || 0,
        tasksGrowth: tasksGrowth,
        pendingTasks: pendingTasks || 0,
        completedTasks: completedTasks || 0,
        overdueTasks: overdueTasks || 0,
        totalForms: totalForms,
        formsGrowth: formsGrowth,
        monthlyOnboarded: recentMonthsCompanyData,
        monthLabels: recentMonthsLabels,
        monthlyForms: recentMonthsFormData,
        topCompanies: topCompanies,
        topEmployees: topEmployees,
        latestActivities: latestActivities || [],
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
      setError(t("superAdmin.dashboard.offline"));
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

          <View
            style={[
              styles.listsContainer,
              { flexDirection: isLargeScreen ? "row" : "column" },
            ]}
          >
            {[1, 2].map((_, listIndex) => (
              <View key={listIndex} style={styles.listWrapper}>
                <View style={styles.listCard}>
                  <Shimmer
                    width={180}
                    height={24}
                    style={{ marginBottom: 24 }}
                  />
                  {[1, 2, 3].map((_, itemIndex) => (
                    <View
                      key={itemIndex}
                      style={[
                        styles.companyCard,
                        itemIndex === 2 && {
                          borderBottomWidth: 0,
                          marginBottom: 0,
                        },
                      ]}
                    >
                      <View style={styles.companyInfo}>
                        <Shimmer
                          width={160}
                          height={18}
                          style={{ marginBottom: 8 }}
                        />
                        <Shimmer width={120} height={14} />
                      </View>
                      <Shimmer width={50} height={16} />
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

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
            Platform.OS === "web" ? t("superAdmin.dashboard.title") : undefined
          }
          subtitle={
            Platform.OS === "web"
              ? t("superAdmin.dashboard.overview")
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
                  {t("superAdmin.dashboard.title")}
                </Text>
                <Text style={styles.welcomeSubtitle}>
                  {t("superAdmin.dashboard.overview")}
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
                  label: t("superAdmin.dashboard.totalCompanies"),
                  value: stats.totalCompanies,
                  growth: stats.totalCompaniesGrowth,
                },
                {
                  label: t("superAdmin.dashboard.totalEmployees"),
                  value: stats.totalEmployees,
                  growth: stats.employeeGrowth,
                },
                {
                  label: t("superAdmin.dashboard.totalTasks"),
                  value: stats.totalTasks,
                  growth: stats.tasksGrowth,
                },
                {
                  label: t("superAdmin.dashboard.totalForms"),
                  value: stats.totalForms,
                  growth: stats.formsGrowth,
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
                    {t("superAdmin.dashboard.monthlyOnboarded")}
                  </Text>
                  <DynamicChart
                    monthlyData={stats.monthlyOnboarded}
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
                    {t("superAdmin.dashboard.monthlyForms")}
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

            {/* Activity Logs section */}
            <View style={styles.activityLogsSection}>
              <Surface style={styles.activityLogsCard} elevation={0}>
                {stats.latestActivities && stats.latestActivities.length > 0 ? (
                  <ActivityLogTimeline logs={stats.latestActivities} />
                ) : (
                  <View style={styles.emptyState}>
                    <MaterialCommunityIcons
                      name="clock-outline"
                      size={48}
                      color={theme.colors.outlineVariant}
                    />
                    <Text style={styles.emptyStateText}>
                      {t("superAdmin.activityLogs.noLogs")}
                    </Text>
                  </View>
                )}
              </Surface>
            </View>

            <View
              style={[
                styles.listsContainer,
                { flexDirection: isLargeScreen ? "row" : "column" },
              ]}
            >
              <View style={styles.listWrapper}>
                <View style={styles.listCard}>
                  <Text variant={"bold"} style={styles.sectionTitle}>
                    {t("superAdmin.dashboard.topCompanies")}
                  </Text>
                  {stats.topCompanies
                    .slice(
                      0,
                      showAllCompanies
                        ? stats.topCompanies.length
                        : INITIAL_ITEMS_TO_SHOW
                    )
                    .map((company, index) => (
                      <View
                        key={index}
                        style={[
                          styles.companyCard,
                          index ===
                            (showAllCompanies
                              ? stats.topCompanies.length
                              : Math.min(
                                  INITIAL_ITEMS_TO_SHOW,
                                  stats.topCompanies.length
                                )) -
                              1 && {
                            borderBottomWidth: 0,
                            marginBottom: 0,
                          },
                        ]}
                      >
                        <View style={styles.companyInfo}>
                          <Text variant={"bold"} style={styles.companyName}>
                            {company.name}
                          </Text>
                          <Text style={styles.companyEmployees}>
                            {company.employee_count}{" "}
                            {t("superAdmin.dashboard.employeeCount")}
                          </Text>
                        </View>
                        <Text
                          variant={"bold"}
                          style={[
                            styles.companyGrowth,
                            company.growth_percentage?.startsWith("-")
                              ? styles.negativeGrowth
                              : {},
                          ]}
                        >
                          {company.growth_percentage}
                        </Text>
                      </View>
                    ))}

                  {stats.topCompanies.length === 0 ? (
                    <View style={styles.emptyState}>
                      <MaterialCommunityIcons
                        name="domain"
                        size={48}
                        color={theme.colors.outlineVariant}
                      />
                      <Text style={styles.emptyStateText}>
                        {t("superAdmin.companies.title")} {t("common.notFound")}
                      </Text>
                    </View>
                  ) : (
                    stats.topCompanies.length > INITIAL_ITEMS_TO_SHOW && (
                      <TouchableOpacity
                        style={styles.showMoreButton}
                        onPress={() => {
                          setShowAllCompanies(!showAllCompanies);
                        }}
                      >
                        <Text style={styles.showMoreText}>
                          {showAllCompanies
                            ? t("superAdmin.dashboard.showLess") || "Show Less"
                            : t("superAdmin.dashboard.showMore") || "Show More"}
                        </Text>
                        <MaterialCommunityIcons
                          name={
                            showAllCompanies ? "chevron-up" : "chevron-down"
                          }
                          size={16}
                          color="#3b82f6"
                        />
                      </TouchableOpacity>
                    )
                  )}
                </View>
              </View>

              <View style={styles.listWrapper}>
                <View style={styles.listCard}>
                  <Text variant={"bold"} style={styles.sectionTitle}>
                    {t("superAdmin.dashboard.topEmployees")}
                  </Text>
                  {stats.topEmployees
                    .slice(
                      0,
                      showAllEmployees
                        ? stats.topEmployees.length
                        : INITIAL_ITEMS_TO_SHOW
                    )
                    .map((employee, index) => (
                      <View
                        key={index}
                        style={[
                          styles.companyCard,
                          index ===
                            (showAllEmployees
                              ? stats.topEmployees.length
                              : Math.min(
                                  INITIAL_ITEMS_TO_SHOW,
                                  stats.topEmployees.length
                                )) -
                              1 && {
                            borderBottomWidth: 0,
                            marginBottom: 0,
                          },
                        ]}
                      >
                        <View style={styles.companyInfo}>
                          <Text variant={"bold"} style={styles.companyName}>
                            {employee.name}
                          </Text>
                          <Text style={styles.companyEmployees}>
                            {employee.company_name}
                          </Text>
                        </View>
                        <View style={styles.formsCountContainer}>
                          <Text variant={"bold"} style={styles.formsCount}>
                            {employee.forms_count}
                          </Text>
                          <Text style={styles.formsLabel}>
                            {t("superAdmin.dashboard.formsFilled") || "Forms"}
                          </Text>
                        </View>
                      </View>
                    ))}

                  {stats.topEmployees.length === 0 ? (
                    <View style={styles.emptyState}>
                      <MaterialCommunityIcons
                        name="account-group"
                        size={48}
                        color={theme.colors.outlineVariant}
                      />
                      <Text style={styles.emptyStateText}>
                        {t("superAdmin.employees.title") || "Employees"}{" "}
                        {t("common.notFound")}
                      </Text>
                    </View>
                  ) : (
                    stats.topEmployees.length > INITIAL_ITEMS_TO_SHOW && (
                      <TouchableOpacity
                        style={styles.showMoreButton}
                        onPress={() => {
                          setShowAllEmployees(!showAllEmployees);
                        }}
                      >
                        <Text style={styles.showMoreText}>
                          {showAllEmployees
                            ? t("superAdmin.dashboard.showLess") || "Show Less"
                            : t("superAdmin.dashboard.showMore") || "Show More"}
                        </Text>
                        <MaterialCommunityIcons
                          name={
                            showAllEmployees ? "chevron-up" : "chevron-down"
                          }
                          size={16}
                          color="#3b82f6"
                        />
                      </TouchableOpacity>
                    )
                  )}
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
  listsContainer: {
    gap: 24,
    width: "100%",
    marginTop: 24,
    alignItems: "flex-start",
  },
  listWrapper: {
    flex: 1,
    width: "100%",
    maxWidth: 1000,
    marginBottom: 24,
  },
  listCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: Platform.OS === "web" ? (width >= 768 ? 24 : 16) : 16,
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
  companyCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: Platform.OS === "web" ? (width >= 768 ? 20 : 16) : 16,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    ...createTextStyle({
      fontWeight: "600",
      fontSize: Platform.OS === "web" ? (width >= 768 ? 16 : 14) : 14,
    }),
    color: "#333",
    marginBottom: 4,
  },
  companyEmployees: {
    ...createTextStyle({
      fontWeight: "400",
      fontSize: Platform.OS === "web" ? (width >= 768 ? 14 : 12) : 12,
    }),
    color: "#666",
  },
  companyGrowth: {
    fontSize: 14,
    color: "#4CAF50",
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
  topCompaniesContainer: {
    flex: 1,
  },
  topEmployeesContainer: {
    flex: 1,
  },
  activityLogsSection: {
    width: "100%",
    marginBottom: 24,
    elevation: 0,
  },
  activityLogsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  activityLogsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 0,
    minHeight: 400,
    maxHeight: 600,
    overflow: "hidden",
  },
});

export default SuperAdminDashboard;
