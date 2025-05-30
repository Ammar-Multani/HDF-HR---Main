import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import {
  Text,
  Card,
  Searchbar,
  useTheme,
  Chip,
  Divider,
  IconButton,
  Surface,
  Portal,
  Modal,
  RadioButton,
  Button,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import EmptyState from "../../components/EmptyState";
import StatusBadge from "../../components/StatusBadge";
import { FormStatus } from "../../types";
import { Icon } from "react-native-elements";

// Enhanced FormSubmission interface with additional fields
interface FormSubmission {
  id: string;
  type: "accident" | "illness" | "departure";
  title: string;
  employee_name: string;
  employee_id: string;
  status: FormStatus;
  submission_date: string;
  updated_at?: string;
  modified_by?: string;
  modified_at?: string;
  modifier_name?: string;
}

// Component for skeleton loading UI
const FormItemSkeleton = () => {
  return (
    <Surface style={[styles.cardSurface, { backgroundColor: "#fff" }]}>
      <View style={styles.cardTouchable}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <View
              style={{
                width: "40%",
                height: 20,
                backgroundColor: "#E0E0E0",
                borderRadius: 4,
                marginBottom: 8,
              }}
            />
            <View
              style={{
                width: "70%",
                height: 24,
                backgroundColor: "#E0E0E0",
                borderRadius: 4,
              }}
            />
          </View>
          <View
            style={{
              width: 80,
              height: 24,
              backgroundColor: "#E0E0E0",
              borderRadius: 12,
            }}
          />
        </View>
        <View style={styles.cardDetails}>
          <View
            style={{
              width: "60%",
              height: 16,
              backgroundColor: "#E0E0E0",
              borderRadius: 4,
              marginBottom: 8,
            }}
          />
          <View
            style={{
              width: "80%",
              height: 16,
              backgroundColor: "#E0E0E0",
              borderRadius: 4,
            }}
          />
        </View>
        <View style={styles.cardFooter}>
          <View
            style={{
              width: 100,
              height: 16,
              backgroundColor: "#E0E0E0",
              borderRadius: 4,
            }}
          />
        </View>
      </View>
    </Surface>
  );
};



const FormSubmissionsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [forms, setForms] = useState<FormSubmission[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredForms, setFilteredForms] = useState<FormSubmission[]>([]);
  const [page, setPage] = useState(0);
  const [hasMoreData, setHasMoreData] = useState(true);
  const PAGE_SIZE = 10;

  // Filter modal state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [typeFilter, setTypeFilter] = useState<
    "all" | "accident" | "illness" | "departure"
  >("all");
  const [statusFilter, setStatusFilter] = useState<FormStatus | "all">("all");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [appliedFilters, setAppliedFilters] = useState<{
    status: FormStatus | "all";
    formType: "all" | "accident" | "illness" | "departure";
    sortOrder: string;
  }>({
    status: "all",
    formType: "all",
    sortOrder: "desc",
  });

  const fetchCompanyId = async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from("company_user")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching company ID:", error);
        return null;
      }

      return data?.company_id || null;
    } catch (error) {
      console.error("Error fetching company ID:", error);
      return null;
    }
  };

  // Memoize filteredForms to avoid unnecessary re-filtering
  const memoizedFilteredForms = useMemo(() => {
    try {
      let filtered = forms;

      // Apply type filter
      if (appliedFilters.formType !== "all") {
        filtered = filtered.filter(
          (form) => form.type === appliedFilters.formType
        );
      }

      // Apply status filter
      if (appliedFilters.status !== "all") {
        filtered = filtered.filter(
          (form) => form.status === appliedFilters.status
        );
      }

      // Apply search filter
      if (searchQuery.trim() !== "") {
        filtered = filtered.filter(
          (form) =>
            form.employee_name
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            form.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }

      return filtered;
    } catch (error) {
      console.error("Error filtering forms:", error);
      return forms; // Return unfiltered forms on error
    }
  }, [forms, appliedFilters.status, appliedFilters.formType, searchQuery]);

  // Update filteredForms when memoizedFilteredForms changes
  useEffect(() => {
    setFilteredForms(memoizedFilteredForms);
  }, [memoizedFilteredForms]);

  const fetchForms = async (refresh = false) => {
    try {
      if (refresh) {
        setPage(0);
        setHasMoreData(true);
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      // Get company ID if not already set
      const currentCompanyId = companyId || (await fetchCompanyId());
      if (!currentCompanyId) {
        console.error("No company ID found");
        setLoading(false);
        setLoadingMore(false);
        return;
      }

      setCompanyId(currentCompanyId);

      const currentPage = refresh ? 0 : page;
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Fetch accident reports
      const { data: accidentData, error: accidentError } = await supabase
        .from("accident_report")
        .select(
          `
          id,
          employee_id,
          status,
          created_at,
          updated_at,
          modified_by,
          accident_description,
          company_user (
            first_name,
            last_name
          )
        `
        )
        .eq("company_id", currentCompanyId)
        .order("created_at", {
          ascending: appliedFilters.sortOrder === "asc",
        })
        .range(from, to);

      // Fetch illness reports
      const { data: illnessData, error: illnessError } = await supabase
        .from("illness_report")
        .select(
          `
          id,
          employee_id,
          status,
          submission_date,
          updated_at,
          modified_by,
          leave_description,
          company_user (
            first_name,
            last_name
          )
        `
        )
        .eq("company_id", currentCompanyId)
        .order("submission_date", {
          ascending: appliedFilters.sortOrder === "asc",
        })
        .range(from, to);

      // Fetch staff departure reports
      const { data: departureData, error: departureError } = await supabase
        .from("staff_departure_report")
        .select(
          `
          id,
          employee_id,
          status,
          created_at,
          updated_at,
          modified_by,
          comments,
          company_user (
            first_name,
            last_name
          )
        `
        )
        .eq("company_id", currentCompanyId)
        .order("created_at", {
          ascending: appliedFilters.sortOrder === "asc",
        })
        .range(from, to);

      if (accidentError || illnessError || departureError) {
        console.error("Error fetching forms:", {
          accidentError,
          illnessError,
          departureError,
        });
        return;
      }

      // Get all unique modifier IDs
      const allModifierIds = [
        ...(accidentData || []).map((form) => form.modified_by),
        ...(illnessData || []).map((form) => form.modified_by),
        ...(departureData || []).map((form) => form.modified_by),
      ].filter(Boolean);

      // Fetch modifiers info
      let modifiersInfo: Record<string, string> = {};
      if (allModifierIds.length > 0) {
        const uniqueModifierIds = Array.from(new Set(allModifierIds));

        // Fetch admin modifiers
        const { data: adminModifiers } = await supabase
          .from("admin")
          .select("id, name")
          .in("id", uniqueModifierIds);

        // Fetch company_user modifiers
        const { data: companyUserModifiers } = await supabase
          .from("company_user")
          .select("id, first_name, last_name")
          .in("id", uniqueModifierIds);

        // Create a lookup map for modifier names
        modifiersInfo = {
          ...(adminModifiers || []).reduce(
            (acc: Record<string, string>, admin: any) => {
              acc[admin.id] = admin.name;
              return acc;
            },
            {}
          ),
          ...(companyUserModifiers || []).reduce(
            (acc: Record<string, string>, user: any) => {
              acc[user.id] = `${user.first_name} ${user.last_name}`;
              return acc;
            },
            {}
          ),
        };
      }

      // Format accident reports
      const formattedAccidents = (accidentData || []).map((report) => {
        const employeeName = report.company_user
          ? `${report.company_user.first_name} ${report.company_user.last_name}`
          : "Unknown Employee";

        return {
          id: report.id,
          type: "accident" as const,
          title: "Accident Report",
          employee_name: employeeName,
          employee_id: report.employee_id,
          status: report.status,
          submission_date: report.created_at,
          updated_at: report.updated_at,
          modified_by: report.modified_by,
          modified_at: report.updated_at,
          modifier_name: report.modified_by
            ? modifiersInfo[report.modified_by]
            : undefined,
        };
      });

      // Format illness reports
      const formattedIllness = (illnessData || []).map((report) => {
        const employeeName = report.company_user
          ? `${report.company_user.first_name} ${report.company_user.last_name}`
          : "Unknown Employee";

        return {
          id: report.id,
          type: "illness" as const,
          title: "Illness Report",
          employee_name: employeeName,
          employee_id: report.employee_id,
          status: report.status,
          submission_date: report.submission_date,
          updated_at: report.updated_at,
          modified_by: report.modified_by,
          modified_at: report.updated_at,
          modifier_name: report.modified_by
            ? modifiersInfo[report.modified_by]
            : undefined,
        };
      });

      // Format departure reports
      const formattedDeparture = (departureData || []).map((report) => {
        const employeeName = report.company_user
          ? `${report.company_user.first_name} ${report.company_user.last_name}`
          : "Unknown Employee";

        return {
          id: report.id,
          type: "departure" as const,
          title: "Staff Departure Report",
          employee_name: employeeName,
          employee_id: report.employee_id,
          status: report.status,
          submission_date: report.created_at,
          updated_at: report.updated_at,
          modified_by: report.modified_by,
          modified_at: report.updated_at,
          modifier_name: report.modified_by
            ? modifiersInfo[report.modified_by]
            : undefined,
        };
      });

      // Combine all reports and sort by created date
      const allForms = [
        ...formattedAccidents,
        ...formattedIllness,
        ...formattedDeparture,
      ].sort((a, b) => {
        if (appliedFilters.sortOrder === "asc") {
          return (
            new Date(a.submission_date).getTime() -
            new Date(b.submission_date).getTime()
          );
        } else {
          return (
            new Date(b.submission_date).getTime() -
            new Date(a.submission_date).getTime()
          );
        }
      });

      // Update forms state
      if (refresh) {
        setForms(allForms);
      } else {
        setForms((prevForms) => [...prevForms, ...allForms]);
      }

      // Check if we have more data
      setHasMoreData(allForms.length >= PAGE_SIZE);
    } catch (error) {
      console.error("Error fetching forms:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchForms(true);
  }, [appliedFilters]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchForms(true);
  };

  const loadMoreForms = () => {
    if (!loading && !loadingMore && hasMoreData) {
      setPage((prevPage) => prevPage + 1);
      fetchForms(false);
    }
  };

  // Apply filters and refresh forms list
  const applyFilters = () => {
    // Close modal first
    setFilterModalVisible(false);

    // Apply new filters
    const newFilters = {
      status: statusFilter,
      formType: typeFilter,
      sortOrder: sortOrder,
    };

    // Set applied filters
    setAppliedFilters(newFilters);
  };

  // Clear all filters
  const clearFilters = () => {
    setTypeFilter("all");
    setStatusFilter("all");
    setSortOrder("desc");

    // Clear applied filters
    setAppliedFilters({
      status: "all",
      formType: "all",
      sortOrder: "desc",
    });
  };

  // Check if we have any active filters
  const hasActiveFilters = () => {
    return (
      appliedFilters.status !== "all" ||
      appliedFilters.formType !== "all" ||
      appliedFilters.sortOrder !== "desc"
    );
  };

  const getFormTypeIcon = (type: "accident" | "illness" | "departure") => {
    switch (type) {
      case "accident":
        return "alert-circle";
      case "illness":
        return "medical-bag";
      case "departure":
        return "account-arrow-right";
      default:
        return "file-document";
    }
  };

  // Get appropriate color for form type
  const getFormTypeColor = (formType: string) => {
    switch (formType) {
      case "accident":
        return "#F44336"; // Red for accident reports
      case "illness":
        return "#FF9800"; // Orange for illness reports
      case "departure":
        return "#2196F3"; // Blue for departure reports
      default:
        return "#9C27B0"; // Purple for unknown types
    }
  };

  // Create memoized renderFormItem function to prevent unnecessary re-renders
  const renderFormItem = useCallback(
    ({ item }: { item: FormSubmission }) => (
      <Surface style={[styles.cardSurface, { backgroundColor: "#FFFFFF" }]}>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate(
              "FormDetails" as never,
              {
                formId: item.id,
                formType: item.type,
              } as never
            )
          }
          style={styles.cardTouchable}
        >
          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              <View style={styles.formTypeContainer}>
                <Chip
                  icon={getFormTypeIcon(item.type)}
                  style={[
                    styles.formTypeChip,
                    { backgroundColor: `${getFormTypeColor(item.type)}20` },
                  ]}
                  textStyle={{ color: getFormTypeColor(item.type) }}
                >
                  {item.title}
                </Chip>
              </View>
            </View>
            <StatusBadge status={item.status} />
          </View>

          <View
            style={[
              styles.cardDetails,
              { borderLeftColor: getFormTypeColor(item.type) },
            ]}
          >
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Employee:</Text>
              <Text style={styles.detailValue}>{item.employee_name}</Text>
            </View>

            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Submitted:</Text>
              <Text style={styles.detailValue}>
                {format(new Date(item.submission_date), "MMM d, yyyy")}
              </Text>
            </View>

            {item.modified_by && item.modified_at && (
              <View style={styles.modificationInfo}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Last Modified:</Text>
                  <Text style={styles.detailValue}>
                    {format(new Date(item.modified_at), "MMM d, yyyy, HH:mm")}
                  </Text>
                </View>
                {item.modifier_name && (
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Modified By:</Text>
                    <Text style={styles.detailValue}>{item.modifier_name}</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.viewDetailsContainer}>
              <Text
                style={[
                  styles.viewDetailsText,
                  { color: getFormTypeColor(item.type) },
                ]}
              >
                VIEW DETAILS
              </Text>
              <IconButton
                icon="chevron-right"
                size={18}
                iconColor={getFormTypeColor(item.type)}
                style={styles.chevronIcon}
              />
            </View>
          </View>
        </TouchableOpacity>
      </Surface>
    ),
    [navigation]
  );

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
                fetchForms(true);
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
          {appliedFilters.formType !== "all" && (
            <Chip
              mode="outlined"
              onClose={() => {
                setAppliedFilters({
                  ...appliedFilters,
                  formType: "all",
                });
                setTypeFilter("all");
                fetchForms(true);
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
              Type:{" "}
              {appliedFilters.formType.charAt(0).toUpperCase() +
                appliedFilters.formType.slice(1)}
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
                fetchForms(true);
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
            <View style={styles.modalSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Form Type</Text>
              </View>
              <RadioButton.Group
                onValueChange={(value) =>
                  setTypeFilter(
                    value as "all" | "accident" | "illness" | "departure"
                  )
                }
                value={typeFilter}
              >
                <View style={styles.radioItem}>
                  <RadioButton.Android value="all" color="#1a73e8" />
                  <Text style={styles.radioLabel}>All Types</Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton.Android value="accident" color="#1a73e8" />
                  <Text style={styles.radioLabel}>Accident Report</Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton.Android value="illness" color="#1a73e8" />
                  <Text style={styles.radioLabel}>Illness Report</Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton.Android value="departure" color="#1a73e8" />
                  <Text style={styles.radioLabel}>Staff Departure Report</Text>
                </View>
              </RadioButton.Group>
            </View>

            <Divider style={styles.modalDivider} />

            <View style={styles.modalSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Status</Text>
              </View>
              <RadioButton.Group
                onValueChange={(value) =>
                  setStatusFilter(value as FormStatus | "all")
                }
                value={statusFilter}
              >
                <View style={styles.radioItem}>
                  <RadioButton.Android value="all" color="#1a73e8" />
                  <Text style={styles.radioLabel}>All Statuses</Text>
                </View>
                {Object.values(FormStatus).map((status) => (
                  <View key={status} style={styles.radioItem}>
                    <RadioButton.Android value={status} color="#1a73e8" />
                    <Text style={styles.radioLabel}>{status}</Text>
                  </View>
                ))}
              </RadioButton.Group>
            </View>

            <Divider style={styles.modalDivider} />

            <View style={styles.modalSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Sort by date</Text>
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

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: "#F5F5F5" }]}>
        <AppHeader
          title="Form Submissions"
          showBackButton={Platform.OS !== "web"}
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
          renderItem={() => <FormItemSkeleton />}
          keyExtractor={(_, index) => `skeleton-${index}`}
          contentContainerStyle={styles.listContent}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#F8F9FA" }]}>
      <AppHeader
        title="Form Submissions"
        showBackButton={Platform.OS !== "web"}
        showHelpButton={true}
        onHelpPress={() => {
          navigation.navigate("Help" as never);
        }}
        showLogo={false}
      />

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search forms..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          theme={{ colors: { primary: "#1a73e8" } }}
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
            iconColor={hasActiveFilters() ? "#1a73e8" : undefined}
            onPress={() => setFilterModalVisible(true)}
          />
          {hasActiveFilters() && <View style={styles.filterBadge} />}
        </View>
      </View>

      {renderActiveFilterIndicator()}
      {renderFilterModal()}

      {filteredForms.length === 0 ? (
        <EmptyState
          icon="file-document"
          title="No Forms Found"
          message={
            searchQuery || hasActiveFilters()
              ? "No forms match your search criteria."
              : "No form submissions yet."
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
      ) : (
        <FlatList
          data={filteredForms}
          renderItem={renderFormItem}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMoreForms}
          onEndReachedThreshold={0.3}
          ListFooterComponent={() => (
            <View style={styles.loadingFooter}>
              {loadingMore && hasMoreData && (
                <ActivityIndicator size="small" color="#1a73e8" />
              )}
              {!hasMoreData && filteredForms.length > 0 && (
                <Text style={styles.endListText}>No more forms to load</Text>
              )}
            </View>
          )}
        />
      )}
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
    paddingTop: 10,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  searchbar: {
    elevation: 2,
    borderRadius: 12,
    height: 58,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    flex: 1,
    shadowColor: "#000",
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
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterChip: {
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    backgroundColor: "#fff",
  },
  activeFiltersContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 0,
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
    paddingTop: 0,
    paddingBottom: 100,
  },
  cardSurface: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    overflow: "hidden",
  },
  cardTouchable: {
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
  formTypeContainer: {
    marginBottom: 8,
  },
  formTypeChip: {
    alignSelf: "flex-start",
  },
  employeeName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  cardDetails: {
    marginBottom: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#1a73e8",
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  detailLabel: {
    color: "#555",
    fontSize: 13,
    fontWeight: "600",
    marginRight: 4,
  },
  detailValue: {
    flex: 1,
    color: "#666",
    fontSize: 13,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 4,
  },
  viewDetailsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: "600",
  },
  chevronIcon: {
    margin: 0,
    padding: 0,
  },
  divider: {
    marginVertical: 12,
  },
  submissionDate: {
    opacity: 0.7,
    fontSize: 14,
  },
  modificationInfo: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  loadingFooter: {
    padding: 16,
    alignItems: "center",
  },
  endListText: {
    fontSize: 14,
    color: "#616161",
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
    fontWeight: "600",
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
    fontWeight: "600",
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
});

export default FormSubmissionsScreen;
