import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  StatusBar,
} from "react-native";
import { Text, Card, Button, useTheme, Divider } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import DashboardCard from "../../components/DashboardCard";
import LoadingIndicator from "../../components/LoadingIndicator";
import StatusBadge from "../../components/StatusBadge";
import { FormStatus, TaskStatus } from "../../types";
import { LinearGradient } from "expo-linear-gradient";

const EmployeeDashboard = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user, signOut } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [stats, setStats] = useState({
    totalForms: 0,
    pendingForms: 0,
    totalTasks: 0,
    pendingTasks: 0,
  });
  const [recentTasks, setRecentTasks] = useState<any[]>([]);
  const [recentForms, setRecentForms] = useState<any[]>([]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

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

      // Fetch tasks assigned to employee
      const { data: tasksData, error: tasksError } = await supabase
        .from("task")
        .select("*")
        .contains("assigned_users", [user.id])
        .order("created_at", { ascending: false });

      if (!tasksError) {
        const tasks = tasksData || [];
        const pendingTasks = tasks.filter(
          (task) => task.status !== TaskStatus.COMPLETED
        );

        setStats((prev) => ({
          ...prev,
          totalTasks: tasks.length,
          pendingTasks: pendingTasks.length,
        }));

        setRecentTasks(tasks.slice(0, 3));
      }

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

        setStats((prev) => ({
          ...prev,
          totalForms: allForms.length,
          pendingForms: pendingForms.length,
        }));

        setRecentForms(allForms.slice(0, 3));
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const getFormTypeIcon = (type: string) => {
    switch (type) {
      case "accident":
        return "alert-circle";
      case "illness":
        return "medical-bag";
      case "departure":
        return "account-arrow-right";
      default:
        return "file-document";
    }
  };

  if (loading && !refreshing) {
    return <LoadingIndicator />;
  }

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
          <Card
            style={[
              styles.welcomeCard,
              { backgroundColor: theme.colors.primary },
            ]}
          >
            <Card.Content>
              <Text style={styles.welcomeText}>
                Welcome, {employeeData?.first_name || "Employee"}!
              </Text>
              <Text style={styles.companyText}>
                {companyData?.company_name || "Your Company"}
              </Text>
            </Card.Content>
          </Card>

          <View style={styles.statsContainer}>
            <DashboardCard
              title="My Forms"
              count={stats.totalForms}
              icon="file-document"
              color={theme.colors.primary}
              onPress={() => navigation.navigate("Forms" as never)}
            />

            <DashboardCard
              title="Pending Forms"
              count={stats.pendingForms}
              icon="file-clock"
              color="#F59E0B" // Amber
              onPress={() => navigation.navigate("Forms" as never)}
            />

            <DashboardCard
              title="My Tasks"
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
          </View>

          <Text
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            Quick Actions
          </Text>

          <View style={styles.actionsContainer}>
            <Button
              mode="contained-tonal"
              icon="alert-circle"
              onPress={() =>
                navigation.navigate("CreateAccidentReport" as never)
              }
              style={styles.actionButton}
            >
              Report Accident
            </Button>

            <Button
              mode="contained-tonal"
              icon="medical-bag"
              onPress={() =>
                navigation.navigate("CreateIllnessReport" as never)
              }
              style={styles.actionButton}
            >
              Report Illness
            </Button>

            <Button
              mode="contained-tonal"
              icon="account-arrow-right"
              onPress={() =>
                navigation.navigate("CreateStaffDeparture" as never)
              }
              style={styles.actionButton}
            >
              Staff Departure
            </Button>
          </View>

          {recentTasks.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.colors.onBackground },
                  ]}
                >
                  Recent Tasks
                </Text>
                <Button
                  mode="text"
                  onPress={() => navigation.navigate("Tasks" as never)}
                >
                  View All
                </Button>
              </View>

              {recentTasks.map((task, index) => (
                <Card
                  key={task.id}
                  style={[
                    styles.itemCard,
                    { backgroundColor: theme.colors.surface },
                  ]}
                  onPress={() =>
                    navigation.navigate(
                      "TaskDetails" as never,
                      { taskId: task.id } as never
                    )
                  }
                >
                  <Card.Content>
                    <View style={styles.cardHeader}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {task.title}
                      </Text>
                      <StatusBadge status={task.status} size="small" />
                    </View>
                    <Text style={styles.cardDescription} numberOfLines={1}>
                      {task.description}
                    </Text>
                    <Text style={styles.cardDate}>
                      Due: {format(new Date(task.deadline), "MMM d, yyyy")}
                    </Text>
                  </Card.Content>
                </Card>
              ))}
            </>
          )}

          {recentForms.length > 0 && (
            <>
              <View style={styles.sectionHeader}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.colors.onBackground },
                  ]}
                >
                  Recent Forms
                </Text>
                <Button
                  mode="text"
                  onPress={() => navigation.navigate("Forms" as never)}
                >
                  View All
                </Button>
              </View>

              {recentForms.map((form, index) => (
                <Card
                  key={`${form.type}-${form.id}`}
                  style={[
                    styles.itemCard,
                    { backgroundColor: theme.colors.surface },
                  ]}
                  onPress={() =>
                    navigation.navigate(
                      "FormDetails" as never,
                      {
                        formId: form.id,
                        formType: form.type,
                      } as never
                    )
                  }
                >
                  <Card.Content>
                    <View style={styles.cardHeader}>
                      <View style={styles.formTitleContainer}>
                        <Text style={styles.formType}>{form.title}</Text>
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
        </ScrollView>
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
    padding: 16,
    paddingBottom: 40,
  },
  welcomeCard: {
    marginBottom: 16,
    elevation: 0,
  },
  welcomeText: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
  },
  companyText: {
    fontSize: 16,
    color: "white",
    opacity: 0.9,
  },
  statsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 12,
  },
  actionsContainer: {
    marginBottom: 24,
  },
  actionButton: {
    marginBottom: 8,
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
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
    marginRight: 8,
  },
  cardDescription: {
    opacity: 0.7,
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  formTitleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  formType: {
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default EmployeeDashboard;
