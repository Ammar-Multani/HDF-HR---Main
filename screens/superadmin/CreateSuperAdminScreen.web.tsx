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
  Surface,
  IconButton,
  HelperText,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useForm, Controller } from "react-hook-form";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import { UserRole, UserStatus } from "../../types";
import { hashPassword } from "../../utils/auth";
import { sendSuperAdminWelcomeEmail } from "../../utils/emailService";
import Animated, { FadeIn } from "react-native-reanimated";
import CustomSnackbar from "../../components/CustomSnackbar";
import { t } from "i18next";
import { ActivityType } from "../../types/activity-log";

interface AdminFormData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone_number: string;
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

const CreateSuperAdminScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const dimensions = useWindowDimensions();

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AdminFormData>({
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      phone_number: "",
    },
  });

  const onSubmit = async (data: AdminFormData) => {
    try {
      setLoading(true);
      setSnackbarVisible(false);

      // Validate email format
      const emailParts = data.email.split("@");
      if (
        emailParts.length !== 2 ||
        !emailParts[1].includes(".") ||
        emailParts[1].length < 3
      ) {
        setSnackbarMessage(t("superAdmin.companies.invalidEmailDomain"));
        setSnackbarVisible(true);
        return;
      }

      // Call the Edge Function to create super admin
      const { data: responseData, error: functionError } =
        await supabase.functions.invoke("user-management", {
          body: {
            action: "create_super_admin",
            email: data.email.toLowerCase().trim(),
            password: data.password,
            first_name: data.first_name,
            last_name: data.last_name,
            created_by: user?.id,
          },
        });

      if (functionError || !responseData?.user) {
        console.error(
          "Error creating super admin:",
          functionError || "No user data returned"
        );
        throw new Error(
          functionError?.message || "Failed to create super admin"
        );
      }

      // Log activity
      const { error: activityError } = await supabase
        .from("activity_logs")
        .insert({
          user_id: user?.id,
          activity_type: ActivityType.CREATE_SUPER_ADMIN,
          description: `New super admin "${data.first_name} ${data.last_name}" (${data.email}) was created`,
          metadata: {
            created_by: {
              id: user?.id,
              email: user?.email,
              role: "super_admin",
            },
            admin: {
              id: responseData.user.id,
              first_name: data.first_name,
              last_name: data.last_name,
              email: data.email,
            },
          },
          old_value: null,
          new_value: {
            first_name: data.first_name,
            last_name: data.last_name,
            email: data.email,
            created_at: new Date().toISOString(),
          },
        });

      if (activityError) {
        console.error("Error logging activity:", activityError);
      }

      // Send welcome email to the super admin
      const { success: emailSent, error: emailError } =
        await sendSuperAdminWelcomeEmail(
          `${data.first_name} ${data.last_name}`,
          data.email,
          data.password
        );

      if (!emailSent) {
        console.error("Error sending welcome email:", emailError);
      }

      setSnackbarMessage(
        emailSent
          ? t("superAdmin.superAdminUsers.createSuccess")
          : t("superAdmin.superAdminUsers.createSuccessButEmailFailed")
      );
      setSnackbarVisible(true);

      // Reset form and navigate back
      reset();
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (error) {
      console.error("Error in super admin creation:", error);
      setSnackbarMessage(
        error instanceof Error
          ? error.message
          : t("superAdmin.superAdminUsers.createError")
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
      <AppHeader
        title={t("superAdmin.superAdminUsers.createAdmin")}
        showBackButton={true}
        showHelpButton={false}
        showProfileMenu={false}
        showLogo={false}
        showTitle={true}
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
            <View style={styles.gridColumn}>
              <Animated.View entering={FadeIn.delay(100)}>
                <Surface style={styles.formCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <View style={styles.iconContainer}>
                        <IconButton
                          icon="account-plus"
                          size={20}
                          iconColor="#64748b"
                          style={styles.headerIcon}
                        />
                      </View>
                      <Text style={styles.cardTitle}>
                        {t("superAdmin.superAdminUsers.adminInformation")}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <Controller
                      control={control}
                      name="first_name"
                      rules={{
                        required: t(
                          "superAdmin.superAdminUsers.firstNameRequired"
                        ),
                        minLength: {
                          value: 2,
                          message: t(
                            "superAdmin.superAdminUsers.nameMinLength"
                          ),
                        },
                        maxLength: {
                          value: 50,
                          message: t(
                            "superAdmin.superAdminUsers.nameMaxLength"
                          ),
                        },
                        pattern: {
                          value: /^[a-zA-Z\s\-']+$/,
                          message: t(
                            "superAdmin.superAdminUsers.nameInvalidChars"
                          ),
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={`${t("superAdmin.superAdminUsers.firstName")} *`}
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

                    <Controller
                      control={control}
                      name="last_name"
                      rules={{
                        required: t(
                          "superAdmin.superAdminUsers.lastNameRequired"
                        ),
                        minLength: {
                          value: 2,
                          message: t(
                            "superAdmin.superAdminUsers.nameMinLength"
                          ),
                        },
                        maxLength: {
                          value: 50,
                          message: t(
                            "superAdmin.superAdminUsers.nameMaxLength"
                          ),
                        },
                        pattern: {
                          value: /^[a-zA-Z\s\-']+$/,
                          message: t(
                            "superAdmin.superAdminUsers.nameInvalidChars"
                          ),
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={`${t("superAdmin.superAdminUsers.lastName")} *`}
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

                    <Controller
                      control={control}
                      name="email"
                      rules={{
                        required: t("superAdmin.superAdminUsers.emailRequired"),
                        pattern: {
                          value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                          message: t("superAdmin.superAdminUsers.invalidEmail"),
                        },
                        validate: (value) => {
                          const emailParts = value.split("@");
                          if (
                            emailParts.length !== 2 ||
                            !emailParts[1].includes(".") ||
                            emailParts[1].length < 3
                          ) {
                            return t(
                              "superAdmin.superAdminUsers.invalidEmailDomain"
                            );
                          }
                          return true;
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={`${t("superAdmin.superAdminUsers.email")} *`}
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
                        required: t(
                          "superAdmin.superAdminUsers.passwordRequired"
                        ),
                        minLength: {
                          value: 8,
                          message: t(
                            "superAdmin.superAdminUsers.passwordMinLength"
                          ),
                        },
                        pattern: {
                          value:
                            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/,
                          message: t(
                            "superAdmin.superAdminUsers.passwordComplexityRequirements"
                          ),
                        },
                        validate: (value) => {
                          if (value.includes(" ")) {
                            return t(
                              "superAdmin.superAdminUsers.passwordNoSpaces"
                            );
                          }
                          if (/(.)\1{2,}/.test(value)) {
                            return t(
                              "superAdmin.superAdminUsers.passwordNoRepeatingChars"
                            );
                          }
                          return true;
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={`${t("superAdmin.superAdminUsers.password")} *`}
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

                    <Controller
                      control={control}
                      name="phone_number"
                      rules={{
                        pattern: {
                          value: /^\+?[0-9]{8,15}$/,
                          message: t(
                            "superAdmin.superAdminUsers.phoneNumberInvalidFormat"
                          ),
                        },
                      }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label={t(
                            "superAdmin.superAdminUsers.phoneNumberOptional"
                          )}
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

                    <Text style={styles.helperText}>
                      {t("superAdmin.superAdminUsers.helperText")}
                    </Text>
                  </View>
                </Surface>
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
            style={styles.button}
            disabled={loading}
          >
            {t("common.cancel")}
          </Button>
          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            style={styles.button}
            loading={loading}
            disabled={loading}
            buttonColor={theme.colors.primary}
          >
            {t("superAdmin.superAdminUsers.createAdmin")}
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
  },
  gridColumn: {
    flex: 1,
    minWidth: 320,
    gap: 24,
  },
  formCard: {
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
  input: {
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  helperText: {
    fontSize: 14,
    color: "#64748b",
    fontFamily: "Poppins-Regular",
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

export default CreateSuperAdminScreen;
