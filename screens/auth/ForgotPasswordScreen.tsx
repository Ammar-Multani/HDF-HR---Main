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
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import AppHeader from "../../components/AppHeader";
import CustomLanguageSelector from "../../components/CustomLanguageSelector";
import { globalStyles, createTextStyle } from "../../utils/globalStyles";
import { initEmailService } from "../../utils/emailService";

const { width, height } = Dimensions.get("window");

const ForgotPasswordScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { forgotPassword, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [emailError, setEmailError] = useState("");

  // Initialize email service
  useEffect(() => {
    initEmailService();
  }, []);

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
      setEmailError("Email is required");
      return false;
    } else if (!emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
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
      console.log("Initiating password reset for email:", email);
      const { error } = await forgotPassword(email);

      if (error) {
        let errorMessage =
          error.message || "Failed to send reset password email";

        // Handle specific error cases
        if (error.message?.includes("sender identity")) {
          errorMessage =
            "Email service configuration error. Please contact support.";
        } else if (error.message?.includes("rate limit")) {
          errorMessage = "Too many attempts. Please try again later.";
        } else if (error.message?.includes("network")) {
          errorMessage =
            "Network error. Please check your connection and try again.";
        }

        console.error("Password reset error:", error);
        setSnackbarMessage(errorMessage);
        setSnackbarVisible(true);
      } else {
        console.log("Password reset request successful");
        setSnackbarMessage(
          "If an account exists with this email, password reset instructions will be sent."
        );
        setSnackbarVisible(true);

        // Navigate back to login after a delay
        setTimeout(() => {
          navigation.navigate("Login" as never);
        }, 3000);
      }
    } catch (err) {
      console.error("Unexpected error during password reset:", err);
      setSnackbarMessage("An unexpected error occurred. Please try again.");
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
                  style={[
                    styles.title,
                    {
                      color: theme.colors.primary,
                    },
                  ]}
                >
                  Reset Password
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
                  Enter your email to receive password reset instructions
                </Text>

                <TextInput
                  label="Email"
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
                    colors={
                      [
                        "rgba(10,185,129,255)",
                        "rgba(6,169,169,255)",
                        "rgba(38,127,161,255)",
                        "rgba(54,105,157,255)",
                        "rgba(74,78,153,255)",
                        "rgba(94,52,149,255)",
                      ] as [
                        "rgba(10,185,129,255)",
                        "rgba(6,169,169,255)",
                        "rgba(38,127,161,255)",
                        "rgba(54,105,157,255)",
                        "rgba(74,78,153,255)",
                        "rgba(94,52,149,255)",
                      ]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientButton}
                  >
                    {loading ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={styles.buttonLabel}>
                        Send Reset Instructions
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </BlurView>
            </Animated.View>

            <Animated.View
              style={[
                styles.loginContainer,
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

              <View style={styles.rememberPasswordContainer}>
                <Text style={{ color: theme.colors.onSurfaceVariant }}>
                  Remember your password?
                </Text>
                <TouchableOpacity onPress={navigateToLogin}>
                  <Text
                    style={[styles.loginText, { color: theme.colors.primary }]}
                  >
                    {" Sign In"}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Language Selector */}
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
  languageSelectorContainer: {
    marginTop: Platform.OS === "web" ? 0 : 20,
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

export default ForgotPasswordScreen;
