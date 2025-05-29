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
  Card,
  IconButton,
  Surface,
  Portal,
  Modal,
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
import Animated, { FadeIn } from "react-native-reanimated";

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
    paddingBottom: 80,
  },
  gridContainer: {
    flexDirection: "column",
    gap: 24,
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
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 32,
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
});

const SuperAdminProfileScreen = () => {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const dimensions = useWindowDimensions();

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [adminData, setAdminData] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [signOutModalVisible, setSignOutModalVisible] = useState(false);

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
    } catch (error) {
      console.error("Error fetching admin data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [user]);

  const handleUpdateProfile = async () => {
    try {
      if (!user) return;

      setUpdating(true);

      // Validate inputs
      if (!name.trim()) {
        setSnackbarMessage(t("superAdmin.profile.nameRequired"));
        setSnackbarVisible(true);
        setUpdating(false);
        return;
      }

      // Update admin record
      const { error } = await supabase
        .from("admin")
        .update({ name })
        .eq("id", user.id);

      if (error) {
        throw error;
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

  if (loading) {
    return <LoadingIndicator />;
  }

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
            {/* Profile Header with Gradient */}
            <Animated.View
              entering={FadeIn.delay(100)}
              style={[
                styles.profileSection,
                { flex: isLargeScreen ? 1 : isMediumScreen ? 1 : 1 },
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
                        {/* Language Selector */}
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

                        <Divider style={styles.divider} />

                        <TouchableOpacity
                          style={styles.settingItem}
                          onPress={() => {
                            setSnackbarMessage(
                              t("superAdmin.profile.resetPasswordSuccess")
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

export default SuperAdminProfileScreen;
