import React, { useState, useEffect } from "react";
import { logDebug } from "../../utils/logger";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
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
  Portal,
  Modal,
  Surface,
  IconButton,
  Divider,
  Card,
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
import { TaskPriority, UserRole, TaskStatus, ActivityType } from "../../types";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
  interpolate,
} from "react-native-reanimated";
import { getFontFamily } from "../../utils/globalStyles";
import CustomSnackbar from "../../components/CustomSnackbar";
import { t } from "i18next";
import { LinearGradient } from "expo-linear-gradient";
import HelpGuideModal from "../../components/HelpGuideModal";

interface TaskFormData {
  title: string;
  description: string;
  deadline: Date;
  priority: TaskPriority;
  reminder_days_before: string;
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

// Add Shimmer component
interface ShimmerProps {
  width: number;
  height: number;
  style?: any; // Using any for style prop as it can be complex
}

const Shimmer: React.FC<ShimmerProps> = ({ width, height, style = {} }) => {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 1000 })
      ),
      -1
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(animatedValue.value, [0, 1], [0.3, 0.7]),
      transform: [
        {
          translateX: interpolate(animatedValue.value, [0, 1], [-width, width]),
        },
      ],
    };
  });

  return (
    <View
      style={[
        {
          width,
          height,
          backgroundColor: "#E0E0E0",
          overflow: "hidden",
          borderRadius: 4,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            width: "100%",
            height: "100%",
            backgroundColor: "#F5F5F5",
          },
          animatedStyle,
        ]}
      />
    </View>
  );
};

// Add FormSkeleton component
const FormSkeleton = () => {
  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Create Task"
        subtitle="Add new task information"
        showBackButton
        showHelpButton={true}
        showLogo={false}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.headerSection}>
          <Shimmer width={200} height={32} />
        </View>

        <View style={styles.gridContainer}>
          {/* Left Column */}
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
                  <View style={styles.inputContainer}>
                    <Shimmer
                      width={300}
                      height={56}
                      style={{ marginBottom: 16 }}
                    />
                    <Shimmer width={300} height={120} />
                  </View>
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
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Deadline</Text>
                    <Shimmer
                      width={300}
                      height={48}
                      style={{ marginBottom: 24 }}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Priority</Text>
                    <Shimmer
                      width={300}
                      height={40}
                      style={{ marginBottom: 24 }}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Reminder Days</Text>
                    <Shimmer width={300} height={56} />
                  </View>
                </View>
              </Surface>
            </Animated.View>
          </View>

          {/* Right Column */}
          <View style={styles.gridColumn}>
            <Animated.View entering={FadeIn.delay(200)}>
              {/* Assign Users Card */}
              <Surface style={styles.formCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <View style={styles.iconContainer}>
                      <IconButton
                        icon="account-multiple"
                        size={20}
                        iconColor="#64748b"
                        style={styles.headerIcon}
                      />
                    </View>
                    <Text style={styles.cardTitle}>Assign Users</Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  <Text style={styles.helperText}>
                    Select one super admin to assign this task to (required)
                  </Text>

                  <View style={styles.usersContainer}>
                    {[1, 2, 3, 4].map((i) => (
                      <Shimmer
                        key={i}
                        width={180}
                        height={32}
                        style={{ marginBottom: 8, borderRadius: 16 }}
                      />
                    ))}
                  </View>
                </View>
              </Surface>
            </Animated.View>
          </View>
        </View>
      </ScrollView>

      <Surface style={styles.bottomBar}>
        <View style={styles.bottomBarContent}>
          <Shimmer width={120} height={40} style={{ borderRadius: 4 }} />
          <Shimmer width={120} height={40} style={{ borderRadius: 4 }} />
        </View>
      </Surface>
    </SafeAreaView>
  );
};

const CompanyAdminCreateTaskScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const dimensions = useWindowDimensions();

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Web-specific date picker state
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [day, setDay] = useState(new Date().getDate());

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

  // Add help modal state
  const [helpModalVisible, setHelpModalVisible] = useState(false);

  // Define help guide content
  const helpGuideSteps = [
    {
      title: "Basic Information",
      icon: "clipboard-text",
      description:
        "Enter the task title and a detailed description. Be specific about what needs to be done to help assignees understand the requirements clearly.",
    },
    {
      title: "Task Settings",
      icon: "cog",
      description:
        "Set the deadline, priority level, and reminder days. The deadline should be a future date, priority affects task visibility, and reminders help keep assignees on track.",
    },
    {
      title: "Priority Levels",
      icon: "alert-circle",
      description:
        "Choose between Low (routine tasks), Medium (important but not urgent), and High (urgent tasks requiring immediate attention) priority levels.",
    },
    {
      title: "Reminders",
      icon: "bell",
      description:
        "Specify how many days before the deadline to send a reminder. This helps ensure tasks are completed on time. Enter a value between 0 and 365 days.",
    },
    {
      title: "User Assignment",
      icon: "account-multiple",
      description:
        "Select one super admin to assign the task to. The assigned user will be responsible for completing the task and receiving notifications.",
    },
  ];

  const helpGuideNote = {
    title: "Important Notes",
    content: [
      "Required fields are marked with an asterisk (*)",
      "Tasks cannot be created without an assigned user",
      "Deadline must be set to a future date",
      "Reminders will be sent via email to assigned users",
      "Only one user can be assigned to a task at a time",
    ],
  };

  const fetchCompanyId = async () => {
    if (!user) {
      setSnackbarMessage("User information not available");
      setSnackbarVisible(true);
      return null;
    }

    try {
      const { data, error } = await supabase
        .from("company_user")
        .select("company_id")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching company ID:", error);
        setSnackbarMessage("Failed to fetch company information");
        setSnackbarVisible(true);
        return null;
      }

      return data?.company_id || null;
    } catch (error) {
      console.error("Error in fetchCompanyId:", error);
      setSnackbarMessage("Failed to fetch company information");
      setSnackbarVisible(true);
      return null;
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      logDebug("=== Starting fetchUsers ===");

      // Get the company admin's ID from company_user table
      const { data: companyUserData, error: companyUserError } = await supabase
        .from("company_user")
        .select("id, first_name, last_name, email, role")
        .eq("email", user?.email)
        .eq("role", "admin")
        .eq("active_status", "active")
        .single();

      if (companyUserError) {
        console.error("Error fetching company user data:", companyUserError);
        // Continue with super admin fetch even if company user fetch fails
      }

      // Fetch only super admins for task assignment
      const { data: superAdmins, error: adminError } = await supabase
        .from("admin")
        .select("id, name, email, role")
        .eq("role", UserRole.SUPER_ADMIN)
        .eq("status", true);

      if (adminError) {
        console.error("Error fetching super admins:", adminError);
        return;
      }

      // Map admins to a consistent format
      const formattedUsers = (superAdmins || []).map((admin) => ({
        id: admin.id,
        name: admin.name || admin.email,
        email: admin.email,
        role: admin.role,
      }));

      // Add company user if found
      if (companyUserData) {
        formattedUsers.push({
          id: companyUserData.id,
          name:
            `${companyUserData.first_name} ${companyUserData.last_name}`.trim() ||
            companyUserData.email,
          email: companyUserData.email,
          role: companyUserData.role,
        });
      }

      logDebug("Fetched users:", formattedUsers);
      setAvailableUsers(formattedUsers);
    } catch (error) {
      console.error("Error in fetchUsers:", error);
      setSnackbarMessage("Failed to load users. Please try again.");
      setSnackbarVisible(true);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      logDebug("=== Starting initializeData ===");
      setLoading(true);
      try {
        const compId = await fetchCompanyId();
        if (compId) {
          setCompanyId(compId);
          await fetchUsers();
        } else {
          setSnackbarMessage("Company information not available");
          setSnackbarVisible(true);
        }
      } catch (error) {
        console.error("Error in initialization:", error);
        setSnackbarMessage("Failed to initialize data");
        setSnackbarVisible(true);
      } finally {
        setLoading(false);
      }
    };

    if (user?.email) {
      initializeData();
    }
  }, [user?.email]); // Only re-run when user email changes

  const toggleAssignee = (userId: string) => {
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

      // Get current company admin's details
      const { data: adminData, error: adminError } = await supabase
        .from("company_user")
        .select("id, first_name, last_name, email, role, company_id")
        .eq("email", user.email)
        .eq("role", "admin")
        .single();

      if (adminError || !adminData) {
        console.error("Error fetching admin data:", adminError);
        setSnackbarMessage("Error: Could not verify admin credentials");
        setSnackbarVisible(true);
        setLoading(false);
        return;
      }

      // Create task
      const taskData = {
        title: data.title,
        description: data.description,
        deadline: data.deadline.toISOString(),
        priority: data.priority,
        status: TaskStatus.OPEN,
        assigned_to: selectedAssignees[0],
        created_by: adminData.id,
        company_id: adminData.company_id,
        reminder_days_before: reminderDays,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: createdTask, error: createError } = await supabase
        .from("tasks")
        .insert([taskData])
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      // Get assigned user's details
      const assignedUser = availableUsers.find(
        (u) => u.id === selectedAssignees[0]
      );

      // Create activity log
      const activityLogData = {
        user_id: adminData.id,
        activity_type: ActivityType.CREATE_TASK,
        description: `New task "${data.title}" created by ${adminData.first_name} ${adminData.last_name} (${user.email}). Assigned to ${assignedUser?.name || "Unknown User"}`,
        company_id: adminData.company_id,
        metadata: {
          task_id: createdTask.id,
          task_title: data.title,
          status: TaskStatus.OPEN,
          priority: data.priority,
          assigned_to: assignedUser
            ? {
                id: assignedUser.id,
                name: assignedUser.name,
                email: assignedUser.email,
                role: assignedUser.role,
              }
            : null,
          created_by: {
            id: adminData.id,
            name: `${adminData.first_name} ${adminData.last_name}`,
            email: user.email,
            role: adminData.role,
          },
          company: {
            id: adminData.company_id,
            name: "", // Company name will be available in the UI context
          },
        },
        old_value: null,
        new_value: {
          id: createdTask.id,
          title: data.title,
          description: data.description,
          deadline: data.deadline.toISOString(),
          priority: data.priority,
          status: TaskStatus.OPEN,
          assigned_to: selectedAssignees[0],
          company_id: adminData.company_id,
          created_at: new Date().toISOString(),
          created_by: {
            id: adminData.id,
            name: `${adminData.first_name} ${adminData.last_name}`,
            email: user.email,
            role: adminData.role,
          },
        },
      };

      const { error: logError } = await supabase
        .from("activity_logs")
        .insert([activityLogData]);

      if (logError) {
        console.error("Error logging activity:", logError);
        // Don't throw error here, as the task was created successfully
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

  // Web-specific date picker component
  const WebDatePicker = () => {
    return (
      <Portal>
        <Modal
          visible={showDatePicker}
          onDismiss={() => setShowDatePicker(false)}
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
                onPress={() => setShowDatePicker(false)}
                style={styles.webDatePickerButton}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={() => {
                  const newDate = new Date(year, month - 1, day);
                  setValue("deadline", newDate);
                  setShowDatePicker(false);
                }}
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

  if (loading || loadingUsers) {
    return <FormSkeleton />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Create Task"
        subtitle="Add new task information"
        showBackButton
        showHelpButton={true}
        onHelpPress={() => setHelpModalVisible(true)}
        showLogo={false}
      />

      <HelpGuideModal
        visible={helpModalVisible}
        onDismiss={() => setHelpModalVisible(false)}
        title="Create Task Guide"
        description="Learn how to create and assign tasks effectively."
        steps={helpGuideSteps}
        note={helpGuideNote}
        buttonLabel="Got it"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.headerSection}>
            <Text style={styles.pageTitle}>Create New Task</Text>
          </View>

          <View style={styles.gridContainer}>
            <View style={styles.gridColumn}>
              <Animated.View entering={FadeIn.delay(100)}>
                {/* Basic Information */}
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
                    <Controller
                      control={control}
                      rules={{ required: "Title is required" }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <>
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
                          {errors.title && (
                            <Text style={styles.errorText}>
                              {errors.title.message}
                            </Text>
                          )}
                        </>
                      )}
                      name="title"
                    />

                    <Controller
                      control={control}
                      rules={{ required: "Description is required" }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <>
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
                          {errors.description && (
                            <Text style={styles.errorText}>
                              {errors.description.message}
                            </Text>
                          )}
                        </>
                      )}
                      name="description"
                    />
                  </View>
                </Surface>

                {/* Task Settings */}
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
                    <Text style={styles.inputLabel}>Deadline *</Text>
                    <Button
                      mode="outlined"
                      onPress={() => setShowDatePicker(true)}
                      style={styles.dateButton}
                      icon="calendar"
                    >
                      {format(deadline, "MMMM d, yyyy")}
                    </Button>

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
                        <>
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
                          {errors.reminder_days_before && (
                            <Text style={styles.errorText}>
                              {errors.reminder_days_before.message}
                            </Text>
                          )}
                        </>
                      )}
                      name="reminder_days_before"
                    />
                  </View>
                </Surface>
              </Animated.View>
            </View>

            <View style={styles.gridColumn}>
              <Animated.View entering={FadeIn.delay(200)}>
                {/* Assign Users */}
                <Surface style={styles.formCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <View style={styles.iconContainer}>
                        <IconButton
                          icon="account-multiple"
                          size={20}
                          iconColor="#64748b"
                          style={styles.headerIcon}
                        />
                      </View>
                      <Text style={styles.cardTitle}>Assign Users</Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
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
                  </View>
                </Surface>
              </Animated.View>
            </View>
          </View>
        </ScrollView>

        <Surface style={styles.bottomBar}>
          <View style={styles.bottomBarContent}>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={[styles.button, styles.cancelButton]}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              style={[
                styles.button,
                styles.saveButton,
                { backgroundColor: theme.colors.primary },
              ]}
              loading={loading}
              disabled={loading}
            >
              Create Task
            </Button>
          </View>
        </Surface>
      </KeyboardAvoidingView>

      {Platform.OS === "web" ? (
        <WebDatePicker />
      ) : (
        <DateTimePicker
          value={deadline}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

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
    backgroundColor: "#F9FAFB",
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    maxWidth: 1280,
    width: "100%",
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 100,
  },
  headerSection: {
    marginBottom: 32,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#111827",
    fontFamily: getFontFamily("600"),
  },
  gridContainer: {
    flexDirection: "row",
    gap: 24,
    flexWrap: "wrap",
  },
  gridColumn: {
    flex: 1,
    minWidth: 320,
  },
  formCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 8,
  },
  headerIcon: {
    margin: 0,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    fontFamily: getFontFamily("600"),
  },
  cardContent: {
    gap: 16,
  },
  input: {
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
    fontFamily: getFontFamily("400"),
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
    fontFamily: getFontFamily("500"),
  },
  errorText: {
    color: "#DC2626",
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
    fontFamily: getFontFamily("400"),
  },
  helperText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 16,
    fontFamily: getFontFamily("400"),
  },
  dateButton: {
    marginBottom: 16,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  usersContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  userChip: {
    margin: 0,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  bottomBarContent: {
    maxWidth: 1280,
    width: "100%",
    alignSelf: "center",
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  button: {
    minWidth: 120,
  },
  cancelButton: {
    borderColor: "#D1D5DB",
  },
  saveButton: {},
  webDatePickerModal: {
    padding: 24,
    elevation: 0,
    shadowColor: "transparent",
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  webDatePickerContainer: {
    backgroundColor: "#FFFFFF",
    padding: 24,
    borderRadius: 12,
    width: "100%",
    maxWidth: 480,
    alignSelf: "center",

  },
  webDatePickerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 24,
    fontFamily: getFontFamily("600"),
  },
  webDateInputRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  webDateInputContainer: {
    flex: 1,
  },
  webDateInputLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 8,
    fontFamily: getFontFamily("500"),
  },
  webDateInput: {
    backgroundColor: "#FFFFFF",
    fontFamily: getFontFamily("400"),
  },
  webDatePickerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  webDatePickerButton: {
    minWidth: 100,
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
  // Styles for FormSkeleton
  card: {
    margin: 16,
    elevation: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
    fontSize: 18,
    fontWeight: "600",
  },
  inputContainer: {
    marginBottom: 16,
  },
  labelContainer: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: "#666",
  },
  userList: {
    gap: 8,
  },
});

export default CompanyAdminCreateTaskScreen;
