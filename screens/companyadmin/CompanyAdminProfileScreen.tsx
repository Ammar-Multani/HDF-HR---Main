import React, { useState, useEffect } from "react";
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
  Avatar,
  useTheme,
  Divider,
  Snackbar,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import CustomSnackbar from "../../components/CustomSnackbar";
import { t } from "i18next";

const CompanyAdminProfileScreen = () => {
  const theme = useTheme();
  const { user, signOut } = useAuth();

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [adminData, setAdminData] = useState<any>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const fetchProfileData = async () => {
    try {
      setLoading(true);

      if (!user) return;

      // Fetch admin data
      const { data: userData, error: userError } = await supabase
        .from("company_user")
        .select("*, company:company_id(*)")
        .eq("id", user.id)
        .single();

      if (userError) {
        console.error("Error fetching admin data:", userError);
        return;
      }

      setAdminData(userData);
      setCompanyData(userData.company);
      setFirstName(userData.first_name || "");
      setLastName(userData.last_name || "");
      setPhoneNumber(userData.phone_number || "");
    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [user]);

  const handleUpdateProfile = async () => {
    try {
      if (!user) return;

      setUpdating(true);

      // Validate inputs
      if (!firstName.trim() || !lastName.trim()) {
        setSnackbarMessage("First name and last name are required");
        setSnackbarVisible(true);
        setUpdating(false);
        return;
      }

      // Update admin record
      const { error } = await supabase
        .from("company_user")
        .update({
          first_name: firstName,
          last_name: lastName,
          phone_number: phoneNumber,
        })
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      setSnackbarMessage("Profile updated successfully");
      setSnackbarVisible(true);

      // Refresh admin data
      fetchProfileData();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      setSnackbarMessage(error.message || "Failed to update profile");
      setSnackbarVisible(true);
    } finally {
      setUpdating(false);
    }
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        onPress: async () => {
          try {
            await signOut();
          } catch (error) {
            console.error("Error signing out:", error);
          }
        },
      },
    ]);
  };

  const getInitials = () => {
    if (!firstName && !lastName)
      return user?.email?.charAt(0).toUpperCase() || "?";

    return (
      (firstName ? firstName.charAt(0).toUpperCase() : "") +
      (lastName ? lastName.charAt(0).toUpperCase() : "")
    );
  };

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader
        title="Profile"
        showBackButton={false}
        showHelpButton={true}
        onHelpPress={() => {
          navigation.navigate("Help" as never);
        }}
        showLogo={false}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.profileHeader}>
            <Avatar.Text
              size={80}
              label={getInitials()}
              style={{ backgroundColor: theme.colors.primary }}
            />
            <Text style={[styles.role, { color: theme.colors.primary }]}>
              Company Admin
            </Text>
          </View>

          <Card
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
          >
            <Card.Content>
              <Text style={styles.sectionTitle}>Company Information</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Company:</Text>
                <Text style={styles.infoValue}>
                  {companyData?.company_name || "N/A"}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Registration:</Text>
                <Text style={styles.infoValue}>
                  {companyData?.registration_number || "N/A"}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Industry:</Text>
                <Text style={styles.infoValue}>
                  {companyData?.industry_type || "N/A"}
                </Text>
              </View>
            </Card.Content>
          </Card>

          <Card
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
          >
            <Card.Content>
              <Text style={styles.sectionTitle}>Personal Information</Text>

              <TextInput
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
                mode="outlined"
                style={styles.input}
                disabled={updating}
              />

              <TextInput
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
                mode="outlined"
                style={styles.input}
                disabled={updating}
              />

              <TextInput
                label="Email"
                value={adminData?.email || ""}
                mode="outlined"
                style={styles.input}
                disabled={true}
                right={<TextInput.Icon icon="lock" />}
              />

              <TextInput
                label="Phone Number"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                mode="outlined"
                style={styles.input}
                keyboardType="phone-pad"
                disabled={updating}
              />

              <Button
                mode="contained"
                onPress={handleUpdateProfile}
                style={styles.updateButton}
                loading={updating}
                disabled={updating}
              >
                Update Profile
              </Button>
            </Card.Content>
          </Card>

          <Card
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
          >
            <Card.Content>
              <Text style={styles.sectionTitle}>Account</Text>

              <Button
                mode="outlined"
                onPress={() => {
                  setSnackbarMessage("Password reset link sent to your email");
                  setSnackbarVisible(true);
                }}
                style={styles.accountButton}
                icon="lock-reset"
              >
                Reset Password
              </Button>

              <Button
                mode="outlined"
                onPress={handleSignOut}
                style={styles.accountButton}
                icon="logout"
                textColor={theme.colors.error}
              >
                Sign Out
              </Button>
            </Card.Content>
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomSnackbar
        visible={snackbarVisible}
        message={snackbarMessage}
        onDismiss={() => setSnackbarVisible(false)}
        type={
          snackbarMessage?.includes("successful") ||
          snackbarMessage?.includes("instructions will be sent")
            ? "success"
            : snackbarMessage?.includes("rate limit") ||
                snackbarMessage?.includes("network")
              ? "warning"
              : "error"
        }
        duration={6000}
        action={{
          label: t("common.ok"),
          onPress: () => setSnackbarVisible(false),
        }}
        style={[
          styles.snackbar,
          {
            width: Platform.OS === "web" ? 700 : undefined,
            alignSelf: "center",
            position: Platform.OS === "web" ? "absolute" : undefined,
            bottom: Platform.OS === "web" ? 24 : undefined,
          },
        ]}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  role: {
    marginTop: 8,
    fontSize: 16,
    fontWeight: "500",
  },
  card: {
    marginBottom: 16,
    elevation: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  infoLabel: {
    fontWeight: "500",
    width: 100,
    opacity: 0.7,
  },
  infoValue: {
    flex: 1,
  },
  input: {
    marginBottom: 16,
  },
  updateButton: {
    marginTop: 8,
  },
  accountButton: {
    marginBottom: 12,
  },
  snackbar: {
    marginBottom: 16,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
});

// Missing Card component
const Card = ({ children, style }: any) => {
  return (
    <View
      style={[{ borderRadius: 8, overflow: "hidden", marginBottom: 16 }, style]}
    >
      {children}
    </View>
  );
};

Card.Content = ({ children }: any) => {
  return <View style={{ padding: 16 }}>{children}</View>;
};

export default CompanyAdminProfileScreen;
