import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from "react-native";
import { Text, Card, Searchbar, useTheme, FAB, Chip } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import EmptyState from "../../components/EmptyState";
import StatusBadge from "../../components/StatusBadge";
import { Task, TaskPriority, TaskStatus } from "../../types";

const CompanyAdminTasksScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");

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

  const fetchTasks = async () => {
    try {
      setLoading(true);

      // Get company ID if not already set
      const currentCompanyId = companyId || (await fetchCompanyId());
      if (!currentCompanyId) {
        console.error("No company ID found");
        setLoading(false);
        return;
      }

      setCompanyId(currentCompanyId);

      const { data, error } = await supabase
        .from("task")
        .select("*")
        .eq("company_id", currentCompanyId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching tasks:", error);
        return;
      }

      setTasks(data || []);
      setFilteredTasks(data || []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [user]);

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
        return theme.colors.warning || "#F59E0B";
      case TaskPriority.LOW:
        return theme.colors.primary;
      default:
        return theme.colors.primary;
    }
  };

  const renderTaskItem = ({ item }: { item: Task }) => (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate(
          "TaskDetails" as never,
          { taskId: item.id } as never
        )
      }
    >
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.taskTitle}>{item.title}</Text>
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
              textStyle={{ color: getPriorityColor(item.priority) }}
            >
              {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
            </Chip>

            <Text style={styles.deadline}>
              Due: {format(new Date(item.deadline), "MMM d, yyyy")}
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
          style={styles.filterChip}
        >
          All
        </Chip>
        <Chip
          selected={statusFilter === TaskStatus.OPEN}
          onPress={() => setStatusFilter(TaskStatus.OPEN)}
          style={styles.filterChip}
        >
          Open
        </Chip>
        <Chip
          selected={statusFilter === TaskStatus.IN_PROGRESS}
          onPress={() => setStatusFilter(TaskStatus.IN_PROGRESS)}
          style={styles.filterChip}
        >
          In Progress
        </Chip>
        <Chip
          selected={statusFilter === TaskStatus.AWAITING_RESPONSE}
          onPress={() => setStatusFilter(TaskStatus.AWAITING_RESPONSE)}
          style={styles.filterChip}
        >
          Awaiting Response
        </Chip>
        <Chip
          selected={statusFilter === TaskStatus.COMPLETED}
          onPress={() => setStatusFilter(TaskStatus.COMPLETED)}
          style={styles.filterChip}
        >
          Completed
        </Chip>
        <Chip
          selected={statusFilter === TaskStatus.OVERDUE}
          onPress={() => setStatusFilter(TaskStatus.OVERDUE)}
          style={styles.filterChip}
        >
          Overdue
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
      <AppHeader title="Tasks" showBackButton />

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search tasks..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
      </View>

      {renderStatusFilter()}

      {filteredTasks.length === 0 ? (
        <EmptyState
          icon="clipboard-text-off"
          title="No Tasks Found"
          message={
            searchQuery || statusFilter !== "all"
              ? "No tasks match your search criteria."
              : "You haven't created any tasks yet."
          }
          buttonTitle={
            searchQuery || statusFilter !== "all"
              ? "Clear Filters"
              : "Create Task"
          }
          onButtonPress={() => {
            if (searchQuery || statusFilter !== "all") {
              setSearchQuery("");
              setStatusFilter("all");
            } else {
              navigation.navigate("CreateTask" as never);
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
        onPress={() => navigation.navigate("CreateTask" as never)}
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
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
    marginBottom: 16,
    elevation: 0,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  taskTitle: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
    marginRight: 8,
  },
  taskDescription: {
    marginBottom: 16,
    opacity: 0.7,
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
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default CompanyAdminTasksScreen;
