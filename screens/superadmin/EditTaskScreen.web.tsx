import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Chip,
  SegmentedButtons,
  Snackbar,
  Menu,
  IconButton,
  Surface,
  Portal,
  Modal,
  Divider,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useForm, Controller } from "react-hook-form";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import { TaskPriority, UserRole, TaskStatus } from "../../types";
import { useTranslation } from "react-i18next";
import Animated, { FadeIn } from "react-native-reanimated";
import CustomSnackbar from "../../components/CustomSnackbar";

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

type EditTaskRouteParams = {
  taskId: string;
};

interface TaskFormData {
  title: string;
  description: string;
  deadline: Date;
  priority: TaskPriority;
  reminder_days_before: string;
  status: TaskStatus;
}

const EditTaskScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<Record<string, EditTaskRouteParams>, string>>();
  const { taskId } = route.params;
  const { user } = useAuth();
  const { t } = useTranslation();
  const dimensions = useWindowDimensions();

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [originalTask, setOriginalTask] = useState<any>(null);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [permissionErrorMessage, setPermissionErrorMessage] = useState<
    string | null
  >(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<TaskFormData>({
    defaultValues: {
      title: "",
      description: "",
      deadline: new Date(),
      priority: TaskPriority.MEDIUM,
      reminder_days_before: "1",
      status: TaskStatus.OPEN,
    },
  });

  const deadline = watch("deadline");

  // Check if the user can edit this task
  const checkEditPermission = async (taskData: any) => {
    if (!user) {
      setCanEdit(false);
      setPermissionErrorMessage(t("superAdmin.tasks.userNotAuthenticated"));
      return false;
    }

    // All authenticated users can edit all tasks now
    setCanEdit(true);
    return true;
  };

  // Fetch task details
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
        Alert.alert(t("common.error"), t("superAdmin.tasks.taskNotFound"));
        navigation.goBack();
        return;
      }

      setOriginalTask(taskData);

      // Check if user can edit this task
      const hasPermission = await checkEditPermission(taskData);

      // Set form values regardless of permission
      reset({
        title: taskData.title,
        description: taskData.description,
        deadline: new Date(taskData.deadline),
        priority: taskData.priority,
        reminder_days_before: taskData.reminder_days_before.toString(),
        status: taskData.status,
      });

      // Handle assigned users
      if (taskData.assigned_to) {
        let assignedUserIds: string[] = [];

        try {
          // If it's a JSON string, parse it
          if (typeof taskData.assigned_to === "string") {
            assignedUserIds = JSON.parse(taskData.assigned_to);
          }
          // Handle legacy data where it might be a string UUID or array
          else if (Array.isArray(taskData.assigned_to)) {
            assignedUserIds = taskData.assigned_to;
          } else {
            assignedUserIds = [taskData.assigned_to];
          }
        } catch (e) {
          // If JSON parse fails, it might be a single UUID
          if (typeof taskData.assigned_to === "string") {
            assignedUserIds = [taskData.assigned_to];
          }
        }

        setSelectedAssignees(assignedUserIds);
      }

      // Set selected company
      if (taskData.company_id) {
        const { data: companyData } = await supabase
          .from("company")
          .select("id, company_name")
          .eq("id", taskData.company_id)
          .single();

        if (companyData) {
          setSelectedCompany(companyData);
        }
      }
    } catch (error) {
      console.error("Error fetching task details:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const { data, error } = await supabase
        .from("company")
        .select("id, company_name, active")
        .eq("active", true);

      if (error) {
        console.error("Error fetching companies:", error);
        return;
      }

      setCompanies(data || []);
    } catch (error) {
      console.error("Error fetching companies:", error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);

      // Fetch only company admins (not employees)
      const { data: companyAdmins, error: companyAdminsError } = await supabase
        .from("company_user")
        .select("id, first_name, last_name, email, role, company_id")
        .eq("role", UserRole.COMPANY_ADMIN)
        .eq("active_status", "active");

      const { data: superAdmins, error: superAdminsError } = await supabase
        .from("admin")
        .select("id, name, email, role")
        .eq("role", UserRole.SUPER_ADMIN)
        .eq("status", true);

      if (companyAdminsError || superAdminsError) {
        console.error("Error fetching users:", {
          companyAdminsError,
          superAdminsError,
        });
        return;
      }

      // Combine and format users
      const formattedCompanyAdmins = (companyAdmins || []).map((admin) => ({
        id: admin.id,
        name:
          admin.first_name && admin.last_name
            ? `${admin.first_name} ${admin.last_name}`
            : admin.email,
        email: admin.email,
        role: admin.role,
        company_id: admin.company_id,
      }));

      const formattedSuperAdmins = (superAdmins || []).map((admin) => ({
        id: admin.id,
        name: admin.name || admin.email,
        email: admin.email,
        role: admin.role,
      }));

      // Store all users first, we'll filter them when a company is selected
      const allUsersCombined = [
        ...formattedCompanyAdmins,
        ...formattedSuperAdmins,
      ];
      setAllUsers(allUsersCombined);
      setAvailableUsers(allUsersCombined);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Filter users based on selected company
  useEffect(() => {
    if (selectedCompany) {
      // Filter users who belong to the selected company or super admins
      const filteredUsers = allUsers.filter(
        (user) =>
          user.role === UserRole.SUPER_ADMIN ||
          user.company_id === selectedCompany.id
      );

      setAvailableUsers(filteredUsers);
    } else {
      // If no company selected, show all users
      setAvailableUsers(allUsers);
    }
  }, [selectedCompany, allUsers]);

  useEffect(() => {
    fetchTaskDetails();
    fetchUsers();
    fetchCompanies();
  }, [taskId]);

  const toggleAssignee = (userId: string) => {
    // Instead of adding/removing from the array, just set the selected assignee to this one
    setSelectedAssignees([userId]);
  };

  const onSubmit = async (data: TaskFormData) => {
    try {
      if (!user) {
        setSnackbarMessage(t("superAdmin.tasks.userNotAuthenticated"));
        setSnackbarVisible(true);
        return;
      }

      if (!canEdit) {
        setSnackbarMessage(t("superAdmin.tasks.noPermissionToEdit"));
        setSnackbarVisible(true);
        return;
      }

      if (selectedAssignees.length === 0) {
        setSnackbarMessage(t("superAdmin.tasks.assignToAtLeastOneUser"));
        setSnackbarVisible(true);
        return;
      }

      if (!selectedCompany) {
        setSnackbarMessage(t("superAdmin.tasks.selectCompany"));
        setSnackbarVisible(true);
        return;
      }

      setSubmitting(true);

      const reminderDays = parseInt(data.reminder_days_before);
      if (isNaN(reminderDays) || reminderDays < 0 || reminderDays > 365) {
        setSnackbarMessage(t("superAdmin.tasks.invalidReminderDays"));
        setSnackbarVisible(true);
        setSubmitting(false);
        return;
      }

      // Update task with a single UUID for assigned_to
      const taskData = {
        title: data.title,
        description: data.description,
        deadline: data.deadline.toISOString(),
        priority: data.priority,
        status: data.status,
        assigned_to: selectedAssignees.length > 0 ? selectedAssignees[0] : null, // Only use the first assignee's UUID
        modified_by: user.id,
        updated_at: new Date().toISOString(),
        reminder_days_before: reminderDays,
        company_id: selectedCompany.id,
      };

      const { error } = await supabase
        .from("tasks")
        .update(taskData)
        .eq("id", taskId);

      if (error) {
        throw error;
      }

      // Get user's full name from available users
      const updatingUser = allUsers.find((u) => u.email === user.email);
      const userDisplayName = updatingUser ? updatingUser.name : user.email;

      // Prepare change details for title and description
      const changes = [];
      if (originalTask.title !== data.title) {
        changes.push(
          `Title changed from "${originalTask.title}" to "${data.title}"`
        );
      }
      if (originalTask.description !== data.description) {
        changes.push(
          `Description changed from "${originalTask.description}" to "${data.description}"`
        );
      }

      // Log the activity with detailed change tracking
      const activityLogData = {
        user_id: user.id,
        activity_type: "UPDATE",
        description: `Task updated by ${userDisplayName} (${user.email}). ${changes.join(". ")}`,
        company_id: selectedCompany.id,
        metadata: {
          task_id: taskId,
          task_title: data.title,
          status: data.status,
          priority: data.priority,
          changes: changes,
          updated_by: {
            id: user.id, // Add user ID for navigation
            name: userDisplayName,
            email: user.email,
            role: updatingUser?.role || "superadmin", // Add role for navigation
          },
          assigned_to:
            selectedAssignees.length > 0
              ? {
                  id: selectedAssignees[0],
                  name:
                    availableUsers.find((u) => u.id === selectedAssignees[0])
                      ?.name || "Unknown User",
                  email: availableUsers.find(
                    (u) => u.id === selectedAssignees[0]
                  )?.email,
                  role: availableUsers.find(
                    (u) => u.id === selectedAssignees[0]
                  )?.role,
                }
              : null,
        },
        old_value: {
          id: taskId,
          title: {
            changed: originalTask.title !== data.title,
            previous: originalTask.title,
          },
          description: {
            changed: originalTask.description !== data.description,
            previous: originalTask.description,
          },
          status: originalTask.status,
          deadline: originalTask.deadline,
          priority: originalTask.priority,
          assigned_to: originalTask.assigned_to,
        },
        new_value: {
          id: taskId,
          title: {
            changed: originalTask.title !== data.title,
            current: data.title,
          },
          description: {
            changed: originalTask.description !== data.description,
            current: data.description,
          },
          status: data.status,
          deadline: data.deadline.toISOString(),
          priority: data.priority,
          assigned_to: selectedAssignees[0],
        },
      };

      const { error: logError } = await supabase
        .from("activity_logs")
        .insert([activityLogData]);

      if (logError) {
        console.error("Error logging activity:", logError);
        // Don't throw error here, as the task was updated successfully
      }

      setSnackbarMessage(t("superAdmin.tasks.taskUpdatedSuccessfully"));
      setSnackbarVisible(true);

      // Navigate to task details after a short delay
      setTimeout(() => {
        navigation.navigate("TaskDetails", { taskId: taskId });
      }, 1500);
    } catch (error: any) {
      console.error("Error updating task:", error);
      setSnackbarMessage(
        error.message || t("superAdmin.tasks.failedToUpdateTask")
      );
      setSnackbarVisible(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setValue("deadline", selectedDate);
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

  const handleStatusChange = (newStatus: TaskStatus) => {
    setValue("status", newStatus);
    setStatusMenuVisible(false);
  };

  if (loading || loadingUsers || loadingCompanies) {
    return <LoadingIndicator />;
  }

  // If user doesn't have permission to edit, show a notice
  if (!canEdit) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: "#F8F9FA" }]}>
        <AppHeader
          title={t("superAdmin.tasks.editTask")}
          subtitle={t("superAdmin.tasks.updateTaskDetails")}
          showBackButton
          showLogo={false}
          showHelpButton={true}
          absolute={false}
        />

        <View style={styles.permissionErrorContainer}>
          <IconButton icon="lock" size={64} iconColor={theme.colors.error} />
          <Text style={styles.permissionErrorTitle}>
            {t("superAdmin.tasks.permissionDenied")}
          </Text>
          <Text style={styles.permissionErrorText}>
            {permissionErrorMessage ||
              t("superAdmin.tasks.noPermissionToEditTask")}
          </Text>
          <Text style={styles.permissionErrorDescription}>
            {t("superAdmin.tasks.onlyCreatorCanEdit")}
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={styles.goBackButton}
            buttonColor={theme.colors.primary}
          >
            {t("common.goBack")}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#F8F9FA" }]}>
      <AppHeader
        title={t("superAdmin.tasks.editTask")}
        subtitle={t("superAdmin.tasks.updateTaskDetails")}
        showBackButton
        showLogo={false}
        showHelpButton={true}
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
              {Object.values(TaskStatus).map((status) => {
                const currentStatus = watch("status");
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOption,
                      currentStatus === status && {
                        backgroundColor: getStatusBackgroundColor(status),
                      },
                    ]}
                    onPress={() => handleStatusChange(status)}
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

                    {currentStatus === status && (
                      <IconButton
                        icon="check"
                        size={20}
                        iconColor={getStatusTextColor(status)}
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Surface>
        </Modal>
      </Portal>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              maxWidth: isLargeScreen ? 1400 : isMediumScreen ? 1100 : "100%",
              paddingHorizontal: isLargeScreen ? 48 : isMediumScreen ? 32 : 16,
            },
          ]}
        >
          <View style={styles.headerSection}>
            <Text style={styles.pageTitle}>
              {t("superAdmin.tasks.editTask")}
            </Text>
          </View>

          <View style={styles.gridContainer}>
            <View style={styles.gridColumn}>
              <Animated.View entering={FadeIn.delay(100)}>
                {/* Basic Information Card */}
                <Surface style={styles.formCard}>
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
                      <Text style={styles.cardTitle}>Basic Information</Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <Text style={styles.inputLabel}>
                      {t("superAdmin.tasks.selectCompany")} *
                    </Text>
                    <View style={styles.companySelector}>
                      <Button
                        mode="outlined"
                        onPress={() => setMenuVisible(true)}
                        style={styles.companyButton}
                        disabled={submitting}
                      >
                        {selectedCompany
                          ? selectedCompany.company_name
                          : t("superAdmin.tasks.selectCompany")}
                      </Button>
                      <Menu
                        visible={menuVisible}
                        onDismiss={() => setMenuVisible(false)}
                        anchor={{ x: 0, y: 0 }}
                      >
                        {companies.map((company) => (
                          <Menu.Item
                            key={company.id}
                            title={company.company_name}
                            onPress={() => {
                              setSelectedCompany(company);
                              setMenuVisible(false);
                            }}
                          />
                        ))}
                      </Menu>
                    </View>

                    <Controller
                      control={control}
                      rules={{ required: t("superAdmin.tasks.titleRequired") }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={t("superAdmin.tasks.title") + " *"}
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          error={!!errors.title}
                          style={styles.input}
                          disabled={submitting}
                        />
                      )}
                      name="title"
                    />
                    {errors.title && (
                      <Text style={styles.errorText}>
                        {errors.title.message}
                      </Text>
                    )}

                    <Controller
                      control={control}
                      rules={{
                        required: t("superAdmin.tasks.descriptionRequired"),
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={t("superAdmin.tasks.description") + " *"}
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          error={!!errors.description}
                          style={styles.input}
                          multiline
                          numberOfLines={4}
                          disabled={submitting}
                        />
                      )}
                      name="description"
                    />
                    {errors.description && (
                      <Text style={styles.errorText}>
                        {errors.description.message}
                      </Text>
                    )}

                    <Text style={styles.inputLabel}>
                      {t("superAdmin.tasks.deadline")} *
                    </Text>
                    <Button
                      mode="outlined"
                      onPress={() => setShowDatePicker(true)}
                      style={styles.dateButton}
                      icon="calendar"
                      disabled={submitting}
                    >
                      {format(deadline, "MMMM d, yyyy")}
                    </Button>

                    {showDatePicker && (
                      <DateTimePicker
                        value={deadline}
                        mode="date"
                        display="default"
                        onChange={handleDateChange}
                        minimumDate={new Date()}
                      />
                    )}
                  </View>
                </Surface>

                {/* Task Settings Card */}
                <Surface style={[styles.formCard, { marginTop: 24 }]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <View style={styles.iconContainer}>
                        <IconButton
                          icon="cog"
                          size={20}
                          iconColor="#64748b"
                          style={styles.headerIcon}
                        />
                      </View>
                      <Text style={styles.cardTitle}>Task Settings</Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <Text style={styles.inputLabel}>
                      {t("superAdmin.tasks.priority")} *
                    </Text>
                    <Controller
                      control={control}
                      render={({ field: { onChange, value } }) => (
                        <SegmentedButtons
                          value={value}
                          onValueChange={onChange}
                          buttons={[
                            {
                              value: TaskPriority.LOW,
                              label: t("superAdmin.tasks.low"),
                            },
                            {
                              value: TaskPriority.MEDIUM,
                              label: t("superAdmin.tasks.medium"),
                            },
                            {
                              value: TaskPriority.HIGH,
                              label: t("superAdmin.tasks.high"),
                            },
                          ]}
                          style={styles.segmentedButtons}
                          theme={{
                            colors: {
                              secondaryContainer: theme.colors.primaryContainer,
                              onSecondaryContainer: theme.colors.primary,
                            },
                          }}
                        />
                      )}
                      name="priority"
                    />

                    <Text style={styles.inputLabel}>
                      {t("superAdmin.tasks.status")} *
                    </Text>
                    <Controller
                      control={control}
                      render={({ field: { value } }) => (
                        <TouchableOpacity
                          onPress={() => setStatusMenuVisible(true)}
                          disabled={submitting}
                          style={[
                            styles.statusSelector,
                            {
                              backgroundColor: getStatusBackgroundColor(value),
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusText,
                              { color: getStatusTextColor(value) },
                            ]}
                          >
                            {getTranslatedStatus(value)}
                          </Text>
                          <IconButton
                            icon={getStatusIcon(value)}
                            size={20}
                            style={styles.statusIcon}
                            iconColor={getStatusTextColor(value)}
                          />
                        </TouchableOpacity>
                      )}
                      name="status"
                    />

                    <Controller
                      control={control}
                      rules={{
                        required: t("superAdmin.tasks.reminderDaysRequired"),
                        validate: (value) =>
                          !isNaN(parseInt(value)) &&
                          parseInt(value) >= 0 &&
                          parseInt(value) <= 365
                            ? true
                            : t("superAdmin.tasks.reminderDaysRange"),
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={t("superAdmin.tasks.reminderDays") + " *"}
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          error={!!errors.reminder_days_before}
                          style={styles.input}
                          keyboardType="numeric"
                          disabled={submitting}
                        />
                      )}
                      name="reminder_days_before"
                    />
                    {errors.reminder_days_before && (
                      <Text style={styles.errorText}>
                        {errors.reminder_days_before.message}
                      </Text>
                    )}
                  </View>
                </Surface>
              </Animated.View>
            </View>

            <View style={styles.gridColumn}>
              <Animated.View entering={FadeIn.delay(200)}>
                {/* Assigned Users Card */}
                <Surface style={styles.formCard}>
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
                      <Text style={styles.cardTitle}>
                        {t("superAdmin.tasks.assignUsers")}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <Text style={styles.helperText}>
                      {t(
                        "superAdmin.tasks.selectOneAdminToAssign",
                        "Select one admin to assign this task to"
                      )}
                    </Text>

                    <View style={styles.usersContainer}>
                      {availableUsers.map((user) => (
                        <Chip
                          key={`assignee-${user.id}`}
                          selected={selectedAssignees.includes(user.id)}
                          onPress={() => toggleAssignee(user.id)}
                          style={styles.userChip}
                          showSelectedCheck
                          mode="outlined"
                          disabled={submitting}
                        >
                          {user.name} (
                          {user.role === UserRole.SUPER_ADMIN
                            ? t("superAdmin.tasks.superAdmin")
                            : t("superAdmin.tasks.companyAdmin")}
                          )
                        </Chip>
                      ))}
                    </View>
                  </View>
                </Surface>
              </Animated.View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomSnackbar
        visible={snackbarVisible}
        message={snackbarMessage}
        onDismiss={() => setSnackbarVisible(false)}
        type={
          snackbarMessage?.includes("successful") ||
          snackbarMessage?.includes("instructions will be sent")
            ? "success"
            : snackbarMessage?.includes("rate limit") ||
                snackbarMessage?.includes("network")
              ? "warning"
              : "error"
        }
        duration={6000}
        action={{
          label: t("common.ok"),
          onPress: () => setSnackbarVisible(false),
        }}
        style={[
          styles.snackbar,
          {
            width: Platform.OS === "web" ? 700 : undefined,
            alignSelf: "center",
            position: Platform.OS === "web" ? "absolute" : undefined,
            bottom: Platform.OS === "web" ? 24 : undefined,
          },
        ]}
      />
      <Surface style={styles.bottomBar}>
        <View style={styles.bottomBarContent}>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={styles.button}
            disabled={submitting}
          >
            {t("common.cancel")}
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            style={styles.button}
            loading={submitting}
            disabled={submitting}
            buttonColor={theme.colors.primary}
          >
            {t("superAdmin.tasks.updateTask")}
          </Button>
        </View>
      </Surface>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  keyboardAvoidingView: {
    flex: 1,
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
  formCard: {
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
  input: {
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    color: "#64748b",
    fontFamily: "Poppins-Medium",
  },
  dateButton: {
    marginBottom: 16,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  statusSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  statusText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    textTransform: "capitalize",
  },
  statusIcon: {
    margin: 0,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: -8,
    marginBottom: 16,
    marginLeft: 4,
    fontFamily: "Poppins-Regular",
  },
  helperText: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 16,
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
  companySelector: {
    marginBottom: 16,
    zIndex: 1000,
  },
  companyButton: {
    width: "100%",
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
  permissionErrorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  permissionErrorTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#EF4444",
    fontFamily: "Poppins-Bold",
  },
  permissionErrorText: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: "center",
    color: "#334155",
    fontFamily: "Poppins-Regular",
  },
  permissionErrorDescription: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 32,
    textAlign: "center",
    fontFamily: "Poppins-Regular",
  },
  goBackButton: {
    minWidth: 120,
  },
  bottomBar: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    padding: 16,
  },
  bottomBarContent: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  button: {
    minWidth: 120,
  },
  snackbar: {
    marginBottom: 16,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
});

export default EditTaskScreen;
