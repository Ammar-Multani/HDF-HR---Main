import React, { useState, useEffect } from "react";
import { logDebug } from "../../utils/logger";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Snackbar,
  Card,
  Surface,
  Switch,
  TouchableRipple,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useForm, Controller } from "react-hook-form";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { sendCompanyAdminInviteEmail } from "../../utils/emailService";
import CustomSnackbar from "../../components/CustomSnackbar";
import { ActivityType } from "../../types/activity-log";

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
  admin_email: string;
  admin_password: string;
  admin_first_name: string;
  admin_last_name: string;
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

const CreateCompanyScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const dimensions = useWindowDimensions();
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
    register,
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
      admin_email: "",
      admin_password: "",
      admin_first_name: "",
      admin_last_name: "",
      vat_type: "",
      stakeholder_name: "",
      stakeholder_percentage: "",
      can_upload_receipts: false,
    },
    mode: "onBlur",
  });

  useEffect(() => {
    // Register all fields with their validation rules
    register("company_name", {
      required: t("superAdmin.companies.companyNameRequired"),
      minLength: {
        value: 2,
        message: t("superAdmin.companies.companyNameMinLength"),
      },
      maxLength: {
        value: 100,
        message: t("superAdmin.companies.companyNameMaxLength"),
      },
      pattern: {
        value: /^[a-zA-Z0-9\s\-&.]+$/,
        message: t("superAdmin.companies.companyNameInvalidChars"),
      },
    });
    register("registration_number", {
      required: t("superAdmin.companies.registrationNumberRequired"),
      minLength: {
        value: 5,
        message: t("superAdmin.companies.registrationNumberMinLength"),
      },
      maxLength: {
        value: 30,
        message: t("superAdmin.companies.registrationNumberMaxLength"),
      },
    });
    register("industry_type", {
      required: t("superAdmin.companies.industryTypeRequired"),
      minLength: {
        value: 3,
        message: t("superAdmin.companies.industryTypeMinLength"),
      },
      maxLength: {
        value: 50,
        message: t("superAdmin.companies.industryTypeMaxLength"),
      },
      pattern: {
        value: /^[a-zA-Z\s\-&]{3,50}$/,
        message: t("superAdmin.companies.industryTypeInvalidChars"),
      },
    });
    register("contact_number", {
      required: t("superAdmin.companies.contactNumberRequired"),
      pattern: {
        value: /^\+?[0-9]{8,15}$/,
        message: t("superAdmin.companies.contactNumberInvalidFormat"),
      },
    });
    register("address_postal_code", {
      required: t("superAdmin.companies.postalCodeRequired"),
      pattern: {
        value: /^[A-Z0-9][A-Z0-9\s-]{1,8}[A-Z0-9]$/i,
        message: t("superAdmin.companies.postalCodeInvalidFormat"),
      },
    });
    register("admin_password", {
      required: t("superAdmin.companies.adminPasswordRequired"),
      minLength: {
        value: 8,
        message: t("superAdmin.companies.passwordMinLength"),
      },
      pattern: {
        value:
          /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
        message: t("superAdmin.companies.passwordComplexityRequirements"),
      },
      validate: (value) => {
        if (value.includes(" ")) {
          return t("superAdmin.companies.passwordNoSpaces");
        }
        if (/(.)\1{2,}/.test(value)) {
          return t("superAdmin.companies.passwordNoRepeatingChars");
        }
        return true;
      },
    });
  }, [register, t]);

  const stakeholderName = watch("stakeholder_name");
  const stakeholderPercentage = watch("stakeholder_percentage");

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
      setSnackbarVisible(false);

      // Check if user is authenticated
      if (!user?.id) {
        setSnackbarMessage(
          t("common.errors.notAuthenticated") ||
            "You must be logged in to perform this action"
        );
        setSnackbarVisible(true);
        setLoading(false);
        return;
      }

      // Validate stakeholders first
      if (stakeholders.length === 0) {
        setSnackbarMessage(t("superAdmin.companies.stakeholdersRequired"));
        setSnackbarVisible(true);
        setLoading(false);
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
        setLoading(false);
        return;
      }

      if (totalPercentage < 100) {
        setSnackbarMessage(t("superAdmin.companies.totalPercentageMustBe100"));
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
        setSnackbarMessage(t("superAdmin.companies.invalidEmailDomain"));
        setSnackbarVisible(true);
        setLoading(false);
        return;
      }

      // Validate password strength
      if (data.admin_password.length < 8) {
        setSnackbarMessage(t("superAdmin.companies.passwordLength"));
        setSnackbarVisible(true);
        setLoading(false);
        return;
      }

      // Prepare company data
      const companyData = {
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
        active: true,
        created_by: user.id,
        stakeholders,
        vat_type: data.vat_type,
        can_upload_receipts: data.can_upload_receipts,
      };

      // Create company record and get the ID
      const { data: newCompany, error: companyError } = await supabase
        .from("company")
        .insert([companyData])
        .select("id")
        .single();

      if (companyError) {
        console.error("Company creation error:", companyError);
        throw new Error(
          t("superAdmin.companies.errorCreatingCompany") ||
            "Error creating company"
        );
      }

      if (!newCompany?.id) {
        throw new Error(
          t("superAdmin.companies.companyCreationFailed") ||
            "Company creation failed"
        );
      }

      // Create company admin using the Edge Function
      const { data: adminResult, error: adminError } =
        await supabase.functions.invoke("user-management", {
          body: {
            action: "create_company_admin",
            email: data.admin_email,
            password: data.admin_password,
            company_id: newCompany.id,
            created_by: user.id,
            first_name: data.admin_first_name,
            last_name: data.admin_last_name,
          },
        });

      if (adminError || !adminResult?.user) {
        // Delete the company if admin creation fails
        await supabase.from("company").delete().eq("id", newCompany.id);

        // Handle structured error response
        if (adminResult?.error) {
          const error = adminResult.error;
          let errorMessage = "";

          switch (error.code) {
            case "user_exists":
              errorMessage = t("superAdmin.companies.adminEmailAlreadyExists", {
                email: error.details?.email,
              });
              break;
            case "auth_error":
              errorMessage = t("superAdmin.companies.authError", {
                message: error.message,
              });
              break;
            case "admin_creation_failed":
              errorMessage = t("superAdmin.companies.adminCreationFailed");
              break;
            case "validation_error":
              errorMessage = t("superAdmin.companies.validationError", {
                message: error.message,
              });
              break;
            default:
              errorMessage =
                error.message || t("superAdmin.companies.errorCreatingAdmin");
          }

          throw new Error(errorMessage);
        }

        throw new Error(
          adminError?.message ||
            t("superAdmin.companies.errorCreatingAdmin") ||
            "Error creating admin user"
        );
      }

      // Get super admin's name from admin table
      const { data: adminDetails, error: adminDetailsError } = await supabase
        .from("admin")
        .select("id, name, email")
        .eq("email", user.email)
        .single();

      if (adminDetailsError) {
        console.error("Error fetching admin details:", adminDetailsError);
      }

      const userDisplayName = adminDetails?.name || user.email || "";

      // Log the company creation activity
      const activityLogData = {
        user_id: user.id,
        activity_type: ActivityType.CREATE_COMPANY,
        description: `New company "${data.company_name}" created with admin ${data.admin_first_name} ${data.admin_last_name} (${data.admin_email})`,
        company_id: newCompany.id,
        metadata: {
          created_by: {
            id: user.id,
            name: userDisplayName,
            email: user.email,
            role: "superadmin",
          },
          company: {
            id: newCompany.id,
            name: data.company_name,
          },
          company_admin: {
            id: adminResult.user.id,
            name: `${data.admin_first_name} ${data.admin_last_name}`,
            email: data.admin_email,
            role: "admin",
          },
        },
        old_value: null,
        new_value: {
          address: companyData.address,
          vat_type: data.vat_type,
          created_at: new Date().toISOString(),
          company_name: data.company_name,
          stakeholders: stakeholders,
          contact_email: data.contact_email,
          industry_type: data.industry_type,
          contact_number: data.contact_number,
          registration_number: data.registration_number,
          can_upload_receipts: data.can_upload_receipts,
        },
      };

      const { error: logError } = await supabase
        .from("activity_logs")
        .insert([activityLogData]);

      if (logError) {
        console.error("Error logging activity:", logError);
      }

      // Send invitation email to the admin
      const { success: emailSent, error: emailError } =
        await sendCompanyAdminInviteEmail(
          data.admin_email,
          data.admin_password,
          data.company_name
        );

      if (!emailSent) {
        console.error("Error sending invitation email:", emailError);
      }

      logDebug(`Company admin created with email: ${data.admin_email}`);

      setSnackbarMessage(
        emailSent
          ? t("superAdmin.companies.companyCreatedSuccess")
          : t("superAdmin.companies.companyCreatedButEmailFailed")
      );
      setSnackbarVisible(true);

      // Navigate back to companies list after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 5000);
    } catch (error: any) {
      console.error("Error creating company:", error);
      setSnackbarMessage(
        error.message || t("superAdmin.companies.failedToCreate")
      );
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

  const renderSectionHeader = (
    title: string,
    icon: "office-building" | "account-group" | "map-marker" | "account"
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
      style={[styles.container, { backgroundColor: theme.colors.backgroundSecondary }]}
    >
      <AppHeader
        showLogo={false}
        showBackButton={true}
        title={t("superAdmin.companies.createCompany")}
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
          {/* <View style={styles.headerSection}>
            <Text style={styles.pageTitle}>
              {t("superAdmin.companies.createCompany")}
            </Text>
          </View> */}

          <View style={styles.gridContainer}>
            <View style={styles.gridColumn}>
              <Animated.View entering={FadeIn.delay(100)}>
                <Card style={styles.formCard}>
                  {renderSectionHeader(
                    "Company Information",
                    "office-building"
                  )}
                  <Card.Content style={styles.cardContent}>
                    <Controller
                      name="company_name"
                      control={control}
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
                          disabled={loading}
                        />
                      )}
                    />
                    {errors.company_name && (
                      <Text style={styles.errorText}>
                        {errors.company_name.message}
                      </Text>
                    )}

                    <Controller
                      name="registration_number"
                      control={control}
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
                          value: 20,
                          message: t(
                            "superAdmin.companies.registrationNumberMaxLength"
                          ),
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={`${t("superAdmin.companies.registrationNumber")} *`}
                          mode="outlined"
                          value={value?.toUpperCase()}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          error={!!errors.registration_number}
                          style={styles.input}
                          disabled={loading}
                        />
                      )}
                    />
                    {errors.registration_number && (
                      <Text style={styles.errorText}>
                        {errors.registration_number.message}
                      </Text>
                    )}

                    <Controller
                      name="industry_type"
                      control={control}
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
                          disabled={loading}
                        />
                      )}
                    />
                    {errors.industry_type && (
                      <Text style={styles.errorText}>
                        {errors.industry_type.message}
                      </Text>
                    )}

                    <Controller
                      name="contact_number"
                      control={control}
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
                          disabled={loading}
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
                          disabled={loading}
                        />
                      )}
                      name="contact_email"
                    />
                    {errors.contact_email && (
                      <Text style={styles.errorText}>
                        {errors.contact_email.message}
                      </Text>
                    )}

                    <Controller
                      name="vat_type"
                      control={control}
                      rules={{
                        required: t("superAdmin.companies.vatTypeRequired"),
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={`${t("superAdmin.companies.vatType")} *`}
                          mode="outlined"
                          value={value?.toUpperCase()}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          error={!!errors.vat_type}
                          style={styles.input}
                          disabled={loading}
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
                          if (!loading) {
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
                                disabled={loading}
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
                  {renderSectionHeader("Stakeholders", "account-group")}
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
                              disabled={loading}
                              style={styles.removeButton}
                            >
                              {t("superAdmin.companies.remove")}
                            </Button>
                          </View>
                        </View>
                      ))}

                      {stakeholders.length === 0 && (
                        <Text style={styles.noStakeholdersText}>
                          {t("superAdmin.companies.noStakeholdersAdded")}
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
                                  label={t(
                                    "superAdmin.companies.stakeholderName"
                                  )}
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
                              render={({
                                field: { onChange, onBlur, value },
                              }) => (
                                <TextInput
                                  label={t("superAdmin.companies.percentage")}
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
                        <View style={styles.addStakeholderButtonContainer}>
                          <Button
                            mode="contained"
                            onPress={addStakeholder}
                            style={[
                              styles.addStakeholderButton,
                              { backgroundColor: theme.colors.secondary },
                            ]}
                            disabled={loading}
                          >
                            {t("superAdmin.companies.addStakeholder")}
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
                  {renderSectionHeader("Company Address", "map-marker")}
                  <Card.Content style={styles.cardContent}>
                    <Controller
                      control={control}
                      rules={{
                        required: t(
                          "superAdmin.companies.addressLine1Required"
                        ),
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={`${t("superAdmin.companies.addressLine1")} *`}
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
                      <Text style={styles.errorText}>
                        {errors.address_line1.message}
                      </Text>
                    )}

                    <Controller
                      control={control}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={t("superAdmin.companies.addressLine2")}
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
                          rules={{
                            required: t("superAdmin.companies.cityRequired"),
                          }}
                          render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                              label={`${t("superAdmin.companies.city")} *`}
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
                          rules={{
                            required: t("superAdmin.companies.stateRequired"),
                          }}
                          render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                              label={`${t("superAdmin.companies.stateProvince")} *`}
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
                              disabled={loading}
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
                          rules={{
                            required: t("superAdmin.companies.countryRequired"),
                          }}
                          render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                              label={`${t("superAdmin.companies.country")} *`}
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
                  </Card.Content>
                </Card>

                <Card style={[styles.formCard, { marginTop: 24 }]}>
                  {renderSectionHeader("Company Admin", "account")}
                  <Card.Content style={styles.cardContent}>
                    <View style={styles.row}>
                      <View style={styles.halfInput}>
                        <Controller
                          control={control}
                          rules={{
                            required: t(
                              "superAdmin.companies.adminFirstNameRequired"
                            ),
                            minLength: {
                              value: 2,
                              message: t("superAdmin.companies.nameMinLength"),
                            },
                            pattern: {
                              value: /^[a-zA-Z\s-]+$/,
                              message: t(
                                "superAdmin.companies.nameInvalidChars"
                              ),
                            },
                          }}
                          render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                              label={`${t("superAdmin.companies.adminFirstName")} *`}
                              mode="outlined"
                              value={value}
                              onChangeText={onChange}
                              onBlur={onBlur}
                              error={!!errors.admin_first_name}
                              style={styles.input}
                              disabled={loading}
                            />
                          )}
                          name="admin_first_name"
                        />
                        {errors.admin_first_name && (
                          <Text style={styles.errorText}>
                            {errors.admin_first_name.message}
                          </Text>
                        )}
                      </View>

                      <View style={styles.halfInput}>
                        <Controller
                          control={control}
                          rules={{
                            required: t(
                              "superAdmin.companies.adminLastNameRequired"
                            ),
                            minLength: {
                              value: 2,
                              message: t("superAdmin.companies.nameMinLength"),
                            },
                            pattern: {
                              value: /^[a-zA-Z\s-]+$/,
                              message: t(
                                "superAdmin.companies.nameInvalidChars"
                              ),
                            },
                          }}
                          render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                              label={`${t("superAdmin.companies.adminLastName")} *`}
                              mode="outlined"
                              value={value}
                              onChangeText={onChange}
                              onBlur={onBlur}
                              error={!!errors.admin_last_name}
                              style={styles.input}
                              disabled={loading}
                            />
                          )}
                          name="admin_last_name"
                        />
                        {errors.admin_last_name && (
                          <Text style={styles.errorText}>
                            {errors.admin_last_name.message}
                          </Text>
                        )}
                      </View>
                    </View>

                    <Controller
                      control={control}
                      rules={{
                        required: t("superAdmin.companies.adminEmailRequired"),
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: t("superAdmin.companies.invalidEmail"),
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={`${t("superAdmin.companies.adminEmail")} *`}
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
                      <Text style={styles.errorText}>
                        {errors.admin_email.message}
                      </Text>
                    )}

                    <Controller
                      control={control}
                      rules={{
                        required: t(
                          "superAdmin.companies.adminPasswordRequired"
                        ),
                        minLength: {
                          value: 8,
                          message: t("superAdmin.companies.passwordMinLength"),
                        },
                        pattern: {
                          value:
                            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
                          message: t(
                            "superAdmin.companies.passwordComplexityRequirements"
                          ),
                        },
                        validate: (value) => {
                          if (value.includes(" ")) {
                            return t("superAdmin.companies.passwordNoSpaces");
                          }
                          if (/(.)\1{2,}/.test(value)) {
                            return t(
                              "superAdmin.companies.passwordNoRepeatingChars"
                            );
                          }
                          return true;
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={`${t("superAdmin.companies.adminPassword")} *`}
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          error={!!errors.admin_password}
                          style={styles.input}
                          secureTextEntry
                          disabled={loading}
                        />
                      )}
                      name="admin_password"
                    />
                    {errors.admin_password && (
                      <Text style={styles.errorText}>
                        {errors.admin_password.message}
                      </Text>
                    )}

                    <Text style={styles.helperText}>
                      {t("superAdmin.companies.adminInviteHelper")}
                    </Text>
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
            loading={loading}
            disabled={loading}
          >
            {t("superAdmin.companies.createCompany")}
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
  addStakeholderButton: {
    backgroundColor: "#E0E0E0",
    flex: 1,
    alignSelf: "flex-end",
  },
  addStakeholderButtonContainer: {
    marginTop: 5,
  },
  submitContainer: {
    marginTop: 24,
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  submitButton: {},
  helperText: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
    marginBottom: 24,
  },
  helperTextSmall: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 4,
    marginBottom: 16,
    marginLeft: 4,
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

export default CreateCompanyScreen;
