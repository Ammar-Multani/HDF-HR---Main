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
import { sendCompanyAdminInviteEmail } from "../../utils/emailService";
import { generateWelcomeEmail } from "../../utils/emailTemplates";
import Constants from "expo-constants";
import CustomSnackbar from "../../components/CustomSnackbar";
import { t } from "i18next";

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
  is_admin: boolean;
  password: string;
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
      Alert.alert(
        t("superAdmin.employees.confirmAdminTitle"),
        t("superAdmin.employees.confirmAdminMessage"),
        [
          {
            text: t("common.cancel"),
            style: "cancel",
          },
          {
            text: t("common.confirm"),
            onPress: () => setValue("is_admin", true),
          },
        ]
      );
    } else {
      setValue("is_admin", false);
    }
  };

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      // Check for selected company
      if (!selectedCompany) {
        setSnackbarMessage(t("superAdmin.employees.selectCompanyRequired"));
        setSnackbarVisible(true);
        return;
      }

      // Check network connectivity first
      const networkAvailable = await isNetworkAvailable();
      if (!networkAvailable) {
        setErrorBannerMessage(t("superAdmin.employees.offlineError"));
        setErrorBannerVisible(true);
        return;
      }

      if (!user) {
        setSnackbarMessage(t("superAdmin.employees.userInfoNotAvailable"));
        setSnackbarVisible(true);
        return;
      }

      setLoading(true);
      setSnackbarVisible(false);
      setErrorBannerVisible(false);

      // Only validate workload percentage if provided
      if (data.workload_percentage) {
        const workloadPercentage = parseInt(data.workload_percentage);
        if (
          isNaN(workloadPercentage) ||
          workloadPercentage <= 0 ||
          workloadPercentage > 100
        ) {
          setSnackbarMessage(
            t("superAdmin.employees.workloadPercentageInvalid")
          );
          setSnackbarVisible(true);
          setLoading(false);
          return;
        }
      }

      // Validate password
      if (data.password.length < 8) {
        setSnackbarMessage(t("superAdmin.employees.passwordLength"));
        setSnackbarVisible(true);
        setLoading(false);
        return;
      }

      // Validate email domain more thoroughly
      const emailParts = data.email.split("@");
      if (
        emailParts.length !== 2 ||
        !emailParts[1].includes(".") ||
        emailParts[1].length < 3
      ) {
        setSnackbarMessage(t("superAdmin.employees.invalidEmail"));
        setSnackbarVisible(true);
        setLoading(false);
        return;
      }

      // Performance optimization: Hash password in parallel with checking for existing user
      // This avoids the sequential bottleneck
      const [hashedPassword, existingUserResult] = await Promise.all([
        hashPassword(data.password),
        supabase
          .from("users")
          .select("id")
          .eq("email", data.email)
          .maybeSingle(), // Use maybeSingle instead of single to avoid errors
      ]);

      // Check if user already exists
      if (existingUserResult.data) {
        throw new Error("A user with this email already exists");
      }

      // Generate reset token just once - avoid regenerating later
      const resetToken =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      const resetTokenExpiry = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      // First prepare employee data - we'll only insert after user creation succeeds
      const employeeData = {
        company_id: selectedCompany.id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone_number: data.phone_number,
        role: data.is_admin ? UserRole.COMPANY_ADMIN : UserRole.EMPLOYEE,
        active_status: UserStatus.ACTIVE,
        created_by: user.id,
        date_of_birth: data.date_of_birth.toISOString(),
        nationality: data.nationality,
        id_type: data.id_type,
        ahv_number: data.ahv_number,
        marital_status: data.marital_status,
        gender: data.gender,
        employment_start_date: data.employment_start_date.toISOString(),
        employment_type:
          data.employment_type === EmploymentType.FULL_TIME ||
          data.employment_type === EmploymentType.PART_TIME,
        workload_percentage: data.workload_percentage,
        job_title: data.job_title,
        education: data.education,
        address: {
          line1: data.address_line1,
          line2: data.address_line2 || null,
          city: data.address_city,
          state: data.address_state,
          postal_code: data.address_postal_code,
          country: data.address_country,
        },
        bank_details: {
          bank_name: data.bank_name,
          account_number: data.account_number,
          iban: data.iban,
          swift_code: data.swift_code,
        },
        comments: data.comments || null,
      };

      // User data with reset token included
      const userData = {
        email: data.email,
        password_hash: hashedPassword,
        status: "active", // Set as active so they can log in immediately
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        reset_token: resetToken,
        reset_token_expires: resetTokenExpiry,
      };

      // Create the user with reset token in a single operation
      const { data: newUser, error: userError } = await supabase
        .from("users")
        .insert(userData)
        .select("id")
        .single();

      if (userError) {
        console.error("Error creating user:", userError);
        throw new Error(
          `Failed to create user: ${userError.message || "Unknown error"}`
        );
      }

      if (!newUser || !newUser.id) {
        throw new Error("Failed to create user: No ID returned");
      }

      // Now that we have the user ID, create the employee record
      const { error: employeeError } = await supabase
        .from("company_user")
        .insert([
          {
            id: newUser.id,
            ...employeeData,
          },
        ]);

      if (employeeError) {
        // If employee creation fails, delete the user for atomicity
        logDebug("Error creating employee, cleaning up user:", employeeError);
        await supabase.from("users").delete().eq("id", newUser.id);
        throw new Error(
          `Failed to create employee: ${employeeError.message || "Unknown database error"}`
        );
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

      // Log the employee creation activity
      const activityLogData = {
        user_id: user?.id,
        activity_type: data.is_admin
          ? ActivityType.CREATE_COMPANY_ADMIN
          : ActivityType.CREATE_EMPLOYEE,
        description: `New ${data.is_admin ? "company admin" : "employee"} "${data.first_name} ${data.last_name}" (${data.email}) created for company "${selectedCompany.company_name}"`,
        company_id: selectedCompany.id,
        metadata: {
          created_by: {
            id: user?.id || "",
            name: creatorName,
            email: user?.email || "",
            role: "superadmin",
          },
          [data.is_admin ? "admin" : "employee"]: {
            id: newUser.id,
            name: `${data.first_name} ${data.last_name}`,
            email: data.email,
            role: data.is_admin ? "admin" : "employee",
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
          phone_number: data.phone_number || "Not provided",
          job_title: data.job_title || "Not provided",
          company_id: selectedCompany.id,
          role: data.is_admin ? "admin" : "employee",
          employment_type: data.employment_type,
          workload_percentage: data.workload_percentage,
          date_of_birth: data.date_of_birth.toISOString(),
          nationality: data.nationality,
          gender: data.gender,
          marital_status: data.marital_status,
          employment_start_date: data.employment_start_date.toISOString(),
          created_at: new Date().toISOString(),
        },
      };

      const { error: logError } = await supabase
        .from("activity_logs")
        .insert([activityLogData]);

      if (logError) {
        console.error("Error logging activity:", logError);
        // Don't throw here as the employee was created successfully
      }

      // Send welcome email based on role
      logDebug("Sending employee welcome email...");
      let emailResult;

      if (data.is_admin) {
        logDebug("Sending company admin invitation email...");
        emailResult = await sendCompanyAdminInviteEmail(
          data.email,
          data.password,
          selectedCompany.company_name
        );
      } else {
        // Send regular employee welcome email
        const functionUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/send-email`;
        logDebug("Sending email using function URL:", functionUrl);

        const { success: emailSent, error: emailError } = await fetch(
          functionUrl,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
              Origin: "https://hdf-hr.vercel.app",
            },
            body: JSON.stringify({
              to: data.email,
              subject: `Welcome to ${selectedCompany.company_name} on HDF HR`,
              html: generateWelcomeEmail(
                `${data.first_name} ${data.last_name}`,
                data.email,
                data.password,
                selectedCompany.company_name
              ),
              text: `Welcome to ${selectedCompany.company_name} on HDF HR!\n\nHello ${data.first_name} ${data.last_name},\n\nYour account has been created with the following credentials:\n\nEmail: ${data.email}\nPassword: ${data.password}\n\nPlease log in at: https://hdf-hr.vercel.app/login\n\nIMPORTANT: Change your password immediately after logging in.\n\nNeed help? Contact us at info@hdf.ch`,
            }),
          }
        ).then((res) => res.json());

        if (!emailSent) {
          console.error("Error sending welcome email:", emailError);
        } else {
          logDebug("Welcome email sent successfully");
        }
        emailResult = { success: emailSent };
      }

      logDebug(`Employee created with email: ${data.email}`);

      setSnackbarMessage(
        emailResult.success
          ? t("superAdmin.employees.createSuccess")
          : t("superAdmin.employees.createSuccessNoEmail")
      );
      setSnackbarVisible(true);

      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (error: any) {
      console.error("Error creating employee:", error);

      // Detailed error message
      const errorMessage =
        error.message || t("superAdmin.employees.createError");

      // For network-related errors, show in banner
      if (
        errorMessage.includes("network") ||
        errorMessage.includes("connection") ||
        errorMessage.includes("offline")
      ) {
        setErrorBannerMessage(t("superAdmin.employees.offlineError"));
        setErrorBannerVisible(true);
      } else {
        setSnackbarMessage(errorMessage);
        setSnackbarVisible(true);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.colors.backgroundSecondary },
      ]}
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
                      name="bank_name"
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={t("superAdmin.employees.bankName")}
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
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
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label="Account Number"
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
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
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label="IBAN"
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          style={styles.input}
                          disabled={loading}
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
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label="SWIFT Code"
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          style={styles.input}
                          disabled={loading}
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

                    <View style={styles.adminToggleContainer}>
                      <Text style={styles.adminToggleLabel}>
                        {t("superAdmin.employees.grantAdminPrivileges")}
                      </Text>
                      <Switch
                        value={isAdmin}
                        onValueChange={handleAdminToggle}
                        disabled={loading}
                      />
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
    justifyContent: "center",
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
  adminToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  adminToggleLabel: {
    fontSize: 16,
    color: "#1e293b",
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
});

export default CreateEmployeeScreen;
