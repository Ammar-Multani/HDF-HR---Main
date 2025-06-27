import React, { useState, useEffect } from "react";
import { StyleSheet, View, RefreshControl } from "react-native";
import { FlashList } from "@shopify/flash-list";
import {
  Text,
  Card,
  useTheme,
  Searchbar,
  SegmentedButtons,
  ActivityIndicator,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import StatusBadge from "../../components/StatusBadge";
import NoDataMessage from "../../components/NoDataMessage";
import { Task, TaskStatus } from "../../types";

const EmployeeTasksScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);

  const fetchTasks = async () => {
    try {
      setLoading(true);

      if (!user) return;

      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .eq("assignee_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setTasks(data || []);
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
    filterTasks();
  }, [tasks, searchQuery, statusFilter]);

  const filterTasks = () => {
    let filtered = [...tasks];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(query) ||
          task.description.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((task) => task.status === statusFilter);
    }

    setFilteredTasks(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const renderTaskItem = ({ item }: { item: Task }) => (
    <Card
      style={[styles.card, { backgroundColor: theme.colors.surface }]}
      onPress={() =>
        navigation.navigate(
          "TaskDetails" as never,
          { taskId: item.id } as never
        )
      }
    >
      <Card.Content>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <StatusBadge status={item.status} size="small" />
        </View>

        <Text style={styles.cardDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.cardFooter}>
          <Text style={styles.dateText}>
            Due: {format(new Date(item.deadline), "MMM d, yyyy")}
          </Text>

          <Text style={styles.priorityText}>
            {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}{" "}
            Priority
          </Text>
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader title="My Tasks" showBackButton />

      <View style={styles.filtersContainer}>
        <Searchbar
          placeholder="Search tasks..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />

        <SegmentedButtons
          value={statusFilter}
          onValueChange={setStatusFilter}
          buttons={[
            { value: "all", label: "All" },
            { value: TaskStatus.PENDING, label: "Pending" },
            { value: TaskStatus.IN_PROGRESS, label: "In Progress" },
            { value: TaskStatus.COMPLETED, label: "Completed" },
          ]}
          style={styles.segmentedButtons}
          theme={{
            colors: {
              secondaryContainer: theme.colors.primaryContainer,
              onSecondaryContainer: theme.colors.primary,
            },
          }}
        />
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlashList estimatedItemSize={74}
          data={filteredTasks}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTaskItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <NoDataMessage
              message="No tasks found"
              icon="clipboard-list-outline"
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filtersContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    marginBottom: 12,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  card: {
    marginBottom: 12,
    elevation: 0,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
    marginRight: 8,
  },
  cardDescription: {
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.7,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: {
    fontSize: 12,
    opacity: 0.6,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default EmployeeTasksScreen;
