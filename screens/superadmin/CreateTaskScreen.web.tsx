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
  Portal,
  Modal,
  Surface,
  IconButton,
  Divider,
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
import Animated, { FadeIn } from "react-native-reanimated";
import DateTimePicker from "react-native-modal-datetime-picker";
import CustomSnackbar from "../../components/CustomSnackbar";
import { t } from "i18next";
import { TaskActivityLogger } from "../../components/TaskActivityLogger";

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

      if (adminDetailsError) {
        console.error("Error fetching admin details:", adminDetailsError);
      }

      const userDisplayName = adminDetails?.name || user.email;

      // Get assigned user's name
      const assignedUser = availableUsers.find(
        (u) => u.id === selectedAssignees[0]
      );
      const assignedUserName = assignedUser
        ? assignedUser.name
        : "Unknown User";

      // Log the activity using our new system
      await logActivity(
        "CREATE",
        createdTask.id,
        data.title,
        selectedCompany.id,
        {
          assigned_to: {
            id: selectedAssignees[0],
            name: assignedUserName,
          },
          priority: data.priority,
        },
        null,
        {
          title: data.title,
          description: data.description,
          deadline: data.deadline.toISOString(),
          priority: data.priority,
          assigned_to: {
            id: selectedAssignees[0],
            name: assignedUserName,
          },
        }
      );

      setSnackbarMessage("Task created successfully");
      setSnackbarVisible(true);

      // Navigate to task details after a short delay
      setTimeout(() => {
        navigation.navigate("TaskDetails", { taskId: createdTask.id });
      }, 1500);
    } catch (error: any) {
      console.error("Error creating task:", error);
      setSnackbarMessage(error.message || "Failed to create task");
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any) => {
    if (Platform.OS === "web") {
      const selectedDate = new Date(event.target.value);
      setValue("deadline", selectedDate);
    } else {
      if (event.type === "set" && event.nativeEvent.timestamp) {
        setValue("deadline", new Date(event.nativeEvent.timestamp));
      }
      setShowDatePicker(false);
    }
  };

  if (loadingUsers || loadingCompanies) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <TaskActivityLogger>
        {(logActivity) => (
          <>
            <AppHeader
              title={t("superAdmin.tasks.createTask")}
              subtitle={t("superAdmin.tasks.updateTaskDetails")}
              showBackButton
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
                <View style={styles.headerSection}>
                  <Text style={styles.pageTitle}>
                    {t("superAdmin.tasks.createTask")}
                  </Text>
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
                            <Text style={styles.cardTitle}>
                              {t("superAdmin.tasks.details")}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.cardContent}>
                          <Text style={styles.inputLabel}>
                            {t("superAdmin.tasks.selectCompany")} *
                          </Text>
                          <Button
                            mode="outlined"
                            onPress={() => setMenuVisible(true)}
                            style={styles.companyButton}
                            icon="office-building"
                          >
                            {selectedCompany
                              ? selectedCompany.company_name
                              : t("superAdmin.tasks.selectCompany")}
                          </Button>

                          <Controller
                            control={control}
                            rules={{
                              required: t("superAdmin.tasks.titleRequired"),
                            }}
                            render={({
                              field: { onChange, onBlur, value },
                            }) => (
                              <>
                                <TextInput
                                  label={`${t("superAdmin.tasks.taskTitle")} *`}
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
                            rules={{
                              required: t(
                                "superAdmin.tasks.descriptionRequired"
                              ),
                            }}
                            render={({
                              field: { onChange, onBlur, value },
                            }) => (
                              <>
                                <TextInput
                                  label={`${t("superAdmin.tasks.description")} *`}
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
                            <Text style={styles.cardTitle}>
                              {t("superAdmin.tasks.taskDetails")}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.cardContent}>
                          <Text style={styles.inputLabel}>
                            {t("superAdmin.tasks.deadline")} *
                          </Text>
                          {Platform.OS === "web" ? (
                            <View style={styles.webDateInputContainer}>
                              <input
                                type="date"
                                value={format(deadline, "yyyy-MM-dd")}
                                onChange={handleDateChange}
                                style={{
                                  width: "100%",
                                  padding: "10px",
                                  fontSize: "16px",
                                  borderRadius: "4px",
                                  border: "1px solid #e2e8f0",
                                  outline: "none",
                                }}
                                min={format(new Date(), "yyyy-MM-dd")}
                              />
                            </View>
                          ) : (
                            <>
                              <Button
                                mode="outlined"
                                onPress={() => setShowDatePicker(true)}
                                style={styles.dateButton}
                                icon="calendar"
                              >
                                {format(deadline, "MMMM d, yyyy")}
                              </Button>

                              {showDatePicker && (
                                <DateTimePickerModal
                                  isVisible={showDatePicker}
                                  mode="date"
                                  onConfirm={(date) => {
                                    setValue("deadline", date);
                                    setShowDatePicker(false);
                                  }}
                                  onCancel={() => setShowDatePicker(false)}
                                  minimumDate={new Date()}
                                />
                              )}
                            </>
                          )}

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
                                    secondaryContainer:
                                      theme.colors.primaryContainer,
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
                              required: t(
                                "superAdmin.tasks.reminderDaysRequired"
                              ),
                              validate: (value) =>
                                !isNaN(parseInt(value)) &&
                                parseInt(value) >= 0 &&
                                parseInt(value) <= 365
                                  ? true
                                  : t("superAdmin.tasks.reminderDaysRange"),
                            }}
                            render={({
                              field: { onChange, onBlur, value },
                            }) => (
                              <>
                                <TextInput
                                  label={`${t("superAdmin.tasks.reminderDays")} *`}
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
                            <Text style={styles.cardTitle}>
                              {t("superAdmin.tasks.assignUsers")}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.cardContent}>
                          <Text style={styles.helperText}>
                            {t("superAdmin.tasks.selectAdminsToAssign")}
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

              <Surface style={styles.bottomBar}>
                <View style={styles.bottomBarContent}>
                  <Button
                    mode="outlined"
                    onPress={() => navigation.goBack()}
                    style={[styles.button, styles.cancelButton]}
                    disabled={loading}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleSubmit(onSubmit)}
                    style={[styles.button, styles.saveButton]}
                    loading={loading}
                    disabled={loading}
                  >
                    {t("superAdmin.tasks.createTask")}
                  </Button>
                </View>
              </Surface>
            </KeyboardAvoidingView>

            {/* Company Selection Modal */}
            <Portal>
              <Modal
                visible={menuVisible}
                onDismiss={() => setMenuVisible(false)}
                contentContainerStyle={styles.modalContainer}
              >
                <Surface style={styles.modalSurface}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                      {t("superAdmin.tasks.selectCompany")}
                    </Text>
                    <IconButton
                      icon="close"
                      onPress={() => setMenuVisible(false)}
                    />
                  </View>
                  <Divider />

                  <ScrollView style={styles.companyOptionsContainer}>
                    {companies.map((company) => (
                      <TouchableOpacity
                        key={company.id}
                        style={[
                          styles.companyOption,
                          selectedCompany?.id === company.id &&
                            styles.selectedCompanyOption,
                        ]}
                        onPress={() => {
                          setSelectedCompany(company);
                          setMenuVisible(false);
                        }}
                      >
                        <View style={styles.companyOptionContent}>
                          <View style={styles.companyIconContainer}>
                            <IconButton
                              icon="office-building"
                              size={20}
                              iconColor={
                                selectedCompany?.id === company.id
                                  ? theme.colors.primary
                                  : "#64748b"
                              }
                              style={{ margin: 0 }}
                            />
                          </View>
                          <View style={styles.companyTextContainer}>
                            <Text
                              style={[
                                styles.companyName,
                                selectedCompany?.id === company.id && {
                                  color: theme.colors.primary,
                                },
                              ]}
                            >
                              {company.company_name}
                            </Text>
                          </View>
                        </View>

                        {selectedCompany?.id === company.id && (
                          <IconButton
                            icon="check"
                            size={20}
                            iconColor={theme.colors.primary}
                          />
                        )}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </Surface>
              </Modal>
            </Portal>
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
          </>
        )}
      </TaskActivityLogger>
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
    padding: 24,
    paddingBottom: 40,
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
    marginBottom: 12,
    backgroundColor: "#FFFFFF",
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
    marginBottom: 12,
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
    gap: 8,
  },
  userChip: {
    marginBottom: 8,
  },
  companySelector: {
    marginBottom: 16,
    zIndex: 1000,
  },
  companyButton: {
    width: "100%",
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
    maxWidth: 1400,
    marginHorizontal: "auto",
    width: "100%",
  },
  button: {
    minWidth: 120,
  },
  cancelButton: {},
  saveButton: {},
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
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
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
  companyOptionsContainer: {
    maxHeight: 400,
    padding: 12,
  },
  companyOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    marginVertical: 6,
    backgroundColor: "#f8fafc",
  },
  selectedCompanyOption: {
    backgroundColor: "#f0f9ff",
  },
  companyOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  companyIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  companyTextContainer: {
    flex: 1,
  },
  companyName: {
    fontSize: 15,
    fontFamily: "Poppins-Medium",
    color: "#334155",
  },
  webDateInputContainer: {
    marginBottom: 16,
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
