import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Platform,
  ActivityIndicator,
  Dimensions,
  Pressable,
  PressableStateCallbackType,
  ViewStyle,
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
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  useSharedValue,
  interpolate,
} from "react-native-reanimated";

// Define extended Task type with the properties needed for our UI
interface ExtendedTask extends Task {
  company?: {
    id: string;
    company_name: string;
  };
  assignedUserDetails?: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
  }>;
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

// Update TooltipText component to check screen size
const TooltipText = ({
  text,
  numberOfLines = 1,
}: {
  text: string;
  numberOfLines?: number;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<View>(null);
  const [isLargeScreen, setIsLargeScreen] = useState(window.innerWidth >= 1440);

  // Add window resize listener for screen size
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

      // Calculate horizontal position to prevent overflow
      const windowWidth = window.innerWidth;
      let xPos = rect.left;

      // Ensure tooltip doesn't overflow right edge
      if (xPos + 300 > windowWidth) {
        // 300 is max tooltip width
        xPos = windowWidth - 310; // Add some padding
      }

      // Position vertically based on available space
      let yPos;
      if (spaceBelow >= 100) {
        // If enough space below
        yPos = rect.bottom + window.scrollY + 5;
      } else if (spaceAbove >= 100) {
        // If enough space above
        yPos = rect.top + window.scrollY - 5;
      } else {
        // If neither, position it where there's more space
        yPos =
          spaceAbove > spaceBelow
            ? rect.top + window.scrollY - 5
            : rect.bottom + window.scrollY + 5;
      }

      setTooltipPosition({ x: xPos, y: yPos });
    }
  };

  useEffect(() => {
    if (isHovered && !isLargeScreen) {
      updateTooltipPosition();
      // Add scroll and resize listeners
      if (Platform.OS === "web") {
        window.addEventListener("scroll", updateTooltipPosition);
        window.addEventListener("resize", updateTooltipPosition);

        return () => {
          window.removeEventListener("scroll", updateTooltipPosition);
          window.removeEventListener("resize", updateTooltipPosition);
        };
      }
    }
  }, [isHovered, isLargeScreen]);

  if (Platform.OS !== "web" || isLargeScreen) {
    return (
      <Text
        style={styles.tableCellText}
        numberOfLines={isLargeScreen ? undefined : numberOfLines}
      >
        {text}
      </Text>
    );
  }

  return (
    <View
      ref={containerRef}
      style={styles.tooltipContainer}
      // @ts-ignore - web specific props
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Text style={styles.tableCellText} numberOfLines={numberOfLines}>
        {text}
      </Text>
      {isHovered && !isLargeScreen && (
        <Portal>
          <View
            style={[
              styles.tooltip,
              {
                position: "absolute",
                left: tooltipPosition.x,
                top: tooltipPosition.y,
              },
            ]}
          >
            <Text style={styles.tooltipText}>{text}</Text>
          </View>
        </Portal>
      )}
    </View>
  );
};

// Add Shimmer component after TooltipText component
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

// Add TaskItemSkeleton component
const TaskItemSkeleton: React.FC = () => {
  return (
    <View style={[styles.card, { backgroundColor: "#FFFFFF", padding: 16 }]}>
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <Shimmer width={180} height={20} style={{ marginBottom: 8 }} />
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Shimmer width={60} height={14} style={{ marginRight: 8 }} />
            <Shimmer width={120} height={14} />
          </View>
        </View>
        <Shimmer width={80} height={24} style={{ borderRadius: 12 }} />
      </View>

      <View style={[styles.detailsSection, { borderLeftColor: "#E0E0E0" }]}>
        <View style={styles.detailItem}>
          <Shimmer width={100} height={14} style={{ marginRight: 8 }} />
          <Shimmer width={150} height={14} />
        </View>
        <View style={styles.detailItem}>
          <Shimmer width={80} height={14} style={{ marginRight: 8 }} />
          <Shimmer width={120} height={14} />
        </View>
        <View style={styles.detailItem}>
          <Shimmer width={90} height={14} style={{ marginRight: 8 }} />
          <Shimmer width={140} height={14} />
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Shimmer width={100} height={30} style={{ borderRadius: 15 }} />
        <Shimmer width={140} height={24} style={{ borderRadius: 6 }} />
      </View>
    </View>
  );
};

// Add TableHeaderSkeleton component for loading state
const TableHeaderSkeleton: React.FC = () => {
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
      <View style={styles.tableHeaderCell}>
        <Shimmer width={80} height={20} />
      </View>
    </View>
  );
};

// Add TableHeader component for actual content
const TableHeader: React.FC = () => {
  const { t } = useTranslation();
  return (
    <View style={styles.tableHeaderRow}>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>
          {t("superAdmin.tasks.title")}
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>
          {t("superAdmin.tasks.company")}
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>
          {t("superAdmin.tasks.assignedTo")}
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>
          {t("superAdmin.tasks.deadline")}
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>
          {t("superAdmin.tasks.priority")}
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>
          {t("superAdmin.tasks.status")}
        </Text>
      </View>
    </View>
  );
};

// Update TableSkeleton to use TableHeaderSkeleton
const TableSkeleton: React.FC = () => {
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
              <Shimmer width={100} height={16} />
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

  // Add window dimensions state at the top of the component
  const [windowDimensions, setWindowDimensions] = useState({
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  });

  // Add window resize listener
  useEffect(() => {
    if (Platform.OS === "web") {
      const handleResize = () => {
        setWindowDimensions({
          width: Dimensions.get("window").width,
          height: Dimensions.get("window").height,
        });
      };

      window.addEventListener("resize", handleResize);

      // Cleanup
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // Calculate responsive breakpoints
  const isLargeScreen = windowDimensions.width >= 1440;
  const isMediumScreen =
    windowDimensions.width >= 768 && windowDimensions.width < 1440;

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

      // First fetch tasks with basic data
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

      console.log(
        "Raw task data from database:",
        data.map((task) => ({
          id: task.id,
          title: task.title,
          assigned_to: task.assigned_to,
        }))
      );

      try {
        // Prepare assignedTo arrays for bulk fetching
        const allAssignedIds =
          data
            .map((task) => {
              // Handle both string and array cases
              if (Array.isArray(task.assigned_to)) {
                return task.assigned_to;
              } else if (task.assigned_to) {
                return [task.assigned_to];
              }
              return [];
            })
            .flat() || [];

        // Only fetch user details if there are assigned users
        const uniqueAssignedIds = Array.from(new Set(allAssignedIds));

        // Get all modifier IDs
        const allModifierIds = data
          .map((task) => task.modified_by)
          .filter(Boolean);

        // Combine all user IDs
        const allUserIds = Array.from(
          new Set([...uniqueAssignedIds, ...allModifierIds])
        );

        let companyUsers: any[] = [];
        let adminUsers: any[] = [];

        if (allUserIds.length > 0) {
          try {
            // Fetch all company users in one batch
            const { data: companyUsersData } = await supabase
              .from("company_user")
              .select("id, first_name, last_name, email, role")
              .in("id", allUserIds);

            if (companyUsersData) {
              companyUsers = companyUsersData.map((user) => ({
                id: user.id,
                name: `${user.first_name} ${user.last_name}`,
                email: user.email,
                role: user.role,
              }));
            }

            // Fetch all admin users in one batch
            const { data: adminUsersData } = await supabase
              .from("admin")
              .select("id, name, email, role")
              .in("id", allUserIds);

            if (adminUsersData) {
              adminUsers = adminUsersData.map((admin) => ({
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role,
              }));
            }
          } catch (userError) {
            console.error("Error fetching user details:", userError);
          }
        }

        // Create a lookup map for quick access to user details
        const userDetailsMap: { [key: string]: any } = {};
        [...companyUsers, ...adminUsers].forEach((user) => {
          if (user && user.id) {
            userDetailsMap[user.id] = user;
          }
        });

        // Map task data with assigned users and modifier information
        const tasksWithDetails = data.map((task) => {
          // Handle both string and array cases for assigned_to
          const assignedToArray = Array.isArray(task.assigned_to)
            ? task.assigned_to
            : task.assigned_to
              ? [task.assigned_to]
              : [];

          const assignedUserDetails = assignedToArray
            .map((id: string) => userDetailsMap[id])
            .filter(Boolean);

          const modifierName = task.modified_by
            ? userDetailsMap[task.modified_by]?.name
            : undefined;

          return {
            ...task,
            assignedUserDetails,
            modified_at: task.updated_at,
            modifier_name: modifierName,
          } as unknown as ExtendedTask;
        });

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
        const basicTasks = data.map(
          (task) =>
            ({
              ...task,
              assignedUserDetails: [],
              modified_at: task.updated_at,
              modifier_name: undefined,
            }) as unknown as ExtendedTask
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
    const modalWidth =
      Platform.OS === "web"
        ? isLargeScreen
          ? 600
          : isMediumScreen
            ? 500
            : "90%"
        : "90%";

    const modalPadding =
      Platform.OS === "web"
        ? isLargeScreen
          ? 32
          : isMediumScreen
            ? 24
            : 16
        : 16;

    return (
      <Portal>
        <Modal
          visible={filterModalVisible}
          onDismiss={() => setFilterModalVisible(false)}
          contentContainerStyle={[
            styles.modalContainer,
            {
              width: modalWidth,
              maxWidth: Platform.OS === "web" ? 600 : "100%",
              alignSelf: "center",
            },
          ]}
        >
          <View
            style={[styles.modalHeaderContainer, { padding: modalPadding }]}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[
                  styles.modalTitle,
                  { fontSize: isLargeScreen ? 24 : isMediumScreen ? 22 : 20 },
                ]}
              >
                {t("superAdmin.tasks.filterOptions")}
              </Text>
              <IconButton
                icon="close"
                size={isLargeScreen ? 28 : 24}
                onPress={() => setFilterModalVisible(false)}
              />
            </View>
            <Divider style={styles.modalDivider} />
          </View>

          <ScrollView style={[styles.modalContent, { padding: modalPadding }]}>
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
                  <RadioButton.Android
                    value="all"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.radioLabel}>
                    {t("superAdmin.tasks.all")}
                  </Text>
                </View>
                {Object.values(TaskStatus).map((status) => (
                  <View key={status} style={styles.radioItem}>
                    <RadioButton.Android
                      value={status}
                      color={theme.colors.primary}
                    />
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
                  <RadioButton.Android
                    value="all"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.radioLabel}>
                    {t("superAdmin.tasks.all")}
                  </Text>
                </View>
                {Object.values(TaskPriority).map((priority) => (
                  <View key={priority} style={styles.radioItem}>
                    <RadioButton.Android
                      value={priority}
                      color={theme.colors.primary}
                    />
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
                  <RadioButton.Android
                    value="desc"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.radioLabel}>
                    {t("superAdmin.tasks.newestFirst")}
                  </Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton.Android
                    value="asc"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.radioLabel}>
                    {t("superAdmin.tasks.oldestFirst")}
                  </Text>
                </View>
              </RadioButton.Group>
            </View>
          </ScrollView>

          <View style={[styles.modalFooter, { padding: modalPadding }]}>
            <TouchableOpacity
              style={[
                styles.footerButton,
                {
                  paddingVertical: isLargeScreen
                    ? 14
                    : isMediumScreen
                      ? 12
                      : 10,
                  paddingHorizontal: isLargeScreen
                    ? 28
                    : isMediumScreen
                      ? 24
                      : 20,
                },
              ]}
              onPress={clearFilters}
            >
              <Text
                style={[
                  styles.clearButtonText,
                  { fontSize: isLargeScreen ? 16 : 14 },
                ]}
              >
                {t("superAdmin.tasks.clearFilters")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.footerButton,
                styles.applyButton,
                {
                  paddingVertical: isLargeScreen
                    ? 14
                    : isMediumScreen
                      ? 12
                      : 10,
                  paddingHorizontal: isLargeScreen
                    ? 28
                    : isMediumScreen
                      ? 24
                      : 20,
                  backgroundColor: theme.colors.primary,
                },
              ]}
              onPress={applyFilters}
            >
              <Text
                style={[
                  styles.applyButtonText,
                  { fontSize: isLargeScreen ? 16 : 14 },
                ]}
              >
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

  // Update the TableRow component to use TooltipText
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
        <TooltipText text={item.company?.company_name || "-"} />
      </View>
      <View style={styles.tableCell}>
        <TooltipText
          text={
            item.assignedUserDetails && item.assignedUserDetails.length > 0
              ? `${item.assignedUserDetails[0].name}${
                  item.assignedUserDetails.length > 1
                    ? ` +${item.assignedUserDetails.length - 1}`
                    : ""
                }`
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
            backgroundColor: getPriorityColor(item.priority) + "20",
          }}
          textStyle={{
            color: getPriorityColor(item.priority),
            fontSize: 11,
          }}
        >
          {getTranslatedPriority(item.priority)}
        </Chip>
      </View>
      <View style={styles.tableCell}>
        <StatusBadge status={item.status} />
      </View>
    </Pressable>
  );

  // Update the renderContent section to use the correct TableHeader
  const renderContent = () => {
    if (filteredTasks.length === 0) {
      return (
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
      );
    }

    // Show skeleton loaders when initially loading
    if (loading && filteredTasks.length === 0) {
      if (isMediumScreen || isLargeScreen) {
        return <TableSkeleton />;
      }
      return (
        <FlatList
          data={Array(3).fill(0)}
          renderItem={() => <TaskItemSkeleton />}
          keyExtractor={(_, index) => `skeleton-${index}`}
          contentContainerStyle={styles.listContent}
        />
      );
    }

    if (isMediumScreen || isLargeScreen) {
      return (
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
            onEndReached={loadMoreTasks}
            onEndReachedThreshold={0.5}
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
        </View>
      );
    }

    return (
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
    );
  };

  if (loading && !refreshing) {
    const isLargeScreen = windowDimensions.width >= 1440;
    const isMediumScreen =
      windowDimensions.width >= 768 && windowDimensions.width < 1440;
    const useTableLayout = isLargeScreen || isMediumScreen;

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: "#F8F9FA" }]}>
        <AppHeader
          title={t("superAdmin.tasks.title")}
          showBackButton={Platform.OS !== "web"}
          showHelpButton={false}
          showProfileMenu={false}
          showLogo={false}
          showTitle={true}
        />
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
            <Shimmer
              width={windowDimensions.width - 100}
              height={60}
              style={{
                borderRadius: 18,
                marginRight: 8,
              }}
            />
            <Shimmer
              width={48}
              height={48}
              style={{
                borderRadius: 8,
              }}
            />
          </View>
        </View>

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
          {useTableLayout ? (
            <TableSkeleton />
          ) : (
            <FlatList
              data={Array(4).fill(0)}
              renderItem={() => <TaskItemSkeleton />}
              keyExtractor={(_, index) => `skeleton-${index}`}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#F5F5F5" }]}>
      <AppHeader
        title={t("superAdmin.tasks.title")}
        showBackButton={Platform.OS !== "web"}
        showHelpButton={false}
        showProfileMenu={false}
        showLogo={false}
        showTitle={true}
      />
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
              size={30}
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
          label="Create Task"
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

      {renderActiveFilterIndicator()}
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
    borderRadius: 17,
    height: 56,
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
  modificationInfo: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  tableContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: "hidden",
    marginTop: 16,
    flex: 1,
  },
  tableHeader: {
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
} as const);

export default SuperAdminTasksScreen;
