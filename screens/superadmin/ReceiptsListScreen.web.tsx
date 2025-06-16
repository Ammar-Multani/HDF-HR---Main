import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
  ScrollView,
  Dimensions,
  Pressable,
} from "react-native";
import {
  Text,
  Card,
  Button,
  useTheme,
  Searchbar,
  Menu,
  Divider,
  FAB,
  Chip,
  IconButton,
  Surface,
  Portal,
  Modal,
  RadioButton,
  MD3Theme,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import EmptyState from "../../components/EmptyState";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import Pagination from "../../components/Pagination";
import CompanySelector from "../../components/CompanySelector";

// Define the navigation param list type
type RootStackParamList = {
  ReceiptDetails: { receiptId: string };
  CreateReceipt: undefined;
  EditReceipt: { receiptId: string };
};

type ReceiptsListNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Receipt {
  id: string;
  company_id: string;
  receipt_number: string;
  date: string;
  transaction_date: string;
  merchant_name: string;
  total_amount: number;
  tax_amount: number;
  payment_method: string;
  created_at: string;
  receipt_sequence_id?: number;
  company: any;
}

// Add TooltipText component after imports and before Receipt interface
const TooltipText = ({
  text,
  numberOfLines = 1,
  theme,
}: {
  text: string;
  numberOfLines?: number;
  theme: MD3Theme;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<View>(null);
  const styles = createStyles(theme);

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

const createStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
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
      borderRadius: 12,
      backgroundColor: "#fff",
    },
    activeFilterButton: {
      backgroundColor: "#E8F0FE",
      borderWidth: 1,
      borderColor: theme.colors.primary,
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
      paddingBottom: 80,
    },
    cardSurface: {
      marginBottom: 16,
      borderRadius: 12,
      backgroundColor: "#FFFFFF",
      elevation: 2,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.03)",
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
    receiptNumber: {
      fontSize: 16,
      fontWeight: "bold",
      color: "#333",
      marginBottom: 4,
    },
    merchantName: {
      fontSize: 16,
      color: "#666",
    },
    dateChip: {
      height: 32,
      backgroundColor: "#E8F0FE",
      borderColor: theme.colors.primary,
    },
    cardDetails: {
      backgroundColor: "#f9f9f9",
      borderRadius: 8,
      padding: 12,
      marginBottom: 12,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
    },
    detailItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: 4,
    },
    detailLabel: {
      fontSize: 13,
      color: "#555",
      fontWeight: "600",
    },
    detailValue: {
      fontSize: 14,
      color: "#333",
    },
    cardFooter: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginTop: 4,
    },
    companyChip: {
      backgroundColor: "#f5f5f5",
    },
    viewDetailsContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    viewDetailsText: {
      fontSize: 12,
      fontWeight: "bold",
      color: theme.colors.primary,
    },
    chevronIcon: {
      margin: 0,
      padding: 0,
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
      paddingVertical: 13,
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
    receiptIdLink: {
      color: "#1a73e8",
      cursor: "pointer",
      fontSize: 14,
      fontFamily: "Poppins-Regular",
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
      marginTop: 5,
      overflow: "hidden",
      width: "auto",
      alignSelf: "center",
    },
  });

const ReceiptsListScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<ReceiptsListNavigationProp>();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState("none");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [appliedFilters, setAppliedFilters] = useState({
    companyId: null as string | null,
    sortBy: "none",
    sortOrder: "desc" as "asc" | "desc",
  });

  // Add pagination state
  const [page, setPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const PAGE_SIZE = 10;

  const [windowDimensions, setWindowDimensions] = useState({
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  });

  // Add state for filtered receipts
  const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>([]);

  // Add error state
  const [error, setError] = useState<string | null>(null);

  const styles = createStyles(theme);

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("company")
        .select("id, company_name")
        .eq("active", true);

      if (error) {
        console.error("Error fetching companies:", error);
        return;
      }

      setCompanies(data || []);
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const fetchReceipts = async (refresh = false) => {
    try {
      setError(null);
      if (refresh) {
        setPage(0);
        setLoading(true);
      }

      const currentPage = refresh ? 0 : page;
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase.from("receipts").select(
        `
          id, 
          company_id,
          receipt_number,
          date,
          transaction_date,
          merchant_name,
          total_amount,
          tax_amount,
          payment_method,
          created_at,
          receipt_sequence_id,
          company:company_id (
            id, 
            company_name
          )
        `,
        { count: "exact" }
      );

      if (appliedFilters.companyId) {
        query = query.eq("company_id", appliedFilters.companyId);
      }

      if (searchQuery.trim() !== "") {
        query = query.or(
          `merchant_name.ilike.%${searchQuery}%,receipt_number.ilike.%${searchQuery}%,receipt_sequence_id.eq.${parseInt(searchQuery) || 0}`
        );
      }

      // Apply sorting based on sortBy
      if (appliedFilters.sortBy === "none") {
        // Default sort by date desc (newest first)
        query = query.order("date", { ascending: false });
      } else {
        query = query.order(appliedFilters.sortBy, {
          ascending: appliedFilters.sortOrder === "asc",
        });
      }

      query = query.range(from, to);

      const { data, error: supabaseError, count } = await query;

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      if (count !== null) {
        setTotalItems(count);
      }

      setReceipts(data || []);
      setFilteredReceipts(data || []);
    } catch (error) {
      console.error("Error fetching receipts:", error);
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred while fetching receipts"
      );
      setReceipts([]);
      setFilteredReceipts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []); // Only fetch companies once on mount

  useEffect(() => {
    fetchReceipts(true);
  }, [appliedFilters, searchQuery]); // Fetch when filters or search changes

  // Update page change effect
  useEffect(() => {
    if (!loading) {
      // Only fetch if not already loading
      fetchReceipts(false);
    }
  }, [page]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchReceipts(true);
  }, []);

  const handleCreateReceipt = () => {
    navigation.navigate("CreateReceipt");
  };

  const handleViewReceipt = (receipt: Receipt) => {
    navigation.navigate("ReceiptDetails", { receiptId: receipt.id });
  };

  // Update search handling
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setPage(0); // Reset to first page when search changes
  };

  // Update page handling
  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage >= 0 && newPage < Math.ceil(totalItems / PAGE_SIZE)) {
        setPage(newPage);
      }
    },
    [totalItems, PAGE_SIZE]
  );

  // Filter modal state and handlers
  const applyFilters = () => {
    setFilterModalVisible(false);
    setPage(0); // Reset to first page when filters change
    const newFilters = {
      companyId: selectedCompany,
      sortBy: sortBy,
      sortOrder: sortOrder,
    };
    setAppliedFilters(newFilters);
  };

  const clearFilters = () => {
    setSelectedCompany(null);
    setSortBy("none");
    setSortOrder("desc");
    setPage(0);

    setAppliedFilters({
      companyId: null,
      sortBy: "none",
      sortOrder: "desc",
    });
  };

  // Calculate responsive breakpoints
  const isLargeScreen = windowDimensions.width >= 1440;
  const isMediumScreen =
    windowDimensions.width >= 768 && windowDimensions.width < 1440;

  // Update memoizedFilteredReceipts
  const memoizedFilteredReceipts = useMemo(() => {
    try {
      let filtered = receipts;

      // Apply search filter
      if (searchQuery.trim() !== "") {
        filtered = filtered.filter(
          (receipt) =>
            receipt.merchant_name
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            receipt.receipt_number
              .toLowerCase()
              .includes(searchQuery.toLowerCase()) ||
            (receipt.receipt_sequence_id &&
              receipt.receipt_sequence_id.toString().includes(searchQuery))
        );
      }

      return filtered;
    } catch (error) {
      console.error("Error filtering receipts:", error);
      return receipts;
    }
  }, [receipts, searchQuery]);

  // Update filteredReceipts when memoizedFilteredReceipts changes
  useEffect(() => {
    setFilteredReceipts(memoizedFilteredReceipts);
  }, [memoizedFilteredReceipts]);

  // Update renderContent to use filteredReceipts instead of receipts
  const renderContent = () => {
    if (error) {
      return (
        <EmptyState
          icon="alert-circle"
          title="Error Loading Receipts"
          message={error}
          buttonTitle="Try Again"
          onButtonPress={() => {
            setError(null);
            fetchReceipts(true);
          }}
        />
      );
    }

    if (filteredReceipts.length === 0) {
      return (
        <EmptyState
          icon="receipt"
          title={t("receipts.noReceiptsFound")}
          message={
            searchQuery || hasActiveFilters()
              ? t("receipts.noReceiptsMatch")
              : t("receipts.noReceiptsCreated")
          }
          buttonTitle={
            searchQuery || hasActiveFilters()
              ? t("common.clearFilters")
              : t("receipts.createReceipt")
          }
          onButtonPress={() => {
            if (searchQuery || hasActiveFilters()) {
              setSearchQuery("");
              clearFilters();
            } else {
              handleCreateReceipt();
            }
          }}
        />
      );
    }

    const totalPages = Math.ceil(totalItems / PAGE_SIZE);

    if (isMediumScreen || isLargeScreen) {
      return (
        <>
          <View style={styles.tableContainer}>
            <TableHeader />
            <FlatList
              data={filteredReceipts}
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
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginLeft: 12,
                marginTop: 12,
              }}
            >
              <Text
                style={{
                  fontSize: 14,
                  color: "#666",
                  fontFamily: "Poppins-Regular",
                }}
              >
                {t("receipts.totalReceipts")}:
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
      );
    }

    return (
      <>
        <View style={{ flex: 1 }}>
          <FlatList
            data={filteredReceipts}
            renderItem={renderReceiptItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
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
      </>
    );
  };

  // Check if we have any active filters
  const hasActiveFilters = () => {
    return (
      appliedFilters.companyId !== null ||
      appliedFilters.sortBy !== "none" ||
      appliedFilters.sortOrder !== "desc"
    );
  };

  // Render filter modal
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
          ? 29
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
                Filter Options
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
                <Text style={styles.sectionTitle}>Company</Text>
              </View>
              <CompanySelector
                onSelect={(company) => {
                  if (company) {
                    setSelectedCompany(company.id);
                  } else {
                    setSelectedCompany(null);
                  }
                }}
                selectedCompany={
                  companies.find((c) => c.id === selectedCompany) || null
                }
                label="Filter by Company"
              />
            </View>

            <Divider style={styles.modalDivider} />

            <View style={styles.modalSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Sort By</Text>
              </View>
              <RadioButton.Group
                onValueChange={(value) => {
                  setSortBy(value);
                  if (value === "none") {
                    setSortOrder("desc");
                  }
                }}
                value={sortBy}
              >
                <View style={styles.radioItem}>
                  <RadioButton.Android
                    value="none"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.radioLabel}>None</Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton.Android
                    value="total_amount"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.radioLabel}>Amount</Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton.Android
                    value="merchant_name"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.radioLabel}>Merchant</Text>
                </View>
              </RadioButton.Group>
            </View>

            {sortBy !== "none" && (
              <>
                <Divider style={styles.modalDivider} />

                <View style={styles.modalSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Sort Order</Text>
                  </View>
                  <RadioButton.Group
                    onValueChange={(value) =>
                      setSortOrder(value as "asc" | "desc")
                    }
                    value={sortOrder}
                  >
                    <View style={styles.radioItem}>
                      <RadioButton.Android
                        value="desc"
                        color={theme.colors.primary}
                      />
                      <Text style={styles.radioLabel}>
                        {sortBy === "total_amount" ? "Highest First" : "A to Z"}
                      </Text>
                    </View>
                    <View style={styles.radioItem}>
                      <RadioButton.Android
                        value="asc"
                        color={theme.colors.primary}
                      />
                      <Text style={styles.radioLabel}>
                        {sortBy === "total_amount" ? "Lowest First" : "Z to A"}
                      </Text>
                    </View>
                  </RadioButton.Group>
                </View>
              </>
            )}
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
                Clear Filters
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
                Apply
              </Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </Portal>
    );
  };

  // Render active filter chips
  const renderActiveFilterChips = () => {
    if (!hasActiveFilters()) return null;

    return (
      <View style={styles.activeFiltersContainer}>
        <Text style={styles.activeFiltersText}>Active Filters:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScrollView}
        >
          {appliedFilters.companyId && (
            <Chip
              mode="outlined"
              onClose={() => {
                setAppliedFilters({
                  ...appliedFilters,
                  companyId: null,
                });
                setSelectedCompany(null);
              }}
              style={[
                styles.activeFilterChip,
                {
                  backgroundColor: "#1a73e815",
                  borderColor: theme.colors.primary,
                },
              ]}
              textStyle={{ color: theme.colors.primary }}
            >
              Company:{" "}
              {companies.find((c) => c.id === appliedFilters.companyId)
                ?.company_name || "Unknown"}
            </Chip>
          )}

          {appliedFilters.sortBy !== "none" && (
            <Chip
              mode="outlined"
              onClose={() => {
                setAppliedFilters({
                  ...appliedFilters,
                  sortBy: "none",
                });
                setSortBy("none");
              }}
              style={[
                styles.activeFilterChip,
                {
                  backgroundColor: "#1a73e815",
                  borderColor: theme.colors.primary,
                },
              ]}
              textStyle={{ color: theme.colors.primary }}
            >
              Sort by:{" "}
              {appliedFilters.sortBy === "total_amount" ? "Amount" : "Merchant"}
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
              }}
              style={[
                styles.activeFilterChip,
                {
                  backgroundColor: "#1a73e815",
                  borderColor: theme.colors.primary,
                },
              ]}
              textStyle={{ color: theme.colors.primary }}
            >
              Order:{" "}
              {appliedFilters.sortOrder === "asc" ? "Ascending" : "Descending"}
            </Chip>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderReceiptItem = ({ item }: { item: Receipt }) => (
    <Surface style={styles.cardSurface}>
      <TouchableOpacity
        onPress={() => handleViewReceipt(item)}
        style={styles.cardTouchable}
      >
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Text style={styles.receiptNumber}>{item.receipt_number}</Text>
            <Text style={styles.merchantName}>{item.merchant_name}</Text>
          </View>
          <Chip icon="calendar" style={styles.dateChip}>
            {format(new Date(item.date), "MMM d, yyyy")}
          </Chip>
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Total:</Text>
            <Text style={styles.detailValue}>
              ${item.total_amount.toFixed(2)}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Tax:</Text>
            <Text style={styles.detailValue}>
              ${item.tax_amount.toFixed(2)}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Payment Method:</Text>
            <Text style={styles.detailValue}>{item.payment_method}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Chip style={styles.companyChip}>
            {item.company &&
            typeof item.company === "object" &&
            "company_name" in item.company
              ? item.company.company_name
              : "Unknown Company"}
          </Chip>
          <View style={styles.viewDetailsContainer}>
            <IconButton
              icon="pencil"
              size={20}
              onPress={(e) => {
                e.stopPropagation();
                navigation.navigate("EditReceipt", { receiptId: item.id });
              }}
              iconColor={theme.colors.primary}
              style={styles.actionIcon}
            />
            <Text style={styles.viewDetailsText}>VIEW DETAILS</Text>
            <IconButton
              icon="chevron-right"
              size={18}
              iconColor={theme.colors.primary}
              style={styles.chevronIcon}
            />
          </View>
        </View>
      </TouchableOpacity>
    </Surface>
  );

  // Add TableHeader component
  const TableHeader = () => (
    <View style={styles.tableHeaderRow}>
      <View style={[styles.tableHeaderCell, { flex: 0.5 }]}>
        <Text style={styles.tableHeaderText}>ID</Text>
      </View>
      <View style={[styles.tableHeaderCell, { flex: 0.8 }]}>
        <Text style={styles.tableHeaderText}>Receipt No.</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Merchant</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Date</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Transaction Date</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Amount</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Company</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Actions</Text>
      </View>
    </View>
  );

  // Update the TableRow component to use TooltipText
  const TableRow = ({ item }: { item: Receipt }) => (
    <Pressable
      onPress={() => handleViewReceipt(item)}
      style={({ pressed }) => [
        styles.tableRow,
        pressed && { backgroundColor: "#f8fafc" },
      ]}
    >
      <View style={[styles.tableCell, { justifyContent: "center", marginRight: 60 }]}>
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            handleViewReceipt(item);
          }}
        >
          <Text style={styles.receiptIdLink}>
            {item.receipt_sequence_id ? `${item.receipt_sequence_id}` : "-"}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={[styles.tableCell, { flex: 0.8 }]}>
        <TooltipText text={item.receipt_number} theme={theme} />
      </View>
      <View style={styles.tableCell}>
        <TooltipText text={item.merchant_name} theme={theme} />
      </View>
      <View style={styles.tableCell}>
        <TooltipText
          text={format(new Date(item.date), "MMM d, yyyy")}
          theme={theme}
        />
      </View>
      <View style={styles.tableCell}>
        <TooltipText
          text={
            item.transaction_date
              ? format(new Date(item.transaction_date), "MMM d, yyyy")
              : "N/A"
          }
          theme={theme}
        />
      </View>
      <View style={styles.tableCell}>
        <TooltipText text={`$${item.total_amount.toFixed(2)}`} theme={theme} />
      </View>
      <View style={styles.tableCell}>
        <TooltipText
          text={item.company?.company_name || "Unknown Company"}
          theme={theme}
        />
      </View>
      <View style={styles.actionCell}>
        <IconButton
          icon="pencil"
          size={20}
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate("EditReceipt", { receiptId: item.id });
          }}
          style={styles.actionIcon}
        />
        <IconButton
          icon="eye"
          size={20}
          onPress={(e) => {
            e.stopPropagation();
            handleViewReceipt(item);
          }}
          style={styles.actionIcon}
        />
      </View>
    </Pressable>
  );

  // Update TableSkeleton component
  const TableSkeleton = () => {
    return (
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
              <View style={[styles.tableCell, { flex: 0.8 }]}>
                <Shimmer width={100} height={16} />
              </View>
              <View style={styles.tableCell}>
                <Shimmer width={160} height={16} />
              </View>
              <View style={styles.tableCell}>
                <Shimmer width={100} height={16} />
              </View>
              <View style={styles.tableCell}>
                <Shimmer width={100} height={16} />
              </View>
              <View style={styles.tableCell}>
                <Shimmer width={80} height={16} />
              </View>
              <View style={styles.tableCell}>
                <Shimmer width={140} height={16} />
              </View>
              <View style={styles.actionCell}>
                <Shimmer
                  width={32}
                  height={32}
                  style={{ borderRadius: 16, marginRight: 8 }}
                />
                <Shimmer width={32} height={32} style={{ borderRadius: 16 }} />
              </View>
            </View>
          ))}
      </View>
    );
  };

  // Add CardSkeleton component
  const CardSkeleton = () => (
    <Surface style={styles.cardSurface}>
      <View style={styles.cardTouchable}>
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Shimmer width={160} height={20} style={{ marginBottom: 8 }} />
            <Shimmer width={140} height={16} />
          </View>
          <Shimmer width={120} height={32} style={{ borderRadius: 16 }} />
        </View>

        <View style={styles.cardDetails}>
          <View style={styles.detailItem}>
            <Shimmer width={80} height={14} style={{ marginRight: 8 }} />
            <Shimmer width={100} height={14} />
          </View>
          <View style={styles.detailItem}>
            <Shimmer width={80} height={14} style={{ marginRight: 8 }} />
            <Shimmer width={80} height={14} />
          </View>
          <View style={styles.detailItem}>
            <Shimmer width={120} height={14} style={{ marginRight: 8 }} />
            <Shimmer width={100} height={14} />
          </View>
        </View>

        <View style={styles.cardFooter}>
          <Shimmer width={160} height={32} style={{ borderRadius: 16 }} />
          <View style={styles.viewDetailsContainer}>
            <Shimmer
              width={40}
              height={40}
              style={{ borderRadius: 20, marginRight: 8 }}
            />
            <Shimmer width={100} height={14} style={{ marginRight: 8 }} />
            <Shimmer width={24} height={24} style={{ borderRadius: 12 }} />
          </View>
        </View>
      </View>
    </Surface>
  );

  if (loading && !refreshing) {
    const isLargeScreen = windowDimensions.width >= 1440;
    const isMediumScreen =
      windowDimensions.width >= 768 && windowDimensions.width < 1440;
    const useTableLayout = isLargeScreen || isMediumScreen;

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: "#F8F9FA" }]}>
        <AppHeader
          title="Receipts"
          showBackButton={Platform.OS !== "web"}
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
                marginRight: 15,
              }}
            />
            <Shimmer
              width={98}
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
              renderItem={() => <CardSkeleton />}
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
        title="Receipts"
        showBackButton={Platform.OS !== "web"}
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
          <Searchbar
            placeholder="Search by ID, receipt number, or merchant..."
            onChangeText={handleSearch}
            value={searchQuery}
            style={styles.searchbar}
            theme={{ colors: { primary: theme.colors.primary } }}
            clearIcon={() =>
              searchQuery ? (
                <IconButton
                  icon="close-circle"
                  size={18}
                  onPress={() => handleSearch("")}
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
              iconColor={hasActiveFilters() ? theme.colors.primary : undefined}
              onPress={() => setFilterModalVisible(true)}
            />
            {hasActiveFilters() && <View style={styles.filterBadge} />}
          </View>
        </View>

        <FAB
          icon="plus"
          label="Add a Receipt"
          style={[
            styles.fab,
            {
              backgroundColor: theme.colors.primary,
              position: "relative",
              margin: 0,
              marginLeft: 16,
            },
          ]}
          onPress={handleCreateReceipt}
          color={theme.colors.surface}
          mode="flat"
          theme={{ colors: { accent: theme.colors.surface } }}
        />
      </View>

      {renderActiveFilterChips()}
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

export default ReceiptsListScreen;
