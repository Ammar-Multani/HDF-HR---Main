import React, { useState, useEffect } from "react";
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
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useForm, Controller } from "react-hook-form";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import { hashPassword } from "../../utils/auth";
import { useTranslation } from "react-i18next";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { sendCompanyAdminInviteEmail } from "../../utils/emailService";

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
  vat_type: string;
  stakeholder_name: string;
  stakeholder_percentage: string;
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
      vat_type: "",
      stakeholder_name: "",
      stakeholder_percentage: "",
    },
  });

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

      // Validate stakeholders
      if (stakeholders.length > 0) {
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

      // Performance optimization: Hash password in parallel with checking for existing user
      // This avoids the sequential bottleneck
      const [hashedPassword, existingUserResult] = await Promise.all([
        hashPassword(data.admin_password),
        supabase
          .from("users")
          .select("id")
          .eq("email", data.admin_email)
          .maybeSingle(), // Use maybeSingle instead of single to avoid errors
      ]);

      // Check if user already exists
      if (existingUserResult.data) {
        throw new Error(t("superAdmin.companies.emailAlreadyExists"));
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
        created_by: user?.id,
        stakeholders,
        vat_type: data.vat_type,
      };

      // Generate reset token just once - avoid regenerating later
      const resetToken =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      const resetTokenExpiry = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      // Create company record and get the ID
      const { data: newCompany, error: companyError } = await supabase
        .from("company")
        .insert([companyData])
        .select("id")
        .single();

      if (companyError) {
        throw companyError;
      }

      // User data with reset token included
      const userData = {
        email: data.admin_email,
        password_hash: hashedPassword,
        status: "active",
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
        // If user creation fails, delete the company for atomicity
        await supabase.from("company").delete().eq("id", newCompany.id);
        throw userError;
      }

      // Create company_user record
      const companyUserData = {
        id: newUser.id,
        company_id: newCompany.id,
        first_name: "Company",
        last_name: "Admin",
        email: data.admin_email,
        role: "admin",
        active_status: "active",
        created_by: user?.id,
        phone_number: (
          t("superAdmin.companies.notProvided") || "Not provided"
        ).substring(0, 20),
        date_of_birth: new Date().toISOString(),
        nationality: (
          t("superAdmin.companies.notProvided") || "Not provided"
        ).substring(0, 20),
      };

      const { error: companyUserError } = await supabase
        .from("company_user")
        .insert([companyUserData]);

      if (companyUserError) {
        // If company_user creation fails, delete the user and company
        await supabase.from("users").delete().eq("id", newUser.id);
        await supabase.from("company").delete().eq("id", newCompany.id);
        throw companyUserError;
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
        // Don't throw here, as the company and user are already created successfully
      }

      console.log(`Company admin created with email: ${data.admin_email}`);

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
      style={[styles.container, { backgroundColor: theme.colors.background }]}
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
                      control={control}
                      rules={{
                        required: t("superAdmin.companies.companyNameRequired"),
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
                      name="company_name"
                    />
                    {errors.company_name && (
                      <Text style={styles.errorText}>
                        {errors.company_name.message}
                      </Text>
                    )}

                    <Controller
                      control={control}
                      rules={{
                        required: t(
                          "superAdmin.companies.registrationNumberRequired"
                        ),
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
                      rules={{
                        required: t(
                          "superAdmin.companies.industryTypeRequired"
                        ),
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
                      name="industry_type"
                    />
                    {errors.industry_type && (
                      <Text style={styles.errorText}>
                        {errors.industry_type.message}
                      </Text>
                    )}

                    <Controller
                      control={control}
                      rules={{
                        required: t(
                          "superAdmin.companies.contactNumberRequired"
                        ),
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={`${t("superAdmin.companies.contactNumber")} *`}
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
                      control={control}
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
                          disabled={loading}
                        />
                      )}
                      name="vat_type"
                    />
                    {errors.vat_type && (
                      <Text style={styles.errorText}>
                        {errors.vat_type.message}
                      </Text>
                    )}
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
                          rules={{
                            required: t(
                              "superAdmin.companies.postalCodeRequired"
                            ),
                          }}
                          render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                              label={`${t("superAdmin.companies.postalCode")} *`}
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
                          message: t("superAdmin.companies.passwordLength"),
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

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: t("common.ok"),
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
});

export default CreateCompanyScreen;
