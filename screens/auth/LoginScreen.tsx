
import React, { useState } from 'react';
import { StyleSheet, View, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Text, TextInput, Button, useTheme, Snackbar } from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

const LoginScreen = () => {
  const theme = useTheme();
  const { signIn, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const handleSignIn = async () => {
    if (!email || !email.includes('@')) {
      setSnackbarMessage('Please enter a valid email address');
      setSnackbarVisible(true);
      return;
    }

    const { error } = await signIn(email);
    
    if (error) {
      setSnackbarMessage(error.message || 'Failed to sign in');
      setSnackbarVisible(true);
    } else {
      setSnackbarMessage('Magic link sent to your email');
      setSnackbarVisible(true);
    }
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
            Sign in with your email to continue
          </Text>
          
          <View style={styles.formContainer}>
            <TextInput
              label="Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.input}
              disabled={loading}
            />
            
            <Button
              mode="contained"
              onPress={handleSignIn}
              style={styles.button}
              loading={loading}
              disabled={loading}
            >
              Send Magic Link
            </Button>
          </View>
          
          <Text style={[styles.infoText, { color: theme.colors.onSurfaceVariant }]}>
            You will receive a magic link to sign in to your account. No password required.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
      
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
    marginBottom: 16,
  },
  button: {
    marginTop: 8,
    paddingVertical: 6,
  },
  infoText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 24,
    paddingHorizontal: 20,
  },
});

export default LoginScreen;
