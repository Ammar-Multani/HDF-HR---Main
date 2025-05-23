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

        <Divider style={styles.divider} />

        <SkeletonBlock width="40%" height={20} style={{ marginBottom: 16 }} />

        {[1, 2, 3, 4, 5].map((i) => (
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

const CompanyAdminDetailsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<AdminNavigationProp>();
  const route =
    useRoute<
      RouteProp<Record<string, CompanyAdminDetailsRouteParams>, string>
    >();
  const { adminId, adminType } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [admin, setAdmin] = useState<CompanyUser | null>(null);
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

  const handleToggleStatus = async () => {
    if (!admin) return;

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

  // Move the actual toggle logic to a separate function
  const performToggleStatus = (admin: CompanyUser) => {
    if (!admin) return;

    const currentStatus =
      admin.active_status === "active" ? "active" : "inactive";

    Alert.alert(
      currentStatus === "active" ? "Deactivate Admin" : "Activate Admin",
      `Are you sure you want to ${
        currentStatus === "active" ? "deactivate" : "activate"
      } ${admin.first_name} ${admin.last_name}?`,
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

              const newStatus =
                currentStatus === "active" ? "inactive" : "active";

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

              Alert.alert(
                "Success",
                `Admin ${
                  newStatus === "active" ? "activated" : "deactivated"
                } successfully.`
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
          contentContainerStyle={styles.scrollContent}
        >
          <CompanyAdminDetailsSkeleton />
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
                  mode="contained-tonal"
                  icon="phone"
                  onPress={() => handleCall(admin.phone_number || "")}
                  style={[
                    styles.contactButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
                  labelStyle={{ color: "white" }}
                >
                  Call
                </Button>
              )}

              <Button
                mode="contained-tonal"
                icon="email"
                onPress={() => handleEmail(admin ? admin.email : "")}
                style={[
                  styles.contactButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                labelStyle={{ color: "white" }}
              >
                Email
              </Button>
            </View>

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>Admin Information</Text>

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
                {(admin && admin.company?.company_name) || "Unknown Company"}
              </Text>
            </View>

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>Account Details</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Created On:</Text>
              <Text style={styles.infoValue}>
                {admin ? formatDate(admin.created_at) : "N/A"}
              </Text>
            </View>
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={() =>
              navigation.navigate("EditCompanyAdmin", {
                adminId: admin?.id || "",
              })
            }
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            disabled={loadingAction || networkStatus === false || !admin}
          >
            Edit Admin
          </Button>

          <Button
            mode="outlined"
            onPress={handleToggleStatus}
            style={styles.button}
            textColor={
              admin && admin.active_status === "active"
                ? theme.colors.error
                : theme.colors.primary
            }
            loading={loadingAction}
            disabled={loadingAction || networkStatus === false || !admin}
          >
            {admin && admin.active_status === "active"
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
        title="Company Admin Details"
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
  },
  profileHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  avatar: {
    marginRight: 16,
  },
  companyAdminAvatar: {
    marginRight: 16,
    backgroundColor: "rgba(140,82,255,0.9)",
  },
  adminName: {
    fontSize: 22,
    fontWeight: "bold",
  },
  jobTitle: {
    fontSize: 16,
    opacity: 0.7,
    marginVertical: 4,
  },
  companyBadge: {
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginBottom: 8,
  },
  companyBadgeText: {
    color: "#616161",
    fontSize: 12,
    fontFamily: "Poppins-Regular",
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
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

export default CompanyAdminDetailsScreen;
