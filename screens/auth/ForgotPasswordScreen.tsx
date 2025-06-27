import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Animated,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { logDebug } from "../../utils/logger";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  HelperText,
  Surface,
  Divider,
  IconButton,
  Tooltip,
} from "react-native-paper";
import { useAuth } from "../../contexts/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import AppHeader from "../../components/AppHeader";
import CustomLanguageSelector from "../../components/CustomLanguageSelector";
import { globalStyles, createTextStyle } from "../../utils/globalStyles";
import { initEmailService } from "../../utils/emailService";
import CustomSnackbar from "../../components/CustomSnackbar";
import { t } from "i18next";
import { useTranslation } from "react-i18next";

const { width, height } = Dimensions.get("window");

const ForgotPasswordScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { forgotPassword, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const { i18n } = useTranslation();

  // Initialize email service
  useEffect(() => {
    initEmailService();
  }, []);

  // Wait for translations to be initialized
  if (!i18n.isInitialized) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError(t("forgotPassword.emailRequired"));
      return false;
    } else if (!emailRegex.test(email)) {
      setEmailError(t("forgotPassword.validEmail"));
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleResetPassword = async () => {
    const isEmailValid = validateEmail(email);

    if (!isEmailValid) {
      return;
    }

    try {
      logDebug("Initiating password reset for email:", email);
      const { error } = await forgotPassword(email);

      if (error) {
        let errorMessage = error.message || t("forgotPassword.failedReset");
        let messageType = "error";

        // Handle specific error cases
        if (error.message?.includes("sender identity")) {
          errorMessage = t("forgotPassword.emailServiceError");
        } else if (error.message?.includes("rate limit")) {
          errorMessage = t("forgotPassword.tooManyAttempts");
          messageType = "warning";
        } else if (error.message?.includes("network")) {
          errorMessage = t("forgotPassword.networkError");
          messageType = "warning";
        }

        console.error("Password reset error:", error);
        setSnackbarMessage(errorMessage);
        setSnackbarVisible(true);
      } else {
        logDebug("Password reset request successful");
        setSnackbarMessage(t("forgotPassword.resetInstructions"));
        setSnackbarVisible(true);

        // Navigate back to login after a delay
        setTimeout(() => {
          navigation.navigate("Login" as never);
        }, 3000);
      }
    } catch (err) {
      console.error("Unexpected error during password reset:", err);
      setSnackbarMessage(t("common.unexpectedError"));
      setSnackbarVisible(true);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate("Login" as never);
  };

  const getGradientColors = () => {
    return theme.dark
      ? (["#151729", "#2a2e43"] as ["#151729", "#2a2e43"])
      : (["#f0f8ff", "#e6f2ff"] as ["#f0f8ff", "#e6f2ff"]);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
      <LinearGradient
        colors={getGradientColors()}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <AppHeader
          showBackButton={true}
          showHelpButton={true}
          absolute={true}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardAvoidingView}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[
                styles.formContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View
                style={[
                  styles.glassSurface,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    borderColor: theme.colors.outline,
                  },
                ]}
              >
                <Text
                  variant="headlineMedium"
                  style={[
                    styles.title,
                    {
                      color: theme.colors.onSurface,
                    },
                  ]}
                >
                  {t("forgotPassword.title")}
                </Text>
                <Text
                  variant="bodyLarge"
                  style={[
                    styles.subtitle,
                    {
                      color: theme.colors.onSurfaceVariant,
                    },
                  ]}
                >
                  {t("forgotPassword.subtitle")}
                </Text>

                <TextInput
                  label={t("common.email")}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (emailError) validateEmail(text);
                  }}
                  mode="flat"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={[
                    styles.input,
                    Platform.OS === "web" && { maxWidth: "100%" },
                  ]}
                  disabled={loading}
                  error={!!emailError}
                  theme={{
                    colors: {
                      background: "transparent",
                    },
                  }}
                  underlineColor={theme.colors.outlineVariant}
                  activeUnderlineColor={theme.colors.primary}
                />
                {emailError ? (
                  <HelperText type="error">{emailError}</HelperText>
                ) : null}

                <TouchableOpacity
                  style={[
                    styles.button,
                    Platform.OS === "web" && {
                      maxWidth: 320,
                      alignSelf: "center",
                      width: "100%",
                    },
                    {
                      borderWidth: 0.3,
                      borderColor: theme.colors.outlineVariant,
                    },
                  ]}
                  onPress={handleResetPassword}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={[
                      theme.colors.secondary,
                      theme.colors.tertiary,
                      theme.colors.quaternary,
                      theme.colors.quinary,
                      theme.colors.senary,
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientButton}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.buttonLabel}>
                        {t("forgotPassword.sendResetMail")}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </Animated.View>

            <Animated.View
              style={[
                styles.socialLoginContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <View style={styles.dividerContainer}>
                <Divider
                  style={[
                    styles.divider,
                    { backgroundColor: theme.colors.outline },
                  ]}
                />
                <Text
                  style={[
                    styles.dividerText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {t("common.or")}
                </Text>
                <Divider
                  style={[
                    styles.divider,
                    { backgroundColor: theme.colors.outline },
                  ]}
                />
              </View>

              <View style={styles.contactContainer}>
                <TouchableOpacity
                  onPress={navigateToLogin}
                  disabled={loading}
                  style={styles.contactButton}
                >
                  <Text style={{ color: theme.colors.onSurface }}>
                    {t("common.rememberPassword")}{" "}
                    <Text
                      style={[
                        styles.contactText,
                        { color: theme.colors.primary },
                      ]}
                    >
                      {t("common.signIn")}
                    </Text>
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.languageSelectorContainer}>
                <CustomLanguageSelector compact={Platform.OS !== "web"} />
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>

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
          duration={20000}
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
      </LinearGradient>
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
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
    maxWidth: Platform.OS === "web" ? 1200 : undefined,
    alignSelf: "center",
    width: "100%",
  },
  formContainer: {
    width: "100%",
    marginBottom: 20,
    maxWidth: Platform.OS === "web" ? 480 : undefined,
    alignSelf: "center",
    marginVertical: 20,
  },
  glassSurface: {
    padding: Platform.OS === "web" ? 32 : 20,
    borderRadius: 16,
    borderWidth: 0.3,
    overflow: "hidden",
  },
  title: {
    ...createTextStyle({
      fontWeight: "600",
      fontSize: 24,
      marginBottom: 8,
      textAlign: Platform.OS === "web" ? "center" : "left",
    }),
  },
  subtitle: {
    ...createTextStyle({
      fontWeight: "400",
      fontSize: 16,
      marginBottom: 24,
      textAlign: Platform.OS === "web" ? "center" : "left",
    }),
  },
  input: {
    marginBottom: 16,
    backgroundColor: "transparent",
    height: 60,
    ...createTextStyle({
      fontWeight: "400",
    }),
  },
  button: {
    marginTop: 24,
    borderRadius: 30,
    overflow: "hidden",
  },
  gradientButton: {
    width: "100%",
    height: 56,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonLabel: {
    ...createTextStyle({
      fontWeight: "600",
      fontSize: 16,
      letterSpacing: 1,
      color: "#ffffff",
    }),
  },
  loginContainer: {
    alignItems: "center",
    marginTop: 8,
    maxWidth: Platform.OS === "web" ? 480 : undefined,
    alignSelf: "center",
    width: "100%",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
    ...createTextStyle({
      fontWeight: "600",
      fontSize: 14,
    }),
  },
  rememberPasswordContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
    marginBottom: Platform.OS === "web" ? 32 : 24,
    ...createTextStyle({
      fontWeight: "400",
      fontSize: 14,
    }),
  },
  loginText: {
    ...createTextStyle({
      fontWeight: "600",
      fontSize: 16,
    }),
  },
  contactContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: Platform.OS === "web" ? 32 : 24,
  },
  contactButton: {
    paddingHorizontal: 16,
  },
  contactText: {
    fontWeight: "600",
    fontSize: 16,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
  },
  socialLoginContainer: {
    marginTop: 8,
    maxWidth: Platform.OS === "web" ? 480 : undefined,
    alignSelf: "center",
    width: "100%",
  },

  languageSelectorContainer: {
    marginTop: Platform.OS === "web" ? 0 : 20,
    alignItems: "center",
    width: "100%",
    maxWidth: Platform.OS === "web" ? 320 : undefined,
    alignSelf: "center",
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

export default ForgotPasswordScreen;
