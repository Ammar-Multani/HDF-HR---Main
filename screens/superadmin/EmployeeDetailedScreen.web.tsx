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
import {
  CompanyUser,
  UserStatus,
  Gender,
  MaritalStatus,
  IDType,
  EmploymentType,
} from "../../types";
import Animated from "react-native-reanimated";
import { FadeIn } from "react-native-reanimated";

type EmployeeDetailsRouteParams = {
  employeeId: string;
  companyId: string;
};

type EmployeeNavigationProp = NavigationProp<
  Record<string, object | undefined>
>;

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
    <View style={modalStyles.modalOverlay}>
      <View style={modalStyles.modalContent}>
        <Text style={modalStyles.modalTitle}>{title}</Text>
        <Text style={modalStyles.modalMessage}>{message}</Text>
        <View style={modalStyles.modalButtons}>
          <TouchableOpacity
            style={[modalStyles.modalButton, modalStyles.modalCancelButton]}
            onPress={onCancel}
          >
            <Text style={modalStyles.modalButtonText}>{cancelText}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              modalStyles.modalButton,
              modalStyles.modalConfirmButton,
              isDestructive && modalStyles.modalDestructiveButton,
            ]}
            onPress={onConfirm}
          >
            <Text
              style={[
                modalStyles.modalButtonText,
                modalStyles.modalConfirmText,
                isDestructive && modalStyles.modalDestructiveText,
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

// Add skeletonStyles for the skeleton component
const skeletonStyles = StyleSheet.create({
  card: {
    marginBottom: 16,
    elevation: 0,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  divider: {
    marginVertical: 16,
  },
});

// Update the EmployeeDetailsSkeleton component
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
    <Card
      style={[skeletonStyles.card, { backgroundColor: theme.colors.surface }]}
    >
      <Card.Content>
        <View style={skeletonStyles.headerRow}>
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

        <Divider style={skeletonStyles.divider} />

        <SkeletonBlock width="40%" height={20} style={{ marginBottom: 16 }} />

        {[1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={styles.infoRow}>
            <SkeletonBlock width={100} height={16} />
            <SkeletonBlock width="50%" height={16} />
          </View>
        ))}

        <Divider style={skeletonStyles.divider} />

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

const EmployeeDetailedScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<EmployeeNavigationProp>();
  const route =
    useRoute<RouteProp<Record<string, EmployeeDetailsRouteParams>, string>>();
  const { employeeId, companyId } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employee, setEmployee] = useState<CompanyUser | null>(null);
  const [companyName, setCompanyName] = useState<string>("Unknown Company");
  const [networkStatus, setNetworkStatus] = useState<boolean | null>(null);
  const dimensions = useWindowDimensions();
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

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

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

  const fetchCompanyName = async () => {
    if (!companyId) return;

    try {
      const { data, error } = await supabase
        .from("company")
        .select("company_name")
        .eq("id", companyId)
        .single();

      if (error) throw error;

      if (data) {
        setCompanyName(data.company_name);
      }
    } catch (error) {
      console.error("Error fetching company name:", error);
    }
  };

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
    fetchCompanyName();

    // Cleanup function
    return () => {
      setEmployee(null);
    };
  }, [employeeId, companyId]);

  const onRefresh = () => {
    fetchEmployeeDetails(true);
    fetchCompanyName();
  };

  const handleToggleStatus = async () => {
    if (!employee) return;

    // First check network availability
    try {
      const isAvailable = await isNetworkAvailable();
      if (!isAvailable) {
        if (Platform.OS === "web") {
          setAlertConfig({
            title: "Network Check",
            message:
              "Your network connection might be limited. Do you want to try anyway?",
            onConfirm: () => {
              setShowAlert(false);
              performToggleStatus(employee);
            },
            onCancel: () => setShowAlert(false),
            confirmText: "Try Anyway",
            cancelText: "Cancel",
            isDestructive: false,
          });
          setShowAlert(true);
        } else {
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
        }
        return;
      }
    } catch (e) {
      console.warn("Error checking network status:", e);
    }

    // If network seems available, proceed with toggle
    if (Platform.OS === "web") {
      setAlertConfig({
        title:
          employee.active_status === UserStatus.ACTIVE
            ? "Deactivate Employee"
            : "Activate Employee",
        message: `Are you sure you want to ${employee.active_status === UserStatus.ACTIVE ? "deactivate" : "activate"} ${employee.first_name} ${employee.last_name}?`,
        onConfirm: async () => {
          await performToggleStatus(employee);
          setShowAlert(false);
        },
        onCancel: () => setShowAlert(false),
        confirmText:
          employee.active_status === UserStatus.ACTIVE
            ? "Deactivate"
            : "Activate",
        cancelText: "Cancel",
        isDestructive: employee.active_status === UserStatus.ACTIVE,
      });
      setShowAlert(true);
    } else {
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
            onPress: () => performToggleStatus(employee),
          },
        ]
      );
    }
  };

  // Update performToggleStatus function
  const performToggleStatus = async (employee: CompanyUser) => {
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

      if (Platform.OS === "web") {
        setAlertConfig({
          title: "Success",
          message: `Employee ${newStatus === UserStatus.ACTIVE ? "activated" : "deactivated"} successfully.`,
          onConfirm: () => setShowAlert(false),
          onCancel: () => setShowAlert(false),
          confirmText: "OK",
          cancelText: "Cancel",
          isDestructive: false,
        });
        setShowAlert(true);
      } else {
        Alert.alert(
          "Success",
          `Employee ${newStatus === UserStatus.ACTIVE ? "activated" : "deactivated"} successfully.`
        );
      }
    } catch (error: any) {
      console.error("Error toggling employee status:", error);
      if (Platform.OS === "web") {
        setAlertConfig({
          title: "Error",
          message: error.message || "Failed to update employee status",
          onConfirm: () => setShowAlert(false),
          onCancel: () => setShowAlert(false),
          confirmText: "OK",
          cancelText: "Cancel",
          isDestructive: false,
        });
        setShowAlert(true);
      } else {
        Alert.alert(
          "Error",
          error.message || "Failed to update employee status"
        );
      }
    } finally {
      setLoadingAction(false);
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
  const getEmployeeInitials = (
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
                    <Text style={styles.cardTitle}>Employee Profile</Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.profileHeader}>
                    <Avatar.Text
                      size={80}
                      label={getEmployeeInitials(
                        employee.first_name,
                        employee.last_name,
                        employee.email
                      )}
                      style={styles.employeeAvatar}
                    />
                    <View>
                      <Text style={styles.employeeName}>
                        {employee.first_name} {employee.last_name}
                      </Text>
                      <Text style={styles.jobTitle}>{employee.job_title}</Text>
                      <View style={styles.companyBadge}>
                        <Text style={styles.companyBadgeText}>
                          {companyName}
                        </Text>
                      </View>
                      <StatusBadge status={employee.active_status} />
                    </View>
                  </View>

                  <View style={styles.contactButtons}>
                    <Button
                      mode="contained"
                      icon="phone"
                      onPress={() => handleCall(employee.phone_number)}
                      style={styles.contactButton}
                      buttonColor={theme.colors.primary}
                    >
                      Call
                    </Button>

                    <Button
                      mode="contained"
                      icon="email"
                      onPress={() => handleEmail(employee.email)}
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
                    <Text style={styles.cardTitle}>Personal Information</Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Email:</Text>
                    <Text style={styles.infoValue}>{employee.email}</Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Phone:</Text>
                    <Text style={styles.infoValue}>
                      {employee.phone_number}
                    </Text>
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
                        icon="briefcase"
                        size={20}
                        iconColor="#64748b"
                        style={styles.headerIcon}
                      />
                    </View>
                    <Text style={styles.cardTitle}>Employment Details</Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
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
                                (word) =>
                                  word.charAt(0).toUpperCase() + word.slice(1)
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
                </View>
              </Surface>

              <Surface style={[styles.detailsCard, { marginTop: 24 }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <View style={styles.iconContainer}>
                      <IconButton
                        icon="card-account-details"
                        size={20}
                        iconColor="#64748b"
                        style={styles.headerIcon}
                      />
                    </View>
                    <Text style={styles.cardTitle}>Identification</Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>ID Type:</Text>
                    <Text style={styles.infoValue}>
                      {employee.id_type && typeof employee.id_type === "string"
                        ? employee.id_type
                            .split("_")
                            .map(
                              (word) =>
                                word.charAt(0).toUpperCase() + word.slice(1)
                            )
                            .join(" ")
                        : "N/A"}
                    </Text>
                  </View>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>AHV Number:</Text>
                    <Text style={styles.infoValue}>{employee.ahv_number}</Text>
                  </View>
                </View>
              </Surface>

              <Surface style={[styles.detailsCard, { marginTop: 24 }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <View style={styles.iconContainer}>
                      <IconButton
                        icon="map-marker"
                        size={20}
                        iconColor="#64748b"
                        style={styles.headerIcon}
                      />
                    </View>
                    <Text style={styles.cardTitle}>Address</Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
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
                </View>
              </Surface>

              {employee.comments && (
                <Surface style={[styles.detailsCard, { marginTop: 24 }]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <View style={styles.iconContainer}>
                        <IconButton
                          icon="comment"
                          size={20}
                          iconColor="#64748b"
                          style={styles.headerIcon}
                        />
                      </View>
                      <Text style={styles.cardTitle}>Comments</Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <Text style={styles.comments}>{employee.comments}</Text>
                  </View>
                </Surface>
              )}

              <View style={styles.bottomBarContent}>
                <View style={styles.actionButtons}>
                  <Button
                    mode="contained"
                    onPress={() =>
                      navigation.navigate("CompanyDetails", {
                        companyId: employee.company_id,
                      })
                    }
                    style={styles.button}
                    disabled={loadingAction || networkStatus === false}
                    buttonColor={theme.colors.primary}
                  >
                    View Company
                  </Button>

                  <Button
                    mode="outlined"
                    onPress={handleToggleStatus}
                    style={[
                      styles.button,
                      {
                        borderColor:
                          employee.active_status === UserStatus.ACTIVE
                            ? theme.colors.error
                            : theme.colors.primary,
                      },
                    ]}
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
              </View>
            </Animated.View>
          </View>
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
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
        title="Employee Details"
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
  employeeAvatar: {
    marginRight: 24,
    backgroundColor: "rgba(76,175,80,0.9)",
  },
  employeeName: {
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
  comments: {
    fontSize: 14,
    color: "#334155",
    fontFamily: "Poppins-Regular",
    lineHeight: 24,
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
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
});

// Add separate modal styles
const modalStyles = StyleSheet.create({
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

export default EmployeeDetailedScreen;
