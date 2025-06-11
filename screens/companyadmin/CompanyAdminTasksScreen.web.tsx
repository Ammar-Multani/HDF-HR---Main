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
  Surface,
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
import Pagination from "../../components/Pagination";
import FilterModal from "../../components/FilterModal";
import {
  FilterSection,
  RadioFilterGroup,
  FilterDivider,
  PillFilterGroup,
} from "../../components/FilterSections";
import HelpGuideModal from "../../components/HelpGuideModal";

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

// Add extended Task interface
interface ExtendedTask extends Task {
  assignee?: {
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
  creator?: {
    first_name: string;
    last_name: string;
    email: string;
    role: string;
  };
  isCreatedBySuperAdmin?: boolean;
}

// Add interfaces for user types
interface CompanyUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

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
  const [tasks, setTasks] = useState<ExtendedTask[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTasks, setFilteredTasks] = useState<ExtendedTask[]>([]);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [page, setPage] = useState(0);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [networkStatus, setNetworkStatus] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalItems, setTotalItems] = useState(0);
  const PAGE_SIZE = 10;

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  // Filter modal state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">(
    "all"
  );
  const [appliedFilters, setAppliedFilters] = useState<{
    status: TaskStatus | "all";
    priority: TaskPriority | "all";
  }>({
    status: "all",
    priority: "all",
  });

  // Help guide state
  const [helpModalVisible, setHelpModalVisible] = useState(false);

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

  // Update memoizedFilteredTasks to always sort by newest first
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

      // Apply search filter
      if (searchQuery.trim() !== "") {
        filtered = filtered.filter(
          (task) =>
            task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (task.description &&
              task.description
                .toLowerCase()
                .includes(searchQuery.toLowerCase()))
        );
      }

      // Always sort by newest first
      return filtered.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } catch (error) {
      console.error("Error filtering tasks:", error);
      return tasks;
    }
  }, [tasks, appliedFilters.status, appliedFilters.priority, searchQuery]);

  // Update filteredTasks when memoizedFilteredTasks changes
  useEffect(() => {
    setFilteredTasks(memoizedFilteredTasks);
  }, [memoizedFilteredTasks]);

  const fetchTasks = async (refresh = false) => {
    try {
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
      const filterKey = `${appliedFilters.status}_${appliedFilters.priority}`;
      const cacheKey = `tasks_${companyUserData.company_id}_${searchQuery.trim()}_${filterKey}_page${currentPage}_size${PAGE_SIZE}`;

      // Only force refresh when explicitly requested
      const forceRefresh = refresh;

      // Check network availability
      const networkAvailable = await isNetworkAvailable();
      if (!networkAvailable && refresh) {
      }

      // Use cached query implementation with proper typing
      const fetchData = async () => {
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
            ascending: false,
          })
          .range(from, to);

        // Execute both queries
        const [countResult, tasksResult] = await Promise.all([
          countQuery,
          query,
        ]);

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

          // First check which creators are super admins
          const { data: adminUsers } = await supabase
            .from("admin")
            .select("id, role, name, email")
            .in("id", allUserIds);

          // Identify super admin creators
          const superAdminIds =
            adminUsers
              ?.filter(
                (admin) =>
                  admin.role === "SUPER_ADMIN" || admin.role === "superadmin"
              )
              .map((admin) => admin.id) || [];

          // Fetch user details from company_user table
          const { data: userDetails } = await supabase
            .from("company_user")
            .select("id, first_name, last_name, email, role")
            .in("id", allUserIds);

          // Map user details to tasks
          const tasksWithUsers = tasks.map((task) => {
            const creator =
              (userDetails?.find(
                (user) => user.id === task.created_by
              ) as CompanyUser) ||
              (adminUsers?.find(
                (admin) => admin.id === task.created_by
              ) as AdminUser);

            const assignee =
              (userDetails?.find(
                (user) => user.id === task.assigned_to
              ) as CompanyUser) ||
              (adminUsers?.find(
                (admin) => admin.id === task.assigned_to
              ) as AdminUser);

            // Format admin users to match company_user structure
            const formatAdminUser = (
              admin: AdminUser | null
            ): CompanyUser | null => {
              if (!admin) return null;
              return {
                id: admin.id,
                first_name: admin.name?.split(" ")[0] || "",
                last_name: admin.name?.split(" ").slice(1).join(" ") || "",
                email: admin.email,
                role: admin.role,
              };
            };

            return {
              ...task,
              creator: creator
                ? "first_name" in creator
                  ? creator
                  : formatAdminUser(creator)
                : null,
              assignee: assignee
                ? "first_name" in assignee
                  ? assignee
                  : formatAdminUser(assignee)
                : null,
              isCreatedBySuperAdmin: superAdminIds.includes(task.created_by),
            };
          });

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

      // Set total items for pagination
      setTotalItems(count || 0);
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

  // Update applyFilters to remove sort order
  const applyFilters = () => {
    setFilterModalVisible(false);
    const newFilters = {
      status: statusFilter,
      priority: priorityFilter,
    };
    setAppliedFilters(newFilters);
  };

  // Update clearFilters to remove sort order
  const clearFilters = useCallback(() => {
    // Reset all filter states
    setStatusFilter("all");
    setPriorityFilter("all");
    setAppliedFilters({
      status: "all",
      priority: "all",
    });
    setPage(0);

    fetchTasks(true);
  }, [statusFilter, priorityFilter, appliedFilters]);

  // Update hasActiveFilters to remove sort order check
  const hasActiveFilters = () => {
    return appliedFilters.status !== "all" || appliedFilters.priority !== "all";
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

  // Move handlers to component level
  const handleStatusClear = useCallback(() => {
    setStatusFilter("all");
    setAppliedFilters((prev) => {
      return {
        ...prev,
        status: "all",
      };
    });
    setPage(0);
    fetchTasks(true);
  }, []);

  const handlePriorityClear = useCallback(() => {
    setPriorityFilter("all");
    setAppliedFilters((prev) => {
      return {
        ...prev,
        priority: "all",
      };
    });
    setPage(0);
    fetchTasks(true);
  }, []);

  const handleClearAllFilters = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  // Render active filter indicator without hooks inside
  const renderActiveFilterIndicator = () => {
    if (!hasActiveFilters()) {
      return null;
    }

    return (
      <View style={styles.activeFiltersContainer}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Text style={styles.activeFiltersText}>Active Filters</Text>
          {/* <IconButton
            icon="close-circle"
            size={16}
            onPress={handleClearAllFilters}
            style={{ margin: -8 }}
          /> */}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScrollView}
        >
          {appliedFilters.status !== "all" && (
            <Chip
              mode="outlined"
              onClose={handleStatusClear}
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
              onClose={handlePriorityClear}
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
        </ScrollView>
      </View>
    );
  };

  // Add effect to sync filter states
  useEffect(() => {
    const needsSync =
      appliedFilters.status !== statusFilter ||
      appliedFilters.priority !== priorityFilter;

    if (needsSync) {
      setAppliedFilters({
        status: statusFilter,
        priority: priorityFilter,
      });
    }
  }, [statusFilter, priorityFilter]);

  // Update the filter modal
  const renderFilterModal = () => {
    const statusOptions = [
      { label: "All Status", value: "all" },
      ...Object.values(TaskStatus).map((status) => ({
        label: status
          .split("_")
          .map(
            (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          )
          .join(" "),
        value: status,
      })),
    ];

    const priorityOptions = [
      { label: "All Priorities", value: "all" },
      ...Object.values(TaskPriority).map((priority) => ({
        label: priority
          .split("_")
          .map(
            (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          )
          .join(" "),
        value: priority,
      })),
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
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as TaskStatus | "all")
            }
          />
        </FilterSection>

        <FilterDivider />

        <FilterSection title="Priority">
          <PillFilterGroup
            options={priorityOptions}
            value={priorityFilter}
            onValueChange={(value) =>
              setPriorityFilter(value as TaskPriority | "all")
            }
          />
        </FilterSection>
      </FilterModal>
    );
  };

  // Update the renderTaskItem to use the new ExtendedTask type
  const renderTaskItem = ({ item }: { item: ExtendedTask }) => (
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
              backgroundColor: getPriorityColor(item.priority),
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

  // Update the TableRow component to use ExtendedTask and show formatted names
  const TableRow = ({ item }: { item: ExtendedTask }) => (
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
        <TooltipText
          text={
            item.assignee
              ? `${item.assignee.first_name} ${item.assignee.last_name}`
              : "-"
          }
        />
      </View>
      <View style={styles.tableCell}>
        <TooltipText text={format(new Date(item.deadline), "MMM d, yyyy")} />
      </View>
      <View style={styles.tableCell}>
        <Chip
          style={{
            borderRadius: 25,
            backgroundColor: getPriorityColor(item.priority),
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

  // Add page handling
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // Update renderContent to handle table layout
  const renderContent = () => {
    if (error) {
      return (
        <EmptyState
          icon="alert-circle"
          title="Error"
          message={error}
          buttonTitle={networkStatus ? "Try Again" : "Retry"}
          onButtonPress={() => fetchTasks(true)}
        />
      );
    }

    if (filteredTasks.length === 0) {
      return (
        <EmptyState
          icon="clipboard-text"
          title="No Tasks Found"
          message={
            searchQuery || hasActiveFilters()
              ? "No tasks match your search criteria."
              : "No tasks available."
          }
          buttonTitle={
            searchQuery || hasActiveFilters() ? "Clear Filters" : undefined
          }
          onButtonPress={
            searchQuery || hasActiveFilters()
              ? () => {
                  setSearchQuery("");
                  clearFilters();
                }
              : undefined
          }
        />
      );
    }

    return (
      <>
        {isMediumScreen || isLargeScreen ? (
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
            />
          </View>
        ) : (
          <FlatList
            data={filteredTasks}
            renderItem={renderTaskItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}
        {totalPages > 1 && (
          <View style={styles.paginationWrapper}>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </View>
        )}
      </>
    );
  };

  // Define help guide content
  const helpGuideSteps = [
    {
      title: "Task Search",
      icon: "magnify",
      description:
        "Use the search bar to find tasks by title or description. The search updates in real-time as you type.",
    },
    {
      title: "Filter & Sort",
      icon: "filter-variant",
      description:
        "Filter tasks by status (Pending, In Progress, Completed) and priority level (Low, Medium, High). Active filters are shown as chips below the search bar.",
    },
    {
      title: "Task Management",
      icon: "clipboard-text",
      description:
        "View comprehensive task details including title, description, assignee, deadline, and status. Click on any task to see its full details and make updates.",
    },
    {
      title: "Priority Levels",
      icon: "flag",
      description:
        "Tasks are color-coded by priority: Blue for Low, Orange for Medium, and Red for High priority. Set priorities based on task urgency and importance.",
    },
    {
      title: "Task Creation",
      icon: "plus-circle",
      description:
        "Click 'Create Task' to add new tasks. Specify title, description, assignee, deadline, priority, and set up optional reminders.",
    },
  ];

  const helpGuideNote = {
    title: "Important Notes",
    content: [
      "All tasks are automatically sorted by creation date, with newest first",
      "Task status updates are reflected in real-time",
      "You can combine multiple filters for precise task management",
      "Task deadlines are displayed in a consistent date format",
      "Network status is monitored to ensure data accuracy",
    ],
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#F5F5F5" }]}>
      <AppHeader
        title="Tasks"
        showBackButton={false}
        showHelpButton={true}
        onHelpPress={() => setHelpModalVisible(true)}
        showLogo={false}
      />

      <HelpGuideModal
        visible={helpModalVisible}
        onDismiss={() => setHelpModalVisible(false)}
        title="Task Management Guide"
        description="Learn how to effectively manage and organize your tasks using the available tools and features."
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
        {renderActiveFilterIndicator()}
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
  taskCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
    padding: 16,
    marginBottom: 16,
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
});

export default CompanyAdminTasksScreen;
