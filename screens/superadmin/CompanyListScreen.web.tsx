import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { logDebug } from "../../utils/logger";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  AppState,
  AppStateStatus,
  ScrollView,
  Platform,
  Dimensions,
  Pressable,
  PressableStateCallbackType,
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
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { formatDate } from "../../utils/dateUtils";
import FilterModal from "../../components/FilterModal";
import {
  FilterSection,
  RadioFilterGroup,
  FilterDivider,
  PillFilterGroup,
} from "../../components/FilterSections";
import Pagination from "../../components/Pagination";
import { FlashList } from "@shopify/flash-list";

// Update the Company interface to extend the imported one
interface ExtendedCompany extends Company {
  company_sequence_id?: number;
}

// Add TooltipText component after imports and before other components
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

  const updateTooltipPosition = () => {
    if (Platform.OS === "web" && containerRef.current) {
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
    if (isHovered) {
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
  }, [isHovered]);

  if (Platform.OS !== "web") {
    return (
      <Text style={styles.tableCellText} numberOfLines={numberOfLines}>
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
      {isHovered && (
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

// Component for skeleton loading UI
const CompanyItemSkeleton = () => {
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
          <View style={{ flex: 1 }}>
            <Shimmer width={180} height={16} style={{ marginBottom: 8 }} />
          </View>
          <Shimmer width={80} height={24} style={{ borderRadius: 12 }} />
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailItem}>
            <Shimmer width={100} height={14} style={{ marginRight: 8 }} />
            <Shimmer width={150} height={14} />
          </View>
          <View style={styles.detailItem}>
            <Shimmer width={100} height={14} style={{ marginRight: 8 }} />
            <Shimmer width={120} height={14} />
          </View>
          <View style={styles.detailItem}>
            <Shimmer width={100} height={14} style={{ marginRight: 8 }} />
            <Shimmer width={140} height={14} />
          </View>
          <View style={styles.detailItem}>
            <Shimmer width={100} height={14} style={{ marginRight: 8 }} />
            <Shimmer width={160} height={14} />
          </View>
        </View>
      </Card.Content>
    </Card>
  );
};

// Update TableSkeleton component
const TableSkeleton = () => (
  <View style={styles.tableContainer}>
    <View style={styles.tableHeaderRow}>
      <View style={[styles.tableHeaderCell, { flex: 0.5 }]}>
        <Shimmer width={60} height={20} />
      </View>
      <View style={[styles.tableHeaderCell, { flex: 0.8 }]}>
        <Shimmer width={100} height={20} />
      </View>
      <View style={styles.tableHeaderCell}>
        <Shimmer width={120} height={20} />
      </View>
      <View style={styles.tableHeaderCell}>
        <Shimmer width={80} height={20} />
      </View>
      <View style={styles.tableHeaderCell}>
        <Shimmer width={120} height={20} />
      </View>
      <View style={styles.tableHeaderCell}>
        <Shimmer width={80} height={20} />
      </View>
      <View style={styles.tableHeaderCell}>
        <Shimmer width={100} height={20} />
      </View>
      <View style={styles.tableHeaderCell}>
        <Shimmer width={80} height={20} />
      </View>
    </View>
    {Array(5)
      .fill(0)
      .map((_, index) => (
        <View key={`skeleton-${index}`} style={styles.tableRow}>
          <View style={[styles.tableCell, { flex: 0.5 }]}>
            <Shimmer width={60} height={16} />
          </View>
          <View style={styles.tableCell}>
            <Shimmer width={160} height={16} />
          </View>
          <View style={styles.tableCell}>
            <Shimmer width={120} height={16} />
          </View>
          <View style={styles.tableCell}>
            <Shimmer width={140} height={16} />
          </View>
          <View style={styles.tableCell}>
            <Shimmer width={100} height={16} />
          </View>
          <View style={styles.tableCell}>
            <Shimmer width={80} height={24} style={{ borderRadius: 12 }} />
          </View>
          <View style={styles.actionCell}>
            <Shimmer
              width={40}
              height={40}
              style={{ borderRadius: 20, marginRight: 8 }}
            />
            <Shimmer width={40} height={40} style={{ borderRadius: 20 }} />
          </View>
        </View>
      ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  mainContent: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: Platform.OS === "web" ? 24 : 16,
    paddingVertical: 16,
    maxHeight: "90%",
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
  listContent: {
    padding: Platform.OS === "web" ? 24 : 16,
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
    borderRadius: 17,
    height: 56,
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: "center",
  },
  // Skeleton styles
  skeleton: {
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    overflow: "hidden",
  },
  skeletonTitle: {
    height: 22,
    width: "70%",
    marginBottom: 8,
  },
  skeletonBadge: {
    height: 24,
    width: 80,
    borderRadius: 12,
  },
  skeletonLabel: {
    height: 16,
    width: 90,
    marginRight: 8,
  },
  skeletonValue: {
    height: 16,
    flex: 1,
  },
  resultsCount: {
    textAlign: "center",
    marginTop: 8,
    marginBottom: 8,
    color: "#616161",
    fontSize: 14,
    fontFamily: "Poppins-Regular",
  },
  // Filter styles
  filterButtonContainer: {
    position: "relative",
    marginLeft: 15,
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
  // Add new table styles
  tableContainer: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    overflow: "hidden",
  },
  tableHeaderRow: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingVertical: 16,
    paddingHorizontal: 26,
    alignItems: "center",
  },
  tableHeaderCell: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: "flex-start",
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
    paddingHorizontal: 26,
    alignItems: "center",
  },
  tableCell: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: "flex-start",
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
    paddingHorizontal: 16,
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
    marginTop: 5,
    overflow: "hidden",
    width: "auto",
    alignSelf: "center",
  },
  companyIdLink: {
    color: "#1a73e8",
    fontSize: 14,
    fontFamily: "Poppins-Medium",
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
  },
  paginationText: {
    color: "#333",
    fontSize: 14,
  },
  paginationButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: "#F5F5F5",
    marginHorizontal: 4,
  },
  paginationButtonText: {
    color: "#333",
    fontSize: 14,
  },
  paginationButtonDisabled: {
    opacity: 0.5,
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  filterButtonText: {
    color: "#333",
    fontSize: 14,
  },
} as const);

const CompanyListScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { t, i18n } = useTranslation();

  // Window dimensions state
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

  // Main state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [companies, setCompanies] = useState<ExtendedCompany[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCompanies, setFilteredCompanies] = useState<ExtendedCompany[]>(
    []
  );
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

  // Add table header component
  const TableHeader = () => (
    <View style={styles.tableHeaderRow}>
      <View style={[styles.tableHeaderCell, { flex: 0.6 }]}>
        <Text variant="medium" style={styles.tableHeaderText}>
          ID
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          {t("superAdmin.companies.company")}
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          {t("superAdmin.companies.registration")}
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          {t("superAdmin.companies.industry")}
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          {t("superAdmin.companies.onboardingDate")}
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          {t("superAdmin.companies.status")}
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          {t("superAdmin.companies.actions")}
        </Text>
      </View>
    </View>
  );

  // Update the TableRow component to use TooltipText
  const TableRow = ({ item }: { item: ExtendedCompany }) => {
    return (
      <Pressable
        onPress={() => {
          navigation.navigate("CompanyDetails", { companyId: item.id });
        }}
        style={({ pressed }: PressableStateCallbackType) => [
          styles.tableRow,
          pressed && { backgroundColor: "#f8fafc" },
        ]}
      >
        <View style={[styles.tableCell, { flex: 0.6 }]}>
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              navigation.navigate("CompanyDetails", { companyId: item.id });
            }}
          >
            <Text style={styles.companyIdLink}>
              {item.company_sequence_id ? `${item.company_sequence_id}` : "-"}
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.tableCell}>
          <TooltipText text={item.company_name} />
        </View>
        <View style={styles.tableCell}>
          <TooltipText text={item.registration_number || "-"} />
        </View>
        <View style={styles.tableCell}>
          <TooltipText text={item.industry_type || "-"} />
        </View>
        <View style={styles.tableCell}>
          <TooltipText
            text={
              item.created_at
                ? formatDate(item.created_at, {
                    type: "long",
                    locale: i18n.language,
                    t,
                  })
                : "-"
            }
          />
        </View>
        <View style={styles.tableCell}>
          <StatusBadge
            status={item.active ? UserStatus.ACTIVE : UserStatus.INACTIVE}
          />
        </View>
        <View style={styles.actionCell}>
          <IconButton
            icon="pencil"
            size={20}
            onPress={(e) => {
              e.stopPropagation();
              navigation.navigate("EditCompany", { companyId: item.id });
            }}
            style={styles.actionIcon}
          />
          <IconButton
            icon="eye"
            size={20}
            onPress={(e) => {
              e.stopPropagation();
              navigation.navigate("CompanyDetails", { companyId: item.id });
            }}
            style={styles.actionIcon}
          />
        </View>
      </Pressable>
    );
  };

  const renderCompanyItem = useCallback(
    ({ item }: { item: ExtendedCompany }) => {
      return (
        <TouchableOpacity
          onPress={() => {
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
                      ? formatDate(item.created_at, {
                          type: "long",
                          locale: i18n.language,
                          t,
                        })
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
    },
    [t, i18n.language, navigation]
  );

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

  const fetchCompanies = async (refresh = false) => {
    try {
      logDebug("Fetching companies...", {
        refresh,
        page,
        searchQuery,
        appliedFilters,
      });
      setError(null);

      if (refresh) {
        setPage(0);
        setLoading(true);
      }

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      logDebug("Query params:", { from, to });

      const fetchData = async () => {
        let query = supabase
          .from("company")
          .select(
            "id, company_name, registration_number, industry_type, contact_number, contact_email, active, created_at, company_sequence_id",
            { count: "exact" }
          );

        // Apply status filter
        if (appliedFilters.status === "active") {
          query = query.eq("active", true);
        } else if (appliedFilters.status === "inactive") {
          query = query.eq("active", false);
        }

        // Apply search
        if (searchQuery.trim() !== "") {
          if (searchQuery.length > 2) {
            query = query.or(
              `company_name.ilike.%${searchQuery.toLowerCase()}%,registration_number.ilike.%${searchQuery.toLowerCase()}%,industry_type.ilike.%${searchQuery.toLowerCase()}%,contact_email.ilike.%${searchQuery.toLowerCase()}%,contact_number.ilike.%${searchQuery.toLowerCase()}%,company_sequence_id.eq.${parseInt(searchQuery) || 0}`
            );
          } else {
            query = query.or(
              `company_name.ilike.${searchQuery.toLowerCase()}%,registration_number.ilike.${searchQuery.toLowerCase()}%,industry_type.ilike.${searchQuery.toLowerCase()}%,contact_email.ilike.${searchQuery.toLowerCase()}%,contact_number.ilike.${searchQuery.toLowerCase()}%,company_sequence_id.eq.${parseInt(searchQuery) || 0}`
            );
          }
        }

        // Apply sorting and pagination
        query = query
          .order("created_at", {
            ascending: appliedFilters.sortOrder === "asc",
          })
          .range(from, to);

        return await query;
      };

      const result = await fetchData();
      logDebug("Query result:", {
        data: result.data,
        count: result.count,
        error: result.error,
      });

      const { data, error, count } = result;

      if (error) throw error;

      if (count !== null) {
        setTotalCount(count);
        setHasMoreData(from + (data?.length || 0) < count);
      }

      // Cast the data to ExtendedCompany[] type
      const typedData = (data || []) as ExtendedCompany[];
      logDebug("Setting companies:", { length: typedData.length });
      setCompanies(typedData);
      setFilteredCompanies(typedData);

      // Update network status if successful
      if (networkStatus === false) {
        setNetworkStatus(true);
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
    }
  };

  // Calculate total pages
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Update renderContent to include pagination
  const renderContent = () => {
    logDebug("Rendering content:", {
      companiesLength: companies.length,
      filteredCompaniesLength: filteredCompanies.length,
      loading,
      refreshing,
      error,
    });

    // Show skeleton loaders when initially loading
    if (loading && filteredCompanies.length === 0) {
      logDebug("Showing skeleton loader");
      if (isMediumScreen || isLargeScreen) {
        return <TableSkeleton />;
      }
      return (
        <FlashList
          estimatedItemSize={74}
          data={Array(3).fill(0)}
          renderItem={() => <CompanyItemSkeleton />}
          keyExtractor={(_, index) => `skeleton-${index}`}
          contentContainerStyle={styles.listContent}
        />
      );
    }

    // Show empty state when no results and not loading
    if (filteredCompanies.length === 0 && !loading && !refreshing) {
      logDebug("Showing empty state");
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
              navigation.navigate("CreateCompany");
            }
          }}
        />
      );
    }

    // Show the actual data
    logDebug("Showing data table/list");
    if (isMediumScreen || isLargeScreen) {
      return (
        <>
          <View style={styles.tableContainer}>
            <TableHeader />
            <FlashList
              estimatedItemSize={74}
              data={filteredCompanies}
              renderItem={({ item }) => <TableRow item={item} />}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.tableContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            />
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 12,
              minHeight: 33,
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
                {t("superAdmin.companies.totalCompanies")}:
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: theme.colors.primary,
                  fontFamily: "Poppins-Medium",
                  marginLeft: 4,
                }}
              >
                {totalCount}
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
      );
    }

    return (
      <>
        <FlashList
          estimatedItemSize={74}
          data={filteredCompanies}
          renderItem={renderCompanyItem}
          keyExtractor={(item) => item.id}
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
              {t("superAdmin.companies.totalCompanies")}:
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: theme.colors.primary,
                fontFamily: "Poppins-Medium",
                marginLeft: 4,
              }}
            >
              {totalCount}
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
              "id, company_name, registration_number, industry_type, contact_number, contact_email, active, created_at, company_sequence_id",
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
                `company_name.ilike.%${searchQuery.toLowerCase()}%,registration_number.ilike.%${searchQuery.toLowerCase()}%,industry_type.ilike.%${searchQuery.toLowerCase()}%,contact_email.ilike.%${searchQuery.toLowerCase()}%,contact_number.ilike.%${searchQuery.toLowerCase()}%,company_sequence_id.eq.${parseInt(searchQuery) || 0}`
              );
            } else {
              query = query.or(
                `company_name.ilike.${searchQuery.toLowerCase()}%,registration_number.ilike.${searchQuery.toLowerCase()}%,industry_type.ilike.${searchQuery.toLowerCase()}%,contact_email.ilike.${searchQuery.toLowerCase()}%,contact_number.ilike.${searchQuery.toLowerCase()}%,company_sequence_id.eq.${parseInt(searchQuery) || 0}`
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

        const typedData = (data as ExtendedCompany[]) || [];
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
    setFilterModalVisible(false);
    setActiveFilter(null);

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
      sortOrder: "desc", // Keep desc as default
    });

    // Call the regular fetch after resetting everything
    fetchCompanies(true);
  };

  // Check if we have any active filters
  const hasActiveFilters = () => {
    return appliedFilters.status !== null;
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
                  backgroundColor: "rgba(26, 115, 232, 0.1)", // Light blue with 10% opacity
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
        </ScrollView>
      </View>
    );
  };

  // Render the filter modal
  const renderFilterModal = () => {
    const statusOptions = [
      { label: "All Status", value: "" },
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
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
        <FilterSection title="Status">
          <PillFilterGroup
            options={statusOptions}
            value={activeFilter || ""}
            onValueChange={(value: string) => setActiveFilter(value)}
          />
        </FilterSection>
      </FilterModal>
    );
  };

  // Update the memoizedFilteredCompanies to include company_sequence_id
  const memoizedFilteredCompanies = useMemo(() => {
    try {
      let filtered = companies;

      // Apply search filter
      if (searchQuery.trim() !== "") {
        filtered = filtered.filter(
          (company) =>
            company.company_name
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            company.registration_number
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            (company.company_sequence_id &&
              company.company_sequence_id.toString().includes(searchQuery))
        );
      }

      return filtered;
    } catch (error) {
      console.error("Error filtering companies:", error);
      return companies;
    }
  }, [companies, searchQuery]);

  // Handle page change
  const handlePageChange = useCallback(
    async (newPage: number) => {
      try {
        if (newPage >= 0 && newPage < Math.ceil(totalCount / PAGE_SIZE)) {
          setPage(newPage);
          setRefreshing(true);

          const from = newPage * PAGE_SIZE;
          const to = from + PAGE_SIZE - 1;

          let query = supabase
            .from("company")
            .select(
              "id, company_name, registration_number, industry_type, contact_number, contact_email, active, created_at, company_sequence_id, address, created_by, updated_at, stakeholders, vat_type",
              { count: "exact" }
            );

          // Apply status filter
          if (appliedFilters.status === "active") {
            query = query.eq("active", true);
          } else if (appliedFilters.status === "inactive") {
            query = query.eq("active", false);
          }

          // Apply search
          if (searchQuery.trim() !== "") {
            if (searchQuery.length > 2) {
              query = query.or(
                `company_name.ilike.%${searchQuery.toLowerCase()}%,registration_number.ilike.%${searchQuery.toLowerCase()}%,industry_type.ilike.%${searchQuery.toLowerCase()}%,contact_email.ilike.%${searchQuery.toLowerCase()}%,contact_number.ilike.%${searchQuery.toLowerCase()}%,company_sequence_id.eq.${parseInt(searchQuery) || 0}`
              );
            } else {
              query = query.or(
                `company_name.ilike.${searchQuery.toLowerCase()}%,registration_number.ilike.${searchQuery.toLowerCase()}%,industry_type.ilike.${searchQuery.toLowerCase()}%,contact_email.ilike.${searchQuery.toLowerCase()}%,contact_number.ilike.${searchQuery.toLowerCase()}%,company_sequence_id.eq.${parseInt(searchQuery) || 0}`
              );
            }
          }

          // Apply sorting and pagination
          query = query
            .order("created_at", {
              ascending: appliedFilters.sortOrder === "asc",
            })
            .range(from, to);

          const { data, error, count } = await query;

          if (error) throw error;

          if (count !== null) {
            setTotalCount(count);
            setHasMoreData(from + (data?.length || 0) < count);
          }

          // Cast the data to ExtendedCompany[] type
          const typedData = (data || []) as ExtendedCompany[];
          setCompanies(typedData);
          setFilteredCompanies(typedData);
        }
      } catch (error) {
        console.error("Error fetching companies:", error);
        setError(
          error instanceof Error ? error.message : "Failed to load companies"
        );
      } finally {
        setRefreshing(false);
        setLoading(false);
      }
    },
    [
      searchQuery,
      appliedFilters.status,
      appliedFilters.sortOrder,
      PAGE_SIZE,
      totalCount,
    ]
  );

  // Remove the separate useEffect for page changes since we're handling it in handlePageChange
  useEffect(() => {
    // Initial load only
    fetchCompanies(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update the search effect to use handlePageChange
  useEffect(() => {
    if (searchQuery === "" && !refreshing) {
      return;
    }

    const debounceTimeout = setTimeout(
      () => {
        if (networkStatus === false && searchQuery.trim() !== "") {
          setError(t("common.searchUnavailable"));
          setRefreshing(false);
          return;
        }

        fetchCompanies(true);
      },
      searchQuery.length < 3 ? 300 : 500
    );

    return () => clearTimeout(debounceTimeout);
  }, [searchQuery, networkStatus]);

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor:
            (theme.colors as any).backgroundSecondary || "#F8F9FA",
        },
      ]}
    >
      <AppHeader
        showLogo={false}
        showBackButton={false}
        title={t("superAdmin.companies.manage")}
        subtitle={t("superAdmin.companies.subtitle")}
        showHelpButton={true}
        absolute={false}
      />
      <View style={[styles.mainContent, { flex: 1 }]}>
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
              placeholder="Search by ID, company name, or registration number..."
              onChangeText={
                networkStatus === false ? undefined : setSearchQuery
              }
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
                size={30}
                style={[
                  styles.filterButton,
                  hasActiveFilters() && styles.activeFilterButton,
                ]}
                iconColor={
                  hasActiveFilters() ? theme.colors.primary : undefined
                }
                onPress={() => setFilterModalVisible(true)}
              />
              {hasActiveFilters() && <View style={styles.filterBadge} />}
            </View>
          </View>

          <FAB
            icon="plus"
            label="Add Company"
            style={[
              styles.fab,
              {
                backgroundColor: theme.colors.primary,
                position: "relative",
                margin: 0,
                marginLeft: 16,
              },
            ]}
            onPress={() => {
              navigation.navigate("CreateCompany");
            }}
            color={theme.colors.surface}
            mode="flat"
            theme={{ colors: { accent: theme.colors.surface } }}
            accessibilityLabel={t("superAdmin.companies.addCompany")}
            accessibilityHint={t("superAdmin.companies.addCompanyHint")}
            accessibilityRole="button"
            accessibilityState={{ disabled: networkStatus === false }}
            disabled={networkStatus === false}
          />
        </View>

        {searchQuery && searchQuery.length > 0 && searchQuery.length < 3 && (
          <View
            style={[
              styles.searchTips,
              {
                maxWidth: isLargeScreen ? 1200 : isMediumScreen ? 900 : "100%",
                alignSelf: "center",
                width: "100%",
                paddingHorizontal: isLargeScreen ? 24 : 16,
              },
            ]}
          >
            <Text style={styles.searchTipsText}>
              {t("superAdmin.companies.typeMoreChars")}
            </Text>
          </View>
        )}

        {renderActiveFilterIndicator()}
        {renderFilterModal()}

        <View
          style={[
            styles.contentContainer,
            {
              maxWidth: isLargeScreen ? 1500 : isMediumScreen ? 900 : "100%",
              alignSelf: "center",
              width: "100%",
            },
          ]}
        >
          {renderContent()}
        </View>
      </View>
    </SafeAreaView>
  );
};

export default CompanyListScreen;
