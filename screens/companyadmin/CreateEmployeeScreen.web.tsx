import React, { useState, useEffect, useCallback, useMemo } from "react";
import { logDebug } from "../../utils/logger";
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
  SegmentedButtons,
  Snackbar,
  HelperText,
  Banner,
  Switch,
  IconButton,
  Surface,
  Divider,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useForm, Controller } from "react-hook-form";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { supabase, cachedQuery, isNetworkAvailable } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import Animated, { FadeIn } from "react-native-reanimated";
import { getFontFamily } from "../../utils/globalStyles";
import {
  Gender,
  MaritalStatus,
  IDType,
  EmploymentType,
  UserRole,
  UserStatus,
  ActivityType,
} from "../../types";
import { hashPassword, generateResetToken } from "../../utils/auth";
import { sendEmployeeWelcomeEmail } from "../../utils/emailService";
import { generateWelcomeEmail } from "../../utils/emailTemplates";
import CustomSnackbar from "../../components/CustomSnackbar";
import { t } from "i18next";
import HelpGuideModal from "../../components/HelpGuideModal";

interface EmployeeFormData {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  date_of_birth: Date;
  gender: Gender;
  nationality: string;
  marital_status: MaritalStatus;
  id_type: IDType;
  ahv_number: string;
  job_title: string;
  employment_type: EmploymentType;
  workload_percentage: string;
  employment_start_date: Date;
  employment_end_date?: Date;
  education: string;
  address_line1: string;
  address_line2: string;
  address_city: string;
  address_state: string;
  address_postal_code: string;
  address_country: string;
  bank_name: string;
  account_number: string;
  iban: string;
  swift_code: string;
  comments: string;
  bank_details?: string;
  is_admin: boolean;
  password: string;
}

// Update the interfaces for company data structure
interface CompanyDetails {
  company_name: string;
}

interface CompanyUserResponse {
  company_id: string;
  company: {
    company_name: string;
  };
}

interface CompanyData {
  company_id: string;
  company_name: string;
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

const CreateEmployeeScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const dimensions = useWindowDimensions();

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState<string>("");
  const [companyIdLoading, setCompanyIdLoading] = useState(true);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [errorBannerVisible, setErrorBannerVisible] = useState(false);
  const [errorBannerMessage, setErrorBannerMessage] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [helpModalVisible, setHelpModalVisible] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<EmployeeFormData>({
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      phone_number: "",
      date_of_birth: new Date(1990, 0, 1),
      gender: Gender.MALE,
      nationality: "",
      marital_status: MaritalStatus.SINGLE,
      id_type: IDType.ID_CARD,
      ahv_number: "",
      job_title: "",
      employment_type: EmploymentType.FULL_TIME,
      workload_percentage: "100",
      employment_start_date: new Date(),
      education: "",
      address_line1: "",
      address_line2: "",
      address_city: "",
      address_state: "",
      address_postal_code: "",
      address_country: "",
      bank_name: "",
      account_number: "",
      iban: "",
      swift_code: "",
      comments: "",
      is_admin: false,
      password: "",
    },
  });

  const dateOfBirth = watch("date_of_birth");
  const employmentStartDate = watch("employment_start_date");
  const isAdmin = watch("is_admin");

  // Check network status periodically
  useEffect(() => {
    const checkNetworkStatus = async () => {
      const networkAvailable = await isNetworkAvailable();
      setIsOnline(networkAvailable);
    };

    // Check immediately
    checkNetworkStatus();

    // Set up interval to check network periodically
    const intervalId = setInterval(checkNetworkStatus, 10000);
    return () => clearInterval(intervalId);
  }, []);

  // Update the fetchCompanyId function with proper typing
  const fetchCompanyId = useCallback(async () => {
    if (!user) return;

    setCompanyIdLoading(true);
    try {
      const cacheKey = `company_data_${user.id}`;

      const fetchData = async () => {
        const { data, error } = await supabase
          .from("company_user")
          .select(
            `
            company_id,
            company:company_id (
              company_name
            )
          `
          )
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching company data:", error);
          return { data: null as CompanyData | null, error };
        }

        // Type assertion for the response data
        const responseData = data as unknown as CompanyUserResponse;

        const companyData: CompanyData = {
          company_id: responseData.company_id,
          company_name: responseData.company.company_name,
        };

        return { data: companyData, error: null };
      };

      const result = await cachedQuery(fetchData, cacheKey, {
        cacheTtl: 24 * 60 * 60 * 1000,
        criticalData: true,
      });

      if (result.error) {
        console.error("Error fetching company data:", result.error);
        return;
      }

      if (result.data) {
        setCompanyId(result.data.company_id);
        setCompanyName(result.data.company_name);
      }
    } catch (error) {
      console.error("Error fetching company data:", error);
    } finally {
      setCompanyIdLoading(false);
    }
  }, [user]);

  // Start fetching company ID immediately when component mounts
  useEffect(() => {
    fetchCompanyId();
  }, [fetchCompanyId]);

  const handleDobChange = (event: any, selectedDate?: Date) => {
    setShowDobPicker(false);
    if (selectedDate) {
      setValue("date_of_birth", selectedDate);
    }
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(false);
    if (selectedDate) {
      setValue("employment_start_date", selectedDate);
    }
  };

  // Confirm admin role change handler
  const handleAdminToggle = (newValue: boolean) => {
    if (newValue) {
      // If turning on admin privileges, confirm with the user
      Alert.alert(
        "Confirm Admin Privileges",
        "This will grant full administrative access to this employee. They will be able to manage company settings, employees, and other admin functions. Are you sure?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Confirm",
            onPress: () => setValue("is_admin", true),
          },
        ]
      );
    } else {
      // If turning off, no confirmation needed
      setValue("is_admin", false);
    }
  };

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      // Check network connectivity first
      const networkAvailable = await isNetworkAvailable();
      if (!networkAvailable) {
        setErrorBannerMessage(t("companyAdmin.employees.offlineError"));
        setErrorBannerVisible(true);
        return;
      }

      if (!user || !companyId) {
        setSnackbarMessage(t("companyAdmin.employees.userInfoNotAvailable"));
        setSnackbarVisible(true);
        return;
      }

      setLoading(true);
      setSnackbarVisible(false);
      setErrorBannerVisible(false);

      // Validate workload percentage
      const workloadPercentage = parseInt(data.workload_percentage);
      if (
        isNaN(workloadPercentage) ||
        workloadPercentage <= 0 ||
        workloadPercentage > 100
      ) {
        setSnackbarMessage(
          t("companyAdmin.employees.invalidWorkloadPercentage")
        );
        setSnackbarVisible(true);
        setLoading(false);
        return;
      }

      // Call the Edge Function to create employee with all required fields
      const { data: responseData, error: functionError } =
        await supabase.functions.invoke("user-management", {
          body: {
            action: "create_employee",
            email: data.email.toLowerCase().trim(),
            password: data.password,
            company_id: companyId,
            created_by: user.id,
            first_name: data.first_name,
            last_name: data.last_name,
            phone_number: data.phone_number,
            nationality: data.nationality,
            date_of_birth: data.date_of_birth?.toISOString(),
            marital_status: data.marital_status,
            gender: data.gender,
            employment_start_date: data.employment_start_date?.toISOString(),
            employment_end_date:
              data.employment_end_date?.toISOString() || null,
            employment_type: data.employment_type === "full_time",
            workload_percentage: workloadPercentage,
            job_title: data.job_title,
            address: {
              line1: data.address_line1,
              line2: data.address_line2 || null,
              city: data.address_city,
              state: data.address_state,
              postal_code: data.address_postal_code,
              country: data.address_country,
            },
            bank_details: data.bank_details || null,
            comments: data.comments || null,
            ahv_number: data.ahv_number || null,
            education: data.education || null,
          },
        });

      if (functionError) {
        console.error("Error creating employee:", functionError);
        setSnackbarMessage(
          t("companyAdmin.employees.createError", {
            error: functionError.message || t("common.unknownError"),
          })
        );
        setSnackbarVisible(true);
        setLoading(false);
        return;
      }

      if (!responseData?.user) {
        throw new Error("No user data returned from Edge Function");
      }

      // Log activity
      const { error: activityError } = await supabase
        .from("activity_logs")
        .insert({
          user_id: user.id,
          activity_type: "CREATE_EMPLOYEE",
          description: `Employee ${data.first_name} ${data.last_name} (${data.email}) was created`,
          company_id: companyId,
          metadata: {
            created_by: {
              id: user.id,
              email: user.email,
            },
            employee: {
              id: responseData.user.id,
              email: data.email,
              first_name: data.first_name,
              last_name: data.last_name,
            },
          },
          old_value: null,
          new_value: {
            first_name: data.first_name,
            last_name: data.last_name,
            email: data.email,
            phone_number: data.phone_number,
            job_title: data.job_title,
            employment_type: data.employment_type,
            workload_percentage: workloadPercentage,
            employment_start_date: data.employment_start_date?.toISOString(),
            nationality: data.nationality,
            gender: data.gender,
          },
        });

      if (activityError) {
        console.error("Error logging activity:", activityError);
      }

      // Send welcome email to the employee
      const { success: emailSent, error: emailError } =
        await sendEmployeeWelcomeEmail(
          data.email.toLowerCase().trim(),
          data.password,
          companyName,
          data.first_name,
          data.last_name
        );

      if (!emailSent) {
        console.error("Error sending welcome email:", emailError);
      }

      setSnackbarMessage(
        emailSent
          ? t("companyAdmin.employees.createSuccess")
          : t("companyAdmin.employees.createSuccessButEmailFailed")
      );
      setSnackbarVisible(true);
      navigation.goBack();
    } catch (error) {
      console.error("Error in employee creation:", error);
      setSnackbarMessage(
        t("companyAdmin.employees.createError", {
          error:
            error instanceof Error ? error.message : t("common.unknownError"),
        })
      );
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const helpGuideContent = {
    title: "How to Create an Employee",
    description:
      "Follow these steps to create a new employee account. The system will automatically send an invitation email to the employee with their login credentials.",
    steps: [
      {
        title: "Personal Information",
        icon: "account",
        description:
          "Fill in basic details like name, phone, date of birth, gender, nationality, and marital status.",
      },
      {
        title: "Employment Details",
        icon: "briefcase",
        description:
          "Enter job-related information including job title, employment type, workload percentage, and start date.",
      },
      {
        title: "Account Details",
        icon: "account-key",
        description:
          "Set up login credentials. An invitation email will be sent to the provided email address with login instructions.",
      },
      {
        title: "Address Information",
        icon: "map-marker",
        description:
          "Provide complete residential address details for official records.",
      },
      {
        title: "Bank Details",
        icon: "bank",
        description:
          "Enter banking information for salary payments including bank name, account number, IBAN, and SWIFT code.",
      },
    ],
    note: {
      title: "Important Note",
      content: [
        "After submission, an invitation email will be automatically sent to the employee's email address containing:",
        "Login credentials",
        "Instructions to access the system",
        "Password reset instructions",
        "Please ensure the email address is correct before submitting.",
      ],
    },
  };

  const handleHelpPress = () => {
    setHelpModalVisible(true);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader
        title="Create Employee"
        showBackButton={true}
        showHelpButton={true}
        onHelpPress={handleHelpPress}
        showLogo={false}
      />

      <HelpGuideModal
        visible={helpModalVisible}
        onDismiss={() => setHelpModalVisible(false)}
        title={helpGuideContent.title}
        description={helpGuideContent.description}
        steps={helpGuideContent.steps}
        note={helpGuideContent.note}
      />

      {/* Network status banner */}
      <Banner
        visible={!isOnline}
        icon="wifi-off"
        actions={[
          {
            label: "Retry",
            onPress: async () => {
              const networkAvailable = await isNetworkAvailable();
              setIsOnline(networkAvailable);
            },
          },
        ]}
      >
        You are currently offline. Please check your connection to create a new
        employee.
      </Banner>

      {/* Error banner for important errors */}
      <Banner
        visible={errorBannerVisible}
        icon="alert"
        actions={[
          {
            label: "Dismiss",
            onPress: () => setErrorBannerVisible(false),
          },
        ]}
      >
        {errorBannerMessage}
      </Banner>

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
            <View
              style={[
                styles.gridColumn,
                { flex: isLargeScreen ? 0.48 : isMediumScreen ? 0.48 : 1 },
              ]}
            >
              <Animated.View entering={FadeIn.delay(100)}>
                {/* Personal Information Card */}
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
                      <Text style={styles.cardTitle}>Personal Information</Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <View style={styles.row}>
                      <View style={styles.halfInput}>
                        <Controller
                          control={control}
                          name="first_name"
                          rules={{
                            required: t(
                              "companyAdmin.employees.firstNameRequired"
                            ),
                            minLength: {
                              value: 2,
                              message: t(
                                "companyAdmin.employees.nameMinLength"
                              ),
                            },
                            maxLength: {
                              value: 50,
                              message: t(
                                "companyAdmin.employees.nameMaxLength"
                              ),
                            },
                            pattern: {
                              value: /^[a-zA-Z\s\-']+$/,
                              message: t(
                                "companyAdmin.employees.nameInvalidChars"
                              ),
                            },
                          }}
                          render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                              label="First Name *"
                              mode="outlined"
                              value={value}
                              onChangeText={(text) =>
                                onChange(text.replace(/[^a-zA-Z\s\-']/g, ""))
                              }
                              onBlur={onBlur}
                              error={!!errors.first_name}
                              style={styles.input}
                              disabled={loading}
                            />
                          )}
                        />
                        {errors.first_name && (
                          <HelperText type="error">
                            {errors.first_name.message}
                          </HelperText>
                        )}
                      </View>

                      <View style={styles.halfInput}>
                        <Controller
                          control={control}
                          name="last_name"
                          rules={{
                            required: t(
                              "companyAdmin.employees.lastNameRequired"
                            ),
                            minLength: {
                              value: 2,
                              message: t(
                                "companyAdmin.employees.nameMinLength"
                              ),
                            },
                            maxLength: {
                              value: 50,
                              message: t(
                                "companyAdmin.employees.nameMaxLength"
                              ),
                            },
                            pattern: {
                              value: /^[a-zA-Z\s\-']+$/,
                              message: t(
                                "companyAdmin.employees.nameInvalidChars"
                              ),
                            },
                          }}
                          render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                              label="Last Name *"
                              mode="outlined"
                              value={value}
                              onChangeText={(text) =>
                                onChange(text.replace(/[^a-zA-Z\s\-']/g, ""))
                              }
                              onBlur={onBlur}
                              error={!!errors.last_name}
                              style={styles.input}
                              disabled={loading}
                            />
                          )}
                        />
                        {errors.last_name && (
                          <HelperText type="error">
                            {errors.last_name.message}
                          </HelperText>
                        )}
                      </View>
                    </View>

                    <Controller
                      control={control}
                      name="phone_number"
                      rules={{
                        required: t(
                          "companyAdmin.employees.phoneNumberRequired"
                        ),
                        pattern: {
                          value: /^\+?[0-9]{8,15}$/,
                          message: t(
                            "companyAdmin.employees.phoneNumberInvalidFormat"
                          ),
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label="Phone Number *"
                          mode="outlined"
                          value={value}
                          onChangeText={(text) =>
                            onChange(text.replace(/[^0-9+]/g, ""))
                          }
                          onBlur={onBlur}
                          error={!!errors.phone_number}
                          style={styles.input}
                          keyboardType="phone-pad"
                          disabled={loading}
                        />
                      )}
                    />
                    {errors.phone_number && (
                      <HelperText type="error">
                        {errors.phone_number.message}
                      </HelperText>
                    )}

                    <Text style={styles.inputLabel}>Date of Birth *</Text>
                    <Button
                      mode="outlined"
                      onPress={() => setShowDobPicker(true)}
                      style={styles.dateButton}
                      icon="calendar"
                    >
                      {format(dateOfBirth, "MMMM d, yyyy")}
                    </Button>

                    {showDobPicker && (
                      <DateTimePicker
                        value={dateOfBirth}
                        mode="date"
                        display="default"
                        onChange={handleDobChange}
                        maximumDate={new Date()}
                      />
                    )}

                    <Text style={styles.inputLabel}>Gender *</Text>
                    <Controller
                      control={control}
                      render={({ field: { onChange, value } }) => (
                        <SegmentedButtons
                          value={value}
                          onValueChange={onChange}
                          buttons={[
                            { value: Gender.MALE, label: "Male" },
                            { value: Gender.FEMALE, label: "Female" },
                            { value: Gender.OTHER, label: "Other" },
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
                      name="gender"
                    />

                    <Controller
                      control={control}
                      rules={{ required: "Nationality is required" }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label="Nationality *"
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          error={!!errors.nationality}
                          style={styles.input}
                          disabled={loading}
                        />
                      )}
                      name="nationality"
                    />
                    {errors.nationality && (
                      <HelperText type="error">
                        {errors.nationality.message}
                      </HelperText>
                    )}

                    <Text style={styles.inputLabel}>Marital Status *</Text>
                    <Controller
                      control={control}
                      render={({ field: { onChange, value } }) => (
                        <SegmentedButtons
                          value={value}
                          onValueChange={onChange}
                          buttons={[
                            { value: MaritalStatus.SINGLE, label: "Single" },
                            { value: MaritalStatus.MARRIED, label: "Married" },
                            {
                              value: MaritalStatus.DIVORCED,
                              label: "Divorced",
                            },
                            { value: MaritalStatus.WIDOWED, label: "Widowed" },
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
                      name="marital_status"
                    />
                  </View>
                </Surface>

                {/* Employment Details Card */}
                <Surface style={[styles.detailsCard, { marginTop: 24 }]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <View style={styles.iconContainer}>
                        <IconButton
                          icon="briefcase"
                          size={20}
                          iconColor="#64748b"
                          style={styles.headerIcon}
                        />
                      </View>
                      <Text style={styles.cardTitle}>Employment Details</Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <Controller
                      control={control}
                      name="job_title"
                      rules={{
                        required: t("companyAdmin.employees.jobTitleRequired"),
                        minLength: {
                          value: 2,
                          message: t(
                            "companyAdmin.employees.jobTitleMinLength"
                          ),
                        },
                        maxLength: {
                          value: 50,
                          message: t(
                            "companyAdmin.employees.jobTitleMaxLength"
                          ),
                        },
                        pattern: {
                          value: /^[a-zA-Z\s\-&.]+$/,
                          message: t(
                            "companyAdmin.employees.jobTitleInvalidChars"
                          ),
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label="Job Title *"
                          mode="outlined"
                          value={value}
                          onChangeText={(text) =>
                            onChange(text.replace(/[^a-zA-Z\s\-&.]/g, ""))
                          }
                          onBlur={onBlur}
                          error={!!errors.job_title}
                          style={styles.input}
                          disabled={loading}
                        />
                      )}
                    />
                    {errors.job_title && (
                      <HelperText type="error">
                        {errors.job_title.message}
                      </HelperText>
                    )}

                    <Text style={styles.inputLabel}>Employment Type *</Text>
                    <Controller
                      control={control}
                      render={({ field: { onChange, value } }) => (
                        <SegmentedButtons
                          value={value}
                          onValueChange={onChange}
                          buttons={[
                            {
                              value: EmploymentType.FULL_TIME,
                              label: "Full Time",
                            },
                            {
                              value: EmploymentType.PART_TIME,
                              label: "Part Time",
                            },
                            {
                              value: EmploymentType.CONTRACT,
                              label: "Contract",
                            },
                            {
                              value: EmploymentType.TEMPORARY,
                              label: "Temporary",
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
                      name="employment_type"
                    />

                    <Controller
                      control={control}
                      name="workload_percentage"
                      rules={{
                        required: t("companyAdmin.employees.workloadRequired"),
                        validate: (value) => {
                          const percentage = parseInt(value);
                          if (
                            isNaN(percentage) ||
                            percentage <= 0 ||
                            percentage > 100
                          ) {
                            return t(
                              "companyAdmin.employees.workloadPercentageInvalid"
                            );
                          }
                          return true;
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label="Workload Percentage (%) *"
                          mode="outlined"
                          value={value}
                          onChangeText={(text) =>
                            onChange(text.replace(/[^0-9]/g, ""))
                          }
                          onBlur={onBlur}
                          error={!!errors.workload_percentage}
                          style={styles.input}
                          keyboardType="numeric"
                          disabled={loading}
                        />
                      )}
                    />
                    {errors.workload_percentage && (
                      <HelperText type="error">
                        {errors.workload_percentage.message}
                      </HelperText>
                    )}

                    <Text style={styles.inputLabel}>
                      Employment Start Date *
                    </Text>
                    <Button
                      mode="outlined"
                      onPress={() => setShowStartDatePicker(true)}
                      style={styles.dateButton}
                      icon="calendar"
                    >
                      {format(employmentStartDate, "MMMM d, yyyy")}
                    </Button>

                    {showStartDatePicker && (
                      <DateTimePicker
                        value={employmentStartDate}
                        mode="date"
                        display="default"
                        onChange={handleStartDateChange}
                      />
                    )}
                  </View>
                </Surface>
              </Animated.View>
            </View>

            <View
              style={[
                styles.gridColumn,
                { flex: isLargeScreen ? 0.48 : isMediumScreen ? 0.48 : 1 },
              ]}
            >
              <Animated.View entering={FadeIn.delay(200)}>
                {/* Account Details Card */}
                <Surface style={[styles.detailsCard, { marginTop: 24 }]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <View style={styles.iconContainer}>
                        <IconButton
                          icon="account-key"
                          size={20}
                          iconColor="#64748b"
                          style={styles.headerIcon}
                        />
                      </View>
                      <Text style={styles.cardTitle}>
                        {t("companyAdmin.employees.accountDetails")}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <Controller
                      control={control}
                      name="email"
                      rules={{
                        required: t("companyAdmin.employees.emailRequired"),
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: t("companyAdmin.employees.invalidEmail"),
                        },
                        validate: (value) => {
                          const emailParts = value.split("@");
                          if (
                            emailParts.length !== 2 ||
                            !emailParts[1].includes(".") ||
                            emailParts[1].length < 3
                          ) {
                            return t(
                              "companyAdmin.employees.invalidEmailDomain"
                            );
                          }
                          return true;
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={`${t("companyAdmin.employees.email")} *`}
                          mode="outlined"
                          value={value}
                          onChangeText={(text) => onChange(text.toLowerCase())}
                          onBlur={onBlur}
                          error={!!errors.email}
                          style={styles.input}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          disabled={loading}
                        />
                      )}
                    />
                    {errors.email && (
                      <HelperText type="error">
                        {errors.email.message}
                      </HelperText>
                    )}

                    <Controller
                      control={control}
                      name="password"
                      rules={{
                        required: t("companyAdmin.employees.passwordRequired"),
                        minLength: {
                          value: 8,
                          message: t(
                            "companyAdmin.employees.passwordMinLength"
                          ),
                        },
                        pattern: {
                          value:
                            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
                          message: t(
                            "companyAdmin.employees.passwordComplexityRequirements"
                          ),
                        },
                        validate: (value) => {
                          if (value.includes(" ")) {
                            return t("companyAdmin.employees.passwordNoSpaces");
                          }
                          if (/(.)\1{2,}/.test(value)) {
                            return t(
                              "companyAdmin.employees.passwordNoRepeatingChars"
                            );
                          }
                          return true;
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={`${t("companyAdmin.employees.password")} *`}
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          error={!!errors.password}
                          style={styles.input}
                          secureTextEntry
                          disabled={loading}
                        />
                      )}
                    />
                    {errors.password && (
                      <HelperText type="error">
                        {errors.password.message}
                      </HelperText>
                    )}

                    <Text style={[styles.helperText, { marginBottom: 16 }]}>
                      {t("companyAdmin.employees.inviteEmailHelper")}
                    </Text>

                    {/* <View style={styles.adminToggleContainer}>
                      <Text style={styles.adminToggleLabel}>
                        {t("companyAdmin.employees.grantAdminPrivileges")}
                      </Text>
                      <Switch
                        value={isAdmin}
                        onValueChange={handleAdminToggle}
                        disabled={loading}
                      />
                    </View> */}
                  </View>
                </Surface>

                {/* Address Card */}
                <Surface style={[styles.detailsCard, { marginTop: 24 }]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <View style={styles.iconContainer}>
                        <IconButton
                          icon="map-marker"
                          size={20}
                          iconColor="#64748b"
                          style={styles.headerIcon}
                        />
                      </View>
                      <Text style={styles.cardTitle}>Address</Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <View style={styles.row}>
                      <View style={styles.halfInput}>
                        <Controller
                          control={control}
                          rules={{ required: "Address line 1 is required" }}
                          render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                              label="Address Line 1 *"
                              mode="outlined"
                              value={value}
                              onChangeText={onChange}
                              onBlur={onBlur}
                              error={!!errors.address_line1}
                              style={styles.input}
                              disabled={loading}
                            />
                          )}
                          name="address_line1"
                        />
                        {errors.address_line1 && (
                          <HelperText type="error">
                            {errors.address_line1.message}
                          </HelperText>
                        )}
                      </View>

                      <View style={styles.halfInput}>
                        <Controller
                          control={control}
                          render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                              label="Address Line 2"
                              mode="outlined"
                              value={value}
                              onChangeText={onChange}
                              onBlur={onBlur}
                              style={styles.input}
                              disabled={loading}
                            />
                          )}
                          name="address_line2"
                        />
                      </View>
                    </View>

                    <View style={styles.row}>
                      <View style={styles.halfInput}>
                        <Controller
                          control={control}
                          rules={{ required: "City is required" }}
                          render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                              label="City *"
                              mode="outlined"
                              value={value}
                              onChangeText={onChange}
                              onBlur={onBlur}
                              error={!!errors.address_city}
                              style={styles.input}
                              disabled={loading}
                            />
                          )}
                          name="address_city"
                        />
                        {errors.address_city && (
                          <HelperText type="error">
                            {errors.address_city.message}
                          </HelperText>
                        )}
                      </View>

                      <View style={styles.halfInput}>
                        <Controller
                          control={control}
                          rules={{ required: "State is required" }}
                          render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                              label="State/Province *"
                              mode="outlined"
                              value={value}
                              onChangeText={onChange}
                              onBlur={onBlur}
                              error={!!errors.address_state}
                              style={styles.input}
                              disabled={loading}
                            />
                          )}
                          name="address_state"
                        />
                        {errors.address_state && (
                          <HelperText type="error">
                            {errors.address_state.message}
                          </HelperText>
                        )}
                      </View>
                    </View>

                    <View style={styles.row}>
                      <View style={styles.halfInput}>
                        <Controller
                          control={control}
                          rules={{ required: "Postal code is required" }}
                          render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                              label="Postal Code *"
                              mode="outlined"
                              value={value}
                              onChangeText={onChange}
                              onBlur={onBlur}
                              error={!!errors.address_postal_code}
                              style={styles.input}
                              disabled={loading}
                            />
                          )}
                          name="address_postal_code"
                        />
                        {errors.address_postal_code && (
                          <HelperText type="error">
                            {errors.address_postal_code.message}
                          </HelperText>
                        )}
                      </View>

                      <View style={styles.halfInput}>
                        <Controller
                          control={control}
                          rules={{ required: "Country is required" }}
                          render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                              label="Country *"
                              mode="outlined"
                              value={value}
                              onChangeText={onChange}
                              onBlur={onBlur}
                              error={!!errors.address_country}
                              style={styles.input}
                              disabled={loading}
                            />
                          )}
                          name="address_country"
                        />
                        {errors.address_country && (
                          <HelperText type="error">
                            {errors.address_country.message}
                          </HelperText>
                        )}
                      </View>
                    </View>
                  </View>
                </Surface>

                {/* Bank Details Card */}
                <Surface style={[styles.detailsCard, { marginTop: 24 }]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <View style={styles.iconContainer}>
                        <IconButton
                          icon="bank"
                          size={20}
                          iconColor="#64748b"
                          style={styles.headerIcon}
                        />
                      </View>
                      <Text style={styles.cardTitle}>Bank Details</Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <Controller
                      control={control}
                      name="bank_name"
                      rules={{
                        required: t("companyAdmin.employees.bankNameRequired"),
                        minLength: {
                          value: 2,
                          message: t(
                            "companyAdmin.employees.bankNameMinLength"
                          ),
                        },
                        maxLength: {
                          value: 100,
                          message: t(
                            "companyAdmin.employees.bankNameMaxLength"
                          ),
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={`${t("companyAdmin.employees.bankName")} *`}
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          error={!!errors.bank_name}
                          style={styles.input}
                          disabled={loading}
                        />
                      )}
                    />
                    {errors.bank_name && (
                      <HelperText type="error">
                        {errors.bank_name.message}
                      </HelperText>
                    )}

                    <Controller
                      control={control}
                      name="account_number"
                      rules={{
                        required: t(
                          "companyAdmin.employees.accountNumberRequired"
                        ),
                        pattern: {
                          value: /^[0-9]{5,20}$/,
                          message: t(
                            "companyAdmin.employees.accountNumberInvalidFormat"
                          ),
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label="Account Number *"
                          mode="outlined"
                          value={value}
                          onChangeText={(text) =>
                            onChange(text.replace(/[^0-9]/g, ""))
                          }
                          onBlur={onBlur}
                          error={!!errors.account_number}
                          style={styles.input}
                          disabled={loading}
                        />
                      )}
                    />
                    {errors.account_number && (
                      <HelperText type="error">
                        {errors.account_number.message}
                      </HelperText>
                    )}

                    <Controller
                      control={control}
                      name="iban"
                      rules={{
                        validate: (value) => {
                          if (!value) return true; // Optional field

                          const stripped = value.replace(/\s/g, "");

                          // Simple format check
                          if (!/^[A-Z]{2}/.test(stripped)) {
                            return "Invalid IBAN format: Must start with country code (Example: ES, GB, DE)";
                          }

                          if (stripped.length < 15 || stripped.length > 34) {
                            return "Invalid IBAN format: Length should be between 15-34 characters";
                          }

                          if (!/^[A-Z0-9]+$/.test(stripped)) {
                            return "Invalid IBAN format: Only letters and numbers allowed";
                          }

                          return true;
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label="IBAN"
                          mode="outlined"
                          value={value}
                          onChangeText={(text) => {
                            // Remove any existing spaces first
                            const stripped = text
                              .replace(/\s/g, "")
                              .toUpperCase();
                            // Add a space every 4 characters
                            const formatted = stripped
                              .replace(/(.{4})/g, "$1 ")
                              .trim();
                            onChange(formatted);
                          }}
                          onBlur={onBlur}
                          error={!!errors.iban}
                          style={styles.input}
                          disabled={loading}
                          placeholder="e.g., ES91 2100 0418 4502 0005 1332"
                        />
                      )}
                    />
                    {errors.iban && (
                      <HelperText type="error">
                        {errors.iban.message}
                      </HelperText>
                    )}

                    <Controller
                      control={control}
                      name="swift_code"
                      rules={{
                        validate: (value) => {
                          if (!value) return true; // Optional field

                          const stripped = value.replace(/\s/g, "");

                          if (stripped.length !== 8 && stripped.length !== 11) {
                            return "Invalid SWIFT code format: Must be 8 or 11 characters long";
                          }

                          if (!/^[A-Z]{4}/.test(stripped)) {
                            return "Invalid SWIFT code format: Must start with 4 letter bank code";
                          }

                          if (!/^[A-Z0-9]+$/.test(stripped)) {
                            return "Invalid SWIFT code format: Only letters and numbers allowed";
                          }

                          return true;
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label="SWIFT/BIC Code"
                          mode="outlined"
                          value={value}
                          onChangeText={(text) => onChange(text.toUpperCase())}
                          onBlur={onBlur}
                          error={!!errors.swift_code}
                          style={styles.input}
                          disabled={loading}
                          placeholder="e.g., BOFAUS3N"
                        />
                      )}
                    />
                    {errors.swift_code && (
                      <HelperText type="error">
                        {errors.swift_code.message}
                      </HelperText>
                    )}
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
              style={styles.button}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              style={[
                styles.button,
                {
                  backgroundColor: loading
                    ? theme.colors.surfaceVariant
                    : theme.colors.primary,
                },
              ]}
              loading={loading}
              disabled={loading}
            >
              Create Employee
            </Button>
          </View>
        </Surface>
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
    paddingBottom: 100,
    alignSelf: "center",
    width: "100%",
  },
  gridContainer: {
    flexDirection: "row",
    gap: 24,
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridColumn: {
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
    fontFamily: getFontFamily("600"),
    color: "#1e293b",
  },
  cardContent: {
    padding: 24,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  halfInput: {
    flex: 1,
  },
  input: {
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.7,
    fontFamily: getFontFamily("500"),
    color: "#64748b",
  },
  dateButton: {
    marginBottom: 16,
  },
  segmentedButtons: {
    marginBottom: 16,
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
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  button: {
    minWidth: 120,
  },
  helperText: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
    fontFamily: getFontFamily("normal"),
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  adminToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingVertical: 8,
  },
  adminToggleLabel: {
    fontSize: 16,
    fontFamily: getFontFamily("500"),
    color: "#1e293b",
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
  sectionTitle: {
    fontSize: 18,
    fontFamily: getFontFamily("600"),
    color: "#1e293b",
    marginBottom: 16,
  },
});

export default CreateEmployeeScreen;
