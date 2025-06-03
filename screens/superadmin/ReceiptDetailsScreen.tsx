import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Alert,
  Linking,
  TouchableOpacity,
  Image,
} from "react-native";
import {
  Text,
  Button,
  Divider,
  useTheme,
  Surface,
  IconButton,
  Chip,
  ActivityIndicator,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import { useTranslation } from "react-i18next";

// Define the navigation param list type
type RootStackParamList = {
  ReceiptDetails: { receiptId: string };
  EditReceipt: { receiptId: string };
};

type ReceiptDetailsNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

type ReceiptDetailsRouteParams = {
  receiptId: string;
};

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
  receipt_image_path?: string;
  merchant_address?: string;
  language_hint?: string;
  notes?: string;
  category?: string;
  line_items?: LineItem[];
  company: {
    company_name: string;
    contact_number?: string;
  };
}

interface LineItem {
  name: string;
  qty: number;
  price: number;
}

const ReceiptDetailsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<ReceiptDetailsNavigationProp>();
  const route =
    useRoute<RouteProp<Record<string, ReceiptDetailsRouteParams>, string>>();
  const { receiptId } = route.params;
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);

  const fetchReceiptDetails = async () => {
    try {
      setLoading(true);

      // Fetch receipt details
      const { data, error } = await supabase
        .from("receipts")
        .select(
          `
          *,
          company:company_id (
            company_name,
            contact_number
          )
        `
        )
        .eq("id", receiptId)
        .single();

      if (error) {
        console.error("Error fetching receipt details:", error);
        return;
      }

      setReceipt(data as Receipt);

      // Fetch receipt image if available
      if (data?.receipt_image_path) {
        setLoadingImage(true);
        try {
          const { data: publicUrlData } = supabase.storage
            .from("receipt-images")
            .getPublicUrl(data.receipt_image_path);

          setImageUrl(publicUrlData.publicUrl);
        } catch (imageError) {
          console.error("Error getting image URL:", imageError);
        } finally {
          setLoadingImage(false);
        }
      }
    } catch (error) {
      console.error("Error fetching receipt details:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReceiptDetails();
  }, [receiptId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReceiptDetails();
  };

  const handleViewImage = () => {
    if (imageUrl) {
      Linking.openURL(imageUrl);
    } else {
      Alert.alert("Error", "Receipt image is not available");
    }
  };

  const handleEditReceipt = () => {
    if (receipt) {
      navigation.navigate("EditReceipt", { receiptId: receipt.id });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const calculateItemTotal = (item: LineItem) => {
    return item.qty * item.price;
  };

  if (loading && !refreshing) {
    return <LoadingIndicator />;
  }

  if (!receipt) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: "#F8F9FA" }]}>
        <AppHeader
          title="Receipt Details"
          showBackButton={true}
          showLogo={false}
        />
        <View style={styles.errorContainer}>
          <Text style={{ color: theme.colors.error }}>Receipt not found</Text>
          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={styles.button}
            buttonColor={theme.colors.primary}
          >
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#F8F9FA" }]}>
      <AppHeader
        title="Receipt Details"
        subtitle="View and manage receipt information"
        showBackButton={true}
        showLogo={false}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Receipt Header */}
        <Surface style={styles.headerCard}>
          <View style={styles.cardHeader}>
            <View style={styles.simpleCardHeader}>
              <IconButton
                icon="receipt"
                size={22}
                iconColor={theme.colors.primary}
              />
              <Text style={styles.simpleCardHeaderTitle}>
                Receipt #{receipt.receipt_number}
              </Text>
            </View>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Merchant:</Text>
              <Text style={styles.detailValue}>{receipt.merchant_name}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date:</Text>
              <Text style={styles.detailValue}>
                {format(new Date(receipt.date), "MMMM d, yyyy")}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Transaction Date:</Text>
              <Text style={styles.detailValue}>
                {receipt.transaction_date
                  ? format(new Date(receipt.transaction_date), "MMMM d, yyyy")
                  : "Not specified"}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Company:</Text>
              <Text style={styles.detailValue}>
                {receipt.company.company_name}
              </Text>
            </View>

            {receipt.merchant_address && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Address:</Text>
                <Text style={styles.detailValue}>
                  {receipt.merchant_address}
                </Text>
              </View>
            )}

            {receipt.category && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Category:</Text>
                <Chip
                  style={styles.categoryChip}
                  textStyle={{ color: theme.colors.primary }}
                >
                  {receipt.category}
                </Chip>
              </View>
            )}
          </View>
        </Surface>

        {/* Financial Details */}
        <Surface style={styles.detailsCard}>
          <View style={styles.cardHeader}>
            <View style={styles.simpleCardHeader}>
              <IconButton
                icon="cash-multiple"
                size={22}
                iconColor={theme.colors.primary}
              />
              <Text style={styles.simpleCardHeaderTitle}>
                Financial Details
              </Text>
            </View>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Total Amount:</Text>
              <Text style={styles.amountValue}>
                {formatCurrency(receipt.total_amount)}
              </Text>
            </View>

            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Tax Amount:</Text>
              <Text style={styles.amountValue}>
                {formatCurrency(receipt.tax_amount)}
              </Text>
            </View>

            <Divider style={styles.divider} />

            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Payment Method:</Text>
              <Chip icon="credit-card" style={styles.paymentChip}>
                {receipt.payment_method}
              </Chip>
            </View>
          </View>
        </Surface>

        {/* Line Items */}
        {receipt.line_items && receipt.line_items.length > 0 && (
          <Surface style={styles.detailsCard}>
            <View style={styles.cardHeader}>
              <View style={styles.simpleCardHeader}>
                <IconButton
                  icon="format-list-bulleted"
                  size={22}
                  iconColor={theme.colors.primary}
                />
                <Text style={styles.simpleCardHeaderTitle}>Line Items</Text>
              </View>
            </View>

            <View style={styles.cardContent}>
              <View style={styles.itemsHeaderRow}>
                <Text style={[styles.itemColumn, styles.itemDescriptionHeader]}>
                  Item
                </Text>
                <Text style={[styles.itemColumn, styles.itemQtyHeader]}>
                  Qty
                </Text>
                <Text style={[styles.itemColumn, styles.itemPriceHeader]}>
                  Price
                </Text>
                <Text style={[styles.itemColumn, styles.itemTotalHeader]}>
                  Total
                </Text>
              </View>

              <Divider style={styles.itemDivider} />

              {receipt.line_items.map((item, index) => (
                <View key={index}>
                  <View style={styles.itemRow}>
                    <Text style={[styles.itemColumn, styles.itemDescription]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.itemColumn, styles.itemQty]}>
                      {item.qty}
                    </Text>
                    <Text style={[styles.itemColumn, styles.itemPrice]}>
                      {formatCurrency(item.price)}
                    </Text>
                    <Text style={[styles.itemColumn, styles.itemTotal]}>
                      {formatCurrency(calculateItemTotal(item))}
                    </Text>
                  </View>
                  <Divider style={styles.itemDivider} />
                </View>
              ))}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalValue}>
                  {formatCurrency(receipt.total_amount)}
                </Text>
              </View>
            </View>
          </Surface>
        )}

        {/* Notes Section */}
        {receipt.notes && (
          <Surface style={styles.detailsCard}>
            <View style={styles.cardHeader}>
              <View style={styles.simpleCardHeader}>
                <IconButton
                  icon="note-text"
                  size={22}
                  iconColor={theme.colors.primary}
                />
                <Text style={styles.simpleCardHeaderTitle}>Notes</Text>
              </View>
            </View>

            <View style={styles.cardContent}>
              <Text style={styles.notesText}>{receipt.notes}</Text>
            </View>
          </Surface>
        )}

        {/* Receipt Image */}
        {(receipt.receipt_image_path || imageUrl) && (
          <Surface style={styles.detailsCard}>
            <View style={styles.cardHeader}>
              <View style={styles.simpleCardHeader}>
                <IconButton
                  icon="image"
                  size={22}
                  iconColor={theme.colors.primary}
                />
                <Text style={styles.simpleCardHeaderTitle}>Receipt Image</Text>
              </View>
            </View>

            <View style={styles.cardContent}>
              {loadingImage ? (
                <View style={styles.imageLoadingContainer}>
                  <ActivityIndicator
                    size="large"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.imageLoadingText}>Loading image...</Text>
                </View>
              ) : imageUrl ? (
                <View>
                  <Image
                    source={{ uri: imageUrl }}
                    style={styles.receiptImage}
                    resizeMode="contain"
                  />
                  <Button
                    mode="outlined"
                    icon="open-in-new"
                    onPress={handleViewImage}
                    style={styles.viewImageButton}
                  >
                    View Full Image
                  </Button>
                </View>
              ) : (
                <Text style={styles.noImageText}>
                  Receipt image not available
                </Text>
              )}
            </View>
          </Surface>
        )}

        {/* Additional Information */}
        <Surface style={styles.detailsCard}>
          <View style={styles.cardHeader}>
            <View style={styles.simpleCardHeader}>
              <IconButton
                icon="information"
                size={22}
                iconColor={theme.colors.primary}
              />
              <Text style={styles.simpleCardHeaderTitle}>Additional Info</Text>
            </View>
          </View>

          <View style={styles.cardContent}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Created:</Text>
              <Text style={styles.detailValue}>
                {format(new Date(receipt.created_at), "MMM d, yyyy, h:mm a")}
              </Text>
            </View>

            {receipt.language_hint && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Language:</Text>
                <Text style={styles.detailValue}>{receipt.language_hint}</Text>
              </View>
            )}
          </View>
        </Surface>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <Button
            mode="contained"
            icon="pencil"
            onPress={handleEditReceipt}
            style={[styles.button, { marginRight: 8 }]}
          >
            Edit Receipt
          </Button>

          {/* <Button
            mode="outlined"
            icon="printer"
            onPress={() => console.log("Print receipt")}
            style={styles.button}
          >
            Print
          </Button> */}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "rgba(0,0,0,0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  detailsCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "rgba(0,0,0,0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  cardHeader: {
    width: "100%",
  },
  simpleCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 5,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  simpleCardHeaderTitle: {
    fontSize: 17,
    fontFamily: "Poppins-SemiBold",
    color: "#424242",
  },
  cardContent: {
    padding: 20,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "center",
  },
  detailLabel: {
    width: 100,
    fontFamily: "Poppins-Medium",
    fontSize: 14,
    color: "#757575",
  },
  detailValue: {
    flex: 1,
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    color: "#212121",
  },
  categoryChip: {
    backgroundColor: "rgba(26, 115, 232, 0.1)",
    borderColor: "rgba(26, 115, 232, 0.3)",
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  amountLabel: {
    fontFamily: "Poppins-Medium",
    fontSize: 14,
    color: "#757575",
  },
  amountValue: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
    color: "#212121",
  },
  paymentChip: {
    backgroundColor: "#f0f0f0",
  },
  divider: {
    marginVertical: 12,
    backgroundColor: "#EEEEEE",
    height: 1,
  },
  itemDivider: {
    marginVertical: 8,
    backgroundColor: "#F0F0F0",
  },
  itemsHeaderRow: {
    flexDirection: "row",
    paddingVertical: 8,
  },
  itemRow: {
    flexDirection: "row",
    paddingVertical: 8,
  },
  itemColumn: {
    fontSize: 14,
  },
  itemDescriptionHeader: {
    flex: 2,
    fontFamily: "Poppins-Medium",
    color: "#757575",
  },
  itemQtyHeader: {
    flex: 0.5,
    textAlign: "center",
    fontFamily: "Poppins-Medium",
    color: "#757575",
  },
  itemPriceHeader: {
    flex: 1,
    textAlign: "right",
    fontFamily: "Poppins-Medium",
    color: "#757575",
  },
  itemTotalHeader: {
    flex: 1,
    textAlign: "right",
    fontFamily: "Poppins-Medium",
    color: "#757575",
  },
  itemDescription: {
    flex: 2,
    fontFamily: "Poppins-Regular",
    color: "#212121",
  },
  itemQty: {
    flex: 0.5,
    textAlign: "center",
    fontFamily: "Poppins-Regular",
    color: "#212121",
  },
  itemPrice: {
    flex: 1,
    textAlign: "right",
    fontFamily: "Poppins-Regular",
    color: "#212121",
  },
  itemTotal: {
    flex: 1,
    textAlign: "right",
    fontFamily: "Poppins-Regular",
    color: "#212121",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
  },
  totalLabel: {
    fontFamily: "Poppins-Medium",
    fontSize: 16,
    color: "#424242",
    marginRight: 12,
  },
  totalValue: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 18,
    color: "#212121",
  },
  notesText: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    color: "#616161",
    lineHeight: 22,
  },
  receiptImage: {
    width: "100%",
    height: 300,
    borderRadius: 8,
    marginBottom: 12,
  },
  viewImageButton: {
    marginTop: 8,
  },
  imageLoadingContainer: {
    alignItems: "center",
    padding: 20,
  },
  imageLoadingText: {
    marginTop: 12,
    color: "#757575",
  },
  noImageText: {
    fontStyle: "italic",
    color: "#757575",
    textAlign: "center",
    padding: 20,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
  },
  button: {
    flex: 1,
    borderRadius: 8,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
});

export default ReceiptDetailsScreen;
