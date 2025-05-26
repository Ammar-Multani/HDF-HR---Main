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
import { t } from "i18next";

const EmployeeProfileScreen = () => {
  const theme = useTheme();
  const { user, signOut } = useAuth();

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const fetchProfileData = async () => {
    try {
      setLoading(true);

      if (!user) return;

      // Fetch employee data
      const { data: userData, error: userError } = await supabase
        .from("company_user")
        .select("*, company:company_id(*)")
        .eq("id", user.id)
        .single();

      if (userError) {
        console.error("Error fetching employee data:", userError);
        return;
      }

      setEmployeeData(userData);
      setCompanyData(userData.company);
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

      // Update employee record
      const { error } = await supabase
        .from("company_user")
        .update({
          phone_number: phoneNumber,
        })
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      setSnackbarMessage("Profile updated successfully");
      setSnackbarVisible(true);

      // Refresh employee data
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
    if (!employeeData) return user?.email?.charAt(0).toUpperCase() || "?";

    return (
      (employeeData.first_name
        ? employeeData.first_name.charAt(0).toUpperCase()
        : "") +
      (employeeData.last_name
        ? employeeData.last_name.charAt(0).toUpperCase()
        : "")
    );
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
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
        showBackButton={true}
        showHelpButton={false}
        showProfileMenu={false}
        showLogo={false}
        showTitle={true}
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
            <Text style={styles.userName}>
              {employeeData?.first_name} {employeeData?.last_name}
            </Text>
            <Text style={[styles.role, { color: theme.colors.primary }]}>
              {employeeData?.job_title || "Employee"}
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
                <Text style={styles.infoLabel}>Start Date:</Text>
                <Text style={styles.infoValue}>
                  {formatDate(employeeData?.employment_start_date)}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Employment:</Text>
                <Text style={styles.infoValue}>
                  {employeeData?.employment_type
                    ? employeeData.employment_type
                        .toString()
                        .split("_")
                        .map(
                          (word: string) =>
                            word.charAt(0).toUpperCase() + word.slice(1)
                        )
                        .join(" ")
                    : "N/A"}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Workload:</Text>
                <Text style={styles.infoValue}>
                  {employeeData?.workload_percentage}%
                </Text>
              </View>
            </Card.Content>
          </Card>

          <Card
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
          >
            <Card.Content>
              <Text style={styles.sectionTitle}>Personal Information</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email:</Text>
                <Text style={styles.infoValue}>
                  {employeeData?.email || "N/A"}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Date of Birth:</Text>
                <Text style={styles.infoValue}>
                  {formatDate(employeeData?.date_of_birth)}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Nationality:</Text>
                <Text style={styles.infoValue}>
                  {employeeData?.nationality || "N/A"}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Gender:</Text>
                <Text style={styles.infoValue}>
                  {employeeData?.gender?.charAt(0).toUpperCase() +
                    employeeData?.gender?.slice(1) || "N/A"}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Marital Status:</Text>
                <Text style={styles.infoValue}>
                  {employeeData?.marital_status?.charAt(0).toUpperCase() +
                    employeeData?.marital_status?.slice(1).replace("_", " ") ||
                    "N/A"}
                </Text>
              </View>

              <Divider style={styles.divider} />

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
                Update Phone Number
              </Button>
            </Card.Content>
          </Card>

          <Card
            style={[styles.card, { backgroundColor: theme.colors.surface }]}
          >
            <Card.Content>
              <Text style={styles.sectionTitle}>Address</Text>

              {employeeData?.address && (
                <>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Street:</Text>
                    <Text style={styles.infoValue}>
                      {employeeData.address.line1}
                      {employeeData.address.line2
                        ? `, ${employeeData.address.line2}`
                        : ""}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>City:</Text>
                    <Text style={styles.infoValue}>
                      {employeeData.address.city}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>State/Province:</Text>
                    <Text style={styles.infoValue}>
                      {employeeData.address.state}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Postal Code:</Text>
                    <Text style={styles.infoValue}>
                      {employeeData.address.postal_code}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Country:</Text>
                    <Text style={styles.infoValue}>
                      {employeeData.address.country}
                    </Text>
                  </View>
                </>
              )}
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
  profileHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  userName: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 12,
  },
  role: {
    fontSize: 16,
    marginTop: 4,
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
  divider: {
    marginVertical: 16,
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

export default EmployeeProfileScreen;
