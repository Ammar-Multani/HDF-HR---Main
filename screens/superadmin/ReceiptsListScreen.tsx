import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Platform,
  ScrollView,
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

// Define the navigation param list type
type RootStackParamList = {
  ReceiptDetails: { receiptId: string };
  CreateReceipt: undefined;
};

type ReceiptsListNavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface Receipt {
  id: string;
  company_id: string;
  receipt_number: string;
  date: string;
  merchant_name: string;
  total_amount: number;
  tax_amount: number;
  payment_method: string;
  created_at: string;
  company: any; // Using any to avoid TypeScript issues
}

const createStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    searchContainer: {
      padding: 16,
      paddingBottom: 8,
      flexDirection: "row",
      alignItems: "center",
    },
    searchBar: {
      flex: 1,
      elevation: 2,
      borderRadius: 12,
      height: 56,
      backgroundColor: "#fff",
      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.05)",
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
      position: "absolute",
      margin: 16,
      right: Platform.OS === "web" ? 15 : 0,
      bottom: Platform.OS === "web" ? 10 : 10,
      borderRadius: 35,
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
      fontWeight: "600",
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
      fontWeight: "600",
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
      fontWeight: "500",
      color: "#616161",
    },
    applyButtonText: {
      fontSize: 14,
      fontWeight: "500",
      color: "#FFFFFF",
    },
  });

const ReceiptsListScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<ReceiptsListNavigationProp>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);
  const [companies, setCompanies] = useState<any[]>([]);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [sortBy, setSortBy] = useState("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [appliedFilters, setAppliedFilters] = useState({
    companyId: null as string | null,
    sortBy: "date",
    sortOrder: "desc" as "asc" | "desc",
  });

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

  const fetchReceipts = async () => {
    try {
      setLoading(true);

      let query = supabase
        .from("receipts")
        .select(
          `
          id, 
          company_id,
          receipt_number,
          date,
          merchant_name,
          total_amount,
          tax_amount,
          payment_method,
          created_at,
          company:company_id (company_name)
        `
        )
        .order(appliedFilters.sortBy, {
          ascending: appliedFilters.sortOrder === "asc",
        });

      // Apply company filter if selected
      if (appliedFilters.companyId) {
        query = query.eq("company_id", appliedFilters.companyId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching receipts:", error);
        return;
      }

      setReceipts(data || []);
    } catch (error) {
      console.error("Error fetching receipts:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
    fetchReceipts();
  }, []);

  useEffect(() => {
    fetchReceipts();
  }, [appliedFilters]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReceipts();
  };

  const handleCreateReceipt = () => {
    navigation.navigate("CreateReceipt");
  };

  const handleViewReceipt = (receipt: Receipt) => {
    // Navigate to view receipt screen
    navigation.navigate("ReceiptDetails", { receiptId: receipt.id });
  };

  const filteredReceipts = receipts.filter(
    (receipt) =>
      receipt.merchant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      receipt.receipt_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Apply filters and refresh receipts list
  const applyFilters = () => {
    // Close modal first
    setFilterModalVisible(false);

    // Apply new filters
    const newFilters = {
      companyId: selectedCompany,
      sortBy: sortBy,
      sortOrder: sortOrder,
    };

    // Set applied filters
    setAppliedFilters(newFilters);
  };

  const clearFilters = () => {
    setSelectedCompany(null);
    setSortBy("date");
    setSortOrder("desc");

    setAppliedFilters({
      companyId: null,
      sortBy: "date",
      sortOrder: "desc",
    });
  };

  // Check if we have any active filters
  const hasActiveFilters = () => {
    return (
      appliedFilters.companyId !== null ||
      appliedFilters.sortBy !== "date" ||
      appliedFilters.sortOrder !== "desc"
    );
  };

  // Render filter modal
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
              <Text style={styles.modalTitle}>Filter Options</Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setFilterModalVisible(false)}
              />
            </View>
            <Divider style={styles.modalDivider} />
          </View>

          <FlatList
            style={styles.modalContent}
            data={[]}
            ListHeaderComponent={
              <>
                <View style={styles.modalSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Company</Text>
                  </View>
                  <RadioButton.Group
                    onValueChange={(value) =>
                      setSelectedCompany(value === "all" ? null : value)
                    }
                    value={selectedCompany || "all"}
                  >
                    <View style={styles.radioItem}>
                      <RadioButton.Android
                        value="all"
                        color={theme.colors.primary}
                      />
                      <Text style={styles.radioLabel}>All Companies</Text>
                    </View>
                    {companies.map((company) => (
                      <View key={company.id} style={styles.radioItem}>
                        <RadioButton.Android
                          value={company.id}
                          color={theme.colors.primary}
                        />
                        <Text style={styles.radioLabel}>
                          {company.company_name}
                        </Text>
                      </View>
                    ))}
                  </RadioButton.Group>
                </View>

                <Divider style={styles.modalDivider} />

                <View style={styles.modalSection}>
                  <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Sort By</Text>
                  </View>
                  <RadioButton.Group
                    onValueChange={(value) => setSortBy(value)}
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
                        {sortBy === "date" ? "Newest First" : "Highest First"}
                      </Text>
                    </View>
                    <View style={styles.radioItem}>
                      <RadioButton.Android
                        value="asc"
                        color={theme.colors.primary}
                      />
                      <Text style={styles.radioLabel}>
                        {sortBy === "date" ? "Oldest First" : "Lowest First"}
                      </Text>
                    </View>
                  </RadioButton.Group>
                </View>
              </>
            }
            renderItem={() => null}
          />

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.footerButton}
              onPress={clearFilters}
            >
              <Text style={styles.clearButtonText}>Clear Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerButton, styles.applyButton]}
              onPress={applyFilters}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
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

          {appliedFilters.sortBy !== "date" && (
            <Chip
              mode="outlined"
              onClose={() => {
                setAppliedFilters({
                  ...appliedFilters,
                  sortBy: "date",
                });
                setSortBy("date");
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

  if (loading && !refreshing) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#F8F9FA" }]}>
      <AppHeader title="Receipts" showBackButton={true} showLogo={false} />

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search receipts..."
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
            size={24}
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

      {renderActiveFilterChips()}
      {renderFilterModal()}

      {filteredReceipts.length === 0 ? (
        <EmptyState
          icon="receipt"
          title="No Receipts Found"
          message={
            searchQuery || hasActiveFilters()
              ? "No receipts match your search or filters"
              : "No receipts have been added yet"
          }
          buttonTitle={
            searchQuery || hasActiveFilters()
              ? "Clear Filters"
              : "Add New Receipt"
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
      ) : (
        <FlatList
          data={filteredReceipts}
          renderItem={renderReceiptItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={handleCreateReceipt}
        color={theme.colors.surface}
      />
    </SafeAreaView>
  );
};

export default ReceiptsListScreen;
