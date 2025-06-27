import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { logDebug } from "../../utils/logger";
import {
  StyleSheet,
  View,
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
  FAB,
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
import {
  FilterSection,
  RadioFilterGroup,
  FilterDivider,
  PillFilterGroup,
} from "../../components/FilterSections";
import FilterModal from "../../components/FilterModal";
import Pagination from "../../components/Pagination";
import { FlashList } from "@shopify/flash-list";

// Define form interface with the properties needed for our UI
interface FormItem {
  id: string;
  form_sequence_id: number;
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
  const [forms, setForms] = useState<FormItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredForms, setFilteredForms] = useState<FormItem[]>([]);
  const [page, setPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const PAGE_SIZE = 10;

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  // Filter states
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FormStatus | "all">("all");
  const [formTypeFilter, setFormTypeFilter] = useState<string>("all");
  const [appliedFilters, setAppliedFilters] = useState<{
    status: FormStatus | "all";
    formType: string;
  }>({
    status: "all",
    formType: "all",
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

      // Always sort by newest first
      return filtered.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    } catch (error) {
      console.error("Error filtering forms:", error);
      return forms;
    }
  }, [forms, appliedFilters.status, appliedFilters.formType, searchQuery]);

  // Update filteredForms when memoizedFilteredForms changes
  useEffect(() => {
    setFilteredForms(memoizedFilteredForms);
  }, [memoizedFilteredForms]);

  // Add back the useEffect for initial data loading
  useEffect(() => {
    fetchForms(true);
  }, [appliedFilters]);

  // Add back the onRefresh function
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(0);
    fetchForms(true);
  }, []);

  // Update the fetchForms function to handle loading states better
  const fetchForms = async (refresh = false) => {
    try {
      if (refresh) {
        setPage(0);
        setLoading(true);
      }

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Fetch accident reports with count
      let accidentQuery = supabase
        .from("accident_report")
        .select(
          `
          id,
          form_sequence_id,
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
        `,
          { count: "exact" }
        )
        .neq("status", FormStatus.DRAFT)
        .order("created_at", { ascending: false });

      // Apply status filter if set
      if (appliedFilters.status !== "all") {
        accidentQuery = accidentQuery.eq("status", appliedFilters.status);
      }

      const {
        data: accidentData,
        count: accidentCount,
        error: accidentError,
      } = await accidentQuery.range(from, to);

      // Fetch illness reports with count
      let illnessQuery = supabase
        .from("illness_report")
        .select(
          `
          id,
          form_sequence_id,
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
        `,
          { count: "exact" }
        )
        .neq("status", FormStatus.DRAFT)
        .order("submission_date", { ascending: false });

      // Apply status filter if set
      if (appliedFilters.status !== "all") {
        illnessQuery = illnessQuery.eq("status", appliedFilters.status);
      }

      const {
        data: illnessData,
        count: illnessCount,
        error: illnessError,
      } = await illnessQuery.range(from, to);

      // Fetch staff departure reports with count
      let departureQuery = supabase
        .from("staff_departure_report")
        .select(
          `
          id,
          form_sequence_id,
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
        `,
          { count: "exact" }
        )
        .neq("status", FormStatus.DRAFT)
        .order("created_at", { ascending: false });

      // Apply status filter if set
      if (appliedFilters.status !== "all") {
        departureQuery = departureQuery.eq("status", appliedFilters.status);
      }

      const {
        data: departureData,
        count: departureCount,
        error: departureError,
      } = await departureQuery.range(from, to);

      if (accidentError || illnessError || departureError) {
        console.error("Error fetching forms:", {
          accidentError,
          illnessError,
          departureError,
        });
        throw new Error("Failed to fetch forms");
      }

      // Format and combine all forms
      const formattedAccidents = (accidentData || []).map((report: any) => ({
        id: report.id,
        form_sequence_id: report.form_sequence_id,
        type: "accident",
        title: t("superAdmin.forms.accidentReport"),
        status: report.status as FormStatus,
        created_at: report.created_at,
        updated_at: report.updated_at,
        modified_by: report.modified_by,
        modified_at: report.updated_at,
        submitted_by: "",
        company_name:
          report.employee?.company?.company_name || "Unknown Company",
        employee_name: report.employee
          ? `${report.employee.first_name} ${report.employee.last_name}`
          : "Unknown Employee",
      }));

      const formattedIllness = (illnessData || []).map((report: any) => ({
        id: report.id,
        form_sequence_id: report.form_sequence_id,
        type: "illness",
        title: t("superAdmin.forms.illnessReport"),
        status: report.status as FormStatus,
        created_at: report.submission_date,
        updated_at: report.updated_at,
        modified_by: report.modified_by,
        modified_at: report.updated_at,
        submitted_by: "",
        company_name:
          report.employee?.company?.company_name || "Unknown Company",
        employee_name: report.employee
          ? `${report.employee.first_name} ${report.employee.last_name}`
          : "Unknown Employee",
      }));

      const formattedDeparture = (departureData || []).map((report: any) => ({
        id: report.id,
        form_sequence_id: report.form_sequence_id,
        type: "departure",
        title: t("superAdmin.forms.departureReport"),
        status: report.status as FormStatus,
        created_at: report.created_at,
        updated_at: report.updated_at,
        modified_by: report.modified_by,
        modified_at: report.updated_at,
        submitted_by: "",
        company_name:
          report.employee?.company?.company_name || "Unknown Company",
        employee_name: report.employee
          ? `${report.employee.first_name} ${report.employee.last_name}`
          : "Unknown Employee",
      }));

      // Filter by form type if needed
      let combinedForms = [
        ...formattedAccidents,
        ...formattedIllness,
        ...formattedDeparture,
      ];

      if (appliedFilters.formType !== "all") {
        combinedForms = combinedForms.filter(
          (form) => form.type === appliedFilters.formType
        );
      }

      // Sort by newest first
      combinedForms.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      // Update total items count
      const totalCount =
        (accidentCount || 0) + (illnessCount || 0) + (departureCount || 0);
      setTotalItems(totalCount);

      // Update forms state
      setForms(combinedForms);
      setFilteredForms(combinedForms);
    } catch (error) {
      console.error("Error fetching forms:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Update search effect
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredForms(forms);
    } else {
      const filtered = forms.filter(
        (form) =>
          form.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          form.employee_name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          form.company_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredForms(filtered);
    }
  }, [searchQuery, forms]);

  // Handle page change
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchForms(false);
  };

  // Apply filters and refresh forms list
  const applyFilters = () => {
    setFilterModalVisible(false);
    const newFilters = {
      status: statusFilter,
      formType: formTypeFilter,
    };
    setAppliedFilters(newFilters);
  };

  // Clear all filters
  const clearFilters = () => {
    setStatusFilter("all");
    setFormTypeFilter("all");
    setAppliedFilters({
      status: "all",
      formType: "all",
    });
  };

  // Check if we have any active filters
  const hasActiveFilters = () => {
    return appliedFilters.status !== "all" || appliedFilters.formType !== "all";
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
                  backgroundColor: "rgba(26, 115, 232, 0.1)",
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
                  backgroundColor: "rgba(26, 115, 232, 0.1)",
                  borderColor: "#1a73e8",
                },
              ]}
              textStyle={{ color: "#1a73e8" }}
            >
              {t("superAdmin.forms.type")}:{" "}
              {getFormTypeName(appliedFilters.formType)}
            </Chip>
          )}
        </ScrollView>
      </View>
    );
  };

  // Render the filter modal
  const renderFilterModal = () => {
    const statusOptions = [
      { label: "All Status", value: "all" },
      ...Object.values(FormStatus)
        .filter((status) => status !== FormStatus.DRAFT)
        .map((status) => ({
          label: status
            .split("_")
            .map(
              (word) =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            )
            .join(" "),
          value: status,
        })),
    ];

    const formTypeOptions = [
      { label: t("superAdmin.forms.all"), value: "all" },
      {
        label: t("superAdmin.forms.accidentReport"),
        value: "accident",
      },
      {
        label: t("superAdmin.forms.illnessReport"),
        value: "illness",
      },
      {
        label: t("superAdmin.forms.departureReport"),
        value: "departure",
      },
    ];

    return (
      <FilterModal
        visible={filterModalVisible}
        onDismiss={() => setFilterModalVisible(false)}
        title={t("superAdmin.forms.filterOptions")}
        onClear={clearFilters}
        onApply={applyFilters}
        isLargeScreen={isLargeScreen}
        isMediumScreen={isMediumScreen}
      >
        <FilterSection title={t("superAdmin.forms.status")}>
          <PillFilterGroup
            options={statusOptions}
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as FormStatus | "all")
            }
          />
        </FilterSection>

        <FilterDivider />

        <FilterSection title={t("superAdmin.forms.formType")}>
          <PillFilterGroup
            options={formTypeOptions}
            value={formTypeFilter}
            onValueChange={setFormTypeFilter}
          />
        </FilterSection>
      </FilterModal>
    );
  };

  // Create memoized renderFormItem function to prevent unnecessary re-renders
  const renderFormItem = useCallback(
    ({ item }: { item: FormItem }) => (
      <Surface style={[styles.cardSurface, { backgroundColor: "#FFFFFF" }]}>
        <TouchableOpacity
          onPress={() => {
            logDebug("View form details for:", item.id, item.type);
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

  // Add getFormattedId helper function
  const getFormattedId = (type: string, sequenceId: number) => {
    const prefix =
      type === "accident"
        ? "ACC"
        : type === "illness"
          ? "ILL"
          : type === "departure"
            ? "DEP"
            : "";
    return `${prefix}-${String(sequenceId).padStart(3, "0")}`;
  };

  // Update TableHeader component
  const TableHeader = () => (
    <View style={styles.tableHeader}>
      <View style={[styles.tableHeaderCell, { flex: 0.7 }]}>
        <Text style={styles.tableHeaderText}>Form ID</Text>
      </View>
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

  // Update TableRow component
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
      <View style={[styles.tableCell, { flex: 0.7 }]}>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate("SuperAdminFormDetailsScreen", {
              formId: item.id,
              formType: item.type,
            });
          }}
        >
          <Text
            style={[
              styles.tableCellText,
              styles.formIdLink,
              { color: getFormTypeColor(item.type) },
            ]}
          >
            {getFormattedId(item.type, item.form_sequence_id)}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tableCell}>
        <Text
          style={[
            styles.tableCellText,
            {
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

  // Add state for FAB menu
  const [fabMenuVisible, setFabMenuVisible] = useState(false);

  // Add renderFabMenu function
  const renderFabMenu = () => (
    <View style={{ position: "relative" }}>
      <FAB
        icon={fabMenuVisible ? "close" : "plus"}
        label={isLargeScreen ? "Create Form" : undefined}
        style={[
          styles.fab,
          {
            backgroundColor: theme.colors.primary,
            position: "relative",
            margin: 0,
            marginLeft: 16,
          },
        ]}
        onPress={() => setFabMenuVisible(!fabMenuVisible)}
        color={theme.colors.surface}
        mode="flat"
        theme={{ colors: { accent: theme.colors.surface } }}
      />
      {fabMenuVisible && (
        <Portal>
          <Pressable
            style={styles.fabMenuOverlay}
            onPress={() => setFabMenuVisible(false)}
          >
            <View style={[styles.fabMenuContainer]}>
              <View style={styles.fabMenuHeader}>
                <Text style={styles.fabMenuHeaderTitle}>Create New Form</Text>
                <IconButton
                  icon="close"
                  size={24}
                  onPress={() => setFabMenuVisible(false)}
                />
              </View>
              <Divider style={styles.fabMenuDivider} />
              <View style={styles.fabMenuContent}>
                <TouchableOpacity
                  style={[styles.fabMenuItem, { backgroundColor: "#ffebee" }]}
                  onPress={() => {
                    setFabMenuVisible(false);
                    navigation.navigate(
                      "SuperAdminCreateEmployeeAccidentReport"
                    );
                  }}
                >
                  <View style={styles.fabMenuItemContent}>
                    <View style={styles.fabMenuItemIcon}>
                      <IconButton
                        icon="alert-circle"
                        size={24}
                        iconColor="#f44336"
                      />
                    </View>
                    <View style={styles.fabMenuItemText}>
                      <Text style={styles.fabMenuItemTitle}>
                        Create Accident Report
                      </Text>
                      <Text style={styles.fabMenuItemDescription}>
                        Create a workplace accident report for any employee
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.fabMenuItem, { backgroundColor: "#fff3e0" }]}
                  onPress={() => {
                    setFabMenuVisible(false);
                    navigation.navigate(
                      "SuperAdminCreateEmployeeIllnessReport"
                    );
                  }}
                >
                  <View style={styles.fabMenuItemContent}>
                    <View style={styles.fabMenuItemIcon}>
                      <IconButton
                        icon="medical-bag"
                        size={24}
                        iconColor="#ff9800"
                      />
                    </View>
                    <View style={styles.fabMenuItemText}>
                      <Text style={styles.fabMenuItemTitle}>
                        Create Illness Report
                      </Text>
                      <Text style={styles.fabMenuItemDescription}>
                        Create a health-related report for any employee
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.fabMenuItem, { backgroundColor: "#e3f2fd" }]}
                  onPress={() => {
                    setFabMenuVisible(false);
                    navigation.navigate(
                      "SuperAdminCreateEmployeeStaffDeparture"
                    );
                  }}
                >
                  <View style={styles.fabMenuItemContent}>
                    <View style={styles.fabMenuItemIcon}>
                      <IconButton
                        icon="exit-to-app"
                        size={24}
                        iconColor="#2196f3"
                      />
                    </View>
                    <View style={styles.fabMenuItemText}>
                      <Text style={styles.fabMenuItemTitle}>
                        Create Staff Departure
                      </Text>
                      <Text style={styles.fabMenuItemDescription}>
                        Create a staff departure report for any employee
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Portal>
      )}
    </View>
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
              width="95%"
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
            <FlashList
              estimatedItemSize={74}
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
            placeholder="Search by form ID, employee name, or form type..."
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
          {renderFabMenu()}
        </View>
      </View>

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
        {renderActiveFilterIndicator()}
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
          <>
            <View style={styles.tableContainer}>
              <TableHeader />
              <FlashList
                estimatedItemSize={74}
                data={filteredForms}
                renderItem={({ item }) => <TableRow item={item} />}
                keyExtractor={(item) => `${item.type}-${item.id}`}
                contentContainerStyle={styles.tableContent}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                  />
                }
              />
            </View>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 16,
                minHeight: 48,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginLeft: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: "#666",
                    fontFamily: "Poppins-Regular",
                  }}
                >
                  {t("superAdmin.totalForms")}:
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: theme.colors.primary,
                    fontFamily: "Poppins-Medium",
                    marginLeft: 4,
                  }}
                >
                  {totalItems}
                </Text>
              </View>
              {totalPages > 1 && (
                <View style={styles.paginationWrapper}>
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </View>
              )}
            </View>
          </>
        ) : (
          <>
            <FlashList
              estimatedItemSize={74}
              data={filteredForms}
              renderItem={renderFormItem}
              keyExtractor={(item) => `${item.type}-${item.id}`}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            />
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 16,
                minHeight: 48,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginLeft: 12,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    color: "#666",
                    fontFamily: "Poppins-Regular",
                  }}
                >
                  {t("superAdmin.totalForms")}:
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: theme.colors.primary,
                    fontFamily: "Poppins-Medium",
                    marginLeft: 4,
                  }}
                >
                  {totalForms}
                </Text>
              </View>
              {totalPages > 1 && (
                <View style={styles.paginationWrapper}>
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    onPageChange={handlePageChange}
                  />
                </View>
              )}
            </View>
          </>
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
    paddingTop: 8,
    paddingBottom: 50,
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
  paginationWrapper: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 16,
    marginTop: 12,
    overflow: "hidden",
    width: "auto",
    alignSelf: "center",
  },
  formIdLink: {
    cursor: "pointer",
    fontSize: 14,
    fontFamily: "Poppins-Medium",
  },
  fabMenuOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
  },
  fabMenuContainer: {
    width: 380,
    backgroundColor: "#fff",
    borderRadius: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1001,
  },
  fabMenuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingBottom: 12,
  },
  fabMenuHeaderTitle: {
    fontSize: 20,
    fontFamily: "Poppins-SemiBold",
    color: "#333",
  },
  fabMenuDivider: {
    backgroundColor: "#e0e0e0",
  },
  fabMenuContent: {
    padding: 16,
  },
  fabMenuItem: {
    borderRadius: 12,
    marginVertical: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  fabMenuItemContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  fabMenuItemIcon: {
    marginRight: 16,
  },
  fabMenuItemText: {
    flex: 1,
  },
  fabMenuItemTitle: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#333",
    marginBottom: 4,
  },
  fabMenuItemDescription: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#666",
    lineHeight: 18,
  },
  fab: {
    borderRadius: 17,
    height: 56,
  },
} as const);

export default SuperAdminFormsScreen;
