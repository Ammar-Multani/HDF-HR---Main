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
  Platform,
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

// Component for skeleton loading UI
const CompanyItemSkeleton = () => {
  const theme = useTheme();
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
  const { t } = useTranslation();
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

  const renderCompanyItem = ({ item }: { item: Company }) => (
    <TouchableOpacity
      onPress={() => {
        // Use an approach that's type-safe
        // @ts-ignore - Navigation typing is complex but this works
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
                  ? new Date(item.created_at).toLocaleDateString()
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
    setActiveFilter(null);
    setSortOrder("desc");

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
      sortOrder: "desc",
    });

    // Call the regular fetch after resetting everything
    fetchCompanies(true);
  };

  // Check if we have any active filters
  const hasActiveFilters = () => {
    return (
      appliedFilters.status !== null || appliedFilters.sortOrder !== "desc"
    );
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
                  backgroundColor: theme.colors.primary + "15",
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
          {appliedFilters.sortOrder !== "desc" && (
            <Chip
              mode="outlined"
              onClose={() => {
                setAppliedFilters({
                  ...appliedFilters,
                  sortOrder: "desc",
                });
                setSortOrder("desc");
                setPage(0);
                fetchCompanies(true);
              }}
              style={[
                styles.activeFilterChip,
                {
                  backgroundColor: theme.colors.primary + "15",
                  borderColor: theme.colors.primary,
                },
              ]}
              textStyle={{ color: theme.colors.primary }}
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
            <View style={styles.modalSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Status</Text>
              </View>
              <RadioButton.Group
                onValueChange={(value) => setActiveFilter(value)}
                value={activeFilter || ""}
              >
                <View style={styles.radioItem}>
                  <RadioButton.Android value="" color={theme.colors.primary} />
                  <Text style={styles.radioLabel}>All</Text>
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
                    value="desc"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.radioLabel}>Newest first</Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton.Android
                    value="asc"
                    color={theme.colors.primary}
                  />
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
              style={[
                styles.footerButton,
                styles.applyButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={applyFilters}
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
        showLogo={false}
        showBackButton={false}
        title={t("superAdmin.companies.manage")}
        subtitle={t("superAdmin.companies.subtitle")}
        showHelpButton={true}
        absolute={false}
      />
      <View style={{ flex: 1, backgroundColor: theme.colors.backgroundSecondary }}>

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

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder={t("superAdmin.companies.search")}
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
            {t("superAdmin.companies.typeMoreChars")}
          </Text>
        </View>
      )}

      {renderActiveFilterIndicator()}
      {renderFilterModal()}

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
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  welcomeHeader: {
    paddingHorizontal: 16,
    marginBottom: 8,
    marginTop: 5,
  },
  welcomeTitle: {
    fontSize: 22,
    color: "#333",
    paddingBottom: 3,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: "#666",
  },
  searchContainer: {
    padding: 16,
    paddingTop: 10,
    paddingBottom: 8,
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
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    flex: 1,
  },
  listContent: {
    padding: 16,
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
    borderRadius: 35,
    position: "absolute",
    margin: 16,
    right: Platform.OS === "web" ? 15 : 0,
    bottom: Platform.OS === "web" ? 10 : 80,
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
    marginBottom: 10,
    opacity: 0.7,
    fontSize: 12,
  },
  // Filter styles
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
    fontSize: 20,
    fontFamily: "Poppins-SemiBold",
    color: "#212121",
  },
  modalContent: {
    padding: 16,
    maxHeight: 400,
  },
  modalDivider: {
    height: 1,
    backgroundColor: "#E0E0E0",
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
    fontFamily: "Poppins-SemiBold",
    color: "#212121",
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
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  footerButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 12,
  },
  applyButton: {
    elevation: 2,
  },
  clearButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#616161",
  },
  applyButtonText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#FFFFFF",
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
});

export default CompanyListScreen;
