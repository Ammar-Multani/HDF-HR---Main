import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
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
} from "react-native-paper";
import { useAuth } from "../../contexts/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Key to prevent showing loading screen right after login
const SKIP_LOADING_KEY = "skip_loading_after_login";

const LoginScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { signIn } = useAuth(); // Don't get loading state from auth context
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

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

  const handleSignIn = async () => {
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    try {
      // Set local loading state
      setIsLoggingIn(true);
      setStatusMessage("Authenticating...");

      // Set flag to skip redundant loading screens
      await AsyncStorage.setItem(SKIP_LOADING_KEY, "true");

      // Update status as authentication progresses
      const timer = setTimeout(() => {
        if (isLoggingIn) {
          setStatusMessage("Verifying credentials...");
        }
      }, 1000);

      // Attempt sign in
      const { error } = await signIn(email, password);

      clearTimeout(timer);

      if (error) {
        setSnackbarMessage(error.message || "Failed to sign in");
        setSnackbarVisible(true);
        await AsyncStorage.removeItem(SKIP_LOADING_KEY);
      } else {
        // Show success state briefly
        setStatusMessage("Success! Redirecting...");
      }
    } catch (err) {
      setSnackbarMessage("An unexpected error occurred");
      setSnackbarVisible(true);
      await AsyncStorage.removeItem(SKIP_LOADING_KEY);
    } finally {
      // Don't hide loading immediately on success to avoid UI flashing
      if (snackbarVisible) {
        setIsLoggingIn(false);
        setStatusMessage("");
      }
    }
  };

  const navigateToRegister = () => {
    navigation.navigate("Register" as never);
  };

  const navigateToForgotPassword = () => {
    navigation.navigate("ForgotPassword" as never);
  };

  // Render a minimal loading overlay instead of disabling the entire form
  const renderLoadingOverlay = () => {
    if (!isLoggingIn) return null;

    return (
      <Surface style={styles.loadingOverlay}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
        <Text style={styles.loadingText}>{statusMessage}</Text>
      </Surface>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollViewContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <Image
              source={
                theme.dark
                  ? require("../../assets/splash-icon-light.png")
                  : require("../../assets/splash-icon-dark.png")
              }
              style={styles.logo}
              resizeMode="contain"
            />
            <Text
              variant="headlineMedium"
              style={[styles.title, { color: theme.colors.primary }]}
            >
              HDF HR
            </Text>
          </View>

          <View style={styles.formContainer}>
            <TextInput
              label="Email"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                if (emailError) validateEmail(text);
              }}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              disabled={isLoggingIn}
              error={!!emailError}
              left={<TextInput.Icon icon="email" />}
            />
            {emailError ? (
              <HelperText type="error">{emailError}</HelperText>
            ) : null}

            <TextInput
              label="Password"
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (passwordError) validatePassword(text);
              }}
              mode="outlined"
              secureTextEntry={!passwordVisible}
              style={styles.input}
              disabled={isLoggingIn}
              error={!!passwordError}
              left={<TextInput.Icon icon="lock" />}
              right={
                <TextInput.Icon
                  icon={passwordVisible ? "eye-off" : "eye"}
                  onPress={() => setPasswordVisible(!passwordVisible)}
                  forceTextInputFocus={false}
                />
              }
            />
            {passwordError ? (
              <HelperText type="error">{passwordError}</HelperText>
            ) : null}

            <Button
              mode="contained"
              onPress={handleSignIn}
              style={styles.button}
              loading={isLoggingIn}
              disabled={isLoggingIn}
            >
              {isLoggingIn ? "Signing In..." : "Sign In"}
            </Button>

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
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.registerContainer}>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              Don't have an account?
            </Text>
            <TouchableOpacity
              onPress={navigateToRegister}
              disabled={isLoggingIn}
            >
              <Text
                style={[styles.registerText, { color: theme.colors.primary }]}
              >
                {" Register"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Render minimal loading overlay */}
      {renderLoadingOverlay()}

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: "OK",
          onPress: () => setSnackbarVisible(false),
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
    padding: 16,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  formContainer: {
    width: "100%",
    marginBottom: 32,
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 12,
    paddingVertical: 6,
  },
  forgotPasswordContainer: {
    alignItems: "center",
    marginTop: 16,
  },
  forgotPasswordText: {
    fontSize: 14,
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
  registerText: {
    fontWeight: "bold",
  },
  credentialText: {
    fontWeight: "bold",
    marginTop: 8,
  },
  loadingOverlay: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  loadingText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: "500",
  },
});

export default LoginScreen;
