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
  Avatar,
  IconButton,
  Surface,
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
import Animated, { FadeIn } from "react-native-reanimated";

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
interface ExtendedTask extends Omit<Task, "created_by"> {
  created_by: string | undefined;
  modified_by?: string;
  modified_at?: string;
  modifier_name?: string;
  company_id?: string;
}

const CompanyAdminTaskDetailsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<Record<string, TaskDetailsRouteParams>, string>>();
  const { taskId } = route.params;
  const { user } = useAuth();
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
  const [isCreatedBySuperAdmin, setIsCreatedBySuperAdmin] = useState(false);
  const [isModifiedBySuperAdmin, setIsModifiedBySuperAdmin] = useState(false);
  const [creatorInfo, setCreatorInfo] = useState<string | null>(null);

  const fetchTaskDetails = async () => {
    try {
      console.log("=== Starting fetchTaskDetails ===");
      console.log("Fetching details for task:", taskId);
      setLoading(true);

      // Fetch task details
      const { data: taskData, error: taskError } = await supabase
        .from("tasks")
        .select("*, modified_by, updated_at, created_by")
        .eq("id", taskId)
        .single();

      console.log("Task data:", { taskData, taskError });

      if (taskError) {
        console.error("Error fetching task details:", taskError);
        return;
      }

      // First store basic task data
      setTask(taskData);

      // Check if the task was created by a super admin
      if (taskData.created_by) {
        try {
          console.log(
            "Checking if creator is super admin. Creator ID:",
            taskData.created_by
          );
          // Check if creator is a super admin
          const { data: creatorAdmin, error: creatorError } = await supabase
            .from("admin")
            .select("id, name, role")
            .eq("id", taskData.created_by)
            .maybeSingle();

          console.log("Creator admin check result:", {
            creatorAdmin,
            creatorError,
          });

          if (
            creatorAdmin &&
            (creatorAdmin.role === "SUPER_ADMIN" ||
              creatorAdmin.role === "superadmin")
          ) {
            console.log("Task was created by super admin:", creatorAdmin.name);
            setIsCreatedBySuperAdmin(true);
            setCreatorInfo(`Created by Super Admin: ${creatorAdmin.name}`);
          } else {
            console.log("Task was not created by a super admin");
            setIsCreatedBySuperAdmin(false);
          }
        } catch (creatorError) {
          console.error("Error fetching creator details:", creatorError);
        }
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
              .select("id, name, role")
              .eq("id", taskData.modified_by)
              .single();

            if (adminModifier) {
              setTask({
                ...taskData,
                modifier_name: adminModifier.name,
                modified_at: taskData.updated_at,
              });

              // Check if the modifier is a super admin
              if (adminModifier.role === "SUPER_ADMIN") {
                setIsModifiedBySuperAdmin(true);
              }
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
      console.error("Error in fetchTaskDetails:", error);
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
    if (comment.sender_id === user?.id) return "You";

    if (comment.senderDetails) {
      if (comment.senderDetails.role === "superadmin")
        return `${comment.senderDetails.name}`;
      if (comment.senderDetails.role === "admin")
        return `${comment.senderDetails.name}`;
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

      // Get the company admin's ID from company_user table
      const { data: companyUserData, error: companyUserError } = await supabase
        .from("company_user")
        .select("id")
        .eq("email", user.email)
        .eq("role", "admin")
        .eq("active_status", "active")
        .single();

      if (companyUserError || !companyUserData) {
        console.error("Error fetching company user data:", companyUserError);
        Alert.alert("Error", "Could not verify user credentials");
        return;
      }

      // Create comment with proper sender_id from company_user table
      const commentData = {
        task_id: taskId,
        sender_id: companyUserData.id,
        message: newComment.trim(),
        company_id: task?.company_id,
        created_at: new Date().toISOString(),
      };

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
      Alert.alert("Error", error.message || "Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  // Function to check if the company admin can edit this task
  const canEditTask = async () => {
    console.log("=== Starting canEditTask check ===");
    console.log("Current task state:", {
      taskId: task?.id,
      createdBy: task?.created_by,
      isCreatedBySuperAdmin,
    });

    if (!user || !task) {
      console.log("No user or task found, returning false");
      return false;
    }

    try {
      // First check if the creator exists in admin table (super admin)
      const { data: creatorAdmin, error: adminError } = await supabase
        .from("admin")
        .select("id, role, email")
        .eq("id", task.created_by)
        .maybeSingle();

      console.log("Creator admin query result:", { creatorAdmin, adminError });

      // If creator is found in admin table and is a super admin, return false
      if (creatorAdmin) {
        const isSuperAdmin =
          creatorAdmin.role === "SUPER_ADMIN" ||
          creatorAdmin.role === "superadmin";
        console.log("Creator admin role check:", {
          role: creatorAdmin.role,
          isSuperAdmin,
        });

        if (isSuperAdmin) {
          console.log("Task was created by super admin, editing not allowed");
          return false;
        }
      }

      // Get the company admin's ID from company_user table
      const { data: companyUserData, error: companyUserError } = await supabase
        .from("company_user")
        .select("id, role")
        .eq("email", user.email)
        .eq("role", "admin")
        .eq("active_status", "active")
        .single();

      console.log("Company user data:", { companyUserData, companyUserError });

      if (companyUserError || !companyUserData) {
        console.log("Error or no data found for company user");
        return false;
      }

      // For editing, only allow if user is the creator
      const isCreator = task.created_by === companyUserData.id;
      console.log("Permission check results:", {
        isCreator,
        currentUserId: companyUserData.id,
        taskCreator: task.created_by,
      });

      return isCreator;
    } catch (error) {
      console.error("Error in canEditTask:", error);
      return false;
    }
  };

  // Function to check if user can update task status
  const canUpdateStatus = async () => {
    console.log("=== Starting canUpdateStatus check ===");
    if (!user || !task) {
      console.log("No user or task found, returning false");
      return false;
    }

    try {
      // Get the current user's company_user record
      const { data: currentUser, error: userError } = await supabase
        .from("company_user")
        .select("id")
        .eq("email", user.email)
        .eq("active_status", "active")
        .single();

      if (userError || !currentUser) {
        console.log("Could not find active company user record");
        return false;
      }

      // Check if user is creator or assignee
      const isCreator = task.created_by === currentUser.id;
      const isAssignee = Array.isArray(task.assigned_to)
        ? task.assigned_to.includes(currentUser.id)
        : task.assigned_to === currentUser.id;

      console.log("Status update permission check:", {
        userId: currentUser.id,
        isCreator,
        isAssignee,
        assignedTo: task.assigned_to,
        createdBy: task.created_by,
      });

      // If user is assigned, they can update status regardless of who created it
      if (isAssignee) {
        return true;
      }

      // If user is creator but not assigned, check if they're not updating a super admin task
      if (isCreator) {
        const { data: creatorAdmin } = await supabase
          .from("admin")
          .select("id, role")
          .eq("id", task.created_by)
          .maybeSingle();

        if (
          creatorAdmin?.role === "SUPER_ADMIN" ||
          creatorAdmin?.role === "superadmin"
        ) {
          console.log(
            "Task created by super admin, creator cannot update status"
          );
          return false;
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error in canUpdateStatus:", error);
      return false;
    }
  };

  // Update the handleStatusPress to use canUpdateStatus
  const handleStatusPress = async () => {
    console.log("=== Status Press Handler ===");
    const canUpdate = await canUpdateStatus();
    console.log("Can update status?", canUpdate);

    if (canUpdate) {
      setStatusMenuVisible(true);
    } else {
      if (isCreatedBySuperAdmin && !task?.assigned_to) {
        Alert.alert(
          "Permission Denied",
          "This task is managed by Super Admins only."
        );
      } else {
        Alert.alert(
          "Permission Denied",
          "You can only update the status if you are assigned to this task."
        );
      }
    }
  };

  const handleUpdateStatus = async (newStatus: TaskStatus) => {
    console.log("=== Starting handleUpdateStatus ===");
    if (!task || !user) {
      console.log("No task or user found");
      return;
    }

    try {
      const canUpdate = await canUpdateStatus();
      console.log("Can update status check result:", canUpdate);

      if (!canUpdate) {
        if (isCreatedBySuperAdmin && !task.assigned_to) {
          Alert.alert(
            "Permission Denied",
            "This task is managed by Super Admins only."
          );
        } else {
          Alert.alert(
            "Permission Denied",
            "You can only update the status if you are assigned to this task."
          );
        }
        return;
      }

      // Get the company user's ID for the update
      const { data: companyUserData, error: companyUserError } = await supabase
        .from("company_user")
        .select("id")
        .eq("email", user.email)
        .eq("active_status", "active")
        .single();

      console.log("Company user data for update:", {
        companyUserData,
        companyUserError,
      });

      if (companyUserError || !companyUserData) {
        console.error("Error fetching company user data:", companyUserError);
        throw new Error("Could not verify user credentials");
      }

      setSubmitting(true);
      setSelectedStatus(newStatus);

      const updateData = {
        status: newStatus,
        modified_by: companyUserData.id,
        updated_at: new Date().toISOString(),
      };

      console.log("Attempting to update task with data:", {
        taskId: task.id,
        updateData,
      });

      const { error: updateError } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", task.id);

      if (updateError) {
        console.error("Error updating task status:", updateError);
        throw updateError;
      }

      console.log("Task status updated successfully");

      // Update local state
      setTask({
        ...task,
        status: newStatus,
        modified_by: companyUserData.id,
        modified_at: updateData.updated_at,
      });

      // Fetch the modifier name for display
      const { data: userModifier } = await supabase
        .from("company_user")
        .select("first_name, last_name")
        .eq("id", companyUserData.id)
        .single();

      if (userModifier) {
        setTask((prevState) => ({
          ...prevState!,
          modifier_name: `${userModifier.first_name} ${userModifier.last_name}`,
        }));
      }

      // Show success message
      Alert.alert("Success", "Task status has been updated successfully.", [
        { text: "OK" },
      ]);
    } catch (error: any) {
      console.error("Error in handleUpdateStatus:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to update task status. Please try again."
      );
    } finally {
      setSubmitting(false);
      setStatusMenuVisible(false);
    }
  };

  // Get background color based on status
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

  // Function to get icon based on status and permissions
  const getStatusIcon = (status: TaskStatus) => {
    // If it's a super admin task but the user is assigned, show edit icon
    if (isCreatedBySuperAdmin && task?.assigned_to) {
      return "pencil";
    }
    // If it's a super admin task and user is not assigned, show lock icon
    if (isCreatedBySuperAdmin) {
      return "shield-lock";
    }
    // Default status icons
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

  // Update the status badge UI
  const renderStatusBadge = () => {
    if (!task) return null;

    return (
      <TouchableOpacity
        onPress={handleStatusPress}
        disabled={submitting}
        style={[
          styles.statusBadgeClickable,
          {
            backgroundColor: getStatusBackgroundColor(task.status),
            opacity: submitting ? 0.7 : 1,
          },
        ]}
      >
        <Text
          style={[
            styles.statusText,
            { color: getStatusTextColor(task.status) },
          ]}
        >
          {task.status.replace(/_/g, " ")}
        </Text>
        <IconButton
          icon={getStatusIcon(task.status)}
          size={16}
          style={styles.editStatusIcon}
          iconColor={getStatusTextColor(task.status)}
        />
      </TouchableOpacity>
    );
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
    <SafeAreaView style={[styles.container, { backgroundColor: "#F8F9FA" }]}>
      <AppHeader
        title="Task Details"
        showBackButton={true}
        showHelpButton={true}
        onHelpPress={() => {
          navigation.navigate("Help" as never);
        }}
        showLogo={false}
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
              <Text style={styles.modalTitle}>Update Status</Text>
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
                        {status.replace(/_/g, " ")}
                      </Text>
                      <Text style={styles.statusDescription}>
                        {status === TaskStatus.COMPLETED && "Mark as completed"}
                        {status === TaskStatus.OVERDUE && "Mark as overdue"}
                        {status === TaskStatus.IN_PROGRESS &&
                          "Mark as in progress"}
                        {status === TaskStatus.AWAITING_RESPONSE &&
                          "Mark as awaiting response"}
                        {status === TaskStatus.OPEN && "Mark as open"}
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
          <Text style={styles.pageTitle}>{task?.title}</Text>
          <View style={styles.buttonContainer}>
            {task && (
              <Button
                mode={isCreatedBySuperAdmin ? "outlined" : "contained"}
                onPress={async () => {
                  const canEdit = await canEditTask();
                  if (canEdit) {
                    // @ts-ignore - suppress type error for navigation
                    navigation.navigate("EditTask", {
                      taskId: task.id,
                    });
                  } else {
                    if (isCreatedBySuperAdmin) {
                      Alert.alert(
                        "Permission Denied",
                        "Tasks created by Super Admins can only be edited by Super Admins."
                      );
                    } else {
                      Alert.alert(
                        "Permission Denied",
                        "You can only edit tasks that you created or are assigned to."
                      );
                    }
                  }
                }}
                style={[
                  styles.button,
                  isCreatedBySuperAdmin && styles.disabledButton,
                ]}
                icon={isCreatedBySuperAdmin ? "shield-lock" : "pencil"}
              >
                {isCreatedBySuperAdmin ? "Super Admin Task" : "Edit Task"}
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
                  <View style={styles.headerLeft}>
                    <View style={styles.iconContainer}>
                      <IconButton
                        icon="clipboard-text"
                        size={20}
                        iconColor="#64748b"
                        style={styles.headerIcon}
                      />
                    </View>
                    <Text style={styles.cardTitle}>Task Details</Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.statusSection}>
                    <View style={styles.statusRow}>
                      <Text style={styles.statusLabel}>Current Status:</Text>
                      <TouchableOpacity
                        onPress={handleStatusPress}
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
                          {task?.status.replace(/_/g, " ")}
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

                  {task && (
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
                      {task.priority.charAt(0).toUpperCase() +
                        task.priority.slice(1)}{" "}
                      Priority
                    </Chip>
                  )}

                  <Divider style={styles.sectionDivider} />

                  <Text style={styles.sectionSubtitle}>Description</Text>
                  <Text style={styles.description}>{task?.description}</Text>

                  <Divider style={styles.sectionDivider} />

                  <Text style={styles.sectionSubtitle}>Details</Text>

                  {task && (
                    <>
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
                          {task.reminder_days_before} days before deadline
                        </Text>
                      </View>

                      {task.modified_by && task.modified_at && (
                        <>
                          <Divider style={styles.sectionDivider} />

                          <Text style={styles.sectionSubtitle}>
                            Last Modification
                          </Text>

                          <View style={styles.detailRow}>
                            <Text style={styles.detailLabel}>Modified at:</Text>
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
                                Modified by:
                              </Text>
                              <Text style={styles.detailValue}>
                                {task.modifier_name}
                              </Text>
                            </View>
                          )}
                        </>
                      )}
                    </>
                  )}
                </View>
              </Surface>

              {/* Assigned Users Card */}
              <Surface style={[styles.detailsCard, { marginTop: 24 }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <View style={styles.iconContainer}>
                      <IconButton
                        icon="account-group"
                        size={20}
                        iconColor="#64748b"
                        style={styles.headerIcon}
                      />
                    </View>
                    <Text style={styles.cardTitle}>Assigned Users</Text>
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
                    <Text style={styles.noUsersText}>No users assigned</Text>
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
                    <Text style={styles.cardTitle}>Comments</Text>
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
    borderColor: "rgba(0,0,0,0.03)",
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
    borderRadius: 12,
    borderWidth: 1,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  commentUser: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
  },
  commentDate: {
    fontSize: 12,
    color: "#64748b",
    marginLeft: 8,
    fontFamily: "Poppins-Regular",
  },
  commentText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#334155",
    fontFamily: "Poppins-Regular",
  },
  noCommentsText: {
    color: "#64748b",
    fontStyle: "italic",
    marginBottom: 16,
    fontFamily: "Poppins-Regular",
  },
  addCommentContainer: {
    marginTop: 24,
  },
  commentInput: {
    marginBottom: 16,
    backgroundColor: "#ffffff",
  },
  addCommentButton: {
    alignSelf: "flex-end",
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
  disabledButton: {
    borderColor: "#8E24AA",
    borderWidth: 1,
  },
});

export default CompanyAdminTaskDetailsScreen;
