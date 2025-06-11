import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Snackbar,
  Menu,
  IconButton,
  Divider,
  Surface,
  HelperText,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useForm, Controller } from "react-hook-form";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import { hashPassword } from "../../utils/auth";
import { useTranslation } from "react-i18next";
import Animated, { FadeIn } from "react-native-reanimated";
import { sendCompanyAdminInviteEmail } from "../../utils/emailService";
import CustomSnackbar from "../../components/CustomSnackbar";
import CompanySelector from "../../components/CompanySelector";
import { ActivityType } from "../../types/activity-log";

interface CompanyAdminFormData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone_number: string;
  job_title: string;
}

interface Company {
  id: string;
  company_name: string;
  active: boolean;
}

// Add CustomAlert component
interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

// Styles for the CustomAlert component
const alertStyles = StyleSheet.create({
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: "#64748b",
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    minWidth: 80,
    alignItems: "center",
  },
  modalCancelButton: {
    backgroundColor: "#f1f5f9",
  },
  modalConfirmButton: {
    backgroundColor: "#3b82f6",
  },
  modalDestructiveButton: {
    backgroundColor: "#ef4444",
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b",
  },
  modalConfirmText: {
    color: "#ffffff",
  },
  modalDestructiveText: {
    color: "#ffffff",
  },
});

const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
}) => {
  if (!visible) return null;

  return (
    <View style={alertStyles.modalOverlay}>
      <View style={alertStyles.modalContent}>
        <Text style={alertStyles.modalTitle}>{title}</Text>
        <Text style={alertStyles.modalMessage}>{message}</Text>
        <View style={alertStyles.modalButtons}>
          <TouchableOpacity
            style={[alertStyles.modalButton, alertStyles.modalCancelButton]}
            onPress={onCancel}
          >
            <Text style={alertStyles.modalButtonText}>{cancelText}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              alertStyles.modalButton,
              alertStyles.modalConfirmButton,
              isDestructive && alertStyles.modalDestructiveButton,
            ]}
            onPress={onConfirm}
          >
            <Text
              style={[
                alertStyles.modalButtonText,
                alertStyles.modalConfirmText,
                isDestructive && alertStyles.modalDestructiveText,
              ]}
            >
              {confirmText}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const CreateCompanyAdminScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const dimensions = useWindowDimensions();

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [alertConfig, setAlertConfig] = useState({
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    isDestructive: false,
    onConfirm: () => {},
    onCancel: () => {},
  });

  // Company selection state
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CompanyAdminFormData>({
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      phone_number: "",
      job_title: "",
    },
  });

  const onSubmit = async (data: CompanyAdminFormData) => {
    try {
      if (!selectedCompany) {
        setSnackbarMessage(
          t("superAdmin.companyAdmin.selectCompanyRequired") ||
            "Please select a company"
        );
        setSnackbarVisible(true);
        return;
      }

      setLoading(true);
      setSnackbarVisible(false);

      // Validate email domain
      const emailParts = data.email.split("@");
      if (
        emailParts.length !== 2 ||
        !emailParts[1].includes(".") ||
        emailParts[1].length < 3
      ) {
        setSnackbarMessage(
          t("superAdmin.companyAdmin.invalidEmailDomain") ||
            "Invalid email domain"
        );
        setSnackbarVisible(true);
        setLoading(false);
        return;
      }

      // Validate password strength
      if (data.password.length < 8) {
        setSnackbarMessage(
          t("superAdmin.companyAdmin.passwordLength") ||
            "Password must be at least 8 characters"
        );
        setSnackbarVisible(true);
        setLoading(false);
        return;
      }

      // Check if user already exists
      const { data: existingUser, error: userCheckError } = await supabase
        .from("users")
        .select("id")
        .eq("email", data.email)
        .maybeSingle();

      if (userCheckError) {
        throw new Error(userCheckError.message);
      }

      if (existingUser) {
        setSnackbarMessage(
          t("superAdmin.companyAdmin.emailAlreadyExists") ||
            "Email already exists"
        );
        setSnackbarVisible(true);
        setLoading(false);
        return;
      }

      // Hash password
      const hashedPassword = await hashPassword(data.password);

      // Generate reset token
      const resetToken =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      const resetTokenExpiry = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      // Create user
      const { data: newUser, error: userError } = await supabase
        .from("users")
        .insert({
          email: data.email,
          password_hash: hashedPassword,
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          reset_token: resetToken,
          reset_token_expires: resetTokenExpiry,
        })
        .select("id")
        .single();

      if (userError) {
        throw new Error(userError.message);
      }

      // Create company_user record
      const companyUserData = {
        id: newUser.id,
        company_id: selectedCompany.id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        role: "admin",
        active_status: "active",
        created_by: user?.id,
        phone_number: data.phone_number || "Not provided",
        job_title: data.job_title || "Not provided",
        date_of_birth: new Date().toISOString(),
        nationality: "Not provided",
      };

      const { error: companyUserError } = await supabase
        .from("company_user")
        .insert([companyUserData]);

      if (companyUserError) {
        // If company_user creation fails, delete the user
        await supabase.from("users").delete().eq("id", newUser.id);
        throw new Error(companyUserError.message);
      }

      // Get creator's details from admin table
      const { data: creatorDetails, error: creatorError } = await supabase
        .from("admin")
        .select("id, name, email")
        .eq("email", user?.email)
        .single();

      if (creatorError) {
        console.error("Error fetching creator details:", creatorError);
      }

      const creatorName = creatorDetails?.name || user?.email || "";

      // Log the company admin creation activity
      const activityLogData = {
        user_id: user?.id,
        activity_type: ActivityType.CREATE_COMPANY_ADMIN,
        description: `New company admin "${data.first_name} ${data.last_name}" (${data.email}) created for company "${selectedCompany.company_name}"`,
        company_id: selectedCompany.id,
        metadata: {
          created_by: {
            id: user?.id || "",
            name: creatorName,
            email: user?.email || "",
            role: "superadmin",
          },
          admin: {
            id: newUser.id,
            name: `${data.first_name} ${data.last_name}`,
            email: data.email,
            role: "admin",
          },
          company: {
            id: selectedCompany.id,
            name: selectedCompany.company_name,
          },
        },
        old_value: null,
        new_value: {
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone_number: data.phone_number || "Not provided",
          job_title: data.job_title || "Not provided",
          company_id: selectedCompany.id,
          role: "admin",
          created_at: new Date().toISOString(),
        },
      };

      const { error: logError } = await supabase
        .from("activity_logs")
        .insert([activityLogData]);

      if (logError) {
        console.error("Error logging activity:", logError);
        // Don't throw here as the admin was created successfully
      }

      // Send invitation email to the company admin
      const { success: emailSent, error: emailError } =
        await sendCompanyAdminInviteEmail(
          data.email,
          data.password,
          selectedCompany.company_name
        );

      if (!emailSent) {
        console.error("Error sending invitation email:", emailError);
        // Don't throw here, as the admin account is already created successfully
      }

      setSnackbarMessage(
        emailSent
          ? t("superAdmin.companyAdmin.adminCreatedSuccess") ||
              "Company admin created successfully!"
          : t("superAdmin.companyAdmin.adminCreatedNoEmail") ||
              "Company admin created but invitation email could not be sent."
      );
      setSnackbarVisible(true);

      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (error: any) {
      console.error("Error creating company admin:", error);
      setSnackbarMessage(
        error.message ||
          t("superAdmin.companyAdmin.failedToCreate") ||
          "Failed to create company admin"
      );
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <CustomAlert
        visible={showAlert}
        title={alertConfig.title}
        message={alertConfig.message}
        onConfirm={alertConfig.onConfirm}
        onCancel={() => setShowAlert(false)}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        isDestructive={alertConfig.isDestructive}
      />

      <AppHeader
        showLogo={false}
        showBackButton={true}
        title={
          t("superAdmin.companyAdmin.createCompanyAdmin") ||
          "Create Company Admin"
        }
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
          <View style={styles.gridContainer}>
            <View
              style={[
                styles.gridColumn,
                { flex: isLargeScreen ? 0.48 : isMediumScreen ? 0.48 : 1 },
              ]}
            >
              <Animated.View entering={FadeIn.delay(100)}>
                <Surface style={styles.detailsCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <View style={styles.iconContainer}>
                        <IconButton
                          icon="office-building"
                          size={20}
                          iconColor="#64748b"
                          style={styles.headerIcon}
                        />
                      </View>
                      <Text style={styles.cardTitle}>Company Selection</Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <CompanySelector
                      selectedCompany={selectedCompany}
                      onSelect={setSelectedCompany}
                      required={true}
                      error={
                        !selectedCompany ? "Please select a company" : undefined
                      }
                    />
                  </View>
                </Surface>
              </Animated.View>

              <Animated.View entering={FadeIn.delay(200)}>
                <Surface style={styles.detailsCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <View style={styles.iconContainer}>
                        <IconButton
                          icon="account"
                          size={20}
                          iconColor="#64748b"
                          style={styles.headerIcon}
                        />
                      </View>
                      <Text style={styles.cardTitle}>Basic Information</Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <View style={styles.row}>
                      <View style={styles.halfInput}>
                        <Controller
                          control={control}
                          name="first_name"
                          rules={{
                            required: t(
                              "superAdmin.companyAdmin.firstNameRequired"
                            ),
                            minLength: {
                              value: 2,
                              message: t(
                                "superAdmin.companyAdmin.nameMinLength"
                              ),
                            },
                            maxLength: {
                              value: 50,
                              message: t(
                                "superAdmin.companyAdmin.nameMaxLength"
                              ),
                            },
                            pattern: {
                              value: /^[a-zA-Z\s\-']+$/,
                              message: t(
                                "superAdmin.companyAdmin.nameInvalidChars"
                              ),
                            },
                          }}
                          render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                              label={`${t("superAdmin.companyAdmin.firstName")} *`}
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
                            required: t(
                              "superAdmin.companyAdmin.lastNameRequired"
                            ),
                            minLength: {
                              value: 2,
                              message: t(
                                "superAdmin.companyAdmin.nameMinLength"
                              ),
                            },
                            maxLength: {
                              value: 50,
                              message: t(
                                "superAdmin.companyAdmin.nameMaxLength"
                              ),
                            },
                            pattern: {
                              value: /^[a-zA-Z\s\-']+$/,
                              message: t(
                                "superAdmin.companyAdmin.nameInvalidChars"
                              ),
                            },
                          }}
                          render={({ field: { onChange, onBlur, value } }) => (
                            <TextInput
                              label={`${t("superAdmin.companyAdmin.lastName")} *`}
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
                          <HelperText type="error">
                            {errors.last_name.message}
                          </HelperText>
                        )}
                      </View>
                    </View>

                    <Controller
                      control={control}
                      name="email"
                      rules={{
                        required: t("superAdmin.companyAdmin.emailRequired"),
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: t("superAdmin.companyAdmin.invalidEmail"),
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={`${t("superAdmin.companyAdmin.email")} *`}
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
                      <HelperText type="error">
                        {errors.email.message}
                      </HelperText>
                    )}

                    <Controller
                      control={control}
                      name="password"
                      rules={{
                        required: t("superAdmin.companyAdmin.passwordRequired"),
                        minLength: {
                          value: 8,
                          message: t(
                            "superAdmin.companyAdmin.passwordMinLength"
                          ),
                        },
                        pattern: {
                          value:
                            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
                          message: t(
                            "superAdmin.companyAdmin.passwordComplexityRequirements"
                          ),
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={`${t("superAdmin.companyAdmin.password")} *`}
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
                      <HelperText type="error">
                        {errors.password.message}
                      </HelperText>
                    )}
                  </View>
                </Surface>
              </Animated.View>
            </View>

            <View
              style={[
                styles.gridColumn,
                { flex: isLargeScreen ? 0.48 : isMediumScreen ? 0.48 : 1 },
              ]}
            >
              <Animated.View entering={FadeIn.delay(300)}>
                <Surface style={styles.detailsCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <View style={styles.iconContainer}>
                        <IconButton
                          icon="account-details"
                          size={20}
                          iconColor="#64748b"
                          style={styles.headerIcon}
                        />
                      </View>
                      <Text style={styles.cardTitle}>Additional Details</Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <Controller
                      control={control}
                      name="phone_number"
                      rules={{
                        pattern: {
                          value: /^\+?[0-9]{8,15}$/,
                          message: t(
                            "superAdmin.companyAdmin.phoneNumberInvalidFormat"
                          ),
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={t("superAdmin.companyAdmin.phoneNumber")}
                          mode="outlined"
                          value={value}
                          onChangeText={(text) =>
                            onChange(text.replace(/[^0-9+]/g, ""))
                          }
                          onBlur={onBlur}
                          error={!!errors.phone_number}
                          style={styles.input}
                          keyboardType="phone-pad"
                          disabled={loading}
                        />
                      )}
                    />
                    {errors.phone_number && (
                      <HelperText type="error">
                        {errors.phone_number.message}
                      </HelperText>
                    )}

                    <Controller
                      control={control}
                      name="job_title"
                      rules={{
                        minLength: {
                          value: 2,
                          message: t(
                            "superAdmin.companyAdmin.jobTitleMinLength"
                          ),
                        },
                        maxLength: {
                          value: 50,
                          message: t(
                            "superAdmin.companyAdmin.jobTitleMaxLength"
                          ),
                        },
                        pattern: {
                          value: /^[a-zA-Z\s\-&.]+$/,
                          message: t(
                            "superAdmin.companyAdmin.jobTitleInvalidChars"
                          ),
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={t("superAdmin.companyAdmin.jobTitle")}
                          mode="outlined"
                          value={value}
                          onChangeText={(text) =>
                            onChange(text.replace(/[^a-zA-Z\s\-&.]/g, ""))
                          }
                          onBlur={onBlur}
                          error={!!errors.job_title}
                          style={styles.input}
                          disabled={loading}
                        />
                      )}
                    />
                    {errors.job_title && (
                      <HelperText type="error">
                        {errors.job_title.message}
                      </HelperText>
                    )}
                  </View>
                </Surface>
              </Animated.View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Surface style={styles.bottomBar}>
        <View style={styles.bottomBarContent}>
          <View style={styles.actionButtons}>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={styles.button}
              disabled={loading}
            >
              {t("common.cancel") || "Cancel"}
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              style={[
                styles.button,
                {
                  backgroundColor:
                    loading || !selectedCompany
                      ? theme.colors.surfaceDisabled
                      : theme.colors.primary,
                },
              ]}
              loading={loading}
              disabled={loading || !selectedCompany}
            >
              {t("superAdmin.companyAdmin.createAdmin") || "Create Admin"}
            </Button>
          </View>
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

// Main screen styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
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
  gridContainer: {
    flexDirection: "row",
    gap: 24,
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridColumn: {
    minWidth: 320,
    gap: 24,
  },
  detailsCard: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "rgba(0,0,0,0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardHeader: {
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
  headerIcon: {
    margin: 0,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    fontFamily: "Poppins-SemiBold",
  },
  cardContent: {
    padding: 24,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 16,
  },
  halfInput: {
    flex: 1,
  },
  input: {
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  helperText: {
    fontSize: 14,
    color: "#64748b",
    marginTop: 4,
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
  actionButtons: {
    flexDirection: "row",
    gap: 12,
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
});

export default CreateCompanyAdminScreen;
