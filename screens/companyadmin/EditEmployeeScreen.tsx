import React, { useState, useEffect, useCallback, useMemo } from "react";
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
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useForm, Controller } from "react-hook-form";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import {
  supabase,
  cachedQuery,
  clearCache,
  isNetworkAvailable,
} from "../../lib/supabase";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import {
  Gender,
  MaritalStatus,
  IDType,
  EmploymentType,
  CompanyUser,
  UserRole,
} from "../../types";

type EditEmployeeRouteParams = {
  employeeId: string;
};

interface EmployeeFormData {
  first_name: string;
  last_name: string;
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
  is_admin: boolean;
}

// Skeleton component for form loading state
const EditEmployeeFormSkeleton = () => {
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

      <SkeletonBlock width="100%" height={16} style={{ marginBottom: 16 }} />

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

      <Text style={styles.inputLabel}>Employment Date(s) *</Text>
      <SkeletonBlock width="100%" height={40} style={{ marginBottom: 16 }} />
      <SkeletonBlock width="100%" height={40} style={{ marginBottom: 16 }} />

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

      <Text style={styles.inputLabel}>Employment Start Date *</Text>
      <SkeletonBlock width="100%" height={40} style={{ marginBottom: 16 }} />
      <SkeletonBlock width="100%" height={40} style={{ marginBottom: 16 }} />

      <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
        Access Level
      </Text>
      <SkeletonBlock width="100%" height={40} style={{ marginBottom: 8 }} />
      <SkeletonBlock width="70%" height={16} style={{ marginBottom: 16 }} />

      <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
        Address
      </Text>
    </ScrollView>
  );
};

const EditEmployeeScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<Record<string, EditEmployeeRouteParams>, string>>();
  const { employeeId } = route.params;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [employee, setEmployee] = useState<CompanyUser | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [networkStatus, setNetworkStatus] = useState<boolean | null>(true);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset,
  } = useForm<EmployeeFormData>({
    defaultValues: {
      first_name: "",
      last_name: "",
      phone_number: "",
      date_of_birth: new Date(),
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
    },
  });

  const dateOfBirth = watch("date_of_birth");
  const employmentStartDate = watch("employment_start_date");
  const employmentEndDate = watch("employment_end_date");
  const isAdmin = watch("is_admin");

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
      // If removing admin privileges, also confirm
      Alert.alert(
        "Remove Admin Privileges",
        "This employee will no longer have administrative access. Are you sure?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: "Confirm",
            onPress: () => setValue("is_admin", false),
          },
        ]
      );
    }
  };

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
  }, [checkNetworkStatus]);

  const fetchEmployeeDetails = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Check network status
      const networkAvailable = await checkNetworkStatus();

      // Create a cache key for this specific employee
      const cacheKey = `employee_edit_${employeeId}`;

      // Define the data fetching function
      const fetchData = async () => {
        const { data, error } = await supabase
          .from("company_user")
          .select("*")
          .eq("id", employeeId)
          .single();

        if (error) {
          console.error("Error fetching employee details:", error);
          return { data: null, error };
        }

        return { data, error: null };
      };

      // Use cached query with appropriate options
      const result = await cachedQuery<any>(fetchData, cacheKey, {
        forceRefresh: networkAvailable, // Only force refresh if we're online
        cacheTtl: 30 * 60 * 1000, // 30 minute cache
        criticalData: true, // This is critical data for editing
      });

      if (result.error && !result.fromCache) {
        console.error("Error fetching employee details:", result.error);
        throw new Error(
          result.error.message || "Failed to fetch employee details"
        );
      }

      // Check if we're using stale data
      if (result.fromCache && !networkAvailable) {
        setError("You're offline. Using cached data which may be outdated.");
      }

      if (!result.data) {
        throw new Error("Employee not found");
      }

      setEmployee(result.data);

      // Set form values
      setValue("first_name", result.data.first_name || "");
      setValue("last_name", result.data.last_name || "");
      setValue("phone_number", result.data.phone_number || "");

      // Handle date of birth with validation
      try {
        if (result.data.date_of_birth) {
          const dobDate = new Date(result.data.date_of_birth);
          if (!isNaN(dobDate.getTime())) {
            setValue("date_of_birth", dobDate);
          } else {
            setValue("date_of_birth", new Date());
          }
        } else {
          setValue("date_of_birth", new Date());
        }
      } catch (e) {
        setValue("date_of_birth", new Date());
      }

      setValue("gender", result.data.gender || Gender.MALE);
      setValue("nationality", result.data.nationality || "");
      setValue(
        "marital_status",
        result.data.marital_status || MaritalStatus.SINGLE
      );
      setValue("id_type", result.data.id_type || IDType.ID_CARD);
      setValue("ahv_number", result.data.ahv_number || "");
      setValue("job_title", result.data.job_title || "");
      setValue(
        "employment_type",
        result.data.employment_type || EmploymentType.FULL_TIME
      );
      setValue(
        "workload_percentage",
        result.data.workload_percentage
          ? result.data.workload_percentage.toString()
          : "100"
      );

      // Handle employment start date with validation
      try {
        if (result.data.employment_start_date) {
          const startDate = new Date(result.data.employment_start_date);
          if (!isNaN(startDate.getTime())) {
            setValue("employment_start_date", startDate);
          } else {
            setValue("employment_start_date", new Date());
          }
        } else {
          setValue("employment_start_date", new Date());
        }
      } catch (e) {
        setValue("employment_start_date", new Date());
      }

      // Handle employment end date with validation
      if (result.data.employment_end_date) {
        try {
          const endDate = new Date(result.data.employment_end_date);
          if (!isNaN(endDate.getTime())) {
            setValue("employment_end_date", endDate);
            setHasEndDate(true);
          }
        } catch (e) {
          console.log("Invalid employment end date", e);
        }
      }

      setValue("education", result.data.education || "");

      // Set address values - reading from JSONB address object
      if (result.data.address) {
        setValue("address_line1", result.data.address.line1 || "");
        setValue("address_line2", result.data.address.line2 || "");
        setValue("address_city", result.data.address.city || "");
        setValue("address_state", result.data.address.state || "");
        setValue("address_postal_code", result.data.address.postal_code || "");
        setValue("address_country", result.data.address.country || "");
      }

      // Set bank details - reading from JSONB bank_details object
      if (result.data.bank_details) {
        // Handle bank_details as both string or object
        const bankDetails =
          typeof result.data.bank_details === "string"
            ? JSON.parse(result.data.bank_details)
            : result.data.bank_details;

        setValue("bank_name", bankDetails.bank_name || "");
        setValue("account_number", bankDetails.account_number || "");
        setValue("iban", bankDetails.iban || "");
        setValue("swift_code", bankDetails.swift_code || "");
      }

      setValue("comments", result.data.comments || "");

      // Set admin status based on role
      setValue("is_admin", result.data.role === UserRole.COMPANY_ADMIN);
    } catch (error: any) {
      console.error("Error fetching employee details:", error);
      setError(error.message || "Failed to load employee details");
    } finally {
      setLoading(false);
    }
  }, [employeeId, setValue, checkNetworkStatus]);

  useEffect(() => {
    fetchEmployeeDetails();
  }, [fetchEmployeeDetails]);

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

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(false);
    if (selectedDate) {
      setValue("employment_end_date", selectedDate);
    }
  };

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      // First check network connection
      const isOnline = await checkNetworkStatus();
      if (!isOnline) {
        setSnackbarMessage("Cannot update employee while offline");
        setSnackbarVisible(true);
        return;
      }

      if (!employee) {
        setSnackbarMessage("Employee information not available");
        setSnackbarVisible(true);
        return;
      }

      setSubmitting(true);
      setError(null);

      // Validate workload percentage
      const workloadPercentage = parseInt(data.workload_percentage);
      if (
        isNaN(workloadPercentage) ||
        workloadPercentage <= 0 ||
        workloadPercentage > 100
      ) {
        setSnackbarMessage("Workload percentage must be between 1 and 100");
        setSnackbarVisible(true);
        setSubmitting(false);
        return;
      }

      // Convert employment_type to boolean (true for full-time/part-time, false for contract/temporary)
      const isEmployeeType =
        data.employment_type === EmploymentType.FULL_TIME ||
        data.employment_type === EmploymentType.PART_TIME;

      // Update employee record
      const { error } = await supabase
        .from("company_user")
        .update({
          first_name: data.first_name,
          last_name: data.last_name,
          phone_number: data.phone_number,
          date_of_birth: data.date_of_birth.toISOString(),
          nationality: data.nationality,
          id_type: data.id_type,
          ahv_number: data.ahv_number,
          marital_status: data.marital_status,
          gender: data.gender,
          role: data.is_admin ? UserRole.COMPANY_ADMIN : UserRole.EMPLOYEE,
          employment_start_date: data.employment_start_date.toISOString(),
          employment_end_date:
            hasEndDate && data.employment_end_date
              ? data.employment_end_date.toISOString()
              : null,
          employment_type: isEmployeeType, // Store as boolean instead of enum string
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
        })
        .eq("id", employeeId);

      if (error) {
        throw error;
      }

      // Clear cache for this employee
      await clearCache(`employee_edit_${employeeId}`);
      await clearCache(`employee_details_${employeeId}`);
      await clearCache(`employees_*`); // Clear employee list caches

      // Create appropriate success message
      const isRoleChanged =
        (employee.role === UserRole.COMPANY_ADMIN) !== data.is_admin;
      let successMessage = "Employee updated successfully";
      if (isRoleChanged) {
        successMessage = data.is_admin
          ? "Employee updated and granted admin access"
          : "Employee updated and admin access removed";
      }

      setSnackbarMessage(successMessage);
      setSnackbarVisible(true);

      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error: any) {
      console.error("Error updating employee:", error);
      setSnackbarMessage(error.message || "Failed to update employee");
      setSnackbarVisible(true);
      setError(error.message || "Failed to update employee");
    } finally {
      setSubmitting(false);
    }
  };

  // Create memoized form content to prevent unnecessary rerenders
  const formContent = useMemo(() => {
    if (!employee) return null;

    return (
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
                    disabled={submitting}
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
                    disabled={submitting}
                  />
                )}
                name="last_name"
              />
              {errors.last_name && (
                <HelperText type="error">{errors.last_name.message}</HelperText>
              )}
            </View>
          </View>

          <Text style={styles.emailLabel}>Email: {employee.email}</Text>

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
                disabled={submitting}
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
            disabled={submitting}
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
              <View style={{ opacity: submitting ? 0.5 : 1 }}>
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
              </View>
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
                disabled={submitting}
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
              <View style={{ opacity: submitting ? 0.5 : 1 }}>
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
              </View>
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
                disabled={submitting}
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
              <View style={{ opacity: submitting ? 0.5 : 1 }}>
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
              </View>
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
                disabled={submitting}
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
            disabled={submitting}
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

          <View style={styles.endDateContainer}>
            <Button
              mode={hasEndDate ? "contained" : "outlined"}
              onPress={() => setHasEndDate(!hasEndDate)}
              style={styles.endDateToggle}
              disabled={submitting}
            >
              {hasEndDate ? "Has End Date" : "Add End Date"}
            </Button>

            {hasEndDate && (
              <>
                <Button
                  mode="outlined"
                  onPress={() => setShowEndDatePicker(true)}
                  style={styles.dateButton}
                  icon="calendar"
                  disabled={submitting}
                >
                  {employmentEndDate
                    ? format(employmentEndDate, "MMMM d, yyyy")
                    : "Select End Date"}
                </Button>

                {showEndDatePicker && (
                  <DateTimePicker
                    value={employmentEndDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={handleEndDateChange}
                    minimumDate={employmentStartDate}
                  />
                )}
              </>
            )}
          </View>

          <Controller
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Education"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                style={styles.input}
                disabled={submitting}
              />
            )}
            name="education"
          />

          <Text
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            Access Level
          </Text>

          <View style={styles.adminToggleContainer}>
            <Text style={styles.adminToggleLabel}>
              Company Administrator Access
            </Text>
            <Controller
              control={control}
              render={({ field: { value } }) => (
                <Switch
                  value={value}
                  onValueChange={handleAdminToggle}
                  disabled={submitting}
                />
              )}
              name="is_admin"
            />
          </View>

          <Text style={styles.helperText}>
            {isAdmin
              ? "This employee has full administrative access to manage company settings, employees, and other administrative functions."
              : "Toggle to grant this employee administrative access."}
          </Text>

          <Text
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            Identification
          </Text>

          <Text style={styles.inputLabel}>ID Type *</Text>
          <Controller
            control={control}
            render={({ field: { onChange, value } }) => (
              <View style={{ opacity: submitting ? 0.5 : 1 }}>
                <SegmentedButtons
                  value={value}
                  onValueChange={onChange}
                  buttons={[
                    { value: IDType.ID_CARD, label: "ID Card" },
                    { value: IDType.PASSPORT, label: "Passport" },
                    {
                      value: IDType.DRIVERS_LICENSE,
                      label: "Driver's License",
                    },
                  ]}
                  style={styles.segmentedButtons}
                />
              </View>
            )}
            name="id_type"
          />

          <Controller
            control={control}
            rules={{ required: "AHV number is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="AHV Number *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.ahv_number}
                style={styles.input}
                disabled={submitting}
              />
            )}
            name="ahv_number"
          />
          {errors.ahv_number && (
            <HelperText type="error">{errors.ahv_number.message}</HelperText>
          )}

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
                disabled={submitting}
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
                disabled={submitting}
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
                    disabled={submitting}
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
                    disabled={submitting}
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
                    disabled={submitting}
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
                    disabled={submitting}
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
                disabled={submitting}
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
                disabled={submitting}
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
                disabled={submitting}
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
                disabled={submitting}
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
                disabled={submitting}
              />
            )}
            name="comments"
          />

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            style={styles.submitButton}
            loading={submitting}
            disabled={submitting || networkStatus === false}
          >
            Update Employee
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }, [
    employee,
    control,
    errors,
    submitting,
    theme.colors.onBackground,
    dateOfBirth,
    employmentStartDate,
    employmentEndDate,
    hasEndDate,
    handleSubmit,
    onSubmit,
    networkStatus,
    isAdmin,
  ]);

  const renderContent = () => {
    if (loading) {
      return <EditEmployeeFormSkeleton />;
    }

    if (error && !employee) {
      return (
        <View style={styles.errorContainer}>
          <Text style={{ color: theme.colors.error }}>{error}</Text>
          <Button
            mode="contained"
            onPress={fetchEmployeeDetails}
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
      );
    }

    if (!employee) {
      return (
        <View style={styles.errorContainer}>
          <Text style={{ color: theme.colors.error }}>Employee not found</Text>
          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={styles.button}
          >
            Go Back
          </Button>
        </View>
      );
    }

    return formContent;
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader
        title="Edit Employee"
        showBackButton={true}
        showHelpButton={true}
        onHelpPress={() => {
          navigation.navigate("Help" as never);
        }}
        showLogo={false}
      />  

      {/* Show offline banner if offline */}
      {networkStatus === false && (
        <Banner
          visible={true}
          icon="wifi-off"
          actions={[
            {
              label: "Retry",
              onPress: checkNetworkStatus,
            },
          ]}
        >
          You are offline. Some features may be limited.
        </Banner>
      )}

      {/* Show error banner for non-critical errors */}
      {error && employee && (
        <Banner
          visible={true}
          icon="alert-circle"
          actions={[
            {
              label: "Dismiss",
              onPress: () => setError(null),
            },
          ]}
        >
          {error}
        </Banner>
      )}

      {renderContent()}

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
  emailLabel: {
    fontSize: 14,
    marginBottom: 16,
    opacity: 0.7,
    fontStyle: "italic",
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.7,
  },
  dateButton: {
    marginBottom: 16,
  },
  endDateContainer: {
    marginBottom: 16,
  },
  endDateToggle: {
    marginBottom: 8,
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
  button: {
    marginTop: 16,
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
    marginBottom: 16,
    fontSize: 14,
    opacity: 0.7,
  },
});

export default EditEmployeeScreen;
