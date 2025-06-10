import React, { useState, useEffect, useCallback, useMemo } from "react";
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
  SegmentedButtons,
  Snackbar,
  HelperText,
  Banner,
  Switch,
  Menu,
  IconButton,
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

  const [loading, setLoading] = useState(false);
  // Replace companyId and companyIdLoading with company selection states
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const dropdownRef = React.useRef(null);

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

  // Replace fetchCompanyId with fetchCompanies
  // Fetch companies for dropdown
  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("company")
        .select("id, company_name, active")
        .eq("active", true)
        .order("company_name");

      if (error) {
        console.error("Error fetching companies:", error);
        return;
      }

      setCompanies(data || []);
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const showMenu = () => {
    if (dropdownRef.current) {
      // @ts-ignore - Getting layout measurements
      dropdownRef.current.measure((x, y, width, height, pageX, pageY) => {
        setMenuPosition({ x: pageX, y: pageY + height });
        setMenuVisible(true);
      });
    }
  };

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

      // Validate email domain
      const emailParts = data.email.split("@");
      if (
        emailParts.length !== 2 ||
        !emailParts[1].includes(".") ||
        emailParts[1].length < 3
      ) {
        setSnackbarMessage(t("superAdmin.employees.invalidEmailDomain"));
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
        employment_type: isEmployeeType,
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
            id: newUser.id, // Use the ID from our custom users table
            ...employeeData,
          },
        ]);

      if (employeeError) {
        // If employee creation fails, delete the user for atomicity
        console.log(
          "Error creating employee, cleaning up user:",
          employeeError
        );
        await supabase.from("users").delete().eq("id", newUser.id);
        throw new Error(
          `Failed to create employee: ${employeeError.message || "Unknown database error"}`
        );
      }

      console.log(`Employee created with email: ${data.email}`);

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

  // Menu container style with theme
  const menuContainerStyle = {
    borderRadius: 12,
    width: 300,
    marginTop: 4,
    elevation: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  };

  // Pre-render form even while company ID is loading to improve perceived performance
  const formContent = useMemo(
    () => (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          style={[
            styles.scrollView,
            { backgroundColor: theme.colors.backgroundSecondary },
          ]}
          contentContainerStyle={styles.scrollContent}
        >
          <Text
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            Company Selection
          </Text>

          <TouchableOpacity
            ref={dropdownRef}
            style={[
              styles.dropdownButton,
              selectedCompany && styles.activeDropdownButton,
            ]}
            onPress={showMenu}
          >
            <View style={styles.dropdownContent}>
              <IconButton
                icon="office-building"
                size={20}
                iconColor={selectedCompany ? theme.colors.primary : "#757575"}
                style={styles.dropdownLeadingIcon}
              />
              <Text
                style={[
                  styles.dropdownButtonText,
                  selectedCompany && {
                    color: theme.colors.primary,
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {selectedCompany
                  ? selectedCompany.company_name
                  : "Select Company"}
              </Text>
            </View>
            <IconButton
              icon="chevron-down"
              size={20}
              style={styles.dropdownIcon}
              iconColor={selectedCompany ? theme.colors.primary : "#757575"}
            />
          </TouchableOpacity>

          <Text
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            Personal Information
          </Text>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Controller
                control={control}
                name="first_name"
                rules={{
                  required: t("superAdmin.employees.firstNameRequired"),
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
                    message: t("superAdmin.employees.nameInvalidChars"),
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
                  required: t("superAdmin.employees.lastNameRequired"),
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
                    message: t("superAdmin.employees.nameInvalidChars"),
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
                <HelperText type="error">{errors.last_name.message}</HelperText>
              )}
            </View>
          </View>

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
            <HelperText type="error">{errors.email.message}</HelperText>
          )}

          <Controller
            control={control}
            name="phone_number"
            rules={{
              pattern: {
                value: /^\+?[0-9]{8,15}$/,
                message: t("superAdmin.employees.phoneNumberInvalidFormat"),
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={t("superAdmin.employees.phoneNumber")}
                mode="outlined"
                value={value}
                onChangeText={(text) => onChange(text.replace(/[^0-9+]/g, ""))}
                onBlur={onBlur}
                error={!!errors.phone_number}
                style={styles.input}
                keyboardType="phone-pad"
                disabled={loading}
              />
            )}
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
            name="address_line1"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={t("superAdmin.employees.addressLine1")}
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                style={styles.input}
                disabled={loading}
              />
            )}
          />

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
                  return t("superAdmin.employees.passwordNoRepeatingChars");
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
            disabled={loading || !selectedCompany}
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
      selectedCompany,
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

      {formContent}

      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={menuPosition}
        contentStyle={menuContainerStyle}
      >
        <View style={styles.menuHeader}>
          <Text style={styles.menuTitle}>Select Company</Text>
        </View>
        <Divider />
        <ScrollView style={{ maxHeight: 400 }}>
          {companies.map((company) => (
            <Menu.Item
              key={company.id}
              title={company.company_name}
              onPress={() => {
                setSelectedCompany(company);
                setMenuVisible(false);
              }}
              style={styles.menuItemStyle}
              titleStyle={[
                styles.menuItemText,
                selectedCompany?.id === company.id && styles.menuItemSelected,
              ]}
              leadingIcon="office-building"
              trailingIcon={
                selectedCompany?.id === company.id ? "check" : undefined
              }
            />
          ))}
          {companies.length === 0 && (
            <Menu.Item
              title="No companies found"
              disabled={true}
              style={styles.menuItemStyle}
            />
          )}
        </ScrollView>
      </Menu>

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
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingLeft: 4,
    paddingRight: 8,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
  },
  dropdownContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dropdownLeadingIcon: {
    margin: 0,
    padding: 0,
  },
  dropdownButtonText: {
    fontFamily: "Poppins-Regular",
    color: "#424242",
    flex: 1,
    fontSize: 14,
  },
  dropdownIcon: {
    margin: 0,
    padding: 0,
  },
  activeDropdownButton: {
    borderColor: "#1a73e8",
    backgroundColor: "#F0F7FF",
  },
  menuHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F5F5F5",
  },
  menuTitle: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#212121",
  },
  menuItemStyle: {
    height: 48,
    justifyContent: "center",
  },
  menuItemText: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    color: "#424242",
  },
  menuItemSelected: {
    color: "#1a73e8",
    fontFamily: "Poppins-Medium",
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
