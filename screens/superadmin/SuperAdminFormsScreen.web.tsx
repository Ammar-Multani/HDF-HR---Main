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
import {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Animated from "react-native-reanimated";

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

// Update TooltipText component to disable tooltips on large screens
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
  width: number | string;
  height: number;
  style?: any;
}

const Shimmer: React.FC<ShimmerProps> = ({ width, height, style }) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: withRepeat(
            withSequence(
              withTiming(typeof width === "number" ? -width : -200, {
                duration: 800,
              }),
              withTiming(typeof width === "number" ? width : 200, {
                duration: 800,
              })
            ),
            -1
          ),
        },
      ],
    };
  });

  return (
    <View
      style={[
        {
          width,
          height,
          backgroundColor: "#E8E8E8",
          overflow: "hidden",
          borderRadius: 4,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            width: "100%",
            height: "100%",
            position: "absolute",
            backgroundColor: "transparent",
          },
          animatedStyle,
        ]}
      >
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

// Update FormItemSkeleton component
const FormItemSkeleton = () => {
  return (
    <Surface style={[styles.cardSurface, { backgroundColor: "#FFFFFF" }]}>
      <View style={styles.cardTouchable}>
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Shimmer width={180} height={20} style={{ marginBottom: 8 }} />
          </View>
          <Shimmer width={80} height={24} style={{ borderRadius: 12 }} />
        </View>

        <View style={[styles.cardDetails, { borderLeftColor: "#E0E0E0" }]}>
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
          <View style={styles.detailItem}>
            <Shimmer width={160} height={16} />
          </View>
          <View style={styles.viewDetailsContainer}>
            <Shimmer width={100} height={14} style={{ marginRight: 8 }} />
            <Shimmer width={24} height={24} style={{ borderRadius: 12 }} />
          </View>
        </View>
      </View>
    </Surface>
  );
};

// Add TableSkeleton component
const TableSkeleton = () => {
  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Form Type</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Employee</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Company</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Submitted Date</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Status</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Actions</Text>
      </View>
    </View>
  );
  return (
    <View style={styles.tableContainer}>
      <TableHeader />
      {Array(5)
        .fill(0)
        .map((_, index) => (
          <View key={`skeleton-${index}`} style={styles.tableRow}>
            <View style={styles.tableCell}>
              <Shimmer width={140} height={16} />
            </View>
            <View style={styles.tableCell}>
              <Shimmer width={160} height={16} />
            </View>
            <View style={styles.tableCell}>
              <Shimmer width={180} height={16} />
            </View>
            <View style={styles.tableCell}>
              <Shimmer width={100} height={16} />
            </View>
            <View style={styles.tableCell}>
              <Shimmer width={80} height={24} style={{ borderRadius: 12 }} />
            </View>
            <View style={styles.actionCell}>
              <Shimmer width={40} height={40} style={{ borderRadius: 20 }} />
            </View>
          </View>
        ))}
    </View>
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

  // Add window dimensions state
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
                {t("superAdmin.forms.filterOptions")}
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
                  <RadioButton.Android
                    value="all"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.radioLabel}>
                    {t("superAdmin.forms.all")}
                  </Text>
                </View>
                {Object.values(FormStatus).map((status) => (
                  <View key={status} style={styles.radioItem}>
                    <RadioButton.Android
                      value={status}
                      color={theme.colors.primary}
                    />
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
                  <RadioButton.Android
                    value="all"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.radioLabel}>
                    {t("superAdmin.forms.all")}
                  </Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton.Android
                    value="accident"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.radioLabel}>
                    {t("superAdmin.forms.accidentReport")}
                  </Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton.Android
                    value="illness"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.radioLabel}>
                    {t("superAdmin.forms.illnessReport")}
                  </Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton.Android
                    value="departure"
                    color={theme.colors.primary}
                  />
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
                  <RadioButton.Android
                    value="desc"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.radioLabel}>
                    {t("superAdmin.forms.newestFirst")}
                  </Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton.Android
                    value="asc"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.radioLabel}>
                    {t("superAdmin.forms.oldestFirst")}
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
                {t("superAdmin.forms.clearFilters")}
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
                <Text
                  style={[
                    styles.formTypeText,
                    { color: getFormTypeColor(item.type) },
                  ]}
                >
                  {getFormTypeName(item.type)}
                </Text>
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

  // Add TableHeader component
  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Form Type</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Employee</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Company</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Submitted Date</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Status</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Actions</Text>
      </View>
    </View>
  );

  // Add TableRow component
  const TableRow = ({ item }: { item: FormItem }) => (
    <Pressable
      onPress={() => {
        navigation.navigate("SuperAdminFormDetailsScreen", {
          formId: item.id,
          formType: item.type,
        });
      }}
      style={({ pressed }: PressableStateCallbackType) => [
        styles.tableRow,
        pressed && { backgroundColor: "#f8fafc" },
      ]}
    >
      <View style={styles.tableCell}>
        <Text
          style={[
            styles.tableCellText,
            {
              color: getFormTypeColor(item.type),
              fontFamily: "Poppins-Medium",
            },
          ]}
        >
          {getFormTypeName(item.type)}
        </Text>
      </View>
      <View style={styles.tableCell}>
        <TooltipText text={item.employee_name} />
      </View>
      <View style={styles.tableCell}>
        <TooltipText text={item.company_name} />
      </View>
      <View style={styles.tableCell}>
        <TooltipText text={format(new Date(item.created_at), "MMM d, yyyy")} />
      </View>
      <View style={styles.tableCell}>
        <StatusBadge status={item.status} />
      </View>
      <View style={styles.actionCell}>
        <IconButton
          icon="eye"
          size={20}
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate("SuperAdminFormDetailsScreen", {
              formId: item.id,
              formType: item.type,
            });
          }}
          style={styles.actionIcon}
        />
      </View>
    </Pressable>
  );

  if (loading && !refreshing) {
    const isLargeScreen = windowDimensions.width >= 1440;
    const isMediumScreen =
      windowDimensions.width >= 768 && windowDimensions.width < 1440;
    const useTableLayout = isLargeScreen || isMediumScreen;

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
              width="100%"
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
              renderItem={() => <FormItemSkeleton />}
              keyExtractor={(_, index) => `skeleton-${index}`}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
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
        ) : isMediumScreen || isLargeScreen ? (
          <View style={styles.tableContainer}>
            <TableHeader />
            <FlatList
              data={filteredForms}
              renderItem={({ item }) => <TableRow item={item} />}
              keyExtractor={(item) => `${item.type}-${item.id}`}
              contentContainerStyle={styles.tableContent}
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
          </View>
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
      </View>
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
    height: 60,
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
  formTypeText: {
    fontSize: 14,
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
  contentContainer: {
    flex: 1,
    paddingHorizontal: Platform.OS === "web" ? 24 : 16,
    paddingVertical: 16,
  },
  tableContainer: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: "hidden",
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
  actionCell: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: 26,
  },
  actionIcon: {
    margin: 0,
    marginRight: 8,
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
} as const);

export default SuperAdminFormsScreen;
