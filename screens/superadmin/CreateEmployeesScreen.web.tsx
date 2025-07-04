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
  useWindowDimensions,
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
  Divider,
  Surface,
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
import CompanySelector from "../../components/CompanySelector";
import {
  Gender,
  MaritalStatus,
  IDType,
  EmploymentType,
  UserRole,
  UserStatus,
} from "../../types";
import { ActivityType } from "../../types/activity-log";
import { hashPassword, generateResetToken } from "../../utils/auth";
import {
  sendCompanyAdminInviteEmail,
  sendEmployeeWelcomeEmail,
} from "../../utils/emailService";
import { generateWelcomeEmail } from "../../utils/emailTemplates";
import Constants from "expo-constants";
import CustomSnackbar from "../../components/CustomSnackbar";
import { t } from "i18next";

interface EmployeeFormData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  nationality: string;
  date_of_birth: string;
  marital_status: string;
  gender: string;
  employment_start_date: string;
  employment_end_date?: string;
  employment_type: string;
  workload_percentage: string;
  job_title: string;
  address_line1: string;
  address_line2?: string;
  address_city: string;
  address_state: string;
  address_postal_code: string;
  address_country: string;
  bank_details?: string;
  iban?: string;
  swift_code?: string;
  comments?: string;
  ahv_number?: string;
  education?: string;
}

// Add Company interface
interface Company {
  id: string;
  company_name: string;
  active: boolean;
}

const CreateEmployeeScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const dimensions = useWindowDimensions();

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

  const [loading, setLoading] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [errorBannerVisible, setErrorBannerVisible] = useState(false);
  const [errorBannerMessage, setErrorBannerMessage] = useState("");
  const [isOnline, setIsOnline] = useState(true);

  const defaultValues = {
    email: "",
    password: "",
    first_name: "",
    last_name: "",
    phone_number: "",
    nationality: "",
    date_of_birth: new Date().toISOString(),
    marital_status: "",
    gender: "",
    employment_start_date: new Date().toISOString(),
    employment_end_date: undefined,
    employment_type: "full_time",
    workload_percentage: "100",
    job_title: "",
    address_line1: "",
    address_line2: "",
    address_city: "",
    address_state: "",
    address_postal_code: "",
    address_country: "",
    bank_details: "",
    iban: "",
    swift_code: "",
    comments: "",
    ahv_number: "",
    education: "",
  };

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<EmployeeFormData>({
    defaultValues,
    mode: "onChange",
  });

  const email = watch("email");
  const password = watch("password");
  const firstName = watch("first_name");
  const lastName = watch("last_name");
  const dateOfBirth = watch("date_of_birth");
  const employmentStartDate = watch("employment_start_date");

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

  useEffect(() => {
    if (email && firstName && lastName) {
      // Any initialization logic here
    }
  }, [email, firstName, lastName]);

  const handleDobChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setValue("date_of_birth", selectedDate.toISOString());
    }
  };

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setValue("employment_start_date", selectedDate.toISOString());
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setValue("employment_end_date", selectedDate.toISOString());
    }
  };

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      // Check network connectivity first
      const networkAvailable = await isNetworkAvailable();
      if (!networkAvailable) {
        setErrorBannerMessage(t("superAdmin.employees.offlineError"));
        setErrorBannerVisible(true);
        return;
      }

      if (!user || !selectedCompany?.id) {
        setSnackbarMessage(t("superAdmin.employees.userInfoNotAvailable"));
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
        setSnackbarMessage(t("superAdmin.employees.invalidWorkloadPercentage"));
        setSnackbarVisible(true);
        setLoading(false);
        return;
      }

      // Call the Edge Function to create employee
      const { data: responseData, error: functionError } =
        await supabase.functions.invoke("user-management", {
          body: {
            action: "create_employee",
            email: data.email.toLowerCase().trim(),
            password: data.password,
            company_id: selectedCompany.id,
            created_by: user.id,
            first_name: data.first_name,
            last_name: data.last_name,
            phone_number: data.phone_number,
            nationality: data.nationality,
            date_of_birth: data.date_of_birth,
            marital_status: data.marital_status,
            gender: data.gender,
            employment_start_date: data.employment_start_date,
            employment_end_date: data.employment_end_date,
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
            iban: data.iban || null,
            swift_code: data.swift_code || null,
            comments: data.comments || null,
            ahv_number: data.ahv_number || null,
            education: data.education || null,
          },
        });

      if (functionError || !responseData?.user) {
        console.error(
          "Error creating employee:",
          functionError || "No user data returned"
        );
        throw new Error(
          functionError?.message || "Failed to create user: Unknown error"
        );
      }

      // Log activity
      const { error: activityError } = await supabase
        .from("activity_logs")
        .insert({
          user_id: user.id,
          activity_type: "CREATE_EMPLOYEE",
          description: `Employee ${data.first_name} ${data.last_name} (${data.email}) was created in company "${selectedCompany.company_name}"`,
          company_id: selectedCompany.id,
          metadata: {
            created_by: {
              id: user.id,
              email: user.email,
              role: "super_admin",
            },
            employee: {
              id: responseData.user.id,
              email: data.email,
              first_name: data.first_name,
              last_name: data.last_name,
            },
            company: {
              id: selectedCompany.id,
              name: selectedCompany.company_name,
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
            employment_start_date: data.employment_start_date,
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
          selectedCompany.company_name,
          data.first_name,
          data.last_name
        );

      if (!emailSent) {
        console.error("Error sending welcome email:", emailError);
      }

      setSnackbarMessage(
        emailSent
          ? t("superAdmin.employees.createSuccess")
          : t("superAdmin.employees.createSuccessButEmailFailed")
      );
      setSnackbarVisible(true);
      navigation.goBack();
    } catch (error) {
      console.error("Error in employee creation:", error);
      setSnackbarMessage(
        t("superAdmin.employees.createError", {
          error:
            error instanceof Error ? error.message : t("common.unknownError"),
        })
      );
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader
        title={t("superAdmin.employees.createEmployee")}
        showBackButton={true}
        showHelpButton={true}
        onHelpPress={() => {
          navigation.navigate("Help" as never);
        }}
        showLogo={false}
      />

      {/* Network status banner */}
      <Banner
        visible={!isOnline}
        icon="wifi-off"
        actions={[
          {
            label: t("common.retry"),
            onPress: async () => {
              const networkAvailable = await isNetworkAvailable();
              setIsOnline(networkAvailable);
            },
          },
        ]}
      >
        {t("common.offline")}
      </Banner>

      {/* Error banner for important errors */}
      <Banner
        visible={errorBannerVisible}
        icon="alert"
        actions={[
          {
            label: t("common.dismiss"),
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
              {/* Company Selection Card */}
              <Animated.View entering={FadeIn.delay(100)}>
                <Surface style={styles.detailsCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <View style={styles.iconContainer}>
                        <IconButton
                          icon="office-building"
                          size={20}
                          iconColor="#64748b"
                          style={styles.headerIcon}
                        />
                      </View>
                      <Text style={styles.cardTitle}>
                        {t("superAdmin.employees.companySelection")}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <CompanySelector
                      onSelect={setSelectedCompany}
                      selectedCompany={selectedCompany}
                      required={true}
                      label={t("superAdmin.employees.selectCompany")}
                    />
                  </View>
                </Surface>
              </Animated.View>

              {/* Personal Information Card */}
              <Animated.View entering={FadeIn.delay(200)}>
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
                        {t("superAdmin.employees.personalInformation")}
                      </Text>
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
                              "superAdmin.employees.firstNameRequired"
                            ),
                            minLength: {
                              value: 2,
                              message: t("superAdmin.employees.nameMinLength"),
                            },
                            maxLength: {
                              value: 50,
                              message: t("superAdmin.employees.nameMaxLength"),
                            },
                            pattern: {
                              value: /^[a-zA-Z\s\-']+$/,
                              message: t(
                                "superAdmin.employees.nameInvalidChars"
                              ),
                            },
                          }}
                          render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                              label={`${t("superAdmin.employees.firstName")} *`}
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
                              "superAdmin.employees.lastNameRequired"
                            ),
                            minLength: {
                              value: 2,
                              message: t("superAdmin.employees.nameMinLength"),
                            },
                            maxLength: {
                              value: 50,
                              message: t("superAdmin.employees.nameMaxLength"),
                            },
                            pattern: {
                              value: /^[a-zA-Z\s\-']+$/,
                              message: t(
                                "superAdmin.employees.nameInvalidChars"
                              ),
                            },
                          }}
                          render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                              label={`${t("superAdmin.employees.lastName")} *`}
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
                        pattern: {
                          value: /^\+?[0-9]{8,15}$/,
                          message: t(
                            "superAdmin.employees.phoneNumberInvalidFormat"
                          ),
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={t("superAdmin.employees.phoneNumber")}
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

                    <Text style={styles.inputLabel}>
                      {t("superAdmin.employees.dateOfBirth")} *
                    </Text>
                    <Button
                      mode="outlined"
                      onPress={() => setShowDobPicker(true)}
                      style={styles.dateButton}
                      icon="calendar"
                    >
                      {format(new Date(dateOfBirth), "MMMM d, yyyy")}
                    </Button>

                    {showDobPicker && (
                      <DateTimePicker
                        value={new Date(dateOfBirth)}
                        mode="date"
                        display="default"
                        onChange={handleDobChange}
                        maximumDate={new Date()}
                      />
                    )}

                    <Text style={styles.inputLabel}>
                      {t("superAdmin.employees.gender")} *
                    </Text>
                    <Controller
                      control={control}
                      render={({ field: { onChange, value } }) => (
                        <SegmentedButtons
                          value={value}
                          onValueChange={onChange}
                          buttons={[
                            {
                              value: Gender.MALE,
                              label: t("superAdmin.employees.male"),
                            },
                            {
                              value: Gender.FEMALE,
                              label: t("superAdmin.employees.female"),
                            },
                            {
                              value: Gender.OTHER,
                              label: t("superAdmin.employees.other"),
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
                      name="gender"
                    />

                    <Controller
                      control={control}
                      name="nationality"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={t("superAdmin.employees.nationality")}
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          style={styles.input}
                          disabled={loading}
                        />
                      )}
                    />
                  </View>
                </Surface>
              </Animated.View>

              {/* Employment Details Card */}
              <Animated.View entering={FadeIn.delay(300)}>
                <Surface style={styles.detailsCard}>
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
                      <Text style={styles.cardTitle}>
                        {t("superAdmin.employees.employmentDetails")}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <Controller
                      control={control}
                      name="job_title"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={t("superAdmin.employees.jobTitle")}
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
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
                        validate: (value) =>
                          !value ||
                          (!isNaN(parseInt(value)) &&
                            parseInt(value) > 0 &&
                            parseInt(value) <= 100) ||
                          t("superAdmin.employees.workloadPercentageInvalid"),
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={t("superAdmin.employees.workloadPercentage")}
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
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
                      {format(new Date(employmentStartDate), "MMMM d, yyyy")}
                    </Button>

                    {showStartDatePicker && (
                      <DateTimePicker
                        value={new Date(employmentStartDate)}
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
              {/* Bank Details Card */}
              <Animated.View entering={FadeIn.delay(400)}>
                <Surface style={styles.detailsCard}>
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
                      <Text style={styles.cardTitle}>
                        {t("superAdmin.employees.bankDetails")}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
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
                      render={({ field: { onChange, value } }) => (
                        <>
                          <TextInput
                            label="IBAN"
                            value={value}
                            onChangeText={(text) => {
                              const stripped = text
                                .replace(/\s/g, "")
                                .toUpperCase();
                              const formatted = stripped
                                .replace(/(.{4})/g, "$1 ")
                                .trim();
                              onChange(formatted);
                            }}
                            error={!!errors.iban}
                            style={styles.input}
                            autoCapitalize="characters"
                            placeholder="e.g., ES91 2100 0418 4502 0005 1332"
                          />
                          {errors.iban && (
                            <HelperText type="error" style={styles.errorText}>
                              {errors.iban.message}
                            </HelperText>
                          )}
                        </>
                      )}
                    />

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
                      render={({ field: { onChange, value } }) => (
                        <>
                          <TextInput
                            label="SWIFT/BIC Code"
                            value={value}
                            onChangeText={(text) =>
                              onChange(text.toUpperCase())
                            }
                            error={!!errors.swift_code}
                            style={styles.input}
                            autoCapitalize="characters"
                            placeholder="e.g., BOFAUS3N"
                          />
                          {errors.swift_code && (
                            <HelperText type="error" style={styles.errorText}>
                              {errors.swift_code.message}
                            </HelperText>
                          )}
                        </>
                      )}
                    />

                    <Controller
                      control={control}
                      name="bank_details"
                      render={({ field: { onChange, value } }) => (
                        <TextInput
                          label="Additional Bank Details"
                          value={value}
                          onChangeText={onChange}
                          style={styles.input}
                          multiline
                          numberOfLines={1}
                          placeholder="Any additional bank information"
                        />
                      )}
                    />
                  </View>
                </Surface>
              </Animated.View>
              {/* Account Details Card */}
              <Animated.View entering={FadeIn.delay(400)}>
                <Surface style={styles.detailsCard}>
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
                        {t("superAdmin.employees.accountDetails")}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <Controller
                      control={control}
                      name="email"
                      rules={{
                        required: t("superAdmin.employees.emailRequired"),
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: t("superAdmin.employees.invalidEmail"),
                        },
                        validate: (value) => {
                          const emailParts = value.split("@");
                          if (
                            emailParts.length !== 2 ||
                            !emailParts[1].includes(".") ||
                            emailParts[1].length < 3
                          ) {
                            return t("superAdmin.employees.invalidEmailDomain");
                          }
                          return true;
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={`${t("superAdmin.employees.email")} *`}
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
                        required: t("superAdmin.employees.passwordRequired"),
                        minLength: {
                          value: 8,
                          message: t("superAdmin.employees.passwordMinLength"),
                        },
                        pattern: {
                          value:
                            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
                          message: t(
                            "superAdmin.employees.passwordComplexityRequirements"
                          ),
                        },
                        validate: (value) => {
                          if (value.includes(" ")) {
                            return t("superAdmin.employees.passwordNoSpaces");
                          }
                          if (/(.)\1{2,}/.test(value)) {
                            return t(
                              "superAdmin.employees.passwordNoRepeatingChars"
                            );
                          }
                          return true;
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={`${t("superAdmin.employees.password")} *`}
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
                      {t("superAdmin.employees.inviteEmailHelper")}
                    </Text>
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
              disabled={loading}
            >
              {t("common.cancel")}
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              style={[
                styles.button,
                {
                  backgroundColor:
                    loading || !selectedCompany
                      ? theme.colors.surfaceDisabled
                      : theme.colors.primary,
                },
              ]}
              loading={loading}
              disabled={loading || !selectedCompany}
            >
              {t("superAdmin.employees.createEmployee")}
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
    fontWeight: "600",
    color: "#1e293b",
    fontFamily: "Poppins-SemiBold",
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
    color: "white",
  },
  dateButton: {
    marginBottom: 16,
  },
  segmentedButtons: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.7,
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
  errorText: {
    color: "#dc2626",
    marginTop: -12,
    marginBottom: 8,
  },
  helperText: {
    color: "#64748b",
    marginTop: -12,
    marginBottom: 16,
    fontSize: 12,
  },
});

export default CreateEmployeeScreen;
