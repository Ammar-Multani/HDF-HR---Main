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
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useForm, Controller } from "react-hook-form";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
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
import { hashPassword } from "../../utils/auth";

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
}

// Default password for new employees - they will change it via reset password flow
const DEFAULT_PASSWORD = "Password123!";

const CreateEmployeeScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

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
    },
  });

  const dateOfBirth = watch("date_of_birth");
  const employmentStartDate = watch("employment_start_date");

  const fetchCompanyId = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("company_user")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching company ID:", error);
        return;
      }

      setCompanyId(data.company_id);
    } catch (error) {
      console.error("Error fetching company ID:", error);
    }
  };

  useEffect(() => {
    fetchCompanyId();
  }, [user]);

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

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      if (!user || !companyId) {
        setSnackbarMessage("User or company information not available");
        setSnackbarVisible(true);
        return;
      }

      setLoading(true);

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

      // Convert employment_type to boolean (true for full-time/part-time, false for contract/temporary)
      const isEmployeeType =
        data.employment_type === EmploymentType.FULL_TIME ||
        data.employment_type === EmploymentType.PART_TIME;

      // Hash the default password for the new employee
      const hashedPassword = await hashPassword(DEFAULT_PASSWORD);

      // Check if user with this email already exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", data.email)
        .single();

      if (existingUser) {
        throw new Error("A user with this email already exists");
      }

      // Create the user in our custom users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .insert({
          email: data.email,
          password_hash: hashedPassword,
          status: "active", // Set as active so they can log in immediately
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (userError) {
        throw userError;
      }

      // Create employee record
      const { error: employeeError } = await supabase
        .from("company_user")
        .insert([
          {
            id: userData.id,
            company_id: companyId,
            first_name: data.first_name,
            last_name: data.last_name,
            email: data.email,
            phone_number: data.phone_number,
            role: UserRole.EMPLOYEE,
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
          },
        ]);

      if (employeeError) {
        throw employeeError;
      }

      // Generate a reset token for the new employee
      const { error: resetTokenError } = await supabase
        .from("users")
        .update({
          reset_token:
            Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15),
          reset_token_expires: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000
          ).toISOString(), // 7 days from now
        })
        .eq("id", userData.id);

      if (resetTokenError) {
        console.error("Error setting reset token:", resetTokenError);
        // Non-critical error, continue
      }

      setSnackbarMessage(
        "Employee created successfully! Temporary password is: " +
          DEFAULT_PASSWORD
      );
      setSnackbarVisible(true);

      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 5000); // Give them time to see the password
    } catch (error: any) {
      console.error("Error creating employee:", error);
      setSnackbarMessage(error.message || "Failed to create employee");
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  if (!companyId) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader title="Create Employee" showBackButton />

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
                disabled={loading}
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
              <SegmentedButtons
                value={value}
                onValueChange={onChange}
                buttons={[
                  { value: IDType.ID_CARD, label: "ID Card" },
                  { value: IDType.PASSPORT, label: "Passport" },
                  { value: IDType.DRIVERS_LICENSE, label: "Driver's License" },
                ]}
                style={styles.segmentedButtons}
              />
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
                disabled={loading}
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

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            style={styles.submitButton}
            loading={loading}
            disabled={loading}
          >
            Create Employee
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

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
});

export default CreateEmployeeScreen;
