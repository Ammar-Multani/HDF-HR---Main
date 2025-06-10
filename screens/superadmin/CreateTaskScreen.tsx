import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
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
  Portal,
  Modal,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
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

interface TaskFormData {
  title: string;
  description: string;
  deadline: Date;
  priority: TaskPriority;
  reminder_days_before: string;
}

const CreateTaskScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
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

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<TaskFormData>({
    defaultValues: {
      title: "",
      description: "",
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      priority: TaskPriority.MEDIUM,
      reminder_days_before: "1",
    },
  });

  const deadline = watch("deadline");

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
        .eq("role", "admin")
        .eq("active_status", "active");

      if (companyAdminsError) {
        console.error("Error fetching company admins:", companyAdminsError);
        return;
      }

      // Format company admins for display
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

      // Store all users
      setAllUsers(formattedCompanyAdmins);
      setAvailableUsers(formattedCompanyAdmins);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Filter users based on selected company
  useEffect(() => {
    if (selectedCompany) {
      // Filter users who belong to the selected company (only company admins, not super admins)
      const filteredUsers = allUsers.filter(
        (user) => user.company_id === selectedCompany.id
      );

      // Clear selected assignees when company changes
      setSelectedAssignees([]);
      setAvailableUsers(filteredUsers);
    } else {
      // If no company selected, show all users
      setAvailableUsers(allUsers);
    }
  }, [selectedCompany, allUsers]);

  useEffect(() => {
    fetchUsers();
    fetchCompanies();
  }, []);

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

      if (selectedAssignees.length === 0) {
        setSnackbarMessage("Please assign the task to at least one user");
        setSnackbarVisible(true);
        return;
      }

      if (!selectedCompany) {
        setSnackbarMessage("Please select a company for this task");
        setSnackbarVisible(true);
        return;
      }

      setLoading(true);

      const reminderDays = parseInt(data.reminder_days_before);
      if (isNaN(reminderDays) || reminderDays < 0 || reminderDays > 365) {
        setSnackbarMessage(
          "Please enter a valid reminder days value between 0 and 365"
        );
        setSnackbarVisible(true);
        setLoading(false);
        return;
      }

      // Get current super admin's ID from admin table
      const { data: adminData, error: adminError } = await supabase
        .from("admin")
        .select("id")
        .eq("email", user.email)
        .single();

      if (adminError || !adminData) {
        console.error("Error fetching admin data:", adminError);
        setSnackbarMessage("Error: Could not verify admin credentials");
        setSnackbarVisible(true);
        setLoading(false);
        return;
      }

      // Create task with proper relationships
      const taskData = {
        title: data.title,
        description: data.description,
        deadline: data.deadline.toISOString(),
        priority: data.priority,
        status: TaskStatus.OPEN,
        assigned_to: selectedAssignees[0], // Company admin's ID from company_user table
        created_by: adminData.id, // Super admin's ID from admin table
        reminder_days_before: reminderDays,
        company_id: selectedCompany.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Create task
      const { data: createdTask, error: createError } = await supabase
        .from("tasks")
        .insert([taskData])
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Get admin's name from admin table
      const { data: adminDetails, error: adminDetailsError } = await supabase
        .from("admin")
        .select("id, name")
        .eq("email", user.email)
        .single();

      const userDisplayName = adminDetails?.name || user.email;

      // Create activity log with task ID
      const activityLogData = {
        user_id: adminDetails?.id,
        activity_type: "CREATE_TASK",
        description: `New task '${data.title}' created by ${userDisplayName} (${user.email}). Assigned to ${availableUsers.find((u) => u.id === selectedAssignees[0])?.name || "Unknown User"}`,
        company_id: selectedCompany.id,
        task_id: createdTask.id, // Add task_id at root level
        metadata: {
          task_id: createdTask.id, // Also include in metadata
          task_title: data.title,
          priority: data.priority,
          created_by: {
            name: userDisplayName,
            email: user.email,
          },
          assigned_to: {
            id: selectedAssignees[0],
            name:
              availableUsers.find((u) => u.id === selectedAssignees[0])?.name ||
              "Unknown User",
          },
        },
      };

      // Log the activity
      const { error: logError } = await supabase
        .from("activity_logs")
        .insert([activityLogData]);

      if (logError) {
        console.error("Error creating activity log:", logError);
      }

      setSnackbarMessage("Task created successfully");
      setSnackbarVisible(true);

      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error: any) {
      console.error("Error creating task:", error);
      setSnackbarMessage(error.message || "Failed to create task");
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  // Date picker handlers for the web-compatible date picker
  const handleDateConfirm = (selectedDate: Date) => {
    setShowDatePicker(false);
    setValue("deadline", selectedDate);
  };

  const handleDateCancel = () => {
    setShowDatePicker(false);
  };

  // Web-specific date picker component
  const WebDatePicker = () => {
    const [year, setYear] = useState(deadline.getFullYear());
    const [month, setMonth] = useState(deadline.getMonth() + 1); // JavaScript months are 0-indexed
    const [day, setDay] = useState(deadline.getDate());

    const handleConfirm = () => {
      const newDate = new Date(year, month - 1, day);
      handleDateConfirm(newDate);
    };

    return (
      <Portal>
        <Modal
          visible={showDatePicker}
          onDismiss={handleDateCancel}
          contentContainerStyle={styles.webDatePickerModal}
        >
          <View style={styles.webDatePickerContainer}>
            <Text style={styles.webDatePickerTitle}>Select Date</Text>

            <View style={styles.webDateInputRow}>
              <View style={styles.webDateInputContainer}>
                <Text style={styles.webDateInputLabel}>Day</Text>
                <TextInput
                  mode="outlined"
                  keyboardType="numeric"
                  value={day.toString()}
                  onChangeText={(text) => setDay(parseInt(text) || 1)}
                  style={styles.webDateInput}
                />
              </View>

              <View style={styles.webDateInputContainer}>
                <Text style={styles.webDateInputLabel}>Month</Text>
                <TextInput
                  mode="outlined"
                  keyboardType="numeric"
                  value={month.toString()}
                  onChangeText={(text) => {
                    const newMonth = parseInt(text) || 1;
                    setMonth(Math.min(Math.max(newMonth, 1), 12));
                  }}
                  style={styles.webDateInput}
                />
              </View>

              <View style={styles.webDateInputContainer}>
                <Text style={styles.webDateInputLabel}>Year</Text>
                <TextInput
                  mode="outlined"
                  keyboardType="numeric"
                  value={year.toString()}
                  onChangeText={(text) => setYear(parseInt(text) || 2023)}
                  style={styles.webDateInput}
                />
              </View>
            </View>

            <View style={styles.webDatePickerActions}>
              <Button
                onPress={handleDateCancel}
                style={styles.webDatePickerButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleConfirm}
                style={styles.webDatePickerButton}
              >
                Confirm
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>
    );
  };

  if (loadingUsers || loadingCompanies) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader
        title="Create Task"
        showBackButton
        showLogo={false}
        showHelpButton={false}
      />

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

          <Text style={styles.inputLabel}>Select Company *</Text>
          <View style={styles.companySelector}>
            <Button
              mode="outlined"
              onPress={() => setMenuVisible(true)}
              style={styles.companyButton}
            >
              {selectedCompany
                ? selectedCompany.company_name
                : "Select Company"}
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
                disabled={loading}
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
                disabled={loading}
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
          >
            {format(deadline, "MMMM d, yyyy")}
          </Button>

          {Platform.OS === "web" ? (
            <WebDatePicker />
          ) : (
            <DateTimePickerModal
              isVisible={showDatePicker}
              mode="date"
              onConfirm={handleDateConfirm}
              onCancel={handleDateCancel}
              date={deadline}
              minimumDate={new Date()}
            />
          )}

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
                disabled={loading}
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
            Select one admin to assign this task to (required)
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
              >
                {user.name} (Company Admin)
              </Chip>
            ))}
          </View>

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            style={styles.submitButton}
            loading={loading}
            disabled={loading}
          >
            Create Task
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
  webDatePickerModal: {
    backgroundColor: "white",
    padding: 20,
    margin: 20,
    borderRadius: 8,
    maxWidth: 500,
    alignSelf: "center",
  },
  webDatePickerContainer: {
    alignItems: "center",
  },
  webDatePickerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
  },
  webDateInputRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
  },
  webDateInputContainer: {
    width: "30%",
  },
  webDateInputLabel: {
    marginBottom: 5,
  },
  webDateInput: {
    height: 40,
  },
  webDatePickerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    width: "100%",
  },
  webDatePickerButton: {
    marginLeft: 10,
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

export default CreateTaskScreen;
