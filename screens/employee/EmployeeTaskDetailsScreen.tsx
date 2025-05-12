import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, Alert } from "react-native";
import {
  Text,
  Card,
  Button,
  Divider,
  useTheme,
  ActivityIndicator,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
import AppHeader from "../../components/AppHeader";
import StatusBadge from "../../components/StatusBadge";
import { Task, TaskStatus } from "../../types";

type TaskDetailsRouteParams = {
  taskId: number;
};

const EmployeeTaskDetailsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<Record<string, TaskDetailsRouteParams>, string>>();
  const { taskId } = route.params;

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [task, setTask] = useState<Task | null>(null);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("tasks")
        .select(
          `
          *,
          creator:created_by(
            first_name,
            last_name
          )
        `
        )
        .eq("id", taskId)
        .single();

      if (error) {
        throw error;
      }

      setTask(data);
    } catch (error) {
      console.error("Error fetching task details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  const handleUpdateStatus = async (newStatus: TaskStatus) => {
    try {
      setUpdating(true);

      const { error } = await supabase
        .from("tasks")
        .update({
          status: newStatus,
          ...(newStatus === TaskStatus.COMPLETED
            ? { completed_at: new Date().toISOString() }
            : {}),
        })
        .eq("id", taskId);

      if (error) {
        throw error;
      }

      // Update local state
      if (task) {
        setTask({
          ...task,
          status: newStatus,
          ...(newStatus === TaskStatus.COMPLETED
            ? { completed_at: new Date().toISOString() }
            : {}),
        });
      }

      Alert.alert("Success", `Task status updated to ${newStatus}.`);
    } catch (error: any) {
      console.error("Error updating task status:", error);
      Alert.alert("Error", error.message || "Failed to update task status");
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMMM d, yyyy");
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <AppHeader title="Task Details" showBackButton />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!task) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <AppHeader title="Task Details" showBackButton />
        <View style={styles.errorContainer}>
          <Text style={{ color: theme.colors.error }}>Task not found</Text>
          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={styles.button}
          >
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader title="Task Details" showBackButton />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.headerRow}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <StatusBadge status={task.status} />
            </View>

            <Text style={styles.description}>{task.description}</Text>

            <Divider style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Priority:</Text>
              <Text
                style={[
                  styles.infoValue,
                  {
                    color:
                      task.priority === "high"
                        ? theme.colors.error
                        : task.priority === "medium"
                          ? "#F59E0B"
                          : theme.colors.primary,
                  },
                ]}
              >
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Due Date:</Text>
              <Text style={styles.infoValue}>{formatDate(task.deadline)}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Created By:</Text>
              <Text style={styles.infoValue}>
                {task.creator?.first_name} {task.creator?.last_name}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Created On:</Text>
              <Text style={styles.infoValue}>
                {formatDate(task.created_at)}
              </Text>
            </View>

            {task.completed_at && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Completed On:</Text>
                <Text style={styles.infoValue}>
                  {formatDate(task.completed_at)}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          {task.status === TaskStatus.PENDING && (
            <Button
              mode="contained"
              onPress={() => handleUpdateStatus(TaskStatus.IN_PROGRESS)}
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              loading={updating}
              disabled={updating}
            >
              Start Task
            </Button>
          )}

          {task.status === TaskStatus.IN_PROGRESS && (
            <Button
              mode="contained"
              onPress={() => handleUpdateStatus(TaskStatus.COMPLETED)}
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              loading={updating}
              disabled={updating}
            >
              Complete Task
            </Button>
          )}

          {task.status === TaskStatus.COMPLETED && (
            <Button
              mode="outlined"
              onPress={() => handleUpdateStatus(TaskStatus.IN_PROGRESS)}
              style={styles.button}
              loading={updating}
              disabled={updating}
            >
              Reopen Task
            </Button>
          )}
        </View>
      </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  taskTitle: {
    fontSize: 20,
    fontWeight: "bold",
    flex: 1,
    marginRight: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  infoLabel: {
    fontWeight: "500",
    width: 100,
    opacity: 0.7,
  },
  infoValue: {
    flex: 1,
  },
  buttonContainer: {
    marginTop: 8,
  },
  button: {
    marginBottom: 12,
  },
});

export default EmployeeTaskDetailsScreen;
