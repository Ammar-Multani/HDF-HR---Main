import React, { useState, useEffect, useCallback } from "react";
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
import Animated, { FadeIn } from "react-native-reanimated";

type CompanyAdminDetailsRouteParams = {
  adminId: string;
  adminType: string;
};

type AdminNavigationProp = NavigationProp<Record<string, object | undefined>>;

// Company User interface
interface CompanyUser {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  role: string;
  active_status?: string;
  job_title?: string;
  created_at: string;
  profile_picture?: string;
  company?: {
    company_name: string;
  };
}

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

// Skeleton component for loading state
const CompanyAdminDetailsSkeleton = () => {
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
    <Surface
      style={[styles.detailsCard, { backgroundColor: theme.colors.surface }]}
    >
      <View style={styles.cardContent}>
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
            <SkeletonBlock
              width={120}
              height={18}
              style={{ marginBottom: 8 }}
            />
            <SkeletonBlock
              width={80}
              height={22}
              style={{ borderRadius: 12 }}
            />
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

        <View
          style={{ height: 1, backgroundColor: "#e2e8f0", marginVertical: 16 }}
        />

        <SkeletonBlock width="40%" height={20} style={{ marginBottom: 16 }} />

        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={styles.infoRow}>
            <SkeletonBlock width={100} height={16} />
            <SkeletonBlock width="50%" height={16} />
          </View>
        ))}

        <View
          style={{ height: 1, backgroundColor: "#e2e8f0", marginVertical: 16 }}
        />

        <SkeletonBlock width="40%" height={20} style={{ marginBottom: 16 }} />

        {[1, 2].map((i) => (
          <View key={i} style={styles.infoRow}>
            <SkeletonBlock width={100} height={16} />
            <SkeletonBlock width="50%" height={16} />
          </View>
        ))}
      </View>
    </Surface>
  );
};

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

const CompanyAdminDetailsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<AdminNavigationProp>();
  const route =
    useRoute<
      RouteProp<Record<string, CompanyAdminDetailsRouteParams>, string>
    >();
  const { adminId, adminType } = route.params;
  const dimensions = useWindowDimensions();

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [admin, setAdmin] = useState<CompanyUser | null>(null);
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
      const cacheKey = `company_admin_details_${adminId}`;

      // Force refresh only when explicitly requested through pull-to-refresh
      const forceRefresh = isRefreshing;

      // Define the async function to fetch admin data
      const fetchAdminData = async () => {
        const { data, error } = await supabase
          .from("company_user")
          .select("*, company:company_id(company_name)")
          .eq("id", adminId)
          .eq("role", "admin")
          .single();

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
      console.error("Error fetching company admin details:", error);
      setError(error.message || "Failed to load company admin details");
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

      const newStatus =
        admin.active_status === "active" ? "inactive" : "active";

      const { error } = await supabase
        .from("company_user")
        .update({ active_status: newStatus })
        .eq("id", admin.id);

      if (error) {
        throw error;
      }

      // Update local state
      setAdmin({
        ...admin,
        active_status: newStatus,
      });

      // Clear the cache for this admin
      await clearCache(`company_admin_details_${adminId}`);

      // Also clear any admin list caches - using wildcard pattern
      await clearCache(`company_admins_*`);

      // Close the alert modal after successful update
      setShowAlert(false);
    } catch (error: any) {
      console.error("Error toggling admin status:", error);
      handleError(error);
    } finally {
      setLoadingAction(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!admin) return;

    if (Platform.OS === "web") {
      setAlertConfig({
        title:
          admin.active_status === "active"
            ? "Deactivate Admin"
            : "Activate Admin",
        message: `Are you sure you want to ${admin.active_status === "active" ? "deactivate" : "activate"} ${admin.first_name} ${admin.last_name}?`,
        onConfirm: async () => {
          await performToggleStatus();
        },
        onCancel: () => setShowAlert(false),
        confirmText:
          admin.active_status === "active" ? "Deactivate" : "Activate",
        cancelText: "Cancel",
        isDestructive: admin.active_status === "active",
      });
      setShowAlert(true);
    } else {
      Alert.alert(
        admin.active_status === "active"
          ? "Deactivate Admin"
          : "Activate Admin",
        `Are you sure you want to ${admin.active_status === "active" ? "deactivate" : "activate"} ${admin.first_name} ${admin.last_name}?`,
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: admin.active_status === "active" ? "Deactivate" : "Activate",
            style: admin.active_status === "active" ? "destructive" : "default",
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
  const getCompanyUserInitials = (
    firstName: string = "",
    lastName: string = "",
    email: string = ""
  ) => {
    if (!firstName && !lastName) return email.charAt(0).toUpperCase();

    return (
      (firstName ? firstName.charAt(0).toUpperCase() : "") +
      (lastName ? lastName.charAt(0).toUpperCase() : "")
    );
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
              paddingHorizontal: isLargeScreen ? 48 : isMediumScreen ? 32 : 16,
            },
          ]}
        >
          <View style={styles.gridContainer}>
            <View style={styles.gridColumn}>
              <CompanyAdminDetailsSkeleton />
              <Surface style={[styles.bottomBar, { marginTop: 24 }]}>
                <View style={styles.bottomBarContent}>
                  <View
                    style={[
                      styles.button,
                      {
                        height: 40,
                        backgroundColor: theme.colors.surfaceVariant,
                        opacity: 0.3,
                        borderRadius: 4,
                      },
                    ]}
                  />
                  <View style={styles.actionButtons}>
                    <View
                      style={[
                        styles.button,
                        {
                          height: 40,
                          backgroundColor: theme.colors.surfaceVariant,
                          opacity: 0.3,
                          borderRadius: 4,
                        },
                      ]}
                    />
                    <View
                      style={[
                        styles.button,
                        {
                          height: 40,
                          backgroundColor: theme.colors.surfaceVariant,
                          opacity: 0.3,
                          borderRadius: 4,
                        },
                      ]}
                    />
                  </View>
                </View>
              </Surface>
            </View>
          </View>
        </ScrollView>
      );
    }

    // Show "admin not found" state
    if (!admin) {
      return (
        <View style={styles.errorContainer}>
          <Text style={{ color: theme.colors.error }}>
            Company admin not found
          </Text>
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
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <View style={styles.iconContainer}>
                      <IconButton
                        icon="account"
                        size={20}
                        iconColor="#64748b"
                        style={styles.headerIcon}
                      />
                    </View>
                    <Text style={styles.cardTitle}>Admin Profile</Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.profileHeader}>
                    {admin && admin.profile_picture ? (
                      <Avatar.Image
                        size={80}
                        source={{ uri: admin.profile_picture }}
                        style={styles.avatar}
                      />
                    ) : (
                      <Avatar.Text
                        size={80}
                        label={getCompanyUserInitials(
                          admin ? admin.first_name : "",
                          admin ? admin.last_name : "",
                          admin ? admin.email : ""
                        )}
                        style={styles.companyAdminAvatar}
                      />
                    )}
                    <View>
                      <Text style={styles.adminName}>
                        {(admin &&
                          `${admin.first_name || ""} ${admin.last_name || ""}`.trim()) ||
                          "Unnamed Admin"}
                      </Text>
                      <Text style={styles.jobTitle}>
                        {admin && (admin.job_title || "Company Admin")}
                      </Text>
                      <View style={styles.companyBadge}>
                        <Text style={styles.companyBadgeText}>
                          {(admin && admin.company?.company_name) ||
                            "Unknown Company"}
                        </Text>
                      </View>
                      <StatusBadge
                        status={
                          admin?.active_status === "active"
                            ? UserStatus.ACTIVE
                            : UserStatus.INACTIVE
                        }
                      />
                    </View>
                  </View>

                  <View style={styles.contactButtons}>
                    {admin && admin.phone_number && (
                      <Button
                        mode="contained"
                        icon="phone"
                        onPress={() => handleCall(admin.phone_number || "")}
                        style={styles.contactButton}
                        buttonColor={theme.colors.primary}
                      >
                        Call
                      </Button>
                    )}

                    <Button
                      mode="contained"
                      icon="email"
                      onPress={() => handleEmail(admin ? admin.email : "")}
                      style={styles.contactButton}
                      buttonColor={theme.colors.primary}
                    >
                      Email
                    </Button>
                  </View>
                </View>
              </Surface>

              <Surface style={[styles.detailsCard, { marginTop: 24 }]}>
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
                      {admin ? admin.email : "N/A"}
                    </Text>
                  </View>

                  {admin && admin.phone_number && (
                    <View style={styles.infoRow}>
                      <Text style={styles.infoLabel}>Phone:</Text>
                      <Text style={styles.infoValue}>{admin.phone_number}</Text>
                    </View>
                  )}

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Status:</Text>
                    <Text style={styles.infoValue}>
                      {admin && admin.active_status
                        ? admin.active_status.charAt(0).toUpperCase() +
                          admin.active_status.slice(1)
                        : "Active"}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Role:</Text>
                    <Text style={styles.infoValue}>Company Admin</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Company:</Text>
                    <Text style={styles.infoValue}>
                      {(admin && admin.company?.company_name) ||
                        "Unknown Company"}
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
                      {admin ? formatDate(admin.created_at) : "N/A"}
                    </Text>
                  </View>
                </View>
              </Surface>

              <View style={styles.bottomBarContent}>
                <View style={styles.actionButtons}>
                  <Button
                    mode="contained"
                    onPress={() =>
                      navigation.navigate("EditCompanyAdmin", {
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
                        borderColor:
                          admin?.active_status === "active"
                            ? theme.colors.error
                            : theme.colors.primary,
                      },
                    ]}
                    textColor={
                      admin?.active_status === "active"
                        ? theme.colors.error
                        : theme.colors.primary
                    }
                    loading={loadingAction}
                    disabled={
                      loadingAction || networkStatus === false || !admin
                    }
                  >
                    {admin?.active_status === "active"
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
        title="Company Admin Details"
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
    gap: 24,
    flexWrap: "wrap",
  },
  gridColumn: {
    flex: 1,
    minWidth: 320,
    gap: 24,
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
  profileHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  avatar: {
    marginRight: 24,
  },
  companyAdminAvatar: {
    marginRight: 24,
    backgroundColor: "rgba(140,82,255,0.9)",
  },
  adminName: {
    fontSize: 24,
    fontWeight: "600",
    color: "#1e293b",
    fontFamily: "Poppins-SemiBold",
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 16,
    color: "#64748b",
    fontFamily: "Poppins-Medium",
    marginBottom: 8,
  },
  companyBadge: {
    backgroundColor: "#f1f5f9",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  companyBadgeText: {
    color: "#64748b",
    fontSize: 14,
    fontFamily: "Poppins-Medium",
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
  bottomBarContent: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 24,
  },
  actionButtons: {
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

export default CompanyAdminDetailsScreen;
