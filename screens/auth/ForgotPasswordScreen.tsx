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

const { width, height } = Dimensions.get("window");

const ForgotPasswordScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { forgotPassword, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [emailError, setEmailError] = useState("");

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

    const { error } = await forgotPassword(email);

    if (error) {
      setSnackbarMessage(
        error.message || "Failed to send reset password email"
      );
      setSnackbarVisible(true);
    } else {
      setSnackbarMessage("Password reset instructions sent to your email");
      setSnackbarVisible(true);

      // Navigate back to login after a delay
      setTimeout(() => {
        navigation.navigate("Login" as never);
      }, 3000);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate("Login" as never);
  };

  const getGradientColors = () => {
    return theme.dark ? ["#151729", "#2a2e43"] : ["#f0f8ff", "#e6f2ff"];
  };

  return (
    <SafeAreaView
    style={[styles.container, { backgroundColor: theme.colors.background }]}>
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
                style={[styles.title, { color: theme.colors.primary }]}
              >
                Reset Password
              </Text>
              <Text
                variant="bodyLarge"
                style={[
                  styles.subtitle,
                  { color: theme.colors.onSurfaceVariant },
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
                  style={styles.input}
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
                  style={styles.button}
                  onPress={handleResetPassword}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={["#4c669f", "#3b5998", "#192f6a"]}
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
    borderWidth: 0.3,

    overflow: "hidden",
  },
  instructionText: {
    textAlign: "center",
    marginBottom: 20,
    fontSize: 16,
    lineHeight: 24,
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
  loginContainer: {
    alignItems: "center",
    marginTop: 8,
  },
  rememberPasswordContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
  loginText: {
    fontWeight: "bold",
  },
  snackbar: {
    marginBottom: 16,
    borderRadius: 8,
  },
});

export default ForgotPasswordScreen;
