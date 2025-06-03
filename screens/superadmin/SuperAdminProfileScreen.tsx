import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  TouchableOpacity,
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

const SuperAdminProfileScreen = () => {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [adminData, setAdminData] = useState<any>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

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
          onPress: async () => {
            try {
              await signOut();
            } catch (error) {
              console.error("Error signing out:", error);
            }
          },
        },
      ]
    );
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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader
        title="Profile"
        showBackButton={true}
        showLogo={false}
        subtitle="Manage your account"
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Profile Header with Gradient */}
          <View style={styles.profileHeaderContainer}>
            <View style={styles.profileHeader}>
              <Avatar.Text
                size={100}
                label={getInitials()}
                style={styles.avatar}
              />
              <Text variant="bold" style={styles.userName}>
                {name || "Admin"}
              </Text>
              <Text variant="medium" style={styles.userEmail}>
                {email}
              </Text>
              <View style={styles.roleBadge}>
                <Text variant="medium" style={styles.roleText}>
                  Admin
                </Text>
              </View>
            </View>
          </View>

          {/* Personal Information Section */}
          <Card style={styles.card} elevation={0}>
            <Card.Content>
              <View style={styles.sectionTitleContainer}>
                <MaterialCommunityIcons
                  name="account-edit"
                  size={24}
                  color="rgba(54,105,157,255)"
                />
                <Text variant="bold" style={styles.sectionTitle}>
                  {t("superAdmin.profile.personalInfo")}
                </Text>
              </View>

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
                  fonts: { regular: { fontFamily: "Poppins-Regular" } },
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
                  fonts: { regular: { fontFamily: "Poppins-Regular" } },
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
            </Card.Content>
          </Card>

          {/* Account Settings Section */}
          <Card style={styles.card} elevation={0}>
            <Card.Content>
              <View style={styles.sectionTitleContainer}>
                <MaterialCommunityIcons
                  name="account-cog"
                  size={24}
                  color="rgba(54,105,157,255)"
                />
                <Text variant="bold" style={styles.sectionTitle}>
                  {t("superAdmin.profile.accountSettings")}
                </Text>
              </View>

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
                    style={[styles.settingText, { color: theme.colors.error }]}
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
    paddingBottom: 80,
  },
  profileHeaderContainer: {
    position: "relative",
    height: 200,
    marginBottom: 80,
  },
  headerGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 160,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  profileHeader: {
    alignItems: "center",
    position: "absolute",
    top: 30,
    left: 0,
    right: 0,
  },
  avatar: {
    borderWidth: 4,
    borderColor: "#fff",
    backgroundColor: "rgba(54,105,157,255)",
  },
  userName: {
    fontSize: 22,
    color: "#000",
    marginTop: 8,
  },
  userEmail: {
    fontSize: 14,
    color: "#000",
    opacity: 0.8,
    marginBottom: 12,
  },
  roleBadge: {
    backgroundColor: "#ffffff",
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 8,
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
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    elevation: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#FFFFFF",
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    color: "#333",
    marginLeft: 8,
  },
  input: {
    marginBottom: 16,
    backgroundColor: "#fff",
  },
  updateButton: {
    marginTop: 16,
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
  },
  settingText: {
    fontSize: 16,
    marginLeft: 16,
    color: "#333",
  },
  divider: {
    height: 1,
    backgroundColor: "#e0e0e0",
  },
  languageSelectorContainer: {
    marginLeft: "auto",
  },
});

export default SuperAdminProfileScreen;
