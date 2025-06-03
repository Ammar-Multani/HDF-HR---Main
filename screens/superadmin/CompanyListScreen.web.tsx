import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  ScrollView,
  Platform,
  Dimensions,
  Pressable,
  PressableStateCallbackType,
} from "react-native";
import {
  Card,
  Searchbar,
  useTheme,
  FAB,
  Divider,
  Banner,
  IconButton,
  Chip,
  Portal,
  Modal,
  Menu,
  RadioButton,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
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
import EmptyState from "../../components/EmptyState";
import StatusBadge from "../../components/StatusBadge";
import { Company, UserStatus } from "../../types";
import Text from "../../components/Text";
import { globalStyles } from "../../utils/globalStyles";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { formatDate } from "../../utils/dateUtils";
import FilterModal from "../../components/FilterModal";
import {
  FilterSection,
  RadioFilterGroup,
  FilterDivider,
  PillFilterGroup,
} from "../../components/FilterSections";

// Add TooltipText component after imports and before other components
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

  const updateTooltipPosition = () => {
    if (Platform.OS === "web" && containerRef.current) {
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
    if (isHovered) {
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
  }, [isHovered]);

  if (Platform.OS !== "web") {
    return (
      <Text style={styles.tableCellText} numberOfLines={numberOfLines}>
        {text}
      </Text>
    );
  }

  return (
    <View
      ref={containerRef}
      style={styles.tooltipContainer}
      // @ts-ignore - web specific props
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Text style={styles.tableCellText} numberOfLines={numberOfLines}>
        {text}
      </Text>
      {isHovered && (
        <Portal>
          <View
            style={[
              styles.tooltip,
              {
                position: "absolute",
                left: tooltipPosition.x,
                top: tooltipPosition.y,
              },
            ]}
          >
            <Text style={styles.tooltipText}>{text}</Text>
          </View>
        </Portal>
      )}
    </View>
  );
};

// Add Shimmer component after TooltipText component
interface ShimmerProps {
  width: number | string;
  height: number;
  style?: any;
}

const Shimmer: React.FC<ShimmerProps> = ({ width, height, style }) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: withRepeat(
            withSequence(
              withTiming(typeof width === "number" ? -width : -200, {
                duration: 800,
              }),
              withTiming(typeof width === "number" ? width : 200, {
                duration: 800,
              })
            ),
            -1
          ),
        },
      ],
    };
  });

  return (
    <View
      style={[
        {
          width,
          height,
          backgroundColor: "#E8E8E8",
          overflow: "hidden",
          borderRadius: 4,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            width: "100%",
            height: "100%",
            position: "absolute",
            backgroundColor: "transparent",
          },
          animatedStyle,
        ]}
      >
        <LinearGradient
          colors={["transparent", "rgba(255, 255, 255, 0.4)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: "100%", height: "100%" }}
        />
      </Animated.View>
    </View>
  );
};

// Component for skeleton loading UI
const CompanyItemSkeleton = () => {
  return (
    <Card
      style={[
        styles.card,
        {
          backgroundColor: "#FFFFFF",
          shadowColor: "transparent",
        },
      ]}
      elevation={0}
    >
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Shimmer width={180} height={16} style={{ marginBottom: 8 }} />
          </View>
          <Shimmer width={80} height={24} style={{ borderRadius: 12 }} />
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailItem}>
            <Shimmer width={100} height={14} style={{ marginRight: 8 }} />
            <Shimmer width={150} height={14} />
          </View>
          <View style={styles.detailItem}>
            <Shimmer width={100} height={14} style={{ marginRight: 8 }} />
            <Shimmer width={120} height={14} />
          </View>
          <View style={styles.detailItem}>
            <Shimmer width={100} height={14} style={{ marginRight: 8 }} />
            <Shimmer width={140} height={14} />
          </View>
          <View style={styles.detailItem}>
            <Shimmer width={100} height={14} style={{ marginRight: 8 }} />
            <Shimmer width={160} height={14} />
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

const CompanyListScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { t } = useTranslation();
  const [windowDimensions, setWindowDimensions] = useState({
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  });

  // Add window resize listener
  useEffect(() => {
    if (Platform.OS === "web") {
      const handleResize = () => {
        setWindowDimensions({
          width: Dimensions.get("window").width,
          height: Dimensions.get("window").height,
        });
      };

      window.addEventListener("resize", handleResize);

      // Cleanup
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // Calculate responsive breakpoints
  const isLargeScreen = windowDimensions.width >= 1440;
  const isMediumScreen =
    windowDimensions.width >= 768 && windowDimensions.width < 1440;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCompanies, setFilteredCompanies] = useState<Company[]>([]);
  const [page, setPage] = useState(0);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [networkStatus, setNetworkStatus] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const PAGE_SIZE = 10;

  // Filter state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [appliedFilters, setAppliedFilters] = useState<{
    status: string | null;
    sortOrder: string;
  }>({
    status: null,
    sortOrder: "desc",
  });

  // Check network status when screen focuses
  useFocusEffect(
    useCallback(() => {
      const checkNetwork = async () => {
        const isAvailable = await isNetworkAvailable();
        setNetworkStatus(isAvailable);
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

  // Clear errors when network is restored
  useEffect(() => {
    if (networkStatus === true && error && error.includes("offline")) {
      setError(null);
    }
  }, [networkStatus, error]);

  const fetchCompanies = async (refresh = false) => {
    try {
      // Clear any previous errors
      setError(null);

      if (refresh) {
        setPage(0);
        setHasMoreData(true);

        // Only show refreshing indicator when explicitly requested via pull-to-refresh
        // or when searching, but not during initial load
        if (page > 0 || searchQuery.trim() !== "") {
          setRefreshing(true);
        } else {
          // For initial load, we want the skeleton loader instead of the refresh indicator
          setRefreshing(false);
        }
      } else if (!refresh && page > 0) {
        setLoadingMore(true);
      }

      // Generate a cache key based on search query and pagination
      const cacheKey = `companies_${searchQuery.trim()}_page${page}_size${PAGE_SIZE}_status${appliedFilters.status}_sort${appliedFilters.sortOrder}`;

      // Only force refresh when explicitly requested
      const forceRefresh = refresh;

      const currentPage = refresh ? 0 : page;
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Modified network check logic - only prevent refresh if DEFINITELY offline
      // This fixes false "offline" errors
      const networkAvailable = await isNetworkAvailable();
      if (!networkAvailable && refresh) {
        console.log(
          "Network appears to be offline, but still attempting fetch"
        );
        // We'll still try the fetch but prepare for potential errors
      }

      // Use cached query implementation with proper typing
      const fetchData = async () => {
        let query = supabase.from("company").select(
          // Select only the fields needed for the list view
          "id, company_name, registration_number, industry_type, contact_number, contact_email, active, created_at",
          { count: "exact" } // Get exact count for better pagination
        );

        // Apply status filter if set
        if (appliedFilters.status === "active") {
          query = query.eq("active", true);
        } else if (appliedFilters.status === "inactive") {
          query = query.eq("active", false);
        }

        // Apply optimization: use text_search for better performance when searching
        if (searchQuery.trim() !== "") {
          // Better performance using the pg_trgm index we've added
          if (searchQuery.length > 2) {
            query = query.or(
              `company_name.ilike.%${searchQuery.toLowerCase()}%,registration_number.ilike.%${searchQuery.toLowerCase()}%,industry_type.ilike.%${searchQuery.toLowerCase()}%,contact_email.ilike.%${searchQuery.toLowerCase()}%,contact_number.ilike.%${searchQuery.toLowerCase()}%`
            );
          } else {
            // For very short queries, use exact matching for better performance
            query = query.or(
              `company_name.ilike.${searchQuery.toLowerCase()}%,registration_number.ilike.${searchQuery.toLowerCase()}%,industry_type.ilike.${searchQuery.toLowerCase()}%,contact_email.ilike.${searchQuery.toLowerCase()}%,contact_number.ilike.${searchQuery.toLowerCase()}%`
            );
          }
        }

        // Apply sorting based on the selected sort order
        query = query
          .order("created_at", {
            ascending: appliedFilters.sortOrder === "asc",
          })
          .range(from, to);

        const result = await query;
        return result;
      };

      const result = await cachedQuery<any>(fetchData, cacheKey, {
        forceRefresh,
        criticalData: true, // Mark as critical data that should be available offline
      });

      // Check if we're using stale data
      if (result.fromCache && result.error) {
        // Show a gentle warning about using stale data
        setError(t("superAdmin.companies.cachedData"));
      }

      const { data, error } = result;
      // Get count from the Supabase response metadata
      const count = result.data?.length ? (result as any).count : 0;

      if (error && !result.fromCache) {
        console.error("Error fetching companies:", error);

        // Check if it's a network error
        if (
          error.message &&
          (error.message.includes("network") ||
            error.message.includes("connection") ||
            error.message.includes("offline"))
        ) {
          // This is likely a network error - update network status
          setNetworkStatus(false);
          throw new Error(
            "Network connection issue. Check your internet connection."
          );
        } else {
          throw new Error(error.message || "Failed to fetch companies");
        }
      }

      // If we got here, we're definitely online
      if (networkStatus === false) {
        setNetworkStatus(true);
      }

      // Use the count metadata for pagination (if available)
      if (count !== undefined) {
        setTotalCount(count);
        setHasMoreData(from + (data?.length || 0) < count);
      } else if (data && data.length < PAGE_SIZE) {
        setHasMoreData(false);
      }

      const typedData = (data as Company[]) || [];

      if (refresh || currentPage === 0) {
        setCompanies(typedData);
        setFilteredCompanies(typedData);
      } else {
        setCompanies((prevCompanies) => [...prevCompanies, ...typedData]);
        setFilteredCompanies((prevCompanies) => [
          ...prevCompanies,
          ...typedData,
        ]);
      }
    } catch (error) {
      console.error("Error fetching companies:", error);
      if (!networkStatus) {
        setError(t("common.offline"));
      } else {
        setError(
          error instanceof Error ? error.message : "Failed to load companies"
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    // Start fetching immediately, but don't show a full-screen loader
    setLoading(true);
    setRefreshing(false); // Ensure refresh indicator is not shown on initial load
    fetchCompanies(true);
  }, []);

  useEffect(() => {
    // Skip this effect on initial render when searchQuery is empty
    if (searchQuery === "" && !refreshing) {
      return;
    }

    // Clear the timeout on unmount
    let debounceTimeout: NodeJS.Timeout;

    // Only fetch when a search query is entered or cleared
    if (searchQuery.trim() === "" || searchQuery.length > 0) {
      // Only show refresh indicator when actively searching
      if (searchQuery.length > 0) {
        setRefreshing(true);
      } else {
        // For empty search, don't show the full refresh indicator
        setRefreshing(false);
      }

      setLoading(false);
      setLoadingMore(false);

      // Clear any existing searches from cache when search query changes
      // This ensures we don't show stale results when searching
      if (searchQuery.trim() !== "") {
        clearCache(`companies_${searchQuery.trim()}`);
      }

      // Use different debounce times based on query length
      const debounceTime = searchQuery.length < 3 ? 300 : 500;

      debounceTimeout = setTimeout(() => {
        // Don't try to search when offline
        if (networkStatus === false && searchQuery.trim() !== "") {
          setError(t("common.searchUnavailable"));
          setRefreshing(false);
          return;
        }

        fetchCompanies(true);
      }, debounceTime);
    }

    return () => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
    };
  }, [searchQuery, networkStatus]);

  const loadMoreCompanies = () => {
    if (!loading && !loadingMore && hasMoreData && networkStatus !== false) {
      setPage((prevPage) => prevPage + 1);
      fetchCompanies();
    }
  };

  const onRefresh = () => {
    if (networkStatus === false) {
      setError(t("superAdmin.dashboard.offline"));
      return;
    }

    // Explicitly set refreshing to true for pull-to-refresh
    setRefreshing(true);

    // Use a slight delay to ensure the refreshing indicator appears
    setTimeout(() => {
      fetchCompanies(true);
    }, 100);
  };

  const renderCompanyItem = ({ item }: { item: Company }) => {
    const { i18n, t } = useTranslation();

    return (
      <TouchableOpacity
        onPress={() => {
          navigation.navigate("CompanyDetails", { companyId: item.id });
        }}
      >
        <Card
          style={[
            styles.card,
            {
              backgroundColor: "#FFFFFF",
              shadowColor: "transparent",
            },
          ]}
          elevation={0}
        >
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text variant="medium" style={styles.detailLabel}>
                {t("superAdmin.companies.company")}
              </Text>
              <Text>:</Text>
              <Text
                variant="regular"
                style={styles.companyName}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.company_name}
              </Text>
              <StatusBadge
                status={item.active ? UserStatus.ACTIVE : UserStatus.INACTIVE}
              />
            </View>

            <View style={styles.cardDetails}>
              <View style={styles.detailItem}>
                <Text variant="medium" style={styles.detailLabel}>
                  {t("superAdmin.companies.registration")}
                </Text>
                <Text style={styles.detailValue}>
                  : {item.registration_number || "-"}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text variant="medium" style={styles.detailLabel}>
                  {t("superAdmin.companies.industry")}
                </Text>
                <Text style={styles.detailValue}>
                  : {item.industry_type || "-"}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text variant="medium" style={styles.detailLabel}>
                  {t("superAdmin.companies.onboardingDate")}
                </Text>
                <Text style={styles.detailValue}>
                  :{" "}
                  {item.created_at
                    ? formatDate(item.created_at, {
                        type: "long",
                        locale: i18n.language,
                        t,
                      })
                    : "-"}
                </Text>
              </View>

              <View style={styles.detailItem}>
                <Text variant="medium" style={styles.detailLabel}>
                  {t("superAdmin.companies.contactEmail")}
                </Text>
                <Text style={styles.detailValue}>
                  : {item.contact_email || "-"}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  // Add table header component
  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          {t("superAdmin.companies.company")}
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          {t("superAdmin.companies.registration")}
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          {t("superAdmin.companies.industry")}
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          {t("superAdmin.companies.onboardingDate")}
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          {t("superAdmin.companies.status")}
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          {t("superAdmin.companies.actions")}
        </Text>
      </View>
    </View>
  );

  // Update the TableRow component to use TooltipText
  const TableRow = ({ item }: { item: Company }) => {
    const { i18n, t } = useTranslation();

    return (
      <Pressable
        onPress={() => {
          navigation.navigate("CompanyDetails", { companyId: item.id });
        }}
        style={({ pressed }: PressableStateCallbackType) => [
          styles.tableRow,
          pressed && { backgroundColor: "#f8fafc" },
        ]}
      >
        <View style={styles.tableCell}>
          <TooltipText text={item.company_name} />
        </View>
        <View style={styles.tableCell}>
          <TooltipText text={item.registration_number || "-"} />
        </View>
        <View style={styles.tableCell}>
          <TooltipText text={item.industry_type || "-"} />
        </View>
        <View style={styles.tableCell}>
          <TooltipText
            text={
              item.created_at
                ? formatDate(item.created_at, {
                    type: "long",
                    locale: i18n.language,
                    t,
                  })
                : "-"
            }
          />
        </View>
        <View style={styles.tableCell}>
          <StatusBadge
            status={item.active ? UserStatus.ACTIVE : UserStatus.INACTIVE}
          />
        </View>
        <View style={styles.actionCell}>
          <IconButton
            icon="pencil"
            size={20}
            onPress={(e) => {
              e.stopPropagation();
              navigation.navigate("EditCompany", { companyId: item.id });
            }}
            style={styles.actionIcon}
          />
          <IconButton
            icon="eye"
            size={20}
            onPress={(e) => {
              e.stopPropagation();
              navigation.navigate("CompanyDetails", { companyId: item.id });
            }}
            style={styles.actionIcon}
          />
        </View>
      </Pressable>
    );
  };

  const renderContent = () => {
    // Show empty state when no results and not loading
    if (filteredCompanies.length === 0 && !loading && !refreshing) {
      return (
        <EmptyState
          icon="domain-off"
          title={t("superAdmin.companies.noCompanies")}
          message={
            searchQuery
              ? t("superAdmin.companies.noCompaniesSearch") +
                (searchQuery.length < 3
                  ? " " + t("superAdmin.companies.typeMoreChars")
                  : "")
              : t("superAdmin.companies.noCompaniesYet")
          }
          buttonTitle={
            searchQuery
              ? t("common.clearSearch")
              : t("superAdmin.companies.addCompany")
          }
          onButtonPress={() => {
            if (searchQuery) {
              setSearchQuery("");
            } else {
              navigation.navigate("CreateCompany");
            }
          }}
        />
      );
    }

    // Show skeleton loaders when initially loading
    if (loading && filteredCompanies.length === 0) {
      if (isMediumScreen || isLargeScreen) {
        return (
          <View style={styles.tableContainer}>
            <TableHeader />
            {Array(5)
              .fill(0)
              .map((_, index) => (
                <View key={`skeleton-${index}`} style={styles.tableRow}>
                  <View style={styles.tableCell}>
                    <Shimmer width={160} height={16} />
                  </View>
                  <View style={styles.tableCell}>
                    <Shimmer width={120} height={16} />
                  </View>
                  <View style={styles.tableCell}>
                    <Shimmer width={140} height={16} />
                  </View>
                  <View style={styles.tableCell}>
                    <Shimmer width={100} height={16} />
                  </View>
                  <View style={styles.tableCell}>
                    <Shimmer
                      width={80}
                      height={24}
                      style={{ borderRadius: 12 }}
                    />
                  </View>
                  <View style={styles.actionCell}>
                    <Shimmer
                      width={40}
                      height={40}
                      style={{ borderRadius: 20, marginRight: 8 }}
                    />
                    <Shimmer
                      width={40}
                      height={40}
                      style={{ borderRadius: 20 }}
                    />
                  </View>
                </View>
              ))}
          </View>
        );
      }
      return (
        <FlatList
          data={Array(3).fill(0)}
          renderItem={() => <CompanyItemSkeleton />}
          keyExtractor={(_, index) => `skeleton-${index}`}
          contentContainerStyle={styles.listContent}
        />
      );
    }

    // Show the actual data
    if (isMediumScreen || isLargeScreen) {
      return (
        <View style={styles.tableContainer}>
          <TableHeader />
          <FlatList
            data={filteredCompanies}
            renderItem={({ item }) => <TableRow item={item} />}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.tableContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            onEndReached={loadMoreCompanies}
            onEndReachedThreshold={0.5}
            ListFooterComponent={() => (
              <>
                {totalCount > 0 && (
                  <Text style={styles.resultsCount}>
                    {t("superAdmin.companies.showing")}{" "}
                    {filteredCompanies.length} {t("superAdmin.companies.of")}{" "}
                    {totalCount} {t("superAdmin.companies.companies")}
                  </Text>
                )}
                {loadingMore && hasMoreData && (
                  <View style={styles.loadingFooter}>
                    <ActivityIndicator
                      size="small"
                      color={theme.colors.primary}
                    />
                  </View>
                )}
              </>
            )}
          />
        </View>
      );
    }

    return (
      <FlatList
        data={filteredCompanies}
        renderItem={renderCompanyItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMoreCompanies}
        onEndReachedThreshold={0.5}
        ListFooterComponent={() => (
          <>
            {totalCount > 0 && (
              <Text style={styles.resultsCount}>
                {t("superAdmin.companies.showing")} {filteredCompanies.length}{" "}
                {t("superAdmin.companies.of")} {totalCount}{" "}
                {t("superAdmin.companies.companies")}
              </Text>
            )}
            {loadingMore && hasMoreData && (
              <View style={styles.loadingFooter}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            )}
          </>
        )}
      />
    );
  };

  // Apply filters and refresh companies list
  const applyFilters = () => {
    // Close modal first
    setFilterModalVisible(false);

    // Force a complete reset and refresh with new filters
    // This is a more direct approach that should work on first click
    setCompanies([]);
    setFilteredCompanies([]);
    setLoading(true);
    setRefreshing(true);
    setPage(0);
    setHasMoreData(true);

    // Apply new filters directly and immediately
    const newFilters = {
      status: activeFilter,
      sortOrder: sortOrder,
    };

    // Set applied filters and then immediately force a fetch
    setAppliedFilters(newFilters);

    // Directly call fetch with current filters instead of using the state
    // This bypasses any state update delay issues
    const doFetch = async () => {
      try {
        // Clear any previous errors
        setError(null);

        // Generate a cache key based on search query and pagination
        const cacheKey = `companies_${searchQuery.trim()}_page0_size${PAGE_SIZE}_status${activeFilter}_sort${sortOrder}`;

        const from = 0;
        const to = PAGE_SIZE - 1;

        const fetchData = async () => {
          let query = supabase
            .from("company")
            .select(
              "id, company_name, registration_number, industry_type, contact_number, contact_email, active, created_at",
              { count: "exact" }
            );

          // Apply status filter using the current activeFilter value
          if (activeFilter === "active") {
            query = query.eq("active", true);
          } else if (activeFilter === "inactive") {
            query = query.eq("active", false);
          }

          // Apply search if needed
          if (searchQuery.trim() !== "") {
            if (searchQuery.length > 2) {
              query = query.or(
                `company_name.ilike.%${searchQuery.toLowerCase()}%,registration_number.ilike.%${searchQuery.toLowerCase()}%,industry_type.ilike.%${searchQuery.toLowerCase()}%,contact_email.ilike.%${searchQuery.toLowerCase()}%,contact_number.ilike.%${searchQuery.toLowerCase()}%`
              );
            } else {
              query = query.or(
                `company_name.ilike.${searchQuery.toLowerCase()}%,registration_number.ilike.${searchQuery.toLowerCase()}%,industry_type.ilike.${searchQuery.toLowerCase()}%,contact_email.ilike.${searchQuery.toLowerCase()}%,contact_number.ilike.${searchQuery.toLowerCase()}%`
              );
            }
          }

          // Apply sorting based on the current sortOrder value
          query = query
            .order("created_at", { ascending: sortOrder === "asc" })
            .range(from, to);

          return await query;
        };

        const result = await cachedQuery<any>(fetchData, cacheKey, {
          forceRefresh: true, // Always force fresh data when applying filters
          criticalData: true,
        });

        const { data, error } = result;
        const count = result.data?.length ? (result as any).count : 0;

        if (error && !result.fromCache) {
          throw new Error(error.message || "Failed to fetch companies");
        }

        if (count !== undefined) {
          setTotalCount(count);
          setHasMoreData(from + (data?.length || 0) < count);
        } else if (data && data.length < PAGE_SIZE) {
          setHasMoreData(false);
        }

        const typedData = (data as Company[]) || [];
        setCompanies(typedData);
        setFilteredCompanies(typedData);
      } catch (error) {
        console.error("Error fetching companies after filter:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load companies"
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    // Execute the fetch immediately
    doFetch();
  };

  // Clear all filters
  const clearFilters = () => {
    setFilterModalVisible(false);
    setActiveFilter(null);

    // Force a complete reset and refresh
    setCompanies([]);
    setFilteredCompanies([]);
    setLoading(true);
    setRefreshing(true);
    setPage(0);
    setHasMoreData(true);

    // Clear applied filters
    setAppliedFilters({
      status: null,
      sortOrder: "desc", // Keep desc as default
    });

    // Call the regular fetch after resetting everything
    fetchCompanies(true);
  };

  // Check if we have any active filters
  const hasActiveFilters = () => {
    return appliedFilters.status !== null;
  };

  // Render active filter indicator
  const renderActiveFilterIndicator = () => {
    if (!hasActiveFilters()) return null;

    return (
      <View style={styles.activeFiltersContainer}>
        <Text style={styles.activeFiltersText}>Active filters:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScrollView}
        >
          {appliedFilters.status && (
            <Chip
              mode="outlined"
              onClose={() => {
                setAppliedFilters({
                  ...appliedFilters,
                  status: null,
                });
                setActiveFilter(null);
                setPage(0);
                fetchCompanies(true);
              }}
              style={[
                styles.activeFilterChip,
                {
                  backgroundColor: "rgba(26, 115, 232, 0.1)", // Light blue with 10% opacity
                  borderColor: theme.colors.primary,
                },
              ]}
              textStyle={{ color: theme.colors.primary }}
            >
              Status:{" "}
              {appliedFilters.status.charAt(0).toUpperCase() +
                appliedFilters.status.slice(1)}
            </Chip>
          )}
        </ScrollView>
      </View>
    );
  };

  // Render the filter modal
  const renderFilterModal = () => {
    const statusOptions = [
      { label: "All Status", value: "" },
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ];

    return (
      <FilterModal
        visible={filterModalVisible}
        onDismiss={() => setFilterModalVisible(false)}
        title="Filter Options"
        onClear={clearFilters}
        onApply={applyFilters}
        isLargeScreen={isLargeScreen}
        isMediumScreen={isMediumScreen}
      >
        <FilterSection title="Status">
          <PillFilterGroup
            options={statusOptions}
            value={activeFilter || ""}
            onValueChange={(value: string) => setActiveFilter(value)}
          />
        </FilterSection>
      </FilterModal>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader
        showLogo={false}
        showBackButton={false}
        title={t("superAdmin.companies.manage")}
        subtitle={t("superAdmin.companies.subtitle")}
        showHelpButton={true}
        absolute={false}
      />
      <View
        style={[
          styles.mainContent,
          { backgroundColor: theme.colors.surface, flex: 1 },
        ]}
      >
        {networkStatus === false && (
          <Banner
            visible={true}
            icon="wifi-off"
            actions={[
              {
                label: t("common.retry"),
                onPress: async () => {
                  const isAvailable = await isNetworkAvailable();
                  setNetworkStatus(isAvailable);
                  if (isAvailable) {
                    setRefreshing(true);
                    fetchCompanies(true);
                  }
                },
              },
            ]}
          >
            {t("common.offline")}
          </Banner>
        )}

        {error && error !== t("common.offline") && (
          <Banner
            visible={true}
            icon="alert-circle"
            actions={[
              {
                label: t("common.dismiss"),
                onPress: () => setError(null),
              },
            ]}
          >
            {error}
          </Banner>
        )}

        <View
          style={[
            styles.searchContainer,
            {
              maxWidth: isLargeScreen ? 1500 : isMediumScreen ? 900 : "100%",
              alignSelf: "center",
              width: "100%",
            },
          ]}
        >
          <View style={styles.searchBarContainer}>
            <Searchbar
              placeholder={t("superAdmin.companies.search")}
              onChangeText={
                networkStatus === false ? undefined : setSearchQuery
              }
              value={searchQuery}
              style={[
                styles.searchbar,
                networkStatus === false && { opacity: 0.6 },
              ]}
              loading={refreshing && searchQuery.length > 0}
              onClearIconPress={() => {
                if (networkStatus !== false) {
                  setSearchQuery("");
                }
              }}
              theme={{ colors: { primary: theme.colors.primary } }}
              clearIcon={() =>
                searchQuery ? (
                  <IconButton
                    icon="close-circle"
                    size={18}
                    onPress={() => setSearchQuery("")}
                  />
                ) : null
              }
              icon="magnify"
            />
            <View style={styles.filterButtonContainer}>
              <IconButton
                icon="filter-variant"
                size={30}
                style={[
                  styles.filterButton,
                  hasActiveFilters() && styles.activeFilterButton,
                ]}
                iconColor={
                  hasActiveFilters() ? theme.colors.primary : undefined
                }
                onPress={() => setFilterModalVisible(true)}
              />
              {hasActiveFilters() && <View style={styles.filterBadge} />}
            </View>
          </View>

          <FAB
            icon="plus"
            label="Add Company"
            style={[
              styles.fab,
              {
                backgroundColor: theme.colors.primary,
                position: "relative",
                margin: 0,
                marginLeft: 16,
              },
            ]}
            onPress={() => {
              navigation.navigate("CreateCompany");
            }}
            color={theme.colors.surface}
            mode="flat"
            theme={{ colors: { accent: theme.colors.surface } }}
            accessibilityLabel={t("superAdmin.companies.addCompany")}
            accessibilityHint={t("superAdmin.companies.addCompanyHint")}
            accessibilityRole="button"
            accessibilityState={{ disabled: networkStatus === false }}
            disabled={networkStatus === false}
          />
        </View>

        {searchQuery && searchQuery.length > 0 && searchQuery.length < 3 && (
          <View
            style={[
              styles.searchTips,
              {
                maxWidth: isLargeScreen ? 1200 : isMediumScreen ? 900 : "100%",
                alignSelf: "center",
                width: "100%",
                paddingHorizontal: isLargeScreen ? 24 : 16,
              },
            ]}
          >
            <Text style={styles.searchTipsText}>
              {t("superAdmin.companies.typeMoreChars")}
            </Text>
          </View>
        )}

        {renderActiveFilterIndicator()}
        {renderFilterModal()}

        <View
          style={[
            styles.contentContainer,
            {
              maxWidth: isLargeScreen ? 1500 : isMediumScreen ? 900 : "100%",
              alignSelf: "center",
              width: "100%",
            },
          ]}
        >
          {renderContent()}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: Platform.OS === "web" ? 24 : 16,
    paddingVertical: 16,
    maxHeight: "90%",
  },
  searchContainer: {
    padding: Platform.OS === "web" ? 24 : 16,
    paddingTop: 10,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  searchbar: {
    elevation: 0,
    borderRadius: 18,
    height: 60,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    flex: 1,
  },
  listContent: {
    padding: Platform.OS === "web" ? 24 : 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 16,
    elevation: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: {
      width: 0,
      height: 0,
    },
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  companyName: {
    fontSize: 12,
    flex: 1,
    color: "#000",
    paddingLeft: 3,
  },
  cardDetails: {},
  detailItem: {
    flexDirection: "row",
    marginBottom: 4,
  },
  detailLabel: {
    opacity: 0.7,
    width: 100,
    color: "#333",
    fontSize: 12,
  },
  detailValue: {
    flex: 1,
    color: "#000",
    fontSize: 12,
  },
  fab: {
    borderRadius: 17,
    height: 56,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: "center",
  },
  // Skeleton styles
  skeleton: {
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    overflow: "hidden",
  },
  skeletonTitle: {
    height: 22,
    width: "70%",
    marginBottom: 8,
  },
  skeletonBadge: {
    height: 24,
    width: 80,
    borderRadius: 12,
  },
  skeletonLabel: {
    height: 16,
    width: 90,
    marginRight: 8,
  },
  skeletonValue: {
    height: 16,
    flex: 1,
  },
  resultsCount: {
    textAlign: "center",
    marginBottom: 10,
    marginTop: 20,
    opacity: 0.7,
    fontSize: 12,
  },
  // Filter styles
  filterButtonContainer: {
    position: "relative",
    marginLeft: 15,
  },
  filterButton: {
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  activeFilterButton: {
    backgroundColor: "#E8F0FE",
    borderWidth: 1,
    borderColor: "#1a73e8",
  },
  filterBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#ff5252",
    position: "absolute",
    top: 8,
    right: 8,
    zIndex: 2,
  },
  activeFiltersContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  activeFiltersText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#616161",
    marginRight: 8,
  },
  filtersScrollView: {
    flexGrow: 0,
    marginVertical: 4,
  },
  activeFilterChip: {
    margin: 4,
  },
  searchTips: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 0,
  },
  searchTipsText: {
    fontSize: 12,
    color: "#666",
    fontStyle: "italic",
  },
  // Add new table styles
  tableContainer: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: "hidden",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingVertical: 16,
    paddingHorizontal: 26,
    alignContent: "center",
    justifyContent: "center",
    alignItems: "center",
  },
  tableHeaderCell: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: "space-around",
    paddingLeft: 25,
    alignItems: "flex-start",
  },
  tableHeaderText: {
    fontSize: 14,
    color: "#64748b",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingVertical: 16,
    backgroundColor: "#fff",
    paddingHorizontal: 26,
    alignItems: "center",
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 26,
    justifyContent: "space-evenly",
    alignItems: "flex-start",
  },
  tableCellText: {
    fontSize: 14,
    color: "#334155",
  },
  tableContent: {
    flexGrow: 1,
  },
  actionCell: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: 26,
  },
  actionIcon: {
    margin: 0,
    marginRight: 8,
  },
  tooltipContainer: {
    position: "relative",
    flex: 1,
    maxWidth: "100%",
    zIndex: 10, // Higher z-index to appear above table header
  },
  tooltip: {
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
  tooltipText: {
    color: "#000",
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    lineHeight: 16,
  },
} as const);

export default CompanyListScreen;
