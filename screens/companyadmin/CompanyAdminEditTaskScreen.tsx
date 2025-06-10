import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
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
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import { TaskPriority, UserRole, TaskStatus } from "../../types";
import CustomSnackbar from "../../components/CustomSnackbar";
import { t } from "i18next";

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

const CompanyAdminEditTaskScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<Record<string, EditTaskRouteParams>, string>>();
  const { taskId } = route.params;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const [originalTask, setOriginalTask] = useState<any>(null);
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
  const currentStatus = watch("status");

  // Check if the user can edit this task
  const checkEditPermission = async (taskData: any) => {
    if (!user) {
      setCanEdit(false);
      setPermissionErrorMessage("User not authenticated");
      return false;
    }

    // All users can edit all tasks now
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
        Alert.alert("Error", "Task not found");
        navigation.goBack();
        return;
      }

      setOriginalTask(taskData);

      // Check if user can edit this task
      const hasPermission = await checkEditPermission(taskData);

      if (!hasPermission) {
        // Still set form values so user can view the task details
        reset({
          title: taskData.title,
          description: taskData.description,
          deadline: new Date(taskData.deadline),
          priority: taskData.priority,
          reminder_days_before: taskData.reminder_days_before.toString(),
          status: taskData.status,
        });

        setCompanyId(taskData.company_id);

        // Just don't allow editing
        setLoading(false);
        return;
      }

      // Set form values
      reset({
        title: taskData.title,
        description: taskData.description,
        deadline: new Date(taskData.deadline),
        priority: taskData.priority,
        reminder_days_before: taskData.reminder_days_before.toString(),
        status: taskData.status,
      });

      // Set company ID
      setCompanyId(taskData.company_id);

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
    } catch (error) {
      console.error("Error fetching task details:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      if (!companyId || !user) {
        setLoadingUsers(false);
        return;
      }

      setLoadingUsers(true);

      // Fetch company admins from this company
      const { data: companyAdmins, error: companyAdminsError } = await supabase
        .from("company_user")
        .select("id, first_name, last_name, email, role")
        .eq("role", UserRole.COMPANY_ADMIN)
        .eq("company_id", companyId)
        .eq("active_status", "active");

      if (companyAdminsError) {
        console.error("Error fetching users:", companyAdminsError);
        return;
      }

      // Format company admins
      const formattedCompanyAdmins = (companyAdmins || []).map((admin) => ({
        id: admin.id,
        name:
          admin.first_name && admin.last_name
            ? `${admin.first_name} ${admin.last_name}`
            : admin.email,
        email: admin.email,
        role: admin.role,
      }));

      setAllUsers(formattedCompanyAdmins);
      setAvailableUsers(formattedCompanyAdmins);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  useEffect(() => {
    if (companyId) {
      fetchUsers();
    }
  }, [companyId]);

  const toggleAssignee = (userId: string) => {
    // Instead of adding/removing from the array, just set the selected assignee to this one
    setSelectedAssignees([userId]);
  };

  const onSubmit = async (data: TaskFormData) => {
    try {
      if (!user) {
        setSnackbarMessage("User not authenticated");
        setSnackbarVisible(true);
        return;
      }

      if (!canEdit) {
        setSnackbarMessage("You don't have permission to edit this task");
        setSnackbarVisible(true);
        return;
      }

      if (selectedAssignees.length === 0) {
        setSnackbarMessage("Please assign the task to at least one user");
        setSnackbarVisible(true);
        return;
      }

      if (!companyId) {
        setSnackbarMessage("Company ID not found");
        setSnackbarVisible(true);
        return;
      }

      setSubmitting(true);

      const reminderDays = parseInt(data.reminder_days_before);
      if (isNaN(reminderDays) || reminderDays < 0 || reminderDays > 365) {
        setSnackbarMessage(
          "Please enter a valid reminder days value between 0 and 365"
        );
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
      };

      const { error } = await supabase
        .from("tasks")
        .update(taskData)
        .eq("id", taskId);

      if (error) {
        throw error;
      }

      setSnackbarMessage("Task updated successfully");
      setSnackbarVisible(true);

      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error: any) {
      console.error("Error updating task:", error);
      setSnackbarMessage(error.message || "Failed to update task");
      setSnackbarVisible(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDateConfirm = (selectedDate: Date) => {
    setShowDatePicker(false);
    setValue("deadline", selectedDate);
  };

  const handleDateCancel = () => {
    setShowDatePicker(false);
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

  const handleStatusChange = (newStatus: TaskStatus) => {
    setValue("status", newStatus);
    setStatusMenuVisible(false);
  };

  if (loading || loadingUsers) {
    return <LoadingIndicator />;
  }

  // If user doesn't have permission to edit, show a notice
  if (!canEdit) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <AppHeader
          title="Edit Task"
          subtitle="Update task details"
          showBackButton
          showLogo={false}
        />

        <View style={styles.permissionErrorContainer}>
          <IconButton icon="lock" size={64} iconColor={theme.colors.error} />
          <Text style={styles.permissionErrorTitle}>Permission Denied</Text>
          <Text style={styles.permissionErrorText}>
            {permissionErrorMessage ||
              "You don't have permission to edit this task"}
          </Text>
          <Text style={styles.permissionErrorDescription}>
            Only the creator of a task can edit it
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={styles.goBackButton}
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
      <AppHeader
        title="Edit Task"
        subtitle="Update task details"
        showBackButton
        showLogo={false}
      />

      <Portal>
        <Modal
          visible={statusMenuVisible}
          onDismiss={() => setStatusMenuVisible(false)}
          contentContainerStyle={styles.modalContainer}
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

            <ScrollView style={styles.statusOptionsContainer}>
              {Object.values(TaskStatus).map((status) => (
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

                  {currentStatus === status && (
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

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <Text
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            Task Details
          </Text>

          <Controller
            control={control}
            rules={{ required: "Title is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Title *"
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
            <Text style={styles.errorText}>{errors.title.message}</Text>
          )}

          <Controller
            control={control}
            rules={{ required: "Description is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Description *"
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
            <Text style={styles.errorText}>{errors.description.message}</Text>
          )}

          <Text style={styles.inputLabel}>Deadline *</Text>
          <Button
            mode="outlined"
            onPress={() => setShowDatePicker(true)}
            style={styles.dateButton}
            icon="calendar"
            disabled={submitting}
          >
            {format(deadline, "MMMM d, yyyy")}
          </Button>

          <DateTimePickerModal
            isVisible={showDatePicker}
            mode="date"
            onConfirm={handleDateConfirm}
            onCancel={handleDateCancel}
            date={deadline}
            minimumDate={new Date()}
          />

          <Text style={styles.inputLabel}>Priority *</Text>
          <Controller
            control={control}
            render={({ field: { onChange, value } }) => (
              <SegmentedButtons
                value={value}
                onValueChange={onChange}
                buttons={[
                  { value: TaskPriority.LOW, label: "Low" },
                  { value: TaskPriority.MEDIUM, label: "Medium" },
                  { value: TaskPriority.HIGH, label: "High" },
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

          <Text style={styles.inputLabel}>Status *</Text>
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
                  {value.replace(/_/g, " ")}
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
              required: "Reminder days is required",
              validate: (value) =>
                !isNaN(parseInt(value)) &&
                parseInt(value) >= 0 &&
                parseInt(value) <= 365
                  ? true
                  : "Please enter a value between 0 and 365 days",
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Reminder (days before deadline) *"
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

          <Text
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            Assign Users
          </Text>

          <Text style={styles.helperText}>
            Select one company admin to assign this task to (required)
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
                {user.name} (Admin)
              </Chip>
            ))}
          </View>

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            style={styles.submitButton}
            loading={submitting}
            disabled={submitting}
          >
            Update Task
          </Button>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 24,
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.7,
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
    fontSize: 16,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  statusIcon: {
    margin: 0,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 4,
  },
  helperText: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 12,
  },
  usersContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 16,
  },
  userChip: {
    margin: 4,
  },
  submitButton: {
    marginTop: 24,
    paddingVertical: 6,
  },
  companySelector: {
    marginBottom: 16,
    zIndex: 1000,
  },
  companyButton: {
    width: "100%",
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
    fontWeight: "600",
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
  statusDescription: {
    fontSize: 12,
    color: "#757575",
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
  },
  permissionErrorText: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: "center",
  },
  permissionErrorDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 32,
    textAlign: "center",
  },
  goBackButton: {
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

export default CompanyAdminEditTaskScreen;
