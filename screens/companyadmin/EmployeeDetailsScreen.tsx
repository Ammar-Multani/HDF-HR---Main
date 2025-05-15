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
import {
  CompanyUser,
  UserStatus,
  Gender,
  MaritalStatus,
  IDType,
  EmploymentType,
} from "../../types";

type EmployeeDetailsRouteParams = {
  employeeId: string;
};

type EmployeeNavigationProp = NavigationProp<
  Record<string, object | undefined>
>;

// Skeleton component for loading state
const EmployeeDetailsSkeleton = () => {
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
          <View>
            <SkeletonBlock
              width="70%"
              height={24}
              style={{ marginBottom: 8 }}
            />
            <SkeletonBlock width="50%" height={18} />
          </View>
          <SkeletonBlock width={80} height={24} style={{ borderRadius: 12 }} />
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

        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={styles.infoRow}>
            <SkeletonBlock width={100} height={16} />
            <SkeletonBlock width="50%" height={16} />
          </View>
        ))}

        <Divider style={styles.divider} />

        <SkeletonBlock width="40%" height={20} style={{ marginBottom: 16 }} />

        {[1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={styles.infoRow}>
            <SkeletonBlock width={100} height={16} />
            <SkeletonBlock width="50%" height={16} />
          </View>
        ))}
      </Card.Content>
    </Card>
  );
};

const EmployeeDetailsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<EmployeeNavigationProp>();
  const route =
    useRoute<RouteProp<Record<string, EmployeeDetailsRouteParams>, string>>();
  const { employeeId } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employee, setEmployee] = useState<CompanyUser | null>(null);
  const [networkStatus, setNetworkStatus] = useState<boolean | null>(null);

  // Check network status when screen focuses
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

  const fetchEmployeeDetails = async (isRefreshing = false) => {
    try {
      // Clear any previous errors
      setError(null);

      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Create a unique cache key for this employee
      const cacheKey = `employee_details_${employeeId}`;

      // Force refresh only when explicitly requested through pull-to-refresh
      const forceRefresh = isRefreshing;

      // Define the async function to fetch employee data
      const fetchEmployeeData = async () => {
        const { data, error } = await supabase
          .from("company_user")
          .select("*")
          .eq("id", employeeId)
          .single();

        return { data, error };
      };

      // Use the cached query
      const result = await cachedQuery<any>(fetchEmployeeData, cacheKey, {
        forceRefresh,
        cacheTtl: 10 * 60 * 1000, // 10 minute cache for employee details
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
          result.error.message || "Failed to fetch employee details"
        );
      }

      // Process the data to ensure bank_details is an object
      if (
        result.data &&
        result.data.bank_details &&
        typeof result.data.bank_details === "string"
      ) {
        try {
          result.data.bank_details = JSON.parse(result.data.bank_details);
        } catch (e) {
          console.error("Error parsing bank_details:", e);
          result.data.bank_details = null;
        }
      }

      setEmployee(result.data);
    } catch (error: any) {
      console.error("Error fetching employee details:", error);
      setError(error.message || "Failed to load employee details");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmployeeDetails();

    // Cleanup function
    return () => {
      setEmployee(null);
    };
  }, [employeeId]);

  const onRefresh = () => {
    fetchEmployeeDetails(true);
  };

  const handleToggleStatus = async () => {
    if (!employee) return;

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
              onPress: () => performToggleStatus(employee),
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
    performToggleStatus(employee);
  };

  // Move the actual toggle logic to a separate function
  const performToggleStatus = (employee: CompanyUser) => {
    Alert.alert(
      employee.active_status === UserStatus.ACTIVE
        ? "Deactivate Employee"
        : "Activate Employee",
      `Are you sure you want to ${employee.active_status === UserStatus.ACTIVE ? "deactivate" : "activate"} ${employee.first_name} ${employee.last_name}?`,
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
                employee.active_status === UserStatus.ACTIVE
                  ? UserStatus.INACTIVE
                  : UserStatus.ACTIVE;

              const { error } = await supabase
                .from("company_user")
                .update({ active_status: newStatus })
                .eq("id", employee.id);

              if (error) {
                throw error;
              }

              // Update local state
              setEmployee({
                ...employee,
                active_status: newStatus,
              });

              // Clear the cache for this employee after update
              await clearCache(`employee_details_${employeeId}`);

              // Also clear any employee list caches - using wildcard pattern
              await clearCache(`employees_*`);

              Alert.alert(
                "Success",
                `Employee ${newStatus === UserStatus.ACTIVE ? "activated" : "deactivated"} successfully.`
              );
            } catch (error: any) {
              console.error("Error toggling employee status:", error);
              Alert.alert(
                "Error",
                error.message || "Failed to update employee status"
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

  // Render content based on the current state
  const renderContent = () => {
    // Show no network warning if applicable
    if (networkStatus === false && !loading) {
      return (
        <View style={styles.offlineContainer}>
          <Text style={{ color: theme.colors.error, marginBottom: 16 }}>
            You are currently offline. Some actions will be unavailable.
          </Text>
          {employee ? (
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
              {/* Employee data will be rendered here by the main render function */}
            </ScrollView>
          ) : (
            // No cached data available
            <Button
              mode="contained"
              onPress={() => fetchEmployeeDetails()}
              style={styles.button}
            >
              Retry
            </Button>
          )}
        </View>
      );
    }

    // Show error state
    if (error && !employee) {
      return (
        <View style={styles.errorContainer}>
          <Text style={{ color: theme.colors.error }}>{error}</Text>
          <Button
            mode="contained"
            onPress={() => fetchEmployeeDetails()}
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
    if (loading && !employee) {
      return (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <EmployeeDetailsSkeleton />
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

    // Show "employee not found" state
    if (!employee) {
      return (
        <View style={styles.errorContainer}>
          <Text style={{ color: theme.colors.error }}>Employee not found</Text>
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

    // The employee data is available, render it
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
              <View>
                <Text style={styles.employeeName}>
                  {employee.first_name} {employee.last_name}
                </Text>
                <Text style={styles.jobTitle}>{employee.job_title}</Text>
              </View>
              <StatusBadge status={employee.active_status} />
            </View>

            <View style={styles.contactButtons}>
              <Button
                mode="contained-tonal"
                icon="phone"
                onPress={() => handleCall(employee.phone_number)}
                style={[styles.contactButton, { backgroundColor: theme.colors.primary }]}
              >
                Call
              </Button>

              <Button
                mode="contained-tonal"
                icon="email"
                onPress={() => handleEmail(employee.email)}
                style={[styles.contactButton, { backgroundColor: theme.colors.primary }]}
              >
                Email
              </Button>
            </View>

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>Personal Information</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{employee.email}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{employee.phone_number}</Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date of Birth:</Text>
              <Text style={styles.infoValue}>
                {formatDate(employee.date_of_birth)}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Gender:</Text>
              <Text style={styles.infoValue}>
                {employee.gender && typeof employee.gender === "string"
                  ? employee.gender.charAt(0).toUpperCase() +
                    employee.gender.slice(1)
                  : "N/A"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nationality:</Text>
              <Text style={styles.infoValue}>
                {employee.nationality || "N/A"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Marital Status:</Text>
              <Text style={styles.infoValue}>
                {employee.marital_status &&
                typeof employee.marital_status === "string"
                  ? employee.marital_status.charAt(0).toUpperCase() +
                    employee.marital_status.slice(1).replace("_", " ")
                  : "N/A"}
              </Text>
            </View>

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>Employment Details</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Start Date:</Text>
              <Text style={styles.infoValue}>
                {formatDate(employee.employment_start_date)}
              </Text>
            </View>

            {employee.employment_end_date && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>End Date:</Text>
                <Text style={styles.infoValue}>
                  {formatDate(employee.employment_end_date)}
                </Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Employment Type:</Text>
              <Text style={styles.infoValue}>
                {typeof employee.employment_type === "boolean"
                  ? employee.employment_type
                    ? "Full Time"
                    : "Contract"
                  : employee.employment_type
                    ? employee.employment_type
                        .split("_")
                        .map(
                          (word) => word.charAt(0).toUpperCase() + word.slice(1)
                        )
                        .join(" ")
                    : "N/A"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Workload:</Text>
              <Text style={styles.infoValue}>
                {employee.workload_percentage}%
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Education:</Text>
              <Text style={styles.infoValue}>
                {employee.education || "N/A"}
              </Text>
            </View>

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>Identification</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ID Type:</Text>
              <Text style={styles.infoValue}>
                {employee.id_type && typeof employee.id_type === "string"
                  ? employee.id_type
                      .split("_")
                      .map(
                        (word) => word.charAt(0).toUpperCase() + word.slice(1)
                      )
                      .join(" ")
                  : "N/A"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>AHV Number:</Text>
              <Text style={styles.infoValue}>{employee.ahv_number}</Text>
            </View>

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>Address</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Street:</Text>
              <Text style={styles.infoValue}>
                {employee.address ? (
                  <>
                    {employee.address.line1}
                    {employee.address.line2
                      ? `, ${employee.address.line2}`
                      : ""}
                  </>
                ) : (
                  "N/A"
                )}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>City:</Text>
              <Text style={styles.infoValue}>
                {employee.address ? employee.address.city : "N/A"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>State/Province:</Text>
              <Text style={styles.infoValue}>
                {employee.address ? employee.address.state : "N/A"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Postal Code:</Text>
              <Text style={styles.infoValue}>
                {employee.address ? employee.address.postal_code : "N/A"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Country:</Text>
              <Text style={styles.infoValue}>
                {employee.address ? employee.address.country : "N/A"}
              </Text>
            </View>

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>Bank Details</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Bank Name:</Text>
              <Text style={styles.infoValue}>
                {employee.bank_details
                  ? employee.bank_details.bank_name
                  : "N/A"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Account Number:</Text>
              <Text style={styles.infoValue}>
                {employee.bank_details
                  ? employee.bank_details.account_number
                  : "N/A"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>IBAN:</Text>
              <Text style={styles.infoValue}>
                {employee.bank_details ? employee.bank_details.iban : "N/A"}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>SWIFT Code:</Text>
              <Text style={styles.infoValue}>
                {employee.bank_details
                  ? employee.bank_details.swift_code
                  : "N/A"}
              </Text>
            </View>

            {employee.comments && (
              <>
                <Divider style={styles.divider} />

                <Text style={styles.sectionTitle}>Comments</Text>
                <Text style={styles.comments}>{employee.comments}</Text>
              </>
            )}
          </Card.Content>
        </Card>

        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={() =>
              navigation.navigate("EditEmployee", { employeeId: employee.id })
            }
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
            disabled={loadingAction || networkStatus === false}
          >
            Edit Employee
          </Button>

          <Button
            mode="outlined"
            onPress={handleToggleStatus}
            style={styles.button}
            textColor={
              employee.active_status === UserStatus.ACTIVE
                ? theme.colors.error
                : theme.colors.primary
            }
            loading={loadingAction}
            disabled={loadingAction || networkStatus === false}
          >
            {employee.active_status === UserStatus.ACTIVE
              ? "Deactivate Employee"
              : "Activate Employee"}
          </Button>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader title="Employee Details" showBackButton />
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
    elevation: 2,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  employeeName: {
    fontSize: 22,
    fontWeight: "bold",
  },
  jobTitle: {
    fontSize: 16,
    opacity: 0.7,
    marginTop: 4,
  },
  contactButtons: {
    flexDirection: "row",
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
  comments: {
    fontSize: 16,
    lineHeight: 24,
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

export default EmployeeDetailsScreen;
