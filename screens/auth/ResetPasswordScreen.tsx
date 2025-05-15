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
  Tooltip,
} from "react-native-paper";
import { useAuth } from "../../contexts/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import AppHeader from "../../components/AppHeader";

const { width, height } = Dimensions.get("window");

const ResetPasswordScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute();
  const { resetPassword, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [token, setToken] = useState("");

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
      setPasswordError("Password is required");
      return false;
    } else if (password.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return false;
    }
    setPasswordError("");
    return true;
  };

  const validateConfirmPassword = (confirmPassword: string) => {
    if (!confirmPassword) {
      setConfirmPasswordError("Please confirm your password");
      return false;
    } else if (confirmPassword !== password) {
      setConfirmPasswordError("Passwords do not match");
      return false;
    }
    setConfirmPasswordError("");
    return true;
  };

  const handleResetPassword = async () => {
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(confirmPassword);

    if (!isPasswordValid || !isConfirmPasswordValid) {
      return;
    }

    if (!token) {
      setSnackbarMessage("Invalid or missing reset token");
      setSnackbarVisible(true);
      return;
    }

    const { error } = await resetPassword(password, token);

    if (error) {
      setSnackbarMessage(error.message || "Failed to reset password");
      setSnackbarVisible(true);
    } else {
      setSnackbarMessage(
        "Password reset successful! You can now sign in with your new password."
      );
      setSnackbarVisible(true);

      // Navigate to login after a delay
      setTimeout(() => {
        navigation.navigate("Login" as never);
      }, 3000);
    }
  };

  const getGradientColors = () => {
    return theme.dark ? ["#151729", "#2a2e43"] : ["#f0f8ff", "#e6f2ff"];
  };

  return (
    <>
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
      <LinearGradient
        colors={getGradientColors()}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
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
                styles.logoContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <AppHeader showBackButton={true} title="Reset Password" />
            </Animated.View>

            <Animated.View
              style={[
                styles.formContainer,
                {
                  opacity: fadeAnim,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              <Text
                variant="headlineMedium"
                style={[styles.title, { color: theme.colors.primary }]}
              >
                Set New Password
              </Text>
              <Text
                variant="bodyLarge"
                style={[
                  styles.subtitle,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Create a new password for your account
              </Text>

              <BlurView
                intensity={50}
                tint={theme.dark ? "dark" : "light"}
                style={[
                  styles.glassSurface,
                  {
                    backgroundColor: theme.dark
                      ? "rgba(30, 30, 50, 0.75)"
                      : "rgba(255, 255, 255, 0.75)",
                  },
                ]}
              >
                <TextInput
                  label="New Password"
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (passwordError) validatePassword(text);
                    if (confirmPassword && confirmPasswordError)
                      validateConfirmPassword(confirmPassword);
                  }}
                  mode="flat"
                  secureTextEntry={!passwordVisible}
                  style={styles.input}
                  disabled={loading}
                  error={!!passwordError}
                  left={
                    <TextInput.Icon icon="lock" color={theme.colors.primary} />
                  }
                  right={
                    <TextInput.Icon
                      icon={passwordVisible ? "eye-off" : "eye"}
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
                  underlineColor="transparent"
                  activeUnderlineColor={theme.colors.primary}
                />
                {passwordError ? (
                  <HelperText type="error">{passwordError}</HelperText>
                ) : null}

                <TextInput
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChangeText={(text) => {
                    setConfirmPassword(text);
                    if (confirmPasswordError) validateConfirmPassword(text);
                  }}
                  mode="flat"
                  secureTextEntry={!confirmPasswordVisible}
                  style={styles.input}
                  disabled={loading}
                  error={!!confirmPasswordError}
                  left={
                    <TextInput.Icon
                      icon="lock-check"
                      color={theme.colors.primary}
                    />
                  }
                  right={
                    <TextInput.Icon
                      icon={confirmPasswordVisible ? "eye-off" : "eye"}
                      onPress={() =>
                        setConfirmPasswordVisible(!confirmPasswordVisible)
                      }
                      forceTextInputFocus={false}
                      color={theme.colors.onSurfaceVariant}
                    />
                  }
                  theme={{
                    colors: {
                      background: "transparent",
                    },
                  }}
                  underlineColor="transparent"
                  activeUnderlineColor={theme.colors.primary}
                />
                {confirmPasswordError ? (
                  <HelperText type="error">{confirmPasswordError}</HelperText>
                ) : null}

                <Button
                  mode="contained"
                  onPress={handleResetPassword}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                  loading={loading}
                  disabled={loading || !token}
                  buttonColor={theme.colors.primary}
                  labelStyle={styles.buttonLabel}
                >
                  Reset Password
                </Button>

                {!token && (
                  <HelperText type="error" style={styles.tokenError}>
                    Invalid reset link. Please request a new password reset
                    email.
                  </HelperText>
                )}
              </BlurView>
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
    </>
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
  },
  logoContainer: {
    width: "100%",
    marginBottom: 12,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  logoWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 40,
    height: 40,
    marginRight: 8,
  },
  logoText: {
    fontWeight: "bold",
  },
  helpButton: {
    margin: 0,
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
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    elevation: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    backdropFilter: "blur(10px)",
  },
  input: {
    marginBottom: 16,
    backgroundColor: "transparent",
    height: 60,
  },
  button: {
    marginTop: 24,
    borderRadius: 30,
    elevation: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  buttonContent: {
    paddingVertical: 10,
    height: 56,
  },
  buttonLabel: {
    fontSize: 16,
    letterSpacing: 1,
    fontWeight: "600",
  },
  tokenError: {
    textAlign: "center",
    marginTop: 16,
    fontSize: 14,
    letterSpacing: 0.25,
  },
  snackbar: {
    marginBottom: 16,
    borderRadius: 8,
  },
});

export default ResetPasswordScreen;
