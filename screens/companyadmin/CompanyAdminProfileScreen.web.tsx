import React, { useState, useEffect } from "react";
import { logDebug } from "../../utils/logger";
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
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import CustomSnackbar from "../../components/CustomSnackbar";
import { t } from "i18next";
import { initEmailService } from "../../utils/emailService";
import CustomLanguageSelector from "../../components/CustomLanguageSelector";
import HelpGuideModal from "../../components/HelpGuideModal";

// Add Shimmer component for loading states
interface ShimmerProps {
  width: number | string;
  height: number;
  style?: any;
}

const Shimmer: React.FC<ShimmerProps> = ({ width, height, style }) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: withRepeat(
            withSequence(
              withTiming(typeof width === "number" ? -width : -200, {
                duration: 800,
              }),
              withTiming(typeof width === "number" ? width : 200, {
                duration: 800,
              })
            ),
            -1
          ),
        },
      ],
    };
  });

  return (
    <View
      style={[
        {
          width,
          height,
          backgroundColor: "#E8E8E8",
          overflow: "hidden",
          borderRadius: 4,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            width: "100%",
            height: "100%",
            position: "absolute",
            backgroundColor: "transparent",
          },
          animatedStyle,
        ]}
      >
        <LinearGradient
          colors={["transparent", "rgba(255, 255, 255, 0.4)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: "100%", height: "100%" }}
        />
      </Animated.View>
    </View>
  );
};

// Add ResetPasswordModal interface after ShimmerProps
interface ResetPasswordModalProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
  loading: boolean;
  email: string;
}

// Add ResetPasswordModal component before CompanyAdminProfileScreen
const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  visible,
  onDismiss,
  onConfirm,
  loading,
  email,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const dimensions = useWindowDimensions();
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;
  const modalWidth = isLargeScreen ? 400 : isMediumScreen ? 360 : "90%";
  const modalPadding = isLargeScreen ? 32 : isMediumScreen ? 24 : 16;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.resetPasswordModal,
          {
            width: modalWidth,
            maxWidth: 400,
            alignSelf: "center",
          },
        ]}
      >
        <View
          style={[styles.resetPasswordModalContent, { padding: modalPadding }]}
        >
          <View style={styles.resetPasswordModalHeader}>
            <MaterialCommunityIcons
              name="lock-reset"
              size={32}
              color={theme.colors.primary}
            />
            <Text style={styles.resetPasswordModalTitle}>
              {t("superAdmin.profile.resetPassword")}
            </Text>
          </View>

          <Text style={styles.resetPasswordModalMessage}>
            {t("superAdmin.profile.resetPasswordConfirm", {
              email: email,
            }) ||
              `Are you sure you want to reset the password for ${email}? A password reset link will be sent to your email.`}
          </Text>

          <View style={styles.resetPasswordModalActions}>
            <Button
              mode="outlined"
              onPress={onDismiss}
              style={[styles.resetPasswordModalButton, styles.cancelButton]}
              labelStyle={[styles.resetPasswordModalButtonText]}
              disabled={loading}
            >
              {t("superAdmin.profile.cancel")}
            </Button>
            <Button
              mode="contained"
              onPress={onConfirm}
              style={[styles.resetPasswordModalButton, styles.confirmButton]}
              buttonColor={theme.colors.primary}
              labelStyle={[styles.resetPasswordModalButtonText]}
              loading={loading}
              disabled={loading}
            >
              {t("superAdmin.profile.sendResetLink")}
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
};

// Add DataExportModal interface after ResetPasswordModalProps
interface DataExportModalProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
  loading: boolean;
}

// Add DataExportModal component before CompanyAdminProfileScreen
const DataExportModal: React.FC<DataExportModalProps> = ({
  visible,
  onDismiss,
  onConfirm,
  loading,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const dimensions = useWindowDimensions();
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;
  const modalWidth = isLargeScreen ? 400 : isMediumScreen ? 360 : "90%";
  const modalPadding = isLargeScreen ? 32 : isMediumScreen ? 24 : 16;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.dataExportModal,
          {
            width: modalWidth,
            maxWidth: 400,
            alignSelf: "center",
          },
        ]}
      >
        <View
          style={[styles.dataExportModalContent, { padding: modalPadding }]}
        >
          <View style={styles.dataExportModalHeader}>
            <MaterialCommunityIcons
              name="file-document-outline"
              size={32}
              color={theme.colors.primary}
            />
            <Text style={styles.dataExportModalTitle}>
              {t("companyAdmin.profile.exportData") || "Export Your Data"}
            </Text>
          </View>

          <Text style={styles.dataExportModalMessage}>
            {t("companyAdmin.profile.exportDataDescription") ||
              "Your personal data and company information will be exported in a secure, readable text format. The export includes your profile information and account activity history."}
          </Text>

          <View style={styles.dataExportModalActions}>
            <Button
              mode="outlined"
              onPress={onDismiss}
              style={[styles.dataExportModalButton, styles.cancelButton]}
              labelStyle={[styles.dataExportModalButtonText]}
              disabled={loading}
            >
              {t("companyAdmin.profile.cancel")}
            </Button>
            <Button
              mode="contained"
              onPress={onConfirm}
              style={[styles.dataExportModalButton, styles.confirmButton]}
              buttonColor={theme.colors.primary}
              labelStyle={[styles.dataExportModalButtonText]}
              loading={loading}
              disabled={loading}
            >
              {t("companyAdmin.profile.downloadData") || "Download"}
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
};

// Add DeleteAccountModal interface after DataExportModalProps
interface DeleteAccountModalProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
  loading: boolean;
}

// Add DeleteVerificationModal interface
interface DeleteVerificationModalProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
  loading: boolean;
  verificationText: string;
  onVerificationTextChange: (text: string) => void;
}

// Add DeleteAccountModal component before CompanyAdminProfileScreen
const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  visible,
  onDismiss,
  onConfirm,
  loading,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const dimensions = useWindowDimensions();
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;
  const modalWidth = isLargeScreen ? 400 : isMediumScreen ? 360 : "90%";
  const modalPadding = isLargeScreen ? 32 : isMediumScreen ? 24 : 16;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.deleteAccountModal,
          {
            width: modalWidth,
            maxWidth: 400,
            alignSelf: "center",
          },
        ]}
      >
        <View
          style={[styles.deleteAccountModalContent, { padding: modalPadding }]}
        >
          <View style={styles.deleteAccountModalHeader}>
            <MaterialCommunityIcons
              name="alert-circle"
              size={32}
              color={theme.colors.error}
            />
            <Text style={styles.deleteAccountModalTitle}>
              {t("companyAdmin.profile.deleteAccount")}
            </Text>
          </View>

          <Text style={styles.deleteAccountModalMessage}>
            {t("companyAdmin.profile.deleteAccountWarning") ||
              "This action will permanently delete your account and all associated data. This cannot be undone. Please confirm if you wish to proceed."}
          </Text>

          <View style={styles.deleteAccountModalActions}>
            <Button
              mode="outlined"
              onPress={onDismiss}
              style={[styles.deleteAccountModalButton, styles.cancelButton]}
              labelStyle={[styles.deleteAccountModalButtonText]}
              disabled={loading}
            >
              {t("companyAdmin.profile.cancel")}
            </Button>
            <Button
              mode="contained"
              onPress={onConfirm}
              style={[styles.deleteAccountModalButton, styles.confirmButton]}
              buttonColor={theme.colors.error}
              labelStyle={[styles.deleteAccountModalButtonText]}
              loading={loading}
              disabled={loading}
            >
              {t("companyAdmin.profile.confirmDelete")}
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
};

// Add DeleteVerificationModal component
const DeleteVerificationModal: React.FC<DeleteVerificationModalProps> = ({
  visible,
  onDismiss,
  onConfirm,
  loading,
  verificationText,
  onVerificationTextChange,
}) => {
  const theme = useTheme();
  const styles = getStyles(theme);

  const isVerified = verificationText.toLowerCase() === "delete";

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={styles.deleteVerificationModal}
      >
        <View style={styles.deleteVerificationModalContent}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={40}
            color={theme.colors.error}
            style={styles.deleteVerificationIcon}
          />

          <Text style={styles.deleteVerificationTitle}>
            {t("companyAdmin.profile.finalDeleteConfirmation") ||
              "Final Confirmation Required"}
          </Text>

          <Text style={styles.deleteVerificationMessage}>
            {t("companyAdmin.profile.deleteVerificationMessage") ||
              "This action cannot be undone. This will permanently delete your account and remove all access to the system."}
          </Text>

          <TextInput
            value={verificationText}
            onChangeText={onVerificationTextChange}
            mode="outlined"
            label={
              t("companyAdmin.profile.deleteVerificationInstruction") ||
              "Please type 'delete' to confirm:"
            }
            style={styles.deleteVerificationInput}
            error={verificationText.length > 0 && !isVerified}
            disabled={loading}
            autoCapitalize="none"
            outlineStyle={{ borderRadius: 8 }}
          />

          <View style={styles.deleteVerificationActions}>
            <Button
              mode="outlined"
              onPress={onDismiss}
              style={[styles.deleteVerificationButton, styles.cancelButton]}
              labelStyle={styles.deleteVerificationButtonText}
              disabled={loading}
            >
              {t("companyAdmin.profile.cancel")}
            </Button>
            <Button
              mode="contained"
              onPress={onConfirm}
              style={[styles.deleteVerificationButton]}
              buttonColor={theme.colors.error}
              labelStyle={styles.deleteVerificationButtonText}
              loading={loading}
              disabled={loading || !isVerified}
            >
              {t("companyAdmin.profile.confirmDelete")}
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
};

const CompanyAdminProfileScreen = () => {
  const theme = useTheme();
  const { user, signOut, forgotPassword } = useAuth();
  const navigation = useNavigation();
  const dimensions = useWindowDimensions();
  const styles = getStyles(theme);

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
  const [resetPasswordModalVisible, setResetPasswordModalVisible] =
    useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [dataExportModalVisible, setDataExportModalVisible] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [advancedSettingsVisible, setAdvancedSettingsVisible] = useState(false);
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] =
    useState(false);
  const [deleteVerificationModalVisible, setDeleteVerificationModalVisible] =
    useState(false);
  const [deleteVerificationText, setDeleteVerificationText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);

  // Initialize email service
  useEffect(() => {
    initEmailService();
  }, []);

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

  const handleResetPasswordClick = () => {
    setResetPasswordModalVisible(true);
  };

  const handleResetPassword = async () => {
    try {
      if (!user?.email) {
        setSnackbarMessage(
          t("superAdmin.profile.emailRequired") || "Email is required"
        );
        setSnackbarVisible(true);
        return;
      }

      setResettingPassword(true);
      logDebug("Initiating password reset for email:", user.email);
      const { error } = await forgotPassword(user.email);

      if (error) {
        let errorMessage = error.message || t("forgotPassword.failedReset");
        let messageType = "error";

        // Handle specific error cases
        if (error.message?.includes("sender identity")) {
          errorMessage = t("forgotPassword.emailServiceError");
        } else if (error.message?.includes("rate limit")) {
          errorMessage = t("forgotPassword.tooManyAttempts");
          messageType = "warning";
        } else if (error.message?.includes("network")) {
          errorMessage = t("forgotPassword.networkError");
          messageType = "warning";
        }

        console.error("Password reset error:", error);
        setSnackbarMessage(errorMessage);
        setSnackbarVisible(true);
      } else {
        logDebug("Password reset request successful");
        setSnackbarMessage(
          t("forgotPassword.resetInstructions") ||
            "Password reset instructions have been sent to your email."
        );
        setSnackbarVisible(true);
      }
    } catch (err) {
      console.error("Unexpected error during password reset:", err);
      setSnackbarMessage(
        t("common.unexpectedError") || "An unexpected error occurred"
      );
      setSnackbarVisible(true);
    } finally {
      setResettingPassword(false);
      setResetPasswordModalVisible(false);
    }
  };

  // Add formatDate helper function
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  // Add formatActivityLog helper function
  const formatActivityLog = (log: any) => {
    return `- ${formatDate(log.created_at)}: ${log.description}`;
  };

  // Add handleDataExport function
  const handleDataExport = async () => {
    try {
      setExportingData(true);

      if (!user?.id) {
        throw new Error("User ID not found");
      }

      // First update the users table with current activity
      const { error: userUpdateError } = await supabase
        .from("users")
        .update({
          updated_at: new Date().toISOString(),
          last_login: new Date().toISOString(),
          status: "active",
        })
        .eq("id", user.id);

      if (userUpdateError) {
        throw userUpdateError;
      }

      // Log the export activity
      const { error: logError } = await supabase.from("activity_logs").insert({
        user_id: user.id,
        company_id: companyData?.id,
        activity_type: "data_export",
        description: "User data export requested",
        metadata: {
          timestamp: new Date().toISOString(),
          action: "export_initiated",
        },
      });

      if (logError) {
        console.error("Error logging activity:", logError);
      }

      // Fetch user data from both users and company_user tables, and activity logs
      const [userData, companyUserData, activityLogs] = await Promise.all([
        supabase.from("users").select("*").eq("id", user.id).single(),
        supabase
          .from("company_user")
          .select("*, company:company_id(*)")
          .eq("id", user.id)
          .single(),
        supabase
          .from("activity_logs")
          .select("*")
          .eq("user_id", user.id)
          .eq("company_id", companyData?.id)
          .order("created_at", { ascending: false }),
      ]);

      if (!userData.data || !companyUserData.data) {
        throw new Error("User data not found");
      }

      // Create a well-structured export
      const exportData = {
        exportInfo: {
          timestamp: new Date().toISOString(),
          version: "1.0",
          exportType: "company_user_data",
        },
        userData: {
          profile: {
            id: userData.data.id,
            first_name: companyUserData.data.first_name,
            last_name: companyUserData.data.last_name,
            email: companyUserData.data.email,
            role: companyUserData.data.role,
            phone_number: companyUserData.data.phone_number || "Not provided",
            created_at: formatDate(userData.data.created_at),
            updated_at: formatDate(userData.data.updated_at),
            last_login: userData.data.last_login
              ? formatDate(userData.data.last_login)
              : "Never",
            status: userData.data.status,
          },
          company: {
            id: companyUserData.data.company.id,
            name: companyUserData.data.company.company_name,
            registration: companyUserData.data.company.registration_number,
            industry: companyUserData.data.company.industry_type,
            contact_email: companyUserData.data.company.contact_email,
            contact_number: companyUserData.data.company.contact_number,
          },
        },
        activityHistory: {
          summary: {
            totalActivities: activityLogs.data?.length || 0,
            firstActivity: activityLogs.data?.[activityLogs.data.length - 1]
              ?.created_at
              ? formatDate(
                  activityLogs.data[activityLogs.data.length - 1].created_at
                )
              : "N/A",
            lastActivity: activityLogs.data?.[0]?.created_at
              ? formatDate(activityLogs.data[0].created_at)
              : "N/A",
          },
          activities: activityLogs.data?.map(formatActivityLog) || [],
        },
      };

      // Convert to a nicely formatted text
      const exportText = `
PERSONAL DATA EXPORT
==========================================
Generated: ${formatDate(new Date().toISOString())}
Export Version: ${exportData.exportInfo.version}
==========================================

1. PROFILE INFORMATION
------------------------------------------
User ID: ${exportData.userData.profile.id}
Name: ${exportData.userData.profile.first_name} ${exportData.userData.profile.last_name}
Email: ${exportData.userData.profile.email}
Role: ${exportData.userData.profile.role}
Phone: ${exportData.userData.profile.phone_number}
Account Created: ${exportData.userData.profile.created_at}
Last Updated: ${exportData.userData.profile.updated_at}
Last Login: ${exportData.userData.profile.last_login}
Account Status: ${exportData.userData.profile.status}

2. COMPANY INFORMATION
------------------------------------------
Company ID: ${exportData.userData.company.id}
Company Name: ${exportData.userData.company.name}
Registration Number: ${exportData.userData.company.registration}
Industry Type: ${exportData.userData.company.industry}
Contact Email: ${exportData.userData.company.contact_email}
Contact Number: ${exportData.userData.company.contact_number}

3. ACTIVITY HISTORY
------------------------------------------
Total Activities: ${exportData.activityHistory.summary.totalActivities}
First Activity: ${exportData.activityHistory.summary.firstActivity}
Last Activity: ${exportData.activityHistory.summary.lastActivity}

Detailed Activity Log:
${exportData.activityHistory.activities.join("\n")}

==========================================
`;

      // Create and download the text file
      const blob = new Blob([exportText], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      link.download = `company-data-export-${timestamp}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Log successful export
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        company_id: companyData?.id,
        activity_type: "data_export",
        description: "Data export completed successfully",
        metadata: {
          timestamp: new Date().toISOString(),
          action: "export_completed",
          exportVersion: exportData.exportInfo.version,
        },
      });

      setSnackbarMessage(
        t("companyAdmin.profile.exportSuccess") ||
          "Your data has been exported successfully"
      );
      setSnackbarVisible(true);
    } catch (error) {
      console.error("Error exporting data:", error);
      setSnackbarMessage(
        t("companyAdmin.profile.exportError") || "Failed to export data"
      );
      setSnackbarVisible(true);
    } finally {
      setExportingData(false);
      setDataExportModalVisible(false);
    }
  };

  // Add handleAccountDeletionConfirmation function
  const handleAccountDeletionConfirmation = () => {
    setDeleteVerificationModalVisible(true);
  };

  // Add handleDeleteVerification function
  const handleDeleteVerification = () => {
    if (deleteVerificationText.toLowerCase() === "delete") {
      setDeleteVerificationModalVisible(false);
      setDeleteAccountModalVisible(true);
    }
  };

  // Add handleDeleteAccount function
  const handleDeleteAccount = async () => {
    try {
      if (!user) return;

      setDeletingAccount(true);

      // 1. Log deletion request
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        company_id: companyData?.id,
        activity_type: "account_deletion",
        description: "Account deletion process initiated",
        metadata: {
          timestamp: new Date().toISOString(),
          action: "deletion_started",
        },
      });

      // 2. Export user data for compliance records
      const [userData, companyUserData, activityLogs] = await Promise.all([
        supabase.from("users").select("*").eq("id", user.id).single(),
        supabase.from("company_user").select("*").eq("id", user.id).single(),
        supabase.from("activity_logs").select("*").eq("user_id", user.id),
      ]);

      const complianceRecord = {
        userData: userData.data,
        companyUserData: companyUserData.data,
        activityLogs: activityLogs.data,
        deletionDate: new Date().toISOString(),
      };

      // 3. Store compliance record (you would typically store this in a secure location)
      logDebug("Compliance record created:", complianceRecord);

      // 4. Anonymize personal data in company_user table
      const { error: companyUserUpdateError } = await supabase
        .from("company_user")
        .update({
          first_name: "DELETED_USER",
          last_name: "DELETED_USER",
          email: `deleted_${user.id}@deleted.com`,
          phone_number: null,
          active_status: "deleted",
          deleted_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (companyUserUpdateError) throw companyUserUpdateError;

      // 5. Update user record
      const { error: userUpdateError } = await supabase
        .from("users")
        .update({
          email: `deleted_${user.id}@deleted.com`,
          deleted_at: new Date().toISOString(),
          status: "deleted",
        })
        .eq("id", user.id);

      if (userUpdateError) throw userUpdateError;

      // 6. Log successful deletion
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        company_id: companyData?.id,
        activity_type: "account_deletion",
        description: "Account successfully anonymized and deactivated",
        metadata: {
          timestamp: new Date().toISOString(),
          action: "deletion_completed",
        },
      });

      setSnackbarMessage(
        t("companyAdmin.profile.accountDeletedSuccess") ||
          "Account successfully deleted"
      );
      setSnackbarVisible(true);

      // 7. Sign out the user
      await signOut();
    } catch (error: any) {
      console.error("Error deleting account:", error);

      // Log the error
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        company_id: companyData?.id,
        activity_type: "system_error",
        description: "Account deletion failed",
        metadata: {
          timestamp: new Date().toISOString(),
          error: error.message,
          action: "deletion_failed",
        },
      });

      setSnackbarMessage(
        error.message || t("companyAdmin.profile.accountDeleteFailed")
      );
      setSnackbarVisible(true);
    } finally {
      setDeletingAccount(false);
      setDeleteAccountModalVisible(false);
    }
  };

  // Define help guide content
  const helpGuideSteps = [
    {
      title: "Personal Information",
      icon: "account-edit",
      description:
        "Update your personal details including first name, last name, and phone number. Your email address is displayed but cannot be modified for security reasons.",
    },
    {
      title: "Company Information",
      icon: "domain",
      description:
        "View your company details including company name, registration number, and industry type. This information is managed by system administrators.",
    },
    {
      title: "Account Settings",
      icon: "account-cog",
      description:
        "Manage your account settings including password reset, data export, and language preferences. Access advanced settings for additional options.",
    },
    {
      title: "Security Management",
      icon: "shield-account",
      description:
        "Reset your password and manage account security. Password reset links will be sent to your registered email address.",
    },
    {
      title: "Data Management",
      icon: "database-export",
      description:
        "Export your personal data and company information in a secure format. Downloaded data includes profile details and activity history.",
    },
  ];

  const helpGuideNote = {
    title: "Important Notes",
    content: [
      "Keep your personal information up to date for accurate communication",
      "Password reset links are valid for a limited time",
      "Exported data is provided in a secure, readable format",
      "Some settings may require additional verification",
      "Contact support if you need help with account management",
    ],
  };

  if (loading) {
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
                paddingHorizontal: isLargeScreen
                  ? 48
                  : isMediumScreen
                    ? 32
                    : 16,
              },
            ]}
          >
            <View style={styles.gridContainer}>
              {/* Profile Header Shimmer */}
              <Animated.View
                entering={FadeIn.delay(100)}
                style={[styles.profileSection]}
              >
                <Surface style={styles.profileCard}>
                  <View style={styles.profileHeader}>
                    <Shimmer
                      width={100}
                      height={100}
                      style={{ borderRadius: 50, marginBottom: 8 }}
                    />
                    <Shimmer
                      width={200}
                      height={24}
                      style={{ marginBottom: 4 }}
                    />
                    <Shimmer
                      width={180}
                      height={16}
                      style={{ marginBottom: 8 }}
                    />
                    <Shimmer
                      width={120}
                      height={28}
                      style={{ borderRadius: 20 }}
                    />
                  </View>
                </Surface>
              </Animated.View>

              <View style={styles.contentContainer}>
                <View style={styles.gridColumns}>
                  {/* Left Column */}
                  <View
                    style={[
                      styles.gridColumn,
                      {
                        flex: isLargeScreen ? 0.48 : isMediumScreen ? 0.48 : 1,
                      },
                    ]}
                  >
                    {/* Company Information Card Shimmer */}
                    <Animated.View entering={FadeIn.delay(200)}>
                      <Surface style={styles.detailsCard}>
                        <View style={styles.cardHeader}>
                          <View style={styles.headerLeft}>
                            <Shimmer
                              width={32}
                              height={32}
                              style={{ borderRadius: 8 }}
                            />
                            <Shimmer
                              width={150}
                              height={20}
                              style={{ marginLeft: 12 }}
                            />
                          </View>
                        </View>

                        <View style={styles.cardContent}>
                          <View style={styles.infoRow}>
                            <Shimmer
                              width={80}
                              height={16}
                              style={{ marginRight: 8 }}
                            />
                            <Shimmer width={160} height={16} />
                          </View>
                          <View style={styles.infoRow}>
                            <Shimmer
                              width={80}
                              height={16}
                              style={{ marginRight: 8 }}
                            />
                            <Shimmer width={140} height={16} />
                          </View>
                          <View style={styles.infoRow}>
                            <Shimmer
                              width={80}
                              height={16}
                              style={{ marginRight: 8 }}
                            />
                            <Shimmer width={120} height={16} />
                          </View>
                        </View>
                      </Surface>
                    </Animated.View>
                  </View>

                  {/* Right Column */}
                  <View
                    style={[
                      styles.gridColumn,
                      {
                        flex: isLargeScreen ? 0.48 : isMediumScreen ? 0.48 : 1,
                      },
                    ]}
                  >
                    {/* Personal Information Card Shimmer */}
                    <Animated.View entering={FadeIn.delay(300)}>
                      <Surface style={styles.detailsCard}>
                        <View style={styles.cardHeader}>
                          <View style={styles.headerLeft}>
                            <Shimmer
                              width={32}
                              height={32}
                              style={{ borderRadius: 8 }}
                            />
                            <Shimmer
                              width={150}
                              height={20}
                              style={{ marginLeft: 12 }}
                            />
                          </View>
                        </View>

                        <View style={styles.cardContent}>
                          <Shimmer
                            width="100%"
                            height={56}
                            style={{ marginBottom: 16, borderRadius: 12 }}
                          />
                          <Shimmer
                            width="100%"
                            height={56}
                            style={{ marginBottom: 16, borderRadius: 12 }}
                          />
                          <Shimmer
                            width="100%"
                            height={56}
                            style={{ marginBottom: 16, borderRadius: 12 }}
                          />
                          <Shimmer
                            width="100%"
                            height={40}
                            style={{ borderRadius: 12 }}
                          />
                        </View>
                      </Surface>
                    </Animated.View>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.backgroundSecondary }]}
    >
      <AppHeader
        title="Profile"
        subtitle="Manage your account"
        showBackButton={false}
        showHelpButton={true}
        onHelpPress={() => setHelpModalVisible(true)}
        showLogo={false}
      />

      <HelpGuideModal
        visible={helpModalVisible}
        onDismiss={() => setHelpModalVisible(false)}
        title="Profile Management Guide"
        description="Learn how to manage your profile settings and account preferences effectively."
        steps={helpGuideSteps}
        note={helpGuideNote}
        buttonLabel="Got it"
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
              style={[styles.profileSection]}
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
                    <Surface
                      style={[styles.detailsCard, { marginBottom: 15 }]}
                      elevation={1}
                    >
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
                </View>

                {/* Right Column */}
                <View
                  style={[
                    styles.gridColumn,
                    { flex: isLargeScreen ? 0.48 : isMediumScreen ? 0.48 : 1 },
                  ]}
                >
                  {/* Account Settings Card */}
                  <Animated.View entering={FadeIn.delay(400)}>
                    <Surface style={styles.detailsCard}>
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
                          onPress={handleResetPasswordClick}
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
                        <Divider style={styles.divider} />

                        <TouchableOpacity
                          style={styles.settingItem}
                          onPress={() => setDataExportModalVisible(true)}
                        >
                          <View style={styles.settingItemContent}>
                            <MaterialCommunityIcons
                              name="database-export"
                              size={24}
                              color={theme.colors.primary}
                            />
                            <Text variant="medium" style={styles.settingText}>
                              Export Data
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
                          onPress={() =>
                            setAdvancedSettingsVisible(!advancedSettingsVisible)
                          }
                        >
                          <View style={styles.settingItemContent}>
                            <MaterialCommunityIcons
                              name="cog"
                              size={24}
                              color="#64748b"
                            />
                            <Text variant="medium" style={styles.settingText}>
                              Advanced Settings
                            </Text>
                          </View>
                          <MaterialCommunityIcons
                            name={
                              advancedSettingsVisible
                                ? "chevron-up"
                                : "chevron-down"
                            }
                            size={24}
                            color="#999"
                          />
                        </TouchableOpacity>

                        {advancedSettingsVisible && (
                          <View style={styles.advancedSettingsContainer}>
                            <TouchableOpacity
                              style={[
                                styles.settingItem,
                                styles.dangerSettingItem,
                              ]}
                              onPress={handleAccountDeletionConfirmation}
                            >
                              <View style={styles.settingItemContent}>
                                <MaterialCommunityIcons
                                  name="delete-outline"
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
                                  Delete Account
                                </Text>
                              </View>
                              <MaterialCommunityIcons
                                name="chevron-right"
                                size={24}
                                color={theme.colors.error}
                              />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </Surface>
                  </Animated.View>
                  <Animated.View
                    entering={FadeIn.delay(200)}
                    style={{ marginTop: 16 }}
                  >
                    <Surface style={styles.detailsCard}>
                      <View style={styles.cardContent}>
                        <View style={styles.settingItem}>
                          <View style={styles.settingItemContent}>
                            <MaterialCommunityIcons
                              name="translate"
                              size={24}
                              color="rgba(54,105,157,255)"
                            />
                            <Text variant="medium" style={styles.settingText}>
                              {t("superAdmin.profile.language")}
                            </Text>
                          </View>
                          <View style={styles.languageSelectorContainer}>
                            <CustomLanguageSelector compact={true} />
                          </View>
                        </View>
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
      <ResetPasswordModal
        visible={resetPasswordModalVisible}
        onDismiss={() => setResetPasswordModalVisible(false)}
        onConfirm={handleResetPassword}
        loading={resettingPassword}
        email={user?.email || ""}
      />
      <DataExportModal
        visible={dataExportModalVisible}
        onDismiss={() => setDataExportModalVisible(false)}
        onConfirm={handleDataExport}
        loading={exportingData}
      />
      <DeleteAccountModal
        visible={deleteAccountModalVisible}
        onDismiss={() => setDeleteAccountModalVisible(false)}
        onConfirm={handleDeleteAccount}
        loading={deletingAccount}
      />
      <DeleteVerificationModal
        visible={deleteVerificationModalVisible}
        onDismiss={() => {
          setDeleteVerificationModalVisible(false);
          setDeleteVerificationText("");
        }}
        onConfirm={handleDeleteVerification}
        loading={deletingAccount}
        verificationText={deleteVerificationText}
        onVerificationTextChange={setDeleteVerificationText}
      />
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

const getStyles = (theme: any) =>
  StyleSheet.create({
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
    languageSelectorContainer: {
      marginLeft: "auto",
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
    resetPasswordModal: {
      backgroundColor: "white",
      borderRadius: 16,
      elevation: 5,
      overflow: "hidden",
    },
    resetPasswordModalContent: {
      alignItems: "center",
    },
    resetPasswordModalHeader: {
      alignItems: "center",
      marginBottom: 16,
    },
    resetPasswordModalTitle: {
      fontSize: 20,
      fontFamily: "Poppins-SemiBold",
      color: "#1e293b",
      marginTop: 16,
      textAlign: "center",
    },
    resetPasswordModalMessage: {
      fontSize: 16,
      fontFamily: "Poppins-Regular",
      color: "#64748b",
      textAlign: "center",
      marginBottom: 24,
      lineHeight: 24,
    },
    resetPasswordModalActions: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 12,
      marginTop: 8,
    },
    resetPasswordModalButton: {
      borderRadius: 8,
      minWidth: 100,
    },
    resetPasswordModalButtonText: {
      fontFamily: "Poppins-Medium",
      fontSize: 14,
    },
    dataExportModal: {
      backgroundColor: "white",
      borderRadius: 16,
      elevation: 5,
      overflow: "hidden",
    },
    dataExportModalContent: {
      alignItems: "center",
    },
    dataExportModalHeader: {
      alignItems: "center",
      marginBottom: 16,
    },
    dataExportModalTitle: {
      fontSize: 20,
      fontFamily: "Poppins-SemiBold",
      color: "#1e293b",
      marginTop: 16,
      textAlign: "center",
    },
    dataExportModalMessage: {
      fontSize: 16,
      fontFamily: "Poppins-Regular",
      color: "#64748b",
      textAlign: "center",
      marginBottom: 24,
      lineHeight: 24,
    },
    dataExportModalActions: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 12,
      marginTop: 8,
    },
    dataExportModalButton: {
      borderRadius: 8,
      minWidth: 100,
    },
    dataExportModalButtonText: {
      fontFamily: "Poppins-Medium",
      fontSize: 14,
    },
    advancedSettingsContainer: {
      backgroundColor: "#fafafa",
      borderRadius: 8,
      marginTop: 8,
      borderWidth: 1,
      borderColor: "#e2e8f0",
    },
    deleteAccountModal: {
      backgroundColor: "white",
      borderRadius: 16,
      elevation: 5,
      overflow: "hidden",
    },
    deleteAccountModalContent: {
      alignItems: "center",
    },
    deleteAccountModalHeader: {
      alignItems: "center",
      marginBottom: 16,
    },
    deleteAccountModalTitle: {
      fontSize: 20,
      fontFamily: "Poppins-SemiBold",
      color: "#1e293b",
      marginTop: 16,
      textAlign: "center",
    },
    deleteAccountModalMessage: {
      fontSize: 16,
      fontFamily: "Poppins-Regular",
      color: "#64748b",
      textAlign: "center",
      marginBottom: 24,
      lineHeight: 24,
    },
    deleteAccountModalActions: {
      flexDirection: "row",
      justifyContent: "center",
      gap: 12,
      marginTop: 8,
    },
    deleteAccountModalButton: {
      borderRadius: 8,
      minWidth: 100,
    },
    deleteAccountModalButtonText: {
      fontFamily: "Poppins-Medium",
      fontSize: 14,
    },
    deleteVerificationModal: {
      backgroundColor: "white",
      borderRadius: 16,
      padding: 24,
      margin: 16,
      maxWidth: 400,
      alignSelf: "center",
    },
    deleteVerificationModalContent: {
      alignItems: "center",
    },
    deleteVerificationIcon: {
      marginBottom: 16,
    },
    deleteVerificationTitle: {
      fontSize: 20,
      fontFamily: "Poppins-SemiBold",
      color: "#1e293b",
      marginBottom: 16,
      textAlign: "center",
    },
    deleteVerificationMessage: {
      fontSize: 16,
      fontFamily: "Poppins-Regular",
      color: "#64748b",
      textAlign: "center",
      marginBottom: 24,
      lineHeight: 24,
    },
    deleteVerificationInput: {
      width: "100%",
      marginBottom: 24,
    },
    deleteVerificationActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
      width: "100%",
    },
    deleteVerificationButton: {
      minWidth: 100,
    },
    deleteVerificationButtonText: {
      fontFamily: "Poppins-Medium",
      fontSize: 14,
    },
    dangerSettingItem: {
      backgroundColor: "#fff1f2",
      padding: 16,
    },
  });

export default CompanyAdminProfileScreen;
