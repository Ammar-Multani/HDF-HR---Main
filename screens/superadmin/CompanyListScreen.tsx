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
  Divider,
  Banner,
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

// Component for skeleton loading UI
const CompanyItemSkeleton = () => {
  const theme = useTheme();
  return (
    <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
      <Card.Content>
        <View style={styles.cardHeader}>
          <View
            style={[
              styles.skeleton,
              styles.skeletonTitle,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          />
          <View
            style={[
              styles.skeleton,
              styles.skeletonBadge,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          />
        </View>
        <View style={styles.cardDetails}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.detailItem}>
              <View
                style={[
                  styles.skeleton,
                  styles.skeletonLabel,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              />
              <View
                style={[
                  styles.skeleton,
                  styles.skeletonValue,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              />
            </View>
          ))}
        </View>
      </Card.Content>
    </Card>
  );
};

const CompanyListScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
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
      const cacheKey = `companies_${searchQuery.trim()}_page${page}_size${PAGE_SIZE}`;

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
          "id, company_name, registration_number, industry_type, contact_number, active",
          { count: "exact" } // Get exact count for better pagination
        );

        // Apply optimization: use text_search for better performance when searching
        if (searchQuery.trim() !== "") {
          // Better performance using the pg_trgm index we've added
          if (searchQuery.length > 2) {
            query = query.or(
              `company_name.ilike.%${searchQuery.toLowerCase()}%,registration_number.ilike.%${searchQuery.toLowerCase()}%,industry_type.ilike.%${searchQuery.toLowerCase()}%`
            );
          } else {
            // For very short queries, use exact matching for better performance
            query = query.or(
              `company_name.ilike.${searchQuery.toLowerCase()}%,registration_number.ilike.${searchQuery.toLowerCase()}%,industry_type.ilike.${searchQuery.toLowerCase()}%`
            );
          }
        }

        // Add proper pagination with ordering for consistent results
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
        setError("You're offline. Some features may be unavailable.");
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
      if (searchQuery.trim() !== "") {
        clearCache(`companies_${searchQuery.trim()}`);
      }

      debounceTimeout = setTimeout(() => {
        // Don't try to search when offline
        if (networkStatus === false && searchQuery.trim() !== "") {
          setError("Search is unavailable while offline");
          setRefreshing(false);
          return;
        }

        fetchCompanies(true);
      }, 500);
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
      setError("Cannot refresh while offline");
      return;
    }

    // Explicitly set refreshing to true for pull-to-refresh
    setRefreshing(true);

    // Use a slight delay to ensure the refreshing indicator appears
    setTimeout(() => {
      fetchCompanies(true);
    }, 100);
  };

  const renderCompanyItem = ({ item }: { item: Company }) => (
    <TouchableOpacity
      onPress={() => {
        // Use an approach that's type-safe
        // @ts-ignore - Navigation typing is complex but this works
        navigation.navigate("CompanyDetails", { companyId: item.id });
      }}
    >
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.companyName}>{item.company_name}</Text>
            <StatusBadge
              status={item.active ? UserStatus.ACTIVE : UserStatus.INACTIVE}
            />
          </View>

          <View style={styles.cardDetails}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Registration:</Text>
              <Text style={styles.detailValue}>{item.registration_number}</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Industry:</Text>
              <Text style={styles.detailValue}>{item.industry_type}</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Contact:</Text>
              <Text style={styles.detailValue}>{item.contact_number}</Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderContent = () => {
    // Show empty state when no results and not loading
    if (filteredCompanies.length === 0 && !loading && !refreshing) {
      return (
        <EmptyState
          icon="domain-off"
          title="No Companies Found"
          message={
            searchQuery
              ? "No companies match your search criteria."
              : "You haven't added any companies yet."
          }
          buttonTitle={searchQuery ? "Clear Search" : "Add Company"}
          onButtonPress={() => {
            if (searchQuery) {
              setSearchQuery("");
            } else {
              // @ts-ignore - Navigation typing is complex but this works
              navigation.navigate("CreateCompany");
            }
          }}
        />
      );
    }

    // Show skeleton loaders when initially loading
    if (loading && filteredCompanies.length === 0) {
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
        ListHeaderComponent={
          totalCount > 0 ? (
            <Text style={styles.resultsCount}>
              Showing {filteredCompanies.length} of {totalCount} companies
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
      <AppHeader
        showLogo={false}
        showBackButton={false}
        title="Companies"
        showHelpButton={true}
        absolute={false}
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
                  fetchCompanies(true);
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
          placeholder="Search companies..."
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
        onPress={() => {
          // @ts-ignore - Navigation typing is complex but this works
          navigation.navigate("CreateCompany");
        }}
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
    elevation: 0,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
    marginBottom: 16,
    elevation: 0,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  companyName: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
  },
  cardDetails: {
    marginTop: 8,
  },
  detailItem: {
    flexDirection: "row",
    marginBottom: 4,
  },
  detailLabel: {
    fontWeight: "500",
    marginRight: 8,
    opacity: 0.7,
    width: 100,
  },
  detailValue: {
    flex: 1,
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
  skeletonTitle: {
    height: 22,
    width: "70%",
  },
  skeletonBadge: {
    height: 24,
    width: 80,
    borderRadius: 12,
  },
  skeletonLabel: {
    height: 16,
    width: 90,
  },
  skeletonValue: {
    height: 16,
    flex: 1,
  },
  resultsCount: {
    textAlign: "center",
    marginBottom: 8,
    opacity: 0.7,
    fontSize: 12,
  },
});

export default CompanyListScreen;
