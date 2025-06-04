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

const { width, height } = Dimensions.get("window");

// Add type definition for route params
type ResetPasswordParams = {
  token: string;
};

const ResetPasswordScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route =
    useRoute<RouteProp<{ params: ResetPasswordParams }, "params">>();
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
  const [isResetting, setIsResetting] = useState(false);

  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];

  useEffect(() => {
    // Extract token from route params if available
    if (route.params && route.params.token) {
      setToken(route.params.token);
    }

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
  }, [route.params]);

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError(t("resetPassword.passwordRequired"));
      return false;
    } else if (password.length < 6) {
      setPasswordError(t("resetPassword.passwordLength"));
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
    Linking.openURL("mailto:support@yourdomain.com?subject=Support%20Request");
  };

  const handleResetPassword = async () => {
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);

    if (!isPasswordValid || !isConfirmPasswordValid) {
      return;
    }

    if (!token) {
      setSnackbarMessage(t("resetPassword.invalidToken"));
      setSnackbarVisible(true);
      return;
    }

    try {
      setIsResetting(true);
      const { error } = await resetPassword(password, token);

      if (error) {
        setSnackbarMessage(error.message || t("resetPassword.failedReset"));
        setSnackbarVisible(true);
      } else {
        setSnackbarMessage(t("resetPassword.successMessage"));
        setSnackbarVisible(true);

        // Navigate to login after a delay
        setTimeout(() => {
          navigation.navigate("Login" as never);
        }, 3000);
      }
    } catch (err) {
      console.error("Reset password error:", err);
      setSnackbarMessage(t("common.unexpectedError"));
      setSnackbarVisible(true);
    } finally {
      setIsResetting(false);
    }
  };

  const getGradientColors = () => {
    return !theme.dark
      ? (["#151729", "#2a2e43"] as const)
      : ([theme.colors.background, theme.colors.surface] as const);
  };

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.colors.backgroundTertiary },
      ]}
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
                disabled={isResetting || !token}
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
                  {isResetting ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.buttonLabel}>
                      {t("resetPassword.resetButton")}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {!token && (
                <HelperText type="error" style={styles.tokenError}>
                  {t("resetPassword.invalidLinkMessage")}
                </HelperText>
              )}
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
        action={{
          label: t("common.ok"),
          onPress: () => setSnackbarVisible(false),
        }}
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
  tokenError: {
    textAlign: "center",
    marginTop: 16,
    fontSize: 14,
    letterSpacing: 0.25,
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
});

export default ResetPasswordScreen;
