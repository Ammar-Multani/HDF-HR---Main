import React, { useState, useEffect } from "react";
import { logDebug } from "../../utils/logger";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  useWindowDimensions,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import {
  TextInput,
  Button,
  Avatar,
  useTheme,
  Snackbar,
  Surface,
  IconButton,
  Portal,
  Modal,
  Divider,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import Text from "../../components/Text";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import CustomSnackbar from "../../components/CustomSnackbar";
import { initEmailService } from "../../utils/emailService";
import { t } from "i18next";
import { Styles } from "@expo/config-plugins/build/android";
import CustomLanguageSelector from "../../components/CustomLanguageSelector";

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

// Add ResetPasswordModal interface after ShimmerProps
interface ResetPasswordModalProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
  loading: boolean;
  email: string;
}

// Add ResetPasswordModal component before EmployeeProfileScreen
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

// Add DataExportModal interface after ResetPasswordModal interface
interface DataExportModalProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => Promise<void>;
  loading: boolean;
}

// Add DataExportModal component before EmployeeProfileScreen
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
              name="database-export"
              size={32}
              color={theme.colors.primary}
            />
            <Text style={styles.resetPasswordModalTitle}>
              {t("employee.profile.exportData")}
            </Text>
          </View>

          <Text style={styles.resetPasswordModalMessage}>
            {t("employee.profile.exportDataConfirm") ||
              "Would you like to export your data? This will include your profile information and activity history."}
          </Text>

          <View style={styles.resetPasswordModalActions}>
            <Button
              mode="outlined"
              onPress={onDismiss}
              style={[styles.resetPasswordModalButton, styles.cancelButton]}
              labelStyle={[styles.resetPasswordModalButtonText]}
              disabled={loading}
            >
              {t("employee.profile.cancel")}
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
              {t("employee.profile.exportData")}
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
};

// Add DeleteVerificationModal interface
interface DeleteVerificationModalProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
  loading: boolean;
  verificationText: string;
  onVerificationTextChange: (text: string) => void;
}

// Add DeleteAccountModal interface
interface DeleteAccountModalProps {
  visible: boolean;
  onDismiss: () => void;
  onConfirm: () => void;
  loading: boolean;
}

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
        contentContainerStyle={[
          styles.deleteVerificationModal,
          {
            backgroundColor: theme.colors.surface,
          },
        ]}
      >
        <View style={styles.deleteVerificationModalContent}>
          <MaterialCommunityIcons
            name="alert-circle"
            size={40}
            color={theme.colors.error}
            style={styles.deleteVerificationIcon}
          />

          <Text style={styles.deleteVerificationTitle}>
            Final Confirmation Required
          </Text>

          <Text style={styles.deleteVerificationMessage}>
            This action cannot be undone. This will permanently delete your
            account and remove all access to the system.
          </Text>

          <TextInput
            value={verificationText}
            onChangeText={onVerificationTextChange}
            mode="outlined"
            label="Please type 'delete' to confirm:"
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
              Cancel
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
              Delete Account
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
};

// Add DeleteAccountModal component
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
            <Text style={styles.deleteAccountModalTitle}>Delete Account</Text>
          </View>

          <Text style={styles.deleteAccountModalMessage}>
            This action will permanently delete your account and all associated
            data. This cannot be undone. Please confirm if you wish to proceed.
          </Text>

          <View style={styles.deleteAccountModalActions}>
            <Button
              mode="outlined"
              onPress={onDismiss}
              style={[styles.deleteAccountModalButton, styles.cancelButton]}
              labelStyle={[styles.deleteAccountModalButtonText]}
              disabled={loading}
            >
              Cancel
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
              Delete Account
            </Button>
          </View>
        </View>
      </Modal>
    </Portal>
  );
};

// Move getStyles before components
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
      width: 120,
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
    selectContainer: {
      marginBottom: 16,
    },
    selectLabel: {
      fontSize: 14,
      color: "#64748b",
      marginBottom: 8,
      fontFamily: "Poppins-Medium",
    },
    selectOptions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    selectOption: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: "#e2e8f0",
      backgroundColor: "#fff",
    },
    selectedOption: {
      backgroundColor: "rgba(54,105,157,0.1)",
      borderColor: "rgba(54,105,157,255)",
    },
    selectOptionText: {
      color: "#64748b",
      fontSize: 14,
      fontFamily: "Poppins-Regular",
    },
    selectedOptionText: {
      color: "rgba(54,105,157,255)",
      fontFamily: "Poppins-Medium",
    },
    addressRow: {
      flexDirection: "row",
      gap: 16,
      marginBottom: 16,
    },
    cityInput: {
      flex: 3,
    },
    stateInput: {
      flex: 2,
    },
    postalInput: {
      flex: 2,
    },
    countryInput: {
      flex: 3,
    },
    bottomBar: {
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: "#FFFFFF",
      borderTopWidth: 1,
      borderTopColor: "#e2e8f0",
      padding: 16,
    },
    bottomBarContent: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
      maxWidth: 1400,
      marginHorizontal: "auto",
      width: "100%",
    },
    button: {
      minWidth: 120,
    },
    submitButton: {},
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
    languageSelectorContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
  });

const EmployeeProfileScreen = () => {
  const theme = useTheme();
  const styles = getStyles(theme);
  const { user, signOut, forgotPassword } = useAuth();
  const navigation = useNavigation();
  const dimensions = useWindowDimensions();

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [companyData, setCompanyData] = useState<any>(null);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nationality, setNationality] = useState("");
  const [gender, setGender] = useState("");
  const [maritalStatus, setMaritalStatus] = useState("");
  const [address, setAddress] = useState({
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
  });
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedData, setEditedData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    nationality: "",
    gender: "",
    maritalStatus: "",
    address: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      postal_code: "",
      country: "",
    },
  });
  const [resetPasswordModalVisible, setResetPasswordModalVisible] =
    useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [dataExportModalVisible, setDataExportModalVisible] = useState(false);
  const [exportingData, setExportingData] = useState(false);
  const [deleteAccountModalVisible, setDeleteAccountModalVisible] =
    useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteVerificationModalVisible, setDeleteVerificationModalVisible] =
    useState(false);
  const [deleteVerificationText, setDeleteVerificationText] = useState("");
  const [advancedSettingsVisible, setAdvancedSettingsVisible] = useState(false);

  // Initialize email service
  useEffect(() => {
    initEmailService();
  }, []);

  const fetchProfileData = async () => {
    try {
      setLoading(true);

      if (!user) return;

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

      // Set the edited data with current values
      setEditedData({
        firstName: userData.first_name || "",
        lastName: userData.last_name || "",
        phoneNumber: userData.phone_number || "",
        nationality: userData.nationality || "",
        gender: userData.gender || "",
        maritalStatus: userData.marital_status || "",
        address: {
          line1: userData.address?.line1 || "",
          line2: userData.address?.line2 || "",
          city: userData.address?.city || "",
          state: userData.address?.state || "",
          postal_code: userData.address?.postal_code || "",
          country: userData.address?.country || "",
        },
      });
    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileData();
  }, [user]);

  const handleStartEditing = () => {
    setIsEditMode(true);
  };

  const handleCancelEditing = () => {
    // Reset edited data to current values
    setEditedData({
      firstName: employeeData?.first_name || "",
      lastName: employeeData?.last_name || "",
      phoneNumber: employeeData?.phone_number || "",
      nationality: employeeData?.nationality || "",
      gender: employeeData?.gender || "",
      maritalStatus: employeeData?.marital_status || "",
      address: {
        line1: employeeData?.address?.line1 || "",
        line2: employeeData?.address?.line2 || "",
        city: employeeData?.address?.city || "",
        state: employeeData?.address?.state || "",
        postal_code: employeeData?.address?.postal_code || "",
        country: employeeData?.address?.country || "",
      },
    });
    setIsEditMode(false);
  };

  const handleUpdateProfile = async () => {
    try {
      if (!user) return;

      // Validate inputs
      if (!editedData.firstName.trim() || !editedData.lastName.trim()) {
        setSnackbarMessage("First name and last name are required");
        setSnackbarVisible(true);
        return;
      }

      if (
        !editedData.address.line1 ||
        !editedData.address.city ||
        !editedData.address.country
      ) {
        setSnackbarMessage("Street address, city, and country are required");
        setSnackbarVisible(true);
        return;
      }

      setUpdating(true);

      // Update employee record
      const { error } = await supabase
        .from("company_user")
        .update({
          first_name: editedData.firstName.trim(),
          last_name: editedData.lastName.trim(),
          phone_number: editedData.phoneNumber,
          nationality: editedData.nationality,
          gender: editedData.gender.toLowerCase(),
          marital_status: editedData.maritalStatus.toLowerCase(),
          address: {
            line1: editedData.address.line1.trim(),
            line2: editedData.address.line2.trim(),
            city: editedData.address.city.trim(),
            state: editedData.address.state.trim(),
            postal_code: editedData.address.postal_code.trim(),
            country: editedData.address.country.trim(),
          },
        })
        .eq("id", user.id);

      if (error) {
        throw error;
      }

      setSnackbarMessage("Profile updated successfully");
      setSnackbarVisible(true);
      setIsEditMode(false);

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
    if (Platform.OS === "web") {
      setSignOutModalVisible(true);
    } else {
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

  // Add handleDataExport function
  const handleDataExport = async () => {
    try {
      if (!user?.id) {
        setSnackbarMessage("User ID is required for data export");
        setSnackbarVisible(true);
        return;
      }

      setExportingData(true);

      // Log the export attempt
      const { error: logError } = await supabase.from("activity_logs").insert({
        user_id: user.id,
        activity_type: "data_export_initiated",
        metadata: {
          timestamp: new Date().toISOString(),
          user_agent: navigator.userAgent,
          ip_address: "redacted", // For privacy
        },
      });

      if (logError) {
        console.error("Error logging activity:", logError);
      }

      // Fetch all necessary data
      const [userData, activityLogs] = await Promise.all([
        supabase
          .from("company_user")
          .select("*, company:company_id(*)")
          .eq("id", user.id)
          .single(),
        supabase
          .from("activity_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (!userData.data) {
        throw new Error("User data not found");
      }

      // Format the data as text
      const formatDate = (date: string) => {
        return new Date(date).toLocaleString();
      };

      const textContent = `EMPLOYEE DATA EXPORT
Generated on: ${new Date().toLocaleString()}
===========================================

PERSONAL INFORMATION
------------------
Email: ${userData.data.email}
Name: ${userData.data.first_name} ${userData.data.last_name}
Phone: ${userData.data.phone_number || "Not provided"}
Nationality: ${userData.data.nationality || "Not provided"}
Gender: ${userData.data.gender || "Not provided"}
Marital Status: ${userData.data.marital_status || "Not provided"}
Last Login: ${userData.data.last_login ? formatDate(userData.data.last_login) : "Not available"}
Last Updated: ${userData.data.updated_at ? formatDate(userData.data.updated_at) : "Not available"}

ADDRESS
-------
Street: ${userData.data.address?.line1 || "Not provided"}
${userData.data.address?.line2 ? `Additional: ${userData.data.address.line2}\n` : ""}City: ${userData.data.address?.city || "Not provided"}
State/Province: ${userData.data.address?.state || "Not provided"}
Postal Code: ${userData.data.address?.postal_code || "Not provided"}
Country: ${userData.data.address?.country || "Not provided"}

EMPLOYMENT DETAILS
----------------
Company: ${userData.data.company?.company_name || "Not provided"}
Job Title: ${userData.data.job_title || "Not provided"}
Employment Type: ${userData.data.employment_type || "Not provided"}
Workload: ${userData.data.workload_percentage || "Not provided"}%
Start Date: ${formatDate(userData.data.employment_start_date) || "Not provided"}

ACTIVITY HISTORY
--------------
Total Activities: ${activityLogs.data?.length || 0}
First Activity: ${activityLogs.data?.[activityLogs.data.length - 1]?.created_at ? formatDate(activityLogs.data[activityLogs.data.length - 1].created_at) : "N/A"}
Last Activity: ${activityLogs.data?.[0]?.created_at ? formatDate(activityLogs.data[0].created_at) : "N/A"}

Recent Activities:
${
  activityLogs.data
    ?.slice(0, 10)
    .map(
      (log) => `
${formatDate(log.created_at)} - ${log.activity_type}
${log.description ? `Description: ${log.description}` : ""}
${log.metadata ? `Details: ${JSON.stringify(log.metadata, null, 2)}` : ""}
`
    )
    .join("\n") || "No activities recorded"
}

Export completed on: ${new Date().toLocaleString()}
===========================================`;

      // Create and download the text file
      const blob = new Blob([textContent], { type: "text/plain" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `employee-data-export-${new Date().toISOString().split("T")[0]}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Log successful export
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        activity_type: "data_export_completed",
        metadata: {
          timestamp: new Date().toISOString(),
          export_size: textContent.length,
          format: "txt",
        },
      });

      setSnackbarMessage("Data exported successfully");
      setSnackbarVisible(true);
    } catch (error: any) {
      console.error("Error exporting data:", error);
      setSnackbarMessage(error.message || "Failed to export data");
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
        activity_type: "account_deletion",
        description: "Account deletion process initiated",
        metadata: {
          timestamp: new Date().toISOString(),
          action: "deletion_started",
        },
      });

      // 2. Export user data for compliance records
      const [userData, activityLogs] = await Promise.all([
        supabase
          .from("company_user")
          .select("*, company:company_id(*)")
          .eq("id", user.id)
          .single(),
        supabase.from("activity_logs").select("*").eq("user_id", user.id),
      ]);

      const complianceRecord = {
        userData: userData.data,
        activityLogs: activityLogs.data,
        deletionDate: new Date().toISOString(),
      };

      // 3. Store compliance record
      logDebug("Compliance record created:", complianceRecord);

      // 4. Anonymize personal data in company_user table
      const { error: userUpdateError } = await supabase
        .from("company_user")
        .update({
          first_name: "DELETED_USER",
          last_name: "",
          email: `deleted_${user.id}@deleted.com`,
          phone_number: null,
          nationality: null,
          gender: null,
          marital_status: null,
          address: null,
          deleted_at: new Date().toISOString(),
          status: "deleted",
        })
        .eq("id", user.id);

      if (userUpdateError) throw userUpdateError;

      // 5. Update user record in users table
      const { error: userTableError } = await supabase
        .from("users")
        .update({
          email: `deleted_${user.id}@deleted.com`,
          deleted_at: new Date().toISOString(),
          status: "deleted",
        })
        .eq("id", user.id);

      if (userTableError) throw userTableError;

      // 6. Log successful deletion
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        activity_type: "account_deletion",
        description: "Account successfully anonymized and deactivated",
        metadata: {
          timestamp: new Date().toISOString(),
          action: "deletion_completed",
        },
      });

      setSnackbarMessage("Your account has been successfully deleted");
      setSnackbarVisible(true);

      // 7. Sign out the user
      await signOut();
    } catch (error: any) {
      console.error("Error deleting account:", error);

      // Log the error
      await supabase.from("activity_logs").insert({
        user_id: user.id,
        activity_type: "system_error",
        description: "Account deletion failed",
        metadata: {
          timestamp: new Date().toISOString(),
          error: error.message,
          action: "deletion_failed",
        },
      });

      setSnackbarMessage(error.message || "Failed to delete account");
      setSnackbarVisible(true);
    } finally {
      setDeletingAccount(false);
      setDeleteAccountModalVisible(false);
    }
  };

  if (loading && !updating) {
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
                    {/* Company Information Card Shimmer */}
                    <Animated.View entering={FadeIn.delay(200)}>
                      <Surface
                        style={[
                          styles.detailsCard,
                          {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.outline,
                          },
                        ]}
                        elevation={1}
                      >
                        <View
                          style={[
                            styles.cardHeader,
                            { borderBottomColor: theme.colors.outline },
                          ]}
                        >
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
                          {[1, 2, 3, 4].map((_, index) => (
                            <View key={index} style={styles.infoRow}>
                              <Shimmer
                                width={100}
                                height={16}
                                style={{ marginRight: 16 }}
                              />
                              <Shimmer width={150} height={16} />
                            </View>
                          ))}
                        </View>
                      </Surface>
                    </Animated.View>

                    {/* Personal Information Card Shimmer */}
                    <Animated.View entering={FadeIn.delay(300)}>
                      <Surface
                        style={[
                          styles.detailsCard,
                          {
                            marginTop: 24,
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.outline,
                          },
                        ]}
                        elevation={1}
                      >
                        <View
                          style={[
                            styles.cardHeader,
                            { borderBottomColor: theme.colors.outline },
                          ]}
                        >
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
                          {[1, 2, 3, 4, 5, 6].map((_, index) => (
                            <View key={index} style={styles.infoRow}>
                              <Shimmer
                                width={100}
                                height={16}
                                style={{ marginRight: 16 }}
                              />
                              <Shimmer width={150} height={16} />
                            </View>
                          ))}
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
                    {/* Address Card Shimmer */}
                    <Animated.View entering={FadeIn.delay(400)}>
                      <Surface
                        style={[
                          styles.detailsCard,
                          {
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.outline,
                          },
                        ]}
                        elevation={1}
                      >
                        <View
                          style={[
                            styles.cardHeader,
                            { borderBottomColor: theme.colors.outline },
                          ]}
                        >
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
                          {[1, 2, 3, 4, 5].map((_, index) => (
                            <View key={index} style={styles.infoRow}>
                              <Shimmer
                                width={100}
                                height={16}
                                style={{ marginRight: 16 }}
                              />
                              <Shimmer width={150} height={16} />
                            </View>
                          ))}
                        </View>
                      </Surface>
                    </Animated.View>

                    {/* Account Settings Card Shimmer */}
                    <Animated.View entering={FadeIn.delay(500)}>
                      <Surface
                        style={[
                          styles.detailsCard,
                          {
                            marginTop: 24,
                            backgroundColor: theme.colors.surface,
                            borderColor: theme.colors.outline,
                          },
                        ]}
                        elevation={1}
                      >
                        <View
                          style={[
                            styles.cardHeader,
                            { borderBottomColor: theme.colors.outline },
                          ]}
                        >
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
                          <Divider
                            style={{ backgroundColor: theme.colors.outline }}
                          />
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
            {/* Profile Header */}
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
                  <Avatar.Text
                    size={100}
                    label={getInitials()}
                    style={[
                      styles.avatar,
                      { backgroundColor: theme.colors.primary },
                    ]}
                  />
                  <Text
                    variant="bold"
                    style={[styles.userName, { color: theme.colors.onSurface }]}
                  >
                    {employeeData?.first_name} {employeeData?.last_name}
                  </Text>
                  <Text
                    variant="medium"
                    style={[
                      styles.userEmail,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {employeeData?.email}
                  </Text>
                  <View
                    style={[
                      styles.roleBadge,
                      {
                        borderColor: theme.colors.primary,
                        backgroundColor: (theme.colors as any).surfaceHover,
                      },
                    ]}
                  >
                    <Text
                      variant="medium"
                      style={[styles.roleText, { color: theme.colors.primary }]}
                    >
                      {employeeData?.job_title || "Employee"}
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
                      style={[
                        styles.detailsCard,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.outline,
                        },
                      ]}
                      elevation={1}
                    >
                      <View
                        style={[
                          styles.cardHeader,
                          { borderBottomColor: theme.colors.outline },
                        ]}
                      >
                        <View style={styles.headerLeft}>
                          <View
                            style={[
                              styles.iconContainer,
                              {
                                backgroundColor: (theme.colors as any)
                                  .surfaceHover,
                              },
                            ]}
                          >
                            <IconButton
                              icon="domain"
                              size={20}
                              iconColor={theme.colors.onSurfaceVariant}
                              style={styles.headerIcon}
                            />
                          </View>
                          <Text
                            style={[
                              styles.cardTitle,
                              { color: theme.colors.onSurface },
                            ]}
                          >
                            Company Information
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardContent}>
                        <View style={styles.infoRow}>
                          <Text
                            style={[
                              styles.infoLabel,
                              { color: theme.colors.onSurfaceVariant },
                            ]}
                          >
                            Company:
                          </Text>
                          <Text
                            style={[
                              styles.infoValue,
                              { color: theme.colors.onSurface },
                            ]}
                          >
                            {companyData?.company_name || "N/A"}
                          </Text>
                        </View>

                        <View style={styles.infoRow}>
                          <Text
                            style={[
                              styles.infoLabel,
                              { color: theme.colors.onSurfaceVariant },
                            ]}
                          >
                            Start Date:
                          </Text>
                          <Text
                            style={[
                              styles.infoValue,
                              { color: theme.colors.onSurface },
                            ]}
                          >
                            {formatDate(employeeData?.employment_start_date)}
                          </Text>
                        </View>

                        <View style={styles.infoRow}>
                          <Text
                            style={[
                              styles.infoLabel,
                              { color: theme.colors.onSurfaceVariant },
                            ]}
                          >
                            Employment:
                          </Text>
                          <Text
                            style={[
                              styles.infoValue,
                              { color: theme.colors.onSurface },
                            ]}
                          >
                            {employeeData?.employment_type
                              ? employeeData.employment_type
                                  .toString()
                                  .split("_")
                                  .map(
                                    (word: string) =>
                                      word.charAt(0).toUpperCase() +
                                      word.slice(1)
                                  )
                                  .join(" ")
                              : "N/A"}
                          </Text>
                        </View>

                        <View style={styles.infoRow}>
                          <Text
                            style={[
                              styles.infoLabel,
                              { color: theme.colors.onSurfaceVariant },
                            ]}
                          >
                            Workload:
                          </Text>
                          <Text
                            style={[
                              styles.infoValue,
                              { color: theme.colors.onSurface },
                            ]}
                          >
                            {employeeData?.workload_percentage}%
                          </Text>
                        </View>
                      </View>
                    </Surface>
                  </Animated.View>

                  {/* Personal Information Card */}
                  <Animated.View entering={FadeIn.delay(300)}>
                    <Surface
                      style={[
                        styles.detailsCard,
                        {
                          marginTop: 24,
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.outline,
                        },
                      ]}
                      elevation={1}
                    >
                      <View
                        style={[
                          styles.cardHeader,
                          { borderBottomColor: theme.colors.outline },
                        ]}
                      >
                        <View style={styles.headerLeft}>
                          <View
                            style={[
                              styles.iconContainer,
                              {
                                backgroundColor: (theme.colors as any)
                                  .surfaceHover,
                              },
                            ]}
                          >
                            <IconButton
                              icon="account"
                              size={20}
                              iconColor={theme.colors.onSurfaceVariant}
                              style={styles.headerIcon}
                            />
                          </View>
                          <Text
                            style={[
                              styles.cardTitle,
                              { color: theme.colors.onSurface },
                            ]}
                          >
                            Personal Information
                          </Text>
                        </View>
                        {!isEditMode && (
                          <IconButton
                            icon="pencil"
                            size={20}
                            iconColor={theme.colors.primary}
                            onPress={handleStartEditing}
                          />
                        )}
                      </View>

                      <View style={styles.cardContent}>
                        {isEditMode ? (
                          <>
                            <TextInput
                              label="First Name"
                              value={editedData.firstName}
                              onChangeText={(text) =>
                                setEditedData({
                                  ...editedData,
                                  firstName: text,
                                })
                              }
                              mode="outlined"
                              style={[
                                styles.input,
                                { backgroundColor: theme.colors.surface },
                              ]}
                              disabled={updating}
                              outlineStyle={{ borderRadius: 12 }}
                              theme={{
                                colors: {
                                  primary: theme.colors.primary,
                                  error: theme.colors.error,
                                  onSurfaceVariant:
                                    theme.colors.onSurfaceVariant,
                                },
                                fonts: {
                                  regular: { fontFamily: "Poppins-Regular" },
                                },
                              }}
                            />

                            <TextInput
                              label="Last Name"
                              value={editedData.lastName}
                              onChangeText={(text) =>
                                setEditedData({ ...editedData, lastName: text })
                              }
                              mode="outlined"
                              style={[
                                styles.input,
                                { backgroundColor: theme.colors.surface },
                              ]}
                              disabled={updating}
                              outlineStyle={{ borderRadius: 12 }}
                              theme={{
                                colors: {
                                  primary: theme.colors.primary,
                                  error: theme.colors.error,
                                  onSurfaceVariant:
                                    theme.colors.onSurfaceVariant,
                                },
                                fonts: {
                                  regular: { fontFamily: "Poppins-Regular" },
                                },
                              }}
                            />

                            <TextInput
                              label="Phone Number"
                              value={editedData.phoneNumber}
                              onChangeText={(text) =>
                                setEditedData({
                                  ...editedData,
                                  phoneNumber: text,
                                })
                              }
                              mode="outlined"
                              style={[
                                styles.input,
                                { backgroundColor: theme.colors.surface },
                              ]}
                              keyboardType="phone-pad"
                              disabled={updating}
                              outlineStyle={{ borderRadius: 12 }}
                              theme={{
                                colors: {
                                  primary: theme.colors.primary,
                                  error: theme.colors.error,
                                  onSurfaceVariant:
                                    theme.colors.onSurfaceVariant,
                                },
                                fonts: {
                                  regular: { fontFamily: "Poppins-Regular" },
                                },
                              }}
                            />

                            <TextInput
                              label="Nationality"
                              value={editedData.nationality}
                              onChangeText={(text) =>
                                setEditedData({
                                  ...editedData,
                                  nationality: text,
                                })
                              }
                              mode="outlined"
                              style={[
                                styles.input,
                                { backgroundColor: theme.colors.surface },
                              ]}
                              disabled={updating}
                              outlineStyle={{ borderRadius: 12 }}
                              theme={{
                                colors: {
                                  primary: theme.colors.primary,
                                  error: theme.colors.error,
                                  onSurfaceVariant:
                                    theme.colors.onSurfaceVariant,
                                },
                                fonts: {
                                  regular: { fontFamily: "Poppins-Regular" },
                                },
                              }}
                            />

                            <View
                              style={[
                                styles.selectContainer,
                                { backgroundColor: theme.colors.surface },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.selectLabel,
                                  { color: theme.colors.onSurfaceVariant },
                                ]}
                              >
                                Gender
                              </Text>
                              <View
                                style={[
                                  styles.selectOptions,
                                  { backgroundColor: theme.colors.surface },
                                ]}
                              >
                                {["Male", "Female", "Other"].map((option) => (
                                  <TouchableOpacity
                                    key={option}
                                    style={[
                                      styles.selectOption,
                                      editedData.gender.toLowerCase() ===
                                        option.toLowerCase() &&
                                        styles.selectedOption,
                                    ]}
                                    onPress={() =>
                                      setEditedData({
                                        ...editedData,
                                        gender: option,
                                      })
                                    }
                                    disabled={updating}
                                  >
                                    <Text
                                      style={[
                                        styles.selectOptionText,
                                        editedData.gender.toLowerCase() ===
                                          option.toLowerCase() &&
                                          styles.selectedOptionText,
                                      ]}
                                    >
                                      {option}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </View>

                            <View
                              style={[
                                styles.selectContainer,
                                { backgroundColor: theme.colors.surface },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.selectLabel,
                                  { color: theme.colors.onSurfaceVariant },
                                ]}
                              >
                                Marital Status
                              </Text>
                              <View
                                style={[
                                  styles.selectOptions,
                                  { backgroundColor: theme.colors.surface },
                                ]}
                              >
                                {[
                                  "Single",
                                  "Married",
                                  "Divorced",
                                  "Widowed",
                                ].map((option) => (
                                  <TouchableOpacity
                                    key={option}
                                    style={[
                                      styles.selectOption,
                                      editedData.maritalStatus.toLowerCase() ===
                                        option.toLowerCase() &&
                                        styles.selectedOption,
                                    ]}
                                    onPress={() =>
                                      setEditedData({
                                        ...editedData,
                                        maritalStatus: option,
                                      })
                                    }
                                    disabled={updating}
                                  >
                                    <Text
                                      style={[
                                        styles.selectOptionText,
                                        editedData.maritalStatus.toLowerCase() ===
                                          option.toLowerCase() &&
                                          styles.selectedOptionText,
                                      ]}
                                    >
                                      {option}
                                    </Text>
                                  </TouchableOpacity>
                                ))}
                              </View>
                            </View>
                          </>
                        ) : (
                          <>
                            <View
                              style={[
                                styles.infoRow,
                                { backgroundColor: theme.colors.surface },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.infoLabel,
                                  { color: theme.colors.onSurfaceVariant },
                                ]}
                              >
                                First Name:
                              </Text>
                              <Text
                                style={[
                                  styles.infoValue,
                                  { color: theme.colors.onSurface },
                                ]}
                              >
                                {employeeData?.first_name}
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.infoRow,
                                { backgroundColor: theme.colors.surface },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.infoLabel,
                                  { color: theme.colors.onSurfaceVariant },
                                ]}
                              >
                                Last Name:
                              </Text>
                              <Text
                                style={[
                                  styles.infoValue,
                                  { color: theme.colors.onSurface },
                                ]}
                              >
                                {employeeData?.last_name}
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.infoRow,
                                { backgroundColor: theme.colors.surface },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.infoLabel,
                                  { color: theme.colors.onSurfaceVariant },
                                ]}
                              >
                                Phone Number:
                              </Text>
                              <Text
                                style={[
                                  styles.infoValue,
                                  { color: theme.colors.onSurface },
                                ]}
                              >
                                {employeeData?.phone_number || "N/A"}
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.infoRow,
                                { backgroundColor: theme.colors.surface },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.infoLabel,
                                  { color: theme.colors.onSurfaceVariant },
                                ]}
                              >
                                Nationality:
                              </Text>
                              <Text
                                style={[
                                  styles.infoValue,
                                  { color: theme.colors.onSurface },
                                ]}
                              >
                                {employeeData?.nationality || "N/A"}
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.infoRow,
                                { backgroundColor: theme.colors.surface },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.infoLabel,
                                  { color: theme.colors.onSurfaceVariant },
                                ]}
                              >
                                Gender:
                              </Text>
                              <Text
                                style={[
                                  styles.infoValue,
                                  { color: theme.colors.onSurface },
                                ]}
                              >
                                {employeeData?.gender?.charAt(0).toUpperCase() +
                                  employeeData?.gender?.slice(1) || "N/A"}
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.infoRow,
                                { backgroundColor: theme.colors.surface },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.infoLabel,
                                  { color: theme.colors.onSurfaceVariant },
                                ]}
                              >
                                Marital Status:
                              </Text>
                              <Text
                                style={[
                                  styles.infoValue,
                                  { color: theme.colors.onSurface },
                                ]}
                              >
                                {employeeData?.marital_status
                                  ?.charAt(0)
                                  .toUpperCase() +
                                  employeeData?.marital_status
                                    ?.slice(1)
                                    .replace("_", " ") || "N/A"}
                              </Text>
                            </View>
                          </>
                        )}
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
                  {/* Address Card */}
                  <Animated.View entering={FadeIn.delay(400)}>
                    <Surface
                      style={[
                        styles.detailsCard,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.outline,
                        },
                      ]}
                      elevation={1}
                    >
                      <View
                        style={[
                          styles.cardHeader,
                          { borderBottomColor: theme.colors.outline },
                        ]}
                      >
                        <View style={styles.headerLeft}>
                          <View
                            style={[
                              styles.iconContainer,
                              {
                                backgroundColor: (theme.colors as any)
                                  .surfaceHover,
                              },
                            ]}
                          >
                            <IconButton
                              icon="map-marker"
                              size={20}
                              iconColor={theme.colors.onSurfaceVariant}
                              style={styles.headerIcon}
                            />
                          </View>
                          <Text
                            style={[
                              styles.cardTitle,
                              { color: theme.colors.onSurface },
                            ]}
                          >
                            Address
                          </Text>
                        </View>
                        {!isEditMode && (
                          <IconButton
                            icon="pencil"
                            size={20}
                            iconColor={theme.colors.primary}
                            onPress={handleStartEditing}
                          />
                        )}
                      </View>

                      <View style={styles.cardContent}>
                        {isEditMode ? (
                          <>
                            <TextInput
                              label="Street Address"
                              value={editedData.address.line1}
                              onChangeText={(text) =>
                                setEditedData({
                                  ...editedData,
                                  address: {
                                    ...editedData.address,
                                    line1: text,
                                  },
                                })
                              }
                              mode="outlined"
                              style={[
                                styles.input,
                                { backgroundColor: theme.colors.surface },
                              ]}
                              disabled={updating}
                              outlineStyle={{ borderRadius: 12 }}
                              theme={{
                                colors: {
                                  primary: theme.colors.primary,
                                  error: theme.colors.error,
                                  onSurfaceVariant:
                                    theme.colors.onSurfaceVariant,
                                },
                                fonts: {
                                  regular: { fontFamily: "Poppins-Regular" },
                                },
                              }}
                            />

                            <TextInput
                              label="Apartment, suite, etc. (optional)"
                              value={editedData.address.line2}
                              onChangeText={(text) =>
                                setEditedData({
                                  ...editedData,
                                  address: {
                                    ...editedData.address,
                                    line2: text,
                                  },
                                })
                              }
                              mode="outlined"
                              style={[
                                styles.input,
                                { backgroundColor: theme.colors.surface },
                              ]}
                              disabled={updating}
                              outlineStyle={{ borderRadius: 12 }}
                              theme={{
                                colors: {
                                  primary: theme.colors.primary,
                                  error: theme.colors.error,
                                  onSurfaceVariant:
                                    theme.colors.onSurfaceVariant,
                                },
                                fonts: {
                                  regular: { fontFamily: "Poppins-Regular" },
                                },
                              }}
                            />

                            <View
                              style={[
                                styles.addressRow,
                                { backgroundColor: theme.colors.surface },
                              ]}
                            >
                              <TextInput
                                label="City"
                                value={editedData.address.city}
                                onChangeText={(text) =>
                                  setEditedData({
                                    ...editedData,
                                    address: {
                                      ...editedData.address,
                                      city: text,
                                    },
                                  })
                                }
                                mode="outlined"
                                style={[
                                  styles.input,
                                  styles.cityInput,
                                  { backgroundColor: theme.colors.surface },
                                ]}
                                disabled={updating}
                                outlineStyle={{ borderRadius: 12 }}
                                theme={{
                                  colors: {
                                    primary: theme.colors.primary,
                                    error: theme.colors.error,
                                    onSurfaceVariant:
                                      theme.colors.onSurfaceVariant,
                                  },
                                  fonts: {
                                    regular: { fontFamily: "Poppins-Regular" },
                                  },
                                }}
                              />

                              <TextInput
                                label="State/Province"
                                value={editedData.address.state}
                                onChangeText={(text) =>
                                  setEditedData({
                                    ...editedData,
                                    address: {
                                      ...editedData.address,
                                      state: text,
                                    },
                                  })
                                }
                                mode="outlined"
                                style={[
                                  styles.input,
                                  styles.stateInput,
                                  { backgroundColor: theme.colors.surface },
                                ]}
                                disabled={updating}
                                outlineStyle={{ borderRadius: 12 }}
                                theme={{
                                  colors: {
                                    primary: theme.colors.primary,
                                    error: theme.colors.error,
                                    onSurfaceVariant:
                                      theme.colors.onSurfaceVariant,
                                  },
                                  fonts: {
                                    regular: { fontFamily: "Poppins-Regular" },
                                  },
                                }}
                              />
                            </View>

                            <View
                              style={[
                                styles.addressRow,
                                { backgroundColor: theme.colors.surface },
                              ]}
                            >
                              <TextInput
                                label="Postal Code"
                                value={editedData.address.postal_code}
                                onChangeText={(text) =>
                                  setEditedData({
                                    ...editedData,
                                    address: {
                                      ...editedData.address,
                                      postal_code: text,
                                    },
                                  })
                                }
                                mode="outlined"
                                style={[
                                  styles.input,
                                  styles.postalInput,
                                  { backgroundColor: theme.colors.surface },
                                ]}
                                disabled={updating}
                                outlineStyle={{ borderRadius: 12 }}
                                theme={{
                                  colors: {
                                    primary: theme.colors.primary,
                                    error: theme.colors.error,
                                    onSurfaceVariant:
                                      theme.colors.onSurfaceVariant,
                                  },
                                  fonts: {
                                    regular: { fontFamily: "Poppins-Regular" },
                                  },
                                }}
                              />

                              <TextInput
                                label="Country"
                                value={editedData.address.country}
                                onChangeText={(text) =>
                                  setEditedData({
                                    ...editedData,
                                    address: {
                                      ...editedData.address,
                                      country: text,
                                    },
                                  })
                                }
                                mode="outlined"
                                style={[
                                  styles.input,
                                  styles.countryInput,
                                  { backgroundColor: theme.colors.surface },
                                ]}
                                disabled={updating}
                                outlineStyle={{ borderRadius: 12 }}
                                theme={{
                                  colors: {
                                    primary: theme.colors.primary,
                                    error: theme.colors.error,
                                    onSurfaceVariant:
                                      theme.colors.onSurfaceVariant,
                                  },
                                  fonts: {
                                    regular: { fontFamily: "Poppins-Regular" },
                                  },
                                }}
                              />
                            </View>
                          </>
                        ) : (
                          <>
                            <View
                              style={[
                                styles.infoRow,
                                { backgroundColor: theme.colors.surface },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.infoLabel,
                                  { color: theme.colors.onSurfaceVariant },
                                ]}
                              >
                                Street:
                              </Text>
                              <Text
                                style={[
                                  styles.infoValue,
                                  { color: theme.colors.onSurface },
                                ]}
                              >
                                {employeeData?.address?.line1}
                                {employeeData?.address?.line2
                                  ? `, ${employeeData.address.line2}`
                                  : ""}
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.infoRow,
                                { backgroundColor: theme.colors.surface },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.infoLabel,
                                  { color: theme.colors.onSurfaceVariant },
                                ]}
                              >
                                City:
                              </Text>
                              <Text
                                style={[
                                  styles.infoValue,
                                  { color: theme.colors.onSurface },
                                ]}
                              >
                                {employeeData?.address?.city}
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.infoRow,
                                { backgroundColor: theme.colors.surface },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.infoLabel,
                                  { color: theme.colors.onSurfaceVariant },
                                ]}
                              >
                                State/Province:
                              </Text>
                              <Text
                                style={[
                                  styles.infoValue,
                                  { color: theme.colors.onSurface },
                                ]}
                              >
                                {employeeData?.address?.state}
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.infoRow,
                                { backgroundColor: theme.colors.surface },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.infoLabel,
                                  { color: theme.colors.onSurfaceVariant },
                                ]}
                              >
                                Postal Code:
                              </Text>
                              <Text
                                style={[
                                  styles.infoValue,
                                  { color: theme.colors.onSurface },
                                ]}
                              >
                                {employeeData?.address?.postal_code}
                              </Text>
                            </View>

                            <View
                              style={[
                                styles.infoRow,
                                { backgroundColor: theme.colors.surface },
                              ]}
                            >
                              <Text
                                style={[
                                  styles.infoLabel,
                                  { color: theme.colors.onSurfaceVariant },
                                ]}
                              >
                                Country:
                              </Text>
                              <Text
                                style={[
                                  styles.infoValue,
                                  { color: theme.colors.onSurface },
                                ]}
                              >
                                {employeeData?.address?.country}
                              </Text>
                            </View>
                          </>
                        )}
                      </View>
                    </Surface>
                  </Animated.View>

                  {/* Account Settings Card */}
                  <Animated.View entering={FadeIn.delay(500)}>
                    <Surface
                      style={[
                        styles.detailsCard,
                        {
                          marginTop: 24,
                          backgroundColor: theme.colors.surface,
                          borderColor: theme.colors.outline,
                        },
                      ]}
                      elevation={1}
                    >
                      <View
                        style={[
                          styles.cardHeader,
                          { borderBottomColor: theme.colors.outline },
                        ]}
                      >
                        <View style={styles.headerLeft}>
                          <View
                            style={[
                              styles.iconContainer,
                              {
                                backgroundColor: (theme.colors as any)
                                  .surfaceHover,
                              },
                            ]}
                          >
                            <IconButton
                              icon="account-cog"
                              size={20}
                              iconColor={theme.colors.onSurfaceVariant}
                              style={styles.headerIcon}
                            />
                          </View>
                          <Text
                            style={[
                              styles.cardTitle,
                              { color: theme.colors.onSurface },
                            ]}
                          >
                            Account Settings
                          </Text>
                        </View>
                      </View>

                      <View style={styles.cardContent}>
                        <TouchableOpacity style={styles.settingItem}>
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
                        </TouchableOpacity>

                        <Divider style={styles.divider} />
                        <TouchableOpacity
                          style={[
                            styles.settingItem,
                            { backgroundColor: theme.colors.surface },
                          ]}
                          onPress={handleResetPasswordClick}
                        >
                          <View
                            style={[
                              styles.settingItemContent,
                              { backgroundColor: theme.colors.surface },
                            ]}
                          >
                            <MaterialCommunityIcons
                              name="lock-reset"
                              size={24}
                              color={theme.colors.primary}
                            />
                            <Text
                              variant="medium"
                              style={[
                                styles.settingText,
                                { color: theme.colors.onSurface },
                              ]}
                            >
                              Reset Password
                            </Text>
                          </View>
                          <MaterialCommunityIcons
                            name="chevron-right"
                            size={24}
                            color="#999"
                          />
                        </TouchableOpacity>
                        <Divider
                          style={[
                            styles.divider,
                            { backgroundColor: theme.colors.outline },
                          ]}
                        />
                        <TouchableOpacity
                          style={[
                            styles.settingItem,
                            { backgroundColor: theme.colors.surface },
                          ]}
                          onPress={handleSignOut}
                        >
                          <View
                            style={[
                              styles.settingItemContent,
                              { backgroundColor: theme.colors.surface },
                            ]}
                          >
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

                        <Divider
                          style={[
                            styles.divider,
                            { backgroundColor: theme.colors.outline },
                          ]}
                        />

                        <TouchableOpacity
                          style={[
                            styles.settingItem,
                            { backgroundColor: theme.colors.surface },
                          ]}
                          onPress={() => setDataExportModalVisible(true)}
                        >
                          <View
                            style={[
                              styles.settingItemContent,
                              { backgroundColor: theme.colors.surface },
                            ]}
                          >
                            <MaterialCommunityIcons
                              name="database-export"
                              size={24}
                              color={theme.colors.primary}
                            />
                            <Text
                              variant="medium"
                              style={[
                                styles.settingText,
                                { color: theme.colors.onSurface },
                              ]}
                            >
                              Export Data
                            </Text>
                          </View>
                          <MaterialCommunityIcons
                            name="chevron-right"
                            size={24}
                            color="#999"
                          />
                        </TouchableOpacity>

                        <Divider
                          style={[
                            styles.divider,
                            { backgroundColor: theme.colors.outline },
                          ]}
                        />

                        <TouchableOpacity
                          style={[
                            styles.settingItem,
                            { backgroundColor: theme.colors.surface },
                          ]}
                          onPress={() =>
                            setAdvancedSettingsVisible(!advancedSettingsVisible)
                          }
                        >
                          <View
                            style={[
                              styles.settingItemContent,
                              { backgroundColor: theme.colors.surface },
                            ]}
                          >
                            <MaterialCommunityIcons
                              name="cog"
                              size={24}
                              color="#64748b"
                            />
                            <Text
                              variant="medium"
                              style={[
                                styles.settingText,
                                { color: theme.colors.onSurface },
                              ]}
                            >
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
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Bottom Action Bar */}
      {isEditMode && (
        <Surface
          style={[
            styles.bottomBar,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderTopColor: theme.colors.outline,
            },
          ]}
          elevation={1}
        >
          <View style={styles.bottomBarContent}>
            <Button
              mode="outlined"
              onPress={handleCancelEditing}
              style={[styles.button, styles.cancelButton]}
              disabled={updating}
              labelStyle={{ fontFamily: "Poppins-Medium" }}
              textColor={theme.colors.onSurface}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleUpdateProfile}
              style={[styles.button, styles.submitButton]}
              loading={updating}
              disabled={updating}
              buttonColor={theme.colors.primary}
              labelStyle={{ fontFamily: "Poppins-Medium" }}
            >
              Save Changes
            </Button>
          </View>
        </Surface>
      )}

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

export default EmployeeProfileScreen;
