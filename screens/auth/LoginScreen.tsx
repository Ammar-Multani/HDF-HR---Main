import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Snackbar,
  HelperText,
  Dialog,
  Portal,
  ActivityIndicator,
} from "react-native-paper";
import { useAuth } from "../../contexts/AuthContext";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import { testJWT } from "../../utils/testJWT";
import { supabase } from "../../lib/supabase";
import { getValidToken, base64UrlDecode } from "../../utils/auth";

const LoginScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { signIn, loading, isFirstTimeSetup, setupDefaultAdmin } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [setupDialogVisible, setSetupDialogVisible] = useState(false);
  const [testingJwt, setTestingJwt] = useState(false);
  const [jwtTestResult, setJwtTestResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);
  const [jwtDialogVisible, setJwtDialogVisible] = useState(false);

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

    const { error } = await signIn(email, password);

    if (error) {
      setSnackbarMessage(error.message || "Failed to sign in");
      setSnackbarVisible(true);
    }
  };

  const handleSetupDefaultAdmin = async () => {
    const { error } = await setupDefaultAdmin();

    if (error) {
      setSnackbarMessage(error.message || "Failed to set up default admin");
      setSnackbarVisible(true);
    } else {
      setSetupDialogVisible(false);
    }
  };

  const testJwtWithSupabase = async () => {
    setTestingJwt(true);
    setJwtTestResult(null);

    try {
      // Step 1: Run local JWT test
      const localTestResult = await testJWT();

      if (!localTestResult) {
        setJwtTestResult({
          success: false,
          message: "Local JWT generation failed",
          details: "Check logs for more details",
        });
        setJwtDialogVisible(true);
        setTestingJwt(false);
        return;
      }

      // Step 2: Get the JWT token
      const token = await getValidToken();

      if (!token) {
        setJwtTestResult({
          success: false,
          message: "No valid JWT token available",
          details: "Please sign in first to generate a token",
        });
        setJwtDialogVisible(true);
        setTestingJwt(false);
        return;
      }

      // Show token structure for diagnostic purposes
      let tokenDetails = "Token format: ";
      try {
        const parts = token.split(".");
        if (parts.length === 3) {
          const [header, payload, signature] = parts;
          // Decode and parse the header and payload
          const headerJson = JSON.parse(base64UrlDecode(header));
          const payloadJson = JSON.parse(base64UrlDecode(payload));

          tokenDetails += `\nAlgorithm: ${headerJson.alg}\n`;
          tokenDetails += `Role: ${payloadJson.role}\n`;
          tokenDetails += `Expires: ${new Date(payloadJson.exp * 1000).toLocaleString()}\n`;
          tokenDetails += `Signature: ${signature.substring(0, 10)}...\n`;
        } else {
          tokenDetails += "Invalid (should have 3 parts)\n";
        }
      } catch (error) {
        tokenDetails += `Error analyzing token: ${error}\n`;
      }

      // Step 3: Test with Supabase
      const { data, error } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: "",
      });

      // Test a simple query that requires authentication
      const { data: companyData, error: queryError } = await supabase
        .from("company")
        .select("*")
        .limit(1);

      if (queryError) {
        let errorDetails = "";

        if (queryError.message.includes("JWSInvalidSignature")) {
          errorDetails =
            "JWT signature verification failed. Your token signature doesn't match what Supabase expects.\n\n" +
            "Most common causes:\n" +
            "1. JWT secret doesn't match between app and Supabase\n" +
            "2. Signature algorithm implementation differences\n" +
            "3. Secret might be base64 encoded in one place but not the other\n\n" +
            tokenDetails;
        } else if (queryError.message.includes("JWT")) {
          errorDetails = `JWT error: ${queryError.message}\n\n${tokenDetails}`;
        } else {
          errorDetails = queryError.message;
        }

        setJwtTestResult({
          success: false,
          message: "JWT authentication failed with Supabase",
          details: errorDetails,
        });
      } else {
        setJwtTestResult({
          success: true,
          message: "JWT works correctly with Supabase!",
          details: `Retrieved ${companyData?.length || 0} records from the database\n\n${tokenDetails}`,
        });
      }
    } catch (error) {
      setJwtTestResult({
        success: false,
        message: "Error testing JWT",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setJwtDialogVisible(true);
      setTestingJwt(false);
    }
  };

  const showSetupDialog = () => {
    setSetupDialogVisible(true);
  };

  const hideSetupDialog = () => {
    setSetupDialogVisible(false);
  };

  const hideJwtDialog = () => {
    setJwtDialogVisible(false);
  };

  const navigateToRegister = () => {
    navigation.navigate("Register" as never);
  };

  const navigateToForgotPassword = () => {
    navigation.navigate("ForgotPassword" as never);
  };

  const navigateToTestScreen = () => {
    navigation.navigate("Test" as never);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <Image
              source={require("../../assets/splash-icon-light.png")}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={[styles.title, { color: theme.colors.primary }]}>
            Business Management
          </Text>

          <Text
            style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
          >
            Sign in to your account
          </Text>

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
              disabled={loading}
              error={!!emailError}
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
              disabled={loading}
              error={!!passwordError}
              right={
                <TextInput.Icon
                  icon={passwordVisible ? "eye-off" : "eye"}
                  onPress={() => setPasswordVisible(!passwordVisible)}
                  forceTextInputFocus={false}
                  size={24}
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
              loading={loading}
              disabled={loading}
            >
              Sign In
            </Button>

            {isFirstTimeSetup && (
              <Button
                mode="outlined"
                onPress={showSetupDialog}
                style={[styles.button, { marginTop: 16 }]}
                disabled={loading}
              >
                Set Up Default Admin
              </Button>
            )}

            <View style={styles.buttonGroup}>
              <Button
                mode="outlined"
                onPress={navigateToTestScreen}
                style={[
                  styles.halfButton,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              >
                Test RLS
              </Button>

              <Button
                mode="outlined"
                onPress={testJwtWithSupabase}
                style={[
                  styles.halfButton,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
                loading={testingJwt}
                disabled={testingJwt}
              >
                Test JWT
              </Button>
            </View>

            <TouchableOpacity
              onPress={navigateToForgotPassword}
              style={styles.forgotPasswordContainer}
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
            <TouchableOpacity onPress={navigateToRegister}>
              <Text
                style={[styles.registerText, { color: theme.colors.primary }]}
              >
                {" Register"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Portal>
        <Dialog visible={setupDialogVisible} onDismiss={hideSetupDialog}>
          <Dialog.Title>Set Up Default Admin</Dialog.Title>
          <Dialog.Content>
            <Text>
              This will create a default super admin account with the following
              credentials:
            </Text>
            <Text style={styles.credentialText}>
              Email: admin@businessmanagement.com
            </Text>
            <Text style={styles.credentialText}>Password: Admin@123</Text>
            <Text style={{ marginTop: 12 }}>
              You should change these credentials after your first login for
              security reasons.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideSetupDialog}>Cancel</Button>
            <Button onPress={handleSetupDefaultAdmin} loading={loading}>
              Proceed
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={jwtDialogVisible} onDismiss={hideJwtDialog}>
          <Dialog.Title>JWT Test Results</Dialog.Title>
          <Dialog.Content>
            {jwtTestResult ? (
              <>
                <Text
                  style={{
                    fontWeight: "bold",
                    color: jwtTestResult.success ? "green" : "red",
                  }}
                >
                  {jwtTestResult.message}
                </Text>
                {jwtTestResult.details && (
                  <Text style={{ marginTop: 8 }}>{jwtTestResult.details}</Text>
                )}
                {!jwtTestResult.success && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={{ fontWeight: "bold" }}>Troubleshooting:</Text>
                    <Text>
                      • Check that Supabase JWT secret matches app secret
                    </Text>
                    <Text>• Verify the token format and claims</Text>
                    <Text>• Ensure role is set to "authenticated"</Text>
                    <Text>
                      • Check the auth.ts implementation for signature issues
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={{ alignItems: "center" }}>
                <ActivityIndicator size="large" />
                <Text style={{ marginTop: 16 }}>Testing JWT...</Text>
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideJwtDialog}>Close</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

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
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
  },
  logoContainer: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    width: 200,
    height: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
  },
  formContainer: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
  },
  buttonGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  halfButton: {
    flex: 0.48,
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
    marginTop: 32,
  },
  registerText: {
    fontWeight: "bold",
  },
  credentialText: {
    fontWeight: "bold",
    marginTop: 8,
  },
});

export default LoginScreen;
