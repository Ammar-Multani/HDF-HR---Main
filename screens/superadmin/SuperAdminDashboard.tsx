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
import { useTheme, Avatar, Divider, Button } from "react-native-paper";
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
import Animated, { FadeIn } from "react-native-reanimated";
import DynamicChart from "../../components/DynamicChart";

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
          {/* Skeleton header */}
          {Platform.OS !== "web" && (
            <View style={styles.welcomeHeader}>
              <View
                style={[
                  styles.skeleton,
                  styles.skeletonTitle,
                  { width: "60%" },
                ]}
              />
              <View
                style={[
                  styles.skeleton,
                  styles.skeletonSubtitle,
                  { width: "80%" },
                ]}
              />
            </View>
          )}

          {/* Skeleton stats cards */}
          <View style={styles.statsGridContainer}>
            <View style={styles.statsGridItem}>
              <View style={styles.statsCard}>
                <View style={styles.statRow}>
                  <View
                    style={[styles.skeleton, { width: "40%", height: 18 }]}
                  />
                  <View
                    style={[styles.skeleton, { width: "15%", height: 16 }]}
                  />
                </View>
                <View
                  style={[
                    styles.skeleton,
                    { width: "25%", height: 30, marginTop: 5 },
                  ]}
                />
              </View>
            </View>

            <View style={styles.statsGridItem}>
              <View style={styles.statsCard}>
                <View style={styles.statRow}>
                  <View
                    style={[styles.skeleton, { width: "40%", height: 18 }]}
                  />
                  <View
                    style={[styles.skeleton, { width: "15%", height: 16 }]}
                  />
                </View>
                <View
                  style={[
                    styles.skeleton,
                    { width: "25%", height: 30, marginTop: 5 },
                  ]}
                />
              </View>
            </View>

            <View style={styles.statsGridItem}>
              <View style={styles.statsCard}>
                <View style={styles.statRow}>
                  <View
                    style={[styles.skeleton, { width: "40%", height: 18 }]}
                  />
                  <View
                    style={[styles.skeleton, { width: "15%", height: 16 }]}
                  />
                </View>
                <View
                  style={[
                    styles.skeleton,
                    { width: "25%", height: 30, marginTop: 5 },
                  ]}
                />
              </View>
            </View>

            <View style={styles.statsGridItem}>
              <View style={styles.statsCard}>
                <View style={styles.statRow}>
                  <View
                    style={[styles.skeleton, { width: "40%", height: 18 }]}
                  />
                  <View
                    style={[styles.skeleton, { width: "15%", height: 16 }]}
                  />
                </View>
                <View
                  style={[
                    styles.skeleton,
                    { width: "25%", height: 30, marginTop: 5 },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Skeleton chart */}
          <View style={styles.chartCard}>
            <View
              style={[
                styles.skeleton,
                { width: "50%", height: 22, marginBottom: 20 },
              ]}
            />
            <View
              style={[
                styles.skeleton,
                { width: "100%", height: 200, borderRadius: 8 },
              ]}
            />
          </View>

          {/* Skeleton companies list */}
          <View style={styles.topCompaniesContainer}>
            <View
              style={[
                styles.skeleton,
                { width: "40%", height: 22, marginBottom: 20 },
              ]}
            />

            {[1, 2, 3, 4, 5].map((_, index) => (
              <View
                key={index}
                style={[
                  styles.companyCard,
                  index === 4 && {
                    borderBottomWidth: 0,
                    marginBottom: 0,
                  },
                ]}
              >
                <View style={styles.companyInfo}>
                  <View
                    style={[
                      styles.skeleton,
                      { width: "60%", height: 18, marginBottom: 8 },
                    ]}
                  />
                  <View
                    style={[styles.skeleton, { width: "40%", height: 16 }]}
                  />
                </View>
                <View style={[styles.skeleton, { width: "15%", height: 16 }]} />
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

            <View style={styles.statsGridContainer}>
              <View style={styles.statsGridItem}>
                <View style={styles.statsCard}>
                  <View style={styles.statRow}>
                    <Text variant={"medium"} style={styles.statLabel}>
                      {t("superAdmin.dashboard.totalCompanies")}
                    </Text>
                    <Text variant={"bold"} style={styles.statGrowth}>
                      {stats.totalCompaniesGrowth}
                    </Text>
                  </View>
                  <Text variant={"bold"} style={styles.statValue}>
                    {stats.totalCompanies.toLocaleString()}
                  </Text>
                </View>
              </View>

              <View style={styles.statsGridItem}>
                <View style={styles.statsCard}>
                  <View style={styles.statRow}>
                    <Text variant={"medium"} style={styles.statLabel}>
                      {t("superAdmin.dashboard.totalEmployees")}
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
              </View>

              <View style={styles.statsGridItem}>
                <View style={styles.statsCard}>
                  <View style={styles.statRow}>
                    <Text variant={"medium"} style={styles.statLabel}>
                      {t("superAdmin.dashboard.totalTasks")}
                    </Text>
                    <Text
                      variant={"bold"}
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
                  <Text variant={"bold"} style={styles.statValue}>
                    {stats.totalTasks.toLocaleString()}
                  </Text>
                </View>
              </View>

              <View style={styles.statsGridItem}>
                <View style={styles.statsCard}>
                  <View style={styles.statRow}>
                    <Text variant={"medium"} style={styles.statLabel}>
                      {t("superAdmin.dashboard.totalForms")}
                    </Text>
                    <Text
                      variant={"bold"}
                      style={[
                        styles.statGrowth,
                        stats.formsGrowth.startsWith("-")
                          ? styles.negativeGrowth
                          : {},
                      ]}
                    >
                      {stats.formsGrowth}
                    </Text>
                  </View>
                  <Text variant={"bold"} style={styles.statValue}>
                    {stats.totalForms.toLocaleString()}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.chartCard}>
              <Text variant={"bold"} style={styles.sectionTitle}>
                {t("superAdmin.dashboard.monthlyOnboarded")}
              </Text>
              <DynamicChart
                monthlyData={stats.monthlyOnboarded}
                monthLabels={stats.monthLabels}
                width={width - 10}
              />
            </View>

            <View style={styles.chartCard}>
              <Text variant={"bold"} style={styles.sectionTitle}>
                {t("superAdmin.dashboard.monthlyForms")}
              </Text>
              <DynamicChart
                monthlyData={stats.monthlyForms}
                monthLabels={stats.monthLabels}
                width={width - 10}
              />
            </View>

            <View style={styles.topCompaniesContainer}>
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
                      name={showAllCompanies ? "chevron-up" : "chevron-down"}
                      size={16}
                      color="#3b82f6"
                    />
                  </TouchableOpacity>
                )
              )}
            </View>

            {/* Top Employees Section */}
            <View style={styles.topEmployeesContainer}>
              <Text variant={"bold"} style={styles.sectionTitle}>
                {t("superAdmin.dashboard.topEmployees") ||
                  "Top Employees by Forms"}
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
                      name={showAllEmployees ? "chevron-up" : "chevron-down"}
                      size={16}
                      color="#3b82f6"
                    />
                  </TouchableOpacity>
                )
              )}
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
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 90,
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
  statsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    fontSize: 13,
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
    fontSize: 25,
    color: "#111",
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
  chartTitle: {
    fontSize: 16,
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
    padding: 16,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  companyInfo: {
    flex: 1,
  },
  companyName: {
    fontSize: 16,
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
  },
  sectionTitle: {
    fontSize: 18,
    marginBottom: 16,
    color: "#333",
  },
  topCompaniesContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  // Add new styles for top employees
  topEmployeesContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    marginBottom: 16,
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
  // Skeleton styles
  skeleton: {
    backgroundColor: "#E1E9EE",
    borderRadius: 4,
    overflow: "hidden",
    position: "relative",
  },
  skeletonTitle: {
    height: 22,
    marginBottom: 5,
  },
  skeletonSubtitle: {
    height: 14,
  },
  statsGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-evenly",
    gap: 10,
    marginBottom: 10,
  },
  statsGridItem: {
    width: "48%",
    marginBottom: 5,
  },
  showMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    // backgroundColor: "#f0f7ff",
    borderRadius: 8,
    marginTop: 8,
  },
  showMoreText: {
    color: "#3b82f6",
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    marginRight: 5,
  },
});

export default SuperAdminDashboard;
