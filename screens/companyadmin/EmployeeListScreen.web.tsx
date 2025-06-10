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
  Animated,
  Platform,
  Dimensions,
  Pressable,
  PressableStateCallbackType,
} from "react-native";
import {
  Text,
  Card,
  Searchbar,
  useTheme,
  FAB,
  Avatar,
  Banner,
  IconButton,
  Chip,
  Divider,
  Portal,
  Modal,
  RadioButton,
  Menu,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
  useFocusEffect,
} from "@react-navigation/native";
import {
  supabase,
  cachedQuery,
  clearCache,
  isNetworkAvailable,
} from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import EmptyState from "../../components/EmptyState";
import StatusBadge from "../../components/StatusBadge";
import { CompanyUser, UserStatus } from "../../types";
import { LinearGradient } from "expo-linear-gradient";
import {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { getFontFamily } from "../../utils/globalStyles";
import { formatDate, formatRelativeTime } from "../../utils/dateUtils";
import Pagination from "../../components/Pagination";
import FilterModal from "../../components/FilterModal";
import {
  FilterSection,
  RadioFilterGroup,
  FilterDivider,
  PillFilterGroup,
} from "../../components/FilterSections";
import HelpGuideModal from "../../components/HelpGuideModal";

// Update the CompanyUser interface to include optional created_at
interface ExtendedCompanyUser extends CompanyUser {
  created_at?: string;
}

// Date sort options
enum DateSortOrder {
  NEWEST_FIRST = "desc",
  OLDEST_FIRST = "asc",
}

// Add Shimmer component definition
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
const EmployeeItemSkeleton = () => {
  const theme = useTheme();
  return (
    <Card style={[styles.card]} elevation={0}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <Shimmer width={40} height={40} style={{ borderRadius: 20 }} />
            <View style={styles.userTextContainer}>
              <Shimmer width={160} height={18} style={{ marginBottom: 4 }} />
              <Shimmer width={140} height={14} style={{ marginBottom: 4 }} />
              <Shimmer width={100} height={14} />
            </View>
          </View>
          <View style={styles.statusContainer}>
            <Shimmer width={80} height={24} style={{ borderRadius: 12 }} />
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

// Add TooltipText component for table cells
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

const EmployeeListScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [employees, setEmployees] = useState<ExtendedCompanyUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredEmployees, setFilteredEmployees] = useState<
    ExtendedCompanyUser[]
  >([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [networkStatus, setNetworkStatus] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const PAGE_SIZE = 10;

  // New filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [appliedFilters, setAppliedFilters] = useState<{
    status: string;
    sortOrder: string;
    jobTitle: string[];
  }>({
    status: "all",
    sortOrder: DateSortOrder.NEWEST_FIRST,
    jobTitle: [],
  });

  const [sortOrder, setSortOrder] = useState<string>(
    DateSortOrder.NEWEST_FIRST
  );
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [jobTitleFilter, setJobTitleFilter] = useState<string[]>([]);
  const [availableJobTitles, setAvailableJobTitles] = useState<string[]>([]);
  const [dropdownAnimation] = useState(new Animated.Value(0));
  const [rotateAnimation] = useState(new Animated.Value(0));
  const dropdownRef = React.useRef(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  // Add window dimensions state
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
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // Use windowDimensions.width instead of direct width reference
  const isLargeScreen = windowDimensions.width >= 1440;
  const isMediumScreen =
    windowDimensions.width >= 768 && windowDimensions.width < 1440;
  const useTableLayout = isLargeScreen || isMediumScreen;

  // Add table header component
  const EmployeeTableHeader = () => (
    <View style={styles.tableHeader}>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Name</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Email</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Job Title</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Created Date</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Status</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Actions</Text>
      </View>
    </View>
  );

  // Add table row component
  const EmployeeTableRow = ({ item }: { item: ExtendedCompanyUser }) => (
    <Pressable
      onPress={() => {
        navigation.navigate("EmployeeDetails", { employeeId: item.id });
      }}
      style={({ pressed }: PressableStateCallbackType) => [
        styles.tableRow,
        pressed && { backgroundColor: "#f8fafc" },
      ]}
    >
      <View style={styles.tableCell}>
        <TooltipText
          text={
            `${item.first_name || ""} ${item.last_name || ""}`.trim() ||
            "Unnamed Employee"
          }
        />
      </View>
      <View style={styles.tableCell}>
        <TooltipText text={item.email} />
      </View>
      <View style={styles.tableCell}>
        <TooltipText text={item.job_title || "-"} />
      </View>
      <View style={styles.tableCell}>
        <Text style={styles.tableCellText}>
          {item.created_at ? (
            <Text style={styles.dateText}>
              {formatDate(item.created_at, {
                type: "long",
                locale: "en-US",
              })}
            </Text>
          ) : (
            "-"
          )}
        </Text>
      </View>
      <View style={styles.tableCell}>
        <StatusBadge status={item.active_status} size="small" />
      </View>
      <View style={styles.actionCell}>
        <IconButton
          icon="eye"
          size={20}
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate("EmployeeDetails", {
              employeeId: item.id,
            });
          }}
          style={styles.actionIcon}
        />
      </View>
    </Pressable>
  );

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

  // Clear errors when network is restored
  useEffect(() => {
    if (networkStatus === true && error && error.includes("offline")) {
      setError(null);
    }
  }, [networkStatus, error]);

  const fetchCompanyId = async () => {
    if (!user) return null;

    try {
      // Create a cache key for company ID
      const cacheKey = `company_id_${user.id}`;

      // Define the async function to fetch company ID
      const fetchData = async () => {
        const { data, error } = await supabase
          .from("company_user")
          .select("company_id")
          .eq("id", user.id)
          .single();

        return { data, error };
      };

      // Use cached query
      const result = await cachedQuery<any>(fetchData, cacheKey, {
        cacheTtl: 30 * 60 * 1000, // 30 minutes cache for company ID
        criticalData: true,
      });

      if (result.error) {
        console.error("Error fetching company ID:", result.error);
        return null;
      }

      return result.data?.company_id || null;
    } catch (error) {
      console.error("Error fetching company ID:", error);
      return null;
    }
  };

  const fetchEmployees = useCallback(
    async (refresh = false) => {
      try {
        if (refresh) {
          setPage(0);
          setLoading(true);
        } else {
          setLoading(true);
        }

        // Get company ID if not already set
        const currentCompanyId = companyId || (await fetchCompanyId());
        if (!currentCompanyId) {
          console.error("No company ID found");
          setLoading(false);
          return;
        }

        setCompanyId(currentCompanyId);

        // Fetch job titles if not already loaded
        if (availableJobTitles.length === 0) {
          fetchJobTitles();
        }

        const currentPage = refresh ? 0 : page;
        const from = currentPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        let query = supabase
          .from("company_user")
          .select("*", { count: "exact" })
          .eq("company_id", currentCompanyId)
          .eq("role", "employee");

        // Apply status filter if not "all"
        if (statusFilter && statusFilter !== "all") {
          console.log("Applying status filter:", statusFilter); // Debug log
          query = query.eq("active_status", statusFilter);
        }

        // Apply job title filter if any selected
        if (jobTitleFilter && jobTitleFilter.length > 0) {
          query = query.in("job_title", jobTitleFilter);
        }

        // Apply search filter if present
        if (searchQuery.trim() !== "") {
          const searchPattern = `%${searchQuery.toLowerCase()}%`;
          query = query.or(
            `first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},email.ilike.${searchPattern},job_title.ilike.${searchPattern}`
          );
        }

        // Add sorting
        query = query.order("created_at", {
          ascending: sortOrder === DateSortOrder.OLDEST_FIRST,
        });

        // Add pagination
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) {
          console.error("Error fetching employees:", error);
          throw error;
        }

        // Update total count
        if (count !== null) {
          setTotalCount(count);
        }

        if (data) {
          if (refresh) {
            setEmployees(data);
            setFilteredEmployees(data);
          } else {
            setEmployees((prev) => [...prev, ...data]);
            setFilteredEmployees((prev) => [...prev, ...data]);
          }
        }
      } catch (error) {
        console.error("Error fetching employees:", error);
      } finally {
        setLoading(false);
      }
    },
    [companyId, page, statusFilter, jobTitleFilter, searchQuery, sortOrder]
  );

  useEffect(() => {
    // Start fetching immediately, but don't show a full-screen loader
    setLoading(true);
    setRefreshing(false); // Ensure refresh indicator is not shown on initial load
    fetchEmployees(true);
  }, [user]);

  useEffect(() => {
    // Skip this effect on initial render when searchQuery is empty
    if (searchQuery === "" && !refreshing) {
      return;
    }

    // Clear the timeout on unmount
    let debounceTimeout: NodeJS.Timeout;

    // Only fetch when a search query is entered or cleared
    if (searchQuery.trim() === "" || searchQuery.length > 2) {
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
      if (searchQuery.trim() !== "" && companyId) {
        clearCache(`employees_${companyId}_${searchQuery.trim()}`);
      }

      debounceTimeout = setTimeout(() => {
        // Don't try to search when offline
        if (networkStatus === false && searchQuery.trim() !== "") {
          setError("Search is unavailable while offline");
          setRefreshing(false);
          return;
        }

        fetchEmployees(true);
      }, 500);
    }

    return () => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
    };
  }, [searchQuery, networkStatus, companyId]);

  const onRefresh = () => {
    if (networkStatus === false) {
      setError("Cannot refresh while offline");
      return;
    }

    // Explicitly set refreshing to true for pull-to-refresh
    setRefreshing(true);
    fetchEmployees(true);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return (
      (firstName ? firstName.charAt(0).toUpperCase() : "") +
        (lastName ? lastName.charAt(0).toUpperCase() : "") || "?"
    );
  };

  const renderEmployeeItem = ({ item }: { item: ExtendedCompanyUser }) => (
    <TouchableOpacity
      onPress={() => {
        navigation.navigate("EmployeeDetails", { employeeId: item.id });
      }}
      style={styles.cardContainer}
    >
      <Card style={[styles.card]} elevation={0}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.userInfo}>
              {renderGradientAvatar(
                getInitials(item.first_name, item.last_name),
                "employee"
              )}
              <View style={styles.userTextContainer}>
                <Text
                  style={[styles.userName, { fontWeight: "bold" }]}
                  numberOfLines={1}
                >
                  {`${item.first_name || ""} ${item.last_name || ""}`.trim() ||
                    "Unnamed Employee"}
                </Text>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {item.email}
                </Text>
                {item.job_title && (
                  <View style={styles.badgeContainer}>
                    <View style={styles.jobTitleBadge}>
                      <IconButton
                        icon="briefcase"
                        size={14}
                        iconColor="#616161"
                        style={styles.jobTitleIcon}
                      />
                      <Text style={styles.jobTitleBadgeText} numberOfLines={1}>
                        {item.job_title}
                      </Text>
                    </View>
                  </View>
                )}
                {item.created_at && (
                  <View style={styles.dateContainer}>
                    <IconButton
                      icon="calendar"
                      size={14}
                      iconColor="#616161"
                      style={styles.dateIcon}
                    />
                    <Text style={styles.dateText}>
                      {formatDate(item.created_at, {
                        type: "long",
                        locale: "en-US",
                      })}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.statusContainer}>
              <StatusBadge status={item.active_status} />
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  // Render a gradient avatar with initials
  const renderGradientAvatar = (initials: string, userType: string) => {
    // Different gradient colors for employees
    const gradientColors = [
      "rgba(76,175,80,0.9)",
      "rgba(67,160,71,0.9)",
      "rgba(56,142,60,0.9)",
    ] as const;

    return (
      <View style={styles.avatarContainer}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.avatarGradient}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </LinearGradient>
      </View>
    );
  };

  // Update renderContent to include pagination
  const renderContent = () => {
    if (loading && !refreshing) {
      if (useTableLayout) {
        // Table view skeleton
        return (
          <View style={styles.tableContainer}>
            <EmployeeTableHeader />
            {Array(6)
              .fill(0)
              .map((_, index) => (
                <View key={`skeleton-${index}`} style={styles.tableRow}>
                  <View style={styles.tableCell}>
                    <Shimmer width={160} height={16} />
                  </View>
                  <View style={styles.tableCell}>
                    <Shimmer width={180} height={16} />
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
                      style={{ borderRadius: 20 }}
                    />
                  </View>
                </View>
              ))}
          </View>
        );
      }

      // Card view skeleton
      return (
        <FlatList
          data={Array(4).fill(0)}
          renderItem={() => <EmployeeItemSkeleton />}
          keyExtractor={(_, index) => `skeleton-${index}`}
          contentContainerStyle={styles.listContent}
        />
      );
    }

    // Show empty state when no results
    if (filteredEmployees.length === 0 && !loading && !refreshing) {
      return (
        <EmptyState
          icon="account-off"
          title="No Employees Found"
          message={
            searchQuery || hasActiveFilters()
              ? "No employees match your search criteria."
              : "You haven't added any employees yet."
          }
          buttonTitle={
            searchQuery || hasActiveFilters() ? "Clear Filters" : "Add Employee"
          }
          onButtonPress={() => {
            if (searchQuery || hasActiveFilters()) {
              setSearchQuery("");
              handleClearFilters();
            } else {
              navigation.navigate("CreateEmployee");
            }
          }}
        />
      );
    }

    const totalPages = Math.ceil(totalCount / PAGE_SIZE);

    // Show the actual data
    return useTableLayout ? (
      <>
        <View style={styles.tableContainer}>
          <EmployeeTableHeader />
          <FlatList
            data={filteredEmployees}
            renderItem={({ item }) => <EmployeeTableRow item={item} />}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.tableContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        </View>
        {totalPages > 1 && (
          <View style={styles.paginationWrapper}>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(newPage) => {
                setPage(newPage);
                fetchEmployees(false);
              }}
            />
          </View>
        )}
      </>
    ) : (
      <>
        <FlatList
          data={filteredEmployees}
          renderItem={renderEmployeeItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
        {totalPages > 1 && (
          <View style={styles.paginationWrapper}>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={(newPage) => {
                setPage(newPage);
                fetchEmployees(false);
              }}
            />
          </View>
        )}
      </>
    );
  };

  // Fetch available job titles
  const fetchJobTitles = async () => {
    try {
      if (!companyId) return;

      const { data, error } = await supabase
        .from("company_user")
        .select("job_title")
        .eq("company_id", companyId)
        .not("job_title", "is", null);

      if (error) {
        console.error("Error fetching job titles:", error);
        return;
      }

      // Extract unique job titles without using Set
      const jobTitles = data.map((item) => item.job_title).filter(Boolean);
      const uniqueJobTitles: string[] = [];

      for (let i = 0; i < jobTitles.length; i++) {
        if (!uniqueJobTitles.includes(jobTitles[i])) {
          uniqueJobTitles.push(jobTitles[i]);
        }
      }

      setAvailableJobTitles(uniqueJobTitles);
    } catch (error) {
      console.error("Error fetching job titles:", error);
    }
  };

  // Toggle job title selection
  const toggleJobTitleSelection = (jobTitle: string) => {
    setJobTitleFilter((prev) => {
      if (prev.includes(jobTitle)) {
        return prev.filter((title) => title !== jobTitle);
      } else {
        return [...prev, jobTitle];
      }
    });
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return (
      statusFilter !== "all" ||
      jobTitleFilter.length > 0 ||
      sortOrder !== DateSortOrder.NEWEST_FIRST
    );
  };

  // Apply filters directly with current filter values
  const applyFiltersDirect = () => {
    // Close modal first
    setFilterModalVisible(false);

    // Reset pagination and fetch with filters
    setPage(0);
    fetchEmployees(true);
  };

  // Handle clearing all filters
  const handleClearFilters = () => {
    setFilterModalVisible(false);
    setStatusFilter("all");
    setJobTitleFilter([]);
    setSortOrder(DateSortOrder.NEWEST_FIRST);
    setAppliedFilters({
      status: "all",
      sortOrder: DateSortOrder.NEWEST_FIRST,
      jobTitle: [],
    });
    setPage(0);
    fetchEmployees(true);
  };

  // Handle clearing status filter only
  const handleClearStatusFilter = useCallback(() => {
    setStatusFilter("");
    setJobTitleFilter([]); // Reset job title filter as well since they're related
    setAppliedFilters((prev) => ({
      ...prev,
      status: "all",
      jobTitle: [],
    }));

    // Ensure we reset the page and trigger a new fetch
    setTimeout(() => {
      setPage(0);
      fetchEmployees(true);
    }, 0);
  }, [fetchEmployees]);

  // Update the active filter indicator
  const renderActiveFilterIndicator = () => {
    if (!hasActiveFilters()) return null;

    return (
      <View style={styles.activeFiltersContainer}>
        <Text style={styles.activeFiltersText}>Active Filters:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScrollView}
        >
          {statusFilter !== "all" && (
            <Chip
              mode="outlined"
              onClose={() => {
                handleClearStatusFilter();
              }}
              style={[
                styles.activeFilterChip,
                {
                  backgroundColor: "#1a73e815",
                  borderColor: "#1a73e8",
                },
              ]}
              textStyle={{ color: "#1a73e8" }}
            >
              {`Status: ${statusFilter === "active" ? "Active" : "Inactive"}`}
            </Chip>
          )}
        </ScrollView>
      </View>
    );
  };

  // Update the filter modal component
  const renderFilterModal = () => {
    const statusOptions = [
      { label: "All Statuses", value: "all" },
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ];

    const sortOptions = [
      { label: "Newest first", value: DateSortOrder.NEWEST_FIRST },
      { label: "Oldest first", value: DateSortOrder.OLDEST_FIRST },
    ];

    return (
      <FilterModal
        visible={filterModalVisible}
        onDismiss={() => setFilterModalVisible(false)}
        title="Filter Options"
        onClear={handleClearFilters}
        onApply={applyFiltersDirect}
        isLargeScreen={isLargeScreen}
        isMediumScreen={isMediumScreen}
      >
        <FilterSection title="Filter by status">
          <PillFilterGroup
            options={statusOptions}
            value={statusFilter}
            onValueChange={(value) => setStatusFilter(value)}
          />
        </FilterSection>
      </FilterModal>
    );
  };

  const [helpModalVisible, setHelpModalVisible] = useState(false);

  // Define help guide content
  const helpGuideSteps = [
    {
      title: "Employee Search",
      icon: "magnify",
      description:
        "Use the search bar to find employees by name, email, or job title. Type at least 3 characters for best results.",
    },
    {
      title: "Filter Options",
      icon: "filter-variant",
      description:
        "Filter employees by status (Active/Inactive) and sort by date. The filter badge indicates when filters are active.",
    },
    {
      title: "Employee Information",
      icon: "account-details",
      description:
        "View comprehensive employee details including name, email, job title, and status. Click on any employee to see their full profile.",
    },
    {
      title: "Status Management",
      icon: "account-check",
      description:
        "Track employee status with color-coded indicators. Active employees are ready to use the system, while inactive ones have limited access.",
    },
    {
      title: "Add New Employees",
      icon: "account-plus",
      description:
        "Click the 'Add Employee' button to create new employee accounts. You can invite them via email to set up their profiles.",
    },
  ];

  const helpGuideNote = {
    title: "Important Notes",
    content: [
      "Search results update in real-time as you type",
      "Filters can be combined for more specific results",
      "Employee list automatically refreshes when changes are made",
      "Click on employee cards or table rows to view detailed profiles",
      "Network status is monitored to ensure data accuracy",
    ],
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader
        title="Employees"
        subtitle="Manage your employees"
        showBackButton={false}
        showHelpButton={true}
        onHelpPress={() => setHelpModalVisible(true)}
        showLogo={false}
      />

      <HelpGuideModal
        visible={helpModalVisible}
        onDismiss={() => setHelpModalVisible(false)}
        title="Employee Management Guide"
        description="Learn how to effectively manage your employees and use the available tools."
        steps={helpGuideSteps}
        note={helpGuideNote}
        buttonLabel="Got it"
      />

      {networkStatus === false && (
        <Banner
          visible={true}
          icon="wifi-off"
          actions={[
            {
              label: "Retry",
              onPress: async () => {
                const isAvailable = await isNetworkAvailable();
                setNetworkStatus(isAvailable);
                if (isAvailable) {
                  setRefreshing(true);
                  fetchEmployees(true);
                }
              },
            },
          ]}
        >
          You are offline. Some features may be limited.
        </Banner>
      )}

      {error && (
        <Banner
          visible={true}
          icon="alert-circle"
          actions={[
            {
              label: "Dismiss",
              onPress: () => setError(null),
            },
          ]}
        >
          {error}
        </Banner>
      )}

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
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search employees..."
            onChangeText={networkStatus === false ? undefined : setSearchQuery}
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
              size={24}
              style={[
                styles.filterButton,
                hasActiveFilters() && styles.activeFilterButton,
              ]}
              iconColor={hasActiveFilters() ? theme.colors.primary : undefined}
              onPress={() => setFilterModalVisible(true)}
            />
            {hasActiveFilters() && <View style={styles.filterBadge} />}
          </View>
          <FAB
            label="Add Employee"
            icon="plus"
            style={[
              styles.fab,
              {
                backgroundColor: theme.colors.primary,
                position: "relative",
                margin: 0,
                marginLeft: 16,
                elevation: 0,
                shadowColor: "transparent",
              },
            ]}
            onPress={() => navigation.navigate("CreateEmployee")}
            color={theme.colors.surface}
            disabled={networkStatus === false}
          />
        </View>

        {searchQuery && searchQuery.length > 0 && searchQuery.length < 3 && (
          <View style={styles.searchTips}>
            <Text style={styles.searchTipsText}>
              Type at least 3 characters for better search results.
            </Text>
          </View>
        )}

        {renderActiveFilterIndicator()}
        {renderFilterModal()}

        {searchQuery && searchQuery.length > 0 && (
          <View style={styles.searchResultsContainer}>
            <Text style={styles.searchResultsText}>
              Found: {filteredEmployees.length} employees
            </Text>
          </View>
        )}

        {renderContent()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: Platform.OS === "web" ? 24 : 16,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: Platform.OS === "web" ? 24 : 16,
    paddingVertical: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  searchbar: {
    flex: 1,
    elevation: 0,
    borderRadius: 18,
    height: 56,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  filterButtonContainer: {
    position: "relative",
    marginLeft: 8,
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
  fab: {
    borderRadius: 17,
    height: 56,
    elevation: 0,
  },
  listContainer: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: "hidden",
  },
  listContent: {
    paddingTop: 8,
  },
  tableContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: "hidden",
    marginTop: 16,
    flex: 1,
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
    fontFamily: getFontFamily("500"),
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
    fontFamily: getFontFamily("normal"),
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
    zIndex: 10,
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
    fontFamily: getFontFamily("normal"),
    lineHeight: 16,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: "center",
  },
  resultsCount: {
    textAlign: "center",
    marginTop: 18,
    opacity: 0.7,
    fontSize: 12,
    fontFamily: getFontFamily("normal"),
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
  },
  avatarGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 3,
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: getFontFamily("700"),
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    elevation: 0,
    backgroundColor: "#FFFFFF",
    marginBottom: 0,
    marginHorizontal: 0,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  userTextContainer: {
    marginLeft: 16,
    flex: 1,
  },
  statusContainer: {
    marginLeft: 16,
  },
  userName: {
    fontSize: 16,
    fontFamily: getFontFamily("600"),
    color: "#212121",
  },
  userEmail: {
    fontSize: 14,
    fontFamily: getFontFamily("normal"),
    color: "#616161",
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  jobTitleBadge: {
    flexDirection: "row",
    alignItems: "center",
    padding: 4,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 8,
  },
  jobTitleBadgeText: {
    fontSize: 12,
    fontFamily: getFontFamily("normal"),
    color: "#616161",
    marginLeft: 4,
  },
  jobTitleIcon: {
    margin: 0,
    marginRight: 4,
  },
  cardContainer: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: "hidden",
  },
  cardContent: {
    padding: 16,
  },
  paginationWrapper: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 16,
    marginTop: 12,
    overflow: "hidden",
    width: "auto",
    alignSelf: "center",
  },
  activeFiltersContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  activeFiltersText: {
    fontSize: 14,
    fontFamily: getFontFamily("normal"),
    color: "#616161",
    marginRight: 8,
  },
  filtersScrollView: {
    flexGrow: 0,
    marginVertical: 4,
  },
  searchTips: {
    backgroundColor: "#e8f4fd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  searchTipsText: {
    color: "#0066cc",
    fontFamily: getFontFamily("500"),
    fontSize: 14,
  },
  searchResultsContainer: {
    backgroundColor: "#e8f4fd",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  searchResultsText: {
    color: "#0066cc",
    fontFamily: getFontFamily("500"),
    fontSize: 14,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  filterChip: {
    margin: 4,
  },
  activeFilterChip: {
    margin: 4,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  dateIcon: {
    margin: 0,
    marginRight: 4,
  },
  dateText: {
    fontSize: 13,
    color: "#616161",
    fontFamily: getFontFamily("normal"),
  },
  relativeTimeText: {
    fontSize: 12,
    color: "#9e9e9e",
    fontFamily: getFontFamily("normal"),
    marginLeft: 4,
  },
});

export default EmployeeListScreen;
