import React, { useState, useEffect, useCallback } from "react";
import { logDebug } from "../../utils/logger";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Alert,
  Linking,
  Platform,
  AppState,
  AppStateStatus,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import {
  Text,
  Card,
  Button,
  Divider,
  useTheme,
  Chip,
  Avatar,
  Surface,
  IconButton,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  RouteProp,
  NavigationProp,
  useFocusEffect,
} from "@react-navigation/native";
import { format } from "date-fns";
import {
  supabase,
  cachedQuery,
  clearCache,
  isNetworkAvailable,
} from "../../lib/supabase";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import StatusBadge from "../../components/StatusBadge";
import { UserStatus } from "../../types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, { FadeIn } from "react-native-reanimated";
import { useAuth } from "../../contexts/AuthContext";

// Add window dimensions hook
const useWindowDimensions = () => {
  const [dimensions, setDimensions] = useState({
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  });

  useEffect(() => {
    if (Platform.OS === "web") {
      const handleResize = () => {
        setDimensions({
          width: Dimensions.get("window").width,
          height: Dimensions.get("window").height,
        });
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  return dimensions;
};

type SuperAdminDetailsRouteParams = {
  adminId: string;
  adminType: string;
};

type AdminNavigationProp = NavigationProp<Record<string, object | undefined>>;

// Admin interface
interface Admin {
  id: string;
  name?: string;
  email: string;
  phone_number?: string;
  status?: boolean | string;
  role: string;
  created_at: string;
  last_login?: string;
  profile_picture?: string;
}

// Skeleton component for loading state
const SuperAdminDetailsSkeleton = () => {
  const theme = useTheme();

  const SkeletonBlock = ({
    width,
    height,
    style,
  }: {
    width: string | number;
    height: number;
    style?: any;
  }) => (
    <View
      style={[
        {
          width,
          height,
          backgroundColor: theme.colors.surfaceVariant,
          borderRadius: 4,
          opacity: 0.3,
        },
        style,
      ]}
    />
  );

  return (
    <Card style={[{ backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <View style={styles.profileHeader}>
          <SkeletonBlock
            width={80}
            height={80}
            style={{ borderRadius: 40, marginRight: 20 }}
          />
          <View>
            <SkeletonBlock
              width={150}
              height={24}
              style={{ marginBottom: 8 }}
            />
            <SkeletonBlock width={120} height={18} />
          </View>
        </View>

        <View style={styles.contactButtons}>
          <SkeletonBlock
            width={100}
            height={36}
            style={{ marginRight: 12, borderRadius: 8 }}
          />
          <SkeletonBlock width={100} height={36} style={{ borderRadius: 8 }} />
        </View>

        <Divider style={{ marginVertical: 16 }} />

        <SkeletonBlock width="40%" height={20} style={{ marginBottom: 16 }} />

        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.infoRow}>
            <SkeletonBlock width={100} height={16} />
            <SkeletonBlock width="50%" height={16} />
          </View>
        ))}

        <Divider style={{ marginVertical: 16 }} />

        <SkeletonBlock width="40%" height={20} style={{ marginBottom: 16 }} />

        {[1, 2].map((i) => (
          <View key={i} style={styles.infoRow}>
            <SkeletonBlock width={100} height={16} />
            <SkeletonBlock width="50%" height={16} />
          </View>
        ))}
      </Card.Content>
    </Card>
  );
};

// Add interface for CustomAlert props
interface CustomAlertProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

// Add CustomAlert component
const CustomAlert: React.FC<CustomAlertProps> = ({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDestructive = false,
}) => {
  if (!visible) return null;

  return (
    <View style={styles.modalOverlay}>
      <View style={styles.modalContent}>
        <Text style={styles.modalTitle}>{title}</Text>
        <Text style={styles.modalMessage}>{message}</Text>
        <View style={styles.modalButtons}>
          <TouchableOpacity
            style={[styles.modalButton, styles.modalCancelButton]}
            onPress={onCancel}
          >
            <Text style={styles.modalButtonText}>{cancelText}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.modalButton,
              styles.modalConfirmButton,
              isDestructive && styles.modalDestructiveButton,
            ]}
            onPress={onConfirm}
          >
            <Text
              style={[
                styles.modalButtonText,
                styles.modalConfirmText,
                isDestructive && styles.modalDestructiveText,
              ]}
            >
              {confirmText}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// Add interface for alert config
interface AlertConfig {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  isDestructive: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const SuperAdminDetailsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<AdminNavigationProp>();
  const route =
    useRoute<RouteProp<Record<string, SuperAdminDetailsRouteParams>, string>>();
  const { adminId, adminType } = route.params;
  const dimensions = useWindowDimensions();
  const { user, signOut } = useAuth();

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [networkStatus, setNetworkStatus] = useState<boolean | null>(null);
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [alertConfig, setAlertConfig] = useState<AlertConfig>({
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    isDestructive: false,
    onConfirm: () => {},
    onCancel: () => {},
  });

  // Check network status when screen focuses
  useFocusEffect(
    useCallback(() => {
      const checkNetwork = async () => {
        try {
          const isAvailable = await isNetworkAvailable();
          setNetworkStatus(isAvailable);
        } catch (e) {
          console.warn("Error checking network status:", e);
          setNetworkStatus(true);
        }
      };

      checkNetwork();

      // Set up AppState listener to recheck when app comes to foreground
      const subscription = AppState.addEventListener(
        "change",
        async (nextAppState: AppStateStatus) => {
          if (nextAppState === "active") {
            checkNetwork();
          }
        }
      );

      return () => {
        subscription.remove();
      };
    }, [])
  );

  const fetchAdminDetails = async (isRefreshing = false) => {
    try {
      // Clear any previous errors
      setError(null);

      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Create a unique cache key for this admin
      const cacheKey = `admin_details_${adminId}`;

      // Force refresh only when explicitly requested through pull-to-refresh
      const forceRefresh = isRefreshing;

      // Define the async function to fetch admin data
      const fetchAdminData = async () => {
        logDebug(`Fetching admin data for ID: ${adminId}`);
        const { data, error } = await supabase
          .from("admin")
          .select("*")
          .eq("id", adminId)
          .single();

        if (error) {
          console.error("Error in supabase query:", error);
        }

        return { data, error };
      };

      // Use the cached query
      const result = await cachedQuery<any>(fetchAdminData, cacheKey, {
        forceRefresh,
        cacheTtl: 10 * 60 * 1000, // 10 minute cache for admin details
        criticalData: true, // Mark as critical data for offline fallback
      });

      // Check if we're using stale data
      if (result.fromCache && networkStatus === false) {
        setError(
          "You're viewing cached data. Some information may be outdated."
        );
      }

      if (result.error && !result.data) {
        throw new Error(
          result.error.message || "Failed to fetch admin details"
        );
      }

      setAdmin(result.data);
    } catch (error: any) {
      console.error("Error fetching admin details:", error);
      setError(error.message || "Failed to load admin details");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminDetails();

    // Cleanup function
    return () => {
      setAdmin(null);
    };
  }, [adminId]);

  const onRefresh = () => {
    fetchAdminDetails(true);
  };

  const performToggleStatus = async () => {
    if (!admin) return;

    try {
      setLoadingAction(true);

      // Determine if admin is currently active
      const isCurrentlyActive =
        typeof admin.status === "boolean"
          ? admin.status
          : admin.status === "active";

      // Prepare the new status (opposite of current)
      const newStatus = !isCurrentlyActive;

      logDebug(
        `Current status: ${admin.status} (${typeof admin.status}), Interpreted as: ${isCurrentlyActive}, New status: ${newStatus}`
      );

      const { error } = await supabase
        .from("admin")
        .update({ status: newStatus })
        .eq("id", admin.id);

      if (error) {
        throw error;
      }

      // Update local state
      setAdmin({
        ...admin,
        status: newStatus,
      });

      // Clear the cache for this admin after update
      await clearCache(`admin_details_${adminId}`);

      // Also clear any admin list caches - using wildcard pattern
      await clearCache(`admins_*`);

      // Close the alert modal after successful update
      setShowAlert(false);

      // If the user deactivated themselves, sign them out
      if (user?.id === admin.id && !newStatus) {
        await signOut();
        navigation.reset({
          index: 0,
          routes: [{ name: "Login" }],
        });
      }
    } catch (error: any) {
      console.error("Error toggling admin status:", error);
      handleError(error);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!admin) return;

    // Determine if admin is currently active
    const isCurrentlyActive =
      typeof admin.status === "boolean"
        ? admin.status
        : admin.status === "active";

    // Check if user is trying to deactivate themselves
    const isSelfDeactivation = user?.id === admin.id && isCurrentlyActive;

    if (Platform.OS === "web") {
      setAlertConfig({
        title: isCurrentlyActive ? "Deactivate Admin" : "Activate Admin",
        message: isSelfDeactivation
          ? "Warning: You are about to deactivate your own account. This will log you out immediately. Are you sure you want to continue?"
          : `Are you sure you want to ${isCurrentlyActive ? "deactivate" : "activate"} ${admin.name || admin.email}?`,
        onConfirm: async () => {
          await performToggleStatus();
        },
        onCancel: () => setShowAlert(false),
        confirmText: isCurrentlyActive ? "Deactivate" : "Activate",
        cancelText: "Cancel",
        isDestructive: isCurrentlyActive,
      });
      setShowAlert(true);
    } else {
      Alert.alert(
        isCurrentlyActive ? "Deactivate Admin" : "Activate Admin",
        isSelfDeactivation
          ? "Warning: You are about to deactivate your own account. This will log you out immediately. Are you sure you want to continue?"
          : `Are you sure you want to ${isCurrentlyActive ? "deactivate" : "activate"} ${admin.name || admin.email}?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: isCurrentlyActive ? "Deactivate" : "Activate",
            style: isCurrentlyActive ? "destructive" : "default",
            onPress: performToggleStatus,
          },
        ]
      );
    }
  };

  // Add handleError function
  const handleError = (error: any) => {
    if (Platform.OS === "web") {
      setAlertConfig({
        title: "Error",
        message: error?.message || "An error occurred",
        onConfirm: () => setShowAlert(false),
        onCancel: () => setShowAlert(false),
        confirmText: "OK",
        cancelText: "Cancel",
        isDestructive: false,
      });
      setShowAlert(true);
    } else {
      Alert.alert("Error", error?.message || "An error occurred");
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMMM d, yyyy");
  };

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  // Get the initials for the avatar
  const getInitials = (name: string = "", email: string = "") => {
    if (!name) {
      return email ? email.charAt(0).toUpperCase() : "?";
    }

    const nameParts = name.split(" ");
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();

    return (
      nameParts[0].charAt(0).toUpperCase() +
      nameParts[nameParts.length - 1].charAt(0).toUpperCase()
    );
  };

  // Move avatar style here
  const dynamicStyles = {
    avatar: {
      marginRight: 24,
      backgroundColor: theme.colors.primary,
    },
  };

  // Render content based on the current state
  const renderContent = () => {
    // Show no network warning if applicable
    if (networkStatus === false && !loading) {
      return (
        <View style={styles.offlineContainer}>
          <Text style={{ color: theme.colors.error, marginBottom: 16 }}>
            You are currently offline. Some actions will be unavailable.
          </Text>
          {admin ? (
            // Show cached data if available
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
            >
              {error && (
                <Card style={[styles.warningCard, { marginBottom: 16 }]}>
                  <Card.Content>
                    <Text style={{ color: "orange" }}>{error}</Text>
                  </Card.Content>
                </Card>
              )}
              {/* Admin data will be rendered here by the main render function */}
            </ScrollView>
          ) : (
            // No cached data available
            <Button
              mode="contained"
              onPress={() => fetchAdminDetails()}
              style={styles.button}
            >
              Retry
            </Button>
          )}
        </View>
      );
    }

    // Show error state
    if (error && !admin) {
      return (
        <View style={styles.errorContainer}>
          <Text style={{ color: theme.colors.error }}>{error}</Text>
          <Button
            mode="contained"
            onPress={() => fetchAdminDetails()}
            style={styles.button}
          >
            Retry
          </Button>
          <Button
            mode="outlined"
            onPress={() => navigation.goBack()}
            style={[styles.button, { marginTop: 8 }]}
          >
            Go Back
          </Button>
        </View>
      );
    }

    // Show skeleton loader during initial loading
    if (loading && !admin) {
      return (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              maxWidth: isLargeScreen ? 1400 : isMediumScreen ? 1100 : "100%",
              paddingHorizontal: isLargeScreen ? 48 : isMediumScreen ? 32 : 13,
            },
          ]}
        >
          <SuperAdminDetailsSkeleton />
        </ScrollView>
      );
    }

    // Show "admin not found" state
    if (!admin) {
      return (
        <View style={styles.errorContainer}>
          <Text style={{ color: theme.colors.error }}>Admin not found</Text>
          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={styles.button}
          >
            Go Back
          </Button>
        </View>
      );
    }

    // The admin data is available, render it
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            maxWidth: isLargeScreen ? 1400 : isMediumScreen ? 1100 : "100%",
            paddingHorizontal: isLargeScreen ? 48 : isMediumScreen ? 32 : 16,
          },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {error && (
          <Card style={[styles.warningCard, { marginBottom: 16 }]}>
            <Card.Content>
              <Text style={{ color: "orange" }}>{error}</Text>
            </Card.Content>
          </Card>
        )}

        <View style={styles.gridContainer}>
          <View style={styles.gridColumn}>
            <Animated.View entering={FadeIn.delay(100)}>
              <Surface style={styles.detailsCard}>

                <View style={styles.cardContent}>
                  <View style={styles.profileHeader}>
                    {admin?.profile_picture ? (
                      <Avatar.Image
                        size={60}
                        source={{ uri: admin.profile_picture }}
                        style={dynamicStyles.avatar}
                      />
                    ) : (
                      <Avatar.Text
                        size={60}
                        label={getInitials(
                          admin?.name || "",
                          admin?.email || ""
                        )}
                        style={dynamicStyles.avatar}
                      />
                    )}
                    <View>
                      <Text style={styles.adminName}>
                        {admin?.name || "Unnamed Admin"}
                      </Text>
                      <Text style={styles.adminRole}>Super Admin</Text>
                      {admin ? (
                        <StatusBadge
                          status={
                            typeof admin.status === "boolean"
                              ? admin.status
                                ? UserStatus.ACTIVE
                                : UserStatus.INACTIVE
                              : admin.status === "active"
                                ? UserStatus.ACTIVE
                                : UserStatus.INACTIVE
                          }
                        />
                      ) : (
                        <StatusBadge status={UserStatus.ACTIVE} />
                      )}
                    </View>
                  </View>

                  {admin?.phone_number && (
                    <View style={styles.contactButtons}>
                      <Button
                        mode="contained"
                        icon="phone"
                        onPress={() => handleCall(admin.phone_number || "")}
                        style={styles.contactButton}
                        buttonColor={theme.colors.primary}
                      >
                        Call
                      </Button>

                      <Button
                        mode="contained"
                        icon="email"
                        onPress={() => handleEmail(admin?.email || "")}
                        style={styles.contactButton}
                        buttonColor={theme.colors.primary}
                      >
                        Email
                      </Button>
                    </View>
                  )}
                </View>
              </Surface>

              <Surface style={[styles.detailsCard, { marginTop: 12 }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <View style={styles.iconContainer}>
                      <IconButton
                        icon="account-details"
                        size={20}
                        iconColor="#64748b"
                        style={styles.headerIcon}
                      />
                    </View>
                    <Text style={styles.cardTitle}>Admin Information</Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Email:</Text>
                    <Text style={styles.infoValue}>
                      {admin?.email || "N/A"}
                    </Text>
                  </View>

                  {admin?.phone_number && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Phone:</Text>
                      <Text style={styles.infoValue}>{admin.phone_number}</Text>
                    </View>
                  )}

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Status:</Text>
                    <Text style={styles.infoValue}>
                      {admin
                        ? typeof admin.status === "boolean"
                          ? admin.status
                            ? "Active"
                            : "Inactive"
                          : admin.status === "active"
                            ? "Active"
                            : "Inactive"
                        : "Active"}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Role:</Text>
                    <Text style={styles.infoValue}>
                      {admin?.role && typeof admin.role === "string"
                        ? admin.role.charAt(0).toUpperCase() +
                          admin.role.slice(1)
                        : "Super Admin"}
                    </Text>
                  </View>
                </View>
              </Surface>
            </Animated.View>
          </View>

          <View style={styles.gridColumn}>
            <Animated.View entering={FadeIn.delay(200)}>
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
                    <Text style={styles.cardTitle}>Account Details</Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Created On:</Text>
                    <Text style={styles.infoValue}>
                      {admin?.created_at ? formatDate(admin.created_at) : "N/A"}
                    </Text>
                  </View>

                  {admin?.last_login && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Last Login:</Text>
                      <Text style={styles.infoValue}>
                        {formatDate(admin.last_login)}
                      </Text>
                    </View>
                  )}
                </View>
              </Surface>

              <View style={styles.bottomBarContent}>
                <View style={styles.actionButtons}>
                  <Button
                    mode="contained"
                    onPress={() =>
                      navigation.navigate("EditSuperAdmin", {
                        adminId: admin?.id || "",
                      })
                    }
                    style={styles.button}
                    disabled={
                      loadingAction || networkStatus === false || !admin
                    }
                    buttonColor={theme.colors.primary}
                  >
                    Edit Admin
                  </Button>

                  <Button
                    mode="outlined"
                    onPress={handleToggleStatus}
                    style={[
                      styles.button,
                      {
                        borderColor: (
                          typeof admin?.status === "boolean"
                            ? admin?.status
                            : admin?.status === "active"
                        )
                          ? theme.colors.error
                          : theme.colors.primary,
                      },
                    ]}
                    textColor={
                      (
                        typeof admin?.status === "boolean"
                          ? admin?.status
                          : admin?.status === "active"
                      )
                        ? theme.colors.error
                        : theme.colors.primary
                    }
                    loading={loadingAction}
                    disabled={
                      loadingAction || networkStatus === false || !admin
                    }
                  >
                    {(
                      typeof admin?.status === "boolean"
                        ? admin?.status
                        : admin?.status === "active"
                    )
                      ? "Deactivate Admin"
                      : "Activate Admin"}
                  </Button>
                </View>
              </View>
            </Animated.View>
          </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#F8F9FA" }]}>
      <CustomAlert
        visible={showAlert}
        title={alertConfig.title}
        message={alertConfig.message}
        onConfirm={alertConfig.onConfirm}
        onCancel={() => setShowAlert(false)}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        isDestructive={alertConfig.isDestructive}
      />
      <AppHeader
        title="Admin Details"
        showBackButton={true}
        showHelpButton={true}
        onHelpPress={() => {
          navigation.navigate("Help" as never);
        }}
        showLogo={false}
        absolute={false}
      />
      {networkStatus === false && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>You are currently offline</Text>
        </View>
      )}
      {renderContent()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 32,
    alignSelf: "center",
    width: "100%",
  },
  gridContainer: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
  },
  gridColumn: {
    flex: 1,
    minWidth: 320,
    gap: 12,
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
    width: 28,
    height: 28,
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
    padding: 16,
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  adminName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
    fontFamily: "Poppins-SemiBold",
  },
  adminRole: {
    fontSize: 14,
    color: "#64748b",
    fontFamily: "Poppins-Medium",
    marginBottom: 8,
  },
  contactButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  contactButton: {
    flex: 1,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  infoLabel: {
    width: 120,
    fontSize: 14,
    color: "#64748b",
    fontFamily: "Poppins-Medium",
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: "#334155",
    fontFamily: "Poppins-Regular",
  },
  bottomBar: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    padding: 16,
    marginTop: 32,
    borderRadius: 16,
    shadowColor: "rgba(0,0,0,0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 1,
  },
  bottomBarContent: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  actionButtons: {
    paddingTop: 16,
    flexDirection: "row",
    gap: 12,
  },
  button: {
    minWidth: 120,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  offlineBanner: {
    backgroundColor: "rgba(239, 68, 68, 0.9)",
    padding: 8,
    alignItems: "center",
  },
  offlineText: {
    color: "white",
    fontFamily: "Poppins-Medium",
  },
  offlineContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  warningCard: {
    borderLeftWidth: 4,
    borderLeftColor: "orange",
    marginBottom: 24,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 24,
    width: "90%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 12,
  },
  modalMessage: {
    fontSize: 16,
    color: "#64748b",
    marginBottom: 24,
    lineHeight: 24,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  modalButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    minWidth: 80,
    alignItems: "center",
  },
  modalCancelButton: {
    backgroundColor: "#f1f5f9",
  },
  modalConfirmButton: {
    backgroundColor: "#3b82f6",
  },
  modalDestructiveButton: {
    backgroundColor: "#ef4444",
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b",
  },
  modalConfirmText: {
    color: "#ffffff",
  },
  modalDestructiveText: {
    color: "#ffffff",
  },
});

export default SuperAdminDetailsScreen;
