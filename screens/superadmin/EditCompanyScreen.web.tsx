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
  Snackbar,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useForm, Controller } from "react-hook-form";
import { supabase } from "../../lib/supabase";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import { Company } from "../../types";

type EditCompanyRouteParams = {
  companyId: string;
};

interface CompanyFormData {
  company_name: string;
  registration_number: string;
  industry_type: string;
  contact_number: string;
  contact_email: string;
  address_line1: string;
  address_line2: string;
  address_city: string;
  address_state: string;
  address_postal_code: string;
  address_country: string;
  vat_type: string;
  stakeholder_name: string;
  stakeholder_percentage: string;
}

const EditCompanyScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<Record<string, EditCompanyRouteParams>, string>>();
  const { companyId } = route.params;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [stakeholders, setStakeholders] = useState<
    Array<{ name: string; percentage: number }>
  >([]);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
  } = useForm<CompanyFormData>({
    defaultValues: {
      company_name: "",
      registration_number: "",
      industry_type: "",
      contact_number: "",
      contact_email: "",
      address_line1: "",
      address_line2: "",
      address_city: "",
      address_state: "",
      address_postal_code: "",
      address_country: "",
      vat_type: "",
      stakeholder_name: "",
      stakeholder_percentage: "",
    },
  });

  const stakeholderName = watch("stakeholder_name");
  const stakeholderPercentage = watch("stakeholder_percentage");

  const fetchCompanyDetails = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("company")
        .select("*")
        .eq("id", companyId)
        .single();

      if (error) {
        console.error("Error fetching company details:", error);
        return;
      }

      setCompany(data);
      setStakeholders(data.stakeholders || []);

      // Set form values
      setValue("company_name", data.company_name);
      setValue("registration_number", data.registration_number);
      setValue("industry_type", data.industry_type);
      setValue("contact_number", data.contact_number);
      setValue("contact_email", data.contact_email);
      setValue("vat_type", data.vat_type);

      // Set address values
      if (data.address) {
        setValue("address_line1", data.address.line1);
        setValue("address_line2", data.address.line2 || "");
        setValue("address_city", data.address.city);
        setValue("address_state", data.address.state);
        setValue("address_postal_code", data.address.postal_code);
        setValue("address_country", data.address.country);
      }
    } catch (error) {
      console.error("Error fetching company details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanyDetails();
  }, [companyId]);

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
    setValue("stakeholder_name", "");
    setValue("stakeholder_percentage", "");
  };

  const removeStakeholder = (index: number) => {
    const newStakeholders = [...stakeholders];
    newStakeholders.splice(index, 1);
    setStakeholders(newStakeholders);
  };

  const onSubmit = async (data: CompanyFormData) => {
    try {
      setSubmitting(true);

      if (stakeholders.length === 0) {
        setSnackbarMessage("Please add at least one stakeholder");
        setSnackbarVisible(true);
        setSubmitting(false);
        return;
      }

      // Update company record
      const { error } = await supabase
        .from("company")
        .update({
          company_name: data.company_name,
          registration_number: data.registration_number,
          industry_type: data.industry_type,
          contact_number: data.contact_number,
          contact_email: data.contact_email,
          address: {
            line1: data.address_line1,
            line2: data.address_line2 || null,
            city: data.address_city,
            state: data.address_state,
            postal_code: data.address_postal_code,
            country: data.address_country,
          },
          stakeholders,
          vat_type: data.vat_type,
        })
        .eq("id", companyId);

      if (error) {
        throw error;
      }

      setSnackbarMessage("Company updated successfully");
      setSnackbarVisible(true);

      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error: any) {
      console.error("Error updating company:", error);
      setSnackbarMessage(error.message || "Failed to update company");
      setSnackbarVisible(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingIndicator />;
  }

  if (!company) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <AppHeader
          title="Edit Company"
          showBackButton={true}
          showLogo={false}
        />
        <View style={styles.errorContainer}>
          <Text style={{ color: theme.colors.error }}>Company not found</Text>
          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={styles.button}
          >
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader title="Edit Company" showBackButton={true} showLogo={false} />

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
                disabled={submitting}
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
                disabled={submitting}
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
                disabled={submitting}
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
                disabled={submitting}
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
            rules={{
              required: "Contact email is required",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Invalid email address",
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Contact Email *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.contact_email}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                disabled={submitting}
              />
            )}
            name="contact_email"
          />
          {errors.contact_email && (
            <Text style={styles.errorText}>{errors.contact_email.message}</Text>
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
                disabled={submitting}
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
                disabled={submitting}
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
                    disabled={submitting}
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
                    disabled={submitting}
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
                    disabled={submitting}
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
                  disabled={submitting}
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
                    disabled={submitting}
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
                    disabled={submitting}
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
            disabled={submitting}
          >
            Add Stakeholder
          </Button>

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            style={styles.submitButton}
            loading={submitting}
            disabled={submitting}
          >
            Update Company
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
  submitButton: {
    marginTop: 16,
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

export default EditCompanyScreen;
