import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Platform,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Text,
  useTheme,
  Surface,
  Button,
  Menu,
  Searchbar,
  Chip,
  Portal,
  Modal,
  IconButton,
  Divider,
  SegmentedButtons,
  TouchableRipple,
  List,
} from "react-native-paper";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";
import AppHeader from "../../components/AppHeader";
import ActivityLogTimeline from "../../components/ActivityLogTimeline";
import LoadingIndicator from "../../components/LoadingIndicator";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { debounce } from "lodash";
import DateTimePickerModal from "react-native-modal-datetime-picker";

interface ActivityLog {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
  metadata?: any;
  user_id: string;
  company_id?: string;
}

const { width } = Dimensions.get("window");
const isWeb = Platform.OS === "web";
const isLargeScreen = width >= 1024;

const ActivityLogsScreen = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilterVisible, setDateFilterVisible] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [dateRange, setDateRange] = useState("all");
  const [customStartDate, setCustomStartDate] = useState<Date>(new Date());
  const [customEndDate, setCustomEndDate] = useState<Date>(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  const filterOptions = [
    { label: t("superAdmin.activityLogs.filters.all"), value: "all" },
    {
      label: t("superAdmin.activityLogs.filters.taskCreation"),
      value: "create_task",
    },
    {
      label: t("superAdmin.activityLogs.filters.taskUpdates"),
      value: "update_task",
    },
    {
      label: t("superAdmin.activityLogs.filters.statusChanges"),
      value: "update_status",
    },
    {
      label: t("superAdmin.activityLogs.filters.comments"),
      value: "add_comment",
    },
    {
      label: t("superAdmin.activityLogs.filters.userAssignment"),
      value: "assign_user",
    },
  ];

  const dateRangeOptions = [
    { label: t("common.all"), value: "all" },
    { label: t("common.today"), value: "today" },
    { label: t("common.last7Days"), value: "7days" },
    { label: t("common.last30Days"), value: "30days" },
    { label: t("common.custom"), value: "custom" },
  ];

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((query: string) => {
      fetchActivityLogs(selectedFilter, query, startDate, endDate);
    }, 300),
    [selectedFilter, startDate, endDate]
  );

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    debouncedSearch(query);
  };

  const handleDateRangeChange = (value: string) => {
    setDateRange(value);
    let start: Date | null = null;
    let end: Date | null = null;

    switch (value) {
      case "today":
        start = startOfDay(new Date());
        end = endOfDay(new Date());
        break;
      case "7days":
        start = startOfDay(subDays(new Date(), 7));
        end = endOfDay(new Date());
        break;
      case "30days":
        start = startOfDay(subDays(new Date(), 30));
        end = endOfDay(new Date());
        break;
      case "custom":
        setDateFilterVisible(true);
        return;
      default:
        break;
    }

    setStartDate(start);
    setEndDate(end);
    fetchActivityLogs(selectedFilter, searchQuery, start, end);
  };

  const handleCustomDateConfirm = () => {
    setStartDate(startOfDay(customStartDate));
    setEndDate(endOfDay(customEndDate));
    setDateFilterVisible(false);
    fetchActivityLogs(
      selectedFilter,
      searchQuery,
      startOfDay(customStartDate),
      endOfDay(customEndDate)
    );
  };

  const handleStartDateChange = (event: any) => {
    if (Platform.OS === "web") {
      const selectedDate = new Date(event.target.value);
      setCustomStartDate(selectedDate);
    } else {
      if (event.type === "set" && event.nativeEvent.timestamp) {
        setCustomStartDate(new Date(event.nativeEvent.timestamp));
      }
      setShowStartDatePicker(false);
    }
  };

  const handleEndDateChange = (event: any) => {
    if (Platform.OS === "web") {
      const selectedDate = new Date(event.target.value);
      setCustomEndDate(selectedDate);
    } else {
      if (event.type === "set" && event.nativeEvent.timestamp) {
        setCustomEndDate(new Date(event.nativeEvent.timestamp));
      }
      setShowEndDatePicker(false);
    }
  };

  // Fetch activity logs with filters
  const fetchActivityLogs = async (
    filter: string = "all",
    search: string = "",
    start: Date | null = null,
    end: Date | null = null
  ) => {
    try {
      setLoading(true);
      let query = supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false });

      // Apply type filter
      if (filter !== "all") {
        query = query.eq("activity_type", filter.toUpperCase());
      }

      // Apply search filter
      if (search) {
        query = query.or(
          `description.ilike.%${search}%,metadata->>'task_title'.ilike.%${search}%`
        );
      }

      // Apply date filters
      if (start) {
        query = query.gte("created_at", start.toISOString());
      }
      if (end) {
        query = query.lte("created_at", end.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityLogs(selectedFilter, searchQuery, startDate, endDate);
  }, [selectedFilter]);

  const clearFilters = () => {
    setSelectedFilter("all");
    setSearchQuery("");
    setStartDate(null);
    setEndDate(null);
    setDateRange("all");
    fetchActivityLogs("all", "", null, null);
  };

  const renderActiveFilters = () => {
    const activeFilters = [];

    if (selectedFilter !== "all") {
      activeFilters.push(
        <Chip
          key="type"
          onClose={() => setSelectedFilter("all")}
          style={styles.filterChip}
          textStyle={styles.chipText}
        >
          {filterOptions.find((opt) => opt.value === selectedFilter)?.label}
        </Chip>
      );
    }

    if (dateRange !== "all") {
      activeFilters.push(
        <Chip
          key="date"
          onClose={() => handleDateRangeChange("all")}
          style={styles.filterChip}
          textStyle={styles.chipText}
        >
          {dateRangeOptions.find((opt) => opt.value === dateRange)?.label}
        </Chip>
      );
    }

    if (activeFilters.length === 0) return null;

    return (
      <View style={styles.activeFiltersContainer}>
        <View style={styles.activeFiltersRow}>
          <MaterialCommunityIcons
            name="filter-variant"
            size={18}
            color={theme.colors.primary}
            style={styles.filterIcon}
          />
          {activeFilters}
        </View>
        <Button
          onPress={clearFilters}
          mode="text"
          textColor={theme.colors.error}
        >
          {t("common.clearAll")}
        </Button>
      </View>
    );
  };

  if (loading && !logs.length) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#F8F9FA" }]}>
      <AppHeader
        title={t("superAdmin.activityLogs.title")}
        subtitle={t("superAdmin.activityLogs.subtitle")}
        showLogo={false}
        showTitle={true}
        showHelpButton={true}
        absolute={false}
        showBackButton={true}
      />

      <View style={[styles.content, { maxWidth: isWeb ? 1200 : "100%" }]}>
        <Surface style={styles.filtersCard}>
          <View style={styles.searchContainer}>
            <Searchbar
              placeholder={t("common.searchActivities")}
              onChangeText={handleSearch}
              value={searchQuery}
              style={styles.searchBar}
              loading={loading}
            />
            <Menu
              visible={filterMenuVisible}
              onDismiss={() => setFilterMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => setFilterMenuVisible(true)}
                  icon="filter-variant"
                  style={styles.filterButton}
                >
                  {
                    filterOptions.find(
                      (option) => option.value === selectedFilter
                    )?.label
                  }
                </Button>
              }
              contentStyle={styles.menuContent}
            >
              {filterOptions.map((option) => (
                <Menu.Item
                  key={option.value}
                  onPress={() => {
                    setSelectedFilter(option.value);
                    setFilterMenuVisible(false);
                  }}
                  title={option.label}
                  leadingIcon={
                    option.value === selectedFilter ? "check" : undefined
                  }
                  style={styles.menuItem}
                />
              ))}
            </Menu>
          </View>

          <SegmentedButtons
            value={dateRange}
            onValueChange={handleDateRangeChange}
            buttons={dateRangeOptions.map((option) => ({
              value: option.value,
              label: option.label,
              style: styles.segmentedButton,
            }))}
            style={styles.segmentedButtons}
            theme={{
              colors: {
                secondaryContainer: theme.colors.primaryContainer,
                onSecondaryContainer: theme.colors.primary,
              },
            }}
          />
        </Surface>

        {renderActiveFilters()}

        {logs.length > 0 ? (
          <Surface style={styles.timelineCard}>
            <ActivityLogTimeline
              logs={logs}
              showViewAll={false}
              showHeader={false}
              containerStyle={styles.timeline}
            />
          </Surface>
        ) : (
          <Surface style={styles.emptyState}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={48}
              color={theme.colors.outlineVariant}
            />
            <Text style={styles.emptyStateText}>
              {t("superAdmin.activityLogs.noLogs")}
            </Text>
            {(searchQuery ||
              selectedFilter !== "all" ||
              dateRange !== "all") && (
              <Button
                mode="outlined"
                onPress={clearFilters}
                style={[
                  styles.clearFiltersButton,
                  { borderColor: theme.colors.primary },
                ]}
              >
                {t("common.clearFilters")}
              </Button>
            )}
          </Surface>
        )}

        <Portal>
          <Modal
            visible={dateFilterVisible}
            onDismiss={() => setDateFilterVisible(false)}
            contentContainerStyle={styles.modalContainer}
          >
            <Surface style={styles.modalSurface}>
              <View style={styles.modalHeader}>
                <Text variant="titleLarge" style={styles.modalTitle}>
                  {t("superAdmin.activityLogs.customDateRange")}
                </Text>
                <IconButton
                  icon="close"
                  onPress={() => setDateFilterVisible(false)}
                />
              </View>
              <Divider />

              <View style={styles.modalContent}>
                <View style={styles.datePickerContainer}>
                  <View style={styles.datePickerSection}>
                    <Text style={styles.datePickerLabel}>
                      {t("superAdmin.activityLogs.startDate")}
                    </Text>
                    {Platform.OS === "web" ? (
                      <View style={styles.webDateInputContainer}>
                        <input
                          type="date"
                          value={format(customStartDate, "yyyy-MM-dd")}
                          onChange={handleStartDateChange}
                          style={styles.webDateInput}
                          max={format(customEndDate, "yyyy-MM-dd")}
                        />
                      </View>
                    ) : (
                      <>
                        <TouchableOpacity
                          onPress={() => setShowStartDatePicker(true)}
                          style={styles.dateButton}
                        >
                          <Text>{format(customStartDate, "MMMM d, yyyy")}</Text>
                          <IconButton icon="calendar" size={20} />
                        </TouchableOpacity>
                        <DateTimePickerModal
                          isVisible={showStartDatePicker}
                          mode="date"
                          onConfirm={(date) => {
                            setCustomStartDate(date);
                            setShowStartDatePicker(false);
                          }}
                          onCancel={() => setShowStartDatePicker(false)}
                          maximumDate={customEndDate}
                        />
                      </>
                    )}
                  </View>

                  <View style={styles.datePickerSection}>
                    <Text style={styles.datePickerLabel}>
                      {t("superAdmin.activityLogs.endDate")}
                    </Text>
                    {Platform.OS === "web" ? (
                      <View style={styles.webDateInputContainer}>
                        <input
                          type="date"
                          value={format(customEndDate, "yyyy-MM-dd")}
                          onChange={handleEndDateChange}
                          style={styles.webDateInput}
                          min={format(customStartDate, "yyyy-MM-dd")}
                        />
                      </View>
                    ) : (
                      <>
                        <TouchableOpacity
                          onPress={() => setShowEndDatePicker(true)}
                          style={styles.dateButton}
                        >
                          <Text>{format(customEndDate, "MMMM d, yyyy")}</Text>
                          <IconButton icon="calendar" size={20} />
                        </TouchableOpacity>
                        <DateTimePickerModal
                          isVisible={showEndDatePicker}
                          mode="date"
                          onConfirm={(date) => {
                            setCustomEndDate(date);
                            setShowEndDatePicker(false);
                          }}
                          onCancel={() => setShowEndDatePicker(false)}
                          minimumDate={customStartDate}
                        />
                      </>
                    )}
                  </View>
                </View>
              </View>

              <Divider />
              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={() => setDateFilterVisible(false)}
                  style={styles.modalButton}
                >
                  {t("common.cancel")}
                </Button>
                <Button
                  mode="contained"
                  onPress={handleCustomDateConfirm}
                  style={styles.modalButton}
                >
                  {t("common.apply")}
                </Button>
              </View>
            </Surface>
          </Modal>
        </Portal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    alignSelf: "center",
    width: "100%",
  },
  filtersCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#fff",
    marginBottom: 16,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  searchBar: {
    flex: 1,
    elevation: 0,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterButton: {
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    marginTop: 8,
    alignSelf: "flex-start",
  },
  segmentedButtons: {
  },
  segmentedButton: {
    borderColor: "#E2E8F0",
  },
  activeFiltersContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  activeFiltersRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  filterIcon: {
    marginRight: 8,
  },
  filterChip: {
    backgroundColor: "#F1F5F9",
  },
  chipText: {
    fontSize: 12,
  },
  timelineCard: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#fff",
    overflow: "hidden",
    elevation: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  timeline: {
    borderRadius: 0,
    borderWidth: 0,
    flex: 1,
  },
  emptyState: {
    padding: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyStateText: {
    fontSize: 16,
    color: "#64748B",
    fontFamily: "Poppins-Regular",
    textAlign: "center",
    marginTop: 12,
    marginBottom: 24,
  },
  clearFiltersButton: {
    // Style without theme-dependent properties
  },
  menuContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    marginTop: 8,
    elevation: 3,
  },
  menuItem: {
    paddingVertical: 12,
  },
  modalContainer: {
    margin: 20,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "transparent",
    shadowColor: "rgba(0,0,0,0)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  modalSurface: {
    backgroundColor: Platform.select({
      web: "#FFFFFF",
      default: "#FFFFFF",
    }),
    borderRadius: 16,
    overflow: "hidden",
    elevation: 0,
    shadowColor: "rgba(0,0,0,0)",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: "Poppins-SemiBold",
    color: "#424242",
  },
  modalContent: {
    padding: 24,
  },
  datePickerContainer: {
    gap: 24,
  },
  datePickerSection: {
    gap: 8,
  },
  datePickerLabel: {
    fontSize: 14,
    color: "#64748B",
    fontFamily: "Poppins-Medium",
  },
  webDateInputContainer: {
    width: "100%",
  },
  webDateInput:
    Platform.OS === "web"
      ? ({
          width: "100%",
          padding: 10,
          fontSize: 16,
          borderRadius: 4,
          border: "1px solid #e2e8f0",
          outline: "none",
          fontFamily: "Poppins-Regular",
        } as any)
      : {},
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: Platform.select({
      web: "#F8FAFC",
      default: "#F8FAFC",
    }),
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
    gap: 12,
  },
  modalButton: {
    minWidth: 100,
  },
});

export default ActivityLogsScreen;
