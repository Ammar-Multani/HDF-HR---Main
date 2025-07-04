import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Animated,
  StatusBar,
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
  Card,
  Avatar,
  Appbar,
  Tooltip,
  Portal,
  Dialog,
  MD3Colors,
} from "react-native-paper";
import { useAuth } from "../../contexts/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import AppHeader from "../../components/AppHeader";
import { useTranslation } from "react-i18next";
import CustomLanguageSelector from "../../components/CustomLanguageSelector";
import { globalStyles, createTextStyle } from "../../utils/globalStyles";
import { UserStatus } from "../../utils/auth";
import CustomSnackbar from "../../components/CustomSnackbar";
import { supabase } from "../../lib/supabase-client";

// Key to prevent showing loading screen right after login
const SKIP_LOADING_KEY = "skip_loading_after_login";
const { width, height } = Dimensions.get("window");

const LoginScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { signIn } = useAuth();
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isDialogVisible, setIsDialogVisible] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");
  const [dialogTitle, setDialogTitle] = useState("");
  const [dialogActionText, setDialogActionText] = useState("");

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];

  // Clear any stale auth tokens when the login screen is mounted
  useEffect(() => {
    const cleanupAuthState = async () => {
      try {
        // Check if we need to force reload after sign-out
        const forceReload = await AsyncStorage.getItem(
          "FORCE_RELOAD_AFTER_SIGNOUT"
        );

        if (forceReload === "true") {
          console.log("Detected sign-out, cleaning up auth state");

          // Clear the flag
          await AsyncStorage.removeItem("FORCE_RELOAD_AFTER_SIGNOUT");

          // For web, force a page reload if we haven't already
          if (Platform.OS === "web") {
            const hasReloaded = sessionStorage.getItem(
              "has_reloaded_after_signout"
            );
            if (!hasReloaded) {
              sessionStorage.setItem("has_reloaded_after_signout", "true");
              window.location.reload();
              return;
            }
            // Clear the reload flag after we've used it
            sessionStorage.removeItem("has_reloaded_after_signout");
          }

          // Clean up all auth-related tokens
          const keys = await AsyncStorage.getAllKeys();
          const authKeys = keys.filter(
            (key) =>
              key.startsWith("supabase.auth.") ||
              key === "auth_token" ||
              key === "auth_check" ||
              key === "auth_token_v2" ||
              key === "user_data_v2" ||
              key === "user_role_v2" ||
              key === "session_v2" ||
              key === "last_active_v2" ||
              key === "auth_state_v3" ||
              key === "NAVIGATE_TO_DASHBOARD" ||
              key === "last_cache_reset" ||
              key === "SKIP_LOADING_KEY" ||
              key === "initial_load_complete"
          );

          if (authKeys.length > 0) {
            await AsyncStorage.multiRemove(authKeys);

            // Re-initialize supabase auth
            await supabase.auth.initialize();
          }

          // Reset form fields
          setEmail("");
          setPassword("");
          setEmailError("");
          setPasswordError("");
          return;
        }

        // If not coming from sign-out, still check for stale session
        const {
          data: { session },
        } = await supabase.auth.getSession();

        // If no session but we have auth tokens, clean them up
        if (!session) {
          const keys = await AsyncStorage.getAllKeys();
          const authKeys = keys.filter(
            (key) =>
              key.startsWith("supabase.auth.") ||
              key === "auth_token" ||
              key === "auth_check"
          );

          if (authKeys.length > 0) {
            console.log("Cleaning up stale auth tokens");
            await AsyncStorage.multiRemove(authKeys);

            // Re-initialize supabase auth
            await supabase.auth.initialize();
          }
        }

        // Always reset form fields when mounting
        setEmail("");
        setPassword("");
        setEmailError("");
        setPasswordError("");
      } catch (error) {
        console.error("Error cleaning up auth state:", error);

        // Even if there's an error, reset the fields
        setEmail("");
        setPassword("");
        setEmailError("");
        setPasswordError("");
      }
    };

    cleanupAuthState();

    // Reset fields when component is unmounted
    return () => {
      setEmail("");
      setPassword("");
      setEmailError("");
      setPasswordError("");
    };
  }, []);

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
      setEmailError(t("login.emailRequired"));
      return false;
    } else if (!emailRegex.test(email)) {
      setEmailError(t("login.validEmail"));
      return false;
    }
    setEmailError("");
    return true;
  };

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError(t("login.passwordRequired"));
      return false;
    } else if (password.length < 6) {
      setPasswordError(t("login.passwordLength"));
      return false;
    }
    setPasswordError("");
    return true;
  };

  const showInactiveDialog = (status: { message: string }) => {
    setDialogTitle(t("login.accountInactiveTitle") || "Account Inactive");
    setDialogMessage(status.message);
    setDialogActionText(t("common.contactSupport") || "Contact Support");
    setIsDialogVisible(true);
  };

  const handleDialogAction = () => {
    setIsDialogVisible(false);
    handleContactUs();
  };

  const handleSignIn = async () => {
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    try {
      setIsLoggingIn(true);
      await AsyncStorage.setItem(SKIP_LOADING_KEY, "true");

      const { error, status } = await signIn(email, password);

      if (error) {
        if (status) {
          // Show inactive account dialog with specific message
          showInactiveDialog({
            message:
              status === "inactive" ? error.message : "Account is not active",
          });
        } else if (
          error.message?.toLowerCase().includes("invalid") ||
          error.message?.toLowerCase().includes("password") ||
          error.message?.toLowerCase().includes("credentials")
        ) {
          setPasswordError(
            t("login.invalidPassword") || "Invalid password. Please try again."
          );
          setPassword("");
          setSnackbarMessage(
            t("login.invalidPassword") || "Invalid password. Please try again."
          );
          setSnackbarVisible(true);
        } else if (
          error.message?.toLowerCase().includes("user") ||
          error.message?.toLowerCase().includes("email") ||
          error.message?.toLowerCase().includes("not found")
        ) {
          setEmailError(
            t("login.userNotFound") ||
              "User not found. Please check your email."
          );
          setSnackbarMessage(
            t("login.userNotFound") ||
              "User not found. Please check your email."
          );
          setSnackbarVisible(true);
        } else {
          // General error handling
          setSnackbarMessage(error.message || t("login.failedSignIn"));
          setSnackbarVisible(true);
        }

        await AsyncStorage.removeItem(SKIP_LOADING_KEY);
      }
    } catch (err) {
      console.error("Login error:", err);
      setSnackbarMessage(t("login.unexpectedError"));
      setSnackbarVisible(true);
      await AsyncStorage.removeItem(SKIP_LOADING_KEY);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const navigateToForgotPassword = () => {
    navigation.navigate("ForgotPassword" as never);
  };

  const handleContactUs = () => {
    Linking.openURL("mailto:support@yourdomain.com?subject=Support%20Request");
  };

  // const getGradientColors = () => {
  //   return theme.light
  //     ? (["#151729", "#2a2e43"] as const)
  //     : ([
  //         theme.colors.background,
  //         (theme.colors as any).backgroundTertiary,
  //       ] as const);
  // };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.backgroundTertiary }]}
    >
      <StatusBar
        barStyle={theme.dark ? "light-content" : "dark-content"}
        backgroundColor={theme.colors.background}
      />

      <AppHeader showBackButton={false} showHelpButton={true} absolute={true} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollViewContent}
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
                {t("login.welcomeBack")}
              </Text>
              <Text
                variant="bodyLarge"
                style={[
                  styles.subtitle,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {t("login.signInToAccess")}
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
                style={[styles.input, { backgroundColor: "transparent" }]}
                disabled={isLoggingIn}
                error={!!emailError}
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
              {emailError ? (
                <HelperText type="error" style={{ color: theme.colors.error }}>
                  {emailError}
                </HelperText>
              ) : null}

              <TextInput
                label={t("common.password")}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (passwordError) validatePassword(text);
                }}
                mode="flat"
                secureTextEntry={!passwordVisible}
                style={[styles.input, { backgroundColor: "transparent" }]}
                disabled={isLoggingIn}
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

              <TouchableOpacity
                onPress={navigateToForgotPassword}
                style={styles.forgotPasswordContainer}
                disabled={isLoggingIn}
              >
                <Text
                  style={[
                    styles.forgotPasswordText,
                    { color: theme.colors.primary },
                  ]}
                >
                  {t("common.forgotPassword")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.button,
                  {
                    borderColor: theme.colors.outline,
                    backgroundColor: theme.colors.surfaceVariant,
                  },
                ]}
                onPress={handleSignIn}
                disabled={isLoggingIn}
              >
                <LinearGradient
                  colors={[
                    theme.colors.secondary,
                    theme.colors.tertiary,
                    (theme.colors as any).quaternary,
                    (theme.colors as any).quinary,
                    (theme.colors as any).senary,
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gradientButton}
                >
                  {isLoggingIn ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.buttonLabel}>{t("common.signIn")}</Text>
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
                OR
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
                // onPress={handleContactUs}
                onPress={() => navigation.navigate("Register" as never)}
                disabled={isLoggingIn}
                style={styles.contactButton}
              >
                <Text style={{ color: theme.colors.onSurface }}>
                  {t("common.dontHaveAccount")}{" "}
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

      <Portal>
        <Dialog
          visible={isDialogVisible}
          onDismiss={() => setIsDialogVisible(false)}
          style={[
            styles.dialog,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          <Dialog.Title
            style={[styles.dialogTitle, { color: theme.colors.onSurface }]}
          >
            {dialogTitle}
          </Dialog.Title>
          <Dialog.Content>
            <Text
              variant="bodyMedium"
              style={[
                styles.dialogContent,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {dialogMessage}
            </Text>
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button
              mode="text"
              onPress={() => setIsDialogVisible(false)}
              textColor={theme.colors.onSurfaceVariant}
            >
              {t("common.cancel") || "Cancel"}
            </Button>
            <Button
              mode="contained"
              onPress={handleDialogAction}
              style={styles.dialogActionButton}
            >
              {dialogActionText}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <CustomSnackbar
        visible={snackbarVisible}
        message={snackbarMessage}
        onDismiss={() => setSnackbarVisible(false)}
        type={
          snackbarMessage?.toLowerCase().includes("invalid") ||
          snackbarMessage?.toLowerCase().includes("not found") ||
          snackbarMessage?.toLowerCase().includes("error")
            ? "error"
            : snackbarMessage?.toLowerCase().includes("success")
              ? "success"
              : "info"
        }
        duration={4000}
        action={{
          label: t("common.ok"),
          onPress: () => setSnackbarVisible(false),
        }}
        style={[
          styles.snackbar,
          {
            maxWidth: Platform.OS === "web" ? 600 : undefined,
            alignSelf: "center",
            position: Platform.OS === "web" ? "absolute" : undefined,
            bottom: Platform.OS === "web" ? 24 : undefined,
            borderRadius: 25,
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
  keyboardAvoidView: {
    flex: 1,
  },
  scrollViewContent: {
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
  forgotPasswordContainer: {
    alignItems: "flex-end",
    marginTop: 4,
    marginBottom: 8,
  },
  forgotPasswordText: {
    ...createTextStyle({
      fontWeight: "500",
      fontSize: 14,
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
  socialButtons: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 16,
    gap: 16,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    width: "40%",
  },
  googleButton: {
    backgroundColor: "#DB4437",
  },
  appleButton: {
    backgroundColor: "#000",
  },
  socialButtonText: {
    color: "#FFF",
    marginLeft: 8,
    fontWeight: "600",
    fontSize: 14,
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
  dialog: {
    borderRadius: 16,
    marginHorizontal: Platform.OS === "web" ? "40%" : 24,
    elevation: 24,
  },
  dialogTitle: {
    ...createTextStyle({
      fontWeight: "600",
      fontSize: 20,
    }),
  },
  dialogContent: {
    ...createTextStyle({
      fontWeight: "400",
      fontSize: 16,
      lineHeight: 24,
    }),
  },
  dialogActions: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  dialogActionButton: {
    marginLeft: 8,
    padding: 5,
    borderRadius: 25,
  },
  snackbar: {
    marginBottom: 16,
    borderRadius: 8,
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

export default LoginScreen;
