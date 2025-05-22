import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Snackbar,
  Menu,
  IconButton,
  Divider,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useForm, Controller } from "react-hook-form";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import { hashPassword } from "../../utils/auth";
import { useTranslation } from "react-i18next";

interface CompanyAdminFormData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone_number: string;
}

interface Company {
  id: string;
  company_name: string;
  active: boolean;
}

const CreateCompanyAdminScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // Company selection states
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const dropdownRef = React.useRef(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<CompanyAdminFormData>({
    defaultValues: {
      first_name: "",
      last_name: "",
      email: "",
      password: "",
      phone_number: "",
    },
  });

  // Fetch companies for dropdown
  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("company")
        .select("id, company_name, active")
        .eq("active", true)
        .order("company_name");

      if (error) {
        console.error("Error fetching companies:", error);
        return;
      }

      setCompanies(data || []);
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const showMenu = () => {
    if (dropdownRef.current) {
      // @ts-ignore - Getting layout measurements
      dropdownRef.current.measure((x, y, width, height, pageX, pageY) => {
        setMenuPosition({ x: pageX, y: pageY + height });
        setMenuVisible(true);
      });
    }
  };

  const onSubmit = async (data: CompanyAdminFormData) => {
    try {
      if (!selectedCompany) {
        setSnackbarMessage(
          t("superAdmin.companyAdmin.selectCompanyRequired") ||
            "Please select a company"
        );
        setSnackbarVisible(true);
        return;
      }

      setLoading(true);
      setSnackbarVisible(false);

      // Validate email domain
      const emailParts = data.email.split("@");
      if (
        emailParts.length !== 2 ||
        !emailParts[1].includes(".") ||
        emailParts[1].length < 3
      ) {
        setSnackbarMessage(
          t("superAdmin.companyAdmin.invalidEmailDomain") ||
            "Invalid email domain"
        );
        setSnackbarVisible(true);
        setLoading(false);
        return;
      }

      // Validate password strength
      if (data.password.length < 8) {
        setSnackbarMessage(
          t("superAdmin.companyAdmin.passwordLength") ||
            "Password must be at least 8 characters"
        );
        setSnackbarVisible(true);
        setLoading(false);
        return;
      }

      // Check if user already exists
      const { data: existingUser, error: userCheckError } = await supabase
        .from("users")
        .select("id")
        .eq("email", data.email)
        .maybeSingle();

      if (userCheckError) {
        throw new Error(userCheckError.message);
      }

      if (existingUser) {
        setSnackbarMessage(
          t("superAdmin.companyAdmin.emailAlreadyExists") ||
            "Email already exists"
        );
        setSnackbarVisible(true);
        setLoading(false);
        return;
      }

      // Hash password
      const hashedPassword = await hashPassword(data.password);

      // Generate reset token
      const resetToken =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      const resetTokenExpiry = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      // Create user
      const { data: newUser, error: userError } = await supabase
        .from("users")
        .insert({
          email: data.email,
          password_hash: hashedPassword,
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          reset_token: resetToken,
          reset_token_expires: resetTokenExpiry,
        })
        .select("id")
        .single();

      if (userError) {
        throw new Error(userError.message);
      }

      // Create company_user record
      const companyUserData = {
        id: newUser.id,
        company_id: selectedCompany.id,
        first_name: data.first_name,
        last_name: data.last_name,
        email: data.email,
        role: "admin",
        active_status: "active",
        created_by: user?.id,
        phone_number:
          data.phone_number ||
          t("superAdmin.companyAdmin.notProvided") ||
          "Not provided",
        date_of_birth: new Date().toISOString(),
        nationality: (
          t("superAdmin.companyAdmin.notProvided") || "Not provided"
        ).substring(0, 20),
      };

      const { error: companyUserError } = await supabase
        .from("company_user")
        .insert([companyUserData]);

      if (companyUserError) {
        // If company_user creation fails, delete the user
        await supabase.from("users").delete().eq("id", newUser.id);
        throw new Error(companyUserError.message);
      }

      setSnackbarMessage(
        t("superAdmin.companyAdmin.adminCreatedSuccess") ||
          "Company admin created successfully"
      );
      setSnackbarVisible(true);

      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (error: any) {
      console.error("Error creating company admin:", error);
      setSnackbarMessage(
        error.message ||
          t("superAdmin.companyAdmin.failedToCreate") ||
          "Failed to create company admin"
      );
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  // Menu container style with theme
  const menuContainerStyle = {
    borderRadius: 12,
    width: 300,
    marginTop: 4,
    elevation: 4,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader
        showLogo={false}
        showBackButton={true}
        title={
          t("superAdmin.companyAdmin.createCompanyAdmin") ||
          "Create Company Admin"
        }
        showHelpButton={true}
        absolute={false}
      />

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
            {t("superAdmin.companyAdmin.selectCompany") || "Select Company"}
          </Text>

          <TouchableOpacity
            ref={dropdownRef}
            style={[
              styles.dropdownButton,
              selectedCompany && styles.activeDropdownButton,
            ]}
            onPress={showMenu}
          >
            <View style={styles.dropdownContent}>
              <IconButton
                icon="office-building"
                size={20}
                iconColor={selectedCompany ? theme.colors.primary : "#757575"}
                style={styles.dropdownLeadingIcon}
              />
              <Text
                style={[
                  styles.dropdownButtonText,
                  selectedCompany && {
                    color: theme.colors.primary,
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {selectedCompany
                  ? selectedCompany.company_name
                  : t("superAdmin.companyAdmin.selectCompany") ||
                    "Select Company"}
              </Text>
            </View>
            <IconButton
              icon="chevron-down"
              size={20}
              style={styles.dropdownIcon}
              iconColor={selectedCompany ? theme.colors.primary : "#757575"}
            />
          </TouchableOpacity>

          <Text
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            {t("superAdmin.companyAdmin.adminInformation") ||
              "Admin Information"}
          </Text>

          <View style={styles.row}>
            <View style={styles.halfInput}>
              <Controller
                control={control}
                rules={{
                  required:
                    t("superAdmin.companyAdmin.firstNameRequired") ||
                    "First name is required",
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label={`${t("superAdmin.companyAdmin.firstName") || "First Name"} *`}
                    mode="outlined"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={!!errors.first_name}
                    style={styles.input}
                    disabled={loading}
                  />
                )}
                name="first_name"
              />
              {errors.first_name && (
                <Text style={styles.errorText}>
                  {errors.first_name.message}
                </Text>
              )}
            </View>

            <View style={styles.halfInput}>
              <Controller
                control={control}
                rules={{
                  required:
                    t("superAdmin.companyAdmin.lastNameRequired") ||
                    "Last name is required",
                }}
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextInput
                    label={`${t("superAdmin.companyAdmin.lastName") || "Last Name"} *`}
                    mode="outlined"
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={!!errors.last_name}
                    style={styles.input}
                    disabled={loading}
                  />
                )}
                name="last_name"
              />
              {errors.last_name && (
                <Text style={styles.errorText}>{errors.last_name.message}</Text>
              )}
            </View>
          </View>

          <Controller
            control={control}
            rules={{
              required:
                t("superAdmin.companyAdmin.emailRequired") ||
                "Email is required",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message:
                  t("superAdmin.companyAdmin.invalidEmail") ||
                  "Invalid email address",
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={`${t("superAdmin.companyAdmin.email") || "Email"} *`}
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

          <Controller
            control={control}
            rules={{
              required:
                t("superAdmin.companyAdmin.passwordRequired") ||
                "Password is required",
              minLength: {
                value: 8,
                message:
                  t("superAdmin.companyAdmin.passwordLength") ||
                  "Password must be at least 8 characters",
              },
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={`${t("superAdmin.companyAdmin.password") || "Password"} *`}
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.password}
                style={styles.input}
                secureTextEntry
                disabled={loading}
              />
            )}
            name="password"
          />
          {errors.password && (
            <Text style={styles.errorText}>{errors.password.message}</Text>
          )}

          <Controller
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label={
                  t("superAdmin.companyAdmin.phoneNumber") ||
                  "Phone Number (Optional)"
                }
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                style={styles.input}
                keyboardType="phone-pad"
                disabled={loading}
              />
            )}
            name="phone_number"
          />

          <Text style={styles.helperText}>
            {t("superAdmin.companyAdmin.adminInviteHelper") ||
              "An invitation email will be sent to the admin with login instructions."}
          </Text>

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            style={styles.submitButton}
            loading={loading}
            disabled={loading}
          >
            {t("superAdmin.companyAdmin.createAdmin") || "Create Company Admin"}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={menuPosition}
        contentStyle={menuContainerStyle}
      >
        <View style={styles.menuHeader}>
          <Text style={styles.menuTitle}>
            {t("superAdmin.companyAdmin.selectCompany") || "Select Company"}
          </Text>
        </View>
        <Divider />
        <ScrollView style={{ maxHeight: 400 }}>
          {companies.map((company) => (
            <Menu.Item
              key={company.id}
              title={company.company_name}
              onPress={() => {
                setSelectedCompany(company);
                setMenuVisible(false);
              }}
              style={styles.menuItemStyle}
              titleStyle={[
                styles.menuItemText,
                selectedCompany?.id === company.id && styles.menuItemSelected,
              ]}
              leadingIcon="office-building"
              trailingIcon={
                selectedCompany?.id === company.id ? "check" : undefined
              }
            />
          ))}
          {companies.length === 0 && (
            <Menu.Item
              title={
                t("superAdmin.companyAdmin.noCompaniesFound") ||
                "No companies found"
              }
              disabled={true}
              style={styles.menuItemStyle}
            />
          )}
        </ScrollView>
      </Menu>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: t("common.ok") || "OK",
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
    padding: 25,
    paddingBottom: 40,
    paddingTop: -25,
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  halfInput: {
    width: "48%",
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
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    paddingLeft: 4,
    paddingRight: 8,
    paddingVertical: 6,
    backgroundColor: "#FFFFFF",
    marginBottom: 16,
  },
  dropdownContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dropdownLeadingIcon: {
    margin: 0,
    padding: 0,
  },
  dropdownButtonText: {
    fontFamily: "Poppins-Regular",
    color: "#424242",
    flex: 1,
    fontSize: 14,
  },
  dropdownIcon: {
    margin: 0,
    padding: 0,
  },
  activeDropdownButton: {
    borderColor: "#1a73e8",
    backgroundColor: "#F0F7FF",
  },
  menuHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#F5F5F5",
  },
  menuTitle: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#212121",
  },
  menuItemStyle: {
    height: 48,
    justifyContent: "center",
  },
  menuItemText: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    color: "#424242",
  },
  menuItemSelected: {
    color: "#1a73e8",
    fontFamily: "Poppins-Medium",
  },
});

export default CreateCompanyAdminScreen;
