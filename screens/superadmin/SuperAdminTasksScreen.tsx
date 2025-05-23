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
  FAB,
  Chip,
  IconButton,
  Portal,
  Modal,
  Divider,
  RadioButton,
  Menu,
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
import { Task, TaskPriority, TaskStatus } from "../../types";
import Text from "../../components/Text";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";

// Define extended Task type with the properties needed for our UI
interface ExtendedTask extends Task {
  company?: {
    id: string;
    company_name: string;
  };
  assignedUserDetails?: Array<UserDetail>;
  modified_by?: string;
  modified_at?: string;
  modifier_name?: string;
}

// Define user details interface
interface UserDetail {
  id: string;
  name: string;
  email: string;
  role: string;
}

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

const SuperAdminTasksScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [tasks, setTasks] = useState<ExtendedTask[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTasks, setFilteredTasks] = useState<ExtendedTask[]>([]);
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [page, setPage] = useState(0);
  const [hasMoreData, setHasMoreData] = useState(true);
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

      // First fetch tasks with joined company data
      // This reduces the number of queries compared to separate fetches
      let query = supabase.from("tasks").select(
        `
          id, 
          title, 
          description, 
          status, 
          priority, 
          deadline, 
          created_at,
          updated_at,
          modified_by,
          assigned_to,
          company:company_id (
            id, 
            company_name
          )
        `,
        { count: "exact" }
      );

      // Apply sorting based on the applied sort order
      query = query
        .order("created_at", {
          ascending: appliedFilters.sortOrder === "asc",
        })
        .range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching tasks:", error);
        throw error;
      }

      if (!data) {
        console.log("No task data returned");
        if (refresh) {
          setTasks([]);
        }
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        return;
      }

      try {
        // Prepare assignedTo arrays for bulk fetching - safely handle non-array values
        const allAssignedIds =
          (data || [])
            .filter(
              (task) =>
                Array.isArray(task.assigned_to) && task.assigned_to.length > 0
            )
            .flatMap((task) => task.assigned_to) || [];

        // Only fetch user details if there are assigned users
        const uniqueAssignedIds = Array.from(new Set(allAssignedIds));

        // Get all modifier IDs (if they exist)
        const allModifierIds = (data || [])
          .map((task) => task.modified_by)
          .filter(Boolean);

        // Fix the Set iteration issue with a more compatible approach
        const allUserIds = Array.from(
          new Set([...uniqueAssignedIds, ...allModifierIds])
        );

        let companyUsers: UserDetail[] = [];
        let adminUsers: UserDetail[] = [];

        if (allUserIds.length > 0) {
          try {
            // Fetch all company users in one batch
            const { data: companyUsersData, error: companyError } =
              await supabase
                .from("company_user")
                .select("id, first_name, last_name, email, role")
                .in("id", allUserIds);

            if (companyError) {
              console.error("Error fetching company users:", companyError);
            } else {
              companyUsers = (companyUsersData || []).map((user) => ({
                id: user.id,
                name: `${user.first_name} ${user.last_name}`,
                email: user.email,
                role: user.role,
              }));
            }
          } catch (userError) {
            console.error("Error processing company users:", userError);
          }

          try {
            // Fetch all admin users in one batch
            const { data: adminUsersData, error: adminError } = await supabase
              .from("admin")
              .select("id, name, email, role")
              .in("id", allUserIds);

            if (adminError) {
              console.error("Error fetching admin users:", adminError);
            } else {
              adminUsers = (adminUsersData || []).map((admin) => ({
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
              }));
            }
          } catch (adminError) {
            console.error("Error processing admin users:", adminError);
          }
        }

        // Create a lookup map for quick access to user details
        const userDetailsMap: { [key: string]: UserDetail } = {};
        [...companyUsers, ...adminUsers].forEach((user) => {
          if (user && user.id) {
            userDetailsMap[user.id] = user;
          }
        });

        // Now map task data with assigned users and modifier information
        const tasksWithDetails = data.map((task) => {
          try {
            // Make sure assigned_to exists and is an array
            const assignedToArray = Array.isArray(task.assigned_to)
              ? task.assigned_to
              : [];

            const assignedUserDetails =
              assignedToArray.length > 0
                ? assignedToArray
                    .map((id: string) => userDetailsMap[id])
                    .filter(Boolean) // Remove undefined entries
                : [];

            // Add modifier info if available
            const modifierName = task.modified_by
              ? userDetailsMap[task.modified_by]?.name
              : undefined;

            // First convert to unknown, then to ExtendedTask to satisfy TypeScript
            return {
              ...task,
              assignedUserDetails,
              modified_at: task.updated_at,
              modifier_name: modifierName,
            } as unknown as ExtendedTask;
          } catch (taskError) {
            console.error("Error processing task:", taskError, task);
            // Return task without assigned users on error
            return {
              ...task,
              assignedUserDetails: [],
              modified_at: task.updated_at,
            } as unknown as ExtendedTask;
          }
        });

        // Check if we have more data
        if (count !== null) {
          setHasMoreData(from + (data?.length || 0) < count);
        } else {
          setHasMoreData(data?.length === PAGE_SIZE);
        }

        if (refresh) {
          setTasks(tasksWithDetails);
        } else {
          setTasks((prev) => [...prev, ...tasksWithDetails]);
        }
      } catch (dataProcessingError) {
        console.error("Error processing task data:", dataProcessingError);
        // Still set the tasks without the user details if we have errors processing them
        const basicTasks = data.map(
          (task) =>
            ({ ...task, assignedUserDetails: [] }) as unknown as ExtendedTask
        );

        if (refresh) {
          setTasks(basicTasks);
        } else {
          setTasks((prev) => [...prev, ...basicTasks]);
        }
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchTasks(true);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks(true);
  };

  const loadMoreTasks = () => {
    if (!loading && !loadingMore && hasMoreData) {
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

  const getTranslatedPriority = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH:
        return t("superAdmin.tasks.high");
      case TaskPriority.MEDIUM:
        return t("superAdmin.tasks.medium");
      case TaskPriority.LOW:
        return t("superAdmin.tasks.low");
      default:
        // Fall back to a safe default translation
        return t("superAdmin.tasks.medium");
    }
  };

  // Render active filter indicator
  const renderActiveFilterIndicator = () => {
    if (!hasActiveFilters()) return null;

    return (
      <View style={styles.activeFiltersContainer}>
        <Text style={styles.activeFiltersText}>
          {t("superAdmin.tasks.activeFilters")}:
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
              {t("superAdmin.tasks.status")}:{" "}
              {t(`superAdmin.tasks.${appliedFilters.status}`)}
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
              {t("superAdmin.tasks.priority")}:{" "}
              {getTranslatedPriority(appliedFilters.priority as TaskPriority)}
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
              {t("superAdmin.tasks.date")}: {t("superAdmin.tasks.oldestFirst")}
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
                {t("superAdmin.tasks.filterOptions")}
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
                  {t("superAdmin.tasks.status")}
                </Text>
              </View>
              <RadioButton.Group
                onValueChange={(value) =>
                  setStatusFilter(value as TaskStatus | "all")
                }
                value={statusFilter}
              >
                <View style={styles.radioItem}>
                  <RadioButton.Android value="all" color="#1a73e8" />
                  <Text style={styles.radioLabel}>
                    {t("superAdmin.tasks.all")}
                  </Text>
                </View>
                {Object.values(TaskStatus).map((status) => (
                  <View key={status} style={styles.radioItem}>
                    <RadioButton.Android value={status} color="#1a73e8" />
                    <Text style={styles.radioLabel}>
                      {t(`superAdmin.tasks.${status}`)}
                    </Text>
                  </View>
                ))}
              </RadioButton.Group>
            </View>

            <Divider style={styles.modalDivider} />

            <View style={styles.modalSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {t("superAdmin.tasks.priority")}
                </Text>
              </View>
              <RadioButton.Group
                onValueChange={(value) =>
                  setPriorityFilter(value as TaskPriority | "all")
                }
                value={priorityFilter}
              >
                <View style={styles.radioItem}>
                  <RadioButton.Android value="all" color="#1a73e8" />
                  <Text style={styles.radioLabel}>
                    {t("superAdmin.tasks.all")}
                  </Text>
                </View>
                {Object.values(TaskPriority).map((priority) => (
                  <View key={priority} style={styles.radioItem}>
                    <RadioButton.Android value={priority} color="#1a73e8" />
                    <Text style={styles.radioLabel}>
                      {getTranslatedPriority(priority)}
                    </Text>
                  </View>
                ))}
              </RadioButton.Group>
            </View>

            <Divider style={styles.modalDivider} />

            <View style={styles.modalSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {t("superAdmin.tasks.sortByDate")}
                </Text>
              </View>
              <RadioButton.Group
                onValueChange={(value) => setSortOrder(value)}
                value={sortOrder}
              >
                <View style={styles.radioItem}>
                  <RadioButton.Android value="desc" color="#1a73e8" />
                  <Text style={styles.radioLabel}>
                    {t("superAdmin.tasks.newestFirst")}
                  </Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton.Android value="asc" color="#1a73e8" />
                  <Text style={styles.radioLabel}>
                    {t("superAdmin.tasks.oldestFirst")}
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
                {t("superAdmin.tasks.clearFilters")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerButton, styles.applyButton]}
              onPress={applyFilters}
            >
              <Text style={styles.applyButtonText}>
                {t("superAdmin.tasks.apply")}
              </Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </Portal>
    );
  };

  // Create memoized renderTaskItem function
  const renderTaskItem = useCallback(
    ({ item }: { item: ExtendedTask }) => (
      <TouchableOpacity
        onPress={() => navigation.navigate("TaskDetails", { taskId: item.id })}
      >
        <View
          style={{
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
          }}
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
              {item.company && (
                <View style={{ flexDirection: "row" }}>
                  <Text
                    style={{
                      opacity: 0.7,
                      color: "#333",
                      fontSize: 13,
                      fontWeight: "600",
                      marginRight: 2,
                    }}
                  >
                    {t("superAdmin.companies.company")}
                  </Text>
                  <Text
                    style={{
                      fontSize: 14,
                      color: "#666",
                      marginLeft: 4,
                    }}
                  >
                    {item.company.company_name}
                  </Text>
                </View>
              )}
            </View>
            <StatusBadge status={item.status} />
          </View>

          <View
            style={{
              backgroundColor: "#f9f9f9",
              borderRadius: 8,
              padding: 12,
              marginBottom: 16,
              borderLeftWidth: 2,
              borderLeftColor: "#1a73e8",
            }}
          >
            {item.assignedUserDetails &&
              item.assignedUserDetails.length > 0 && (
                <View style={{ flexDirection: "row", marginBottom: 4 }}>
                  <Text
                    style={{
                      opacity: 0.7,
                      color: "#333",
                      fontSize: 13,
                      fontWeight: "600",
                      marginRight: 2,
                    }}
                  >
                    {t("superAdmin.tasks.assignedTo")}
                  </Text>
                  <Text
                    style={{
                      flex: 1,
                      color: "#666",
                      fontSize: 13,
                    }}
                  >
                    : {item.assignedUserDetails[0].name}
                    {item.assignedUserDetails.length > 1 &&
                      ` +${item.assignedUserDetails.length - 1} ${t("superAdmin.tasks.more")}`}
                  </Text>
                </View>
              )}
            <View style={{ flexDirection: "row", marginBottom: 4 }}>
              <Text
                style={{
                  opacity: 0.7,
                  color: "#333",
                  fontSize: 13,
                  fontWeight: "600",
                  marginRight: 2,
                }}
              >
                {t("superAdmin.tasks.created")}
              </Text>
              <Text
                style={{
                  flex: 1,
                  color: "#666",
                  fontSize: 13,
                }}
              >
                : {format(new Date(item.created_at), "MMM d, yyyy")}
              </Text>
            </View>

            {item.modified_by && item.modified_at && (
              <View
                style={{
                  marginTop: 6,
                  paddingTop: 6,
                  borderTopWidth: 1,
                  borderTopColor: "rgba(0,0,0,0.05)",
                }}
              >
                <View style={{ flexDirection: "row", marginBottom: 4 }}>
                  <Text
                    style={{
                      opacity: 0.7,
                      color: "#333",
                      fontSize: 13,
                      fontWeight: "600",
                      marginRight: 2,
                    }}
                  >
                    {t("superAdmin.tasks.lastModified")}
                  </Text>
                  <Text
                    style={{
                      flex: 1,
                      color: "#666",
                      fontSize: 13,
                    }}
                  >
                    : {format(new Date(item.modified_at), "MMM d, yyyy, HH:mm")}
                  </Text>
                </View>
                {item.modifier_name && (
                  <View style={{ flexDirection: "row", marginBottom: 4 }}>
                    <Text
                      style={{
                        opacity: 0.7,
                        color: "#333",
                        fontSize: 13,
                        fontWeight: "600",
                        marginRight: 2,
                      }}
                    >
                      {t("superAdmin.tasks.modifiedBy")}
                    </Text>
                    <Text
                      style={{
                        flex: 1,
                        color: "#666",
                        fontSize: 13,
                      }}
                    >
                      : {item.modifier_name}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 4,
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
                fontFamily: "Poppins-Regular",
                fontSize: 12,
              }}
            >
              {getTranslatedPriority(item.priority)}
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
              {t("superAdmin.tasks.due")}:{" "}
              {format(new Date(item.deadline), "MMM d, yyyy")}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    ),
    [t]
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: "#F5F5F5" }]}>
        <AppHeader
          title={t("superAdmin.tasks.title")}
          showBackButton={true}
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
        title={t("superAdmin.tasks.title")}
        showBackButton={true}
        showHelpButton={false}
        showProfileMenu={false}
        showLogo={false}
        showTitle={true}
      />
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder={t("superAdmin.tasks.search")}
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

      {filteredTasks.length === 0 ? (
        <EmptyState
          icon="clipboard-text-off"
          title={t("superAdmin.tasks.noTasksFound")}
          message={
            searchQuery || hasActiveFilters()
              ? t("superAdmin.tasks.noTasksMatch")
              : t("superAdmin.tasks.noTasksCreated")
          }
          buttonTitle={
            searchQuery || hasActiveFilters()
              ? t("superAdmin.tasks.clearFilters")
              : t("superAdmin.tasks.createTask")
          }
          onButtonPress={() => {
            if (searchQuery || hasActiveFilters()) {
              setSearchQuery("");
              clearFilters();
            } else {
              navigation.navigate("CreateTask");
            }
          }}
        />
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
          onEndReachedThreshold={0.3}
          ListFooterComponent={() => (
            <View style={styles.loadingFooter}>
              {loadingMore && hasMoreData && (
                <ActivityIndicator size="small" color="#1a73e8" />
              )}
              {!hasMoreData && filteredTasks.length > 0 && (
                <Text style={styles.endListText}>
                  {t("superAdmin.tasks.noMoreTasks")}
                </Text>
              )}
            </View>
          )}
        />
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate("CreateTask")}
        color="#FFFFFF"
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
  companyName: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
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
    bottom: Platform.OS === "web" ? 10 : 10,
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
    fontFamily: "Poppins-SemiBold",
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
    fontFamily: "Poppins-SemiBold",
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
    fontFamily: "Poppins-Regular",
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

export default SuperAdminTasksScreen;
