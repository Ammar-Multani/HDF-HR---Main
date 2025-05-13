import React, { useState } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Snackbar,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useForm, Controller } from "react-hook-form";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import { UserRole, UserStatus } from "../../types";

interface AdminFormData {
  name: string;
  email: string;
}

const CreateSuperAdminScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AdminFormData>({
    defaultValues: {
      name: "",
      email: "",
    },
  });

  const onSubmit = async (data: AdminFormData) => {
    try {
      setLoading(true);

      // Create admin user in auth
      const { data: adminData, error: adminError } =
        await supabase.auth.admin.createUser({
          email: data.email,
          email_confirm: true,
          user_metadata: {
            role: UserRole.SUPER_ADMIN,
          },
        });

      if (adminError) {
        throw adminError;
      }

      // Create admin record
      const { error: adminRecordError } = await supabase.from("admin").insert([
        {
          id: adminData.user.id,
          name: data.name,
          email: data.email,
          role: UserRole.SUPER_ADMIN,
          status: UserStatus.ACTIVE,
          created_by: user?.id,
        },
      ]);

      if (adminRecordError) {
        throw adminRecordError;
      }

      // Send magic link to the admin
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email: data.email,
        options: {
          emailRedirectTo: "hdfhr://auth/callback",
        },
      });

      if (magicLinkError) {
        throw magicLinkError;
      }

      setSnackbarMessage(
        "Super Admin created successfully and invitation sent"
      );
      setSnackbarVisible(true);

      // Reset form
      reset();

      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (error: any) {
      console.error("Error creating super admin:", error);
      setSnackbarMessage(error.message || "Failed to create super admin");
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader title="Create Super Admin" showBackButton />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <Text
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            Super Admin Information
          </Text>

          <Controller
            control={control}
            rules={{ required: "Name is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Name *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.name}
                style={styles.input}
                disabled={loading}
              />
            )}
            name="name"
          />
          {errors.name && (
            <Text style={styles.errorText}>{errors.name.message}</Text>
          )}

          <Controller
            control={control}
            rules={{
              required: "Email is required",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Invalid email address",
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Email *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.email}
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
                disabled={loading}
              />
            )}
            name="email"
          />
          {errors.email && (
            <Text style={styles.errorText}>{errors.email.message}</Text>
          )}

          <Text style={styles.helperText}>
            An invitation will be sent to this email to set up the super admin
            account.
          </Text>

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            style={styles.submitButton}
            loading={loading}
            disabled={loading}
          >
            Create Super Admin
          </Button>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 24,
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 4,
  },
  helperText: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 4,
    marginBottom: 24,
  },
  submitButton: {
    marginTop: 16,
    paddingVertical: 6,
  },
});

export default CreateSuperAdminScreen;
