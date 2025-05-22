import React, { useState, useEffect } from "react";
import { StyleSheet, View, ScrollView, Alert } from "react-native";
import {
  Text,
  Card,
  Button,
  Divider,
  useTheme,
  ActivityIndicator,
  Chip,
  Avatar,
  IconButton,
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "#F44336";
      case "medium":
        return "#FF9800";
      case "low":
        return "#4CAF50";
      default:
        return theme.colors.primary;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return "#4CAF50";
      case TaskStatus.IN_PROGRESS:
        return "#2196F3";
      case TaskStatus.PENDING:
        return "#FF9800";
      default:
        return theme.colors.primary;
    }
  };

  const getStatusBackgroundColor = (status: string) => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return "rgba(76, 175, 80, 0.1)";
      case TaskStatus.IN_PROGRESS:
        return "rgba(33, 150, 243, 0.1)";
      case TaskStatus.PENDING:
        return "rgba(255, 152, 0, 0.1)";
      default:
        return "rgba(0, 0, 0, 0.05)";
    }
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
          <IconButton
            icon="alert-circle-outline"
            size={50}
            iconColor={theme.colors.error}
          />
          <Text
            style={{
              color: theme.colors.error,
              fontSize: 18,
              fontWeight: "bold",
              marginBottom: 16,
            }}
          >
            Task not found
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={[styles.button, { marginTop: 0 }]}
          >
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#F5F7FA" }]}>
      <AppHeader title="Task Details" showBackButton />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <Card
          style={[
            styles.headerCard,
            { backgroundColor: getStatusBackgroundColor(task.status) },
          ]}
        >
          <Card.Content>
            <View style={styles.statusContainer}>
              <StatusBadge status={task.status} />
            </View>
            <Text style={styles.taskTitle}>{task.title}</Text>

            <View style={styles.priorityContainer}>
              <Chip
                mode="outlined"
                style={[
                  styles.priorityChip,
                  {
                    borderColor: getPriorityColor(task.priority),
                    backgroundColor: `${getPriorityColor(task.priority)}20`,
                  },
                ]}
                textStyle={{ color: getPriorityColor(task.priority) }}
              >
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}{" "}
                Priority
              </Chip>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{task.description}</Text>

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>Timeline</Text>

            <View style={styles.timelineContainer}>
              <View style={styles.timelineItem}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Created</Text>
                  <Text style={styles.timelineDate}>
                    {formatDate(task.created_at)}
                  </Text>
                </View>
              </View>

              {task.deadline && (
                <View style={styles.timelineItem}>
                  <View
                    style={[styles.timelineDot, { backgroundColor: "#FF9800" }]}
                  />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Due Date</Text>
                    <Text style={styles.timelineDate}>
                      {formatDate(task.deadline)}
                    </Text>
                  </View>
                </View>
              )}

              {task.completed_at && (
                <View style={styles.timelineItem}>
                  <View
                    style={[styles.timelineDot, { backgroundColor: "#4CAF50" }]}
                  />
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineTitle}>Completed</Text>
                    <Text style={styles.timelineDate}>
                      {formatDate(task.completed_at)}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>Assigned By</Text>
            <View style={styles.assignedByContainer}>
              <Avatar.Text
                size={40}
                label={`${task.creator?.first_name?.[0] || ""}${task.creator?.last_name?.[0] || ""}`}
                style={{ backgroundColor: theme.colors.primary }}
              />
              <View style={styles.assignedByInfo}>
                <Text style={styles.assignedByName}>
                  {task.creator?.first_name} {task.creator?.last_name}
                </Text>
                <Text style={styles.assignedByRole}>Task Creator</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.actionsCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Task Actions</Text>

            {task.status === TaskStatus.PENDING && (
              <Button
                mode="contained"
                onPress={() => handleUpdateStatus(TaskStatus.IN_PROGRESS)}
                style={[styles.actionButton, { backgroundColor: "#2196F3" }]}
                icon="play"
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
                style={[styles.actionButton, { backgroundColor: "#4CAF50" }]}
                icon="check"
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
                style={styles.actionButton}
                icon="refresh"
                loading={updating}
                disabled={updating}
              >
                Reopen Task
              </Button>
            )}
          </Card.Content>
        </Card>
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
  headerCard: {
    marginBottom: 16,
    elevation: 0,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  card: {
    marginBottom: 16,
    elevation: 0,
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  actionsCard: {
    marginBottom: 16,
    elevation: 0,
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 8,
    color: "#555",
  },
  divider: {
    marginVertical: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
    height: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  timelineContainer: {
    marginTop: 8,
  },
  timelineItem: {
    flexDirection: "row",
    marginBottom: 16,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#1976D2",
    marginRight: 12,
    marginTop: 4,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
    color: "#333",
  },
  timelineDate: {
    fontSize: 14,
    color: "#666",
  },
  statusContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 12,
  },
  priorityContainer: {
    flexDirection: "row",
    marginBottom: 8,
  },
  priorityChip: {
    height: 30,
  },
  assignedByContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  assignedByInfo: {
    marginLeft: 16,
  },
  assignedByName: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  assignedByRole: {
    fontSize: 14,
    color: "#666",
  },
  actionButton: {
    marginTop: 12,
    borderRadius: 8,
    paddingVertical: 8,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  infoLabel: {
    fontWeight: "500",
    width: 100,
    opacity: 0.7,
    fontSize: 14,
    color: "#666",
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
  button: {
    marginTop: 24,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
});

export default EmployeeTaskDetailsScreen;
