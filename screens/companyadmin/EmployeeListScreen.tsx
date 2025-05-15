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
} from "react-native";
import {
  Text,
  Card,
  Searchbar,
  useTheme,
  FAB,
  Avatar,
  Banner,
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

      // Calculate pagination parameters
      const currentPage = refresh ? 0 : page;
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Generate a cache key based on search query, company ID and pagination
      const cacheKey = `employees_${currentCompanyId}_${searchQuery.trim()}_page${currentPage}_size${PAGE_SIZE}`;

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
          .select("*", { count: "exact" }) // Get exact count for better pagination
          .eq("company_id", currentCompanyId);

        // Apply search filter if present
        if (searchQuery.trim() !== "") {
          const searchPattern = `%${searchQuery.toLowerCase()}%`;
          query = query.or(
            `first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},email.ilike.${searchPattern},job_title.ilike.${searchPattern}`
          );
        }

        query = query.order("created_at", { ascending: false }).range(from, to);

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
      onPress={() =>
        navigation.navigate(
          "EmployeeDetails" as never,
          { employeeId: item.id } as never
        )
      }
    >
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.userInfo}>
              <Avatar.Text
                size={40}
                label={getInitials(item.first_name, item.last_name)}
                style={{ backgroundColor: theme.colors.primary }}
              />
              <View style={styles.userTextContainer}>
                <Text style={styles.userName}>
                  {item.first_name} {item.last_name}
                </Text>
                <Text style={styles.userEmail}>{item.email}</Text>
                {item.job_title && (
                  <Text style={styles.jobTitle}>{item.job_title}</Text>
                )}
              </View>
            </View>
            <StatusBadge status={item.active_status} />
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader title="Employees" showBackButton />

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
        />
      </View>

      {renderContent()}

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
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchbar: {
    elevation: 2,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "bold",
  },
  userEmail: {
    opacity: 0.7,
  },
  jobTitle: {
    marginTop: 4,
    fontSize: 14,
    opacity: 0.8,
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
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
});

export default EmployeeListScreen;
