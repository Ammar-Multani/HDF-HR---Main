import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Alert,
  AppState,
  AppStateStatus,
  Dimensions,
  Platform,
  Image,
  TouchableOpacity,
  Pressable,
} from "react-native";
import {
  Text,
  Card,
  Button,
  Divider,
  useTheme,
  ActivityIndicator,
  Chip,
  Portal,
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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  supabase,
  cachedQuery,
  clearCache,
  isNetworkAvailable,
} from "../../lib/supabase";
import AppHeader from "../../components/AppHeader";
import StatusBadge from "../../components/StatusBadge";
import { Company, UserStatus, CompanyUser, UserRole } from "../../types";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn } from "react-native-reanimated";

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
    <View style={styles.infoCard}>
      <View style={styles.cardHeader}>
        <SkeletonBlock width="70%" height={24} style={{ marginBottom: 8 }} />
        <SkeletonBlock width={80} height={24} style={{ borderRadius: 12 }} />
      </View>

      <View style={styles.statsGrid}>
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

      <View style={styles.infoGrid}>
        <SkeletonBlock width="40%" height={20} style={{ marginBottom: 16 }} />

        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.infoItem}>
            <SkeletonBlock width={100} height={16} />
            <SkeletonBlock width="50%" height={16} style={{ marginLeft: 16 }} />
          </View>
        ))}
      </View>

      <View style={styles.addressGrid}>
        <SkeletonBlock width="40%" height={20} style={{ marginBottom: 16 }} />

        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.addressItem}>
            <SkeletonBlock width={100} height={16} />
            <SkeletonBlock width="50%" height={16} style={{ marginLeft: 16 }} />
          </View>
        ))}
      </View>

      <View style={styles.stakeholdersGrid}>
        <SkeletonBlock width="40%" height={20} style={{ marginBottom: 16 }} />

        <View style={styles.stakeholdersGrid}>
          {[1, 2, 3].map((i) => (
            <SkeletonBlock
              key={i}
              width={80}
              height={32}
              style={{ margin: 4, borderRadius: 16 }}
            />
          ))}
        </View>
      </View>

      <View style={styles.adminsTable}>
        <SkeletonBlock width="40%" height={20} style={{ marginBottom: 16 }} />

        {[1, 2].map((i) => (
          <View key={i} style={styles.tableRow}>
            <SkeletonBlock width="60%" height={18} />
            <SkeletonBlock
              width={60}
              height={18}
              style={{ borderRadius: 10 }}
            />
          </View>
        ))}
      </View>
    </View>
  );
};

// Add window dimensions hook after imports
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

// Update TooltipText component
const TooltipText = ({
  text,
  numberOfLines = 1,
}: {
  text: string;
  numberOfLines?: number;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<View>(null);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1440);

  // Add window resize listener for screen size
  useEffect(() => {
    const handleResize = () => {
      setIsLargeScreen(window.innerWidth >= 1440);
    };

    if (Platform.OS === "web") {
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  const updateTooltipPosition = () => {
    if (Platform.OS === "web" && containerRef.current && !isLargeScreen) {
      // @ts-ignore - web specific
      const rect = containerRef.current.getBoundingClientRect();
      const windowHeight = window.innerHeight;
      const spaceAbove = rect.top;
      const spaceBelow = windowHeight - rect.bottom;

      // Calculate horizontal position to prevent overflow
      const windowWidth = window.innerWidth;
      let xPos = rect.left;

      // Ensure tooltip doesn't overflow right edge
      if (xPos + 300 > windowWidth) {
        // 300 is max tooltip width
        xPos = windowWidth - 310; // Add some padding
      }

      // Position vertically based on available space
      let yPos;
      if (spaceBelow >= 100) {
        // If enough space below
        yPos = rect.bottom + window.scrollY + 5;
      } else if (spaceAbove >= 100) {
        // If enough space above
        yPos = rect.top + window.scrollY - 5;
      } else {
        // If neither, position it where there's more space
        yPos =
          spaceAbove > spaceBelow
            ? rect.top + window.scrollY - 5
            : rect.bottom + window.scrollY + 5;
      }

      setTooltipPosition({ x: xPos, y: yPos });
    }
  };

  useEffect(() => {
    if (isHovered && !isLargeScreen) {
      updateTooltipPosition();
      // Add scroll and resize listeners
      if (Platform.OS === "web") {
        window.addEventListener("scroll", updateTooltipPosition);
        window.addEventListener("resize", updateTooltipPosition);

        return () => {
          window.removeEventListener("scroll", updateTooltipPosition);
          window.removeEventListener("resize", updateTooltipPosition);
        };
      }
    }
  }, [isHovered, isLargeScreen]);

  if (Platform.OS !== "web" || isLargeScreen) {
    return (
      <Text
        style={styles.tableCell}
        numberOfLines={isLargeScreen ? undefined : numberOfLines}
      >
        {text}
      </Text>
    );
  }

  return (
    <View
      ref={containerRef}
      style={styles.tooltipWrapper}
      // @ts-ignore - web specific props
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Text style={styles.tableCell} numberOfLines={numberOfLines}>
        {text}
      </Text>
      {isHovered && (
        <Portal>
          <View
            style={[
              styles.tooltipContainer,
              {
                position: "absolute",
                left: tooltipPosition.x,
                top: tooltipPosition.y,
              },
            ]}
          >
            <Text style={styles.tooltipContent}>{text}</Text>
          </View>
        </Portal>
      )}
    </View>
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

// Update the CompanyAdmin interface
interface CompanyAdmin {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  role: string;
  active_status: UserStatus;
  job_title?: string;
  created_at: string;
}

const CompanyDetailsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<Record<string, CompanyDetailsRouteParams>, string>>();
  const { t } = useTranslation();
  const dimensions = useWindowDimensions();

  // Store companyId in state to persist through rerenders
  const [persistedCompanyId, setPersistedCompanyId] = useState<string | null>(
    null
  );

  // Get companyId from route params or use persisted value
  const companyId = route.params?.companyId || persistedCompanyId;

  // Update persisted companyId when route params change
  useEffect(() => {
    if (route.params?.companyId) {
      setPersistedCompanyId(route.params.companyId);
    }
  }, [route.params?.companyId]);

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [companyAdmins, setCompanyAdmins] = useState<CompanyAdmin[]>([]);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [activeEmployeeCount, setActiveEmployeeCount] = useState(0);
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

  const fetchCompanyDetails = useCallback(
    async (isRefreshing = false) => {
      if (!companyId) {
        setError(t("superAdmin.companies.invalidCompanyId"));
        setLoading(false);
        return;
      }

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
          try {
            // Fetch company details, admins, and employee counts in parallel
            const [
              companyDetailsResult,
              employeeCountsResult,
              companyAdminsResult,
            ] = await Promise.all([
              // Company details query
              supabase
                .from("company")
                .select(
                  `
                  id, 
                  company_name, 
                  registration_number, 
                  industry_type, 
                  contact_number, 
                  contact_email,
                  address, 
                  active, 
                  vat_type, 
                  stakeholders,
                  created_at
                `
                )
                .eq("id", companyId)
                .single(),

              // Employee counts query - get all employees for this company
              supabase
                .from("company_user")
                .select(
                  `
                  id,
                  active_status
                `,
                  { count: "exact" }
                )
                .eq("company_id", companyId)
                .eq("role", "employee"),

              // Company admins query
              supabase
                .from("company_user")
                .select(
                  `
                  id,
                  first_name,
                  last_name,
                  email,
                  phone_number,
                  role,
                  active_status,
                  job_title,
                  created_at
                `
                )
                .eq("company_id", companyId)
                .eq("role", "admin") // Only get users with role="admin"
                .order("first_name", { ascending: true }),
            ]);

            // Process company details
            let companyData = companyDetailsResult.data;
            let totalEmployeeCount = 0;
            let activeEmployeeCount = 0;

            // Process employee counts
            if (employeeCountsResult.data) {
              totalEmployeeCount = employeeCountsResult.count || 0;
              activeEmployeeCount = employeeCountsResult.data.filter(
                (user: any) => user.active_status === "active"
              ).length;
            }

            // Process company admins
            let processedAdmins: CompanyAdmin[] = [];
            if (companyAdminsResult.data) {
              // Double check to ensure only admin roles are included
              processedAdmins = companyAdminsResult.data
                .filter((admin) => admin.role === "admin") // Extra filter to ensure only admins
                .map((admin) => ({
                  id: admin.id,
                  company_id: companyId,
                  first_name: admin.first_name || "",
                  last_name: admin.last_name || "",
                  email: admin.email || "",
                  phone_number: admin.phone_number,
                  role: "admin",
                  active_status:
                    admin.active_status === "active"
                      ? UserStatus.ACTIVE
                      : UserStatus.INACTIVE,
                  job_title: admin.job_title,
                  created_at: admin.created_at,
                }));
            }

            // Construct a combined result object
            return {
              data: {
                companyDetails: {
                  data: companyData,
                  error: companyDetailsResult.error,
                },
                companyAdmins: {
                  data: processedAdmins,
                  error: companyAdminsResult.error,
                },
                totalEmployees: {
                  count: totalEmployeeCount,
                  error: null,
                },
                activeEmployees: {
                  count: activeEmployeeCount,
                  error: null,
                },
              },
              error:
                companyDetailsResult.error ||
                employeeCountsResult.error ||
                companyAdminsResult.error,
            };
          } catch (error) {
            console.error("Error in optimized company data fetch:", error);
            return { data: null, error };
          }
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
          setError(t("superAdmin.companies.cachedData"));
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
          setCompanyAdmins((companyAdminsResult.data as CompanyAdmin[]) || []);
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
            : t("superAdmin.companies.failedToLoad")
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [companyId, t]
  );

  // Fetch data when companyId changes or component mounts
  useEffect(() => {
    fetchCompanyDetails();
  }, [fetchCompanyDetails]);

  const onRefresh = () => {
    // Always allow refresh attempts - the network check will happen in fetchCompanyDetails
    fetchCompanyDetails(true);
  };

  const handleToggleStatus = async () => {
    if (Platform.OS === "web") {
      setAlertConfig({
        title: company?.active ? "Deactivate Company" : "Activate Company",
        message: company?.active
          ? "Are you sure you want to deactivate this company?"
          : "Are you sure you want to activate this company?",
        onConfirm: async () => {
          await performToggleStatus();
        },
        onCancel: () => setShowAlert(false),
        confirmText: company?.active ? "Deactivate" : "Activate",
        cancelText: "Cancel",
        isDestructive: company?.active ?? false,
      });
      setShowAlert(true);
    } else {
      Alert.alert(
        company?.active ? "Deactivate Company" : "Activate Company",
        company?.active
          ? "Are you sure you want to deactivate this company?"
          : "Are you sure you want to activate this company?",
        [
          {
            text: "Cancel",
            style: "cancel",
          },
          {
            text: company?.active ? "Deactivate" : "Activate",
            style: company?.active ? "destructive" : "default",
            onPress: performToggleStatus,
          },
        ]
      );
    }
  };

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

  // Move the actual toggle logic to a separate function
  const performToggleStatus = async () => {
    if (!company) return;

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

      // Close the alert modal after successful update
      setShowAlert(false);
    } catch (error: any) {
      console.error("Error toggling company status:", error);
      handleError(error);
    } finally {
      setLoadingAction(false);
    }
  };

  const renderStatsCard = () => (
    <View style={styles.statsCard}>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{employeeCount}</Text>
          <Text style={styles.statLabel}>
            {t("superAdmin.companies.totalEmployees")}
          </Text>
          <LinearGradient
            colors={["rgba(59, 130, 246, 0.1)", "rgba(59, 130, 246, 0.05)"]}
            style={styles.statBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statValue}>{activeEmployeeCount}</Text>
          <Text style={styles.statLabel}>
            {t("superAdmin.companies.activeEmployees")}
          </Text>
          <LinearGradient
            colors={["rgba(16, 185, 129, 0.1)", "rgba(16, 185, 129, 0.05)"]}
            style={styles.statBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </View>

        <View style={styles.statItem}>
          <Text style={styles.statValue}>{companyAdmins.length}</Text>
          <Text style={styles.statLabel}>
            {t("superAdmin.companies.admins")}
          </Text>
          <LinearGradient
            colors={["rgba(236, 72, 153, 0.1)", "rgba(236, 72, 153, 0.05)"]}
            style={styles.statBackground}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        </View>
      </View>
    </View>
  );

  const renderCompanyInfo = () => (
    <View style={styles.infoCard}>
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="office-building"
              size={20}
              color="#64748b"
            />
          </View>
          <Text style={styles.cardTitle}>
            {t("superAdmin.companies.companyInformation")}
          </Text>
        </View>
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>
            {t("superAdmin.companies.registrationNumber")}
          </Text>
          <Text style={styles.infoValue}>{company?.registration_number}</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>
            {t("superAdmin.companies.industryType")}
          </Text>
          <Text style={styles.infoValue}>{company?.industry_type}</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>
            {t("superAdmin.companies.contactNumber")}
          </Text>
          <Text style={styles.infoValue}>{company?.contact_number}</Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>
            {t("superAdmin.companies.contactEmail")}
          </Text>
          <Text style={styles.infoValue}>
            {company?.contact_email || t("superAdmin.companies.notProvided")}
          </Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>
            {t("superAdmin.companies.onboardingDate")}
          </Text>
          <Text style={styles.infoValue}>
            {company?.created_at
              ? new Date(company.created_at).toLocaleDateString()
              : "-"}
          </Text>
        </View>

        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>
            {t("superAdmin.companies.vatType")}
          </Text>
          <Text style={styles.infoValue}>{company?.vat_type}</Text>
        </View>
      </View>
    </View>
  );

  const renderAddress = () => (
    <View style={styles.infoCard}>
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="map-marker"
              size={20}
              color="#64748b"
            />
          </View>
          <Text style={styles.cardTitle}>
            {t("superAdmin.companies.address")}
          </Text>
        </View>
      </View>

      <View style={styles.addressGrid}>
        <View style={styles.addressItem}>
          <Text style={styles.infoLabel}>
            {t("superAdmin.companies.street")}
          </Text>
          <Text style={styles.infoValue}>
            {company?.address.line1}
            {company?.address.line2 ? `, ${company.address.line2}` : ""}
          </Text>
        </View>

        <View style={styles.addressItem}>
          <Text style={styles.infoLabel}>{t("superAdmin.companies.city")}</Text>
          <Text style={styles.infoValue}>{company?.address.city}</Text>
        </View>

        <View style={styles.addressItem}>
          <Text style={styles.infoLabel}>
            {t("superAdmin.companies.stateProvince")}
          </Text>
          <Text style={styles.infoValue}>{company?.address.state}</Text>
        </View>

        <View style={styles.addressItem}>
          <Text style={styles.infoLabel}>
            {t("superAdmin.companies.postalCode")}
          </Text>
          <Text style={styles.infoValue}>{company?.address.postal_code}</Text>
        </View>

        <View style={styles.addressItem}>
          <Text style={styles.infoLabel}>
            {t("superAdmin.companies.country")}
          </Text>
          <Text style={styles.infoValue}>{company?.address.country}</Text>
        </View>
      </View>
    </View>
  );

  const renderStakeholders = () => (
    <View style={styles.infoCard}>
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="account-group"
              size={20}
              color="#64748b"
            />
          </View>
          <Text style={styles.cardTitle}>
            {t("superAdmin.companies.stakeholders")}
          </Text>
        </View>
      </View>

      <View style={styles.stakeholdersGrid}>
        {company?.stakeholders && company.stakeholders.length > 0 ? (
          company.stakeholders.map((stakeholder, index) => (
            <View key={index} style={styles.stakeholderCard}>
              <Text style={styles.stakeholderName}>{stakeholder.name}</Text>
              <Text style={styles.stakeholderPercentage}>
                {stakeholder.percentage}%
              </Text>
              <LinearGradient
                colors={["rgba(99, 102, 241, 0.1)", "rgba(99, 102, 241, 0.05)"]}
                style={styles.stakeholderBackground}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>
            {t("superAdmin.companies.noStakeholders")}
          </Text>
        )}
      </View>
    </View>
  );

  const renderAdmins = () => (
    <View style={styles.infoCard}>
      <View style={styles.cardHeader}>
        <View style={styles.headerLeft}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="shield-account"
              size={20}
              color="#64748b"
            />
          </View>
          <Text style={styles.cardTitle}>
            {t("superAdmin.companies.companyAdmins")}
          </Text>
        </View>
      </View>

      {companyAdmins.length > 0 ? (
        <View style={styles.adminsTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Name</Text>
            <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Email</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Phone</Text>
            <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Status</Text>
          </View>

          {companyAdmins.map((admin) => (
            <View key={admin.id} style={styles.tableRow}>
              <Text style={[styles.tableCell, { flex: 2 }]}>
                {admin.first_name && admin.last_name
                  ? `${admin.first_name} ${admin.last_name}`
                  : admin.email}
              </Text>
              <Text style={[styles.tableCell, { flex: 2 }]} numberOfLines={1}>
                {admin.email}
              </Text>
              <Text style={[styles.tableCell, { flex: 1 }]} numberOfLines={1}>
                {admin.phone_number || "-"}
              </Text>
              <View style={[{ flex: 1 }]}>
                <StatusBadge status={admin.active_status} size="small" />
              </View>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.noDataText}>
          {t("superAdmin.companies.noAdmins")}
        </Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <CustomAlert
        visible={showAlert}
        title={alertConfig.title}
        message={alertConfig.message}
        onConfirm={alertConfig.onConfirm}
        onCancel={() => setShowAlert(false)}
        isDestructive={alertConfig.isDestructive}
      />
      <AppHeader
        showLogo={false}
        showBackButton={true}
        title={t("superAdmin.companies.companyDetails")}
        showHelpButton={true}
        absolute={false}
      />

      {networkStatus === false && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>
            {t("superAdmin.companies.currentlyOffline")}
          </Text>
        </View>
      )}

      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
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
          <View style={styles.headerSection}>
            <View style={styles.headerLeft}>
              <Text style={styles.companyName}>{company?.company_name}</Text>
              <StatusBadge
                status={
                  company?.active ? UserStatus.ACTIVE : UserStatus.INACTIVE
                }
                size="large"
              />
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={() =>
                  navigation.navigate("EditCompany", { companyId: company?.id })
                }
              >
                <MaterialCommunityIcons
                  name="pencil"
                  size={20}
                  color="#ffffff"
                />
                <Text style={styles.buttonText}>
                  {t("superAdmin.companies.editCompany")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: company?.active
                      ? "rgba(239, 68, 68, 0.1)" // Subtle red for deactivate
                      : "rgba(16, 185, 129, 0.1)", // Subtle green for activate
                  },
                ]}
                onPress={handleToggleStatus}
              >
                <MaterialCommunityIcons
                  name="power"
                  size={20}
                  color={company?.active ? "#EF4444" : "#10B981"}
                />
                <Text
                  style={[
                    styles.buttonText,
                    { color: company?.active ? "#EF4444" : "#10B981" },
                  ]}
                >
                  {company?.active
                    ? t("superAdmin.companies.deactivateCompany")
                    : t("superAdmin.companies.activateCompany")}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {renderStatsCard()}

          <View style={styles.gridContainer}>
            <View style={styles.gridColumn}>
              {renderCompanyInfo()}
              {renderStakeholders()}
            </View>
            <View style={styles.gridColumn}>
              {renderAddress()}
              {renderAdmins()}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 32,
    alignSelf: "center",
    width: "100%",
  },
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 32,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  headerRight: {
    flexDirection: "row",
    gap: 16,
  },
  companyName: {
    fontSize: Platform.OS === "web" ? 32 : 24,
    fontWeight: "600",
    color: "#1e293b",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 8,
  },
  editButton: {},
  deactivateButton: {},
  activateButton: {},
  buttonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  statsCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 24,
    flexWrap: "wrap",
  },
  statItem: {
    flex: 1,
    minWidth: 200,
    padding: 24,
    borderRadius: 12,
    position: "relative",
    overflow: "hidden",
  },
  statBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
  },
  statValue: {
    fontSize: 36,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 14,
    color: "#64748b",
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
  infoCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    overflow: "hidden",
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
  headerIcon: {
    width: 20,
    height: 20,
    tintColor: "#64748b",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  infoGrid: {
    padding: 24,
    gap: 16,
  },
  infoItem: {
    gap: 4,
  },
  infoLabel: {
    fontSize: 14,
    color: "#64748b",
  },
  infoValue: {
    fontSize: 15,
    color: "#1e293b",
  },
  addressGrid: {
    padding: 24,
    gap: 16,
  },
  addressItem: {
    gap: 4,
  },
  stakeholdersGrid: {
    padding: 24,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  stakeholderCard: {
    padding: 16,
    borderRadius: 12,
    position: "relative",
    overflow: "hidden",
    minWidth: 200,
  },
  stakeholderBackground: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
  },
  stakeholderName: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1e293b",
    marginBottom: 4,
  },
  stakeholderPercentage: {
    fontSize: 14,
    color: "#64748b",
  },
  adminsTable: {
    padding: 24,
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tableHeaderCell: {
    fontSize: 14,
    fontWeight: "500",
    color: "#64748b",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tableCell: {
    fontSize: 14,
    color: "#1e293b",
    textAlign: "left" as const,
  },
  noDataText: {
    padding: 24,
    fontSize: 14,
    color: "#64748b",
    fontStyle: "italic",
    textAlign: "center",
  },
  offlineBanner: {
    backgroundColor: "#ef4444",
    padding: 8,
    alignItems: "center",
  },
  offlineText: {
    color: "#ffffff",
    fontWeight: "500",
  },
  tooltipWrapper: {
    position: "relative",
    flex: 1,
    maxWidth: "100%",
    zIndex: 10,
  },
  tooltipContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    padding: 8,
    marginLeft: 30,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    maxWidth: 300,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 9999,
    ...(Platform.OS === "web"
      ? {
          // @ts-ignore - web specific style
          willChange: "transform",
          // @ts-ignore - web specific style
          isolation: "isolate",
        }
      : {}),
  },
  tooltipContent: {
    color: "#000",
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    lineHeight: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    textAlign: "center",
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

export default CompanyDetailsScreen;
