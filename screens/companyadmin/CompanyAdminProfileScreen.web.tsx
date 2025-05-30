import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import {
  TextInput,
  Button,
  Avatar,
  useTheme,
  Divider,
  Snackbar,
  IconButton,
  Surface,
  Portal,
  Modal,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import Text from "../../components/Text";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";

const CompanyAdminProfileScreen = () => {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const navigation = useNavigation();
  const dimensions = useWindowDimensions();

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [adminData, setAdminData] = useState<any>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);

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
    if (Platform.OS === "web") {
      // For web, show modal dialog
      setSignOutModalVisible(true);
    } else {
      // For mobile, show alert dialog
      Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          onPress: performSignOut,
        },
      ]);
    }
  };

  const performSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
      setSnackbarMessage("Failed to sign out");
      setSnackbarVisible(true);
    } finally {
      setSignOutModalVisible(false);
    }
  };

  const getInitials = () => {
    if (!firstName && !lastName)
      return user?.email?.charAt(0).toUpperCase() || "?";

    return (
      (firstName ? firstName.charAt(0).toUpperCase() : "") +
      (lastName ? lastName.charAt(0).toUpperCase() : "")
    );
  };

  // Add the sign out confirmation modal component
  const renderSignOutModal = () => {
    const modalWidth = isLargeScreen ? 400 : isMediumScreen ? 360 : "90%";
    const modalPadding = isLargeScreen ? 32 : isMediumScreen ? 24 : 16;

    return (
      <Portal>
        <Modal
          visible={signOutModalVisible}
          onDismiss={() => setSignOutModalVisible(false)}
          contentContainerStyle={[
            styles.signOutModal,
            {
              width: modalWidth,
              maxWidth: 400,
              alignSelf: "center",
            },
          ]}
        >
          <View style={[styles.signOutModalContent, { padding: modalPadding }]}>
            <View style={styles.signOutModalHeader}>
              <MaterialCommunityIcons
                name="logout"
                size={32}
                color={theme.colors.error}
              />
              <Text style={styles.signOutModalTitle}>Sign Out</Text>
            </View>

            <Text style={styles.signOutModalMessage}>
              Are you sure you want to sign out?
            </Text>

            <View style={styles.signOutModalActions}>
              <Button
                mode="outlined"
                onPress={() => setSignOutModalVisible(false)}
                style={[styles.signOutModalButton, styles.cancelButton]}
                labelStyle={[
                  styles.signOutModalButtonText,
                  { fontSize: isLargeScreen ? 16 : 14 },
                ]}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={performSignOut}
                style={[styles.signOutModalButton, styles.confirmButton]}
                buttonColor={theme.colors.error}
                labelStyle={[
                  styles.signOutModalButtonText,
                  { fontSize: isLargeScreen ? 16 : 14 },
                ]}
              >
                Sign Out
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>
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
        subtitle="Manage your account"
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
          contentContainerStyle={[
            styles.scrollContent,
            {
              maxWidth: isLargeScreen ? 1400 : isMediumScreen ? 1100 : "100%",
              paddingHorizontal: isLargeScreen ? 48 : isMediumScreen ? 32 : 16,
            },
          ]}
        >
          <View style={styles.gridContainer}>
            {/* Profile Header */}
            <Animated.View
              entering={FadeIn.delay(100)}
              style={[
                styles.profileSection,
                
              ]}
            >
              <Surface style={styles.profileCard}>
                <View style={styles.profileHeader}>
                  <Avatar.Text
                    size={100}
                    label={getInitials()}
                    style={styles.avatar}
                  />
                  <Text variant="bold" style={styles.userName}>
                    {`${firstName} ${lastName}` || "Company Admin"}
                  </Text>
                  <Text variant="medium" style={styles.userEmail}>
                    {adminData?.email}
                  </Text>
                  <View style={styles.roleBadge}>
                    <Text variant="medium" style={styles.roleText}>
                      Company Admin
                    </Text>
                  </View>
                </View>
              </Surface>
            </Animated.View>

            <View style={styles.contentContainer}>
              <View style={styles.gridColumns}>
                {/* Left Column */}
                <View
                  style={[
                    styles.gridColumn,
                    { flex: isLargeScreen ? 0.48 : isMediumScreen ? 0.48 : 1 },
                  ]}
                >
                  {/* Company Information Card */}
                  <Animated.View entering={FadeIn.delay(200)}>
                    <Surface style={styles.detailsCard}>
                      <View style={styles.cardHeader}>
                        <View style={styles.headerLeft}>
                          <View style={styles.iconContainer}>
                            <IconButton
                              icon="domain"
                              size={20}
                              iconColor="#64748b"
                              style={styles.headerIcon}
                            />
                          </View>
                          <Text style={styles.cardTitle}>
                            Company Information
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardContent}>
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
                      </View>
                    </Surface>
                  </Animated.View>
                </View>

                {/* Right Column */}
                <View
                  style={[
                    styles.gridColumn,
                    { flex: isLargeScreen ? 0.48 : isMediumScreen ? 0.48 : 1 },
                  ]}
                >
                  {/* Personal Information Card */}
                  <Animated.View entering={FadeIn.delay(300)}>
                    <Surface style={styles.detailsCard}>
                      <View style={styles.cardHeader}>
                        <View style={styles.headerLeft}>
                          <View style={styles.iconContainer}>
                            <IconButton
                              icon="account-edit"
                              size={20}
                              iconColor="#64748b"
                              style={styles.headerIcon}
                            />
                          </View>
                          <Text style={styles.cardTitle}>
                            Personal Information
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardContent}>
                        <TextInput
                          label="First Name"
                          value={firstName}
                          onChangeText={setFirstName}
                          mode="outlined"
                          style={styles.input}
                          disabled={updating}
                          outlineStyle={{ borderRadius: 12 }}
                          theme={{
                            colors: { primary: "rgba(54,105,157,255)" },
                            fonts: {
                              regular: { fontFamily: "Poppins-Regular" },
                            },
                          }}
                        />

                        <TextInput
                          label="Last Name"
                          value={lastName}
                          onChangeText={setLastName}
                          mode="outlined"
                          style={styles.input}
                          disabled={updating}
                          outlineStyle={{ borderRadius: 12 }}
                          theme={{
                            colors: { primary: "rgba(54,105,157,255)" },
                            fonts: {
                              regular: { fontFamily: "Poppins-Regular" },
                            },
                          }}
                        />

                        <TextInput
                          label="Email"
                          value={adminData?.email || ""}
                          mode="outlined"
                          style={styles.input}
                          disabled={true}
                          outlineStyle={{ borderRadius: 12 }}
                          right={<TextInput.Icon icon="email-lock" />}
                          theme={{
                            colors: { primary: "rgba(54,105,157,255)" },
                            fonts: {
                              regular: { fontFamily: "Poppins-Regular" },
                            },
                          }}
                        />

                        <TextInput
                          label="Phone Number"
                          value={phoneNumber}
                          onChangeText={setPhoneNumber}
                          mode="outlined"
                          style={styles.input}
                          keyboardType="phone-pad"
                          disabled={updating}
                          outlineStyle={{ borderRadius: 12 }}
                          theme={{
                            colors: { primary: "rgba(54,105,157,255)" },
                            fonts: {
                              regular: { fontFamily: "Poppins-Regular" },
                            },
                          }}
                        />

                        <Button
                          mode="contained"
                          onPress={handleUpdateProfile}
                          style={styles.updateButton}
                          buttonColor="rgba(54,105,157,255)"
                          loading={updating}
                          disabled={updating}
                          labelStyle={{ fontFamily: "Poppins-Medium" }}
                        >
                          Update Profile
                        </Button>
                      </View>
                    </Surface>
                  </Animated.View>

                  {/* Account Settings Card */}
                  <Animated.View entering={FadeIn.delay(400)}>
                    <Surface style={[styles.detailsCard, { marginTop: 24 }]}>
                      <View style={styles.cardHeader}>
                        <View style={styles.headerLeft}>
                          <View style={styles.iconContainer}>
                            <IconButton
                              icon="account-cog"
                              size={20}
                              iconColor="#64748b"
                              style={styles.headerIcon}
                            />
                          </View>
                          <Text style={styles.cardTitle}>Account Settings</Text>
                        </View>
                      </View>

                      <View style={styles.cardContent}>
                        <TouchableOpacity
                          style={styles.settingItem}
                          onPress={() => {
                            setSnackbarMessage(
                              "Password reset link sent to your email"
                            );
                            setSnackbarVisible(true);
                          }}
                        >
                          <View style={styles.settingItemContent}>
                            <MaterialCommunityIcons
                              name="lock-reset"
                              size={24}
                              color="rgba(54,105,157,255)"
                            />
                            <Text variant="medium" style={styles.settingText}>
                              Reset Password
                            </Text>
                          </View>
                          <MaterialCommunityIcons
                            name="chevron-right"
                            size={24}
                            color="#999"
                          />
                        </TouchableOpacity>

                        <Divider style={styles.divider} />

                        <TouchableOpacity
                          style={styles.settingItem}
                          onPress={handleSignOut}
                        >
                          <View style={styles.settingItemContent}>
                            <MaterialCommunityIcons
                              name="logout"
                              size={24}
                              color={theme.colors.error}
                            />
                            <Text
                              variant="medium"
                              style={[
                                styles.settingText,
                                { color: theme.colors.error },
                              ]}
                            >
                              Sign Out
                            </Text>
                          </View>
                          <MaterialCommunityIcons
                            name="chevron-right"
                            size={24}
                            color="#999"
                          />
                        </TouchableOpacity>
                      </View>
                    </Surface>
                  </Animated.View>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {renderSignOutModal()}
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
    paddingBottom: 40,
    maxWidth: 1200,
    alignSelf: "center",
    width: "100%",
  },
  gridContainer: {
    flexDirection: "column",
    gap: 16,
  },
  profileSection: {
    width: "100%",
    marginBottom: 16,
  },
  profileCard: {
    borderRadius: 12,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "rgba(0,0,0,0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginTop: 16,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 20,
    position: "relative",
  },
  avatar: {
    borderWidth: 4,
    borderColor: "#fff",
    backgroundColor: "rgba(54,105,157,255)",
    marginBottom: 8,
  },
  userName: {
    fontSize: 20,
    color: "#1e293b",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: "#ffffff",
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(54,105,157,255)",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  roleText: {
    fontSize: 13,
    color: "rgba(54,105,157,255)",
  },
  contentContainer: {
    flex: 1,
  },
  gridColumns: {
    flexDirection: "row",
    gap: 16,
    flexWrap: "wrap",
  },
  gridColumn: {
    minWidth: 320,
    flex: 1,
  },
  detailsCard: {
    borderRadius: 12,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "rgba(0,0,0,0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerIcon: {
    margin: 0,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1e293b",
    fontFamily: "Poppins-SemiBold",
  },
  cardContent: {
    padding: 20,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 12,
  },
  infoLabel: {
    fontFamily: "Poppins-Medium",
    width: 100,
    color: "#64748b",
    fontSize: 13,
  },
  infoValue: {
    flex: 1,
    fontFamily: "Poppins-Regular",
    color: "#1e293b",
    fontSize: 13,
  },
  input: {
    marginBottom: 16,
    backgroundColor: "#fff",
    height: 40,
  },
  updateButton: {
    marginTop: 8,
    borderRadius: 8,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  settingItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  settingText: {
    fontSize: 14,
    color: "#1e293b",
  },
  divider: {
    height: 1,
    backgroundColor: "#e2e8f0",
  },
  signOutModal: {
    backgroundColor: "white",
    borderRadius: 16,
    elevation: 5,
    overflow: "hidden",
  },
  signOutModalContent: {
    alignItems: "center",
  },
  signOutModalHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  signOutModalTitle: {
    fontSize: 20,
    fontFamily: "Poppins-SemiBold",
    color: "#1e293b",
    marginTop: 16,
    textAlign: "center",
  },
  signOutModalMessage: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#64748b",
    textAlign: "center",
    marginBottom: 24,
  },
  signOutModalActions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginTop: 8,
  },
  signOutModalButton: {
    borderRadius: 8,
    minWidth: 100,
  },
  signOutModalButtonText: {
    fontFamily: "Poppins-Medium",
  },
  cancelButton: {
    borderColor: "#e2e8f0",
  },
  confirmButton: {
    borderWidth: 0,
  },
});

export default CompanyAdminProfileScreen;
