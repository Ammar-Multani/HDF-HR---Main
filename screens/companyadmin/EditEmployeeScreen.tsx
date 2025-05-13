import React, { useState, useEffect } from "react";
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
  Dialog,
  Portal,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useForm, Controller } from "react-hook-form";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { getAuthenticatedClient } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import {
  Gender,
  MaritalStatus,
  IDType,
  EmploymentType,
  CompanyUser,
} from "../../types";
import { base64UrlDecode } from "../../utils/auth";

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
}

const EditEmployeeScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<Record<string, EditEmployeeRouteParams>, string>>();
  const { employeeId } = route.params;
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [employee, setEmployee] = useState<CompanyUser | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [hasEndDate, setHasEndDate] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [diagnosticDialogVisible, setDiagnosticDialogVisible] = useState(false);
  const [diagnosticInfo, setDiagnosticInfo] = useState<string | null>(null);

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
    },
  });

  const dateOfBirth = watch("date_of_birth");
  const employmentStartDate = watch("employment_start_date");
  const employmentEndDate = watch("employment_end_date");

  const fetchEmployeeDetails = async () => {
    try {
      setLoading(true);

      console.log("Fetching employee details for ID:", employeeId);

      // Get authenticated client for RLS
      let supabaseAuth;
      try {
        supabaseAuth = await getAuthenticatedClient();
        console.log("Successfully obtained authenticated client");
      } catch (authError: any) {
        console.error("Authentication error:", authError.message);
        setSnackbarMessage(`Authentication error: ${authError.message}`);
        setSnackbarVisible(true);

        // Show diagnostic dialog with error details
        setDiagnosticInfo(
          "AUTHENTICATION ERROR\n" +
            "====================\n\n" +
            `Error: ${authError.message}\n\n` +
            "Possible solutions:\n" +
            "1. Try logging out and back in\n" +
            "2. Check if your JWT secret matches Supabase settings\n" +
            "3. Verify your token format and claims\n"
        );
        setDiagnosticDialogVisible(true);

        setLoading(false);
        return;
      }

      // Attempt to fetch employee details
      const { data, error } = await supabaseAuth
        .from("company_user")
        .select("*")
        .eq("id", employeeId)
        .single();

      if (error) {
        console.error("Error fetching employee details:", error);

        // Check if it's a JWT authentication error
        if (
          error.message.includes("JWSInvalidSignature") ||
          error.message.includes("JWT") ||
          error.message.includes("authentication")
        ) {
          // Show JWT-specific error message
          setSnackbarMessage(
            "Authentication error. Please try logging in again."
          );
          setSnackbarVisible(true);

          // Navigate back to login after a short delay
          setTimeout(() => {
            navigation.navigate("Login" as never);
          }, 2000);

          return;
        }

        // For non-auth errors, show generic error
        setSnackbarMessage(
          "Failed to fetch employee details. Please try again."
        );
        setSnackbarVisible(true);
        return;
      }

      // Process employee data
      console.log("Employee data retrieved successfully");
      setEmployee(data);

      // Set form values
      setValue("first_name", data.first_name || "");
      setValue("last_name", data.last_name || "");
      setValue("phone_number", data.phone_number || "");

      // Handle date of birth with validation
      try {
        if (data.date_of_birth) {
          const dobDate = new Date(data.date_of_birth);
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

      setValue("gender", data.gender || Gender.MALE);
      setValue("nationality", data.nationality || "");
      setValue("marital_status", data.marital_status || MaritalStatus.SINGLE);
      setValue("id_type", data.id_type || IDType.ID_CARD);
      setValue("ahv_number", data.ahv_number || "");
      setValue("job_title", data.job_title || "");
      setValue(
        "employment_type",
        data.employment_type || EmploymentType.FULL_TIME
      );
      setValue(
        "workload_percentage",
        data.workload_percentage ? data.workload_percentage.toString() : "100"
      );

      // Handle employment start date with validation
      try {
        if (data.employment_start_date) {
          const startDate = new Date(data.employment_start_date);
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
      if (data.employment_end_date) {
        try {
          const endDate = new Date(data.employment_end_date);
          if (!isNaN(endDate.getTime())) {
            setValue("employment_end_date", endDate);
            setHasEndDate(true);
          }
        } catch (e) {
          console.log("Invalid employment end date", e);
        }
      }

      setValue("education", data.education || "");

      // Set address values - reading from JSONB address object
      if (data.address) {
        setValue("address_line1", data.address.line1 || "");
        setValue("address_line2", data.address.line2 || "");
        setValue("address_city", data.address.city || "");
        setValue("address_state", data.address.state || "");
        setValue("address_postal_code", data.address.postal_code || "");
        setValue("address_country", data.address.country || "");
      }

      // Set bank details - reading from JSONB bank_details object
      if (data.bank_details) {
        // Handle bank_details as both string or object
        const bankDetails =
          typeof data.bank_details === "string"
            ? JSON.parse(data.bank_details)
            : data.bank_details;

        setValue("bank_name", bankDetails.bank_name || "");
        setValue("account_number", bankDetails.account_number || "");
        setValue("iban", bankDetails.iban || "");
        setValue("swift_code", bankDetails.swift_code || "");
      }

      setValue("comments", data.comments || "");
    } catch (error) {
      console.error("Error fetching employee details:", error);
    } finally {
      setLoading(false);
    }
  };

  const showJwtDiagnostics = async () => {
    try {
      setDiagnosticInfo("Loading JWT information...");
      setDiagnosticDialogVisible(true);

      // Get authentication information
      const { user } = useAuth();
      const token = user?.token || "No token available";

      // Try to analyze token
      let tokenInfo = "JWT Token information not available";
      if (token && token !== "No token available") {
        // Split token parts
        const parts = token.split(".");
        if (parts.length === 3) {
          try {
            // Show basic token structure using our utility function
            const headerJson = base64UrlDecode(parts[0]);
            const payloadJson = base64UrlDecode(parts[1]);
            const header = JSON.parse(headerJson);
            const payload = JSON.parse(payloadJson);

            tokenInfo =
              `JWT Header: ${JSON.stringify(header, null, 2)}\n\n` +
              `JWT Payload: ${JSON.stringify(payload, null, 2)}\n\n` +
              `Signature: ${parts[2].substring(0, 10)}...(truncated)`;
          } catch (e: any) {
            tokenInfo = `Error parsing token: ${e.message || String(e)}`;
          }
        } else {
          tokenInfo =
            "Invalid token format - should have 3 parts separated by dots";
        }
      }

      // Create diagnostic information
      const diagnosticText =
        "JWT DIAGNOSTIC INFORMATION\n" +
        "===========================\n\n" +
        `User: ${user?.id || "Not available"}\n` +
        `Email: ${user?.email || "Not available"}\n` +
        `Authenticated: ${user ? "Yes" : "No"}\n\n` +
        `${tokenInfo}\n\n` +
        "TROUBLESHOOTING STEPS:\n" +
        "1. Check if token is expired\n" +
        "2. Verify the 'role' claim is set to 'authenticated'\n" +
        "3. Ensure token is signed with the correct secret\n" +
        "4. Try logging out and back in";

      setDiagnosticInfo(diagnosticText);
    } catch (error: any) {
      setDiagnosticInfo(
        `Error generating diagnostics: ${error?.message || String(error)}`
      );
    }
  };

  useEffect(() => {
    fetchEmployeeDetails();
  }, [employeeId]);

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
      if (!employee) {
        setSnackbarMessage("Employee information not available");
        setSnackbarVisible(true);
        return;
      }

      setSubmitting(true);

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

      // Get authenticated client for RLS
      let supabaseAuth;
      let authAttempts = 0;
      const maxAttempts = 2;

      while (authAttempts < maxAttempts) {
        try {
          supabaseAuth = await getAuthenticatedClient();
          break; // Successfully authenticated
        } catch (authError) {
          console.error("Authentication error:", authError);
          authAttempts++;

          if (authAttempts >= maxAttempts) {
            throw new Error(
              "Authentication failed after multiple attempts. Please log in again."
            );
          }

          // Wait before retrying
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      if (!supabaseAuth) {
        throw new Error("Failed to authenticate with Supabase");
      }

      // Convert employment_type to boolean (true for full-time/part-time, false for contract/temporary)
      const isEmployeeType =
        data.employment_type === EmploymentType.FULL_TIME ||
        data.employment_type === EmploymentType.PART_TIME;

      // Update employee record
      const { error } = await supabaseAuth
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
        // Check if it's a JWT authentication error
        if (
          error.message.includes("JWT") ||
          error.message.includes("authentication") ||
          error.message.includes("JWSInvalidSignature")
        ) {
          throw new Error("Authentication error. Please try logging in again.");
        }
        throw error;
      }

      setSnackbarMessage("Employee updated successfully");
      setSnackbarVisible(true);

      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error: any) {
      console.error("Error updating employee:", error);
      setSnackbarMessage(error.message || "Failed to update employee");
      setSnackbarVisible(true);

      // If authentication error, redirect to login
      if (
        error.message?.includes("Authentication") ||
        error.message?.includes("log in")
      ) {
        setTimeout(() => {
          navigation.navigate("Login" as never);
        }, 2000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingIndicator />;
  }

  if (!employee) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <AppHeader title="Edit Employee" showBackButton />
        <View style={styles.errorContainer}>
          <Text style={{ color: theme.colors.error }}>Employee not found</Text>
          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={styles.button}
          >
            Go Back
          </Button>
          <Button
            mode="outlined"
            onPress={showJwtDiagnostics}
            style={[styles.button, { marginTop: 12 }]}
          >
            Show JWT Diagnostics
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader title="Edit Employee" showBackButton />

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
            disabled={submitting}
          >
            Update Employee
          </Button>

          <Button
            mode="outlined"
            onPress={showJwtDiagnostics}
            style={[styles.button, { marginTop: 12 }]}
            icon="key-variant"
          >
            JWT Diagnostics
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      <Portal>
        <Dialog
          visible={diagnosticDialogVisible}
          onDismiss={() => setDiagnosticDialogVisible(false)}
          style={{ maxHeight: "80%" }}
        >
          <Dialog.Title>JWT Diagnostics</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView>
              <Text
                style={{
                  padding: 10,
                  fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                }}
              >
                {diagnosticInfo}
              </Text>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setDiagnosticDialogVisible(false)}>
              Close
            </Button>
            <Button onPress={() => navigation.navigate("Login" as never)}>
              Go to Login
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

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
});

export default EditEmployeeScreen;
