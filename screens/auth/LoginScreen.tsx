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
  Snackbar,
  HelperText,
  Surface,
  Divider,
  IconButton,
  Card,
  Avatar,
  Appbar,
  Tooltip,
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

  const handleSignIn = async () => {
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    try {
      setIsLoggingIn(true);
      await AsyncStorage.setItem(SKIP_LOADING_KEY, "true");

      const { error } = await signIn(email, password);

      if (error) {
        // Handle specific error types
        if (
          error.code === "auth/invalid-password" ||
          error.code === "auth/wrong-password" ||
          error.message?.toLowerCase().includes("password") ||
          error.message?.toLowerCase().includes("invalid credentials")
        ) {
          setPasswordError(
            t("login.invalidPassword") || "Invalid password. Please try again."
          );
          setPassword("");
        } else if (
          error.code === "auth/user-not-found" ||
          error.message?.toLowerCase().includes("user") ||
          error.message?.toLowerCase().includes("email")
        ) {
          setEmailError(
            t("login.userNotFound") ||
              "User not found. Please check your email."
          );
        } else {
          // General error handling
          setSnackbarMessage(error.message || t("login.failedSignIn"));
          setSnackbarVisible(true);
        }

        await AsyncStorage.removeItem(SKIP_LOADING_KEY);
      }
    } catch (err) {
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

  const getGradientColors = () => {
    return theme.light
      ? (["#151729", "#2a2e43"] as const)
      : ([
          theme.colors.background,
          (theme.colors as any).backgroundTertiary,
        ] as const);
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.colors.backgroundTertiary },
      ]}
    >
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />

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
                onPress={handleContactUs}
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

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: "OK",
          onPress: () => setSnackbarVisible(false),
        }}
        style={[
          styles.snackbar,
          { backgroundColor: theme.colors.surfaceVariant },
        ]}
        theme={{
          colors: {
            surface: theme.colors.surfaceVariant,
            onSurface: theme.colors.onSurface,
          },
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
  snackbar: {
    marginBottom: 16,
    borderRadius: 8,
  },
});

export default LoginScreen;
