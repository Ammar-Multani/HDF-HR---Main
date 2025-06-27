import React, { useState, useEffect, useCallback, useMemo } from "react";
import { logDebug } from "../../utils/logger";
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
  SegmentedButtons,
  Snackbar,
  HelperText,
  Banner,
  Switch,
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
import {
  Gender,
  MaritalStatus,
  IDType,
  EmploymentType,
  UserRole,
  UserStatus,
} from "../../types";
import { hashPassword, generateResetToken } from "../../utils/auth";
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

// Skeleton component for form loading state
const CreateEmployeeFormSkeleton = () => {
  const theme = useTheme();

  const SkeletonBlock = ({
    width,
    height,
    style,
  }: {
    width: string | number;
    height: number;
    style?: any;
  }) => (
    <View
      style={[
        {
          width,
          height,
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: 4,
          opacity: 0.3,
        },
        style,
      ]}
    />
  );

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
    >
      <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
        Personal Information
      </Text>

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <SkeletonBlock width="100%" height={56} style={{ marginBottom: 8 }} />
          <SkeletonBlock width="70%" height={16} style={{ marginBottom: 16 }} />
        </View>

        <View style={styles.halfInput}>
          <SkeletonBlock width="100%" height={56} style={{ marginBottom: 8 }} />
          <SkeletonBlock width="70%" height={16} style={{ marginBottom: 16 }} />
        </View>
      </View>

      <SkeletonBlock width="100%" height={56} style={{ marginBottom: 8 }} />
      <SkeletonBlock width="70%" height={16} style={{ marginBottom: 16 }} />

      <SkeletonBlock width="100%" height={56} style={{ marginBottom: 8 }} />
      <SkeletonBlock width="70%" height={16} style={{ marginBottom: 16 }} />

      <Text style={styles.inputLabel}>Date of Birth *</Text>
      <SkeletonBlock width="100%" height={40} style={{ marginBottom: 16 }} />

      <Text style={styles.inputLabel}>Gender *</Text>
      <SkeletonBlock width="100%" height={40} style={{ marginBottom: 16 }} />

      <SkeletonBlock width="100%" height={56} style={{ marginBottom: 16 }} />

      <Text style={styles.inputLabel}>Marital Status *</Text>
      <SkeletonBlock width="100%" height={40} style={{ marginBottom: 16 }} />

      <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
        Employment Details
      </Text>

      <SkeletonBlock width="100%" height={56} style={{ marginBottom: 16 }} />

      <Text style={styles.inputLabel}>Employment Type *</Text>
      <SkeletonBlock width="100%" height={40} style={{ marginBottom: 16 }} />

      <SkeletonBlock width="100%" height={56} style={{ marginBottom: 16 }} />

      <Text style={styles.inputLabel}>Employment Start Date *</Text>
      <SkeletonBlock width="100%" height={40} style={{ marginBottom: 16 }} />

      <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
        Access Level
      </Text>
      <SkeletonBlock width="100%" height={40} style={{ marginBottom: 8 }} />
      <SkeletonBlock width="70%" height={16} style={{ marginBottom: 16 }} />

      <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
        Address
      </Text>

      <SkeletonBlock width="100%" height={56} style={{ marginBottom: 16 }} />
      <SkeletonBlock width="100%" height={56} style={{ marginBottom: 16 }} />

      <View style={styles.row}>
        <View style={styles.halfInput}>
          <SkeletonBlock
            width="100%"
            height={56}
            style={{ marginBottom: 16 }}
          />
        </View>
        <View style={styles.halfInput}>
          <SkeletonBlock
            width="100%"
            height={56}
            style={{ marginBottom: 16 }}
          />
        </View>
      </View>
    </ScrollView>
  );
};

const CreateEmployeeScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companyIdLoading, setCompanyIdLoading] = useState(true);
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

  // Memoize the company ID fetch function to prevent recreating it on re-renders
  const fetchCompanyId = useCallback(async () => {
    if (!user) return;

    setCompanyIdLoading(true);
    try {
      // Cache key for this specific user's company ID
      const cacheKey = `company_id_${user.id}`;

      // Function to actually fetch the company ID
      const fetchData = async () => {
        const { data, error } = await supabase
          .from("company_user")
          .select("company_id")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching company ID:", error);
          return { data: null, error };
        }

        return { data, error: null };
      };

      // Use cached query with a relatively long TTL since company ID rarely changes
      const result = await cachedQuery(fetchData, cacheKey, {
        cacheTtl: 24 * 60 * 60 * 1000, // 24 hours
        criticalData: true,
      });

      if (result.error) {
        console.error("Error fetching company ID:", result.error);
        return;
      }

      setCompanyId(result.data?.company_id || null);
    } catch (error) {
      console.error("Error fetching company ID:", error);
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
        setErrorBannerMessage(
          "Cannot create employee while offline. Please check your internet connection and try again."
        );
        setErrorBannerVisible(true);
        return;
      }

      if (!user || !companyId) {
        setSnackbarMessage("User or company information not available");
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
        setSnackbarMessage("Workload percentage must be between 1 and 100");
        setSnackbarVisible(true);
        setLoading(false);
        return;
      }

      // Validate password strength
      if (data.password.length < 8) {
        setSnackbarMessage("Password must be at least 8 characters long");
        setSnackbarVisible(true);
        setLoading(false);
        return;
      }

      // Convert employment_type to boolean (true for full-time/part-time, false for contract/temporary)
      const isEmployeeType =
        data.employment_type === EmploymentType.FULL_TIME ||
        data.employment_type === EmploymentType.PART_TIME;

      // Validate email domain more thoroughly
      const emailParts = data.email.split("@");
      if (
        emailParts.length !== 2 ||
        !emailParts[1].includes(".") ||
        emailParts[1].length < 3
      ) {
        setSnackbarMessage(
          "Please enter a valid email address with a proper domain"
        );
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
        company_id: companyId,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        phone_number: data.phone_number,
        role: data.is_admin ? UserRole.ADMIN : UserRole.EMPLOYEE,
        active_status: UserStatus.ACTIVE,
        created_by: user.id,
        date_of_birth: data.date_of_birth.toISOString(),
        nationality: data.nationality,
        id_type: data.id_type,
        ahv_number: data.ahv_number,
        marital_status: data.marital_status,
        gender: data.gender,
        employment_start_date: data.employment_start_date.toISOString(),
        employment_type: isEmployeeType,
        workload_percentage: workloadPercentage,
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
            id: newUser.id, // Use the ID from our custom users table
            ...employeeData,
          },
        ]);

      if (employeeError) {
        // If employee creation fails, delete the user for atomicity
        logDebug(
          "Error creating employee, cleaning up user:",
          employeeError
        );
        await supabase.from("users").delete().eq("id", newUser.id);
        throw new Error(
          `Failed to create employee: ${employeeError.message || "Unknown database error"}`
        );
      }

      logDebug(`Employee created with email: ${data.email}`);

      setSnackbarMessage(
        `${data.is_admin ? "Company admin" : "Employee"} created successfully!`
      );
      setSnackbarVisible(true);

      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 5000); // Give them time to see the password
    } catch (error: any) {
      console.error("Error creating employee:", error);

      // Detailed error message
      const errorMessage =
        error.message || "Failed to create employee. Please try again.";

      // For network-related errors, show in banner
      if (
        errorMessage.includes("network") ||
        errorMessage.includes("connection") ||
        errorMessage.includes("offline")
      ) {
        setErrorBannerMessage(errorMessage);
        setErrorBannerVisible(true);
      } else {
        setSnackbarMessage(errorMessage);
        setSnackbarVisible(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Pre-render form even while company ID is loading to improve perceived performance
  const formContent = useMemo(
    () => (
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
            Personal Information
          </Text>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Controller
                control={control}
                rules={{ required: "First name is required" }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label="First Name *"
                    mode="outlined"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={!!errors.first_name}
                    style={styles.input}
                    disabled={loading}
                  />
                )}
                name="first_name"
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
                rules={{ required: "Last name is required" }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label="Last Name *"
                    mode="outlined"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={!!errors.last_name}
                    style={styles.input}
                    disabled={loading}
                  />
                )}
                name="last_name"
              />
              {errors.last_name && (
                <HelperText type="error">{errors.last_name.message}</HelperText>
              )}
            </View>
          </View>

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
                disabled={loading}
              />
            )}
            name="email"
          />
          {errors.email && (
            <HelperText type="error">{errors.email.message}</HelperText>
          )}

          <Controller
            control={control}
            rules={{ required: "Phone number is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Phone Number *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.phone_number}
                style={styles.input}
                keyboardType="phone-pad"
                disabled={loading}
              />
            )}
            name="phone_number"
          />
          {errors.phone_number && (
            <HelperText type="error">{errors.phone_number.message}</HelperText>
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
            <HelperText type="error">{errors.nationality.message}</HelperText>
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
                  { value: MaritalStatus.DIVORCED, label: "Divorced" },
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

          <Text
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            Employment Details
          </Text>

          <Controller
            control={control}
            rules={{ required: "Job title is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Job Title *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.job_title}
                style={styles.input}
                disabled={loading}
              />
            )}
            name="job_title"
          />
          {errors.job_title && (
            <HelperText type="error">{errors.job_title.message}</HelperText>
          )}

          <Text style={styles.inputLabel}>Employment Type *</Text>
          <Controller
            control={control}
            render={({ field: { onChange, value } }) => (
              <SegmentedButtons
                value={value}
                onValueChange={onChange}
                buttons={[
                  { value: EmploymentType.FULL_TIME, label: "Full Time" },
                  { value: EmploymentType.PART_TIME, label: "Part Time" },
                  { value: EmploymentType.CONTRACT, label: "Contract" },
                  { value: EmploymentType.TEMPORARY, label: "Temporary" },
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
            rules={{
              required: "Workload percentage is required",
              validate: (value) =>
                !isNaN(parseInt(value)) &&
                parseInt(value) > 0 &&
                parseInt(value) <= 100
                  ? true
                  : "Workload must be between 1 and 100",
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Workload Percentage (%) *"
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
            name="workload_percentage"
          />
          {errors.workload_percentage && (
            <HelperText type="error">
              {errors.workload_percentage.message}
            </HelperText>
          )}

          <Text style={styles.inputLabel}>Employment Start Date *</Text>
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

          <Text
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            Access Level
          </Text>

          <View style={styles.adminToggleContainer}>
            <Text style={styles.adminToggleLabel}>
              Make this employee a company admin?
            </Text>
            <Controller
              control={control}
              render={({ field: { value } }) => (
                <Switch
                  value={value}
                  onValueChange={handleAdminToggle}
                  disabled={loading}
                />
              )}
              name="is_admin"
            />
          </View>

          <Text style={styles.helperText}>
            Company admins have full access to manage company settings,
            employees, departments, and other administrative functions.
          </Text>

          <Text
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            Address
          </Text>

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
            <HelperText type="error">{errors.address_line1.message}</HelperText>
          )}

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

          <Text
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            Bank Details
          </Text>

          <Controller
            control={control}
            rules={{ required: "Bank name is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Bank Name *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.bank_name}
                style={styles.input}
                disabled={loading}
              />
            )}
            name="bank_name"
          />
          {errors.bank_name && (
            <HelperText type="error">{errors.bank_name.message}</HelperText>
          )}

          <Controller
            control={control}
            rules={{ required: "Account number is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Account Number *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.account_number}
                style={styles.input}
                disabled={loading}
              />
            )}
            name="account_number"
          />
          {errors.account_number && (
            <HelperText type="error">
              {errors.account_number.message}
            </HelperText>
          )}

          <Controller
            control={control}
            rules={{ required: "IBAN is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="IBAN *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.iban}
                style={styles.input}
                disabled={loading}
              />
            )}
            name="iban"
          />
          {errors.iban && (
            <HelperText type="error">{errors.iban.message}</HelperText>
          )}

          <Controller
            control={control}
            rules={{ required: "SWIFT code is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="SWIFT Code *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.swift_code}
                style={styles.input}
                disabled={loading}
              />
            )}
            name="swift_code"
          />
          {errors.swift_code && (
            <HelperText type="error">{errors.swift_code.message}</HelperText>
          )}

          <Text
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            Additional Information
          </Text>

          <Controller
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Comments"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                style={styles.input}
                multiline
                numberOfLines={4}
                disabled={loading}
              />
            )}
            name="comments"
          />

          <Controller
            control={control}
            rules={{
              required: "Password is required",
              minLength: {
                value: 8,
                message: "Password must be at least 8 characters long",
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Password *"
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
            name="password"
          />
          {errors.password && (
            <HelperText type="error">{errors.password.message}</HelperText>
          )}

          <Text style={styles.helperText}>
            The password will be included in the invitation email sent to the
            employee.
          </Text>

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            style={styles.submitButton}
            loading={loading}
            disabled={loading || !companyId}
          >
            Create Employee
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    ),
    [
      control,
      errors,
      loading,
      companyId,
      theme.colors.onBackground,
      dateOfBirth,
      employmentStartDate,
      handleSubmit,
      onSubmit,
    ]
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader
        title="Create Employee"
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

      {companyIdLoading ? (
        <CreateEmployeeFormSkeleton />
      ) : (
        <>
          {!companyId && (
            <View style={styles.errorContainer}>
              <Text
                style={{
                  color: theme.colors.error,
                  textAlign: "center",
                  marginBottom: 16,
                }}
              >
                Unable to load company information. Please try again.
              </Text>
              <Button mode="contained" onPress={fetchCompanyId}>
                Retry
              </Button>
            </View>
          )}

          {companyId && formContent}
        </>
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
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfInput: {
    width: "48%",
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
  submitButton: {
    marginTop: 24,
    paddingVertical: 6,
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
  },
  helperText: {
    fontSize: 14,
    opacity: 0.7,
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

export default CreateEmployeeScreen;
