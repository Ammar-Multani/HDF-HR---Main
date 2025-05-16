import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Alert,
} from "react-native";
import {
  Text,
  Card,
  Button,
  Divider,
  useTheme,
  Chip,
  TextInput,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import StatusBadge from "../../components/StatusBadge";
import { Task, TaskStatus, TaskPriority, TaskComment } from "../../types";

type TaskDetailsRouteParams = {
  taskId: string;
};

const SuperAdminTaskDetailsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<Record<string, TaskDetailsRouteParams>, string>>();
  const { taskId } = route.params;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [task, setTask] = useState<Task | null>(null);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [assignedUsers, setAssignedUsers] = useState<any[]>([]);
  const [followers, setFollowers] = useState<any[]>([]);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);

      // Fetch task details
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select("*")
        .eq("id", taskId)
        .single();

      if (taskError) {
        console.error("Error fetching task details:", taskError);
        return;
      }

      setTask(taskData);

      // Fetch task comments
      const { data: commentsData, error: commentsError } = await supabase
        .from("task_comments")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });

      if (!commentsError) {
        setComments(commentsData || []);
      }

      // Fetch assigned users using a separate query if assigned_users array exists
      if (taskData.assigned_to && taskData.assigned_to.length > 0) {
        // First check if the assigned users are in company_user table
        const { data: assignedCompanyUsers, error: companyUserError } =
          await supabase
            .from("company_user")
            .select("id, first_name, last_name, email, role")
            .in("id", taskData.assigned_to);

        // Then check if any are in admin table
        const { data: assignedAdmins, error: adminError } = await supabase
          .from("admin")
          .select("id, name, email, role")
          .in("id", taskData.assigned_to);

        if (!companyUserError && !adminError) {
          // Format and combine the results
          const formattedCompanyUsers = (assignedCompanyUsers || []).map(
            (user) => ({
              id: user.id,
              first_name: user.first_name,
              last_name: user.last_name,
              email: user.email,
              role: user.role,
            })
          );

          const formattedAdmins = (assignedAdmins || []).map((admin) => ({
            id: admin.id,
            first_name: admin.name?.split(" ")[0] || "",
            last_name: admin.name?.split(" ").slice(1).join(" ") || "",
            email: admin.email,
            role: admin.role,
          }));

          setAssignedUsers([...formattedCompanyUsers, ...formattedAdmins]);
        }
      }

      // Fetch followers
      if (taskData.followers && taskData.followers.length > 0) {
        // First check if the followers are in company_user table
        const { data: followerCompanyUsers, error: companyUserError } =
          await supabase
            .from("company_user")
            .select("id, first_name, last_name, email")
            .in("id", taskData.followers);

        // Then check if any are in admin table
        const { data: followerAdmins, error: adminError } = await supabase
          .from("admin")
          .select("id, name, email")
          .in("id", taskData.followers);

        if (!companyUserError && !adminError) {
          // Format and combine the results
          const formattedCompanyUsers = (followerCompanyUsers || []).map(
            (user) => ({
              id: user.id,
              first_name: user.first_name,
              last_name: user.last_name,
              email: user.email,
            })
          );

          const formattedAdmins = (followerAdmins || []).map((admin) => ({
            id: admin.id,
            first_name: admin.name?.split(" ")[0] || "",
            last_name: admin.name?.split(" ").slice(1).join(" ") || "",
            email: admin.email,
          }));

          setFollowers([...formattedCompanyUsers, ...formattedAdmins]);
        }
      }
    } catch (error) {
      console.error("Error fetching task details:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  // Helper function to determine user role label
  const getUserRoleLabel = (senderId: string) => {
    if (senderId === user?.id) return "You";

    // Check in assignedUsers array first
    const assignedUser = assignedUsers.find((u) => u.id === senderId);
    if (assignedUser) {
      if (assignedUser.role === "SUPER_ADMIN") return "Super Admin";
      if (assignedUser.role === "COMPANY_ADMIN") return "Company Admin";
      return "User";
    }

    // Default fallback
    return "User";
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTaskDetails();
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;

    try {
      setSubmittingComment(true);

      const { error } = await supabase.from("task_comments").insert([
        {
          task_id: taskId,
          sender_id: user.id,
          company_id: task?.company_id,
          message: newComment.trim(),
        },
      ]);

      if (error) {
        throw error;
      }

      // Refresh comments
      const { data: commentsData, error: commentsError } = await supabase
        .from("task_comments")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });

      if (!commentsError) {
        setComments(commentsData || []);
      }

      setNewComment("");
    } catch (error: any) {
      console.error("Error adding comment:", error);
      Alert.alert("Error", error.message || "Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleUpdateStatus = async (newStatus: TaskStatus) => {
    if (!task) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus })
        .eq("id", task.id);

      if (error) {
        throw error;
      }

      // Update local state
      setTask({
        ...task,
        status: newStatus,
      });

      Alert.alert(
        "Success",
        `Task status updated to ${newStatus.replace("_", " ")}`
      );
    } catch (error: any) {
      console.error("Error updating task status:", error);
      Alert.alert("Error", error.message || "Failed to update task status");
    } finally {
      setLoading(false);
    }
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

  const renderUserName = (user: any) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.email;
  };

  if (loading && !refreshing) {
    return <LoadingIndicator />;
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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.headerRow}>
              <Text style={styles.taskTitle}>{task.title}</Text>
              <StatusBadge status={task.status} />
            </View>

            <Chip
              icon="flag"
              style={[
                styles.priorityChip,
                { backgroundColor: getPriorityColor(task.priority) + "20" },
              ]}
              textStyle={{ color: getPriorityColor(task.priority) }}
            >
              {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}{" "}
              Priority
            </Chip>

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{task.description}</Text>

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>Details</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Deadline:</Text>
              <Text style={styles.detailValue}>
                {format(new Date(task.deadline), "MMMM d, yyyy")}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Created:</Text>
              <Text style={styles.detailValue}>
                {format(new Date(task.created_at), "MMMM d, yyyy")}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Reminder:</Text>
              <Text style={styles.detailValue}>
                {task.reminder_days} days before deadline
              </Text>
            </View>

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>Assigned Users</Text>

            {assignedUsers.length > 0 ? (
              <View style={styles.usersContainer}>
                {assignedUsers.map((user) => (
                  <Chip
                    key={user.id}
                    icon="account"
                    style={styles.userChip}
                    mode="outlined"
                  >
                    {renderUserName(user)}
                  </Chip>
                ))}
              </View>
            ) : (
              <Text style={styles.noUsersText}>No users assigned</Text>
            )}

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>Followers</Text>

            {followers.length > 0 ? (
              <View style={styles.usersContainer}>
                {followers.map((user) => (
                  <Chip
                    key={user.id}
                    icon="eye"
                    style={styles.userChip}
                    mode="outlined"
                  >
                    {renderUserName(user)}
                  </Chip>
                ))}
              </View>
            ) : (
              <Text style={styles.noUsersText}>No followers</Text>
            )}
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Update Status</Text>

            <View style={styles.statusButtonsContainer}>
              <Button
                mode="outlined"
                onPress={() => handleUpdateStatus(TaskStatus.OPEN)}
                style={[
                  styles.statusButton,
                  task.status === TaskStatus.OPEN && styles.activeStatusButton,
                ]}
                textColor={
                  task.status === TaskStatus.OPEN
                    ? theme.colors.primary
                    : undefined
                }
              >
                Open
              </Button>

              <Button
                mode="outlined"
                onPress={() => handleUpdateStatus(TaskStatus.IN_PROGRESS)}
                style={[
                  styles.statusButton,
                  task.status === TaskStatus.IN_PROGRESS &&
                    styles.activeStatusButton,
                ]}
                textColor={
                  task.status === TaskStatus.IN_PROGRESS
                    ? theme.colors.primary
                    : undefined
                }
              >
                In Progress
              </Button>

              <Button
                mode="outlined"
                onPress={() => handleUpdateStatus(TaskStatus.AWAITING_RESPONSE)}
                style={[
                  styles.statusButton,
                  task.status === TaskStatus.AWAITING_RESPONSE &&
                    styles.activeStatusButton,
                ]}
                textColor={
                  task.status === TaskStatus.AWAITING_RESPONSE
                    ? theme.colors.primary
                    : undefined
                }
              >
                Awaiting
              </Button>

              <Button
                mode="outlined"
                onPress={() => handleUpdateStatus(TaskStatus.COMPLETED)}
                style={[
                  styles.statusButton,
                  task.status === TaskStatus.COMPLETED &&
                    styles.activeStatusButton,
                ]}
                textColor={
                  task.status === TaskStatus.COMPLETED
                    ? theme.colors.primary
                    : undefined
                }
              >
                Completed
              </Button>

              <Button
                mode="outlined"
                onPress={() => handleUpdateStatus(TaskStatus.OVERDUE)}
                style={[
                  styles.statusButton,
                  task.status === TaskStatus.OVERDUE &&
                    styles.activeStatusButton,
                ]}
                textColor={
                  task.status === TaskStatus.OVERDUE
                    ? theme.colors.primary
                    : undefined
                }
              >
                Overdue
              </Button>
            </View>
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Comments</Text>

            {comments.length > 0 ? (
              comments.map((comment) => (
                <View key={comment.id} style={styles.commentContainer}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentUser}>
                      {getUserRoleLabel(comment.sender_id)}
                    </Text>
                    <Text style={styles.commentDate}>
                      {format(
                        new Date(comment.created_at),
                        "MMM d, yyyy h:mm a"
                      )}
                    </Text>
                  </View>
                  <Text style={styles.commentText}>{comment.message}</Text>
                </View>
              ))
            ) : (
              <Text style={styles.noCommentsText}>No comments yet</Text>
            )}

            <View style={styles.addCommentContainer}>
              <TextInput
                label="Add a comment"
                value={newComment}
                onChangeText={setNewComment}
                mode="outlined"
                multiline
                style={styles.commentInput}
                disabled={submittingComment}
              />
              <Button
                mode="contained"
                onPress={handleAddComment}
                style={styles.addCommentButton}
                loading={submittingComment}
                disabled={submittingComment || !newComment.trim()}
              >
                Add Comment
              </Button>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={() =>
              navigation.navigate(
                "EditTask" as never,
                { taskId: task.id } as never
              )
            }
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
          >
            Edit Task
          </Button>
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
  card: {
    marginBottom: 16,
    elevation: 0,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  taskTitle: {
    fontSize: 22,
    fontWeight: "bold",
    flex: 1,
    marginRight: 8,
  },
  priorityChip: {
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  detailLabel: {
    fontWeight: "500",
    width: 100,
    opacity: 0.7,
  },
  detailValue: {
    flex: 1,
  },
  usersContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  userChip: {
    margin: 4,
  },
  noUsersText: {
    fontStyle: "italic",
    opacity: 0.7,
  },
  statusButtonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statusButton: {
    marginBottom: 8,
    flex: 1,
    marginHorizontal: 4,
  },
  activeStatusButton: {
    borderWidth: 2,
  },
  commentContainer: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  commentUser: {
    fontWeight: "bold",
  },
  commentDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  commentText: {
    fontSize: 16,
    lineHeight: 24,
  },
  noCommentsText: {
    fontStyle: "italic",
    opacity: 0.7,
    marginBottom: 16,
  },
  addCommentContainer: {
    marginTop: 16,
  },
  commentInput: {
    marginBottom: 12,
  },
  addCommentButton: {
    alignSelf: "flex-end",
  },
  buttonContainer: {
    marginTop: 8,
  },
  button: {
    marginBottom: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
});

export default SuperAdminTaskDetailsScreen;
