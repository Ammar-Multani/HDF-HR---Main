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
  Avatar,
  IconButton,
  Surface,
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

const CompanyAdminTaskDetailsScreen = () => {
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

        // Fetch comment sender details
        const senderIds =
          commentsData?.map((comment) => comment.sender_id) || [];
        if (senderIds.length > 0) {
          // Fetch from company_user table
          const { data: companyUsers } = await supabase
            .from("company_user")
            .select("id, first_name, last_name, email, role")
            .in("id", senderIds);

          // Fetch from admin table
          const { data: admins } = await supabase
            .from("admin")
            .select("id, name, email, role")
            .in("id", senderIds);

          // Store user details for comments
          const userDetails = new Map();

          // Add company users to the map
          (companyUsers || []).forEach((user) => {
            userDetails.set(user.id, {
              name: `${user.first_name} ${user.last_name}`,
              email: user.email,
              role: user.role,
            });
          });

          // Add admins to the map
          (admins || []).forEach((admin) => {
            userDetails.set(admin.id, {
              name: admin.name,
              email: admin.email,
              role: admin.role,
            });
          });

          // Attach user details to comments
          const commentsWithUserDetails =
            commentsData?.map((comment) => ({
              ...comment,
              senderDetails: userDetails.get(comment.sender_id) || null,
            })) || [];

          setComments(commentsWithUserDetails);
        }
      }

      // Fetch assigned users using a separate query if assigned_to array exists
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
  const getUserRoleLabel = (comment: any) => {
    if (comment.sender_id === user?.id) return "You";

    if (comment.senderDetails) {
      if (comment.senderDetails.role === "superadmin")
        return `Super Admin (${comment.senderDetails.name})`;
      if (comment.senderDetails.role === "admin")
        return `Company Admin (${comment.senderDetails.name})`;
      return comment.senderDetails.name;
    }

    // Check in assignedUsers array if sender details not attached to comment
    const assignedUser = assignedUsers.find((u) => u.id === comment.sender_id);
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
          company_id: task?.company_id as string | undefined, // Type assertion
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

      Alert.alert("Success", `Task status updated to ${newStatus}`);
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
        return "#F44336"; // Red
      case TaskPriority.MEDIUM:
        return "#FF9800"; // Orange
      case TaskPriority.LOW:
        return "#4CAF50"; // Green
      default:
        return theme.colors.primary;
    }
  };

  const getStatusBackgroundColor = (status: string) => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return "rgba(76, 175, 80, 0.1)"; // Green background
      case TaskStatus.IN_PROGRESS:
        return "rgba(33, 150, 243, 0.1)"; // Blue background
      case TaskStatus.PENDING:
      case TaskStatus.OPEN:
        return "rgba(255, 152, 0, 0.1)"; // Orange background
      case TaskStatus.OVERDUE:
        return "rgba(244, 67, 54, 0.1)"; // Red background
      case TaskStatus.AWAITING_RESPONSE:
        return "rgba(156, 39, 176, 0.1)"; // Purple background
      default:
        return "rgba(0, 0, 0, 0.05)";
    }
  };

  const renderUserName = (user: any) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.email;
  };

  // Get initials for avatar
  const getInitials = (user: any) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
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
            style={styles.button}
          >
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#F5F7FA" }]}>
      <AppHeader
        title="Task Details"
        showBackButton={true}
        showHelpButton={true}
        onHelpPress={() => {
          navigation.navigate("Help" as never);
        }}
        showLogo={false}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Task Header Card with status background */}
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
                icon="flag"
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

        {/* Task Info Card */}
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
                    {format(new Date(task.created_at), "MMMM d, yyyy")}
                  </Text>
                </View>
              </View>

              <View style={styles.timelineItem}>
                <View
                  style={[styles.timelineDot, { backgroundColor: "#FF9800" }]}
                />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Due Date</Text>
                  <Text style={styles.timelineDate}>
                    {format(new Date(task.deadline), "MMMM d, yyyy")}
                  </Text>
                </View>
              </View>

              <View style={styles.timelineItem}>
                <View
                  style={[styles.timelineDot, { backgroundColor: "#2196F3" }]}
                />
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Reminder</Text>
                  <Text style={styles.timelineDate}>
                    {task.reminder_days_before} days before deadline
                  </Text>
                </View>
              </View>
            </View>

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>Assigned Users</Text>

            {assignedUsers.length > 0 ? (
              <View style={styles.assignedUsersContainer}>
                {assignedUsers.map((user) => (
                  <Surface key={user.id} style={styles.userSurface}>
                    <Avatar.Text
                      size={36}
                      label={getInitials(user)}
                      style={{ backgroundColor: theme.colors.primary }}
                    />
                    <Text style={styles.userName}>{renderUserName(user)}</Text>
                  </Surface>
                ))}
              </View>
            ) : (
              <View style={styles.emptyStateContainer}>
                <IconButton icon="account-off-outline" size={24} />
                <Text style={styles.emptyStateText}>No users assigned</Text>
              </View>
            )}
          </Card.Content>
        </Card>

        {/* Status Update Card */}
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Update Status</Text>

            <View style={styles.statusGrid}>
              <TouchableStatusButton
                status={TaskStatus.OPEN}
                currentStatus={task.status}
                icon="clipboard-outline"
                color="#FF9800"
                onPress={() => handleUpdateStatus(TaskStatus.OPEN)}
              />

              <TouchableStatusButton
                status={TaskStatus.IN_PROGRESS}
                currentStatus={task.status}
                icon="progress-clock"
                color="#2196F3"
                onPress={() => handleUpdateStatus(TaskStatus.IN_PROGRESS)}
              />

              <TouchableStatusButton
                status={TaskStatus.AWAITING_RESPONSE}
                currentStatus={task.status}
                icon="message-reply-outline"
                color="#9C27B0"
                onPress={() => handleUpdateStatus(TaskStatus.AWAITING_RESPONSE)}
              />

              <TouchableStatusButton
                status={TaskStatus.COMPLETED}
                currentStatus={task.status}
                icon="check-circle-outline"
                color="#4CAF50"
                onPress={() => handleUpdateStatus(TaskStatus.COMPLETED)}
              />

              <TouchableStatusButton
                status={TaskStatus.OVERDUE}
                currentStatus={task.status}
                icon="clock-alert-outline"
                color="#F44336"
                onPress={() => handleUpdateStatus(TaskStatus.OVERDUE)}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Comments Card */}
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.sectionHeaderContainer}>
              <Text style={styles.sectionTitle}>Comments</Text>
              <Chip icon="comment-outline">{comments.length}</Chip>
            </View>

            {comments.length > 0 ? (
              <View style={styles.commentsContainer}>
                {comments.map((comment) => (
                  <Surface key={comment.id} style={styles.commentBubble}>
                    <View style={styles.commentHeader}>
                      <View style={styles.commentUser}>
                        <Avatar.Text
                          size={32}
                          label={getUserRoleLabel(comment)
                            .charAt(0)
                            .toUpperCase()}
                          style={{
                            backgroundColor:
                              comment.sender_id === user?.id
                                ? theme.colors.primary
                                : "#757575",
                          }}
                        />
                        <Text style={styles.commentUserName}>
                          {getUserRoleLabel(comment)}
                        </Text>
                      </View>
                      <Text style={styles.commentDate}>
                        {format(new Date(comment.created_at), "MMM d, h:mm a")}
                      </Text>
                    </View>
                    <Text style={styles.commentText}>{comment.message}</Text>
                  </Surface>
                ))}
              </View>
            ) : (
              <View style={styles.emptyStateContainer}>
                <IconButton icon="comment-off-outline" size={24} />
                <Text style={styles.emptyStateText}>No comments yet</Text>
              </View>
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
                icon="send"
                loading={submittingComment}
                disabled={submittingComment || !newComment.trim()}
              >
                Send
              </Button>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={() => {
              // @ts-ignore - suppress type error for navigation
              navigation.navigate("EditTask", { taskId: task.id });
            }}
            style={styles.editButton}
            icon="pencil"
          >
            Edit Task
          </Button>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// TouchableStatusButton component for status updates
const TouchableStatusButton = ({
  status,
  currentStatus,
  icon,
  color,
  onPress,
}: {
  status: string;
  currentStatus: string;
  icon: string;
  color: string;
  onPress: () => void;
}) => {
  const isActive = status === currentStatus;
  return (
    <TouchableOpacity
      style={[
        styles.statusButton,
        {
          borderColor: color,
          backgroundColor: isActive ? `${color}20` : "transparent",
        },
      ]}
      onPress={onPress}
    >
      <IconButton
        icon={icon}
        iconColor={color}
        size={24}
        style={{ margin: 0 }}
      />
      <Text style={[styles.statusButtonText, { color }]}>
        {status.replace(/_/g, " ")}
      </Text>
    </TouchableOpacity>
  );
};

// TouchableOpacity for the StatusButton component
import { TouchableOpacity } from "react-native";

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
  statusContainer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 12,
  },
  taskTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  priorityContainer: {
    flexDirection: "row",
    marginBottom: 8,
  },
  priorityChip: {
    height: 36,
    borderWidth: 1,
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
  description: {
    fontSize: 16,
    lineHeight: 24,
    color: "#555",
    marginBottom: 8,
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
  assignedUsersContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  },
  userSurface: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderRadius: 12,
    margin: 4,
    elevation: 1,
  },
  userName: {
    marginLeft: 8,
    fontSize: 14,
    color: "#333",
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 8,
  },
  statusButton: {
    width: "48%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  statusButtonText: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  sectionHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  commentsContainer: {
    marginBottom: 16,
  },
  commentBubble: {
    padding: 12,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  commentUser: {
    flexDirection: "row",
    alignItems: "center",
  },
  commentUserName: {
    fontWeight: "600",
    marginLeft: 8,
    color: "#333",
  },
  commentDate: {
    fontSize: 12,
    color: "#666",
  },
  commentText: {
    fontSize: 15,
    lineHeight: 22,
    color: "#333",
  },
  emptyStateContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  emptyStateText: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  addCommentContainer: {
    marginTop: 8,
  },
  commentInput: {
    marginBottom: 12,
    backgroundColor: "white",
  },
  addCommentButton: {
    alignSelf: "flex-end",
    borderRadius: 12,
  },
  buttonContainer: {
    marginBottom: 24,
  },
  editButton: {
    borderRadius: 12,
    paddingVertical: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  detailLabel: {
    fontWeight: "500",
    width: 100,
    opacity: 0.7,
    fontSize: 14,
    color: "#666",
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: "#333",
  },
});

export default CompanyAdminTaskDetailsScreen;
