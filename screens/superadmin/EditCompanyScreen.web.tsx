import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Snackbar,
  Card,
  Portal,
  Surface,
  Switch,
  TouchableRipple,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useForm, Controller } from "react-hook-form";
import { supabase } from "../../lib/supabase";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import { Company } from "../../types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import CustomSnackbar from "../../components/CustomSnackbar";
import { t } from "i18next";
import { ActivityType } from "../../types/activity-log";
import { useAuth } from "../../contexts/AuthContext";

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
  can_upload_receipts: boolean;
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

const EditCompanyScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<Record<string, EditCompanyRouteParams>, string>>();
  const { companyId } = route.params;
  const dimensions = useWindowDimensions();
  const { user } = useAuth();

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

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
      can_upload_receipts: false,
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
      setValue("can_upload_receipts", data.can_upload_receipts || false);

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
      setSnackbarMessage(
        t("superAdmin.companies.stakeholderNameAndPercentRequired")
      );
      setSnackbarVisible(true);
      return;
    }

    const percentage = parseFloat(stakeholderPercentage);
    if (isNaN(percentage) || percentage <= 0 || percentage > 100) {
      setSnackbarMessage(t("superAdmin.companies.percentageBetween"));
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

      // Validate stakeholders first
      if (stakeholders.length === 0) {
        setSnackbarMessage(t("superAdmin.companies.stakeholdersRequired"));
        setSnackbarVisible(true);
        setSubmitting(false);
        return;
      }

      // Validate stakeholders total percentage
      const totalPercentage = stakeholders.reduce(
        (sum, s) => sum + s.percentage,
        0
      );

      if (totalPercentage > 100) {
        setSnackbarMessage(t("superAdmin.companies.totalPercentageExceeds"));
        setSnackbarVisible(true);
        setSubmitting(false);
        return;
      }

      if (totalPercentage < 100) {
        setSnackbarMessage(t("superAdmin.companies.totalPercentageMustBe100"));
        setSnackbarVisible(true);
        setSubmitting(false);
        return;
      }

      // Get super admin's name from admin table
      const { data: adminDetails, error: adminDetailsError } = await supabase
        .from("admin")
        .select("id, name, email")
        .eq("email", user?.email)
        .single();

      if (adminDetailsError) {
        console.error("Error fetching admin details:", adminDetailsError);
      }

      const userDisplayName = adminDetails?.name || user?.email || "";

      // Track changes for activity log
      const changes: string[] = [];

      // Helper function to compare values and track changes
      const compareAndTrackChange = (
        oldVal: any,
        newVal: any,
        fieldName: string
      ) => {
        if (oldVal !== undefined && newVal !== undefined && oldVal !== newVal) {
          changes.push(fieldName);
        }
      };

      // Compare each field individually
      compareAndTrackChange(
        company?.company_name,
        data.company_name,
        "company name"
      );
      compareAndTrackChange(
        company?.registration_number,
        data.registration_number,
        "registration number"
      );
      compareAndTrackChange(
        company?.industry_type,
        data.industry_type,
        "industry type"
      );
      compareAndTrackChange(
        company?.contact_number,
        data.contact_number,
        "contact number"
      );
      compareAndTrackChange(
        company?.contact_email,
        data.contact_email,
        "contact email"
      );
      compareAndTrackChange(company?.vat_type, data.vat_type, "VAT type");
      compareAndTrackChange(
        company?.can_upload_receipts,
        data.can_upload_receipts,
        "receipt upload permission"
      );

      // Check address changes more precisely
      const oldAddress = company?.address || {};
      const newAddress = {
        line1: data.address_line1,
        line2: data.address_line2 || null,
        city: data.address_city,
        state: data.address_state,
        postal_code: data.address_postal_code,
        country: data.address_country,
      };

      // Compare each address field
      const addressChanges: string[] = [];
      if (oldAddress.line1 !== newAddress.line1)
        addressChanges.push("street address");
      if (oldAddress.line2 !== newAddress.line2)
        addressChanges.push("address line 2");
      if (oldAddress.city !== newAddress.city) addressChanges.push("city");
      if (oldAddress.state !== newAddress.state) addressChanges.push("state");
      if (oldAddress.postal_code !== newAddress.postal_code)
        addressChanges.push("postal code");
      if (oldAddress.country !== newAddress.country)
        addressChanges.push("country");

      if (addressChanges.length > 0) {
        changes.push(`address (${addressChanges.join(", ")})`);
      }

      // Compare stakeholders more precisely
      const oldStakeholders = company?.stakeholders || [];
      if (stakeholders.length !== oldStakeholders.length) {
        changes.push("stakeholders list");
      } else {
        // Check if any stakeholder details changed
        const hasStakeholderChanges = stakeholders.some((newStake, index) => {
          const oldStake = oldStakeholders[index];
          return (
            !oldStake ||
            oldStake.name !== newStake.name ||
            oldStake.percentage !== newStake.percentage
          );
        });
        if (hasStakeholderChanges) {
          changes.push("stakeholder details");
        }
      }

      // Only proceed with update if there are actual changes
      if (changes.length === 0) {
        setSnackbarMessage(
          t("superAdmin.companies.noChangesDetected") || "No changes detected"
        );
        setSnackbarVisible(true);
        setSubmitting(false);
        return;
      }

      // Store old values before update
      const oldValue = {
        company_name: company?.company_name,
        registration_number: company?.registration_number,
        industry_type: company?.industry_type,
        contact_number: company?.contact_number,
        contact_email: company?.contact_email,
        address: company?.address,
        stakeholders: company?.stakeholders,
        vat_type: company?.vat_type,
        can_upload_receipts: company?.can_upload_receipts,
      };

      // Update company record
      const { error } = await supabase
        .from("company")
        .update({
          company_name: data.company_name,
          registration_number: data.registration_number,
          industry_type: data.industry_type,
          contact_number: data.contact_number,
          contact_email: data.contact_email,
          address: newAddress,
          stakeholders,
          vat_type: data.vat_type,
          can_upload_receipts: data.can_upload_receipts,
        })
        .eq("id", companyId);

      if (error) {
        throw error;
      }

      // Log the company update activity
      const activityLogData = {
        user_id: user?.id,
        activity_type: ActivityType.UPDATE_COMPANY,
        description: `Company "${data.company_name}" was updated`,
        company_id: companyId,
        metadata: {
          updated_by: {
            id: user?.id || "",
            name: userDisplayName,
            email: user?.email || "",
            role: "superadmin",
          },
          company: {
            id: companyId,
            name: data.company_name,
          },
          changes: changes,
        },
        old_value: oldValue,
        new_value: {
          company_name: data.company_name,
          registration_number: data.registration_number,
          industry_type: data.industry_type,
          contact_number: data.contact_number,
          contact_email: data.contact_email,
          address: newAddress,
          stakeholders: stakeholders,
          vat_type: data.vat_type,
          can_upload_receipts: data.can_upload_receipts,
        },
      };

      const { error: logError } = await supabase
        .from("activity_logs")
        .insert([activityLogData]);

      if (logError) {
        console.error("Error logging activity:", logError);
        // Don't throw here as the company was updated successfully
      }

      setSnackbarMessage(t("superAdmin.companies.updateSuccess"));
      setSnackbarVisible(true);

      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error: any) {
      console.error("Error updating company:", error);
      setSnackbarMessage(
        error.message || t("superAdmin.companies.updateError")
      );
      setSnackbarVisible(true);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <AppHeader
          title={t("superAdmin.companies.editCompany")}
          showBackButton={true}
          showLogo={false}
          showHelpButton={true}
          absolute={false}
        />
        <LoadingIndicator />
      </SafeAreaView>
    );
  }

  if (!company) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <AppHeader
          title={t("superAdmin.companies.editCompany")}
          showBackButton={true}
          showLogo={false}
          showHelpButton={true}
          absolute={false}
        />
        <View style={styles.errorContainer}>
          <Text style={{ color: theme.colors.error }}>
            {t("superAdmin.companies.companyNotFound")}
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={styles.button}
          >
            {t("common.goBack")}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  const renderSectionHeader = (
    title: string,
    icon: "office-building" | "map-marker" | "account-group"
  ) => (
    <View style={styles.sectionHeader}>
      <View style={styles.headerLeft}>
        <View style={styles.iconContainer}>
          <MaterialCommunityIcons name={icon} size={20} color="#64748b" />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader
        title={t("superAdmin.companies.editCompany")}
        showBackButton={true}
        showLogo={false}
        showHelpButton={true}
        absolute={false}
      />

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
          <View style={styles.headerSection}>
            <Text style={styles.pageTitle}>
              {t("superAdmin.companies.editCompany")}: {company.company_name}
            </Text>
          </View>

          <View style={styles.gridContainer}>
            <View style={styles.gridColumn}>
              <Animated.View entering={FadeIn.delay(100)}>
                <Card style={styles.formCard}>
                  {renderSectionHeader(
                    t("superAdmin.companies.companyInformation"),
                    "office-building"
                  )}
                  <Card.Content style={styles.cardContent}>
                    <Controller
                      control={control}
                      name="company_name"
                      rules={{
                        required: t("superAdmin.companies.companyNameRequired"),
                        minLength: {
                          value: 2,
                          message: t(
                            "superAdmin.companies.companyNameMinLength"
                          ),
                        },
                        maxLength: {
                          value: 100,
                          message: t(
                            "superAdmin.companies.companyNameMaxLength"
                          ),
                        },
                        pattern: {
                          value: /^[a-zA-Z0-9\s\-&.]+$/,
                          message: t(
                            "superAdmin.companies.companyNameInvalidChars"
                          ),
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={`${t("superAdmin.companies.companyName")} *`}
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          error={!!errors.company_name}
                          style={styles.input}
                          disabled={submitting}
                        />
                      )}
                    />
                    {errors.company_name && (
                      <Text style={styles.errorText}>
                        {errors.company_name.message}
                      </Text>
                    )}

                    <Controller
                      control={control}
                      name="registration_number"
                      rules={{
                        required: t(
                          "superAdmin.companies.registrationNumberRequired"
                        ),
                        minLength: {
                          value: 5,
                          message: t(
                            "superAdmin.companies.registrationNumberMinLength"
                          ),
                        },
                        maxLength: {
                          value: 30,
                          message: t(
                            "superAdmin.companies.registrationNumberMaxLength"
                          ),
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={`${t("superAdmin.companies.registrationNumber")} *`}
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          error={!!errors.registration_number}
                          style={styles.input}
                          disabled={submitting}
                        />
                      )}
                    />
                    {errors.registration_number && (
                      <Text style={styles.errorText}>
                        {errors.registration_number.message}
                      </Text>
                    )}

                    <Controller
                      control={control}
                      name="industry_type"
                      rules={{
                        required: t(
                          "superAdmin.companies.industryTypeRequired"
                        ),
                        minLength: {
                          value: 3,
                          message: t(
                            "superAdmin.companies.industryTypeMinLength"
                          ),
                        },
                        maxLength: {
                          value: 50,
                          message: t(
                            "superAdmin.companies.industryTypeMaxLength"
                          ),
                        },
                        pattern: {
                          value: /^[a-zA-Z\s\-&]{3,50}$/,
                          message: t(
                            "superAdmin.companies.industryTypeInvalidChars"
                          ),
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={`${t("superAdmin.companies.industryType")} *`}
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          error={!!errors.industry_type}
                          style={styles.input}
                          disabled={submitting}
                        />
                      )}
                    />
                    {errors.industry_type && (
                      <Text style={styles.errorText}>
                        {errors.industry_type.message}
                      </Text>
                    )}

                    <Controller
                      control={control}
                      name="contact_number"
                      rules={{
                        required: t(
                          "superAdmin.companies.contactNumberRequired"
                        ),
                        pattern: {
                          value: /^\+?[0-9]{8,15}$/,
                          message: t(
                            "superAdmin.companies.contactNumberInvalidFormat"
                          ),
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={`${t("superAdmin.companies.contactNumber")} *`}
                          mode="outlined"
                          value={value}
                          onChangeText={(text) =>
                            onChange(text.replace(/[^0-9+]/g, ""))
                          }
                          onBlur={onBlur}
                          error={!!errors.contact_number}
                          style={styles.input}
                          keyboardType="phone-pad"
                          disabled={submitting}
                        />
                      )}
                    />
                    {errors.contact_number && (
                      <Text style={styles.errorText}>
                        {errors.contact_number.message}
                      </Text>
                    )}

                    <Controller
                      control={control}
                      name="contact_email"
                      rules={{
                        required: t(
                          "superAdmin.companies.contactEmailRequired"
                        ),
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: t("superAdmin.companies.invalidEmail"),
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={`${t("superAdmin.companies.contactEmail")} *`}
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
                    />
                    {errors.contact_email && (
                      <Text style={styles.errorText}>
                        {errors.contact_email.message}
                      </Text>
                    )}

                    <Controller
                      control={control}
                      name="vat_type"
                      rules={{
                        required: t("superAdmin.companies.vatTypeRequired"),
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={`${t("superAdmin.companies.vatType")} *`}
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          error={!!errors.vat_type}
                          style={styles.input}
                          disabled={submitting}
                          placeholder={t(
                            "superAdmin.companies.vatTypePlaceholder"
                          )}
                        />
                      )}
                    />
                    {errors.vat_type && (
                      <Text style={styles.errorText}>
                        {errors.vat_type.message}
                      </Text>
                    )}

                    <Surface style={styles.toggleCard} elevation={0}>
                      <TouchableRipple
                        onPress={() => {
                          if (!submitting) {
                            const currentValue = watch("can_upload_receipts");
                            setValue("can_upload_receipts", !currentValue);
                          }
                        }}
                        style={styles.toggleTouchable}
                      >
                        <View style={styles.toggleContent}>
                          <View style={styles.toggleLeft}>
                            <View style={styles.toggleIconContainer}>
                              <MaterialCommunityIcons
                                name="receipt"
                                size={20}
                                color={theme.colors.primary}
                              />
                            </View>
                            <View>
                              <Text style={styles.toggleLabel}>
                                {t("superAdmin.companies.allowReceiptUploads")}
                              </Text>
                              <Text style={styles.toggleDescription}>
                                {t("superAdmin.companies.receiptUploadsHelper")}
                              </Text>
                            </View>
                          </View>
                          <Controller
                            name="can_upload_receipts"
                            control={control}
                            render={({ field: { onChange, value } }) => (
                              <Switch
                                value={value}
                                onValueChange={onChange}
                                disabled={submitting}
                                color={theme.colors.primary}
                              />
                            )}
                          />
                        </View>
                      </TouchableRipple>
                    </Surface>
                  </Card.Content>
                </Card>

                <Card style={[styles.formCard, { marginTop: 24 }]}>
                  {renderSectionHeader(
                    t("superAdmin.companies.stakeholders"),
                    "account-group"
                  )}
                  <Card.Content style={styles.cardContent}>
                    <View style={styles.stakeholdersContainer}>
                      {stakeholders.map((stakeholder, index) => (
                        <View key={index} style={styles.stakeholderItem}>
                          <View style={styles.stakeholderCard}>
                            <Text style={styles.stakeholderName}>
                              {stakeholder.name}
                            </Text>
                            <Text style={styles.stakeholderPercentage}>
                              {stakeholder.percentage}%
                            </Text>
                            <Button
                              mode="text"
                              onPress={() => removeStakeholder(index)}
                              disabled={submitting}
                              style={styles.removeButton}
                            >
                              Remove
                            </Button>
                          </View>
                        </View>
                      ))}

                      {stakeholders.length === 0 && (
                        <Text style={styles.noStakeholdersText}>
                          No stakeholders added yet. Please add at least one.
                        </Text>
                      )}

                      <View style={styles.addStakeholderSection}>
                        <View style={styles.row}>
                          <View style={styles.halfInput}>
                            <Controller
                              control={control}
                              render={({
                                field: { onChange, onBlur, value },
                              }) => (
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
                              render={({
                                field: { onChange, onBlur, value },
                              }) => (
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
                        <View style={styles.addStakeholderButtonContainer}>
                          <Button
                            mode="contained"
                            onPress={addStakeholder}
                            style={[
                              styles.addStakeholderButton,
                              { backgroundColor: theme.colors.secondary },
                            ]}
                            disabled={submitting}
                          >
                            Add Stakeholder
                          </Button>
                        </View>
                      </View>
                    </View>
                  </Card.Content>
                </Card>
              </Animated.View>
            </View>

            <View style={styles.gridColumn}>
              <Animated.View entering={FadeIn.delay(200)}>
                <Card style={styles.formCard}>
                  {renderSectionHeader(
                    t("superAdmin.companies.address"),
                    "map-marker"
                  )}
                  <Card.Content style={styles.cardContent}>
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
                      <Text style={styles.errorText}>
                        {errors.address_line1.message}
                      </Text>
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
                          name="address_postal_code"
                          rules={{
                            required: t(
                              "superAdmin.companies.postalCodeRequired"
                            ),
                            pattern: {
                              value: /^[A-Z0-9][A-Z0-9\s-]{1,8}[A-Z0-9]$/i,
                              message: t(
                                "superAdmin.companies.postalCodeInvalidFormat"
                              ),
                            },
                          }}
                          render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                              label={`${t("superAdmin.companies.postalCode")} *`}
                              mode="outlined"
                              value={value}
                              onChangeText={(text) =>
                                onChange(text.replace(/[^A-Za-z0-9\s-]/g, ""))
                              }
                              onBlur={onBlur}
                              error={!!errors.address_postal_code}
                              style={styles.input}
                              disabled={submitting}
                            />
                          )}
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
                  </Card.Content>
                </Card>
              </Animated.View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Surface style={styles.bottomBar}>
        <View style={styles.bottomBarContent}>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={[styles.button, styles.cancelButton]}
            disabled={loading}
          >
            {t("common.cancel")}
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            style={styles.submitButton}
            loading={submitting}
            disabled={submitting}
          >
            {t("superAdmin.companies.editCompany")}
          </Button>
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
  headerSection: {
    marginBottom: 32,
  },
  pageTitle: {
    fontSize: Platform.OS === "web" ? 32 : 24,
    fontWeight: "600",
    color: "#1e293b",
  },
  gridContainer: {
    flexDirection: "row",
    gap: 24,
    flexWrap: "wrap",
  },
  gridColumn: {
    flex: 1,
    minWidth: 320,
    gap: 24,
  },
  formCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionHeader: {
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  cardContent: {
    padding: 24,
    backgroundColor: "#ffffff",
  },
  input: {
    marginBottom: 16,
    backgroundColor: "#ffffff",
  },
  row: {
    flexDirection: "row",
    gap: 16,
  },
  halfInput: {
    flex: 1,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
    marginLeft: 4,
  },
  stakeholdersContainer: {
    gap: 16,
  },
  stakeholderItem: {
    marginBottom: 8,
  },
  stakeholderCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  stakeholderName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#1e293b",
  },
  stakeholderPercentage: {
    fontSize: 14,
    color: "#64748b",
    marginRight: 16,
  },
  removeButton: {
    marginLeft: "auto",
  },
  noStakeholdersText: {
    color: "#64748b",
    fontStyle: "italic",
    textAlign: "center",
    padding: 16,
  },
  addStakeholderSection: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    gap: 16,
  },
  addButton: {
    marginTop: 8,
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
  cancelButton: {
    borderColor: "#E0E0E0",
  },
  addStakeholderButton: {
    backgroundColor: "#E0E0E0",
    flex: 1,
    alignSelf: "flex-end",
  },
  addStakeholderButtonContainer: {
    marginTop: 5,
  },
  submitButton: {},
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  button: {
    minWidth: 120,
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
  toggleCard: {
    marginTop: 8,
    marginBottom: 16,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  toggleTouchable: {
    padding: 16,
  },
  toggleContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 16,
  },
  toggleIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: "#e2e8f0",
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#1e293b",
    marginBottom: 4,
  },
  toggleDescription: {
    fontSize: 14,
    color: "#64748b",
    lineHeight: 20,
  },
});

export default EditCompanyScreen;
