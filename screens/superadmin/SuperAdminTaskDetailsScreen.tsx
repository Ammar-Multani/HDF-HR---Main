import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Platform,
  Dimensions,
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
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
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
import Animated, { FadeIn } from "react-native-reanimated";

type RootStackParamList = {
  EditTask: { taskId: string; returnToDetails: boolean };
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Helper function to convert hex to rgb
const hexToRgb = (hex: string): string => {
  // Remove the hash if it exists
  hex = hex.replace("#", "");

  // Parse the hex values
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Return the RGB values as a string
  return `${r}, ${g}, ${b}`;
};

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
interface Company {
  id: string;
  company_name: string;
  active?: boolean;
}

interface ExtendedTask extends Omit<Task, "created_by" | "updated_at"> {
  created_by?: string;
  updated_at?: string;
  modified_by?: string;
  modified_at?: string;
  modifier_name?: string;
  company_id?: string;
  company?: Company;
}

// Add window dimensions hook
const useWindowDimensions = () => {
  const [dimensions, setDimensions] = useState({
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  });

  useEffect(() => {
    if (Platform.OS === "web") {
      const handleResize = () => {
        setDimensions({
          width: Dimensions.get("window").width,
          height: Dimensions.get("window").height,
        });
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  return dimensions;
};

const SuperAdminTaskDetailsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const route =
    useRoute<RouteProp<Record<string, TaskDetailsRouteParams>, string>>();
  const { taskId } = route.params;
  const { user } = useAuth();
  const { t } = useTranslation();
  const dimensions = useWindowDimensions();

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

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
  const [companies, setCompanies] = useState<Company[]>([]);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);

      // Fetch task details with company information
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select(
          "*, modified_by, updated_at, company:company_id(id, company_name)"
        )
        .eq("id", taskId)
        .single();

      if (taskError) {
        console.error("Error fetching task details:", taskError);
        return;
      }

      // First store basic task data
      setTask(taskData);

      // Fetch companies for reference
      const { data: companiesData } = await supabase
        .from("company")
        .select("id, company_name")
        .eq("active", true);

      if (companiesData) {
        setCompanies(companiesData);
      }

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
    if (comment.sender_id === user?.id) return "#1976D2"; // Bright blue for current user

    // Check sender details
    if (comment.senderDetails) {
      if (comment.senderDetails.role === "superadmin") return "#6200EA"; // Deep purple for super admin
      if (comment.senderDetails.role === "admin") return "#00838F"; // Teal for company admin
    }

    // Check in assignedUsers array
    const assignedUser = assignedUsers.find((u) => u.id === comment.sender_id);
    if (assignedUser) {
      if (assignedUser.role === "SUPER_ADMIN") return "#6200EA"; // Deep purple for super admin
      if (assignedUser.role === "COMPANY_ADMIN") return "#00838F"; // Teal for company admin
    }

    // Default for other users
    return "#2E7D32"; // Dark green for regular users
  };

  // Get background color for comment bubble
  const getCommentBgColor = (comment: CommentWithSender) => {
    const baseColor = getCommentColorByRole(comment);
    return `${baseColor}10`; // Very light opacity for better contrast
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTaskDetails();
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user || !task) return;

    try {
      setSubmittingComment(true);

      // First fetch the admin's details
      const { data: adminData, error: adminError } = await supabase
        .from("admin")
        .select("name, email")
        .eq("id", user.id)
        .single();

      if (adminError) {
        console.error("Error fetching admin details:", adminError);
        throw adminError;
      }

      const commentData = {
        task_id: taskId,
        sender_id: user.id,
        message: newComment.trim(),
        company_id: task.company_id,
      };

      const { error } = await supabase
        .from("task_comments")
        .insert([commentData]);

      if (error) {
        throw error;
      }

      // Log the activity with proper admin name
      const activityLogData = {
        user_id: user.id,
        activity_type: "ADD_COMMENT",
        description: `New comment added by ${adminData.name} on task "${task.title}"`,
        company_id: task.company_id,
        metadata: {
          task_id: taskId,
          task_title: task.title,
          comment: newComment.trim(),
          added_by: {
            name: adminData.name,
            email: adminData.email,
          },
        },
        old_value: null,
        new_value: {
          id: taskId,
          comment: newComment.trim(),
          added_at: new Date().toISOString(),
        },
      };

      const { error: logError } = await supabase
        .from("activity_logs")
        .insert([activityLogData]);

      if (logError) {
        console.error("Error logging activity:", logError);
        throw logError;
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

      // Get user's complete details from appropriate table
      let userDisplayName = user.email;
      let userRole = "user";

      // Check admin table first
      const { data: adminData, error: adminError } = await supabase
        .from("admin")
        .select("id, name, email, role")
        .eq("id", user.id)
        .single();

      if (adminData) {
        userDisplayName = adminData.name;
        userRole = adminData.role;
      } else {
        // Check company_user table
        const { data: userData, error: userError } = await supabase
          .from("company_user")
          .select("id, first_name, last_name, email, role")
          .eq("id", user.id)
          .single();

        if (userData) {
          userDisplayName = `${userData.first_name} ${userData.last_name}`;
          userRole = userData.role;
        }
      }

      // Get assigned user's complete details
      const assignedUserDetails =
        assignedUsers.length > 0 ? assignedUsers[0] : null;

      // Update task
      const updateData = {
        status: newStatus,
        modified_by: user.id,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", task.id);

      if (updateError) {
        throw updateError;
      }

      // Log the activity with the correct structure
      const activityLogData = {
        user_id: user.id,
        activity_type: "UPDATE_TASK_STATUS",
        description: `Task status updated from ${task.status} to ${newStatus} by ${userDisplayName} (${user.email})`,
        company_id: task.company_id,
        metadata: {
          status: newStatus,
          task_id: task.id,
          task_title: task.title,
          priority: task.priority,
          company: task.company
            ? {
                id: task.company.id,
                name: task.company.company_name,
              }
            : null,
          created_by: {
            id: user.id,
            name: userDisplayName,
            email: user.email,
            role: userRole,
          },
          assigned_to: assignedUserDetails
            ? {
                id: assignedUserDetails.id,
                name: `${assignedUserDetails.first_name} ${assignedUserDetails.last_name}`,
                email: assignedUserDetails.email,
                role: assignedUserDetails.role,
              }
            : null,
        },
        old_value: {
          id: task.id,
          title: task.title,
          status: task.status,
          deadline: task.deadline,
          priority: task.priority,
          company_id: task.company_id,
          updated_at: task.updated_at || task.created_at,
          modified_by: task.modified_by
            ? {
                id: task.modified_by,
                name: task.modifier_name || "Unknown",
                email: user.email, // We might want to fetch the previous modifier's email
                role: userRole, // We might want to fetch the previous modifier's role
              }
            : null,
          assigned_to: task.assigned_to,
          description: task.description,
        },
        new_value: {
          id: task.id,
          title: task.title,
          status: newStatus,
          deadline: task.deadline,
          priority: task.priority,
          company_id: task.company_id,
          updated_at: updateData.updated_at,
          modified_by: {
            id: user.id,
            name: userDisplayName,
            email: user.email,
            role: userRole,
          },
          assigned_to: assignedUserDetails?.id || null,
          description: task.description,
        },
      };

      const { error: logError } = await supabase
        .from("activity_logs")
        .insert([activityLogData]);

      if (logError) {
        console.error("Error logging activity:", logError);
        throw logError;
      }

      // Update local state
      setTask({
        ...task,
        status: newStatus,
        modified_by: user.id,
        modified_at: updateData.updated_at,
        modifier_name: userDisplayName,
      });

      setStatusMenuVisible(false);
      setSubmitting(false);
    } catch (error: any) {
      console.error("Error updating task status:", error);
      Alert.alert(
        t("common.error"),
        error.message || t("superAdmin.tasks.failedToUpdateStatus")
      );
      setSubmitting(false);
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
        return {
          solid: theme.colors.error,
          transparent: "rgba(244, 67, 54, 0.12)", // Light red
        };
      case TaskPriority.MEDIUM:
        return {
          solid: "#F59E0B",
          transparent: "rgba(245, 158, 11, 0.12)", // Light orange
        };
      case TaskPriority.LOW:
        return {
          solid: theme.colors.primary,
          transparent: "rgba(25, 118, 210, 0.12)", // Light blue
        };
      default:
        return {
          solid: theme.colors.primary,
          transparent: "rgba(25, 118, 210, 0.12)", // Light blue
        };
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

  // Add this new function after renderUserName
  const getUserRoleBadgeColor = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
      case "superadmin":
        return {
          background: "#F3E5F5",
          text: "#6200EA",
          border: "#E1BEE7",
        };
      case "COMPANY_ADMIN":
      case "admin":
        return {
          background: "#E0F7FA",
          text: "#00838F",
          border: "#B2EBF2",
        };
      default:
        return {
          background: "#E8F5E9",
          text: "#2E7D32",
          border: "#C8E6C9",
        };
    }
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
          showLogo={true}
          showTitle={true}
          showHelpButton={true}
          showBackButton={true}
          absolute={false}
        />
        <View style={styles.errorContainer}>
          <Text style={{ color: theme.colors.error }}>
            {t("superAdmin.tasks.taskNotFound")}
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={styles.button}
            buttonColor={theme.colors.primary}
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
        showHelpButton={true}
        showBackButton={true}
        absolute={false}
      />

      <Portal>
        <Modal
          visible={statusMenuVisible}
          onDismiss={() => setStatusMenuVisible(false)}
          contentContainerStyle={[
            styles.modalContainer,
            {
              width: isLargeScreen ? 480 : isMediumScreen ? 420 : "90%",
              alignSelf: "center",
            },
          ]}
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

            <ScrollView style={{ maxHeight: 400 }}>
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
        contentContainerStyle={[
          styles.scrollContent,
          {
            maxWidth: isLargeScreen ? 1400 : isMediumScreen ? 1100 : "100%",
            paddingHorizontal: isLargeScreen ? 48 : isMediumScreen ? 32 : 16,
          },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.headerSection}>
          <Text style={styles.pageTitle}>{task.title}</Text>
          <View style={styles.buttonContainer}>
            {canEditTask() && (
              <Button
                mode="contained"
                onPress={() => {
                  navigation.navigate("EditTask", {
                    taskId: task.id,
                    returnToDetails: true,
                  });
                }}
                style={styles.button}
                icon="pencil"
                buttonColor={theme.colors.primary}
              >
                {t("superAdmin.tasks.editTask")}
              </Button>
            )}
          </View>
        </View>

        <View style={styles.gridContainer}>
          <View style={styles.gridColumn}>
            <Animated.View entering={FadeIn.delay(100)}>
              {/* Task Details Card */}
              <Surface style={styles.detailsCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.simpleCardHeader}>
                    <IconButton
                      icon="clipboard-text"
                      size={22}
                      iconColor={theme.colors.primary}
                    />
                    <Text style={styles.simpleCardHeaderTitle}>
                      {task.title}
                    </Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.statusSection}>
                    <View style={styles.statusRow}>
                      <Text style={styles.statusLabel}>
                        {t("superAdmin.tasks.currentStatus")}:
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          if (canUpdateStatus()) {
                            setStatusMenuVisible(true);
                          } else {
                            Alert.alert(
                              t("common.error"),
                              t(
                                "superAdmin.tasks.onlyCreatorOrAssignedCanUpdateStatus"
                              )
                            );
                          }
                        }}
                        disabled={submitting}
                        style={[
                          styles.statusBadgeClickable,
                          {
                            backgroundColor: getStatusBackgroundColor(
                              task?.status || TaskStatus.OPEN
                            ),
                            opacity: submitting ? 0.7 : 1,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusText,
                            {
                              color: getStatusTextColor(
                                task?.status || TaskStatus.OPEN
                              ),
                            },
                          ]}
                        >
                          {getTranslatedStatus(task?.status || TaskStatus.OPEN)}
                        </Text>
                        <IconButton
                          icon={getStatusIcon(task?.status || TaskStatus.OPEN)}
                          size={16}
                          style={styles.editStatusIcon}
                          iconColor={getStatusTextColor(
                            task?.status || TaskStatus.OPEN
                          )}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.taskMetaContainer}>
                    <Chip
                      icon="flag"
                      style={[
                        styles.priorityChip,
                        {
                          backgroundColor: getPriorityColor(task.priority)
                            .transparent,
                          borderColor: getPriorityColor(task.priority).solid,
                        },
                      ]}
                      textStyle={{
                        color: getPriorityColor(task.priority).solid,
                      }}
                    >
                      {getTranslatedPriority(task.priority)}{" "}
                      {t("superAdmin.tasks.priority")}
                    </Chip>

                    {task.company_id && (
                      <Chip
                        icon="office-building"
                        style={[
                          styles.companyChip,
                          {
                            backgroundColor: "#F1F5F9",
                          },
                        ]}
                        mode="flat"
                      >
                        {companies.find((c) => c.id === task.company_id)
                          ?.company_name ||
                          t("superAdmin.tasks.companyNotFound")}
                      </Chip>
                    )}
                  </View>

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
                          {format(
                            new Date(task.modified_at),
                            "MMMM d, yyyy HH:mm"
                          )}
                        </Text>
                      </View>

                      {task.modifier_name && (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailLabel}>
                            {t("superAdmin.tasks.modifiedBy")}:
                          </Text>
                          <Text style={styles.detailValue}>
                            {task.modifier_name}
                          </Text>
                        </View>
                      )}
                    </>
                  )}
                </View>
              </Surface>

              {/* Assigned Users Card */}
              <Surface style={[styles.detailsCard, { marginTop: 24 }]}>
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
                    <View style={styles.assignedUsersGrid}>
                      {assignedUsers.map((user) => {
                        const roleColors = getUserRoleBadgeColor(user.role);
                        return (
                          <Surface key={user.id} style={styles.userCard}>
                            <Text style={styles.userName}>
                              {user.first_name} {user.last_name}
                            </Text>
                            <Text style={styles.userEmail}>{user.email}</Text>

                            {user.company_name && (
                              <View style={styles.userCompanyContainer}>
                                <IconButton
                                  icon="office-building"
                                  size={16}
                                  iconColor="#64748B"
                                  style={styles.companyIcon}
                                />
                                <Text style={styles.userCompany}>
                                  {user.company_name}
                                </Text>
                              </View>
                            )}
                          </Surface>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={styles.noUsersText}>
                      {t("superAdmin.tasks.noUsersAssigned")}
                    </Text>
                  )}
                </View>
              </Surface>
            </Animated.View>
          </View>

          <View style={styles.gridColumn}>
            <Animated.View entering={FadeIn.delay(200)}>
              {/* Comments Card */}
              <Surface style={styles.detailsCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <View style={styles.iconContainer}>
                      <IconButton
                        icon="comment-text-multiple"
                        size={20}
                        iconColor="#64748b"
                        style={styles.headerIcon}
                      />
                    </View>
                    <Text style={styles.cardTitle}>
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
                                style={[
                                  styles.commentUser,
                                  { color: commentColor },
                                ]}
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
                            <Text style={styles.commentText}>
                              {comment.message}
                            </Text>
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
                      buttonColor={theme.colors.primary}
                    >
                      {t("superAdmin.tasks.addComment")}
                    </Button>
                  </View>
                </View>
              </Surface>
            </Animated.View>
          </View>
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
    paddingVertical: 32,
    alignSelf: "center",
    width: "100%",
  },
  headerSection: {
    marginBottom: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pageTitle: {
    fontSize: Platform.OS === "web" ? 32 : 24,
    fontWeight: "600",
    color: "#1e293b",
    fontFamily: "Poppins-SemiBold",
  },
  gridContainer: {
    flexDirection: "row",
    gap: 24,
    flexWrap: "wrap",
  },
  gridColumn: {
    flex: 1,
    minWidth: 320,
    gap: 24,
  },
  detailsCard: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "rgba(0,0,0,0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerIcon: {
    margin: 0,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    fontFamily: "Poppins-SemiBold",
  },
  cardContent: {
    padding: 24,
  },
  statusSection: {
    marginBottom: 20,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    marginRight: 8,
    color: "#64748b",
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
  statusText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    textTransform: "capitalize",
  },
  editStatusIcon: {
    margin: 0,
    marginLeft: 4,
  },
  priorityChip: {
    alignSelf: "flex-start",
    marginTop: 16,
    height: 32,
    minWidth: 120,
    paddingHorizontal: 12,
  },
  sectionDivider: {
    marginVertical: 24,
    backgroundColor: "#e2e8f0",
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#64748b",
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 24,
    color: "#334155",
    fontFamily: "Poppins-Regular",
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  detailLabel: {
    width: 120,
    fontSize: 14,
    color: "#64748b",
    fontFamily: "Poppins-Medium",
  },
  detailValue: {
    flex: 1,
    fontSize: 14,
    color: "#334155",
    fontFamily: "Poppins-Regular",
  },
  usersContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  userChip: {
    backgroundColor: "#f8fafc",
  },
  noUsersText: {
    color: "#64748b",
    fontStyle: "italic",
    fontFamily: "Poppins-Regular",
  },
  commentContainer: {
    marginBottom: 20,
    maxWidth: "100%",
  },
  currentUserComment: {
    alignItems: "flex-end",
  },
  otherUserComment: {
    alignItems: "flex-start",
  },
  commentBubble: {
    maxWidth: "85%",
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "rgba(0,0,0,0.08)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  commentUser: {
    fontWeight: "600",
    fontSize: 14,
    marginRight: 8,
    fontFamily: "Poppins-SemiBold",
  },
  commentDate: {
    fontSize: 12,
    opacity: 0.6,
    fontFamily: "Poppins-Regular",
    color: "#64748B",
  },
  commentText: {
    fontSize: 15,
    lineHeight: 24,
    color: "#334155",
    fontFamily: "Poppins-Regular",
  },
  noCommentsText: {
    fontStyle: "italic",
    opacity: 0.7,
    marginBottom: 16,
    color: "#64748B",
    fontFamily: "Poppins-Regular",
    textAlign: "center",
    paddingVertical: 20,
  },
  addCommentContainer: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 20,
  },
  commentInput: {
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  addCommentButton: {
    alignSelf: "flex-end",
    borderRadius: 8,
    paddingHorizontal: 20,
  },
  buttonContainer: {
    marginTop: 32,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  button: {
    minWidth: 120,
    padding: 5,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContainer: {
    margin: 0,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  modalSurface: {
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  modalTitle: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1e293b",
  },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    marginVertical: 4,
  },
  statusOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  statusIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusDescription: {
    fontSize: 12,
    color: "#64748b",
    fontFamily: "Poppins-Regular",
    marginTop: 2,
  },
  taskMetaContainer: {
    flexDirection: "column",
    flexWrap: "nowrap",
    gap: 14,
  },
  companyChip: {
    alignSelf: "flex-start",
    height: 32,
    minWidth: 120,
    paddingHorizontal: 12,
  },
  assignedUsersGrid: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
    width: "100%",
    alignItems: "flex-start",
    justifyContent: "flex-start",
  },
  userCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    elevation: 1,
    shadowColor: "rgba(0,0,0,0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  userCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  roleText: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
  },
  userName: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1E293B",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#64748B",
    marginBottom: 8,
  },
  userCompanyContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  companyIcon: {
    margin: 0,
    marginRight: 4,
  },
  userCompany: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#64748B",
  },
  simpleCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  simpleCardHeaderTitle: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#1E293B",
  },
});

export default SuperAdminTaskDetailsScreen;
