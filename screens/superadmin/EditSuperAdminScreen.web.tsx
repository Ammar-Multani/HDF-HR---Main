import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  AppState,
  AppStateStatus,
  Dimensions,
  TouchableOpacity,
  Text as RNText,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Switch,
  Snackbar,
  HelperText,
  Banner,
  Surface,
  IconButton,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useForm, Controller } from "react-hook-form";
import {
  supabase,
  cachedQuery,
  clearCache,
  isNetworkAvailable,
} from "../../lib/supabase";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import { UserStatus } from "../../types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";

type EditSuperAdminRouteParams = {
  adminId: string;
};

interface AdminFormData {
  name: string;
  email: string;
  phone_number: string;
  status: boolean; // true for active, false for inactive
}

// Admin interface
interface Admin {
  id: string;
  name?: string;
  email: string;
  phone_number?: string;
  status?: boolean;
  role: string;
  created_at: string;
  last_login?: string;
  profile_picture?: string;
}

// Add interface for alert config
interface AlertConfig {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  isDestructive: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// Add interface for CustomAlert props
interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

// Add CustomAlert component
const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
}) => {
  if (!visible) return null;

  return (
    <View style={modalStyles.modalOverlay}>
      <View style={modalStyles.modalContent}>
        <RNText style={modalStyles.modalTitle}>{title}</RNText>
        <RNText style={modalStyles.modalMessage}>{message}</RNText>
        <View style={modalStyles.modalButtons}>
          <TouchableOpacity
            style={[modalStyles.modalButton, modalStyles.modalCancelButton]}
            onPress={onCancel}
          >
            <RNText style={modalStyles.modalButtonText}>{cancelText}</RNText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              modalStyles.modalButton,
              modalStyles.modalConfirmButton,
              isDestructive && modalStyles.modalDestructiveButton,
            ]}
            onPress={onConfirm}
          >
            <RNText
              style={[
                modalStyles.modalButtonText,
                modalStyles.modalConfirmText,
                isDestructive && modalStyles.modalDestructiveText,
              ]}
            >
              {confirmText}
            </RNText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

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

const EditSuperAdminScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<Record<string, EditSuperAdminRouteParams>, string>>();
  const { adminId } = route.params;
  const dimensions = useWindowDimensions();

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [networkStatus, setNetworkStatus] = useState<boolean | null>(true);
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    isDestructive: false,
    onConfirm: () => {},
    onCancel: () => {},
  });

  const {
    control,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<AdminFormData>({
    defaultValues: {
      name: "",
      email: "",
      phone_number: "",
      status: true,
    },
  });

  // Current form values
  const statusValue = watch("status");

  // Check network status
  const checkNetworkStatus = useCallback(async () => {
    try {
      const isAvailable = await isNetworkAvailable();
      setNetworkStatus(isAvailable);
      return isAvailable;
    } catch (e) {
      console.warn("Error checking network status:", e);
      // Default to assuming we're online if check fails
      return true;
    }
  }, []);

  useEffect(() => {
    // Check network on mount
    checkNetworkStatus();

    // Set up AppState listener to recheck when app comes to foreground
    const subscription = AppState.addEventListener(
      "change",
      async (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          await checkNetworkStatus();
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [checkNetworkStatus]);

  // Fetch admin details
  const fetchAdminDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check network status first
      const isNetworkAvailable = await checkNetworkStatus();

      // Create a unique cache key for this admin
      const cacheKey = `admin_edit_${adminId}`;

      // Define the async function to fetch admin data
      const fetchAdminData = async () => {
        console.log(`Fetching admin data for ID: ${adminId}`);
        const { data, error } = await supabase
          .from("admin")
          .select("*")
          .eq("id", adminId)
          .single();

        if (error) {
          console.error("Error in supabase query:", error);
          throw error;
        }

        return { data, error };
      };

      // Use the cached query
      const result = await cachedQuery<any>(fetchAdminData, cacheKey, {
        forceRefresh: !isNetworkAvailable, // Force refresh if online
        cacheTtl: 5 * 60 * 1000, // 5 minute cache for edit view
        criticalData: true, // Mark as critical data for offline fallback
      });

      // Check for error
      if (result.error && !result.data) {
        throw new Error(
          result.error.message || "Failed to fetch admin details"
        );
      }

      // Set admin data
      setAdmin(result.data);

      // Convert status to boolean if it's a string
      const statusBoolean =
        typeof result.data.status === "boolean"
          ? result.data.status
          : result.data.status === "active";

      // Set form values
      setValue("name", result.data.name || "");
      setValue("email", result.data.email || "");
      setValue("phone_number", result.data.phone_number || "");
      setValue("status", statusBoolean);

      // Check if we're using stale data
      if (result.fromCache && networkStatus === false) {
        setError(
          "You're viewing cached data. Some information may be outdated."
        );
      }
    } catch (error: any) {
      console.error("Error fetching admin details:", error);
      setError(error.message || "Failed to load admin details");
    } finally {
      setLoading(false);
    }
  }, [adminId, checkNetworkStatus, networkStatus, setValue]);

  useEffect(() => {
    fetchAdminDetails();
  }, [fetchAdminDetails]);

  // Add handleStatusToggle function
  const handleStatusToggle = (newValue: boolean) => {
    if (Platform.OS === "web") {
      setAlertConfig({
        title: `${newValue ? "Activate" : "Deactivate"} Admin`,
        message: `Are you sure you want to ${newValue ? "activate" : "deactivate"} ${admin?.name || admin?.email || "this admin"}?`,
        onConfirm: () => {
          setValue("status", newValue);
          setShowAlert(false);
        },
        onCancel: () => setShowAlert(false),
        confirmText: newValue ? "Activate" : "Deactivate",
        cancelText: "Cancel",
        isDestructive: !newValue,
      });
      setShowAlert(true);
    } else {
      Alert.alert(
        `${newValue ? "Activate" : "Deactivate"} Admin`,
        `Are you sure you want to ${newValue ? "activate" : "deactivate"} ${admin?.name || admin?.email || "this admin"}?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: newValue ? "Activate" : "Deactivate",
            style: !newValue ? "destructive" : "default",
            onPress: () => setValue("status", newValue),
          },
        ]
      );
    }
  };

  // Form submission handler
  const onSubmit = async (data: AdminFormData) => {
    if (!admin) return;

    try {
      // Check network availability first
      const isAvailable = await isNetworkAvailable();
      if (!isAvailable) {
        if (Platform.OS === "web") {
          setAlertConfig({
            title: "Network Unavailable",
            message:
              "Cannot update admin while offline. Please try again when you have an internet connection.",
            onConfirm: () => setShowAlert(false),
            onCancel: () => setShowAlert(false),
            confirmText: "OK",
            cancelText: "Cancel",
            isDestructive: false,
          });
          setShowAlert(true);
        } else {
          Alert.alert(
            "Network Unavailable",
            "Cannot update admin while offline. Please try again when you have an internet connection.",
            [{ text: "OK" }]
          );
        }
        return;
      }

      setSubmitting(true);

      // Check if email was changed
      const isEmailChanged = data.email !== admin.email;

      // Confirm email change if needed
      if (isEmailChanged) {
        const confirmed = await new Promise<boolean>((resolve) => {
          if (Platform.OS === "web") {
            setAlertConfig({
              title: "Change Email Address",
              message:
                "Changing the email address will require the admin to verify their new email. Continue?",
              onConfirm: () => {
                setShowAlert(false);
                resolve(true);
              },
              onCancel: () => {
                setShowAlert(false);
                resolve(false);
              },
              confirmText: "Continue",
              cancelText: "Cancel",
              isDestructive: false,
            });
            setShowAlert(true);
          } else {
            Alert.alert(
              "Change Email Address",
              "Changing the email address will require the admin to verify their new email. Continue?",
              [
                {
                  text: "Cancel",
                  onPress: () => resolve(false),
                  style: "cancel",
                },
                {
                  text: "Continue",
                  onPress: () => resolve(true),
                },
              ]
            );
          }
        });

        if (!confirmed) {
          setSubmitting(false);
          return;
        }
      }

      // Update admin record with boolean status
      const { error } = await supabase
        .from("admin")
        .update({
          name: data.name,
          phone_number: data.phone_number,
          status: data.status, // Store as boolean
        })
        .eq("id", adminId);

      if (error) {
        throw error;
      }

      // Handle email update if changed
      if (isEmailChanged) {
        // Update email in auth
        const { error: authError } = await supabase.auth.admin.updateUserById(
          adminId,
          { email: data.email }
        );

        if (authError) {
          throw authError;
        }

        // Update email in admin table
        const { error: emailError } = await supabase
          .from("admin")
          .update({ email: data.email })
          .eq("id", adminId);

        if (emailError) {
          throw emailError;
        }
      }

      // Clear cache for this admin
      await clearCache(`admin_edit_${adminId}`);
      await clearCache(`admin_details_${adminId}`);
      await clearCache(`admins_*`); // Clear admin list caches

      setSnackbarMessage("Admin updated successfully");
      setSnackbarVisible(true);

      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error: any) {
      console.error("Error updating admin:", error);
      if (Platform.OS === "web") {
        setAlertConfig({
          title: "Error",
          message: error.message || "Failed to update admin",
          onConfirm: () => setShowAlert(false),
          onCancel: () => setShowAlert(false),
          confirmText: "OK",
          cancelText: "Cancel",
          isDestructive: false,
        });
        setShowAlert(true);
      } else {
        setSnackbarMessage(error.message || "Failed to update admin");
        setSnackbarVisible(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <AppHeader
          title="Edit Super Admin"
          showBackButton={true}
          showLogo={false}
        />
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  // Render error state
  if (error && !admin) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <AppHeader
          title="Edit Super Admin"
          showBackButton={true}
          showLogo={false}
        />
        <View style={styles.errorContainer}>
          <Text style={{ color: theme.colors.error }}>{error}</Text>
          <Button
            mode="contained"
            onPress={fetchAdminDetails}
            style={styles.button}
          >
            Retry
          </Button>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={[styles.button, { marginTop: 8 }]}
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
      <CustomAlert
        visible={showAlert}
        title={alertConfig.title}
        message={alertConfig.message}
        onConfirm={alertConfig.onConfirm}
        onCancel={() => setShowAlert(false)}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        isDestructive={alertConfig.isDestructive}
      />
      <AppHeader
        title="Edit Super Admin"
        showBackButton={true}
        showLogo={false}
      />

      {networkStatus === false && (
        <Banner
          visible={true}
          icon="wifi-off"
          actions={[{ label: "Refresh", onPress: checkNetworkStatus }]}
        >
          You are currently offline. Some features may be limited.
        </Banner>
      )}

      {error && (
        <Banner
          visible={true}
          icon="alert-circle"
          actions={[{ label: "Refresh", onPress: fetchAdminDetails }]}
        >
          {error}
        </Banner>
      )}

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
          <View style={styles.gridContainer}>
            <View style={styles.gridColumn}>
              <Animated.View entering={FadeIn.delay(100)}>
                <Surface style={styles.formCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <View style={styles.iconContainer}>
                        <IconButton
                          icon="account-edit"
                          size={20}
                          iconColor="#64748b"
                          style={styles.headerIcon}
                        />
                      </View>
                      <Text style={styles.cardTitle}>Admin Information</Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <Controller
                      control={control}
                      rules={{ required: "Name is required" }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label="Name *"
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          error={!!errors.name}
                          style={styles.input}
                          disabled={submitting}
                        />
                      )}
                      name="name"
                    />
                    {errors.name && (
                      <HelperText type="error">
                        {errors.name.message}
                      </HelperText>
                    )}

                    <Controller
                      control={control}
                      rules={{
                        required: "Email is required",
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: "Invalid email address",
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label="Email *"
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          error={!!errors.email}
                          style={styles.input}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          disabled={submitting}
                        />
                      )}
                      name="email"
                    />
                    {errors.email && (
                      <HelperText type="error">
                        {errors.email.message}
                      </HelperText>
                    )}

                    <Controller
                      control={control}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label="Phone Number"
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          style={styles.input}
                          keyboardType="phone-pad"
                          disabled={submitting}
                        />
                      )}
                      name="phone_number"
                    />
                  </View>
                </Surface>

                <Surface style={[styles.formCard, { marginTop: 24 }]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <View style={styles.iconContainer}>
                        <IconButton
                          icon="account-check"
                          size={20}
                          iconColor="#64748b"
                          style={styles.headerIcon}
                        />
                      </View>
                      <Text style={styles.cardTitle}>Admin Status</Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <View style={styles.statusToggleContainer}>
                      <Text style={styles.statusToggleLabel}>
                        Admin is {statusValue ? "Active" : "Inactive"}
                      </Text>
                      <Controller
                        control={control}
                        render={({ field: { value } }) => (
                          <Switch
                            value={value}
                            onValueChange={handleStatusToggle}
                            disabled={submitting}
                          />
                        )}
                        name="status"
                      />
                    </View>

                    <Text style={styles.helperText}>
                      {statusValue
                        ? "Admin is currently active and can access the system."
                        : "Admin is currently inactive and cannot access the system."}
                    </Text>
                  </View>
                </Surface>

                <View style={styles.bottomBarContent}>
                  <Button
                    mode="outlined"
                    onPress={() => navigation.goBack()}
                    style={styles.button}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleSubmit(onSubmit)}
                    style={styles.button}
                    loading={submitting}
                    disabled={submitting || !networkStatus}
                    buttonColor={theme.colors.primary}
                  >
                    Update Admin
                  </Button>
                </View>
              </Animated.View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: "OK",
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
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
  statusToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingVertical: 8,
  },
  statusToggleLabel: {
    fontSize: 16,
    color: "#1e293b",
    fontFamily: "Poppins-Medium",
  },
  helperText: {
    fontSize: 14,
    color: "#64748b",
    fontFamily: "Poppins-Regular",
    marginTop: 4,
  },
  bottomBarContent: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  button: {
    minWidth: 120,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
});

// Add separate styles for modal
const modalStyles = StyleSheet.create({
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: "#64748b",
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    minWidth: 80,
    alignItems: "center",
  },
  modalCancelButton: {
    backgroundColor: "#f1f5f9",
  },
  modalConfirmButton: {
    backgroundColor: "#3b82f6",
  },
  modalDestructiveButton: {
    backgroundColor: "#ef4444",
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b",
  },
  modalConfirmText: {
    color: "#ffffff",
  },
  modalDestructiveText: {
    color: "#ffffff",
  },
});

export default EditSuperAdminScreen;
