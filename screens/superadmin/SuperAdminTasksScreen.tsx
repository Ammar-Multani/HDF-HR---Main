import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from "react-native";
import { Card, Searchbar, useTheme, FAB, Chip } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  ParamListBase,
  NavigationProp,
} from "@react-navigation/native";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import EmptyState from "../../components/EmptyState";
import StatusBadge from "../../components/StatusBadge";
import { Task, TaskPriority, TaskStatus } from "../../types";
import Text from "../../components/Text";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";

const SuperAdminTasksScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");

  const fetchTasks = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("tasks")
        .select(
          `
          *,
          company:company_id(id, company_name)
        `
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching tasks:", error);
        return;
      }

      // For each task, fetch the assigned users separately if needed
      const tasksWithAssignedUsers = await Promise.all(
        (data || []).map(async (task) => {
          if (task.assigned_to && task.assigned_to.length > 0) {
            // Fetch company users
            const { data: companyUsers } = await supabase
              .from("company_user")
              .select("id, first_name, last_name, email, role")
              .in("id", task.assigned_to);

            // Fetch admin users
            const { data: adminUsers } = await supabase
              .from("admin")
              .select("id, name, email, role")
              .in("id", task.assigned_to);

            const formattedCompanyUsers = (companyUsers || []).map((user) => ({
              id: user.id,
              name: `${user.first_name} ${user.last_name}`,
              email: user.email,
              role: user.role,
            }));

            const formattedAdminUsers = (adminUsers || []).map((admin) => ({
              id: admin.id,
              name: admin.name,
              email: admin.email,
              role: admin.role,
            }));

            return {
              ...task,
              assignedUserDetails: [
                ...formattedCompanyUsers,
                ...formattedAdminUsers,
              ],
            };
          }

          return task;
        })
      );

      setTasks(tasksWithAssignedUsers || []);
      setFilteredTasks(tasksWithAssignedUsers || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  useEffect(() => {
    let filtered = tasks;

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((task) => task.status === statusFilter);
    }

    // Apply search filter
    if (searchQuery.trim() !== "") {
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          task.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredTasks(filtered);
  }, [searchQuery, statusFilter, tasks]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH:
        return theme.colors.error;
      case TaskPriority.MEDIUM:
        return "#F59E0B"; // Fixed warning color
      case TaskPriority.LOW:
        return theme.colors.primary;
      default:
        return theme.colors.primary;
    }
  };

  const getTranslatedPriority = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH:
        return t("superAdmin.tasks.high");
      case TaskPriority.MEDIUM:
        return t("superAdmin.tasks.medium");
      case TaskPriority.LOW:
        return t("superAdmin.tasks.low");
      default:
        // Fall back to a safe default translation
        return t("superAdmin.tasks.medium");
    }
  };

  const renderTaskItem = ({ item }: { item: Task }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate("TaskDetails", { taskId: item.id })}
    >
      <Card
        style={[
          styles.card,
          {
            backgroundColor: "#FFFFFF",
            shadowColor: "transparent",
          },
        ]}
        elevation={0}
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text variant="bold" style={styles.taskTitle}>
              {item.title}
            </Text>
            <StatusBadge status={item.status} />
          </View>

          <Text style={styles.taskDescription} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.cardFooter}>
            <Chip
              icon="flag"
              style={[
                styles.priorityChip,
                { backgroundColor: getPriorityColor(item.priority) + "20" },
              ]}
              textStyle={{
                color: getPriorityColor(item.priority),
                fontFamily: "Poppins-Medium",
              }}
            >
              {getTranslatedPriority(item.priority)}
            </Chip>

            <Text variant="medium" style={styles.deadline}>
              {t("superAdmin.tasks.due")}:{" "}
              {format(new Date(item.deadline), "MMM d, yyyy")}
            </Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderStatusFilter = () => (
    <View style={styles.filterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Chip
          selected={statusFilter === "all"}
          onPress={() => setStatusFilter("all")}
          style={[
            styles.filterChip,
            statusFilter === "all" ? styles.selectedChip : {},
          ]}
          textStyle={{
            fontFamily: "Poppins-Medium",
            color: statusFilter === "all" ? "#fff" : "#666",
          }}
        >
          {t("superAdmin.tasks.all")}
        </Chip>
        <Chip
          selected={statusFilter === TaskStatus.OPEN}
          onPress={() => setStatusFilter(TaskStatus.OPEN)}
          style={[
            styles.filterChip,
            statusFilter === TaskStatus.OPEN ? styles.selectedChip : {},
          ]}
          textStyle={{
            fontFamily: "Poppins-Medium",
            color: statusFilter === TaskStatus.OPEN ? "#fff" : "#666",
          }}
        >
          {t("superAdmin.tasks.open")}
        </Chip>
        <Chip
          selected={statusFilter === TaskStatus.IN_PROGRESS}
          onPress={() => setStatusFilter(TaskStatus.IN_PROGRESS)}
          style={[
            styles.filterChip,
            statusFilter === TaskStatus.IN_PROGRESS ? styles.selectedChip : {},
          ]}
          textStyle={{
            fontFamily: "Poppins-Medium",
            color: statusFilter === TaskStatus.IN_PROGRESS ? "#fff" : "#666",
          }}
        >
          {t("superAdmin.tasks.inProgress")}
        </Chip>
        <Chip
          selected={statusFilter === TaskStatus.AWAITING_RESPONSE}
          onPress={() => setStatusFilter(TaskStatus.AWAITING_RESPONSE)}
          style={[
            styles.filterChip,
            statusFilter === TaskStatus.AWAITING_RESPONSE
              ? styles.selectedChip
              : {},
          ]}
          textStyle={{
            fontFamily: "Poppins-Medium",
            color:
              statusFilter === TaskStatus.AWAITING_RESPONSE ? "#fff" : "#666",
          }}
        >
          {t("superAdmin.tasks.awaitingResponse")}
        </Chip>
        <Chip
          selected={statusFilter === TaskStatus.COMPLETED}
          onPress={() => setStatusFilter(TaskStatus.COMPLETED)}
          style={[
            styles.filterChip,
            statusFilter === TaskStatus.COMPLETED ? styles.selectedChip : {},
          ]}
          textStyle={{
            fontFamily: "Poppins-Medium",
            color: statusFilter === TaskStatus.COMPLETED ? "#fff" : "#666",
          }}
        >
          {t("superAdmin.tasks.completed")}
        </Chip>
        <Chip
          selected={statusFilter === TaskStatus.OVERDUE}
          onPress={() => setStatusFilter(TaskStatus.OVERDUE)}
          style={[
            styles.filterChip,
            statusFilter === TaskStatus.OVERDUE ? styles.selectedChip : {},
          ]}
          textStyle={{
            fontFamily: "Poppins-Medium",
            color: statusFilter === TaskStatus.OVERDUE ? "#fff" : "#666",
          }}
        >
          {t("superAdmin.tasks.overdue")}
        </Chip>
      </ScrollView>
    </View>
  );

  if (loading && !refreshing) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader
        title={t("superAdmin.tasks.title")}
        showBackButton={false}
        showHelpButton={false}
        showProfileMenu={false}
        showLogo={false}
        showTitle={true}
      />
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder={t("superAdmin.tasks.search")}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
      </View>

      {renderStatusFilter()}

      {filteredTasks.length === 0 ? (
        <EmptyState
          icon="clipboard-text-off"
          title={t("superAdmin.tasks.noTasksFound")}
          message={
            searchQuery || statusFilter !== "all"
              ? t("superAdmin.tasks.noTasksMatch")
              : t("superAdmin.tasks.noTasksCreated")
          }
          buttonTitle={
            searchQuery || statusFilter !== "all"
              ? t("superAdmin.tasks.clearFilters")
              : t("superAdmin.tasks.createTask")
          }
          onButtonPress={() => {
            if (searchQuery || statusFilter !== "all") {
              setSearchQuery("");
              setStatusFilter("all");
            } else {
              navigation.navigate("CreateTask");
            }
          }}
        />
      ) : (
        <FlatList
          data={filteredTasks}
          renderItem={renderTaskItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate("CreateTask")}
        color={theme.colors.surface}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchbar: {
    elevation: 0,
    borderRadius: 18,
    height: 60,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterChip: {
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  selectedChip: {
    borderWidth: 0,
    backgroundColor: "rgba(54,105,157,255)",
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 16,
    elevation: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 16,
    flex: 1,
    marginRight: 8,
    color: "#333",
  },
  taskDescription: {
    marginBottom: 16,
    opacity: 0.7,
    color: "#666",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priorityChip: {
    height: 30,
  },
  deadline: {
    opacity: 0.7,
    fontSize: 14,
    color: "#666",
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 80,
  },
});

export default SuperAdminTasksScreen;
