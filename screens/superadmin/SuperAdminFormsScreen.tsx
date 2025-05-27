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
} from "react-native";
import {
  Card,
  Searchbar,
  useTheme,
  Chip,
  IconButton,
  Portal,
  Modal,
  Divider,
  RadioButton,
  Surface,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  ParamListBase,
  NavigationProp,
  useFocusEffect,
} from "@react-navigation/native";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import EmptyState from "../../components/EmptyState";
import StatusBadge from "../../components/StatusBadge";
import { FormStatus } from "../../types";
import Text from "../../components/Text";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";

// Define form interface with the properties needed for our UI
interface FormItem {
  id: string;
  type: string;
  title: string;
  status: FormStatus;
  created_at: string;
  updated_at: string;
  submitted_by: string;
  company_name: string;
  employee_name: string;
  modified_by?: string;
  modified_at?: string;
  modifier_name?: string;
}

// Component for skeleton loading UI
const FormItemSkeleton = () => {
  return (
    <Card
      style={[
        styles.cardSurface,
        {
          backgroundColor: "#FFFFFF",
          shadowColor: "transparent",
        },
      ]}
      elevation={0}
    >
      <Card.Content>
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
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

        <View style={[styles.cardDetails, { borderLeftColor: "#E0E0E0" }]}>
          <View style={styles.detailItem}>
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
          <View style={styles.detailItem}>
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

        <View style={styles.cardFooter}>
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
              borderRadius: 4,
            }}
          />
        </View>
      </Card.Content>
    </Card>
  );
};

const SuperAdminFormsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [forms, setForms] = useState<FormItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredForms, setFilteredForms] = useState<FormItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<FormStatus | "all">("all");
  const [formTypeFilter, setFormTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [hasMoreData, setHasMoreData] = useState(true);
  const PAGE_SIZE = 10;

  // Filter modal state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [appliedFilters, setAppliedFilters] = useState<{
    status: FormStatus | "all";
    formType: string;
    sortOrder: string;
  }>({
    status: "all",
    formType: "all",
    sortOrder: "desc",
  });

  // Memoize filteredForms to avoid unnecessary re-filtering
  const memoizedFilteredForms = useMemo(() => {
    try {
      let filtered = forms;

      // Apply status filter
      if (appliedFilters.status !== "all") {
        filtered = filtered.filter(
          (form) => form.status === appliedFilters.status
        );
      }

      // Apply form type filter
      if (appliedFilters.formType !== "all") {
        filtered = filtered.filter(
          (form) => form.type === appliedFilters.formType
        );
      }

      // Apply search filter
      if (searchQuery.trim() !== "") {
        filtered = filtered.filter(
          (form) =>
            form.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            form.employee_name
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            form.company_name.toLowerCase().includes(searchQuery.toLowerCase())
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

      const currentPage = refresh ? 0 : page;
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Fetch accident reports
      const { data: accidentData, error: accidentError } = await supabase
        .from("accident_report")
        .select(
          `
          id,
          status,
          created_at,
          modified_by,
          updated_at,
          employee:employee_id(
            id,
            first_name,
            last_name,
            company:company_id(
              id,
              company_name
            )
          )
        `
        )
        .neq("status", FormStatus.DRAFT)
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
          status,
          submission_date,
          modified_by,
          updated_at,
          employee:employee_id(
            id,
            first_name,
            last_name,
            company:company_id(
              id,
              company_name
            )
          )
        `
        )
        .neq("status", FormStatus.DRAFT)
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
          status,
          created_at,
          modified_by,
          updated_at,
          employee:employee_id(
            id,
            first_name,
            last_name,
            company:company_id(
              id,
              company_name
            )
          )
        `
        )
        .neq("status", FormStatus.DRAFT)
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
        throw new Error("Failed to fetch forms");
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

      // Format and combine all forms
      const formattedAccidentForms = (accidentData || []).map((form) => {
        // Ensure we handle the nested structure correctly
        const employee = form.employee as any;
        return {
          id: form.id,
          type: "accident",
          title: "Accident Report",
          status: form.status as FormStatus,
          created_at: form.created_at,
          updated_at: form.updated_at,
          modified_by: form.modified_by,
          modified_at: form.updated_at,
          modifier_name: form.modified_by
            ? modifiersInfo[form.modified_by]
            : undefined,
          submitted_by: "",
          company_name: employee?.company?.company_name || "Unknown Company",
          employee_name: employee
            ? `${employee.first_name} ${employee.last_name}`
            : "Unknown Employee",
        };
      });

      const formattedIllnessForms = (illnessData || []).map((form) => {
        // Ensure we handle the nested structure correctly
        const employee = form.employee as any;
        return {
          id: form.id,
          type: "illness",
          title: "Illness Report",
          status: form.status as FormStatus,
          created_at: form.submission_date,
          updated_at: form.updated_at,
          modified_by: form.modified_by,
          modified_at: form.updated_at,
          modifier_name: form.modified_by
            ? modifiersInfo[form.modified_by]
            : undefined,
          submitted_by: "",
          company_name: employee?.company?.company_name || "Unknown Company",
          employee_name: employee
            ? `${employee.first_name} ${employee.last_name}`
            : "Unknown Employee",
        };
      });

      const formattedDepartureForms = (departureData || []).map((form) => {
        // Ensure we handle the nested structure correctly
        const employee = form.employee as any;
        return {
          id: form.id,
          type: "departure",
          title: "Staff Departure Report",
          status: form.status as FormStatus,
          created_at: form.created_at,
          updated_at: form.updated_at,
          modified_by: form.modified_by,
          modified_at: form.updated_at,
          modifier_name: form.modified_by
            ? modifiersInfo[form.modified_by]
            : undefined,
          submitted_by: "",
          company_name: employee?.company?.company_name || "Unknown Company",
          employee_name: employee
            ? `${employee.first_name} ${employee.last_name}`
            : "Unknown Employee",
        };
      });

      // Combine all forms and sort by created date
      const allForms = [
        ...formattedAccidentForms,
        ...formattedIllnessForms,
        ...formattedDepartureForms,
      ].sort((a, b) => {
        if (appliedFilters.sortOrder === "asc") {
          return (
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
        } else {
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
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
      formType: formTypeFilter,
      sortOrder: sortOrder,
    };

    // Set applied filters
    setAppliedFilters(newFilters);
  };

  // Clear all filters
  const clearFilters = () => {
    setStatusFilter("all");
    setFormTypeFilter("all");
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

  // Get form type name for translation
  const getFormTypeName = (formType: string) => {
    switch (formType) {
      case "accident":
        return t("superAdmin.forms.accidentReport") || "Accident Report";
      case "illness":
        return t("superAdmin.forms.illnessReport") || "Illness Report";
      case "departure":
        return (
          t("superAdmin.forms.departureReport") || "Staff Departure Report"
        );
      default:
        return t("superAdmin.forms.unknownType") || "Unknown Type";
    }
  };

  // Render active filter indicator
  const renderActiveFilterIndicator = () => {
    if (!hasActiveFilters()) return null;

    return (
      <View style={styles.activeFiltersContainer}>
        <Text style={styles.activeFiltersText}>
          {t("superAdmin.forms.activeFilters")}:
        </Text>
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
              {t("superAdmin.forms.status")}: {appliedFilters.status}
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
                setFormTypeFilter("all");
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
              {t("superAdmin.forms.type")}:{" "}
              {getFormTypeName(appliedFilters.formType)}
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
              {t("superAdmin.forms.date")}: {t("superAdmin.forms.oldestFirst")}
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
              <Text style={styles.modalTitle}>
                {t("superAdmin.forms.filterOptions")}
              </Text>
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
                <Text style={styles.sectionTitle}>
                  {t("superAdmin.forms.status")}
                </Text>
              </View>
              <RadioButton.Group
                onValueChange={(value) =>
                  setStatusFilter(value as FormStatus | "all")
                }
                value={statusFilter}
              >
                <View style={styles.radioItem}>
                  <RadioButton.Android value="all" color="#1a73e8" />
                  <Text style={styles.radioLabel}>
                    {t("superAdmin.forms.all")}
                  </Text>
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
                <Text style={styles.sectionTitle}>
                  {t("superAdmin.forms.formType")}
                </Text>
              </View>
              <RadioButton.Group
                onValueChange={(value) => setFormTypeFilter(value)}
                value={formTypeFilter}
              >
                <View style={styles.radioItem}>
                  <RadioButton.Android value="all" color="#1a73e8" />
                  <Text style={styles.radioLabel}>
                    {t("superAdmin.forms.all")}
                  </Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton.Android value="accident" color="#1a73e8" />
                  <Text style={styles.radioLabel}>
                    {t("superAdmin.forms.accidentReport")}
                  </Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton.Android value="illness" color="#1a73e8" />
                  <Text style={styles.radioLabel}>
                    {t("superAdmin.forms.illnessReport")}
                  </Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton.Android value="departure" color="#1a73e8" />
                  <Text style={styles.radioLabel}>
                    {t("superAdmin.forms.departureReport")}
                  </Text>
                </View>
              </RadioButton.Group>
            </View>

            <Divider style={styles.modalDivider} />

            <View style={styles.modalSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {t("superAdmin.forms.sortByDate")}
                </Text>
              </View>
              <RadioButton.Group
                onValueChange={(value) => setSortOrder(value)}
                value={sortOrder}
              >
                <View style={styles.radioItem}>
                  <RadioButton.Android value="desc" color="#1a73e8" />
                  <Text style={styles.radioLabel}>
                    {t("superAdmin.forms.newestFirst")}
                  </Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton.Android value="asc" color="#1a73e8" />
                  <Text style={styles.radioLabel}>
                    {t("superAdmin.forms.oldestFirst")}
                  </Text>
                </View>
              </RadioButton.Group>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.footerButton}
              onPress={clearFilters}
            >
              <Text style={styles.clearButtonText}>
                {t("superAdmin.forms.clearFilters")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerButton, styles.applyButton]}
              onPress={applyFilters}
            >
              <Text style={styles.applyButtonText}>
                {t("superAdmin.forms.apply")}
              </Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </Portal>
    );
  };

  // Create memoized renderFormItem function to prevent unnecessary re-renders
  const renderFormItem = useCallback(
    ({ item }: { item: FormItem }) => (
      <Surface style={[styles.cardSurface, { backgroundColor: "#FFFFFF" }]}>
        <TouchableOpacity
          onPress={() => {
            // Navigate to form details screen based on form type
            console.log("View form details for:", item.id, item.type);
            navigation.navigate("SuperAdminFormDetailsScreen", {
              formId: item.id,
              formType: item.type,
            });
          }}
          style={styles.cardTouchable}
        >
          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              <View style={styles.detailItem}>
                <LinearGradient
                  colors={
                    [
                      getFormTypeColor(item.type),
                      getFormTypeColor(item.type) + "99",
                    ] as readonly [string, string]
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.formTypeChip}
                >
                  <Text style={styles.formTypeText}>
                    {getFormTypeName(item.type)}
                  </Text>
                </LinearGradient>
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
              <Text variant="medium" style={styles.detailLabel}>
                {t("superAdmin.forms.submittedBy")} :
              </Text>
              <Text style={styles.detailValue}>{item.employee_name}</Text>
            </View>

            <View style={styles.detailItem}>
              <Text variant="medium" style={styles.detailLabel}>
                {t("superAdmin.forms.created")} :
              </Text>
              <Text style={styles.detailValue}>
                {format(new Date(item.created_at), "MMM d, yyyy")}
              </Text>
            </View>

            {item.modified_by && item.modified_at && (
              <View style={styles.modificationInfo}>
                <View style={styles.detailItem}>
                  <Text variant="medium" style={[styles.detailLabel]}>
                    {t("superAdmin.forms.lastModified")} :
                  </Text>
                  <Text style={[styles.detailValue]}>
                    {format(new Date(item.modified_at), "MMM d, yyyy, HH:mm")}
                  </Text>
                </View>
                {item.modifier_name && (
                  <View style={styles.detailItem}>
                    <Text variant="medium" style={[styles.detailLabel]}>
                      {t("superAdmin.forms.modifiedBy")} :
                    </Text>
                    <Text style={[styles.detailValue]}>
                      {item.modifier_name}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.detailItem}>
            <Text variant="medium" style={styles.detailLabel}>
              {t("superAdmin.forms.company")}:
            </Text>
            <Text variant="medium" style={styles.companyName}>
              {item.company_name}
              </Text>
            </View>

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
    [t, navigation, getFormTypeColor, getFormTypeName]
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: "#F5F5F5" }]}>
        <AppHeader
          title={t("superAdmin.forms.title")}
          subtitle="Review and manage all submitted forms"
          showBackButton={Platform.OS !== "web"}
          showHelpButton={false}
          showProfileMenu={false}
          showLogo={false}
          showTitle={true}
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
        title={t("superAdmin.forms.title")}
        subtitle="Review and manage all submitted forms"
        showBackButton={Platform.OS !== "web"}
        showHelpButton={false}
        showProfileMenu={false}
        showLogo={false}
        showTitle={true}
      />

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder={t("superAdmin.forms.search") || "Search forms..."}
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
          title={t("superAdmin.forms.noFormsFound")}
          message={
            searchQuery || hasActiveFilters()
              ? t("superAdmin.forms.noFormsMatch")
              : t("superAdmin.forms.noFormsSubmitted")
          }
          buttonTitle={
            searchQuery || hasActiveFilters()
              ? t("superAdmin.forms.clearFilters")
              : undefined
          }
          onButtonPress={() => {
            if (searchQuery || hasActiveFilters()) {
              setSearchQuery("");
              clearFilters();
            }
          }}
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
                <Text style={styles.endListText}>
                  {t("superAdmin.forms.noMoreForms")}
                </Text>
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
  headerSection: {
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  pageTitle: {
    fontSize: 22,
    color: "#212121",
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: "#757575",
    marginBottom: 8,
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
  selectedChip: {
    borderWidth: 0,
    backgroundColor: "rgba(54,105,157,255)",
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
  formTitle: {
    fontSize: 16,
    color: "#333",
    marginBottom: 4,
  },
  companyName: {
    fontSize: 14,
    color: "#000",
    marginLeft: 4,
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
  formTypeChip: {
    height: 32,
    borderRadius: 16,
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  formTypeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontFamily: "Poppins-Medium",
  },
  viewDetailsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewDetailsText: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
  },
  chevronIcon: {
    margin: 0,
    padding: 0,
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
    backgroundColor: "#1a73e8",
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
  loadingFooter: {
    padding: 16,
    alignItems: "center",
  },
  endListText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#616161",
  },
  modificationInfo: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
} as const);

export default SuperAdminFormsScreen;
