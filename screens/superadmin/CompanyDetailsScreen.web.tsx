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

const CompanyDetailsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const route =
    useRoute<RouteProp<Record<string, CompanyDetailsRouteParams>, string>>();
  const { companyId } = route.params;
  const { t } = useTranslation();
  const dimensions = useWindowDimensions();

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

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
        try {
          // Optimize by using a single combined query to fetch all details
          // This reduces the number of network requests dramatically
          const companyDetailsPromise = supabase
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
              created_at,
              company_user!company_id (
                id, 
                first_name, 
                last_name, 
                email, 
                phone_number, 
                role, 
                active_status
              )
            `
            )
            .eq("id", companyId)
            .single();

          // If we need to optimize for mobile performance, we can still split this
          // into two separate queries - one for company details and one for related data
          const countPromise = supabase.rpc("get_company_counts", {
            company_id: companyId,
          });

          // Execute queries in parallel
          const [companyDetailsResult, countResult] = await Promise.all([
            companyDetailsPromise,
            countPromise,
          ]);

          // Process company details and related records
          let companyData = companyDetailsResult.data;
          let companyAdmins: CompanyUser[] = [];
          let totalEmployeeCount = 0;
          let activeEmployeeCount = 0;

          if (companyData) {
            // Extract company admins from the nested company_user data
            if (companyData.company_user) {
              // Safely cast to CompanyUser[] if the structure matches
              const users = companyData.company_user as CompanyUser[];
              companyAdmins = users
                .filter((user) => user.role === UserRole.COMPANY_ADMIN)
                .sort((a, b) => a.first_name.localeCompare(b.first_name));

              // Use optional chaining to avoid TypeScript errors when deleting property
              // @ts-ignore - we need to remove this property but TypeScript doesn't like it
              if (companyData.company_user) delete companyData.company_user;
            }
          }

          // Extract counts from the RPC call
          if (countResult.data) {
            totalEmployeeCount = countResult.data.total_count || 0;
            activeEmployeeCount = countResult.data.active_count || 0;
          }

          // Construct a combined result object in the expected format
          return {
            data: {
              companyDetails: {
                data: companyData,
                error: companyDetailsResult.error,
              },
              companyAdmins: {
                data: companyAdmins,
                error: null,
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
            error: companyDetailsResult.error || countResult.error,
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
          t("superAdmin.companies.networkCheck"),
          t("superAdmin.companies.limitedConnection"),
          [
            { text: t("superAdmin.profile.cancel"), style: "cancel" },
            {
              text: t("superAdmin.companies.tryAnyway"),
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
      company.active
        ? t("superAdmin.companies.deactivateCompany")
        : t("superAdmin.companies.activateCompany"),
      t("superAdmin.companies.confirmToggleStatus", {
        action: company.active
          ? t("superAdmin.companies.deactivate")
          : t("superAdmin.companies.activate"),
        name: company.company_name,
      }),
      [
        {
          text: t("superAdmin.profile.cancel"),
          style: "cancel",
        },
        {
          text: t("common.confirm"),
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
                t("common.success"),
                t("superAdmin.companies.statusUpdateSuccess", {
                  action: company.active
                    ? t("superAdmin.companies.deactivated")
                    : t("superAdmin.companies.activated"),
                })
              );
            } catch (error: any) {
              console.error("Error toggling company status:", error);
              Alert.alert(
                t("common.error"),
                error.message || t("superAdmin.companies.statusUpdateFailed")
              );
            } finally {
              setLoadingAction(false);
            }
          },
        },
      ]
    );
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
              <Text style={[styles.tableCell, { flex: 2 }]}>{admin.email}</Text>
              <Text style={[styles.tableCell, { flex: 1 }]}>
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
              status={company?.active ? UserStatus.ACTIVE : UserStatus.INACTIVE}
              size="large"
            />
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() =>
                navigation.navigate("EditCompany", { companyId: company?.id })
              }
            >
              <MaterialCommunityIcons name="pencil" size={20} color="#ffffff" />
              <Text style={styles.buttonText}>
                {t("superAdmin.companies.editCompany")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.actionButton,
                company?.active
                  ? styles.deactivateButton
                  : styles.activateButton,
              ]}
              onPress={handleToggleStatus}
            >
              <MaterialCommunityIcons name="power" size={20} color="#ffffff" />
              <Text style={styles.buttonText}>
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
    borderRadius: 8,
    gap: 8,
  },
  editButton: {
    backgroundColor: "#3b82f6",
  },
  deactivateButton: {
    backgroundColor: "#ef4444",
  },
  activateButton: {
    backgroundColor: "#10b981",
  },
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
});

export default CompanyDetailsScreen;
