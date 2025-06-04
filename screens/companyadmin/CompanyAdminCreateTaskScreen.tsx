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
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useForm, Controller } from "react-hook-form";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import { TaskPriority, UserRole, TaskStatus } from "../../types";
import CustomSnackbar from "../../components/CustomSnackbar";

interface TaskFormData {
  title: string;
  description: string;
  deadline: Date;
  priority: TaskPriority;
  reminder_days_before: string;
}

const CompanyAdminCreateTaskScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);

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

  const fetchCompanyId = async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("company_user")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching company ID:", error);
        return null;
      }

      return data?.company_id || null;
    } catch (error) {
      console.error("Error fetching company ID:", error);
      return null;
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);

      // Fetch only super admins for task assignment
      const { data: superAdmins, error } = await supabase
        .from("admin")
        .select("id, name, email, role")
        .eq("role", UserRole.SUPER_ADMIN)
        .eq("status", true); // Change from "active" string to boolean true

      if (error) {
        console.error("Error fetching super admins:", error);
        return;
      }

      // Map admins to a consistent format
      const formattedUsers = (superAdmins || []).map((admin) => ({
        id: admin.id,
        name: admin.name || admin.email,
        email: admin.email,
        role: admin.role,
      }));

      setAvailableUsers(formattedUsers);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      const compId = await fetchCompanyId();
      if (compId) {
        setCompanyId(compId);
      }
      fetchUsers();
    };

    initializeData();
  }, [user]);

  const toggleAssignee = (userId: string) => {
    setSelectedAssignees([userId]);
  };

  const onSubmit = async (data: TaskFormData) => {
    try {
      if (!user) {
        setSnackbarMessage("User information not available");
        setSnackbarVisible(true);
        return;
      }

      // Ensure we have the company ID
      let currentCompanyId = companyId;
      if (!currentCompanyId) {
        currentCompanyId = await fetchCompanyId();
        if (!currentCompanyId) {
          setSnackbarMessage("Company information not available");
          setSnackbarVisible(true);
          return;
        }
        setCompanyId(currentCompanyId);
      }

      if (selectedAssignees.length === 0) {
        setSnackbarMessage("Please assign the task to at least one user");
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

      // Create task
      const { data: taskData, error } = await supabase
        .from("tasks")
        .insert([
          {
            title: data.title,
            description: data.description,
            deadline: data.deadline.toISOString(),
            priority: data.priority,
            status: TaskStatus.OPEN,
            assigned_to:
              selectedAssignees.length > 0 ? selectedAssignees[0] : null,
            created_by: user.id,
            company_id: currentCompanyId,
            reminder_days_before: reminderDays,
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
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

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setValue("deadline", selectedDate);
    }
  };

  if (loadingUsers) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader
        title="Create Task"
        showBackButton={true}
        showHelpButton={true}
        onHelpPress={() => {
          navigation.navigate("Help" as never);
        }}
        showLogo={false}
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

          {showDatePicker && (
            <DateTimePicker
              value={deadline}
              mode="date"
              display="default"
              onChange={handleDateChange}
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
            Select one super admin to assign this task to (required)
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
                {user.name} (
                {user.role === UserRole.SUPER_ADMIN
                  ? "Super Admin"
                  : "Employee"}
                )
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

export default CompanyAdminCreateTaskScreen;
