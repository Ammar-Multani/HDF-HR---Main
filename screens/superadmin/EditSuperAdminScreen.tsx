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
import CustomSnackbar from "../../components/CustomSnackbar";

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
  status?: boolean | string;
  role: string;
  created_at: string;
  last_login?: string;
  profile_picture?: string;
}

const EditSuperAdminScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<Record<string, EditSuperAdminRouteParams>, string>>();
  const { adminId } = route.params;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [networkStatus, setNetworkStatus] = useState<boolean | null>(true);

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

      // Convert status to boolean
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

  // Handle status toggle
  const handleStatusToggle = (newValue: boolean) => {
    const action = newValue ? "activate" : "deactivate";

    Alert.alert(
      `${newValue ? "Activate" : "Deactivate"} Admin`,
      `Are you sure you want to ${action} this admin?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Confirm",
          onPress: () => setValue("status", newValue),
        },
      ]
    );
  };

  // Form submission handler
  const onSubmit = async (data: AdminFormData) => {
    if (!admin) return;

    try {
      // Check network availability first
      const isAvailable = await isNetworkAvailable();
      if (!isAvailable) {
        Alert.alert(
          "Network Unavailable",
          "Cannot update admin while offline. Please try again when you have an internet connection.",
          [{ text: "OK" }]
        );
        return;
      }

      setSubmitting(true);

      // Check if email was changed
      const isEmailChanged = data.email !== admin.email;

      // Confirm email change if needed
      if (isEmailChanged) {
        const confirmed = await new Promise<boolean>((resolve) => {
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
        });

        if (!confirmed) {
          setSubmitting(false);
          return;
        }
      }

      // Update admin record
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
      setSnackbarMessage(error.message || "Failed to update admin");
      setSnackbarVisible(true);
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
          contentContainerStyle={styles.scrollContent}
        >
          <Text
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            Admin Information
          </Text>

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
            <HelperText type="error">{errors.name.message}</HelperText>
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
            <HelperText type="error">{errors.email.message}</HelperText>
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

          <Text
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            Admin Status
          </Text>

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

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            style={[
              styles.submitButton,
              { backgroundColor: "rgba(54,105,157,1)" },
            ]}
            loading={submitting}
            disabled={submitting || !networkStatus}
          >
            Update Admin
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
    fontFamily: "Poppins-SemiBold",
  },
  input: {
    marginBottom: 12,
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
    marginTop: 4,
    marginBottom: 24,
  },
  submitButton: {
    marginTop: 16,
    paddingVertical: 6,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  button: {
    marginTop: 16,
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

export default EditSuperAdminScreen;
