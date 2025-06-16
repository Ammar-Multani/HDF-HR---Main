import React, { useState, useEffect, useRef } from "react";
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

// Define the navigation param list type
type RootStackParamList = {
  CompanyReceiptDetails: { receiptId: string };
  CreateCompanyReceipt: undefined;
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
      backgroundColor: theme.colors.background,
    },
    content: {
      flex: 1,
      padding: 16,
    },
    searchContainer: {
      flexDirection: "row",
      marginBottom: 16,
      gap: 8,
    },
    searchBar: {
      flex: 1,
      elevation: 0,
      borderRadius: 18,
      height: 60,
      backgroundColor: "#fff",
      borderWidth: 1,
      borderColor: "#e0e0e0",
    },
    searchBarContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
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
    fab: {
      borderRadius: 17,
      height: 56,
    },
    createButton: {
      alignSelf: "center",
    },
    card: {
      flex: 1,
    },
    modal: {
      backgroundColor: theme.colors.surface,
      borderRadius: 8,
      overflow: "hidden",
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      padding: 20,
      margin: 20,
      borderRadius: 8,
      maxWidth: 500,
      alignSelf: "center",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
    },
    modalTitle: {
      marginBottom: 16,
    },
    modalSection: {
      marginVertical: 8,
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 8,
      marginTop: 16,
    },
    modalDivider: {
      marginVertical: 16,
    },
    modalButton: {
      minWidth: 100,
    },
    modalFooter: {
      flexDirection: "row",
      justifyContent: "flex-end",
      padding: 16,
      gap: 8,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outline,
    },
    sectionHeader: {
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.onSurface,
    },
    radioItem: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
    },
    radioLabel: {
      marginLeft: 8,
      color: theme.colors.onSurface,
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
    tableCellText: {
      color: theme.colors.onSurface,
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
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [numberOfItemsPerPage] = useState(10);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [canUploadReceipts, setCanUploadReceipts] = useState(false);

  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  useEffect(() => {
    if (companyId) {
      fetchReceipts();
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

  const fetchReceipts = async () => {
    try {
      setLoading(true);
      if (!companyId) return;

      let query = supabase
        .from("receipts")
        .select("*", { count: "exact" })
        .eq("company_id", companyId)
        .order(sortBy, { ascending: sortOrder === "asc" })
        .range(
          (page - 1) * numberOfItemsPerPage,
          page * numberOfItemsPerPage - 1
        );

      if (searchQuery) {
        query = query.or(
          `merchant_name.ilike.%${searchQuery}%,receipt_number.ilike.%${searchQuery}%`
        );
      }

      const { data, error, count } = await query;

      if (error) throw error;

      if (data) {
        setReceipts(data);
        setTotalPages(Math.ceil((count || 0) / numberOfItemsPerPage));
      }
    } catch (error) {
      console.error("Error fetching receipts:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchReceipts();
  }, []);

  const handleCreateReceipt = () => {
    navigation.navigate("CreateCompanyReceipt");
  };

  const handleViewReceipt = (receiptId: string) => {
    navigation.navigate("CompanyReceiptDetails", { receiptId });
  };

  const applyFilters = () => {
    setPage(1);
    setFilterModalVisible(false);
  };

  const renderShimmerRows = () => {
    return Array(5)
      .fill(0)
      .map((_, index) => (
        <DataTable.Row key={index}>
          <DataTable.Cell>
            <Shimmer width={100} height={20} />
          </DataTable.Cell>
          <DataTable.Cell>
            <Shimmer width={100} height={20} />
          </DataTable.Cell>
          <DataTable.Cell>
            <Shimmer width={150} height={20} />
          </DataTable.Cell>
          <DataTable.Cell numeric>
            <Shimmer width={80} height={20} />
          </DataTable.Cell>
          <DataTable.Cell style={{ justifyContent: "flex-end" }}>
            <Shimmer width={40} height={20} />
          </DataTable.Cell>
        </DataTable.Row>
      ));
  };

  const hasActiveFilters = () => {
    return sortBy !== "date" || sortOrder !== "desc";
  };

  const renderFilterModal = () => {
    const modalPadding = isLargeScreen ? 32 : isMediumScreen ? 24 : 16;

    const handleSortByChange = (value: string) => {
      setSortBy(value as "date" | "merchant_name" | "total_amount");
    };

    const handleSortOrderChange = (value: string) => {
      setSortOrder(value as "asc" | "desc");
    };

    return (
      <Portal>
        <Modal
          visible={filterModalVisible}
          onDismiss={() => setFilterModalVisible(false)}
          contentContainerStyle={[
            styles.modal,
            {
              width: isLargeScreen ? 480 : isMediumScreen ? 420 : "90%",
              alignSelf: "center",
            },
          ]}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Receipts</Text>
            <IconButton
              icon="close"
              size={24}
              onPress={() => setFilterModalVisible(false)}
            />
          </View>

          <ScrollView style={[styles.modalContent, { padding: modalPadding }]}>
            <View style={styles.modalSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Sort By</Text>
              </View>
              <RadioButton.Group
                onValueChange={handleSortByChange}
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
                onValueChange={handleSortOrderChange}
                value={sortOrder}
              >
                <View style={styles.radioItem}>
                  <RadioButton.Android
                    value="asc"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.radioLabel}>Ascending</Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton.Android
                    value="desc"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.radioLabel}>Descending</Text>
                </View>
              </RadioButton.Group>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              mode="outlined"
              onPress={() => setFilterModalVisible(false)}
              style={styles.modalButton}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={applyFilters}
              style={styles.modalButton}
            >
              Apply Filters
            </Button>
          </View>
        </Modal>
      </Portal>
    );
  };

  // Convert sort order to DataTable format
  const getSortDirection = (
    currentSortBy: string
  ): "ascending" | "descending" | undefined => {
    if (sortBy !== currentSortBy) return undefined;
    return sortOrder === "asc" ? "ascending" : "descending";
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title={t("companies.receipts.title")}
        subtitle={t("companies.receipts.subtitle")}
        showLogo={false}
      />
      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBarContainer}>
            <Searchbar
              placeholder={t("receipts.searchPlaceholder")}
              onChangeText={setSearchQuery}
              value={searchQuery}
              style={styles.searchBar}
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

        {loading ? (
          <LoadingIndicator />
        ) : receipts.length === 0 ? (
          <EmptyState
            icon="receipt"
            title={t("receipts.emptyTitle")}
            message={t("receipts.emptyDescription")}
            buttonTitle={canUploadReceipts ? t("receipts.create") : undefined}
            onButtonPress={canUploadReceipts ? handleCreateReceipt : undefined}
          />
        ) : (
          <Card style={styles.card}>
            <DataTable>
              <DataTable.Header>
                <DataTable.Title
                  sortDirection={getSortDirection("date")}
                  onPress={() => {
                    if (sortBy === "date") {
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    } else {
                      setSortBy("date");
                      setSortOrder("desc");
                    }
                  }}
                >
                  {t("receipts.date")}
                </DataTable.Title>
                <DataTable.Title>{t("receipts.receiptNumber")}</DataTable.Title>
                <DataTable.Title
                  sortDirection={getSortDirection("merchant_name")}
                  onPress={() => {
                    if (sortBy === "merchant_name") {
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    } else {
                      setSortBy("merchant_name");
                      setSortOrder("desc");
                    }
                  }}
                >
                  {t("receipts.merchantName")}
                </DataTable.Title>
                <DataTable.Title
                  numeric
                  sortDirection={getSortDirection("total_amount")}
                  onPress={() => {
                    if (sortBy === "total_amount") {
                      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
                    } else {
                      setSortBy("total_amount");
                      setSortOrder("desc");
                    }
                  }}
                >
                  {t("receipts.totalAmount")}
                </DataTable.Title>
                <DataTable.Title style={{ justifyContent: "flex-end" }}>
                  {t("common.actions")}
                </DataTable.Title>
              </DataTable.Header>

              {receipts.map((receipt) => (
                <DataTable.Row key={receipt.id}>
                  <DataTable.Cell>
                    {format(new Date(receipt.date), "dd/MM/yyyy")}
                  </DataTable.Cell>
                  <DataTable.Cell>
                    <TooltipText text={receipt.receipt_number} theme={theme} />
                  </DataTable.Cell>
                  <DataTable.Cell>
                    <TooltipText text={receipt.merchant_name} theme={theme} />
                  </DataTable.Cell>
                  <DataTable.Cell numeric>
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                    }).format(receipt.total_amount)}
                  </DataTable.Cell>
                  <DataTable.Cell style={{ justifyContent: "flex-end" }}>
                    <IconButton
                      icon="eye"
                      size={20}
                      onPress={() => handleViewReceipt(receipt.id)}
                    />
                  </DataTable.Cell>
                </DataTable.Row>
              ))}
            </DataTable>
            <DataTable.Pagination
              page={page - 1}
              numberOfPages={totalPages}
              onPageChange={(p) => setPage(p + 1)}
              label={`${(page - 1) * numberOfItemsPerPage + 1}-${Math.min(
                page * numberOfItemsPerPage,
                receipts.length
              )} of ${receipts.length}`}
              showFastPaginationControls
              numberOfItemsPerPage={numberOfItemsPerPage}
            />
          </Card>
        )}
      </View>

      <Portal>{renderFilterModal()}</Portal>
    </SafeAreaView>
  );
};

export default CompanyReceiptsListScreen;
