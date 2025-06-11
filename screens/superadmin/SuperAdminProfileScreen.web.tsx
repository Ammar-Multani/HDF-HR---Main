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
  StatusBar,
} from "react-native";
import {
  TextInput,
  Button,
  Avatar,
  useTheme,
  Divider,
  Snackbar,
  Card,
  IconButton,
  Surface,
  Portal,
  Modal,
  Switch,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import Text from "../../components/Text";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../contexts/LanguageContext";
import CustomLanguageSelector from "../../components/CustomLanguageSelector";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import CustomSnackbar from "../../components/CustomSnackbar";
import { initEmailService } from "../../utils/emailService";

// Add Shimmer component for loading states
interface ShimmerProps {
  width: number | string;
  height: number;
  style?: any;
}

const Shimmer: React.FC<ShimmerProps> = ({ width, height, style }) => {
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

// Add these new interfaces after the ShimmerProps interface
interface DeleteAccountModalProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
  loading: boolean;
}

// Add this new interface after the DeleteAccountModalProps interface
interface ResetPasswordModalProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
  loading: boolean;
  email: string;
}

// Add this new interface after the ResetPasswordModalProps interface
interface DataExportModalProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
  loading: boolean;
}

// Add this new interface for delete verification modal
interface DeleteVerificationModalProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
  loading: boolean;
  verificationText: string;
  onVerificationTextChange: (text: string) => void;
}

// Add interfaces for activity logs and admin data
interface ActivityLog {
  id: string;
  user_id: string;
  activity_type: string;
  description: string;
  metadata: {
    timestamp: string;
    action: string;
    error?: string;
  };
  created_at: string;
}

interface AdminData {
  id: string;
  name: string;
  email: string;
  role: string;
  updated_at: string;
  phone_number?: string | null;
}

// Move styles definition before components
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
      marginBottom: 24,
    },
    profileCard: {
      borderRadius: 16,
      overflow: "hidden",
      elevation: 1,
      shadowColor: "rgba(0,0,0,0.1)",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "#e2e8f0",
      marginTop: 24,
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
      marginBottom: 16,
    },
    userName: {
      fontSize: 24,
      color: "#1e293b",
      marginBottom: 8,
    },
    userEmail: {
      fontSize: 16,
      color: "#64748b",
      marginBottom: 16,
    },
    roleBadge: {
      backgroundColor: "#ffffff",
      paddingVertical: 6,
      paddingHorizontal: 16,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "rgba(54,105,157,255)",
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
    },
    roleText: {
      fontSize: 14,
      color: "rgba(54,105,157,255)",
    },
    contentContainer: {
      flex: 1,
    },
    gridColumns: {
      flexDirection: "row",
      gap: 24,
      flexWrap: "wrap",
    },
    gridColumn: {
      minWidth: 320,
      flex: 1,
    },
    detailsCard: {
      borderRadius: 16,
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
      fontSize: 16,
      fontWeight: "600",
      color: "#1e293b",
      fontFamily: "Poppins-SemiBold",
    },
    cardContent: {
      padding: 24,
    },
    input: {
      marginBottom: 16,
      backgroundColor: "#fff",
    },
    updateButton: {
      marginTop: 8,
      borderRadius: 12,
      paddingVertical: 4,
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
      fontSize: 16,
      color: "#1e293b",
    },
    divider: {
      height: 1,
      backgroundColor: "#e2e8f0",
    },
    languageSelectorContainer: {
      marginLeft: "auto",
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
    dangerZoneCard: {
      marginTop: 24,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "#fecaca",
      backgroundColor: "#fff1f2",
    },
    dangerZoneHeader: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: "#fecaca",
    },
    dangerZoneHeaderLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
    },
    dangerZoneTitle: {
      fontSize: 18,
      fontFamily: "Poppins-SemiBold",
      color: theme.colors.error,
    },
    dangerZoneContent: {
      padding: 16,
    },
    dangerZoneDescription: {
      fontSize: 14,
      fontFamily: "Poppins-Regular",
      color: "#64748b",
      marginBottom: 16,
    },
    dangerZoneItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 16,
      backgroundColor: "#fff",
      borderRadius: 8,
      borderWidth: 1,
      borderColor: "#fecaca",
    },
    dangerZoneItemContent: {
      flex: 1,
      marginRight: 16,
    },
    dangerZoneItemTitle: {
      fontSize: 16,
      fontFamily: "Poppins-Medium",
      color: "#1e293b",
      marginBottom: 4,
    },
    dangerZoneItemDescription: {
      fontSize: 14,
      fontFamily: "Poppins-Regular",
      color: "#64748b",
    },
    dangerZoneButton: {
      borderColor: theme.colors.error,
    },
    dangerZoneButtonText: {
      fontSize: 14,
      fontFamily: "Poppins-Medium",
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
    deleteVerificationInstruction: {
      fontSize: 14,
      fontFamily: "Poppins-Medium",
      color: "#1e293b",
      marginBottom: 8,
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
    advancedSettingsContainer: {
      backgroundColor: "#fafafa",
      borderRadius: 8,
      marginTop: 8,
      borderWidth: 1,
      borderColor: "#e2e8f0",
    },
    dangerSettingItem: {
      backgroundColor: "#fff1f2",
      padding: 16,
    },
  });

// Add this new component before the SuperAdminProfileScreen component
const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({
  visible,
  onDismiss,
  onConfirm,
  loading,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const dimensions = useWindowDimensions();
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;
  const modalWidth = isLargeScreen ? 400 : isMediumScreen ? 360 : "90%";
  const modalPadding = isLargeScreen ? 32 : isMediumScreen ? 24 : 16;
  const styles = getStyles(theme);

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
              {t("superAdmin.profile.deleteAccount")}
            </Text>
          </View>

          <Text style={styles.deleteAccountModalMessage}>
            {t("superAdmin.profile.deleteAccountWarning") ||
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
              {t("superAdmin.profile.cancel")}
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
              {t("superAdmin.profile.confirmDelete")}
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
};

// Add this new component before the SuperAdminProfileScreen component
const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  visible,
  onDismiss,
  onConfirm,
  loading,
  email,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const dimensions = useWindowDimensions();
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;
  const modalWidth = isLargeScreen ? 400 : isMediumScreen ? 360 : "90%";
  const modalPadding = isLargeScreen ? 32 : isMediumScreen ? 24 : 16;
  const styles = getStyles(theme);

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

// Add the DataExportModal component
const DataExportModal: React.FC<DataExportModalProps> = ({
  visible,
  onDismiss,
  onConfirm,
  loading,
}) => {
  const theme = useTheme();
  const { t } = useTranslation();
  const dimensions = useWindowDimensions();
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;
  const modalWidth = isLargeScreen ? 400 : isMediumScreen ? 360 : "90%";
  const modalPadding = isLargeScreen ? 32 : isMediumScreen ? 24 : 16;
  const styles = getStyles(theme);

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
              {t("superAdmin.profile.exportData") || "Export Your Data"}
            </Text>
          </View>

          <Text style={styles.dataExportModalMessage}>
            {t("superAdmin.profile.exportDataDescription") ||
              "Your personal data will be exported in a secure, readable text format. The export includes your profile information and account activity history."}
          </Text>

          <View style={styles.dataExportModalActions}>
            <Button
              mode="outlined"
              onPress={onDismiss}
              style={[styles.dataExportModalButton, styles.cancelButton]}
              labelStyle={[styles.dataExportModalButtonText]}
              disabled={loading}
            >
              {t("superAdmin.profile.cancel")}
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
              {t("superAdmin.profile.downloadData") || "Download"}
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
  const { t } = useTranslation();
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
            {t("superAdmin.profile.finalDeleteConfirmation") ||
              "Final Confirmation Required"}
          </Text>

          <Text style={styles.deleteVerificationMessage}>
            {t("superAdmin.profile.deleteVerificationMessage") ||
              "This action cannot be undone. This will permanently delete your account and remove all access to the system."}
          </Text>

          <TextInput
            value={verificationText}
            onChangeText={onVerificationTextChange}
            mode="outlined"
            label={
              t("superAdmin.profile.deleteVerificationInstruction") ||
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
              {t("superAdmin.profile.cancel")}
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
              {t("superAdmin.profile.confirmDelete")}
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
};

const SuperAdminProfileScreen = () => {
  const theme = useTheme();
  const { user, signOut, forgotPassword } = useAuth();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const dimensions = useWindowDimensions();
  const styles = getStyles(theme);

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

  // Helper functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatActivityLog = (log: ActivityLog) => {
    return `- ${formatDate(log.created_at)}: ${log.description}`;
  };

  // State management
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [adminData, setAdminData] = useState<AdminData | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] =
    useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [resetPasswordModalVisible, setResetPasswordModalVisible] =
    useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [dataExportModalVisible, setDataExportModalVisible] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [deleteVerificationModalVisible, setDeleteVerificationModalVisible] =
    useState(false);
  const [deleteVerificationText, setDeleteVerificationText] = useState("");
  const [advancedSettingsVisible, setAdvancedSettingsVisible] = useState(false);

  // Gradient colors used across the app
  const gradientColors = [
    "rgba(6,169,169,255)",
    "rgba(38,127,161,255)",
    "rgba(54,105,157,255)",
    "rgba(74,78,153,255)",
    "rgba(94,52,149,255)",
  ] as const;

  const fetchAdminData = async () => {
    try {
      setLoading(true);

      if (!user) return;

      const { data, error } = await supabase
        .from("admin")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching admin data:", error);
        return;
      }

      setAdminData(data);
      setName(data.name || "");
      setEmail(data.email || "");
      setPhoneNumber(data.phone_number || "");
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [user]);

  // Initialize email service
  useEffect(() => {
    initEmailService();
  }, []);

  const handleUpdateProfile = async () => {
    setUpdating(true);
    try {
      const { data: adminData, error: adminError } = await supabase
        .from("admin")
        .select("*")
        .eq("id", user.id)
        .single();

      if (!adminData || adminError) {
        console.error("Error fetching admin data:", adminError);
        setSnackbarMessage("Error updating profile: Admin data not found");
        setSnackbarVisible(true);
        setUpdating(false);
        return;
      }

      const currentAdminData: AdminData = {
        id: adminData.id,
        name: adminData.name,
        email: adminData.email,
        role: adminData.role || "admin",
        updated_at: adminData.updated_at,
        phone_number: adminData.phone_number,
      };

      // Update the admin data with new values
      const { error } = await supabase
        .from("admin")
        .update({
          name: name,
          phone_number: phoneNumber,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      // Log the activity with the correct structure
      const activityLogData = {
        user_id: user.id,
        activity_type: "UPDATE_PROFILE",
        description: `Profile updated by ${currentAdminData.name} (${currentAdminData.email})`,
        company_id: null, // Super admin profiles are not associated with a company
        metadata: {
          timestamp: new Date().toISOString(),
          action: "profile_update",
          requester: {
            id: user.id,
            name: currentAdminData.name,
            email: currentAdminData.email,
            role: currentAdminData.role,
          },
        },
        old_value: {
          id: currentAdminData.id,
          name: currentAdminData.name,
          email: currentAdminData.email,
          role: currentAdminData.role,
          updated_at: currentAdminData.updated_at,
          phone_number: currentAdminData.phone_number || null,
        },
        new_value: {
          id: currentAdminData.id,
          name: name,
          email: currentAdminData.email,
          role: currentAdminData.role,
          updated_at: new Date().toISOString(),
          phone_number: phoneNumber || null,
        },
      };

      const { error: logError } = await supabase
        .from("activity_logs")
        .insert([activityLogData]);

      if (logError) {
        console.error("Error logging activity:", logError);
      }

      setSnackbarMessage(t("superAdmin.profile.updateSuccess"));
      setSnackbarVisible(true);

      // Refresh admin data
      fetchAdminData();
    } catch (error: any) {
      console.error("Error updating profile:", error);
      setSnackbarMessage(error.message || t("superAdmin.profile.updateFailed"));
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
      Alert.alert(
        t("superAdmin.profile.signOut"),
        t("superAdmin.profile.confirmSignOut"),
        [
          {
            text: t("superAdmin.profile.cancel"),
            style: "cancel",
          },
          {
            text: t("superAdmin.profile.signOut"),
            onPress: performSignOut,
          },
        ]
      );
    }
  };

  const handleAccountDeletionConfirmation = () => {
    setDeleteVerificationModalVisible(true);
  };

  const handleDeleteVerification = () => {
    if (deleteVerificationText.toLowerCase() === "delete") {
      setDeleteVerificationModalVisible(false);
      setDeleteAccountModalVisible(true);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      if (!user) return;

      setDeletingAccount(true);

      // Get current admin data for logging
      const { data: adminData, error: fetchError } = await supabase
        .from("admin")
        .select("name, email, role")
        .eq("id", user.id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // 1. Log deletion request
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        activity_type: "ACCOUNT_DELETION",
        description: `Account deletion initiated by ${adminData.name} (${adminData.email})`,
        metadata: {
          timestamp: new Date().toISOString(),
          action: "deletion_started",
          requested_by: {
            id: user.id,
            name: adminData.name,
            email: adminData.email,
            role: adminData.role,
          },
        },
      });

      // 2. Export user data for compliance records
      const [activityLogs] = await Promise.all([
        supabase.from("activity_logs").select("*").eq("user_id", user.id),
      ]);

      const complianceRecord = {
        userData: {
          id: adminData.id,
          name: adminData.name,
          email: adminData.email,
          role: adminData.role,
          phone_number: adminData.phone_number,
        },
        activityLogs: activityLogs.data,
        deletionDate: new Date().toISOString(),
        deletedBy: {
          id: user.id,
          name: adminData.name,
          email: adminData.email,
          role: adminData.role,
        },
      };

      // 3. Store compliance record (you would typically store this in a secure location)
      console.log("Compliance record created:", complianceRecord);

      // 4. Anonymize personal data in admin table
      const updateData = {
        name: "DELETED_USER",
        email: `deleted_${user.id}@deleted.com`,
        phone_number: null,
        deleted_at: new Date().toISOString(),
        status: null,
      };

      const { error: adminUpdateError } = await supabase
        .from("admin")
        .update(updateData)
        .eq("id", user.id);

      if (adminUpdateError) throw adminUpdateError;

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
        activity_type: "ACCOUNT_DELETION",
        description: `Account successfully anonymized and deactivated for ${adminData.name} (${adminData.email})`,
        metadata: {
          timestamp: new Date().toISOString(),
          action: "deletion_completed",
          requested_by: {
            id: user.id,
            name: adminData.name,
            email: adminData.email,
            role: adminData.role,
          },
          account_info: {
            id: user.id,
            name: adminData.name,
            email: adminData.email,
            role: adminData.role,
          },
          deletion_details: {
            deletion_date: new Date().toISOString(),
            compliance_record_created: true,
            data_anonymized: true,
          },
        },
        old_value: {
          id: user.id,
          name: adminData.name,
          email: adminData.email,
          status: "active",
        },
        new_value: {
          id: user.id,
          name: updateData.name,
          email: updateData.email,
          status: "deleted",
          deleted_at: updateData.deleted_at,
        },
      });

      setSnackbarMessage(t("superAdmin.profile.accountDeletedSuccess"));
      setSnackbarVisible(true);

      // 7. Sign out the user
      await signOut();
    } catch (error: any) {
      console.error("Error deleting account:", error);

      // Log the error
      if (user) {
        await supabase.from("activity_logs").insert({
          user_id: user.id,
          activity_type: "ACCOUNT_DELETION_ERROR",
          description: "Account deletion failed",
          metadata: {
            timestamp: new Date().toISOString(),
            error: error.message || "Unknown error",
            action: "deletion_failed",
            requested_by: {
              id: user.id,
              email: user.email,
            },
          },
        });
      }

      setSnackbarMessage(
        error.message || t("superAdmin.profile.accountDeleteFailed")
      );
      setSnackbarVisible(true);
    } finally {
      setDeletingAccount(false);
      setDeleteAccountModalVisible(false);
    }
  };

  const performSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Error signing out:", error);
      setSnackbarMessage(t("superAdmin.profile.signOutFailed"));
      setSnackbarVisible(true);
    } finally {
      setSignOutModalVisible(false);
    }
  };

  const getInitials = () => {
    if (!name) return user?.email?.charAt(0).toUpperCase() || "?";

    const nameParts = name.split(" ");
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();

    return (
      nameParts[0].charAt(0).toUpperCase() +
      nameParts[nameParts.length - 1].charAt(0).toUpperCase()
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
              <Text style={styles.signOutModalTitle}>
                {t("superAdmin.profile.signOut")}
              </Text>
            </View>

            <Text style={styles.signOutModalMessage}>
              {t("superAdmin.profile.confirmSignOut")}
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
                {t("superAdmin.profile.cancel")}
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
                {t("superAdmin.profile.signOut")}
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

      // Get current admin data for logging
      const { data: adminData, error: fetchError } = await supabase
        .from("admin")
        .select("name, email, role")
        .eq("id", user.id)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      console.log("Initiating password reset for email:", user.email);
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

        // Log the error activity
        await supabase.from("activity_logs").insert({
          user_id: user.id,
          activity_type: "PASSWORD_RESET_ERROR",
          description: `Password reset request failed for ${adminData.name} (${adminData.email})`,
          metadata: {
            timestamp: new Date().toISOString(),
            action: "password_reset_failed",
            error: errorMessage,
            requested_by: {
              id: user.id,
              name: adminData.name,
              email: adminData.email,
              role: adminData.role,
            },
          },
        });

        console.error("Password reset error:", error);
        setSnackbarMessage(errorMessage);
        setSnackbarVisible(true);
      } else {
        // Log successful password reset request
        await supabase.from("activity_logs").insert({
          user_id: user.id,
          activity_type: "PASSWORD_RESET_REQUESTED",
          description: `Password reset requested by ${adminData.name} (${adminData.email})`,
          metadata: {
            timestamp: new Date().toISOString(),
            action: "password_reset_initiated",
            requested_by: {
              id: user.id,
              name: adminData.name,
              email: adminData.email,
              role: adminData.role,
            },
          },
        });

        console.log("Password reset request successful");
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

  // Add new function to handle data export
  const handleDataExport = async () => {
    try {
      setExportingData(true);

      if (!user?.id) {
        throw new Error("User ID not found");
      }

      // Get current admin data for logging
      const { data: adminData, error: fetchError } = await supabase
        .from("admin")
        .select("name, email, role")
        .eq("id", user.id)
        .single();

      if (fetchError) {
        throw fetchError;
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

      // Log the export initiation
      const { error: logError } = await supabase.from("activity_logs").insert({
        user_id: user.id,
        activity_type: "DATA_EXPORT",
        description: `Data export requested by ${adminData.name} (${adminData.email})`,
        metadata: {
          timestamp: new Date().toISOString(),
          action: "export_initiated",
          requested_by: {
            id: user.id,
            name: adminData.name,
            email: adminData.email,
            role: adminData.role,
          },
          export_type: "user_data",
          export_version: "1.0",
        },
      });

      if (logError) {
        console.error("Error logging activity:", logError);
      }

      // Fetch user data from both users and admin tables, and activity logs
      const [userData, activityLogs] = await Promise.all([
        supabase.from("users").select("*").eq("id", user.id).single(),
        supabase
          .from("activity_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (!userData.data || !adminData) {
        throw new Error("User data not found");
      }

      // Create a well-structured export
      const exportData = {
        exportInfo: {
          timestamp: new Date().toISOString(),
          version: "1.0",
          exportType: "user_data",
        },
        userData: {
          profile: {
            id: userData.data.id,
            name: adminData.name,
            email: adminData.email,
            role: adminData.role,
            phone_number: adminData.phone_number || "Not provided",
            created_at: formatDate(userData.data.created_at),
            updated_at: formatDate(userData.data.updated_at),
            last_login: userData.data.last_login
              ? formatDate(userData.data.last_login)
              : "Never",
            status: userData.data.status,
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
Name: ${exportData.userData.profile.name}
Email: ${exportData.userData.profile.email}
Role: ${exportData.userData.profile.role}
Phone: ${exportData.userData.profile.phone_number}
Account Created: ${exportData.userData.profile.created_at}
Last Updated: ${exportData.userData.profile.updated_at}
Last Login: ${exportData.userData.profile.last_login}
Account Status: ${exportData.userData.profile.status}

2. ACTIVITY HISTORY
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
      link.download = `data-export-${timestamp}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Log successful export completion
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        activity_type: "DATA_EXPORT",
        description: `Data export completed successfully for ${adminData.name} (${adminData.email})`,
        metadata: {
          timestamp: new Date().toISOString(),
          action: "export_completed",
          requested_by: {
            id: user.id,
            name: adminData.name,
            email: adminData.email,
            role: adminData.role,
          },
          export_type: "user_data",
          export_version: exportData.exportInfo.version,
          export_summary: {
            total_activities:
              exportData.activityHistory.summary.totalActivities,
            date_range: {
              first: exportData.activityHistory.summary.firstActivity,
              last: exportData.activityHistory.summary.lastActivity,
            },
          },
        },
      });

      setSnackbarMessage(
        t("superAdmin.profile.exportSuccess") ||
          "Your data has been exported successfully"
      );
      setSnackbarVisible(true);
    } catch (error) {
      console.error("Error exporting data:", error);

      // Log export error
      if (user?.id) {
        await supabase.from("activity_logs").insert({
          user_id: user.id,
          activity_type: "DATA_EXPORT_ERROR",
          description: `Data export failed for user ${user.email}`,
          metadata: {
            timestamp: new Date().toISOString(),
            action: "export_failed",
            error: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }

      setSnackbarMessage(
        t("superAdmin.profile.exportError") || "Failed to export data"
      );
      setSnackbarVisible(true);
    } finally {
      setExportingData(false);
      setDataExportModalVisible(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <AppHeader
          title={t("superAdmin.profile.title") || "Profile"}
          showBackButton={true}
          showLogo={false}
          subtitle={t("superAdmin.profile.subtitle") || "Manage your account"}
        />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[
            styles.keyboardAvoidingView,
            { backgroundColor: theme.colors.background },
          ]}
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
                style={styles.profileSection}
              >
                <Surface
                  style={[
                    styles.profileCard,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.outline,
                    },
                  ]}
                  elevation={1}
                >
                  <View style={styles.profileHeader}>
                    <Shimmer
                      width={100}
                      height={100}
                      style={{ borderRadius: 50, marginBottom: 16 }}
                    />
                    <Shimmer
                      width={200}
                      height={24}
                      style={{ marginBottom: 8 }}
                    />
                    <Shimmer
                      width={180}
                      height={16}
                      style={{ marginBottom: 16 }}
                    />
                    <Shimmer
                      width={120}
                      height={28}
                      style={{ borderRadius: 14 }}
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
                    {/* Personal Information Card Shimmer */}
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

                  {/* Right Column */}
                  <View
                    style={[
                      styles.gridColumn,
                      {
                        flex: isLargeScreen ? 0.48 : isMediumScreen ? 0.48 : 1,
                      },
                    ]}
                  >
                    {/* Account Settings Card Shimmer */}
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
                          <View style={styles.settingItem}>
                            <Shimmer
                              width={200}
                              height={24}
                              style={{ marginBottom: 16 }}
                            />
                          </View>
                          <Divider style={styles.divider} />
                          <View style={styles.settingItem}>
                            <Shimmer
                              width={200}
                              height={24}
                              style={{ marginBottom: 16 }}
                            />
                          </View>
                          <Divider style={styles.divider} />
                          <View style={styles.settingItem}>
                            <Shimmer width={200} height={24} />
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["top"]}
    >
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />

      <AppHeader
        title={t("superAdmin.profile.title") || "Profile"}
        showBackButton={true}
        showLogo={false}
        subtitle={t("superAdmin.profile.subtitle") || "Manage your account"}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[
          styles.keyboardAvoidingView,
          { backgroundColor: theme.colors.background },
        ]}
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
            {/* Profile Header with Gradient */}
            <Animated.View
              entering={FadeIn.delay(100)}
              style={[styles.profileSection]}
            >
              <Surface
                style={[
                  styles.profileCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outline,
                  },
                ]}
                elevation={1}
              >
                <View style={styles.profileHeader}>
                  <Avatar.Text
                    size={100}
                    label={getInitials()}
                    style={[
                      styles.avatar,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  />
                  <Text variant="bold" style={styles.userName}>
                    {name || t("superAdmin.profile.admin") || "Admin"}
                  </Text>
                  <Text variant="medium" style={styles.userEmail}>
                    {email}
                  </Text>
                  <View style={styles.roleBadge}>
                    <Text variant="medium" style={styles.roleText}>
                      {t("superAdmin.profile.adminRole") || "Admin"}
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
                  {/* Personal Information Card */}
                  <Animated.View entering={FadeIn.delay(200)}>
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
                            {t("superAdmin.profile.personalInfo")}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardContent}>
                        <TextInput
                          label={t("superAdmin.profile.name")}
                          value={name}
                          onChangeText={setName}
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
                          label={t("superAdmin.profile.email")}
                          value={email}
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
                          label={
                            t("superAdmin.profile.phoneNumber") ||
                            "Phone Number"
                          }
                          value={phoneNumber}
                          onChangeText={(text) =>
                            setPhoneNumber(text.replace(/[^0-9+]/g, ""))
                          }
                          mode="outlined"
                          style={styles.input}
                          disabled={updating}
                          outlineStyle={{ borderRadius: 12 }}
                          keyboardType="phone-pad"
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
                          {t("superAdmin.profile.updateProfile")}
                        </Button>
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

                {/* Right Column */}
                <View
                  style={[
                    styles.gridColumn,
                    { flex: isLargeScreen ? 0.48 : isMediumScreen ? 0.48 : 1 },
                  ]}
                >
                  {/* Account Settings Card */}
                  <Animated.View entering={FadeIn.delay(300)}>
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
                          <Text style={styles.cardTitle}>
                            {t("superAdmin.profile.accountSettings")}
                          </Text>
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
                              {t("superAdmin.profile.resetPassword")}
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
                              {t("superAdmin.profile.signOut")}
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
                              {t("superAdmin.profile.exportData")}
                            </Text>
                          </View>
                          <MaterialCommunityIcons
                            name="chevron-right"
                            size={24}
                            color="#999"
                          />
                        </TouchableOpacity>

                        <Divider style={styles.divider} />

                        {/* Advanced Settings Section */}
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
                              {t("superAdmin.profile.advancedSettings") ||
                                "Advanced Settings"}
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
                                  {t("superAdmin.profile.deleteAccount") ||
                                    "Delete Account"}
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
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {renderSignOutModal()}
      <DeleteAccountModal
        visible={deleteAccountModalVisible}
        onDismiss={() => setDeleteAccountModalVisible(false)}
        onConfirm={handleDeleteAccount}
        loading={deletingAccount}
      />
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

export default SuperAdminProfileScreen;
