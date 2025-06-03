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
import { Card, Button, useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { format } from "date-fns";
import { supabase, isNetworkAvailable } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import StatusBadge from "../../components/StatusBadge";
import { FormStatus } from "../../types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Text from "../../components/Text";
import { LinearGradient } from "expo-linear-gradient";
import DynamicChart from "../../components/DynamicChart";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

// Add Shimmer component for loading states
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

const EmployeeDashboard = () => {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [networkStatus, setNetworkStatus] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalForms: 0,
    pendingForms: 0,
    formsGrowth: "+0%",
    monthlyForms: [] as number[],
    monthLabels: [] as string[],
  });
  const [recentForms, setRecentForms] = useState<any[]>([]);

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
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

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
        setError("You're offline. Dashboard data may be outdated.");
      }

      if (!user) return;

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

      // Prepare monthly data fetch operations for forms
      const allMonthsFormData = new Array(12).fill(0);

      // Create arrays of promises for each month's data
      const monthlyAccidentFormPromises = [];
      const monthlyIllnessFormPromises = [];
      const monthlyDepartureFormPromises = [];

      for (let month = 0; month < 12; month++) {
        // Calculate the proper date range - handle year wraparound
        const dateYear = currentMonth >= month ? currentYear : currentYear - 1;
        const monthStart = new Date(dateYear, month, 1);
        const monthEnd = new Date(dateYear, month + 1, 0);

        // Form data promises
        monthlyAccidentFormPromises.push(
          supabase
            .from("accident_report")
            .select("*", { count: "exact", head: true })
            .eq("employee_id", user.id)
            .gte("created_at", monthStart.toISOString())
            .lte("created_at", monthEnd.toISOString())
        );

        monthlyIllnessFormPromises.push(
          supabase
            .from("illness_report")
            .select("*", { count: "exact", head: true })
            .eq("employee_id", user.id)
            .gte("submission_date", monthStart.toISOString())
            .lte("submission_date", monthEnd.toISOString())
        );

        monthlyDepartureFormPromises.push(
          supabase
            .from("staff_departure_report")
            .select("*", { count: "exact", head: true })
            .eq("employee_id", user.id)
            .gte("created_at", monthStart.toISOString())
            .lte("created_at", monthEnd.toISOString())
        );
      }

      // Execute all monthly data promises in parallel
      const [
        monthlyAccidentResults,
        monthlyIllnessResults,
        monthlyDepartureResults,
      ] = await Promise.all([
        Promise.all(monthlyAccidentFormPromises),
        Promise.all(monthlyIllnessFormPromises),
        Promise.all(monthlyDepartureFormPromises),
      ]);

      // Process monthly results
      for (let month = 0; month < 12; month++) {
        // Process form data
        const monthAccidentCount = monthlyAccidentResults[month].count || 0;
        const monthIllnessCount = monthlyIllnessResults[month].count || 0;
        const monthDepartureCount = monthlyDepartureResults[month].count || 0;

        allMonthsFormData[month] =
          monthAccidentCount + monthIllnessCount + monthDepartureCount;
      }

      // Extract data for recent months only
      const recentMonthsFormData = recentMonths.map(
        (index) => allMonthsFormData[index]
      );
      const recentMonthsLabels = recentMonths.map((index) => monthNames[index]);

      // Fetch employee data
      const { data: userData, error: userError } = await supabase
        .from("company_user")
        .select("*, company:company_id(*)")
        .eq("id", user.id)
        .single();

      if (userError) {
        console.error("Error fetching employee data:", userError);
        return;
      }

      setEmployeeData(userData);
      setCompanyData(userData.company);

      // Fetch forms submitted by employee
      const { data: accidentData, error: accidentError } = await supabase
        .from("accident_report")
        .select("*")
        .eq("employee_id", user.id)
        .order("created_at", { ascending: false });

      const { data: illnessData, error: illnessError } = await supabase
        .from("illness_report")
        .select("*")
        .eq("employee_id", user.id)
        .order("submission_date", { ascending: false });

      const { data: departureData, error: departureError } = await supabase
        .from("staff_departure_report")
        .select("*")
        .eq("employee_id", user.id)
        .order("created_at", { ascending: false });

      if (!accidentError && !illnessError && !departureError) {
        const accidentForms = (accidentData || []).map((form) => ({
          ...form,
          type: "accident",
          title: "Accident Report",
          date: form.created_at,
        }));

        const illnessForms = (illnessData || []).map((form) => ({
          ...form,
          type: "illness",
          title: "Illness Report",
          date: form.submission_date,
        }));

        const departureForms = (departureData || []).map((form) => ({
          ...form,
          type: "departure",
          title: "Staff Departure Report",
          date: form.created_at,
        }));

        const allForms = [
          ...accidentForms,
          ...illnessForms,
          ...departureForms,
        ].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        const pendingForms = allForms.filter(
          (form) =>
            form.status !== FormStatus.APPROVED &&
            form.status !== FormStatus.DECLINED
        );

        setStats({
          totalForms: allForms.length,
          pendingForms: pendingForms.length,
          formsGrowth: "+0%",
          monthlyForms: recentMonthsFormData,
          monthLabels: recentMonthsLabels,
        });

        setRecentForms(allForms.slice(0, 5));
      }
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
          isAdmin={false}
          onSignOut={signOut}
          showHelpButton={false}
          showLogo={Platform.OS !== "web"}
          title={Platform.OS === "web" ? "" : undefined}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.welcomeHeader}>
            <Shimmer width={200} height={28} style={styles.skeletonTitle} />
            <Shimmer width={300} height={16} style={styles.skeletonSubtitle} />
          </View>

          <View style={[styles.statsGridContainer, { gap: 16 }]}>
            {[1, 2, 3].map((_, index) => (
              <View
                key={index}
                style={[
                  styles.statsGridItem,
                  {
                    width: isLargeScreen
                      ? "32%"
                      : isMediumScreen
                        ? "48%"
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
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["top"]}
    >
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
      <AppHeader
        showProfileMenu={true}
        userEmail={user?.email || ""}
        isAdmin={false}
        onSignOut={signOut}
        showHelpButton={false}
        showLogo={Platform.OS !== "web"}
        title={Platform.OS === "web" ? "Employee Dashboard" : undefined}
      />

      <Animated.View style={styles.container} entering={FadeIn.duration(300)}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.welcomeHeader}>
            <Text variant="bold" style={styles.welcomeTitle}>
              Welcome, {employeeData?.first_name || "Employee"}!
            </Text>
            <Text style={styles.welcomeSubtitle}>
              {companyData?.company_name || "Your Company"}
            </Text>
          </View>

          {/* Forms Section */}
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
            {[
              {
                label: "Total Forms Filled",
                value: stats.totalForms,
                growth: stats.formsGrowth,
                icon: "file-document-multiple",
              },
              {
                label: "Pending Forms",
                value: stats.pendingForms,
                growth: "+0%",
                icon: "file-clock",
              },
            ].map((stat, index) => (
              <View
                key={index}
                style={[
                  styles.statsGridItem,
                  {
                    width: isLargeScreen
                      ? "48%"
                      : isMediumScreen
                        ? "48%"
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
                    <Text variant="medium" style={styles.statLabel}>
                      {stat.label}
                    </Text>
                    <Text
                      variant="bold"
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
                  <View style={styles.statValueContainer}>
                    <Text variant="bold" style={styles.statValue}>
                      {stat.value.toLocaleString()}
                    </Text>
                    <MaterialCommunityIcons
                      name={"file-document-multiple-outline"}
                      size={24}
                      color={theme.colors.primary}
                      style={styles.statIcon}
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Quick Actions Section */}
          <View
            style={[
              styles.actionsContainer,
              {
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 16,
                marginBottom: 24,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate("CreateAccidentReport")}
            >
              <LinearGradient
                colors={["#FF6B6B", "#EE5D5D"]}
                style={styles.actionIconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={24}
                  color="#FFF"
                />
              </LinearGradient>
              <View style={styles.actionContent}>
                <Text variant="bold" style={styles.actionTitle}>
                  Report Accident
                </Text>
                <Text style={styles.actionDescription}>
                  Submit a new accident report
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate("CreateIllnessReport")}
            >
              <LinearGradient
                colors={["#4ECDC4", "#45B7AF"]}
                style={styles.actionIconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons
                  name="medical-bag"
                  size={24}
                  color="#FFF"
                />
              </LinearGradient>
              <View style={styles.actionContent}>
                <Text variant="bold" style={styles.actionTitle}>
                  Report Illness
                </Text>
                <Text style={styles.actionDescription}>
                  Submit a new illness report
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate("CreateStaffDeparture")}
            >
              <LinearGradient
                colors={["#6C5CE7", "#5F51D9"]}
                style={styles.actionIconContainer}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons
                  name="account-arrow-right"
                  size={24}
                  color="#FFF"
                />
              </LinearGradient>
              <View style={styles.actionContent}>
                <Text variant="bold" style={styles.actionTitle}>
                  Staff Departure
                </Text>
                <Text style={styles.actionDescription}>
                  Submit departure report
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Charts and Recent Forms Container */}
          <View
            style={[
              styles.gridContainer,
              { flexDirection: isLargeScreen ? "row" : "column" },
            ]}
          >
            {/* Monthly Forms Chart */}
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
              <View style={styles.chartCard}>
                <Text variant="bold" style={styles.sectionTitle}>
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
                          ? Math.min(windowDimensions.width - 48, 850)
                          : Math.min(windowDimensions.width - 48, 1000)
                      : windowDimensions.width - 32
                  }
                />
              </View>
            </View>

            {/* Recent Forms Section */}
            {recentForms.length > 0 && (
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
                <View style={styles.listCard}>
                  <View style={styles.sectionHeader}>
                    <Text variant="bold" style={styles.sectionTitle}>
                      Recent Forms
                    </Text>
                    <Button
                      mode="text"
                      onPress={() => navigation.navigate("Forms")}
                    >
                      View All
                    </Button>
                  </View>

                  {recentForms.map((form, index) => (
                    <TouchableOpacity
                      key={`${form.type}-${form.id}`}
                      style={[
                        styles.formCard,
                        index === recentForms.length - 1 && {
                          borderBottomWidth: 0,
                          marginBottom: 0,
                        },
                      ]}
                      onPress={() =>
                        navigation.navigate("FormDetails", {
                          formId: form.id,
                          formType: form.type,
                        })
                      }
                    >
                      <View style={styles.formInfo}>
                        <Text variant="bold" style={styles.formTitle}>
                          {form.title}
                        </Text>
                        <Text style={styles.formDate}>
                          {format(new Date(form.date), "MMM d, yyyy")}
                        </Text>
                      </View>
                      <StatusBadge status={form.status} size="small" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>

          {networkStatus === false && (
            <View style={styles.offlineNotice}>
              <MaterialCommunityIcons name="wifi-off" size={20} color="#666" />
              <Text style={styles.offlineText}>You're currently offline</Text>
            </View>
          )}

          <View style={styles.tabBarSpacer} />
        </ScrollView>
      </Animated.View>
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
    fontSize: Platform.OS === "web" ? (width >= 768 ? 28 : 22) : 22,
    color: "#333",
    paddingBottom: 3,
  },
  welcomeSubtitle: {
    fontSize: Platform.OS === "web" ? (width >= 768 ? 16 : 14) : 14,
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
    fontSize: Platform.OS === "web" ? (width >= 768 ? 14 : 13) : 13,
    color: "#333",
  },
  statGrowth: {
    fontSize: 12,
    color: "#4CAF50",
  },
  negativeGrowth: {
    color: "#F44336",
  },
  statValueContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Platform.OS === "web" ? 16 : 8,
  },
  statValue: {
    fontSize: Platform.OS === "web" ? (width >= 768 ? 32 : 25) : 25,
    color: "#111",
  },
  statIcon: {
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: Platform.OS === "web" ? (width >= 768 ? 18 : 16) : 16,
    marginTop: 16,
    marginBottom: 12,
    color: "#333",
    marginLeft: 5,
  },
  actionsContainer: {
    width: "100%",
  },
  actionCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: Platform.OS === "web" ? 24 : 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: Platform.OS === "web" ? (width >= 768 ? 16 : 15) : 15,
    color: "#1F2937",
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: Platform.OS === "web" ? (width >= 768 ? 14 : 13) : 13,
    color: "#6B7280",
  },
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 0,
    marginBottom: Platform.OS === "web" ? 0 : 24,
    minHeight: width >= 768 ? 290 : 290,
    borderWidth: 1,
    borderColor: "#e5e7eb",
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
    height: "100%",
  },
  formCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: Platform.OS === "web" ? (width >= 768 ? 20 : 16) : 16,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  formInfo: {
    flex: 1,
  },
  formTitle: {
    fontSize: Platform.OS === "web" ? (width >= 768 ? 16 : 14) : 14,
    color: "#333",
    marginBottom: 4,
  },
  formDate: {
    fontSize: 12,
    color: "#666",
  },
  offlineNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8f9fa",
    padding: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  offlineText: {
    marginLeft: 8,
    color: "#666",
  },
  tabBarSpacer: {
    height: 90,
  },
  skeletonTitle: {
    marginBottom: 8,
  },
  skeletonSubtitle: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  gridContainer: {
    gap: 24,
    width: "100%",
    marginBottom: 24,
  },
  gridItem: {
    flex: 1,
  },
});

export default EmployeeDashboard;
