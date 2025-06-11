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
  useWindowDimensions,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Switch,
  Snackbar,
  HelperText,
  Surface,
  IconButton,
  Card,
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
import Animated, { FadeIn } from "react-native-reanimated";
import CustomSnackbar from "../../components/CustomSnackbar";
import { t, useTranslation } from "i18next";
import { ActivityType } from "../../types/activity-log";
import { useAuth } from "../../contexts/AuthContext";

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

// Update CustomAlert component with translations
const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = t("common.confirm"),
  cancelText = t("common.cancel"),
  isDestructive = false,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>{title}</Text>
        <Text style={styles.modalMessage}>{message}</Text>
        <View style={styles.modalButtons}>
          <TouchableOpacity
            style={[styles.modalButton, styles.modalCancelButton]}
            onPress={onCancel}
          >
            <Text style={styles.modalButtonText}>{cancelText}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modalButton,
              styles.modalConfirmButton,
              isDestructive && styles.modalDestructiveButton,
            ]}
            onPress={onConfirm}
          >
            <Text
              style={[
                styles.modalButtonText,
                styles.modalConfirmText,
                isDestructive && styles.modalDestructiveText,
              ]}
            >
              {confirmText}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const EditCompanyAdminScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<Record<string, EditCompanyAdminRouteParams>, string>>();
  const { adminId } = route.params;
  const dimensions = useWindowDimensions();
  const { t } = useTranslation();
  const { user } = useAuth();

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [admin, setAdmin] = useState<CompanyAdmin | null>(null);
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
        console.log(`Fetching company admin data for ID: ${adminId}`);
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
      console.log(
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

  // Handle status toggle for string values with web alert
  const handleStatusToggle = (newValue: string) => {
    if (Platform.OS === "web") {
      setAlertConfig({
        title:
          newValue === "active"
            ? t("superAdmin.companyAdmin.activateTitle")
            : t("superAdmin.companyAdmin.deactivateTitle"),
        message:
          newValue === "active"
            ? t("superAdmin.companyAdmin.activateMessage")
            : t("superAdmin.companyAdmin.deactivateMessage"),
        onConfirm: () => {
          setValue("active_status", newValue);
          setShowAlert(false);
        },
        onCancel: () => setShowAlert(false),
        confirmText: t("common.confirm"),
        cancelText: t("common.cancel"),
        isDestructive: newValue !== "active",
      });
      setShowAlert(true);
    } else {
      Alert.alert(
        newValue === "active"
          ? t("superAdmin.companyAdmin.activateTitle")
          : t("superAdmin.companyAdmin.deactivateTitle"),
        newValue === "active"
          ? t("superAdmin.companyAdmin.activateMessage")
          : t("superAdmin.companyAdmin.deactivateMessage"),
        [
          {
            text: t("common.cancel"),
            style: "cancel",
          },
          {
            text: t("common.confirm"),
            onPress: () => setValue("active_status", newValue),
          },
        ]
      );
    }
  };

  // Add helper function to compare and track changes
  const compareAndTrackChange = (
    oldValue: any,
    newValue: any,
    fieldName: string,
    changes: string[]
  ) => {
    if (oldValue !== newValue && newValue !== undefined) {
      changes.push(`${fieldName}`);
    }
  };

  // Update form submission to include activity logging
  const onSubmit = async (data: CompanyAdminFormData) => {
    if (!admin) return;

    try {
      // Check network availability first
      const isAvailable = await isNetworkAvailable();
      if (!isAvailable) {
        if (Platform.OS === "web") {
          setAlertConfig({
            title: t("common.error"),
            message: t("superAdmin.companyAdmin.offlineUpdateError"),
            onConfirm: () => setShowAlert(false),
            onCancel: () => setShowAlert(false),
            confirmText: t("common.ok"),
            cancelText: t("common.cancel"),
            isDestructive: false,
          });
          setShowAlert(true);
        } else {
          Alert.alert(
            t("common.error"),
            t("superAdmin.companyAdmin.offlineUpdateError"),
            [{ text: t("common.ok") }]
          );
        }
        return;
      }

      setSubmitting(true);

      // Track changes
      const changes: string[] = [];
      compareAndTrackChange(
        admin.first_name,
        data.first_name,
        "first name",
        changes
      );
      compareAndTrackChange(
        admin.last_name,
        data.last_name,
        "last name",
        changes
      );
      compareAndTrackChange(admin.email, data.email, "email", changes);
      compareAndTrackChange(
        admin.phone_number,
        data.phone_number,
        "phone number",
        changes
      );
      compareAndTrackChange(
        admin.job_title,
        data.job_title,
        "job title",
        changes
      );
      compareAndTrackChange(
        admin.active_status,
        data.active_status,
        "status",
        changes
      );

      // If no changes were made, show message and return
      if (changes.length === 0) {
        setSnackbarMessage("No changes detected");
        setSnackbarVisible(true);
        setSubmitting(false);
        return;
      }

      // Check if email was changed
      const isEmailChanged = data.email !== admin.email;

      // Confirm email change if needed
      if (isEmailChanged) {
        const confirmed = await new Promise<boolean>((resolve) => {
          if (Platform.OS === "web") {
            setAlertConfig({
              title: t("superAdmin.companyAdmin.changeEmailTitle"),
              message: t("superAdmin.companyAdmin.changeEmailMessage"),
              onConfirm: () => {
                setShowAlert(false);
                resolve(true);
              },
              onCancel: () => {
                setShowAlert(false);
                resolve(false);
              },
              confirmText: t("common.continue"),
              cancelText: t("common.cancel"),
              isDestructive: false,
            });
            setShowAlert(true);
          } else {
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
          }
        });

        if (!confirmed) {
          setSubmitting(false);
          return;
        }
      }

      // Get creator's details from admin table
      const { data: creatorDetails, error: creatorError } = await supabase
        .from("admin")
        .select("id, name, email")
        .eq("email", user?.email)
        .single();

      if (creatorError) {
        console.error("Error fetching creator details:", creatorError);
      }

      const creatorName = creatorDetails?.name || user?.email || "";

      // Prepare update data
      const updateData = {
        first_name: data.first_name,
        last_name: data.last_name,
        phone_number: data.phone_number,
        job_title: data.job_title,
        active_status: data.active_status,
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

      // Log the activity
      const activityLogData = {
        user_id: user?.id,
        activity_type: ActivityType.UPDATE_COMPANY_ADMIN,
        description: `Company admin "${data.first_name} ${data.last_name}" was updated`,
        company_id: admin.company_id,
        metadata: {
          updated_by: {
            id: user?.id || "",
            name: creatorName,
            email: user?.email || "",
            role: "superadmin",
          },
          admin: {
            id: adminId,
            name: `${data.first_name} ${data.last_name}`,
            email: data.email,
            role: "admin",
          },
          company: admin.company
            ? {
                id: admin.company_id,
                name: admin.company.company_name,
              }
            : undefined,
          changes,
        },
        old_value: {
          first_name: admin.first_name,
          last_name: admin.last_name,
          email: admin.email,
          phone_number: admin.phone_number,
          job_title: admin.job_title,
          active_status: admin.active_status,
        },
        new_value: {
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone_number: data.phone_number,
          job_title: data.job_title,
          active_status: data.active_status,
        },
      };

      const { error: logError } = await supabase
        .from("activity_logs")
        .insert([activityLogData]);

      if (logError) {
        console.error("Error logging activity:", logError);
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
      if (Platform.OS === "web") {
        setAlertConfig({
          title: t("common.error"),
          message: error.message || t("superAdmin.companyAdmin.updateError"),
          onConfirm: () => setShowAlert(false),
          onCancel: () => setShowAlert(false),
          confirmText: t("common.ok"),
          cancelText: t("common.cancel"),
          isDestructive: false,
        });
        setShowAlert(true);
      } else {
        setSnackbarMessage(
          error.message || t("superAdmin.companyAdmin.updateError")
        );
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
        title={t("superAdmin.companyAdmin.editAdmin")}
        showBackButton={true}
        showLogo={false}
      />

      {networkStatus === false && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>{t("common.offline")}</Text>
        </View>
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
                <Surface style={styles.detailsCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <View style={styles.iconContainer}>
                        <IconButton
                          icon="account"
                          size={20}
                          iconColor="#64748b"
                          style={styles.headerIcon}
                        />
                      </View>
                      <Text style={styles.cardTitle}>
                        {t("superAdmin.companyAdmin.basicInformation")}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
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

                    <Controller
                      control={control}
                      name="first_name"
                      rules={{
                        required: t(
                          "superAdmin.companyAdmin.firstNameRequired"
                        ),
                        minLength: {
                          value: 2,
                          message: t("superAdmin.companyAdmin.nameMinLength"),
                        },
                        maxLength: {
                          value: 50,
                          message: t("superAdmin.companyAdmin.nameMaxLength"),
                        },
                        pattern: {
                          value: /^[a-zA-Z\s\-']+$/,
                          message: t(
                            "superAdmin.companyAdmin.nameInvalidChars"
                          ),
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={`${t("superAdmin.companyAdmin.firstName")} *`}
                          mode="outlined"
                          value={value}
                          onChangeText={(text) =>
                            onChange(text.replace(/[^a-zA-Z\s\-']/g, ""))
                          }
                          onBlur={onBlur}
                          error={!!errors.first_name}
                          style={styles.input}
                          disabled={submitting}
                        />
                      )}
                    />
                    {errors.first_name && (
                      <HelperText type="error">
                        {errors.first_name.message}
                      </HelperText>
                    )}

                    <Controller
                      control={control}
                      name="last_name"
                      rules={{
                        required: t("superAdmin.companyAdmin.lastNameRequired"),
                        minLength: {
                          value: 2,
                          message: t("superAdmin.companyAdmin.nameMinLength"),
                        },
                        maxLength: {
                          value: 50,
                          message: t("superAdmin.companyAdmin.nameMaxLength"),
                        },
                        pattern: {
                          value: /^[a-zA-Z\s\-']+$/,
                          message: t(
                            "superAdmin.companyAdmin.nameInvalidChars"
                          ),
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={`${t("superAdmin.companyAdmin.lastName")} *`}
                          mode="outlined"
                          value={value}
                          onChangeText={(text) =>
                            onChange(text.replace(/[^a-zA-Z\s\-']/g, ""))
                          }
                          onBlur={onBlur}
                          error={!!errors.last_name}
                          style={styles.input}
                          disabled={submitting}
                        />
                      )}
                    />
                    {errors.last_name && (
                      <HelperText type="error">
                        {errors.last_name.message}
                      </HelperText>
                    )}

                    <Controller
                      control={control}
                      name="email"
                      rules={{
                        required: t("superAdmin.companyAdmin.emailRequired"),
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: t("superAdmin.companyAdmin.invalidEmail"),
                        },
                        validate: (value) => {
                          const emailParts = value.split("@");
                          if (
                            emailParts.length !== 2 ||
                            !emailParts[1].includes(".") ||
                            emailParts[1].length < 3
                          ) {
                            return t(
                              "superAdmin.companyAdmin.invalidEmailDomain"
                            );
                          }
                          return true;
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={`${t("superAdmin.companyAdmin.email")} *`}
                          mode="outlined"
                          value={value}
                          onChangeText={(text) => onChange(text.toLowerCase())}
                          onBlur={onBlur}
                          error={!!errors.email}
                          style={styles.input}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          disabled={submitting}
                        />
                      )}
                    />
                    {errors.email && (
                      <HelperText type="error">
                        {errors.email.message}
                      </HelperText>
                    )}
                  </View>
                </Surface>
              </Animated.View>
            </View>

            <View style={styles.gridColumn}>
              <Animated.View entering={FadeIn.delay(200)}>
                <Surface style={styles.detailsCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <View style={styles.iconContainer}>
                        <IconButton
                          icon="account-details"
                          size={20}
                          iconColor="#64748b"
                          style={styles.headerIcon}
                        />
                      </View>
                      <Text style={styles.cardTitle}>
                        {t("superAdmin.companyAdmin.additionalDetails")}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <Controller
                      control={control}
                      name="phone_number"
                      rules={{
                        pattern: {
                          value: /^\+?[0-9]{8,15}$/,
                          message: t(
                            "superAdmin.companyAdmin.phoneNumberInvalidFormat"
                          ),
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={t("superAdmin.companyAdmin.phoneNumber")}
                          mode="outlined"
                          value={value}
                          onChangeText={(text) =>
                            onChange(text.replace(/[^0-9+]/g, ""))
                          }
                          onBlur={onBlur}
                          error={!!errors.phone_number}
                          style={styles.input}
                          keyboardType="phone-pad"
                          disabled={submitting}
                        />
                      )}
                    />
                    {errors.phone_number && (
                      <HelperText type="error">
                        {errors.phone_number.message}
                      </HelperText>
                    )}

                    <Controller
                      control={control}
                      name="job_title"
                      rules={{
                        minLength: {
                          value: 2,
                          message: t(
                            "superAdmin.companyAdmin.jobTitleMinLength"
                          ),
                        },
                        maxLength: {
                          value: 50,
                          message: t(
                            "superAdmin.companyAdmin.jobTitleMaxLength"
                          ),
                        },
                        pattern: {
                          value: /^[a-zA-Z\s\-&.]+$/,
                          message: t(
                            "superAdmin.companyAdmin.jobTitleInvalidChars"
                          ),
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={t("superAdmin.companyAdmin.jobTitle")}
                          mode="outlined"
                          value={value}
                          onChangeText={(text) =>
                            onChange(text.replace(/[^a-zA-Z\s\-&.]/g, ""))
                          }
                          onBlur={onBlur}
                          error={!!errors.job_title}
                          style={styles.input}
                          disabled={submitting}
                        />
                      )}
                    />
                    {errors.job_title && (
                      <HelperText type="error">
                        {errors.job_title.message}
                      </HelperText>
                    )}

                    <View style={styles.statusSection}>
                      <Text style={styles.sectionTitle}>
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
                                handleStatusToggle(
                                  isActive ? "active" : "inactive"
                                )
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
                    </View>
                  </View>
                </Surface>
              </Animated.View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Surface style={styles.bottomBar}>
        <View style={styles.bottomBarContent}>
          <View style={styles.actionButtons}>
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
              style={[styles.button, { backgroundColor: theme.colors.primary }]}
              loading={submitting}
              disabled={submitting || !networkStatus}
            >
              {t("superAdmin.companyAdmin.updateAdmin")}
            </Button>
          </View>
        </View>
      </Surface>

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
  companyContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  companyLabel: {
    fontSize: 14,
    color: "#64748b",
    fontFamily: "Poppins-Medium",
    marginRight: 8,
  },
  companyName: {
    fontSize: 14,
    color: "#1e293b",
    fontFamily: "Poppins-SemiBold",
  },
  input: {
    marginBottom: 16,
    backgroundColor: "#ffffff",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    fontFamily: "Poppins-SemiBold",
    marginBottom: 16,
  },
  statusSection: {
    marginTop: 24,
  },
  statusToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingVertical: 8,
  },
  statusToggleLabel: {
    fontSize: 14,
    color: "#64748b",
    fontFamily: "Poppins-Medium",
  },
  helperText: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
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
  actionButtons: {
    flexDirection: "row",
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
  offlineBanner: {
    backgroundColor: "rgba(239, 68, 68, 0.9)",
    padding: 8,
    alignItems: "center",
  },
  offlineText: {
    color: "white",
    fontFamily: "Poppins-Medium",
  },
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
