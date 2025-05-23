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
} from "react-native";
import {
  Text,
  Card,
  Button,
  Divider,
  useTheme,
  Chip,
  Avatar,
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
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
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

        <Divider style={styles.divider} />

        <SkeletonBlock width="40%" height={20} style={{ marginBottom: 16 }} />

        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.infoRow}>
            <SkeletonBlock width={100} height={16} />
            <SkeletonBlock width="50%" height={16} />
          </View>
        ))}

        <Divider style={styles.divider} />

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

const SuperAdminDetailsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<AdminNavigationProp>();
  const route =
    useRoute<RouteProp<Record<string, SuperAdminDetailsRouteParams>, string>>();
  const { adminId, adminType } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [networkStatus, setNetworkStatus] = useState<boolean | null>(null);

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
        console.log(`Fetching admin data for ID: ${adminId}`);
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

  const handleToggleStatus = async () => {
    if (!admin) {
      console.error("Cannot toggle status - admin object is null");
      return;
    }

    console.log(
      "Toggle status requested for admin:",
      admin.id,
      "Current status:",
      admin.status
    );

    // First check network availability
    try {
      const isAvailable = await isNetworkAvailable();
      if (!isAvailable) {
        Alert.alert(
          "Network Check",
          "Your network connection might be limited. Do you want to try anyway?",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Try Anyway",
              onPress: () => performToggleStatus(admin),
            },
          ]
        );
        return;
      }
    } catch (e) {
      console.warn("Error checking network status:", e);
      // Continue even if network check fails
    }

    // If network seems available, proceed normally
    performToggleStatus(admin);
  };

  // Rewritten performToggleStatus function
  const performToggleStatus = (admin: Admin) => {
    if (!admin) return;

    // Determine if admin is currently active
    const isCurrentlyActive =
      typeof admin.status === "boolean"
        ? admin.status
        : admin.status === "active";

    // Prepare the new status (opposite of current)
    const newStatus = !isCurrentlyActive;

    console.log(
      `Current status: ${admin.status} (${typeof admin.status}), Interpreted as: ${isCurrentlyActive}, New status: ${newStatus}`
    );

    Alert.alert(
      isCurrentlyActive ? "Deactivate Admin" : "Activate Admin",
      `Are you sure you want to ${isCurrentlyActive ? "deactivate" : "activate"} ${admin.name || admin.email}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              setLoadingAction(true);

              console.log("Updating admin status to:", newStatus);

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

              Alert.alert(
                "Success",
                `Admin ${newStatus ? "activated" : "deactivated"} successfully.`
              );
            } catch (error: any) {
              console.error("Error toggling admin status:", error);
              Alert.alert(
                "Error",
                error.message || "Failed to update admin status"
              );
            } finally {
              setLoadingAction(false);
            }
          },
        },
      ]
    );
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
          contentContainerStyle={styles.scrollContent}
        >
          <SuperAdminDetailsSkeleton />
          <View style={styles.buttonContainer}>
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
                  marginTop: 12,
                },
              ]}
            />
          </View>
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
        contentContainerStyle={styles.scrollContent}
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

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.profileHeader}>
              {admin?.profile_picture ? (
                <Avatar.Image
                  size={80}
                  source={{ uri: admin.profile_picture }}
                  style={styles.avatar}
                />
              ) : (
                <Avatar.Text
                  size={80}
                  label={getInitials(admin?.name || "", admin?.email || "")}
                  style={styles.avatar}
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
                  mode="contained-tonal"
                  icon="phone"
                  onPress={() => handleCall(admin.phone_number || "")}
                  style={[
                    styles.contactButton,
                    { backgroundColor: theme.colors.primary, color: "white" },
                  ]}
                  labelStyle={{ color: "white" }}
                >
                  Call
                </Button>

                <Button
                  mode="contained-tonal"
                  icon="email"
                  onPress={() => handleEmail(admin?.email || "")}
                  style={[
                    styles.contactButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
                  labelStyle={{ color: "white" }}
                >
                  Email
                </Button>
              </View>
            )}

            <Divider style={styles.divider} />

            <View style={styles.sectionTitleContainer}>
              <MaterialCommunityIcons
                name="account-details"
                size={24}
                color="rgba(54,105,157,1)"
              />
              <Text style={styles.sectionTitle}>Admin Information</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{admin?.email || "N/A"}</Text>
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
                  ? admin.role.charAt(0).toUpperCase() + admin.role.slice(1)
                  : "Super Admin"}
              </Text>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.sectionTitleContainer}>
              <MaterialCommunityIcons
                name="account-cog"
                size={24}
                color="rgba(54,105,157,1)"
              />
              <Text style={styles.sectionTitle}>Account Details</Text>
            </View>

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
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={() =>
              navigation.navigate("EditSuperAdmin", {
                adminId: admin?.id || "",
              })
            }
            style={[styles.button, { backgroundColor: "rgba(54,105,157,1)" }]}
            disabled={loadingAction || networkStatus === false || !admin}
            labelStyle={{ fontFamily: "Poppins-Medium" }}
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
                  admin &&
                  (typeof admin.status === "boolean"
                    ? admin.status
                    : admin.status === "active")
                    ? theme.colors.error
                    : "rgba(54,105,157,1)",
              },
            ]}
            textColor={
              admin &&
              (typeof admin.status === "boolean"
                ? admin.status
                : admin.status === "active")
                ? theme.colors.error
                : "rgba(54,105,157,1)"
            }
            loading={loadingAction}
            disabled={loadingAction || networkStatus === false || !admin}
            labelStyle={{ fontFamily: "Poppins-Medium" }}
          >
            {admin &&
            (typeof admin.status === "boolean"
              ? admin.status
              : admin.status === "active")
              ? "Deactivate Admin"
              : "Activate Admin"}
          </Button>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader
        title="Admin Details"
        showBackButton={true}
        showHelpButton={true}
        onHelpPress={() => {
          navigation.navigate("Help" as never);
        }}
        showLogo={false}
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    marginBottom: 16,
    elevation: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#f0f0f0",
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  avatar: {
    marginRight: 16,
    backgroundColor: "rgba(54,105,157,0.9)",
  },
  adminName: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#333",
  },
  adminRole: {
    fontSize: 16,
    opacity: 0.7,
    marginVertical: 4,
    color: "rgba(54,105,157,1)",
    fontFamily: "Poppins-Medium",
  },
  contactButtons: {
    flexDirection: "row",
    marginTop: 8,
    marginBottom: 16,
  },
  contactButton: {
    marginRight: 12,
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 0,
    marginLeft: 8,
    color: "#333",
    fontFamily: "Poppins-SemiBold",
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  infoLabel: {
    fontWeight: "500",
    width: 120,
    opacity: 0.7,
  },
  infoValue: {
    flex: 1,
  },
  buttonContainer: {
    marginTop: 8,
  },
  button: {
    marginBottom: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  offlineBanner: {
    backgroundColor: "rgba(255, 59, 48, 0.8)",
    padding: 8,
    alignItems: "center",
  },
  offlineText: {
    color: "white",
    fontWeight: "bold",
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
  },
});

export default SuperAdminDetailsScreen;
