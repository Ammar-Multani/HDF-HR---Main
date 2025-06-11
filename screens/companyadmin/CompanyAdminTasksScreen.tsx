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

  if (loading && !refreshing) {
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
        <View style={styles.searchContainer}>
          <View style={[styles.searchbar, { backgroundColor: "#E0E0E0" }]} />
          <View style={styles.filterButtonContainer}>
            <View
              style={[styles.filterButton, { backgroundColor: "#E0E0E0" }]}
            />
          </View>
        </View>
        <FlatList
          data={Array(3).fill(0)}
          renderItem={() => <TaskItemSkeleton />}
          keyExtractor={(_, index) => `skeleton-${index}`}
          contentContainerStyle={styles.listContent}
        />
      </SafeAreaView>
    );
  }

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

      <View style={styles.searchContainer}>
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
        {/* Filter button */}
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
            Found: {filteredTasks.length} tasks
          </Text>
        </View>
      )}

      {filteredTasks.length === 0 && !loading && !refreshing ? (
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
      ) : (
        <FlatList
          data={filteredTasks}
          renderItem={renderTaskItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMoreTasks}
          onEndReachedThreshold={0.5}
          ListHeaderComponent={
            totalCount > 0 ? (
              <Text style={styles.resultsCount}>
                Showing {filteredTasks.length} of {totalCount} tasks
              </Text>
            ) : null
          }
          ListFooterComponent={
            loadingMore && hasMoreData ? (
              <View style={styles.loadingFooter}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : null
          }
        />
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate("CreateTask" as never)}
        color="#FFFFFF"
        disabled={networkStatus === false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  searchbar: {
    elevation: 1,
    borderRadius: 16,
    height: 56,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    flex: 1,
    shadowColor: "rgba(0,0,0,0.1)",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterChip: {
    marginRight: 8,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    backgroundColor: "#fff",
  },
  selectedChip: {
    borderWidth: 0,
    backgroundColor: "rgba(54,105,157,255)",
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
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  priorityChip: {
    height: 30,
    borderRadius: 25,
    borderWidth: 1,
  },
  deadline: {
    opacity: 0.8,
    fontSize: 13,
    color: "#555",
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: Platform.OS === "web" ? 15 : 0,
    bottom: Platform.OS === "web" ? 10 : 80,
    borderRadius: 28,
    elevation: 4,
  },
  // Modal styles
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
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#212121",
  },
  modalContent: {
    padding: 16,
    maxHeight: 400,
  },
  modalDivider: {
    height: 1,
    backgroundColor: "#EEEEEE",
    marginVertical: 8,
  },
  modalSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212121",
  },
  radioItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
  },
  radioLabel: {
    fontSize: 16,
    marginLeft: 8,
    color: "#424242",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
  },
  footerButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginLeft: 12,
  },
  applyButton: {
    elevation: 2,
    backgroundColor: "#1a73e8",
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#616161",
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#FFFFFF",
  },
  loadingFooter: {
    padding: 16,
    alignItems: "center",
  },
  resultsCount: {
    textAlign: "center",
    marginBottom: 8,
    opacity: 0.7,
    fontSize: 12,
  },
  searchTips: {
    backgroundColor: "#e8f4fd",
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  searchTipsText: {
    color: "#0066cc",
    fontWeight: "500",
    fontSize: 14,
  },
  searchResultsContainer: {
    backgroundColor: "#e8f4fd",
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  searchResultsText: {
    color: "#0066cc",
    fontWeight: "500",
    fontSize: 14,
  },
  taskCard: {
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
  superAdminWarning: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    backgroundColor: "#F3E5F5",
    padding: 8,
    borderRadius: 8,
  },
  superAdminWarningText: {
    fontSize: 12,
    color: "#8E24AA",
    marginLeft: 4,
    fontStyle: "italic",
  },
});

export default CompanyAdminTasksScreen;
