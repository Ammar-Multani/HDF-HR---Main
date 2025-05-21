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
import LanguageSelector from "../../components/LanguageSelector";

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
    return theme.dark
      ? (["#151729", "#2a2e43"] as const)
      : (["#f0f8ff", "#e6f2ff"] as const);
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
          showBackButton={false}
          showHelpButton={true}
          absolute={true}
        />

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
              <BlurView
                intensity={50}
                tint={theme.dark ? "dark" : "light"}
                style={[
                  styles.glassSurface,
                  {
                    backgroundColor: theme.dark
                      ? "rgba(30, 30, 50, 0.75)"
                      : "rgba(255, 255, 255, 0.75)",
                    borderColor: theme.colors.outlineVariant,
                  },
                ]}
              >
                <Text
                  variant="headlineMedium"
                  style={[styles.title, { color: theme.colors.onBackground }]}
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
                  style={styles.input}
                  disabled={isLoggingIn}
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

                <TextInput
                  label={t("common.password")}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) validatePassword(text);
                  }}
                  mode="flat"
                  secureTextEntry={!passwordVisible}
                  style={styles.input}
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
                      background: "transparent",
                    },
                  }}
                  underlineColor={theme.colors.outlineVariant}
                  activeUnderlineColor={theme.colors.primary}
                />
                {passwordError ? (
                  <HelperText type="error">{passwordError}</HelperText>
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
                    { borderColor: theme.colors.outlineVariant },
                  ]}
                  onPress={handleSignIn}
                  disabled={isLoggingIn}
                >
                  <LinearGradient
                    colors={
                      ["#4c669f", "#3b5998", "#192f6a"] as [
                        "#4c669f",
                        "#3b5998",
                        "#192f6a",
                      ]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientButton}
                  >
                    {isLoggingIn ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.buttonLabel}>
                        {t("common.signIn")}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </BlurView>
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
                <Divider style={styles.divider} />
                <Text
                  style={[
                    styles.dividerText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  OR
                </Text>
                <Divider style={styles.divider} />
              </View>

              <View style={styles.contactContainer}>
                <TouchableOpacity
                  onPress={handleContactUs}
                  disabled={isLoggingIn}
                  style={styles.contactButton}
                >
                  <Text style={{ color: theme.colors.primary }}>
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

              {/* Language Selector */}
              <View style={styles.languageSelectorContainer}>
                <LanguageSelector />
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
          style={styles.snackbar}
        >
          {snackbarMessage}
        </Snackbar>
      </LinearGradient>
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
  },
  title: {
    fontWeight: "bold",
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 24,
  },
  formContainer: {
    width: "100%",
    marginBottom: 20,
  },
  glassSurface: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 0.3,
    overflow: "hidden",
  },
  input: {
    marginBottom: 16,
    backgroundColor: "transparent",
    height: 60,
  },
  button: {
    marginTop: 24,
    borderRadius: 30,
    overflow: "hidden",
    borderWidth: 0.3,
  },
  gradientButton: {
    width: "100%",
    height: 56,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonLabel: {
    fontSize: 16,
    letterSpacing: 1,
    fontWeight: "600",
    color: "#ffffff",
  },
  forgotPasswordContainer: {
    alignItems: "flex-end",
    marginTop: 4,
    marginBottom: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "600",
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
    fontSize: 14,
    fontWeight: "600",
  },
  socialLoginContainer: {
    marginTop: 8,
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
    marginTop: 24,
  },
  contactButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  contactText: {
    fontWeight: "bold",
    fontSize: 16,
  },
  languageSelectorContainer: {
    marginTop: 20,
    alignItems: "center",
  },
  snackbar: {
    marginBottom: 16,
    borderRadius: 8,
  },
});

export default LoginScreen;
