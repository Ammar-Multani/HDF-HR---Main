import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  StyleSheet,
  View,
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
  DataTable,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
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
import { FlashList } from "@shopify/flash-list";

// Define the navigation param list type
type RootStackParamList = {
  CompanyReceiptDetails: { receiptId: string };
  CreateCompanyReceipt: undefined;
  EditCompanyReceipt: { receiptId: string };
};

type ReceiptsListNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Receipt {
  id: string;
  receipt_number: string;
  date: string;
  transaction_date: string;
  merchant_name: string;
  total_amount: number;
  tax_amount: number;
  payment_method: string;
  created_at: string;
  merchant_address?: string;
  line_items?: Array<{
    name: string;
    qty: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  merchant_vat?: string;
  merchant_phone?: string;
  merchant_website?: string;
  vat_details?: string;
  subtotal_amount?: string;
  rounding_amount?: string;
  final_price?: string;
  paid_amount?: string;
  change_amount?: string;
  receipt_sequence_id?: number;
}

// Add TooltipText component
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

// Add window dimensions hook
const useWindowDimensions = () => {
  const [dimensions, setDimensions] = useState({
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  });

  useEffect(() => {
    if (Platform.OS === "web") {
      const handleResize = () => {
        setDimensions({
          width: Dimensions.get("window").width,
          height: Dimensions.get("window").height,
        });
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  return dimensions;
};

// Add createStyles before component
const createStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: "#F8F9FA",
    },
    content: {
      flex: 1,
      padding: 16,
    },
    searchContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 16,
      gap: 8,
    },
    searchBarContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    searchInput: {
      flex: 1,
      elevation: 0,
      borderRadius: 18,
      height: 56,
      backgroundColor: "#fff",
      borderWidth: 1,
      borderColor: "#e0e0e0",
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
    fab: {
      borderRadius: 17,
      height: 56,
    },
    card: {
      flex: 1,
    },
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
      padding: 16,
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
      minHeight: 400,
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
    searchbar: {
      flex: 1,
      elevation: 0,
      borderRadius: 18,
      height: 60,
      backgroundColor: "#fff",
      borderWidth: 1,
      borderColor: "#e0e0e0",
    },
    tooltipContainer: {
      position: "relative",
    },
    tooltip: {
      backgroundColor: theme.colors.inverseSurface,
      padding: 8,
      borderRadius: 4,
      maxWidth: 300,
      zIndex: 1000,
    },
    tooltipText: {
      color: theme.colors.inverseOnSurface,
    },
    skeletonRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 16,
      paddingHorizontal: 26,
      borderBottomWidth: 1,
      borderBottomColor: "#e0e0e0",
      backgroundColor: "#fff",
    },
    skeletonCell: {
      flex: 1,
      paddingHorizontal: 26,
    },
    emptyStateContainer: {
      backgroundColor: "#fff",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#e0e0e0",
      minHeight: 400,
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
    },
  });

const CompanyReceiptsListScreen = () => {
  const { t } = useTranslation();
  const theme = useTheme();
  const navigation = useNavigation<ReceiptsListNavigationProp>();
  const { user } = useAuth();
  const dimensions = useWindowDimensions();
  const styles = createStyles(theme);

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState<
    "date" | "merchant_name" | "total_amount"
  >("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const PAGE_SIZE = 10;
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [canUploadReceipts, setCanUploadReceipts] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  useEffect(() => {
    if (companyId) {
      fetchReceipts(true);
    }
  }, [companyId, searchQuery, sortBy, sortOrder, page]);

  const fetchCompanyInfo = async () => {
    try {
      if (!user) return;

      const { data: companyUser, error: companyUserError } = await supabase
        .from("company_user")
        .select("company_id, company:company_id(can_upload_receipts)")
        .eq("id", user.id)
        .single();

      if (companyUserError) throw companyUserError;

      if (companyUser) {
        setCompanyId(companyUser.company_id);
        // @ts-ignore - The type system doesn't recognize the nested company object structure
        setCanUploadReceipts(!!companyUser.company?.can_upload_receipts);
      }
    } catch (error) {
      console.error("Error fetching company info:", error);
    } finally {
      setLoading(false);
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

      let query = supabase
        .from("receipts")
        .select("*", { count: "exact" })
        .eq("company_id", companyId)
        .order(sortBy, { ascending: sortOrder === "asc" })
        .range(from, to);

      if (searchQuery) {
        query = query.or(
          `merchant_name.ilike.%${searchQuery}%,receipt_number.ilike.%${searchQuery}%`
        );
      }

      const { data, error: supabaseError, count } = await query;

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      if (count !== null) {
        setTotalItems(count);
      }

      setReceipts(data || []);
    } catch (error) {
      console.error("Error fetching receipts:", error);
      setError(
        error instanceof Error
          ? error.message
          : "An error occurred while fetching receipts"
      );
      setReceipts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchReceipts(true);
  }, []);

  const handleCreateReceipt = () => {
    navigation.navigate("CreateCompanyReceipt");
  };

  const handleViewReceipt = (receiptId: string) => {
    navigation.navigate("CompanyReceiptDetails", { receiptId });
  };

  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage >= 0 && newPage < Math.ceil(totalItems / PAGE_SIZE)) {
        setPage(newPage);
      }
    },
    [totalItems, PAGE_SIZE]
  );

  const hasActiveFilters = () => {
    return sortBy !== "date" || sortOrder !== "desc";
  };

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
                <Text style={styles.sectionTitle}>Sort By</Text>
              </View>
              <RadioButton.Group
                onValueChange={(value) => {
                  setSortBy(value as "date" | "merchant_name" | "total_amount");
                }}
                value={sortBy}
              >
                <View style={styles.radioItem}>
                  <RadioButton.Android
                    value="date"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.radioLabel}>Date</Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton.Android
                    value="merchant_name"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.radioLabel}>Merchant Name</Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton.Android
                    value="total_amount"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.radioLabel}>Amount</Text>
                </View>
              </RadioButton.Group>
            </View>

            <Divider style={styles.modalDivider} />

            <View style={styles.modalSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Sort Order</Text>
              </View>
              <RadioButton.Group
                onValueChange={(value) => setSortOrder(value as "asc" | "desc")}
                value={sortOrder}
              >
                <View style={styles.radioItem}>
                  <RadioButton.Android
                    value="desc"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.radioLabel}>
                    {sortBy === "total_amount"
                      ? "Highest First"
                      : "Newest First"}
                  </Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton.Android
                    value="asc"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.radioLabel}>
                    {sortBy === "total_amount"
                      ? "Lowest First"
                      : "Oldest First"}
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
              onPress={() => {
                setSortBy("date");
                setSortOrder("desc");
                setFilterModalVisible(false);
              }}
            >
              <Text
                style={[
                  styles.clearButtonText,
                  { fontSize: isLargeScreen ? 16 : 14 },
                ]}
              >
                Reset
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
              onPress={() => setFilterModalVisible(false)}
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

  const renderTableHeader = () => (
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
        <Text style={styles.tableHeaderText}>Amount</Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text style={styles.tableHeaderText}>Actions</Text>
      </View>
    </View>
  );

  const renderTableRow = (receipt: Receipt) => (
    <Pressable
      onPress={() => handleViewReceipt(receipt.id)}
      style={({ pressed }) => [
        styles.tableRow,
        pressed && { backgroundColor: "#f8fafc" },
      ]}
    >
      <View style={[styles.tableCell, { flex: 0.5 }]}>
        <Text style={styles.tableCellText}>
          {receipt.receipt_sequence_id || "-"}
        </Text>
      </View>
      <View style={[styles.tableCell, { flex: 0.8 }]}>
        <TooltipText text={receipt.receipt_number.length > 15 ? receipt.receipt_number.slice(0, 15) + '...' : receipt.receipt_number} theme={theme} />
      </View>
      <View style={styles.tableCell}>
        <TooltipText text={receipt.merchant_name} theme={theme} />
      </View>
      <View style={styles.tableCell}>
        <TooltipText
          text={format(new Date(receipt.date), "MMM d, yyyy")}
          theme={theme}
        />
      </View>
      <View style={styles.tableCell}>
        <TooltipText
          text={`$${receipt.total_amount.toFixed(2)}`}
          theme={theme}
        />
      </View>
      <View style={styles.actionCell}>
        <IconButton
          icon="eye"
          size={20}
          onPress={(e) => {
            e.stopPropagation();
            handleViewReceipt(receipt.id);
          }}
          style={styles.actionIcon}
        />
        <IconButton
          icon="pencil"
          size={20}
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate("EditCompanyReceipt", {
              receiptId: receipt.id,
            });
          }}
          style={styles.actionIcon}
        />
      </View>
    </Pressable>
  );


  const renderContent = () => {
    if (error) {
      return (
        <View style={styles.tableContainer}>
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
        </View>
      );
    }

    if (receipts.length === 0) {
      return (
        <View style={styles.tableContainer}>
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
                setSortBy("date");
                setSortOrder("desc");
              } else {
                handleCreateReceipt();
              }
            }}
          />
        </View>
      );
    }

    const totalPages = Math.ceil(totalItems / PAGE_SIZE);

    return (
      <>
        <View style={styles.tableContainer}>
          {renderTableHeader()}
          <FlashList estimatedItemSize={74}
            data={receipts.sort((a, b) => {
              return sortOrder === 'desc'
                ? new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                : new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            })}
            renderItem={({ item }) => renderTableRow(item)}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.tableContent,
              receipts.length < 5 && { minHeight: 300 },
            ]}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
            ListEmptyComponent={
              <View
                style={{ flex: 1, minHeight: 300, justifyContent: "center" }}
              >
                <EmptyState
                  icon="receipt"
                  title={t("receipts.noReceiptsFound")}
                  message={t("receipts.noReceiptsMatch")}
                />
              </View>
            }
          />
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 12,
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
              {t("receipts.totalReceipts")}:
            </Text>
            <Text
              style={{
                fontSize: 14,
                color: theme.colors.primary,
                fontFamily: "Poppins-Medium",
                marginLeft: 4,
                minWidth: 20,
                textAlign: "right",
              }}
            >
              {totalItems}
            </Text>
          </View>
          {totalPages > 1 && (
            <View style={[styles.paginationWrapper, { minHeight: 36 }]}>
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

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: "#F8F9FA" }]}>
        <AppHeader
          title={t("receipts.title")}
          subtitle={t("receipts.subtitle")}
          showLogo={false}
        />
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
          {/* Search Bar Shimmer with exact dimensions */}
          <View style={[styles.searchContainer, { minHeight: 56 }]}>
            <View style={styles.searchBarContainer}>
              <Shimmer
                width="70%"
                height={56}
                style={{
                  borderRadius: 18,
                }}
              />
              <Shimmer
                width={48}
                height={48}
                style={{
                  borderRadius: 8,
                }}
              />
              <Shimmer
                width={140}
                height={56}
                style={{
                  borderRadius: 17,
                }}
              />
            </View>
          </View>

          {/* Table Shimmer with consistent height */}
          <View style={[styles.tableContainer, { minHeight: 400 }]}>
            {/* Header Shimmer */}
            <View style={[styles.tableHeaderRow, { height: 56 }]}>
              <View style={[styles.tableHeaderCell, { flex: 0.5 }]}>
                <Shimmer width={40} height={20} />
              </View>
              <View style={[styles.tableHeaderCell, { flex: 0.8 }]}>
                <Shimmer width={80} height={20} />
              </View>
              <View style={styles.tableHeaderCell}>
                <Shimmer width={100} height={20} />
              </View>
              <View style={styles.tableHeaderCell}>
                <Shimmer width={80} height={20} />
              </View>
              <View style={styles.tableHeaderCell}>
                <Shimmer width={90} height={20} />
              </View>
              <View style={styles.tableHeaderCell}>
                <Shimmer width={70} height={20} />
              </View>
            </View>

            {/* Table Rows Shimmer with consistent height */}
            {Array(8)
              .fill(0)
              .map((_, index) => (
                <View
                  key={`skeleton-${index}`}
                  style={[styles.skeletonRow, { height: 52 }]}
                >
                  <View style={[styles.skeletonCell, { flex: 0.5 }]}>
                    <Shimmer width={40} height={16} />
                  </View>
                  <View style={[styles.skeletonCell, { flex: 0.8 }]}>
                    <Shimmer width={100} height={16} />
                  </View>
                  <View style={styles.skeletonCell}>
                    <Shimmer width={150} height={16} />
                  </View>
                  <View style={styles.skeletonCell}>
                    <Shimmer width={100} height={16} />
                  </View>
                  <View style={styles.skeletonCell}>
                    <Shimmer width={80} height={16} />
                  </View>
                  <View style={styles.skeletonCell}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Shimmer
                        width={32}
                        height={32}
                        style={{ borderRadius: 16 }}
                      />
                      <Shimmer
                        width={32}
                        height={32}
                        style={{ borderRadius: 16 }}
                      />
                    </View>
                  </View>
                </View>
              ))}
          </View>

          {/* Pagination Shimmer with consistent height */}
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginTop: 16,
              minHeight: 48,
            }}
          >
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
            >
              <Shimmer width={100} height={20} />
              <Shimmer width={40} height={20} />
            </View>
            <View style={[styles.paginationWrapper, { minHeight: 36 }]}>
              <Shimmer width={200} height={36} style={{ borderRadius: 8 }} />
            </View>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#F8F9FA" }]}>
      <AppHeader
        title={t("receipts.title")}
        subtitle={t("receipts.subtitle")}
        showLogo={false}
      />
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
        <View style={[styles.searchContainer]}>
          <Searchbar
            placeholder={t("receipts.searchPlaceholder")}
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
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
              iconColor={hasActiveFilters() ? theme.colors.primary : undefined}
              onPress={() => setFilterModalVisible(true)}
            />
            {hasActiveFilters() && <View style={styles.filterBadge} />}
          </View>

          {canUploadReceipts && (
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
          )}
        </View>
        {renderFilterModal()}

        {renderContent()}
      </View>
    </SafeAreaView>
  );
};

export default CompanyReceiptsListScreen;
