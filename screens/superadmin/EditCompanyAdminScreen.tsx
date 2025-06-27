import React, { useState, useEffect, useCallback } from "react";
import { logDebug } from "../../utils/logger";
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
import { t } from "i18next";

type EditCompanyAdminRouteParams = {
  adminId: string;
};

interface CompanyAdminFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  job_title: string;
  active_status: string; // 'active' or 'inactive'
}

// Company Admin interface
interface CompanyAdmin {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  company_id: string;
  company?: {
    company_name: string;
  };
  role: string;
  job_title?: string;
  active_status?: string;
  created_at: string;
}

const EditCompanyAdminScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<Record<string, EditCompanyAdminRouteParams>, string>>();
  const { adminId } = route.params;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [admin, setAdmin] = useState<CompanyAdmin | null>(null);
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
  } = useForm<CompanyAdminFormData>({
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone_number: "",
      job_title: "",
      active_status: "active",
    },
  });

  // Current form values
  const statusValue = watch("active_status");

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
      const cacheKey = `company_admin_edit_${adminId}`;

      // Define the async function to fetch admin data
      const fetchAdminData = async () => {
        logDebug(`Fetching company admin data for ID: ${adminId}`);
        const { data, error } = await supabase
          .from("company_user")
          .select("*, company:company_id(company_name)")
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
        forceRefresh: isNetworkAvailable, // Force refresh if online
        cacheTtl: 5 * 60 * 1000, // 5 minute cache for edit view
        criticalData: true, // Mark as critical data for offline fallback
      });

      // Check for error
      if (result.error && !result.data) {
        throw new Error(
          result.error.message || "Failed to fetch company admin details"
        );
      }

      // Set admin data
      setAdmin(result.data);
      logDebug(
        "Company admin data received:",
        JSON.stringify(result.data, null, 2)
      );

      // Set form values using string status
      setValue("first_name", result.data.first_name || "");
      setValue("last_name", result.data.last_name || "");
      setValue("email", result.data.email || "");
      setValue("phone_number", result.data.phone_number || "");
      setValue("job_title", result.data.job_title || "");
      setValue("active_status", result.data.active_status || "active");

      // Check if we're using stale data
      if (result.fromCache && networkStatus === false) {
        setError(
          "You're viewing cached data. Some information may be outdated."
        );
      }
    } catch (error: any) {
      console.error("Error fetching company admin details:", error);
      setError(error.message || "Failed to load company admin details");
    } finally {
      setLoading(false);
    }
  }, [adminId, checkNetworkStatus, networkStatus, setValue]);

  useEffect(() => {
    fetchAdminDetails();
  }, [fetchAdminDetails]);

  // Handle status toggle for string values
  const handleStatusToggle = (newValue: string) => {
    Alert.alert(
      `${newValue === "active" ? "Activate" : "Deactivate"} Company Admin`,
      `Are you sure you want to ${newValue === "active" ? "activate" : "deactivate"} this company admin?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Confirm",
          onPress: () => setValue("active_status", newValue),
        },
      ]
    );
  };

  // Form submission handler
  const onSubmit = async (data: CompanyAdminFormData) => {
    if (!admin) return;

    try {
      // Check network availability first
      const isAvailable = await isNetworkAvailable();
      if (!isAvailable) {
        Alert.alert(
          t("common.error"),
          t("superAdmin.companyAdmin.offlineUpdateError"),
          [{ text: t("common.ok") }]
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
            t("superAdmin.companyAdmin.changeEmailTitle"),
            t("superAdmin.companyAdmin.changeEmailMessage"),
            [
              {
                text: t("common.cancel"),
                onPress: () => resolve(false),
                style: "cancel",
              },
              {
                text: t("common.continue"),
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

      // Prepare update data
      const updateData = {
        first_name: data.first_name,
        last_name: data.last_name,
        phone_number: data.phone_number,
        job_title: data.job_title,
        active_status: data.active_status, // Store as string
      };

      // Update admin record
      const { error } = await supabase
        .from("company_user")
        .update(updateData)
        .eq("id", adminId);

      if (error) {
        throw error;
      }

      // Handle email update if changed
      if (isEmailChanged) {
        // Get auth_id from company_user table
        const { data: userData, error: userError } = await supabase
          .from("company_user")
          .select("auth_id")
          .eq("id", adminId)
          .single();

        if (userError) {
          throw userError;
        }

        if (userData && userData.auth_id) {
          // Update email in auth
          const { error: authError } = await supabase.auth.admin.updateUserById(
            userData.auth_id,
            { email: data.email }
          );

          if (authError) {
            throw authError;
          }
        }

        // Update email in company_user table
        const { error: emailError } = await supabase
          .from("company_user")
          .update({ email: data.email })
          .eq("id", adminId);

        if (emailError) {
          throw emailError;
        }
      }

      // Clear cache for this admin
      await clearCache(`company_admin_edit_${adminId}`);
      await clearCache(`company_admin_details_${adminId}`);
      await clearCache(`company_admins_*`); // Clear admin list caches

      setSnackbarMessage(t("superAdmin.companyAdmin.updateSuccess"));
      setSnackbarVisible(true);

      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error: any) {
      console.error("Error updating company admin:", error);
      setSnackbarMessage(
        error.message || t("superAdmin.companyAdmin.updateError")
      );
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
          title={t("superAdmin.companyAdmin.editAdmin")}
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
          title={t("superAdmin.companyAdmin.editAdmin")}
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
            {t("common.retry")}
          </Button>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={[styles.button, { marginTop: 8 }]}
          >
            {t("common.goBack")}
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
        title={t("superAdmin.companyAdmin.editAdmin")}
        showBackButton={true}
        showLogo={false}
      />

      {networkStatus === false && (
        <Banner
          visible={true}
          icon="wifi-off"
          actions={[
            { label: t("common.refresh"), onPress: checkNetworkStatus },
          ]}
        >
          {t("common.offline")}
        </Banner>
      )}

      {error && (
        <Banner
          visible={true}
          icon="alert-circle"
          actions={[{ label: t("common.refresh"), onPress: fetchAdminDetails }]}
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
          {admin?.company && (
            <View style={styles.companyContainer}>
              <Text style={styles.companyLabel}>
                {t("superAdmin.companies.company")}:
              </Text>
              <Text style={styles.companyName}>
                {admin.company.company_name}
              </Text>
            </View>
          )}

          <Text
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            {t("superAdmin.companyAdmin.adminInformation")}
          </Text>

          <Controller
            control={control}
            rules={{ required: t("superAdmin.companyAdmin.firstNameRequired") }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={`${t("superAdmin.companyAdmin.firstName")} *`}
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.first_name}
                style={styles.input}
                disabled={submitting}
              />
            )}
            name="first_name"
          />
          {errors.first_name && (
            <HelperText type="error">{errors.first_name.message}</HelperText>
          )}

          <Controller
            control={control}
            rules={{ required: t("superAdmin.companyAdmin.lastNameRequired") }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={`${t("superAdmin.companyAdmin.lastName")} *`}
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.last_name}
                style={styles.input}
                disabled={submitting}
              />
            )}
            name="last_name"
          />
          {errors.last_name && (
            <HelperText type="error">{errors.last_name.message}</HelperText>
          )}

          <Controller
            control={control}
            rules={{
              required: t("superAdmin.companyAdmin.emailRequired"),
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: t("superAdmin.companyAdmin.validEmail"),
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={`${t("superAdmin.companyAdmin.email")} *`}
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
                label={t("superAdmin.companyAdmin.phoneNumber")}
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

          <Controller
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={t("superAdmin.companyAdmin.jobTitle")}
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                style={styles.input}
                disabled={submitting}
              />
            )}
            name="job_title"
          />

          <Text
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            {t("superAdmin.companyAdmin.status")}
          </Text>

          <View style={styles.statusToggleContainer}>
            <Text style={styles.statusToggleLabel}>
              {t("superAdmin.companyAdmin.adminStatus", {
                status:
                  statusValue === "active"
                    ? t("common.active")
                    : t("common.inactive"),
              })}
            </Text>
            <Controller
              control={control}
              render={({ field: { value } }) => (
                <Switch
                  value={value === "active"}
                  onValueChange={(isActive) =>
                    handleStatusToggle(isActive ? "active" : "inactive")
                  }
                  disabled={submitting}
                />
              )}
              name="active_status"
            />
          </View>

          <Text style={styles.helperText}>
            {statusValue === "active"
              ? t("superAdmin.companyAdmin.activeHelperText")
              : t("superAdmin.companyAdmin.inactiveHelperText")}
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
            {t("superAdmin.companyAdmin.updateAdmin")}
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
  companyContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(54,105,157,0.1)",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  companyLabel: {
    fontSize: 16,
    fontWeight: "bold",
    marginRight: 8,
  },
  companyName: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "rgba(54,105,157,1)",
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

export default EditCompanyAdminScreen;
