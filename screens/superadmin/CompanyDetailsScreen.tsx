import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Alert,
  AppState,
  AppStateStatus,
} from "react-native";
import {
  Text,
  Card,
  Button,
  Divider,
  useTheme,
  ActivityIndicator,
  Chip,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  useRoute,
  RouteProp,
  ParamListBase,
  NavigationProp,
  useFocusEffect,
} from "@react-navigation/native";
import {
  supabase,
  cachedQuery,
  clearCache,
  isNetworkAvailable,
} from "../../lib/supabase";
import AppHeader from "../../components/AppHeader";
import StatusBadge from "../../components/StatusBadge";
import { Company, UserStatus, CompanyUser, UserRole } from "../../types";

type CompanyDetailsRouteParams = {
  companyId: string;
};

// Skeleton components for loading state
const CompanyDetailsSkeleton = () => {
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
        <View style={styles.headerRow}>
          <SkeletonBlock width="70%" height={24} style={{ marginBottom: 8 }} />
          <SkeletonBlock width={80} height={24} style={{ borderRadius: 12 }} />
        </View>

        <Divider style={styles.divider} />

        <View style={styles.statsRow}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.statItem}>
              <SkeletonBlock
                width={30}
                height={24}
                style={{ alignSelf: "center", marginBottom: 4 }}
              />
              <SkeletonBlock
                width={70}
                height={14}
                style={{ alignSelf: "center" }}
              />
            </View>
          ))}
        </View>

        <Divider style={styles.divider} />

        <SkeletonBlock width="40%" height={20} style={{ marginBottom: 16 }} />

        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.infoRow}>
            <SkeletonBlock width={100} height={16} />
            <SkeletonBlock width="50%" height={16} style={{ marginLeft: 16 }} />
          </View>
        ))}

        <Divider style={styles.divider} />

        <SkeletonBlock width="40%" height={20} style={{ marginBottom: 16 }} />

        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.infoRow}>
            <SkeletonBlock width={100} height={16} />
            <SkeletonBlock width="50%" height={16} style={{ marginLeft: 16 }} />
          </View>
        ))}

        <Divider style={styles.divider} />

        <SkeletonBlock width="40%" height={20} style={{ marginBottom: 16 }} />

        <View style={styles.stakeholdersContainer}>
          {[1, 2, 3].map((i) => (
            <SkeletonBlock
              key={i}
              width={80}
              height={32}
              style={{ margin: 4, borderRadius: 16 }}
            />
          ))}
        </View>

        <Divider style={styles.divider} />

        <SkeletonBlock width="40%" height={20} style={{ marginBottom: 16 }} />

        {[1, 2].map((i) => (
          <Card key={i} style={{ marginBottom: 8 }}>
            <Card.Content>
              <View style={styles.adminHeader}>
                <SkeletonBlock width="60%" height={18} />
                <SkeletonBlock
                  width={60}
                  height={18}
                  style={{ borderRadius: 10 }}
                />
              </View>
              <SkeletonBlock width="70%" height={14} style={{ marginTop: 8 }} />
              <SkeletonBlock width="50%" height={14} style={{ marginTop: 4 }} />
            </Card.Content>
          </Card>
        ))}
      </Card.Content>
    </Card>
  );
};

const CompanyDetailsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<Record<string, CompanyDetailsRouteParams>, string>>();
  const { companyId } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [companyAdmins, setCompanyAdmins] = useState<CompanyUser[]>([]);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [activeEmployeeCount, setActiveEmployeeCount] = useState(0);
  const [networkStatus, setNetworkStatus] = useState<boolean | null>(null);

  // Check network status when screen focuses - more reliable implementation
  useFocusEffect(
    useCallback(() => {
      const checkNetwork = async () => {
        try {
          const isAvailable = await isNetworkAvailable();
          setNetworkStatus(isAvailable);
        } catch (e) {
          // If there's an error checking network status, assume we're online
          console.warn("Error checking network status:", e);
          setNetworkStatus(true);
        }
      };

      checkNetwork();

      // Also set up AppState listener to recheck when app comes to foreground
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

  const fetchCompanyDetails = async (isRefreshing = false) => {
    try {
      // Clear any previous errors
      setError(null);

      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Create a unique cache key for this company
      const cacheKey = `company_details_${companyId}`;

      // Force refresh only when explicitly requested through pull-to-refresh
      const forceRefresh = isRefreshing;

      // Define the async function to fetch company data
      const fetchCompanyData = async () => {
        // Create multiple queries to run in parallel
        const companyDetailsPromise = supabase
          .from("company")
          .select(
            "id, company_name, registration_number, industry_type, contact_number, address, active, vat_type, stakeholders"
          )
          .eq("id", companyId)
          .single();

        const companyAdminsPromise = supabase
          .from("company_user")
          .select(
            "id, first_name, last_name, email, phone_number, role, active_status"
          )
          .eq("company_id", companyId)
          .eq("role", UserRole.COMPANY_ADMIN)
          .order("first_name", { ascending: true });

        // Optimize employee count queries with limit 0 and count only
        const totalEmployeesPromise = supabase
          .from("company_user")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .limit(0); // Limit 0 is more efficient for count-only queries

        const activeEmployeesPromise = supabase
          .from("company_user")
          .select("id", { count: "exact", head: true })
          .eq("company_id", companyId)
          .eq("active_status", UserStatus.ACTIVE)
          .limit(0); // Limit 0 is more efficient for count-only queries

        // Execute all queries in parallel
        const [
          companyDetailsResult,
          companyAdminsResult,
          totalEmployeesResult,
          activeEmployeesResult,
        ] = await Promise.all([
          companyDetailsPromise,
          companyAdminsPromise,
          totalEmployeesPromise,
          activeEmployeesPromise,
        ]);

        // Construct a combined result object
        return {
          data: {
            companyDetails: companyDetailsResult,
            companyAdmins: companyAdminsResult,
            totalEmployees: totalEmployeesResult,
            activeEmployees: activeEmployeesResult,
          },
          error: null,
        };
      };

      // Use the cached query with enhanced options for large user bases
      const result = await cachedQuery<any>(fetchCompanyData, cacheKey, {
        forceRefresh,
        cacheTtl: 10 * 60 * 1000, // 10 minute cache for company details
        criticalData: true, // Mark as critical data for offline fallback
      });

      // Check if we're using stale data
      if (result.fromCache && result.error) {
        // Show a gentle warning about using stale data
        setError(
          "You're viewing cached data. Some information may be outdated."
        );
      }

      // Safely extract data from the result
      const combinedData = result.data;

      if (!combinedData) {
        throw new Error("Failed to fetch company details");
      }

      // Process company details
      const companyDetailsResult = combinedData.companyDetails;
      if (companyDetailsResult.error) {
        throw new Error(
          `Error fetching company details: ${companyDetailsResult.error.message}`
        );
      }
      setCompany(companyDetailsResult.data as Company);

      // Process company admins
      const companyAdminsResult = combinedData.companyAdmins;
      if (!companyAdminsResult.error) {
        setCompanyAdmins((companyAdminsResult.data as CompanyUser[]) || []);
      } else {
        console.error(
          "Error fetching company admins:",
          companyAdminsResult.error
        );
      }

      // Process employee counts
      const totalEmployeesResult = combinedData.totalEmployees;
      if (!totalEmployeesResult.error) {
        setEmployeeCount(totalEmployeesResult.count || 0);
      } else {
        console.error(
          "Error fetching total employees:",
          totalEmployeesResult.error
        );
      }

      const activeEmployeesResult = combinedData.activeEmployees;
      if (!activeEmployeesResult.error) {
        setActiveEmployeeCount(activeEmployeesResult.count || 0);
      } else {
        console.error(
          "Error fetching active employees:",
          activeEmployeesResult.error
        );
      }
    } catch (error) {
      console.error("Error fetching company details:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to load company details"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCompanyDetails();

    // Cleanup function
    return () => {
      setCompany(null);
      setCompanyAdmins([]);
    };
  }, [companyId]);

  const onRefresh = () => {
    // Always allow refresh attempts - the network check will happen in fetchCompanyDetails
    fetchCompanyDetails(true);
  };

  const handleToggleStatus = async () => {
    if (!company) return;

    // First check network availability, but be more lenient
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
              onPress: () => performToggleStatus(company),
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
    performToggleStatus(company);
  };

  // Move the actual toggle logic to a separate function
  const performToggleStatus = (company: Company) => {
    Alert.alert(
      company.active ? "Deactivate Company" : "Activate Company",
      `Are you sure you want to ${company.active ? "deactivate" : "activate"} ${company.company_name}?`,
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

              const { error } = await supabase
                .from("company")
                .update({ active: !company.active })
                .eq("id", company.id);

              if (error) {
                throw error;
              }

              // Update local state
              setCompany({
                ...company,
                active: !company.active,
              });

              // Clear the cache for this company after update
              await clearCache(`company_details_${companyId}`);

              // Also clear any company list caches - using wildcard pattern
              await clearCache(`companies_*`);

              Alert.alert(
                "Success",
                `Company ${company.active ? "deactivated" : "activated"} successfully.`
              );
            } catch (error: any) {
              console.error("Error toggling company status:", error);
              Alert.alert(
                "Error",
                error.message || "Failed to update company status"
              );
            } finally {
              setLoadingAction(false);
            }
          },
        },
      ]
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
          {company ? (
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
              {/* Rest of your company data display here */}
              {/* ... */}
            </ScrollView>
          ) : (
            // No cached data available
            <Button
              mode="contained"
              onPress={() => fetchCompanyDetails()}
              style={styles.button}
            >
              Retry
            </Button>
          )}
        </View>
      );
    }

    // Show error state
    if (error && !company) {
      return (
        <View style={styles.errorContainer}>
          <Text style={{ color: theme.colors.error }}>{error}</Text>
          <Button
            mode="contained"
            onPress={() => fetchCompanyDetails()}
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
    if (loading && !company) {
      return (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <CompanyDetailsSkeleton />
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

    // Show "company not found" state
    if (!company) {
      return (
        <View style={styles.errorContainer}>
          <Text style={{ color: theme.colors.error }}>Company not found</Text>
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

    // Show actual company data
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
            <View style={styles.headerRow}>
              <Text style={styles.companyName}>{company.company_name}</Text>
              <StatusBadge
                status={
                  company.active ? UserStatus.ACTIVE : UserStatus.INACTIVE
                }
              />
            </View>

            <Divider style={styles.divider} />

            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{employeeCount}</Text>
                <Text style={styles.statLabel}>Total Employees</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statValue}>{activeEmployeeCount}</Text>
                <Text style={styles.statLabel}>Active Employees</Text>
              </View>

              <View style={styles.statItem}>
                <Text style={styles.statValue}>{companyAdmins.length}</Text>
                <Text style={styles.statLabel}>Admins</Text>
              </View>
            </View>

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>Company Information</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Registration Number:</Text>
              <Text style={styles.infoValue}>
                {company.registration_number}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Industry Type:</Text>
              <Text style={styles.infoValue}>{company.industry_type}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Contact Number:</Text>
              <Text style={styles.infoValue}>{company.contact_number}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>VAT Type:</Text>
              <Text style={styles.infoValue}>{company.vat_type}</Text>
            </View>

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>Address</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Street:</Text>
              <Text style={styles.infoValue}>
                {company.address.line1}
                {company.address.line2 ? `, ${company.address.line2}` : ""}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>City:</Text>
              <Text style={styles.infoValue}>{company.address.city}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>State/Province:</Text>
              <Text style={styles.infoValue}>{company.address.state}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Postal Code:</Text>
              <Text style={styles.infoValue}>
                {company.address.postal_code}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Country:</Text>
              <Text style={styles.infoValue}>{company.address.country}</Text>
            </View>

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>Stakeholders</Text>

            <View style={styles.stakeholdersContainer}>
              {company.stakeholders && company.stakeholders.length > 0 ? (
                company.stakeholders.map((stakeholder, index) => (
                  <Chip
                    key={index}
                    style={styles.stakeholderChip}
                    mode="outlined"
                  >
                    {stakeholder.name} ({stakeholder.percentage}%)
                  </Chip>
                ))
              ) : (
                <Text style={{ fontStyle: "italic", opacity: 0.7 }}>
                  No stakeholders found
                </Text>
              )}
            </View>

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>Company Admins</Text>

            {companyAdmins.length > 0 ? (
              companyAdmins.map((admin) => (
                <Card key={admin.id} style={styles.adminCard}>
                  <Card.Content>
                    <View style={styles.adminHeader}>
                      <Text style={styles.adminName}>
                        {admin.first_name && admin.last_name
                          ? `${admin.first_name} ${admin.last_name}`
                          : admin.email}
                      </Text>
                      <StatusBadge status={admin.active_status} size="small" />
                    </View>
                    <Text style={styles.adminEmail}>{admin.email}</Text>
                    {admin.phone_number && (
                      <Text style={styles.adminPhone}>
                        {admin.phone_number}
                      </Text>
                    )}
                  </Card.Content>
                </Card>
              ))
            ) : (
              <Text style={styles.noAdminsText}>No company admins found</Text>
            )}
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={() => {
              // @ts-ignore - Navigation typing is complex but this works
              navigation.navigate("EditCompany", { companyId: company.id });
            }}
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            disabled={loadingAction || networkStatus === false}
          >
            Edit Company
          </Button>

          <Button
            mode="outlined"
            onPress={handleToggleStatus}
            style={styles.button}
            textColor={
              company.active ? theme.colors.error : theme.colors.primary
            }
            loading={loadingAction}
            disabled={loadingAction || networkStatus === false}
          >
            {company.active ? "Deactivate Company" : "Activate Company"}
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
        showLogo={false}
        showBackButton={true}
        title="Company Details"
        showHelpButton={true}
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
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  companyName: {
    fontSize: 22,
    fontWeight: "bold",
    flex: 1,
  },
  divider: {
    marginVertical: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: "center",
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
  stakeholdersContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 8,
  },
  stakeholderChip: {
    margin: 4,
  },
  adminCard: {
    marginBottom: 8,
  },
  adminHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  adminName: {
    fontSize: 16,
    fontWeight: "500",
  },
  adminEmail: {
    opacity: 0.7,
    marginTop: 4,
  },
  adminPhone: {
    opacity: 0.7,
    marginTop: 2,
  },
  noAdminsText: {
    fontStyle: "italic",
    opacity: 0.7,
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

export default CompanyDetailsScreen;
