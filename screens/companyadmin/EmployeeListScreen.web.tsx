import React, { useState, useEffect, useCallback } from "react";
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

// Date sort options
enum DateSortOrder {
  NEWEST_FIRST = "desc",
  OLDEST_FIRST = "asc",
}

// Component for skeleton loading UI
const EmployeeItemSkeleton = () => {
  const theme = useTheme();
  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <View
              style={[
                styles.skeleton,
                styles.skeletonAvatar,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
            />
            <View style={styles.userTextContainer}>
              <View
                style={[
                  styles.skeleton,
                  styles.skeletonName,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              />
              <View
                style={[
                  styles.skeleton,
                  styles.skeletonEmail,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              />
              <View
                style={[
                  styles.skeleton,
                  styles.skeletonJob,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              />
            </View>
          </View>
          <View
            style={[
              styles.skeleton,
              styles.skeletonBadge,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          />
        </View>
      </Card.Content>
    </Card>
  );
};

const EmployeeListScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [employees, setEmployees] = useState<CompanyUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredEmployees, setFilteredEmployees] = useState<CompanyUser[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [networkStatus, setNetworkStatus] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const PAGE_SIZE = 10;

  // New filter states
  const [statusFilter, setStatusFilter] = useState<string>("all");
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

  const fetchEmployees = async (refresh = false) => {
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

      // Get company ID if not already set
      const currentCompanyId = companyId || (await fetchCompanyId());
      if (!currentCompanyId) {
        console.error("No company ID found");
        setError("Unable to identify your company");
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        return;
      }

      setCompanyId(currentCompanyId);

      // Fetch job titles if not already loaded
      if (availableJobTitles.length === 0) {
        fetchJobTitles();
      }

      // Calculate pagination parameters
      const currentPage = refresh ? 0 : page;
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Generate a cache key based on all filters
      const filterKey = `${statusFilter}_${sortOrder}_${jobTitleFilter.join("_")}`;
      const cacheKey = `employees_${currentCompanyId}_${searchQuery.trim()}_${filterKey}_page${currentPage}_size${PAGE_SIZE}`;

      // Only force refresh when explicitly requested
      const forceRefresh = refresh;

      // Modified network check logic - only prevent refresh if DEFINITELY offline
      const networkAvailable = await isNetworkAvailable();
      if (!networkAvailable && refresh) {
        console.log(
          "Network appears to be offline, but still attempting fetch"
        );
        // We'll still try the fetch but prepare for potential errors
      }

      // Use cached query implementation with proper typing
      const fetchData = async () => {
        let query = supabase
          .from("company_user")
          .select(
            // Select fields from the company_user table
            "id, company_id, first_name, last_name, email, phone_number, role, active_status, created_by, created_at, updated_at, address, date_of_birth, nationality, id_type, ahv_number, marital_status, gender, employment_start_date, employment_end_date, employment_type, workload_percentage, job_title, education, ahv_card_path, id_card_path, bank_details, comments",
            { count: "exact" }
          )
          .eq("company_id", currentCompanyId)
          .eq("role", "employee"); // Make sure we only get employees

        // Apply status filter if not "all"
        if (statusFilter !== "all") {
          query = query.eq("active_status", statusFilter);
        }

        // Apply job title filter if any selected
        if (jobTitleFilter.length > 0) {
          query = query.in("job_title", jobTitleFilter);
        }

        // Apply search filter if present using optimized query patterns
        if (searchQuery.trim() !== "") {
          if (searchQuery.length > 2) {
            // For longer queries use wildcard search (uses our GIN index)
            const searchPattern = `%${searchQuery.toLowerCase()}%`;
            query = query.or(
              `first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},email.ilike.${searchPattern},job_title.ilike.${searchPattern}`
            );
          } else {
            // For short queries just search for starts-with for better performance
            const searchPattern = `${searchQuery.toLowerCase()}%`;
            query = query.or(
              `first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},email.ilike.${searchPattern},job_title.ilike.${searchPattern}`
            );
          }
        }

        // Add proper pagination with consistent ordering
        query = query
          .order("created_at", {
            ascending: sortOrder === DateSortOrder.OLDEST_FIRST,
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
        setError(
          "You're viewing cached data. Some information may be outdated."
        );
      }

      const { data, error } = result;
      // Get count from the Supabase response metadata
      const count = result.data?.length ? (result as any).count : 0;

      if (error && !result.fromCache) {
        console.error("Error fetching employees:", error);

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
          throw new Error(error.message || "Failed to fetch employees");
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

      const typedData = (data as CompanyUser[]) || [];

      if (refresh || currentPage === 0) {
        setEmployees(typedData);
        setFilteredEmployees(typedData);
      } else {
        setEmployees((prevEmployees) => [...prevEmployees, ...typedData]);
        setFilteredEmployees((prevEmployees) => [
          ...prevEmployees,
          ...typedData,
        ]);
      }
    } catch (error: any) {
      console.error("Error fetching employees:", error);
      if (!networkStatus) {
        setError("You're offline. Some features may be unavailable.");
      } else {
        setError(error.message || "Failed to load employees");
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

  const loadMoreEmployees = () => {
    if (!loading && !loadingMore && hasMoreData && networkStatus !== false) {
      setPage((prevPage) => prevPage + 1);
      fetchEmployees();
    }
  };

  const onRefresh = () => {
    if (networkStatus === false) {
      setError("Cannot refresh while offline");
      return;
    }

    // Explicitly set refreshing to true for pull-to-refresh
    setRefreshing(true);

    // Use a slight delay to ensure the refreshing indicator appears
    setTimeout(() => {
      fetchEmployees(true);
    }, 100);
  };

  const getInitials = (firstName: string, lastName: string) => {
    return (
      (firstName ? firstName.charAt(0).toUpperCase() : "") +
        (lastName ? lastName.charAt(0).toUpperCase() : "") || "?"
    );
  };

  const renderEmployeeItem = ({ item }: { item: CompanyUser }) => (
    <TouchableOpacity
      onPress={() => {
        // @ts-ignore - Handle navigation typing issue
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

  const renderContent = () => {
    // Show empty state when no results and not loading
    if (filteredEmployees.length === 0 && !loading && !refreshing) {
      return (
        <EmptyState
          icon="account-off"
          title="No Employees Found"
          message={
            searchQuery
              ? "No employees match your search criteria."
              : "You haven't added any employees yet."
          }
          buttonTitle={searchQuery ? "Clear Search" : "Add Employee"}
          onButtonPress={() => {
            if (searchQuery) {
              setSearchQuery("");
            } else {
              navigation.navigate("CreateEmployee" as never);
            }
          }}
        />
      );
    }

    // Show skeleton loaders when initially loading
    if (loading && filteredEmployees.length === 0) {
      return (
        <FlatList
          data={Array(3).fill(0)}
          renderItem={() => <EmployeeItemSkeleton />}
          keyExtractor={(_, index) => `skeleton-${index}`}
          contentContainerStyle={styles.listContent}
        />
      );
    }

    // Show the actual data
    return (
      <FlatList
        data={filteredEmployees}
        renderItem={renderEmployeeItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMoreEmployees}
        onEndReachedThreshold={0.5}
        ListHeaderComponent={
          totalCount > 0 ? (
            <Text style={styles.resultsCount}>
              Showing {filteredEmployees.length} of {totalCount} employees
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
    setStatusFilter("all");
    setJobTitleFilter([]);
    setSortOrder(DateSortOrder.NEWEST_FIRST);

    // Apply the cleared filters
    applyFiltersDirect();
  };

  // Indicator for active filters
  const renderActiveFilterIndicator = () => {
    if (!hasActiveFilters()) return null;

    const localStyles = {
      activeFilterChip: {
        margin: 4,
        backgroundColor: theme.colors.primary + "15",
        borderColor: theme.colors.primary,
      },
    };

    return (
      <View style={styles.activeFiltersContainer}>
        <Text style={styles.activeFiltersText}>Active filters:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScrollView}
        >
          {statusFilter !== "all" && (
            <Chip
              mode="outlined"
              onClose={() => {
                setStatusFilter("all");
                applyFiltersDirect();
              }}
              style={localStyles.activeFilterChip}
              textStyle={{ color: theme.colors.primary }}
            >
              Status:{" "}
              {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
            </Chip>
          )}

          {jobTitleFilter.length > 0 && (
            <Chip
              mode="outlined"
              onClose={() => {
                setJobTitleFilter([]);
                applyFiltersDirect();
              }}
              style={localStyles.activeFilterChip}
              textStyle={{ color: theme.colors.primary }}
            >
              {jobTitleFilter.length > 1
                ? `${jobTitleFilter.length} Job Titles`
                : `Job: ${jobTitleFilter[0]}`}
            </Chip>
          )}

          {sortOrder !== DateSortOrder.NEWEST_FIRST && (
            <Chip
              mode="outlined"
              onClose={() => {
                setSortOrder(DateSortOrder.NEWEST_FIRST);
                applyFiltersDirect();
              }}
              style={localStyles.activeFilterChip}
              textStyle={{ color: theme.colors.primary }}
            >
              Date: Oldest first
            </Chip>
          )}
        </ScrollView>
      </View>
    );
  };

  // Filter modal component
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
                onValueChange={(value) => setStatusFilter(value)}
                value={statusFilter}
              >
                <View style={styles.radioItem}>
                  <RadioButton.Android
                    value="all"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.radioLabel}>All Statuses</Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton.Android
                    value="active"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.radioLabel}>Active</Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton.Android
                    value="inactive"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.radioLabel}>Inactive</Text>
                </View>
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
                  <RadioButton.Android
                    value={DateSortOrder.NEWEST_FIRST}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.radioLabel}>Newest first</Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton.Android
                    value={DateSortOrder.OLDEST_FIRST}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.radioLabel}>Oldest first</Text>
                </View>
              </RadioButton.Group>
            </View>

            <Divider style={styles.modalDivider} />

            {/* Job Title Section */}
            {availableJobTitles.length > 0 && (
              <View style={styles.modalSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Filter by job title</Text>
                  <View style={styles.selectionBadge}>
                    <Text style={styles.selectionHint}>
                      {jobTitleFilter.length > 0
                        ? `${jobTitleFilter.length} selected`
                        : "All"}
                    </Text>
                  </View>
                </View>

                {/* Job Title Chips */}
                <View style={styles.chipContainer}>
                  {availableJobTitles.map((title) => (
                    <Chip
                      key={title}
                      selected={jobTitleFilter.includes(title)}
                      onPress={() => toggleJobTitleSelection(title)}
                      style={[
                        styles.filterChip,
                        jobTitleFilter.includes(title) && {
                          backgroundColor: theme.colors.primary + "20",
                          borderColor: theme.colors.primary,
                        },
                      ]}
                      textStyle={
                        jobTitleFilter.includes(title)
                          ? { color: theme.colors.primary }
                          : {}
                      }
                    >
                      {title}
                    </Chip>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.footerButton}
              onPress={handleClearFilters}
            >
              <Text style={styles.clearButtonText}>Clear Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.footerButton,
                styles.applyButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={applyFiltersDirect}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </Portal>
    );
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
                  fetchEmployees(true);
                }
              },
            },
          ]}
        >
          You are offline. Some features may be limited.
        </Banner>
      )}

      {error &&
        error !== "You're offline. Some features may be unavailable." && (
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

      <View style={styles.mainContent}>
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
          {/* Filter button */}
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

        {/* Show empty state when no results and not loading */}
        {filteredEmployees.length === 0 && !loading && !refreshing ? (
          <EmptyState
            icon="account-off"
            title="No Employees Found"
            message={
              searchQuery || hasActiveFilters()
                ? "No employees match your search criteria."
                : "You haven't added any employees yet."
            }
            buttonTitle={
              searchQuery || hasActiveFilters()
                ? "Clear Filters"
                : "Add Employee"
            }
            onButtonPress={() => {
              if (searchQuery || hasActiveFilters()) {
                setSearchQuery("");
                handleClearFilters();
              } else {
                navigation.navigate("CreateEmployee" as never);
              }
            }}
          />
        ) : // Show skeleton loaders when initially loading
        loading && filteredEmployees.length === 0 ? (
          <FlatList
            data={Array(3).fill(0)}
            renderItem={() => <EmployeeItemSkeleton />}
            keyExtractor={(_, index) => `skeleton-${index}`}
            contentContainerStyle={styles.listContent}
          />
        ) : (
          // Show the actual data
          <FlatList
            data={filteredEmployees}
            renderItem={renderEmployeeItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            onEndReached={loadMoreEmployees}
            onEndReachedThreshold={0.5}
            ListHeaderComponent={
              totalCount > 0 ? (
                <Text style={styles.resultsCount}>
                  Showing {filteredEmployees.length} of {totalCount} employees
                </Text>
              ) : null
            }
            ListFooterComponent={
              loadingMore && hasMoreData ? (
                <View style={styles.loadingFooter}>
                  <ActivityIndicator
                    size="small"
                    color={theme.colors.primary}
                  />
                </View>
              ) : null
            }
          />
        )}
      </View>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate("CreateEmployee" as never)}
        color={theme.colors.surface}
        disabled={networkStatus === false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    height: 60,
    marginTop: 8,
    marginBottom: 8,
  },
  searchbar: {
    flex: 1,
    elevation: 1,
    borderRadius: 18,
    height: 60,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    fontSize: 16,
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
  listContent: {
    paddingTop: 8,
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
  cardContainer: {
    marginBottom: 12,
    marginHorizontal: 0,
  },
  cardContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
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
  userName: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    marginBottom: 4,
    color: "#212121",
  },
  userEmail: {
    fontSize: 14,
    color: "#757575",
    fontFamily: "Poppins-Regular",
    marginBottom: 8,
  },
  badgeContainer: {
    flexDirection: "column",
    marginTop: 2,
  },
  jobTitleBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 16,
    paddingRight: 8,
    alignSelf: "flex-start",
  },
  jobTitleIcon: {
    margin: 0,
    padding: 0,
  },
  jobTitleBadgeText: {
    color: "#616161",
    fontSize: 12,
    fontFamily: "Poppins-Regular",
  },
  statusContainer: {
    flexDirection: "column",
    alignItems: "flex-end",
    justifyContent: "flex-start",
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: Platform.OS === "web" ? 0 : 80,
    borderRadius: 28,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: "center",
  },
  // Skeleton styles
  skeleton: {
    borderRadius: 4,
    opacity: 0.3,
  },
  skeletonAvatar: {
    height: 40,
    width: 40,
    borderRadius: 20,
  },
  skeletonName: {
    height: 18,
    width: "70%",
    marginLeft: 12,
    marginBottom: 4,
  },
  skeletonEmail: {
    height: 14,
    width: "60%",
    marginLeft: 12,
    marginBottom: 4,
  },
  skeletonJob: {
    height: 14,
    width: "40%",
    marginLeft: 12,
  },
  skeletonBadge: {
    height: 24,
    width: 80,
    borderRadius: 12,
  },
  resultsCount: {
    textAlign: "center",
    marginBottom: 8,
    opacity: 0.7,
    fontSize: 12,
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
    fontFamily: "Poppins-Bold",
  },
  // Filter modal styles
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
    fontSize: 20,
    fontFamily: "Poppins-SemiBold",
    color: "#212121",
  },
  modalContent: {
    padding: 16,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
  },
  modalDivider: {
    height: 1,
    backgroundColor: "#E0E0E0",
  },
  modalSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#212121",
    marginBottom: 0,
  },
  radioItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  radioLabel: {
    fontSize: 16,
    marginLeft: 8,
    fontFamily: "Poppins-Regular",
    color: "#424242",
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
  },
  filterChip: {
    margin: 4,
  },
  selectionBadge: {
    backgroundColor: "#F5F5F5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  selectionHint: {
    fontSize: 12,
    color: "#616161",
    fontFamily: "Poppins-Medium",
  },
  footerButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 12,
  },
  clearButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#616161",
  },
  applyButton: {
    elevation: 2,
  },
  applyButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#FFFFFF",
  },
  // Active filter indicator styles
  activeFiltersContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginBottom: 12,
    paddingHorizontal: 4,
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
  searchTips: {
    backgroundColor: "#e8f4fd",
    padding: 12,
    borderRadius: 8,
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
    marginBottom: 12,
  },
  searchResultsText: {
    color: "#0066cc",
    fontWeight: "500",
    fontSize: 14,
  },
});

export default EmployeeListScreen;
