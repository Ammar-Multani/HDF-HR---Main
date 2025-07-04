import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Animated,
  StatusBar,
  Dimensions,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from "react-native";
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
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import AppHeader from "../../components/AppHeader";
import { createTextStyle } from "../../utils/globalStyles";
import { useTranslation } from "react-i18next";
import CustomLanguageSelector from "../../components/CustomLanguageSelector";
import CustomSnackbar from "../../components/CustomSnackbar";
import { supabase } from "../../lib/supabase";
import { logDebug } from "../../utils/logger";

const { width, height } = Dimensions.get("window");

// Add type definition for route params
type ResetPasswordParams = {
  token?: string;
  email?: string;
};

const ResetPasswordScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<Record<string, ResetPasswordParams>, string>>();
  const { resetPassword, loading } = useAuth();
  const { t } = useTranslation();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [token, setToken] = useState("");
  const [email, setEmail] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];

  useEffect(() => {
    // Get the reset token from the URL on web or route params on mobile
    const getResetToken = async () => {
      try {
        let resetToken;
        let resetType;

        if (Platform.OS === "web") {
          // On web, parse the URL properly
          const url = window.location.href;
          console.log("Reset password URL:", url);

          // First try to get the token from the URL hash (Supabase's format)
          const hashParams = new URLSearchParams(
            window.location.hash.substring(1)
          );
          resetToken = hashParams.get("access_token");
          resetType = hashParams.get("type");

          // If not in hash, try query parameters
          if (!resetToken) {
            const queryParams = new URLSearchParams(window.location.search);
            resetToken = queryParams.get("token");
            resetType = queryParams.get("type");
          }

          if (!resetToken || resetType !== "recovery") {
            throw new Error("Invalid or missing reset token");
          }

          // Get the email from our tokens table
          const { data: tokenData, error: tokenError } = await supabase
            .from("password_reset_tokens")
            .select("email")
            .eq("token", resetToken)
            .single();

          if (tokenError || !tokenData?.email) {
            throw new Error("Invalid reset token");
          }

          setEmail(tokenData.email);
          setToken(resetToken);

          // Set up the hash for Supabase Auth
          if (!window.location.hash.includes("access_token")) {
            window.location.hash = `access_token=${resetToken}&type=recovery`;
          }
        } else {
          // On mobile, get from route params
          resetToken = route.params?.token;
          const email = route.params?.email;

          if (!resetToken || !email) {
            throw new Error("Invalid reset parameters");
          }

          setEmail(email);
          setToken(resetToken);
        }
      } catch (error) {
        console.error("Error in getResetToken:", error);
        setSnackbarMessage(t("resetPassword.invalidOrExpiredLink"));
        setSnackbarVisible(true);
        setTimeout(() => {
          navigation.navigate("Login" as never);
        }, 3000);
      }
    };

    getResetToken();

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

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError(t("resetPassword.passwordRequired"));
      return false;
    } else if (password.length < 8) {
      setPasswordError(t("resetPassword.passwordLength"));
      return false;
    } else if (!/(?=.*[a-z])/.test(password)) {
      setPasswordError(t("resetPassword.passwordLowercase"));
      return false;
    } else if (!/(?=.*[A-Z])/.test(password)) {
      setPasswordError(t("resetPassword.passwordUppercase"));
      return false;
    } else if (!/(?=.*\d)/.test(password)) {
      setPasswordError(t("resetPassword.passwordNumber"));
      return false;
    } else if (!/(?=.*[@$!%*?&#])/.test(password)) {
      setPasswordError(t("resetPassword.passwordSpecial"));
      return false;
    }
    setPasswordError("");
    return true;
  };

  const validateConfirmPassword = (confirmPassword: string) => {
    if (!confirmPassword) {
      setConfirmPasswordError(t("resetPassword.confirmPasswordRequired"));
      return false;
    } else if (confirmPassword !== password) {
      setConfirmPasswordError(t("resetPassword.passwordsDoNotMatch"));
      return false;
    }
    setConfirmPasswordError("");
    return true;
  };

  const handleContactUs = () => {
    Linking.openURL(
      "mailto:support@hdf-hr.com?subject=Password%20Reset%20Support"
    );
  };

  const handleResetPassword = async () => {
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);

    if (!isPasswordValid || !isConfirmPasswordValid) {
      return;
    }

    try {
      setIsResetting(true);
      logDebug("Attempting to update password");

      if (Platform.OS === "web") {
        // Get token from URL query parameters
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get("token");
        const type = urlParams.get("type");

        if (!token || type !== "recovery") {
          throw new Error("Invalid or missing reset token");
        }

        // Call our edge function to handle the password reset
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/password-reset`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              token,
              password,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          console.error("Edge function error:", data);
          throw new Error(data.error || "Failed to reset password");
        }

        if (!data.success) {
          throw new Error(data.error || "Failed to reset password");
        }
      } else {
        // Mobile implementation
        const resetToken = route.params?.token;
        const resetEmail = route.params?.email;

        if (!resetToken || !resetEmail) {
          throw new Error("Invalid reset parameters");
        }

        // Call our edge function to handle the password reset
        const response = await fetch(
          `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/password-reset`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              token: resetToken,
              password,
            }),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          console.error("Edge function error:", data);
          throw new Error(data.error || "Failed to reset password");
        }

        if (!data.success) {
          throw new Error(data.error || "Failed to reset password");
        }
      }

      setSnackbarMessage(t("resetPassword.successMessage"));
      setSnackbarVisible(true);

      // Navigate back to login after delay
      setTimeout(() => {
        navigation.navigate("Login" as never);
      }, 3000);
    } catch (error: any) {
      console.error("Password reset error:", error);
      let errorMessage = error.message;

      // Handle specific error cases
      if (error.message?.includes("Token has expired")) {
        errorMessage = t("resetPassword.tokenExpired");
      } else if (error.message?.includes("Invalid token")) {
        errorMessage = t("resetPassword.invalidToken");
      } else if (error.message?.includes("already been used")) {
        errorMessage = t("resetPassword.tokenUsed");
      } else if (error.message?.includes("Auth session missing")) {
        errorMessage = t("resetPassword.sessionError");
      } else if (error.message?.includes("User not found")) {
        errorMessage = t("resetPassword.userNotFound");
      }

      setSnackbarMessage(errorMessage || t("resetPassword.resetError"));
      setSnackbarVisible(true);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />

      <AppHeader
        showLogo
        showTitle={false}
        showHelpButton={false}
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
                style={[styles.title, { color: theme.colors.onSurface }]}
              >
                {t("resetPassword.title")}
              </Text>
              <Text
                variant="bodyLarge"
                style={[
                  styles.subtitle,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {t("resetPassword.subtitle")}
              </Text>

              <TextInput
                label={t("resetPassword.newPassword")}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) validatePassword(text);
                  if (confirmPassword && confirmPasswordError)
                    validateConfirmPassword(confirmPassword);
                }}
                mode="flat"
                secureTextEntry={!passwordVisible}
                style={[styles.input, { backgroundColor: "transparent" }]}
                disabled={isResetting}
                error={!!passwordError}
                right={
                  <TextInput.Icon
                    icon={passwordVisible ? "eye-off-outline" : "eye-outline"}
                    onPress={() => setPasswordVisible(!passwordVisible)}
                    forceTextInputFocus={false}
                    color={theme.colors.onSurfaceVariant}
                  />
                }
                theme={{
                  colors: {
                    primary: theme.colors.primary,
                    error: theme.colors.error,
                    onSurfaceVariant: theme.colors.onSurfaceVariant,
                  },
                }}
                underlineColor={theme.colors.outline}
                activeUnderlineColor={theme.colors.primary}
              />
              {passwordError ? (
                <HelperText type="error" style={{ color: theme.colors.error }}>
                  {passwordError}
                </HelperText>
              ) : null}

              <TextInput
                label={t("resetPassword.confirmPassword")}
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text);
                  if (confirmPasswordError) validateConfirmPassword(text);
                }}
                mode="flat"
                secureTextEntry={!confirmPasswordVisible}
                style={[styles.input, { backgroundColor: "transparent" }]}
                disabled={isResetting}
                error={!!confirmPasswordError}
                right={
                  <TextInput.Icon
                    icon={
                      confirmPasswordVisible ? "eye-off-outline" : "eye-outline"
                    }
                    onPress={() =>
                      setConfirmPasswordVisible(!confirmPasswordVisible)
                    }
                    forceTextInputFocus={false}
                    color={theme.colors.onSurfaceVariant}
                  />
                }
                theme={{
                  colors: {
                    primary: theme.colors.primary,
                    error: theme.colors.error,
                    onSurfaceVariant: theme.colors.onSurfaceVariant,
                  },
                }}
                underlineColor={theme.colors.outline}
                activeUnderlineColor={theme.colors.primary}
              />
              {confirmPasswordError ? (
                <HelperText type="error" style={{ color: theme.colors.error }}>
                  {confirmPasswordError}
                </HelperText>
              ) : null}

              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    borderColor: theme.colors.outline,
                    backgroundColor: theme.colors.surfaceVariant,
                  },
                ]}
                onPress={handleResetPassword}
                disabled={isResetting}
              >
                <LinearGradient
                  colors={[
                    theme.colors.secondary,
                    theme.colors.tertiary,
                    (theme.colors as any).quaternary || theme.colors.tertiary,
                    (theme.colors as any).quinary || theme.colors.tertiary,
                    (theme.colors as any).senary || theme.colors.secondary,
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  {isResetting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.buttonLabel}>
                      {t("resetPassword.resetButton")}
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
                onPress={handleContactUs}
                disabled={isResetting}
                style={styles.contactButton}
              >
                <Text style={{ color: theme.colors.onSurface }}>
                  {t("common.needHelp")}{" "}
                  <Text
                    style={[
                      styles.contactText,
                      { color: theme.colors.primary },
                    ]}
                  >
                    {t("common.contactUs")}
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
          snackbarMessage?.includes("instructions will be sent") ||
          snackbarMessage?.includes("Passwort erfolgreich zurückgesetzt!") ||
          snackbarMessage?.includes("Passwort erfolgreich zurückgesetzt! Sie können sich jetzt mit Ihrem neuen Passwort anmelden.") ||
          snackbarMessage?.includes("Passwort erfolgreich zurückgesetzt! Sie können sich jetzt mit Ihrem neuen Passwort anmelden.") 
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
    paddingTop: Platform.OS === "web" ? 70 : 0,
    maxWidth: Platform.OS === "web" ? 1000 : undefined,
    alignSelf: "center",
    width: "100%",
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
  formContainer: {
    width: "100%",
    marginBottom: 10,
    marginTop: Platform.OS === "web" ? 60 : 100,
    maxWidth: Platform.OS === "web" ? 460 : undefined,
    maxHeight: Platform.OS === "web" ? height - 100 : undefined,
    alignSelf: "center",
  },
  glassSurface: {
    padding: Platform.OS === "web" ? 32 : 20,
    borderRadius: 16,
    borderWidth: 0.3,
    overflow: "hidden",
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
    borderWidth: 0.3,
    maxWidth: Platform.OS === "web" ? 320 : undefined,
    alignSelf: "center",
    width: "100%",
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
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
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
  socialLoginContainer: {
    marginTop: 8,
    maxWidth: Platform.OS === "web" ? 480 : undefined,
    alignSelf: "center",
    width: "100%",
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
    ...createTextStyle({
      fontWeight: "600",
      fontSize: 16,
    }),
  },
  languageSelectorContainer: {
    marginTop: Platform.OS === "web" ? 0 : -15,
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

export default ResetPasswordScreen;
