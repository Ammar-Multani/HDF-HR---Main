import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from "react-native";
import {
  Text,
  Card,
  Button,
  Divider,
  useTheme,
  Chip,
  TextInput,
  Surface,
  IconButton,
  Portal,
  Modal,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import StatusBadge from "../../components/StatusBadge";
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskComment,
  UserRole,
} from "../../types";
import { useTranslation } from "react-i18next";

type TaskDetailsRouteParams = {
  taskId: string;
};

interface CommentWithSender extends TaskComment {
  senderDetails?: {
    name: string;
    email: string;
    role: string;
  } | null;
}

// Define extended Task type with the properties needed for our UI
interface ExtendedTask extends Task {
  modified_by?: string;
  modified_at?: string;
  modifier_name?: string;
}

const SuperAdminTaskDetailsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<Record<string, TaskDetailsRouteParams>, string>>();
  const { taskId } = route.params;
  const { user } = useAuth();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [task, setTask] = useState<ExtendedTask | null>(null);
  const [comments, setComments] = useState<CommentWithSender[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [assignedUsers, setAssignedUsers] = useState<any[]>([]);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<TaskStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);

      // Fetch task details
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select("*, modified_by, updated_at")
        .eq("id", taskId)
        .single();

      if (taskError) {
        console.error("Error fetching task details:", taskError);
        return;
      }

      // First store basic task data
      setTask(taskData);

      // Fetch modifier user details if available
      if (taskData.modified_by) {
        try {
          // Check in company_user table
          const { data: userModifier } = await supabase
            .from("company_user")
            .select("id, first_name, last_name")
            .eq("id", taskData.modified_by)
            .single();

          if (userModifier) {
            setTask({
              ...taskData,
              modifier_name: `${userModifier.first_name} ${userModifier.last_name}`,
              modified_at: taskData.updated_at,
            });
          } else {
            // Check in admin table
            const { data: adminModifier } = await supabase
              .from("admin")
              .select("id, name")
              .eq("id", taskData.modified_by)
              .single();

            if (adminModifier) {
              setTask({
                ...taskData,
                modifier_name: adminModifier.name,
                modified_at: taskData.updated_at,
              });
            }
          }
        } catch (modifierError) {
          console.error("Error fetching modifier details:", modifierError);
        }
      }

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

      // Fetch assigned users using a separate query
      if (taskData.assigned_to) {
        // Handle both single user ID or array of user IDs
        let assignedUserIds: string[] = [];

        if (Array.isArray(taskData.assigned_to)) {
          assignedUserIds = taskData.assigned_to;
        } else if (typeof taskData.assigned_to === "string") {
          assignedUserIds = [taskData.assigned_to];
        }

        if (assignedUserIds.length > 0) {
          // First check in company_user table
          const { data: assignedCompanyUsers } = await supabase
            .from("company_user")
            .select("id, first_name, last_name, email, role")
            .in("id", assignedUserIds);

          // Then check in admin table
          const { data: assignedAdmins } = await supabase
            .from("admin")
            .select("id, name, email, role")
            .in("id", assignedUserIds);

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
  const getUserRoleLabel = (comment: CommentWithSender) => {
    if (comment.sender_id === user?.id) return t("superAdmin.tasks.you");

    if (comment.senderDetails) {
      if (comment.senderDetails.role === "superadmin")
        return t("superAdmin.tasks.superAdminWithName", {
          name: comment.senderDetails.name,
        });
      if (comment.senderDetails.role === "admin")
        return t("superAdmin.tasks.companyAdminWithName", {
          name: comment.senderDetails.name,
        });
      return comment.senderDetails.name;
    }

    // Check in assignedUsers array if sender details not attached to comment
    const assignedUser = assignedUsers.find((u) => u.id === comment.sender_id);
    if (assignedUser) {
      if (assignedUser.role === "SUPER_ADMIN")
        return t("superAdmin.tasks.superAdmin");
      if (assignedUser.role === "COMPANY_ADMIN")
        return t("superAdmin.tasks.companyAdmin");
      return t("superAdmin.tasks.user");
    }

    // Default fallback
    return t("superAdmin.tasks.user");
  };

  // Get color based on user role for comments
  const getCommentColorByRole = (comment: CommentWithSender) => {
    // If it's the current user
    if (comment.sender_id === user?.id) return theme.colors.primary;

    // Check sender details
    if (comment.senderDetails) {
      if (comment.senderDetails.role === "superadmin") return "#8E24AA"; // purple for super admin
      if (comment.senderDetails.role === "admin") return "#0288D1"; // blue for company admin
    }

    // Check in assignedUsers array
    const assignedUser = assignedUsers.find((u) => u.id === comment.sender_id);
    if (assignedUser) {
      if (assignedUser.role === "SUPER_ADMIN") return "#8E24AA"; // purple for super admin
      if (assignedUser.role === "COMPANY_ADMIN") return "#0288D1"; // blue for company admin
    }

    // Default for other users
    return "#689F38"; // green for regular users
  };

  // Get background color for comment bubble
  const getCommentBgColor = (comment: CommentWithSender) => {
    const baseColor = getCommentColorByRole(comment);
    // Return a lighter version of the color for the background
    return baseColor + "15"; // 15 is hex for low opacity
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTaskDetails();
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user) return;

    try {
      setSubmittingComment(true);

      // Create a comment object without explicitly accessing company_id
      const commentData: any = {
        task_id: taskId,
        sender_id: user.id,
        message: newComment.trim(),
      };

      // Only add company_id if it exists in the task
      if (task && "company_id" in task) {
        commentData.company_id = (task as any).company_id;
      }

      const { error } = await supabase
        .from("task_comments")
        .insert([commentData]);

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
      Alert.alert(
        t("common.error"),
        error.message || t("superAdmin.tasks.failedToAddComment")
      );
    } finally {
      setSubmittingComment(false);
    }
  };

  // Function to check if the super admin can edit this task
  const canEditTask = () => {
    // Check if current user is the one who created the task
    if (user && task && task.created_by === user.id) {
      return true;
    }
    return false;
  };

  // Function to check if user can update task status
  const canUpdateStatus = () => {
    // Allow task creator to update status
    if (canEditTask()) {
      return true;
    }

    // Allow assigned users to update status
    if (
      user &&
      task &&
      assignedUsers.some((assignedUser) => assignedUser.id === user.id)
    ) {
      return true;
    }

    return false;
  };

  const handleUpdateStatus = async (newStatus: TaskStatus) => {
    if (!task || !user) return;

    // Don't allow status updates if user is not the creator or assigned user
    if (!canUpdateStatus()) {
      Alert.alert(
        t("common.error"),
        t("superAdmin.tasks.onlyCreatorOrAssignedCanUpdateStatus"),
        [{ text: t("common.ok"), onPress: () => setStatusMenuVisible(false) }]
      );
      return;
    }

    try {
      setSubmitting(true);
      setSelectedStatus(newStatus);

      const updateData = {
        status: newStatus,
        modified_by: user.id,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", task.id);

      if (error) {
        throw error;
      }

      // Update local state
      setTask({
        ...task,
        status: newStatus,
        modified_by: user.id,
        modified_at: updateData.updated_at,
      });

      // Fetch the modifier name for display
      try {
        // Check company_user table
        const { data: userModifier } = await supabase
          .from("company_user")
          .select("first_name, last_name")
          .eq("id", user.id)
          .single();

        if (userModifier) {
          setTask((prevState) => ({
            ...prevState!,
            modifier_name: `${userModifier.first_name} ${userModifier.last_name}`,
          }));
        } else {
          // Check admin table
          const { data: adminModifier } = await supabase
            .from("admin")
            .select("name")
            .eq("id", user.id)
            .single();

          if (adminModifier) {
            setTask((prevState) => ({
              ...prevState!,
              modifier_name: adminModifier.name,
            }));
          }
        }
      } catch (modifierError) {
        console.error("Error fetching modifier name:", modifierError);
      }
    } catch (error: any) {
      console.error("Error updating task status:", error);
      Alert.alert(
        t("common.error"),
        error.message || t("superAdmin.tasks.failedToUpdateStatus")
      );
    } finally {
      setSubmitting(false);
      setStatusMenuVisible(false);
    }
  };

  // Function to get background color based on status
  const getStatusBackgroundColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return "#E8F5E9";
      case TaskStatus.OVERDUE:
        return "#FFEBEE";
      case TaskStatus.IN_PROGRESS:
        return "#FFF8E1";
      case TaskStatus.AWAITING_RESPONSE:
        return "#E3F2FD";
      case TaskStatus.OPEN:
        return "#F5F5F5";
      default:
        return "#F5F5F5";
    }
  };

  // Function to get text color based on status
  const getStatusTextColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return "#4CAF50";
      case TaskStatus.OVERDUE:
        return "#F44336";
      case TaskStatus.IN_PROGRESS:
        return "#FF9800";
      case TaskStatus.AWAITING_RESPONSE:
        return "#2196F3";
      case TaskStatus.OPEN:
        return "#757575";
      default:
        return "#757575";
    }
  };

  // Function to get icon based on status
  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return "check-circle";
      case TaskStatus.OVERDUE:
        return "close-circle";
      case TaskStatus.IN_PROGRESS:
        return "progress-clock";
      case TaskStatus.AWAITING_RESPONSE:
        return "chat-processing";
      case TaskStatus.OPEN:
        return "pencil";
      default:
        return "pencil";
    }
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
        return t("superAdmin.tasks.medium");
    }
  };

  const getTranslatedStatus = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.OPEN:
        return t("superAdmin.tasks.open");
      case TaskStatus.IN_PROGRESS:
        return t("superAdmin.tasks.inProgress");
      case TaskStatus.AWAITING_RESPONSE:
        return t("superAdmin.tasks.awaitingResponse");
      case TaskStatus.COMPLETED:
        return t("superAdmin.tasks.completed");
      case TaskStatus.OVERDUE:
        return t("superAdmin.tasks.overdue");
      default:
        return status;
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
        <AppHeader
          title={t("superAdmin.tasks.taskDetails")}
          showLogo={false}
          showTitle={true}
          showHelpButton={false}
          showBackButton={true}
        />
        <View style={styles.errorContainer}>
          <Text style={{ color: theme.colors.error }}>
            {t("superAdmin.tasks.taskNotFound")}
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={styles.button}
          >
            {t("superAdmin.companies.goBack")}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#F8F9FA" }]}>
      <AppHeader
        title={t("superAdmin.tasks.taskDetails")}
        subtitle={t("superAdmin.tasks.reviewTaskDetails")}
        showLogo={false}
        showTitle={true}
        showHelpButton={false}
        showBackButton={true}
      />

      <Portal>
        <Modal
          visible={statusMenuVisible}
          onDismiss={() => setStatusMenuVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalSurface}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t("superAdmin.tasks.updateStatus")}
              </Text>
              <IconButton
                icon="close"
                onPress={() => setStatusMenuVisible(false)}
              />
            </View>
            <Divider />

            <ScrollView style={styles.statusOptionsContainer}>
              {Object.values(TaskStatus).map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusOption,
                    task &&
                      task.status === status && {
                        backgroundColor: getStatusBackgroundColor(status),
                      },
                  ]}
                  onPress={() => {
                    handleUpdateStatus(status);
                  }}
                  disabled={submitting}
                >
                  <View style={styles.statusOptionContent}>
                    <View
                      style={[
                        styles.statusIconContainer,
                        { backgroundColor: getStatusBackgroundColor(status) },
                      ]}
                    >
                      <IconButton
                        icon={getStatusIcon(status)}
                        size={20}
                        iconColor={getStatusTextColor(status)}
                        style={{ margin: 0 }}
                      />
                    </View>
                    <View style={styles.statusTextContainer}>
                      <Text
                        style={[
                          styles.statusText,
                          { color: getStatusTextColor(status) },
                        ]}
                      >
                        {getTranslatedStatus(status)}
                      </Text>
                      <Text style={styles.statusDescription}>
                        {status === TaskStatus.COMPLETED &&
                          t("superAdmin.tasks.markAsCompleted")}
                        {status === TaskStatus.OVERDUE &&
                          t("superAdmin.tasks.markAsOverdue")}
                        {status === TaskStatus.IN_PROGRESS &&
                          t("superAdmin.tasks.markAsInProgress")}
                        {status === TaskStatus.AWAITING_RESPONSE &&
                          t("superAdmin.tasks.markAsAwaitingResponse")}
                        {status === TaskStatus.OPEN &&
                          t("superAdmin.tasks.markAsOpen")}
                      </Text>
                    </View>
                  </View>

                  {task && task.status === status && (
                    <IconButton
                      icon="check"
                      size={20}
                      iconColor={getStatusTextColor(status)}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Surface>
        </Modal>
      </Portal>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statusSection}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>
              {t("superAdmin.tasks.currentStatus")}:
            </Text>
            <TouchableOpacity
              onPress={() => setStatusMenuVisible(true)}
              disabled={submitting || !canUpdateStatus()}
              style={[
                styles.statusBadgeClickable,
                {
                  backgroundColor: getStatusBackgroundColor(task.status),
                  opacity: canUpdateStatus() ? 1 : 0.7,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: getStatusTextColor(task.status) },
                ]}
              >
                {getTranslatedStatus(task.status)}
              </Text>
              {canUpdateStatus() ? (
                <IconButton
                  icon={getStatusIcon(task.status)}
                  size={16}
                  style={styles.editStatusIcon}
                  iconColor={getStatusTextColor(task.status)}
                />
              ) : (
                <IconButton
                  icon="lock"
                  size={16}
                  style={styles.editStatusIcon}
                  iconColor={getStatusTextColor(task.status)}
                />
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Surface style={styles.detailsCard}>
          <View style={styles.cardHeader}>
            <View style={styles.simpleCardHeader}>
              <IconButton
                icon="clipboard-text"
                size={22}
                iconColor={theme.colors.primary}
              />
              <Text style={styles.simpleCardHeaderTitle}>{task.title}</Text>
            </View>
          </View>

          <View style={styles.cardContent}>
            <Chip
              icon="flag"
              style={[
                styles.priorityChip,
                {
                  backgroundColor: getPriorityColor(task.priority) + "20",
                  borderColor: getPriorityColor(task.priority),
                },
              ]}
              textStyle={{ color: getPriorityColor(task.priority) }}
            >
              {getTranslatedPriority(task.priority)}{" "}
              {t("superAdmin.tasks.priority")}
            </Chip>

            <Divider style={styles.sectionDivider} />

            <Text style={styles.sectionSubtitle}>
              {t("superAdmin.tasks.description")}
            </Text>
            <Text style={styles.description}>{task.description}</Text>

            <Divider style={styles.sectionDivider} />

            <Text style={styles.sectionSubtitle}>
              {t("superAdmin.tasks.details")}
            </Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                {t("superAdmin.tasks.deadline")}:
              </Text>
              <Text style={styles.detailValue}>
                {format(new Date(task.deadline), "MMMM d, yyyy")}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                {t("superAdmin.tasks.created")}:
              </Text>
              <Text style={styles.detailValue}>
                {format(new Date(task.created_at), "MMMM d, yyyy")}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                {t("superAdmin.tasks.reminder")}:
              </Text>
              <Text style={styles.detailValue}>
                {t("superAdmin.tasks.daysBeforeDeadline", {
                  days: task.reminder_days_before,
                })}
              </Text>
            </View>

            {task.modified_by && task.modified_at && (
              <>
                <Divider style={styles.sectionDivider} />

                <Text style={styles.sectionSubtitle}>
                  {t("superAdmin.tasks.lastModification")}
                </Text>

                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {t("superAdmin.tasks.modifiedAt")}:
                  </Text>
                  <Text style={styles.detailValue}>
                    {format(new Date(task.modified_at), "MMMM d, yyyy HH:mm")}
                  </Text>
                </View>

                {task.modifier_name && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>
                      {t("superAdmin.tasks.modifiedBy")}:
                    </Text>
                    <Text style={styles.detailValue}>{task.modifier_name}</Text>
                  </View>
                )}
              </>
            )}
          </View>
        </Surface>

        <Surface style={styles.detailsCard}>
          <View style={styles.cardHeader}>
            <View style={styles.simpleCardHeader}>
              <IconButton
                icon="account-group"
                size={22}
                iconColor={theme.colors.primary}
              />
              <Text style={styles.simpleCardHeaderTitle}>
                {t("superAdmin.tasks.assignedUsers")}
              </Text>
            </View>
          </View>

          <View style={styles.cardContent}>
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
              <Text style={styles.noUsersText}>
                {t("superAdmin.tasks.noUsersAssigned")}
              </Text>
            )}
          </View>
        </Surface>

        <Surface style={styles.detailsCard}>
          <View style={styles.cardHeader}>
            <View style={styles.simpleCardHeader}>
              <IconButton
                icon="comment-text-multiple"
                size={22}
                iconColor={theme.colors.primary}
              />
              <Text style={styles.simpleCardHeaderTitle}>
                {t("superAdmin.tasks.comments")}
              </Text>
            </View>
          </View>

          <View style={styles.cardContent}>
            {comments.length > 0 ? (
              comments.map((comment) => {
                const isCurrentUser = comment.sender_id === user?.id;
                const commentColor = getCommentColorByRole(comment);
                const commentBgColor = getCommentBgColor(comment);

                return (
                  <View
                    key={comment.id}
                    style={[
                      styles.commentContainer,
                      isCurrentUser
                        ? styles.currentUserComment
                        : styles.otherUserComment,
                    ]}
                  >
                    <View
                      style={[
                        styles.commentBubble,
                        {
                          backgroundColor: commentBgColor,
                          borderColor: commentColor + "30",
                        },
                      ]}
                    >
                      <View style={styles.commentHeader}>
                        <Text
                          style={[styles.commentUser, { color: commentColor }]}
                        >
                          {getUserRoleLabel(comment)}
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
                  </View>
                );
              })
            ) : (
              <Text style={styles.noCommentsText}>
                {t("superAdmin.tasks.noCommentsYet")}
              </Text>
            )}

            <View style={styles.addCommentContainer}>
              <TextInput
                label={t("superAdmin.tasks.addComment")}
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
                {t("superAdmin.tasks.addComment")}
              </Button>
            </View>
          </View>
        </Surface>

        <View style={styles.buttonContainer}>
          {canEditTask() && (
            <Button
              mode="contained"
              onPress={() => {
                // @ts-ignore - Navigation typing can be complex
                navigation.navigate("EditTask", { taskId: task.id });
              }}
              style={styles.button}
              icon="pencil"
            >
              {t("superAdmin.tasks.editTask")}
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
    backgroundColor: "#F8F9FA",
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
  },
  currentUserComment: {
    alignItems: "flex-end",
  },
  otherUserComment: {
    alignItems: "flex-start",
  },
  commentBubble: {
    maxWidth: "85%",
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: "rgba(0,0,0,0.1)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  commentUser: {
    fontWeight: "bold",
    fontSize: 14,
    marginRight: 8,
  },
  commentDate: {
    fontSize: 12,
    opacity: 0.7,
  },
  commentText: {
    fontSize: 15,
    lineHeight: 22,
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
  statusSection: {
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
  },
  statusLabel: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    marginRight: 8,
    color: "#616161",
  },
  statusBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  statusText: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    textTransform: "capitalize",
  },
  statusIcon: {
    margin: 0,
  },
  detailsCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "rgba(0,0,0,0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  cardHeader: {
    width: "100%",
  },
  simpleCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 5,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  simpleCardHeaderTitle: {
    fontSize: 17,
    fontFamily: "Poppins-SemiBold",
    color: "#424242",
  },
  cardContent: {
    padding: 20,
  },
  sectionDivider: {
    marginVertical: 16,
    backgroundColor: "#EEEEEE",
    height: 1,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    marginBottom: 8,
    color: "#424242",
  },
  modalContainer: {
    margin: 20,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  modalSurface: {
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "rgba(0,0,0,0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: "Poppins-SemiBold",
    color: "#424242",
  },
  statusOptionsContainer: {
    maxHeight: 400,
    padding: 12,
  },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    marginVertical: 6,
  },
  statusOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  statusIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusOptionText: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    textTransform: "capitalize",
  },
  statusDescription: {
    fontSize: 12,
    color: "#757575",
    fontFamily: "Poppins-Regular",
  },
  editStatusIcon: {
    margin: 0,
    marginLeft: 4,
  },
  statusBadgeClickable: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  disabledButton: {
    borderColor: "#8E24AA",
    borderWidth: 1,
  },
  creatorWarning: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#FFEBEE",
    borderRadius: 8,
    marginTop: 8,
  },
  creatorWarningText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#F44336",
    marginLeft: 8,
  },
});

export default SuperAdminTaskDetailsScreen;
