import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Platform,
  ActivityIndicator,
  AppState,
  Dimensions,
  Pressable,
  PressableStateCallbackType,
  ViewStyle,
} from "react-native";
import {
  Text,
  Card,
  Searchbar,
  useTheme,
  FAB,
  Chip,
  IconButton,
  Portal,
  Modal,
  Divider,
  RadioButton,
  Banner,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
  useFocusEffect,
} from "@react-navigation/native";
import { format } from "date-fns";
import {
  supabase,
  isNetworkAvailable,
  cachedQuery,
  clearCache,
} from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import EmptyState from "../../components/EmptyState";
import StatusBadge from "../../components/StatusBadge";
import { Task, TaskPriority, TaskStatus } from "../../types";
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
  interpolate,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";

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

// Add TooltipText component
const TooltipText = ({
  text,
  numberOfLines = 1,
}: {
  text: string;
  numberOfLines?: number;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const containerRef = React.useRef<View>(null);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1440);

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

      const windowWidth = window.innerWidth;
      let xPos = rect.left;

      if (xPos + 300 > windowWidth) {
        xPos = windowWidth - 310;
      }

      let yPos;
      if (spaceBelow >= 100) {
        yPos = rect.bottom + window.scrollY + 5;
      } else if (spaceAbove >= 100) {
        yPos = rect.top + window.scrollY - 5;
      } else {
        yPos =
          spaceAbove > spaceBelow
            ? rect.top + window.scrollY - 5
            : rect.bottom + window.scrollY + 5;
      }

      setTooltipPosition({ x: xPos, y: yPos });
    }
  };

  return (
    <Text
      ref={containerRef}
      numberOfLines={numberOfLines}
      onMouseEnter={updateTooltipPosition}
      onMouseLeave={() => setIsHovered(false)}
      style={[
        {
          color: isHovered ? "#1a73e8" : "#666",
          fontSize: 13,
          lineHeight: 20,
        },
      ]}
    >
      {text}
    </Text>
  );
};

// Add Shimmer component
interface ShimmerProps {
  width: number;
  height: number;
  style?: ViewStyle;
}

const Shimmer: React.FC<ShimmerProps> = ({ width, height, style }) => {
  const animatedValue = useSharedValue(0);

  useEffect(() => {
    animatedValue.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1000 }),
        withTiming(0, { duration: 1000 })
      ),
      -1
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(animatedValue.value, [0, 1], [-width, width]) },
    ],
  }));

  return (
    <View
      style={[
        {
          width,
          height,
          overflow: "hidden",
          backgroundColor: "#E5E7EB",
          borderRadius: 4,
        },
        style,
      ]}
    >
      <Animated.View style={[{ width: "100%", height: "100%" }, animatedStyle]}>
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

// Add TableHeader component
const TableHeader = () => {
  return (
    <View style={styles.tableHeaderRow}>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Title</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Assigned To</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Deadline</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Priority</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Status</Text>
      </View>
    </View>
  );
};

// Add TableHeaderSkeleton component
const TableHeaderSkeleton = () => {
  return (
    <View style={styles.tableHeaderRow}>
      <View style={styles.tableHeaderCell}>
        <Shimmer width={160} height={20} />
      </View>
      <View style={styles.tableHeaderCell}>
        <Shimmer width={140} height={20} />
      </View>
      <View style={styles.tableHeaderCell}>
        <Shimmer width={120} height={20} />
      </View>
      <View style={styles.tableHeaderCell}>
        <Shimmer width={100} height={20} />
      </View>
      <View style={styles.tableHeaderCell}>
        <Shimmer width={80} height={20} />
      </View>
    </View>
  );
};

// Add TableSkeleton component
const TableSkeleton = () => {
  return (
    <View style={styles.tableContainer}>
      <TableHeaderSkeleton />
      {Array(5)
        .fill(0)
        .map((_, index) => (
          <View key={`skeleton-${index}`} style={styles.tableRow}>
            <View style={styles.tableCell}>
              <Shimmer width={160} height={16} />
            </View>
            <View style={styles.tableCell}>
              <Shimmer width={140} height={16} />
            </View>
            <View style={styles.tableCell}>
              <Shimmer width={120} height={16} />
            </View>
            <View style={styles.tableCell}>
              <Shimmer width={80} height={24} style={{ borderRadius: 12 }} />
            </View>
            <View style={styles.tableCell}>
              <Shimmer width={80} height={24} style={{ borderRadius: 12 }} />
            </View>
          </View>
        ))}
    </View>
  );
};

// Component for skeleton loading UI
const TaskItemSkeleton = () => {
  return (
    <View
      style={[
        {
          backgroundColor: "#FFFFFF",
          borderRadius: 16,
          marginBottom: 16,
          borderWidth: 1,
          borderColor: "rgba(0,0,0,0.03)",
          elevation: 1,
          shadowColor: "rgba(0,0,0,0.1)",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 8,
          padding: 16,
        },
      ]}
    >
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <View style={{ flex: 1, marginRight: 8 }}>
          <View
            style={{
              height: 20,
              width: "70%",
              backgroundColor: "#E0E0E0",
              borderRadius: 4,
              marginBottom: 8,
            }}
          />
          <View
            style={{
              height: 14,
              width: "50%",
              backgroundColor: "#E0E0E0",
              borderRadius: 4,
            }}
          />
        </View>
        <View
          style={{
            height: 24,
            width: 80,
            backgroundColor: "#E0E0E0",
            borderRadius: 12,
          }}
        />
      </View>

      <View
        style={{
          height: 40,
          backgroundColor: "#F5F5F5",
          borderRadius: 6,
          marginBottom: 16,
        }}
      />

      <View
        style={{
          backgroundColor: "#f9f9f9",
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          borderLeftWidth: 2,
          borderLeftColor: "#E0E0E0",
        }}
      >
        <View style={{ flexDirection: "row", marginBottom: 4 }}>
          <View
            style={{
              height: 14,
              width: 80,
              backgroundColor: "#E0E0E0",
              borderRadius: 4,
            }}
          />
          <View
            style={{
              height: 14,
              width: "60%",
              backgroundColor: "#E0E0E0",
              borderRadius: 4,
              marginLeft: 8,
            }}
          />
        </View>
        <View style={{ flexDirection: "row", marginBottom: 4 }}>
          <View
            style={{
              height: 14,
              width: 80,
              backgroundColor: "#E0E0E0",
              borderRadius: 4,
            }}
          />
          <View
            style={{
              height: 14,
              width: "40%",
              backgroundColor: "#E0E0E0",
              borderRadius: 4,
              marginLeft: 8,
            }}
          />
        </View>
      </View>

      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 4,
        }}
      >
        <View
          style={{
            height: 30,
            width: 80,
            backgroundColor: "#E0E0E0",
            borderRadius: 15,
          }}
        />
        <View
          style={{
            height: 24,
            width: 120,
            backgroundColor: "#E0E0E0",
            borderRadius: 6,
          }}
        />
      </View>
    </View>
  );
};

const CompanyAdminTasksScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { user } = useAuth();
  const dimensions = useWindowDimensions();

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [page, setPage] = useState(0);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [networkStatus, setNetworkStatus] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const PAGE_SIZE = 10;

  // Filter modal state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">(
    "all"
  );
  const [appliedFilters, setAppliedFilters] = useState<{
    status: TaskStatus | "all";
    priority: TaskPriority | "all";
    sortOrder: string;
  }>({
    status: "all",
    priority: "all",
    sortOrder: "desc",
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
        async (nextAppState) => {
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

  // Memoize filteredTasks to avoid unnecessary re-filtering
  const memoizedFilteredTasks = useMemo(() => {
    try {
      let filtered = tasks;

      // Apply status filter
      if (appliedFilters.status !== "all") {
        filtered = filtered.filter(
          (task) => task.status === appliedFilters.status
        );
      }

      // Apply priority filter
      if (appliedFilters.priority !== "all") {
        filtered = filtered.filter(
          (task) => task.priority === appliedFilters.priority
        );
      }

      // Apply search filter - safely check if description exists
      if (searchQuery.trim() !== "") {
        filtered = filtered.filter(
          (task) =>
            task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (typeof task.description === "string" &&
              task.description
                .toLowerCase()
                .includes(searchQuery.toLowerCase()))
        );
      }

      return filtered;
    } catch (error) {
      console.error("Error filtering tasks:", error);
      return tasks; // Return unfiltered tasks on error
    }
  }, [tasks, appliedFilters.status, appliedFilters.priority, searchQuery]);

  // Update filteredTasks when memoizedFilteredTasks changes
  useEffect(() => {
    setFilteredTasks(memoizedFilteredTasks);
  }, [memoizedFilteredTasks]);

  const fetchTasks = async (refresh = false) => {
    try {
      console.log("=== Starting fetchTasks ===");
      // Clear any previous errors
      setError(null);

      if (refresh) {
        setPage(0);
        setHasMoreData(true);
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      // Get company admin's ID from company_user table
      const { data: companyUserData, error: companyUserError } = await supabase
        .from("company_user")
        .select("id, company_id")
        .eq("email", user?.email)
        .eq("role", "admin")
        .eq("active_status", "active")
        .single();

      console.log("Company user data:", { companyUserData, companyUserError });

      if (companyUserError || !companyUserData) {
        console.error("Error fetching company user data:", companyUserError);
        setError("Unable to identify your company admin account");
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        return;
      }

      setCompanyId(companyUserData.company_id);

      // Calculate pagination parameters
      const currentPage = refresh ? 0 : page;
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Generate a cache key based on all filters
      const filterKey = `${appliedFilters.status}_${appliedFilters.priority}_${appliedFilters.sortOrder}`;
      const cacheKey = `tasks_${companyUserData.company_id}_${searchQuery.trim()}_${filterKey}_page${currentPage}_size${PAGE_SIZE}`;

      // Only force refresh when explicitly requested
      const forceRefresh = refresh;

      // Check network availability
      const networkAvailable = await isNetworkAvailable();
      if (!networkAvailable && refresh) {
        console.log(
          "Network appears to be offline, but still attempting fetch"
        );
      }

      // Use cached query implementation with proper typing
      const fetchData = async () => {
        console.log("Fetching tasks with filters:", {
          companyId: companyUserData.company_id,
          userId: companyUserData.id,
          status: appliedFilters.status,
          priority: appliedFilters.priority,
          sortOrder: appliedFilters.sortOrder,
        });

        // First get total count without range
        const countQuery = supabase
          .from("tasks")
          .select("id", { count: "exact" })
          .eq("company_id", companyUserData.company_id)
          .or(
            `created_by.eq.${companyUserData.id},assigned_to.eq.${companyUserData.id}`
          );

        // Apply filters to count query
        if (appliedFilters.status !== "all") {
          countQuery.eq("status", appliedFilters.status);
        }
        if (appliedFilters.priority !== "all") {
          countQuery.eq("priority", appliedFilters.priority);
        }

        // Get tasks with pagination
        let query = supabase
          .from("tasks")
          .select("*")
          .eq("company_id", companyUserData.company_id)
          .or(
            `created_by.eq.${companyUserData.id},assigned_to.eq.${companyUserData.id}`
          );

        // Apply status filter
        if (appliedFilters.status !== "all") {
          query = query.eq("status", appliedFilters.status);
        }

        // Apply priority filter
        if (appliedFilters.priority !== "all") {
          query = query.eq("priority", appliedFilters.priority);
        }

        // Apply sorting based on the applied sort order
        query = query
          .order("created_at", {
            ascending: appliedFilters.sortOrder === "asc",
          })
          .range(from, to);

        console.log("Executing queries...");

        // Execute both queries
        const [countResult, tasksResult] = await Promise.all([
          countQuery,
          query,
        ]);

        console.log("Query results:", {
          countError: countResult.error,
          tasksError: tasksResult.error,
          taskCount: countResult.count,
          tasksFound: tasksResult.data?.length,
        });

        if (countResult.error) throw countResult.error;
        if (tasksResult.error) throw tasksResult.error;

        const tasks = tasksResult.data || [];
        const totalCount = countResult.count || 0;

        // If we need creator details, fetch them separately
        if (tasks && tasks.length > 0) {
          const creatorIds = [...new Set(tasks.map((task) => task.created_by))];
          const assigneeIds = [
            ...new Set(tasks.map((task) => task.assigned_to).filter(Boolean)),
          ];
          const allUserIds = [...new Set([...creatorIds, ...assigneeIds])];

          console.log("Fetching user details for IDs:", allUserIds);

          // First check which creators are super admins
          const { data: adminUsers } = await supabase
            .from("admin")
            .select("id, role, name")
            .in("id", creatorIds);

          console.log("Admin users found:", adminUsers);

          // Identify super admin creators but don't filter them out
          const superAdminIds =
            adminUsers
              ?.filter(
                (admin) =>
                  admin.role === "SUPER_ADMIN" || admin.role === "superadmin"
              )
              .map((admin) => admin.id) || [];

          console.log("Super admin IDs:", superAdminIds);

          // Fetch user details from company_user table
          const { data: userDetails } = await supabase
            .from("company_user")
            .select("id, first_name, last_name, email, role")
            .in("id", allUserIds);

          // Map user details to tasks, including super admin info
          const tasksWithUsers = tasks.map((task) => ({
            ...task,
            creator:
              userDetails?.find((user) => user.id === task.created_by) ||
              adminUsers?.find((admin) => admin.id === task.created_by),
            assignee: userDetails?.find((user) => user.id === task.assigned_to),
            isCreatedBySuperAdmin: superAdminIds.includes(task.created_by),
          }));

          return {
            data: tasksWithUsers,
            count: totalCount,
          };
        }

        return { data: tasks, count: totalCount };
      };

      const result = await cachedQuery<any>(fetchData, cacheKey, {
        forceRefresh,
        criticalData: true,
      });

      // Check if we're using stale data
      if (result.fromCache && result.error) {
        // Show a gentle warning about using stale data
        setError(
          "You're viewing cached data. Some information may be outdated."
        );
      }

      const { data, error } = result;
      // Get count from the Supabase response metadata
      const count = result.data?.length ? (result as any).count : 0;

      if (error && !result.fromCache) {
        console.error("Error fetching tasks:", error);

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
          throw new Error(error.message || "Failed to fetch tasks");
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

      if (refresh || currentPage === 0) {
        setTasks(data);
      } else {
        setTasks((prev) => [...prev, ...data]);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
      if (!networkStatus) {
        setError("You're offline. Some features may be unavailable.");
      } else {
        setError(error.message || "Failed to load tasks");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    // Start fetching immediately
    setLoading(true);
    fetchTasks(true);
  }, [user]);

  useEffect(() => {
    // Skip this effect on initial render when searchQuery is empty
    if (searchQuery === "" && !refreshing) {
      return;
    }

    // Clear the timeout on unmount
    let debounceTimeout;

    // Only fetch when a search query is entered or cleared
    if (searchQuery.trim() === "" || searchQuery.length > 2) {
      // Only show refresh indicator when actively searching
      if (searchQuery.length > 0) {
        setRefreshing(true);
      } else {
        // For empty search, don't show the full refresh indicator
        setRefreshing(false);
      }

      // Clear any existing searches from cache when search query changes
      if (searchQuery.trim() !== "" && companyId) {
        clearCache(`tasks_${companyId}_${searchQuery.trim()}`);
      }

      debounceTimeout = setTimeout(() => {
        // Don't try to search when offline
        if (networkStatus === false && searchQuery.trim() !== "") {
          setError("Search is unavailable while offline");
          setRefreshing(false);
          return;
        }

        fetchTasks(true);
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
    fetchTasks(true);
  };

  const loadMoreTasks = () => {
    if (!loading && !loadingMore && hasMoreData && networkStatus !== false) {
      setPage((prevPage) => prevPage + 1);
      fetchTasks(false);
    }
  };

  // Apply filters and refresh tasks list
  const applyFilters = () => {
    // Close modal first
    setFilterModalVisible(false);

    // Apply new filters
    const newFilters = {
      status: statusFilter,
      priority: priorityFilter,
      sortOrder: sortOrder,
    };

    // Set applied filters
    setAppliedFilters(newFilters);

    // Fetch tasks with new filters
    fetchTasks(true);
  };

  // Clear all filters
  const clearFilters = () => {
    setStatusFilter("all");
    setPriorityFilter("all");
    setSortOrder("desc");
    setFilterModalVisible(false);

    // Clear applied filters
    setAppliedFilters({
      status: "all",
      priority: "all",
      sortOrder: "desc",
    });

    // Call the regular fetch after resetting everything
    fetchTasks(true);
  };

  // Check if we have any active filters
  const hasActiveFilters = () => {
    return (
      appliedFilters.status !== "all" ||
      appliedFilters.priority !== "all" ||
      appliedFilters.sortOrder !== "desc"
    );
  };

  const getPriorityColor = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH:
        return "#F44336"; // Red for high priority
      case TaskPriority.MEDIUM:
        return "#F59E0B"; // Orange for medium priority
      case TaskPriority.LOW:
        return "#1a73e8"; // Blue for low priority
      default:
        return "#1a73e8"; // Default blue
    }
  };

  // Render active filter indicator
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
          {appliedFilters.status !== "all" && (
            <Chip
              mode="outlined"
              onClose={() => {
                setAppliedFilters({
                  ...appliedFilters,
                  status: "all",
                });
                setStatusFilter("all");
                fetchTasks(true);
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
              Status: {appliedFilters.status}
            </Chip>
          )}
          {appliedFilters.priority !== "all" && (
            <Chip
              mode="outlined"
              onClose={() => {
                setAppliedFilters({
                  ...appliedFilters,
                  priority: "all",
                });
                setPriorityFilter("all");
                fetchTasks(true);
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
              Priority:{" "}
              {appliedFilters.priority.charAt(0).toUpperCase() +
                appliedFilters.priority.slice(1)}
            </Chip>
          )}
          {appliedFilters.sortOrder !== "desc" && (
            <Chip
              mode="outlined"
              onClose={() => {
                setAppliedFilters({
                  ...appliedFilters,
                  sortOrder: "desc",
                });
                setSortOrder("desc");
                fetchTasks(true);
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
              Date: Oldest first
            </Chip>
          )}
        </ScrollView>
      </View>
    );
  };

  // Render the filter modal
  const renderFilterModal = () => {
    return (
      <Portal>
        <Modal
          visible={filterModalVisible}
          onDismiss={() => setFilterModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalHeaderContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Options</Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setFilterModalVisible(false)}
              />
            </View>
            <Divider style={styles.modalDivider} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Status Filter Section */}
            <View style={styles.modalSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Filter by status</Text>
              </View>
              <RadioButton.Group
                onValueChange={(value) =>
                  setStatusFilter(value as TaskStatus | "all")
                }
                value={statusFilter}
              >
                <View style={styles.radioItem}>
                  <RadioButton.Android value="all" color="#1a73e8" />
                  <Text style={styles.radioLabel}>All Statuses</Text>
                </View>
                {Object.values(TaskStatus).map((status) => (
                  <View key={status} style={styles.radioItem}>
                    <RadioButton.Android value={status} color="#1a73e8" />
                    <Text style={styles.radioLabel}>
                      {status.charAt(0).toUpperCase() +
                        status.slice(1).replace(/_/g, " ")}
                    </Text>
                  </View>
                ))}
              </RadioButton.Group>
            </View>

            <Divider style={styles.modalDivider} />

            {/* Priority Filter */}
            <View style={styles.modalSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Filter by priority</Text>
              </View>
              <RadioButton.Group
                onValueChange={(value) =>
                  setPriorityFilter(value as TaskPriority | "all")
                }
                value={priorityFilter}
              >
                <View style={styles.radioItem}>
                  <RadioButton.Android value="all" color="#1a73e8" />
                  <Text style={styles.radioLabel}>All Priorities</Text>
                </View>
                {Object.values(TaskPriority).map((priority) => (
                  <View key={priority} style={styles.radioItem}>
                    <RadioButton.Android value={priority} color="#1a73e8" />
                    <Text style={styles.radioLabel}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </Text>
                  </View>
                ))}
              </RadioButton.Group>
            </View>

            <Divider style={styles.modalDivider} />

            {/* Date Sort Section */}
            <View style={styles.modalSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Sort by creation date</Text>
              </View>
              <RadioButton.Group
                onValueChange={(value) => setSortOrder(value)}
                value={sortOrder}
              >
                <View style={styles.radioItem}>
                  <RadioButton.Android value="desc" color="#1a73e8" />
                  <Text style={styles.radioLabel}>Newest first</Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton.Android value="asc" color="#1a73e8" />
                  <Text style={styles.radioLabel}>Oldest first</Text>
                </View>
              </RadioButton.Group>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.footerButton}
              onPress={clearFilters}
            >
              <Text style={styles.clearButtonText}>Clear Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerButton, styles.applyButton]}
              onPress={applyFilters}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </Portal>
    );
  };

  // Enhanced renderTaskItem with better UI
  const renderTaskItem = ({ item }: { item: Task }) => (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate(
          "TaskDetails" as never,
          { taskId: item.id } as never
        )
      }
    >
      <View style={styles.taskCard}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <View style={{ flex: 1, marginRight: 8 }}>
            <Text
              style={{
                fontSize: 16,
                color: "#333",
                marginBottom: 4,
                fontWeight: "bold",
              }}
            >
              {item.title}
            </Text>
          </View>
          <StatusBadge status={item.status} />
        </View>

        <Text
          style={{
            marginBottom: 16,
            opacity: 0.7,
            color: "#666",
            lineHeight: 20,
          }}
          numberOfLines={2}
        >
          {item.description}
        </Text>

        <View style={styles.detailsSection}>
          {item.assignee && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Assigned to</Text>
              <Text style={styles.detailValue}>
                : {item.assignee.first_name} {item.assignee.last_name}
              </Text>
            </View>
          )}
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Created</Text>
            <Text style={styles.detailValue}>
              : {format(new Date(item.created_at), "MMM d, yyyy")}
            </Text>
          </View>
          {item.creator && (
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Created by</Text>
              <Text style={styles.detailValue}>
                : {item.creator.first_name} {item.creator.last_name}
              </Text>
            </View>
          )}
        </View>

        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Chip
            icon="flag"
            style={{
              height: 30,
              borderRadius: 25,
              borderWidth: 1,
              backgroundColor: getPriorityColor(item.priority) + "20",
              borderColor: getPriorityColor(item.priority),
            }}
            textStyle={{
              color: getPriorityColor(item.priority),
              fontSize: 12,
            }}
          >
            {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
          </Chip>

          <Text
            style={{
              opacity: 0.8,
              fontSize: 13,
              color: "#555",
              backgroundColor: "#f5f5f5",
              paddingVertical: 6,
              paddingHorizontal: 12,
              borderRadius: 6,
            }}
          >
            Due: {format(new Date(item.deadline), "MMM d, yyyy")}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Add TableRow component
  const TableRow = ({ item }: { item: Task }) => (
    <Pressable
      onPress={() => navigation.navigate("TaskDetails", { taskId: item.id })}
      style={({ pressed }: PressableStateCallbackType) => [
        styles.tableRow,
        pressed && { backgroundColor: "#f8fafc" },
      ]}
    >
      <View style={styles.tableCell}>
        <TooltipText text={item.title} />
      </View>
      <View style={styles.tableCell}>
        <TooltipText text={item.assigned_to || "-"} />
      </View>
      <View style={styles.tableCell}>
        <TooltipText text={format(new Date(item.deadline), "MMM d, yyyy")} />
      </View>
      <View style={styles.tableCell}>
        <Chip
          style={{
            borderRadius: 25,
            backgroundColor: getPriorityColor(item.priority) + "20",
          }}
          textStyle={{
            color: getPriorityColor(item.priority),
            fontSize: 11,
          }}
        >
          {item.priority.charAt(0).toUpperCase() + item.priority.slice(1)}
        </Chip>
      </View>
      <View style={styles.tableCell}>
        <StatusBadge status={item.status} />
      </View>
    </Pressable>
  );

  // Update renderContent to handle table layout
  const renderContent = () => {
    if (filteredTasks.length === 0 && !loading && !refreshing) {
      return (
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <EmptyState
            icon="clipboard-text-off"
            title="No Tasks Found"
            message={
              searchQuery || hasActiveFilters()
                ? "No tasks match your search criteria."
                : "You haven't created any tasks yet."
            }
            buttonTitle={
              searchQuery || hasActiveFilters()
                ? "Clear Filters"
                : "Create Task"
            }
            onButtonPress={() => {
              if (searchQuery || hasActiveFilters()) {
                setSearchQuery("");
                clearFilters();
              } else {
                navigation.navigate("CreateTask" as never);
              }
            }}
          />
        </ScrollView>
      );
    }

    // Show skeleton loaders when initially loading
    if (loading && filteredTasks.length === 0) {
      if (isMediumScreen || isLargeScreen) {
        return <TableSkeleton />;
      }
      return (
        <FlatList
          data={Array(3).fill(0)}
          renderItem={() => <TaskItemSkeleton />}
          keyExtractor={(_, index) => `skeleton-${index}`}
          contentContainerStyle={styles.listContent}
        />
      );
    }

    if (isMediumScreen || isLargeScreen) {
      return (
        <View style={styles.tableContainer}>
          <TableHeader />
          <FlatList
            data={filteredTasks}
            renderItem={({ item }) => <TableRow item={item} />}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.tableContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            onEndReached={loadMoreTasks}
            onEndReachedThreshold={0.5}
            ListFooterComponent={() => (
              <View style={styles.loadingFooter}>
                {loadingMore && hasMoreData && (
                  <ActivityIndicator size="small" color="#1a73e8" />
                )}
                {!hasMoreData && filteredTasks.length > 0 && (
                  <Text style={styles.endListText}>No more tasks to load</Text>
                )}
              </View>
            )}
          />
        </View>
      );
    }

    return (
      <FlatList
        data={filteredTasks}
        renderItem={renderTaskItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMoreTasks}
        onEndReachedThreshold={0.3}
        ListFooterComponent={() => (
          <View style={styles.loadingFooter}>
            {loadingMore && hasMoreData && (
              <ActivityIndicator size="small" color="#1a73e8" />
            )}
            {!hasMoreData && filteredTasks.length > 0 && (
              <Text style={styles.endListText}>No more tasks to load</Text>
            )}
          </View>
        )}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#F5F5F5" }]}>
      <AppHeader
        title="Tasks"
        showBackButton={false}
        showHelpButton={true}
        onHelpPress={() => {
          navigation.navigate("Help" as never);
        }}
        showLogo={false}
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
                  fetchTasks(true);
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
            placeholder="Search tasks..."
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
            theme={{ colors: { primary: "#1a73e8" } }}
          />
          <View style={styles.filterButtonContainer}>
            <IconButton
              icon="filter-variant"
              size={24}
              style={[
                styles.filterButton,
                hasActiveFilters() && styles.activeFilterButton,
              ]}
              iconColor={hasActiveFilters() ? "#1a73e8" : undefined}
              onPress={() => setFilterModalVisible(true)}
            />
            {hasActiveFilters() && <View style={styles.filterBadge} />}
          </View>
        </View>

        <FAB
          icon="plus"
          label={isLargeScreen ? "Create Task" : undefined}
          style={[
            styles.fab,
            {
              backgroundColor: theme.colors.primary,
              position: "relative",
              margin: 0,
              marginLeft: 16,
            },
          ]}
          onPress={() => navigation.navigate("CreateTask")}
          color={theme.colors.surface}
          mode="flat"
          theme={{ colors: { accent: theme.colors.surface } }}
        />
      </View>

      {renderActiveFilterIndicator()}
      {renderFilterModal()}

      <View
        style={[
          styles.contentContainer,
          {
            maxWidth: isLargeScreen ? 1500 : isMediumScreen ? 900 : "100%",
            alignSelf: "center",
            width: "100%",
            flex: 1,
          },
        ]}
      >
        {renderContent()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: Platform.OS === "web" ? 24 : 16,
    paddingVertical: 16,
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
    height: 56,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    flex: 1,
  },
  filterButtonContainer: {
    position: "relative",
    marginLeft: 8,
  },
  filterButton: {
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    borderRadius: 12,
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
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 16,
    elevation: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
    overflow: "hidden",
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  taskTitle: {
    fontSize: 16,
    color: "#333",
    marginBottom: 4,
  },
  taskDescription: {
    marginBottom: 16,
    opacity: 0.7,
    color: "#666",
    lineHeight: 20,
  },
  detailsSection: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderLeftWidth: 2,
    borderLeftColor: "#1a73e8",
  },
  detailItem: {
    flexDirection: "row",
    marginBottom: 4,
  },
  detailLabel: {
    opacity: 0.7,
    color: "#333",
    fontSize: 13,
    fontWeight: "600",
    marginRight: 2,
  },
  detailValue: {
    flex: 1,
    color: "#666",
    fontSize: 13,
  },
  fab: {
    borderRadius: 17,
    height: 56,
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    margin: 16,
    overflow: "hidden",
    maxHeight: "80%",
    elevation: 5,
  },
  modalHeaderContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    zIndex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontFamily: "Poppins-SemiBold",
    color: "#212121",
  },
  modalContent: {
    maxHeight: 400,
  },
  modalDivider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginTop: 16,
  },
  modalSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#212121",
  },
  radioItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  radioLabel: {
    fontSize: 16,
    marginLeft: 12,
    fontFamily: "Poppins-Regular",
    color: "#424242",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  footerButton: {
    borderRadius: 8,
    marginLeft: 16,
  },
  applyButton: {
    elevation: 2,
  },
  clearButtonText: {
    fontFamily: "Poppins-Medium",
    color: "#616161",
  },
  applyButtonText: {
    fontFamily: "Poppins-Medium",
    color: "#FFFFFF",
  },
  loadingFooter: {
    padding: 16,
    alignItems: "center",
  },
  endListText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#616161",
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
  tableHeaderRow: {
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
    fontFamily: "Poppins-Medium",
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
    fontFamily: "Poppins-Regular",
  },
  tableContent: {
    flexGrow: 1,
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
    fontFamily: "Poppins-Regular",
    lineHeight: 16,
  },
});

export default CompanyAdminTasksScreen;
