import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Snackbar,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useForm, Controller } from "react-hook-form";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";

// Default password for new company admins - they will change it via reset password flow
const DEFAULT_PASSWORD = "Password123!";

interface CompanyFormData {
  company_name: string;
  registration_number: string;
  industry_type: string;
  contact_number: string;
  address_line1: string;
  address_line2: string;
  address_city: string;
  address_state: string;
  address_postal_code: string;
  address_country: string;
  admin_email: string;
  vat_type: string;
  stakeholder_name: string;
  stakeholder_percentage: string;
}

const CreateCompanyScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [stakeholders, setStakeholders] = useState<
    Array<{ name: string; percentage: number }>
  >([]);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<CompanyFormData>({
    defaultValues: {
      company_name: "",
      registration_number: "",
      industry_type: "",
      contact_number: "",
      address_line1: "",
      address_line2: "",
      address_city: "",
      address_state: "",
      address_postal_code: "",
      address_country: "",
      admin_email: "",
      vat_type: "",
      stakeholder_name: "",
      stakeholder_percentage: "",
    },
  });

  const stakeholderName = watch("stakeholder_name");
  const stakeholderPercentage = watch("stakeholder_percentage");

  const addStakeholder = () => {
    if (!stakeholderName || !stakeholderPercentage) {
      setSnackbarMessage("Please enter both stakeholder name and percentage");
      setSnackbarVisible(true);
      return;
    }

    const percentage = parseFloat(stakeholderPercentage);
    if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
      setSnackbarMessage("Percentage must be between 0 and 100");
      setSnackbarVisible(true);
      return;
    }

    setStakeholders([...stakeholders, { name: stakeholderName, percentage }]);
    reset({
      ...watch(),
      stakeholder_name: "",
      stakeholder_percentage: "",
    });
  };

  const removeStakeholder = (index: number) => {
    const newStakeholders = [...stakeholders];
    newStakeholders.splice(index, 1);
    setStakeholders(newStakeholders);
  };

  const onSubmit = async (data: CompanyFormData) => {
    try {
      setLoading(true);

      if (stakeholders.length === 0) {
        setSnackbarMessage("Please add at least one stakeholder");
        setSnackbarVisible(true);
        setLoading(false);
        return;
      }

      // Validate email domain more thoroughly
      const emailParts = data.admin_email.split("@");
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

      // Create company record
      const { data: companyData, error: companyError } = await supabase
        .from("company")
        .insert([
          {
            company_name: data.company_name,
            registration_number: data.registration_number,
            industry_type: data.industry_type,
            contact_number: data.contact_number,
            address: {
              line1: data.address_line1,
              line2: data.address_line2 || null,
              city: data.address_city,
              state: data.address_state,
              postal_code: data.address_postal_code,
              country: data.address_country,
            },
            active: true,
            created_by: user?.id,
            stakeholders,
            vat_type: data.vat_type,
          },
        ])
        .select("id")
        .single();

      if (companyError) {
        throw companyError;
      }

      // Create company admin user
      const { data: adminData, error: adminError } = await supabase.auth.signUp(
        {
          email: data.admin_email,
          password: DEFAULT_PASSWORD,
          options: {
            data: {
              company_id: companyData.id,
              role: "admin",
            },
          },
        }
      );

      if (adminError) {
        // Show more specific error for email issues
        if (
          adminError.message.includes("Email") ||
          adminError.message.includes("email")
        ) {
          throw new Error(
            `Invalid email address: ${data.admin_email}. Please use a valid email domain.`
          );
        }
        throw adminError;
      }

      if (!adminData?.user) {
        throw new Error("Failed to create company admin user");
      }

      // Create company_user record for the admin
      const { error: companyUserError } = await supabase
        .from("company_user")
        .insert([
          {
            id: adminData.user.id,
            company_id: companyData.id,
            first_name: "Company", // Default placeholder - admin will update later
            last_name: "Admin", // Default placeholder - admin will update later
            email: data.admin_email,
            role: "admin",
            active_status: "active",
            created_by: user?.id,
            phone_number: "Not provided",
            date_of_birth: new Date().toISOString(),
            nationality: "Not provided",
          },
        ]);

      if (companyUserError) {
        throw companyUserError;
      }

      // Send magic link to the admin
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email: data.admin_email,
        options: {
          emailRedirectTo: "businessmanagementapp://auth/callback",
        },
      });

      if (magicLinkError) {
        throw magicLinkError;
      }

      setSnackbarMessage(
        "Company created successfully and invitation sent to admin"
      );
      setSnackbarVisible(true);

      // Navigate back to companies list after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (error: any) {
      console.error("Error creating company:", error);
      setSnackbarMessage(error.message || "Failed to create company");
      setSnackbarVisible(true);

      // If the error was related to the auth step but company was created,
      // you might want to clean up the orphaned company record
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader title="Create Company" showBackButton />

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
            Company Information
          </Text>

          <Controller
            control={control}
            rules={{ required: "Company name is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Company Name *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.company_name}
                style={styles.input}
                disabled={loading}
              />
            )}
            name="company_name"
          />
          {errors.company_name && (
            <Text style={styles.errorText}>{errors.company_name.message}</Text>
          )}

          <Controller
            control={control}
            rules={{ required: "Registration number is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Registration Number *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.registration_number}
                style={styles.input}
                disabled={loading}
              />
            )}
            name="registration_number"
          />
          {errors.registration_number && (
            <Text style={styles.errorText}>
              {errors.registration_number.message}
            </Text>
          )}

          <Controller
            control={control}
            rules={{ required: "Industry type is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Industry Type *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.industry_type}
                style={styles.input}
                disabled={loading}
              />
            )}
            name="industry_type"
          />
          {errors.industry_type && (
            <Text style={styles.errorText}>{errors.industry_type.message}</Text>
          )}

          <Controller
            control={control}
            rules={{ required: "Contact number is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Contact Number *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.contact_number}
                style={styles.input}
                keyboardType="phone-pad"
                disabled={loading}
              />
            )}
            name="contact_number"
          />
          {errors.contact_number && (
            <Text style={styles.errorText}>
              {errors.contact_number.message}
            </Text>
          )}

          <Controller
            control={control}
            rules={{ required: "VAT type is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="VAT Type *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.vat_type}
                style={styles.input}
                disabled={loading}
              />
            )}
            name="vat_type"
          />
          {errors.vat_type && (
            <Text style={styles.errorText}>{errors.vat_type.message}</Text>
          )}

          <Text
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            Company Address
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
            <Text style={styles.errorText}>{errors.address_line1.message}</Text>
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
                <Text style={styles.errorText}>
                  {errors.address_city.message}
                </Text>
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
                <Text style={styles.errorText}>
                  {errors.address_state.message}
                </Text>
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
                <Text style={styles.errorText}>
                  {errors.address_postal_code.message}
                </Text>
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
                <Text style={styles.errorText}>
                  {errors.address_country.message}
                </Text>
              )}
            </View>
          </View>

          <Text
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            Stakeholders
          </Text>

          <View style={styles.stakeholdersContainer}>
            {stakeholders.map((stakeholder, index) => (
              <View key={index} style={styles.stakeholderItem}>
                <Text style={styles.stakeholderText}>
                  {stakeholder.name} ({stakeholder.percentage}%)
                </Text>
                <Button
                  mode="text"
                  onPress={() => removeStakeholder(index)}
                  disabled={loading}
                >
                  Remove
                </Button>
              </View>
            ))}

            {stakeholders.length === 0 && (
              <Text style={styles.noStakeholdersText}>
                No stakeholders added yet. Please add at least one.
              </Text>
            )}
          </View>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Controller
                control={control}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label="Stakeholder Name"
                    mode="outlined"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    style={styles.input}
                    disabled={loading}
                  />
                )}
                name="stakeholder_name"
              />
            </View>

            <View style={styles.halfInput}>
              <Controller
                control={control}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label="Percentage"
                    mode="outlined"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    style={styles.input}
                    keyboardType="numeric"
                    disabled={loading}
                  />
                )}
                name="stakeholder_percentage"
              />
            </View>
          </View>

          <Button
            mode="contained-tonal"
            onPress={addStakeholder}
            style={styles.addButton}
            disabled={loading}
          >
            Add Stakeholder
          </Button>

          <Text
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            Company Admin
          </Text>

          <Controller
            control={control}
            rules={{
              required: "Admin email is required",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Invalid email address",
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Admin Email *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.admin_email}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                disabled={loading}
              />
            )}
            name="admin_email"
          />
          {errors.admin_email && (
            <Text style={styles.errorText}>{errors.admin_email.message}</Text>
          )}

          <Text style={styles.helperText}>
            An invitation will be sent to this email to set up the company admin
            account. The admin will need to complete their profile after first
            login. Please use a valid email address (e.g., name@company.com,
            name@gmail.com).
          </Text>

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            style={styles.submitButton}
            loading={loading}
            disabled={loading}
          >
            Create Company
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
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfInput: {
    width: "48%",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 4,
  },
  stakeholdersContainer: {
    marginBottom: 16,
  },
  stakeholderItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  stakeholderText: {
    fontSize: 16,
  },
  noStakeholdersText: {
    fontStyle: "italic",
    opacity: 0.7,
    marginBottom: 16,
  },
  addButton: {
    marginBottom: 24,
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
});

export default CreateCompanyScreen;
