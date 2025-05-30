import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  StatusBar,
  Dimensions,
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

const { width } = Dimensions.get("window");

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
  });
  const [recentForms, setRecentForms] = useState<any[]>([]);

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

      // Calculate last month date for growth calculations
      const lastMonthDate = new Date();
      lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);

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

      // Fetch last month's forms
      const { data: lastMonthAccidentData } = await supabase
        .from("accident_report")
        .select("*")
        .eq("employee_id", user.id)
        .lt("created_at", lastMonthDate.toISOString());

      const { data: lastMonthIllnessData } = await supabase
        .from("illness_report")
        .select("*")
        .eq("employee_id", user.id)
        .lt("submission_date", lastMonthDate.toISOString());

      const { data: lastMonthDepartureData } = await supabase
        .from("staff_departure_report")
        .select("*")
        .eq("employee_id", user.id)
        .lt("created_at", lastMonthDate.toISOString());

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

        // Calculate forms growth
        const lastMonthForms = [
          ...(lastMonthAccidentData || []),
          ...(lastMonthIllnessData || []),
          ...(lastMonthDepartureData || []),
        ];

        let formsGrowth = "+0%";
        if (lastMonthForms.length > 0) {
          const growthRate =
            ((allForms.length - lastMonthForms.length) /
              lastMonthForms.length) *
            100;
          formsGrowth =
            (growthRate >= 0 ? "+" : "") + growthRate.toFixed(1) + "%";
        }

        setStats({
          totalForms: allForms.length,
          pendingForms: pendingForms.length,
          formsGrowth: formsGrowth,
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
    return <LoadingIndicator />;
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
      />

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
        <Text variant="bold" style={styles.sectionTitle}>
          Forms
        </Text>
        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text variant="medium" style={styles.statLabel}>
              Total Forms
            </Text>
            <Text
              variant="bold"
              style={[
                styles.statGrowth,
                stats.formsGrowth.startsWith("-") ? styles.negativeGrowth : {},
              ]}
            >
              {stats.formsGrowth}
            </Text>
          </View>
          <Text variant="bold" style={styles.statValue}>
            {stats.totalForms.toLocaleString()}
          </Text>
        </View>

        <View style={styles.statsCard}>
          <View style={styles.statRow}>
            <Text variant="medium" style={styles.statLabel}>
              Pending Forms
            </Text>
          </View>
          <Text variant="bold" style={styles.statValue}>
            {stats.pendingForms.toLocaleString()}
          </Text>
        </View>

        <Text variant="bold" style={styles.sectionTitle}>
          Quick Actions
        </Text>

        <View style={styles.actionsContainer}>
          <Button
            mode="contained-tonal"
            icon="alert-circle"
            onPress={() => navigation.navigate("CreateAccidentReport")}
            style={styles.actionButton}
          >
            Report Accident
          </Button>

          <Button
            mode="contained-tonal"
            icon="medical-bag"
            onPress={() => navigation.navigate("CreateIllnessReport")}
            style={styles.actionButton}
          >
            Report Illness
          </Button>

          <Button
            mode="contained-tonal"
            icon="account-arrow-right"
            onPress={() => navigation.navigate("CreateStaffDeparture")}
            style={styles.actionButton}
          >
            Staff Departure
          </Button>
        </View>

        {recentForms.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text variant="bold" style={styles.sectionTitle}>
                Recent Forms
              </Text>
              <Button mode="text" onPress={() => navigation.navigate("Forms")}>
                View All
              </Button>
            </View>

            {recentForms.map((form) => (
              <Card
                key={`${form.type}-${form.id}`}
                style={styles.itemCard}
                onPress={() =>
                  navigation.navigate("FormDetails", {
                    formId: form.id,
                    formType: form.type,
                  })
                }
              >
                <Card.Content>
                  <View style={styles.cardHeader}>
                    <View style={styles.formTitleContainer}>
                      <Text variant="bold" style={styles.formType}>
                        {form.title}
                      </Text>
                      <StatusBadge status={form.status} size="small" />
                    </View>
                  </View>
                  <Text style={styles.cardDate}>
                    Submitted: {format(new Date(form.date), "MMM d, yyyy")}
                  </Text>
                </Card.Content>
              </Card>
            ))}
          </>
        )}

        {networkStatus === false && (
          <View style={styles.offlineNotice}>
            <MaterialCommunityIcons name="wifi-off" size={20} color="#666" />
            <Text style={styles.offlineText}>You're currently offline</Text>
          </View>
        )}

        {/* Extra padding at the bottom for tab bar */}
        <View style={styles.tabBarSpacer} />
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
    paddingBottom: 120,
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
  actionsContainer: {
    marginBottom: 24,
  },
  actionButton: {
    marginBottom: 8,
    borderRadius: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  itemCard: {
    marginBottom: 12,
    elevation: 0,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    flex: 1,
    marginRight: 8,
    color: "#333",
  },
  cardDescription: {
    opacity: 0.7,
    marginBottom: 4,
    fontSize: 14,
    color: "#666",
  },
  cardDate: {
    fontSize: 12,
    opacity: 0.7,
    color: "#666",
  },
  formTitleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  formType: {
    fontSize: 16,
    color: "#333",
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
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  tabBarSpacer: {
    height: 90, // Space for the tab bar
  },
});

export default EmployeeDashboard;
