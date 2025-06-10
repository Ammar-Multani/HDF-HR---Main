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
import { LinearGradient } from "expo-linear-gradient";
import {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Animated from "react-native-reanimated";
import Pagination from "../../components/Pagination";
import FilterModal from "../../components/FilterModal";
import {
  FilterSection,
  RadioFilterGroup,
  FilterDivider,
  PillFilterGroup,
} from "../../components/FilterSections";
import HelpGuideModal from "../../components/HelpGuideModal";

// Add navigation type definitions
type RootStackParamList = {
  FormDetails: {
    formId: string;
    formType: string;
  };
  Help: undefined;
};

type FormNavigationProp = NavigationProp<RootStackParamList>;

// Add database types
interface CompanyUser {
  first_name: string;
  last_name: string;
}

interface AccidentReport {
  id: string;
  employee_id: string;
  status: FormStatus;
  created_at: string;
  updated_at: string;
  modified_by: string;
  accident_description: string;
  company_user: CompanyUser;
}

interface IllnessReport {
  id: string;
  employee_id: string;
  status: FormStatus;
  submission_date: string;
  updated_at: string;
  modified_by: string;
  leave_description: string;
  company_user: CompanyUser;
}

interface DepartureReport {
  id: string;
  employee_id: string;
  status: FormStatus;
  submission_date: string;
  updated_at: string;
  modified_by: string;
  departure_description: string;
  company_user: CompanyUser;
}

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

// Add getFormTypeColor helper function
const getFormTypeColor = (type: string) => {
  switch (type) {
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

// Update TableRowProps interface
interface TableRowProps {
  item: FormSubmission;
  navigation: FormNavigationProp;
}

const TableRow = ({ item, navigation }: TableRowProps) => (
  <Pressable
    onPress={() =>
      navigation.navigate("FormDetails", {
        formId: item.id,
        formType: item.type,
      })
    }
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
        {item.title}
      </Text>
    </View>
    <View style={styles.tableCell}>
      <TooltipText text={item.employee_name} />
    </View>
    <View style={styles.tableCell}>
      <TooltipText
        text={format(new Date(item.submission_date), "MMM d, yyyy")}
      />
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
          navigation.navigate("FormDetails", {
            formId: item.id,
            formType: item.type,
          });
        }}
        style={styles.actionIcon}
      />
    </View>
  </Pressable>
);

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

// Add Shimmer component
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

const FormSubmissionsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<FormNavigationProp>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [forms, setForms] = useState<FormSubmission[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredForms, setFilteredForms] = useState<FormSubmission[]>([]);
  const [page, setPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const PAGE_SIZE = 10;

  // Calculate total pages
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

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

  // Filter modal state
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [typeFilter, setTypeFilter] = useState<
    "all" | "accident" | "illness" | "departure"
  >("all");
  const [statusFilter, setStatusFilter] = useState<FormStatus | "all">("all");
  const [appliedFilters, setAppliedFilters] = useState<{
    status: FormStatus | "all";
    formType: "all" | "accident" | "illness" | "departure";
  }>({
    status: "all",
    formType: "all",
  });

  const [helpModalVisible, setHelpModalVisible] = useState(false);

  // Define help guide content
  const helpGuideSteps = [
    {
      title: "Form Types",
      icon: "file-document-multiple",
      description:
        "View different types of forms: Accident Reports (Red), Illness Reports (Orange), and Staff Departure Reports (Blue). Each type is color-coded for easy identification.",
    },
    {
      title: "Search & Filter",
      icon: "magnify",
      description:
        "Use the search bar to find forms by employee name or form title. Filter forms by type and status using the filter button. Active filters appear as chips below the search bar.",
    },
    {
      title: "Form Details",
      icon: "text-box-search",
      description:
        "Each form shows key information including employee name, submission date, and current status. Click on any form to view its complete details and history.",
    },
    {
      title: "Status Tracking",
      icon: "progress-check",
      description:
        "Monitor form status through the approval process. Status badges indicate whether forms are Pending, In Review, Approved, or Rejected.",
    },
    {
      title: "Form History",
      icon: "history",
      description:
        "Track form modifications with detailed information about when changes were made and by whom. Last modified dates and modifier names are displayed when available.",
    },
  ];

  const helpGuideNote = {
    title: "Important Notes",
    content: [
      "Forms are automatically sorted by submission date",
      "You can combine multiple filters for precise form management",
      "Form submissions are organized in pages for easy navigation",
      "Click 'View Details' to see complete form information",
      "Status updates are reflected in real-time across the system",
    ],
  };

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

      // Sort by submission date
      return filtered.sort((a, b) => {
        const dateA = new Date(a.submission_date).getTime();
        const dateB = new Date(b.submission_date).getTime();
        return dateA - dateB;
      });
    } catch (error) {
      console.error("Error filtering forms:", error);
      return forms;
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
        setLoading(true);
      } else {
        setLoading(true);
      }

      // Get company ID if not already set
      const currentCompanyId = companyId || (await fetchCompanyId());
      if (!currentCompanyId) {
        console.error("No company ID found");
        setLoading(false);
        return;
      }

      setCompanyId(currentCompanyId);

      const currentPage = refresh ? 0 : page;
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Fetch accident reports with count
      const {
        data: accidentData,
        error: accidentError,
        count: accidentCount,
      } = (await supabase
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
        `,
          { count: "exact" }
        )
        .eq("company_id", currentCompanyId)
        .neq("status", FormStatus.DRAFT)
        .order("created_at", {
          ascending: true,
        })
        .range(from, to)) as {
        data: AccidentReport[] | null;
        error: any;
        count: number | null;
      };

      // Fetch illness reports with count
      const {
        data: illnessData,
        error: illnessError,
        count: illnessCount,
      } = (await supabase
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
        `,
          { count: "exact" }
        )
        .eq("company_id", currentCompanyId)
        .neq("status", FormStatus.DRAFT)
        .order("submission_date", {
          ascending: true,
        })
        .range(from, to)) as {
        data: IllnessReport[] | null;
        error: any;
        count: number | null;
      };

      // Fetch staff departure reports with count
      const {
        data: departureData,
        error: departureError,
        count: departureCount,
      } = await supabase
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
        `,
          { count: "exact" }
        )
        .eq("company_id", currentCompanyId)
        .neq("status", FormStatus.DRAFT)
        .order("created_at", {
          ascending: true,
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

      // Process accident reports
      const processedAccidentReports: FormSubmission[] =
        accidentData?.map((report) => ({
          id: report.id,
          type: "accident",
          title: "Accident Report",
          employee_name: `${report.company_user.first_name} ${report.company_user.last_name}`,
          employee_id: report.employee_id,
          status: report.status,
          submission_date: report.created_at,
          updated_at: report.updated_at,
          modified_by: report.modified_by,
        })) || [];

      // Process illness reports
      const processedIllnessReports: FormSubmission[] =
        illnessData?.map((report) => ({
          id: report.id,
          type: "illness",
          title: "Illness Report",
          employee_name: `${report.company_user.first_name} ${report.company_user.last_name}`,
          employee_id: report.employee_id,
          status: report.status,
          submission_date: report.submission_date,
          updated_at: report.updated_at,
          modified_by: report.modified_by,
        })) || [];

      // Process departure reports
      const processedDepartureReports: FormSubmission[] =
        departureData?.map((report) => ({
          id: report.id,
          type: "departure",
          title: "Staff Departure Report",
          employee_name: `${report.company_user[0].first_name} ${report.company_user[0].last_name}`,
          employee_id: report.employee_id,
          status: report.status,
          submission_date: report.created_at,
          updated_at: report.updated_at,
          modified_by: report.modified_by,
        })) || [];

      // Combine all reports
      const allForms = [
        ...processedAccidentReports,
        ...processedIllnessReports,
        ...processedDepartureReports,
      ];

      // Sort combined forms by submission date
      const sortedForms = allForms.sort((a, b) => {
        const dateA = new Date(a.submission_date).getTime();
        const dateB = new Date(b.submission_date).getTime();
        return dateA - dateB;
      });

      // Calculate total items
      const totalCount =
        (accidentCount || 0) + (illnessCount || 0) + (departureCount || 0);
      setTotalItems(totalCount);

      // Update forms
      setForms(sortedForms);
      setFilteredForms(sortedForms);
    } catch (error) {
      console.error("Error fetching forms:", error);
      setForms([]);
      setFilteredForms([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Update useEffect to handle pagination
  useEffect(() => {
    fetchForms(true);
  }, [appliedFilters, page]);

  // Update search handling
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(0); // Reset to first page when search changes
  };

  // Add page handling
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  // Update onRefresh
  const onRefresh = () => {
    setRefreshing(true);
    fetchForms(true);
  };

  // Update filter handling
  const applyFilters = () => {
    setFilterModalVisible(false);
    setPage(0); // Reset to first page when filters change
    const newFilters = {
      status: statusFilter,
      formType: typeFilter,
    };
    setAppliedFilters(newFilters);
    fetchForms(true);
  };

  // Update clear filters
  const clearFilters = () => {
    setTypeFilter("all");
    setStatusFilter("all");
    setPage(0); // Reset to first page when clearing filters
    setAppliedFilters({
      status: "all",
      formType: "all",
    });
    fetchForms(true);
  };

  // Check if we have any active filters
  const hasActiveFilters = () => {
    return appliedFilters.status !== "all" || appliedFilters.formType !== "all";
  };

  // Add handlers for individual filter clearing
  const handleStatusClear = useCallback(() => {
    setStatusFilter("all");
    setAppliedFilters((prev) => ({
      ...prev,
      status: "all",
    }));
    setPage(0);
    fetchForms(true);
  }, []);

  const handleTypeClear = useCallback(() => {
    setTypeFilter("all");
    setAppliedFilters((prev) => ({
      ...prev,
      formType: "all",
    }));
    setPage(0);
    fetchForms(true);
  }, []);

  // Add effect to sync filter states
  useEffect(() => {
    const needsSync =
      appliedFilters.status !== statusFilter ||
      appliedFilters.formType !== typeFilter;

    if (needsSync) {
      setAppliedFilters({
        status: statusFilter,
        formType: typeFilter,
      });
    }
  }, [statusFilter, typeFilter]);

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

  // Create memoized renderFormItem function to prevent unnecessary re-renders
  const renderFormItem = useCallback(
    ({ item }: { item: FormSubmission }) => (
      <Surface style={[styles.cardSurface, { backgroundColor: "#FFFFFF" }]}>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("FormDetails", {
              formId: item.id,
              formType: item.type,
            })
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
              onClose={handleStatusClear}
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
              onClose={handleTypeClear}
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
        </ScrollView>
      </View>
    );
  };

  // Render the filter modal
  const renderFilterModal = () => {
    const typeOptions = [
      { label: "All Types", value: "all" },
      { label: "Accident Report", value: "accident" },
      { label: "Illness Report", value: "illness" },
      { label: "Staff Departure Report", value: "departure" },
    ];

    const statusOptions = [
      { label: "All Statuses", value: "all" },
      ...Object.values(FormStatus)
        .filter((status) => status !== FormStatus.DRAFT) // Remove DRAFT status
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

    return (
      <FilterModal
        visible={filterModalVisible}
        onDismiss={() => setFilterModalVisible(false)}
        title="Filter Options"
        onClear={clearFilters}
        onApply={applyFilters}
        isLargeScreen={isLargeScreen}
        isMediumScreen={isMediumScreen}
      >
        <FilterSection title="Form Type">
          <PillFilterGroup
            options={typeOptions}
            value={typeFilter}
            onValueChange={(value) =>
              setTypeFilter(
                value as "all" | "accident" | "illness" | "departure"
              )
            }
          />
        </FilterSection>

        <FilterDivider />

        <FilterSection title="Status">
          <PillFilterGroup
            options={statusOptions}
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as FormStatus | "all")
            }
          />
        </FilterSection>
      </FilterModal>
    );
  };

  // Update the content rendering to include pagination
  const renderContent = () => {
    if (filteredForms.length === 0) {
      return (
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
      );
    }

    const onRefresh = () => {
      setRefreshing(true);
      fetchForms(true);
      setRefreshing(false);
    };

    return (
      <>
        {isMediumScreen || isLargeScreen ? (
          <View style={styles.tableContainer}>
            <TableHeader />
            <FlatList
              data={filteredForms}
              renderItem={({ item }) => (
                <TableRow item={item} navigation={navigation} />
              )}
              keyExtractor={(item) => `${item.type}-${item.id}`}
              contentContainerStyle={styles.tableContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
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
          />
        )}
        {totalPages > 1 && (
          <View style={styles.paginationWrapper}>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </View>
        )}
      </>
    );
  };

  if (loading && !refreshing) {
    const useTableLayout = isLargeScreen || isMediumScreen;

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: "#F8F9FA" }]}>
        <AppHeader
          title="Form Submissions"
          showBackButton={Platform.OS !== "web"}
          showHelpButton={true}
          onHelpPress={() => setHelpModalVisible(true)}
          showLogo={false}
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
        title="Form Submissions"
        showBackButton={Platform.OS !== "web"}
        showHelpButton={true}
        onHelpPress={() => setHelpModalVisible(true)}
        showLogo={false}
      />

      <HelpGuideModal
        visible={helpModalVisible}
        onDismiss={() => setHelpModalVisible(false)}
        title="Form Submissions Guide"
        description="Learn how to effectively manage and track form submissions using the available tools and features."
        steps={helpGuideSteps}
        note={helpGuideNote}
        buttonLabel="Got it"
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
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
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
    fontFamily: "Poppins-Regular",
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
} as const);

export default FormSubmissionsScreen;
