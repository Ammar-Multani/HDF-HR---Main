import React, { useState } from 'react';
import { StyleSheet, View, Image, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, useTheme, Snackbar, HelperText, Dialog, Portal } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const LoginScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { signIn, loading, isFirstTimeSetup, setupDefaultAdmin } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [setupDialogVisible, setSetupDialogVisible] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setEmailError('Email is required');
      return false;
    } else if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    }
    setEmailError('');
    return true;
  };

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    }
    setPasswordError('');
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
      setSnackbarMessage(error.message || 'Failed to sign in');
      setSnackbarVisible(true);
    }
  };

  const handleSetupDefaultAdmin = async () => {
    const { error } = await setupDefaultAdmin();
    
    if (error) {
      setSnackbarMessage(error.message || 'Failed to set up default admin');
      setSnackbarVisible(true);
    } else {
      setSetupDialogVisible(false);
    }
  };

  const showSetupDialog = () => {
    setSetupDialogVisible(true);
  };

  const hideSetupDialog = () => {
    setSetupDialogVisible(false);
  };

  const navigateToRegister = () => {
    navigation.navigate('Register' as never);
  };

  const navigateToForgotPassword = () => {
    navigation.navigate('ForgotPassword' as never);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/images/appacella-logo-blue.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>
          
          <Text style={[styles.title, { color: theme.colors.primary }]}>
            Business Management
          </Text>
          
          <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
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
            {emailError ? <HelperText type="error">{emailError}</HelperText> : null}
            
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
                />
              }
            />
            {passwordError ? <HelperText type="error">{passwordError}</HelperText> : null}
            
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

            <TouchableOpacity 
              onPress={navigateToForgotPassword}
              style={styles.forgotPasswordContainer}
            >
              <Text style={[styles.forgotPasswordText, { color: theme.colors.primary }]}>
                Forgot Password?
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.registerContainer}>
            <Text style={{ color: theme.colors.onSurfaceVariant }}>
              Don't have an account?
            </Text>
            <TouchableOpacity onPress={navigateToRegister}>
              <Text style={[styles.registerText, { color: theme.colors.primary }]}>
                {' Register'}
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
              This will create a default super admin account with the following credentials:
            </Text>
            <Text style={styles.credentialText}>
              Email: admin@businessmanagement.com
            </Text>
            <Text style={styles.credentialText}>
              Password: Admin@123
            </Text>
            <Text style={{ marginTop: 12 }}>
              You should change these credentials after your first login for security reasons.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideSetupDialog}>Cancel</Button>
            <Button onPress={handleSetupDefaultAdmin} loading={loading}>Proceed</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: 'OK',
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
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logo: {
    width: 200,
    height: 100,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  forgotPasswordText: {
    fontSize: 14,
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  registerText: {
    fontWeight: 'bold',
  },
  credentialText: {
    fontWeight: 'bold',
    marginTop: 8,
  },
});

export default LoginScreen;
