import React, { useState, useEffect, CSSProperties } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Alert,
  Linking,
  TouchableOpacity,
  Image,
  Platform,
  Dimensions,
  ViewStyle,
  ImageStyle,
  TextStyle,
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
import Animated, { FadeIn } from "react-native-reanimated";

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
  subtotal_amount?: number;
  final_price?: number;
  paid_amount?: number;
  change_amount?: number;
  merchant_vat?: string;
  merchant_phone?: string;
  merchant_website?: string;
  vat_details?: string;
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
  unitPrice: number;
  totalPrice: number;
}

type Styles = {
  container: ViewStyle;
  scrollView: ViewStyle;
  scrollContent: ViewStyle;
  headerSection: ViewStyle;
  pageTitle: TextStyle;
  gridContainer: ViewStyle;
  gridColumn: ViewStyle;
  detailsCard: ViewStyle;
  cardHeader: ViewStyle;
  headerLeft: ViewStyle;
  iconContainer: ViewStyle;
  headerIcon: ViewStyle;
  cardTitle: TextStyle;
  cardContent: ViewStyle;
  detailRow: ViewStyle;
  detailLabel: TextStyle;
  detailValue: TextStyle;
  categoryChip: ViewStyle;
  amountRow: ViewStyle;
  amountLabel: TextStyle;
  amountValue: TextStyle;
  paymentChip: ViewStyle;
  divider: ViewStyle;
  itemDivider: ViewStyle;
  itemsHeaderRow: ViewStyle;
  itemRow: ViewStyle;
  itemColumn: TextStyle;
  itemDescriptionHeader: TextStyle;
  itemQtyHeader: TextStyle;
  itemPriceHeader: TextStyle;
  itemTotalHeader: TextStyle;
  itemDescription: TextStyle;
  itemQty: TextStyle;
  itemPrice: TextStyle;
  itemTotal: TextStyle;
  totalRow: ViewStyle;
  totalLabel: TextStyle;
  totalValue: TextStyle;
  notesText: TextStyle;
  receiptImage: ImageStyle;
  viewImageButton: ViewStyle;
  imageLoadingContainer: ViewStyle;
  imageLoadingText: TextStyle;
  noImageText: TextStyle;
  actionButtons: ViewStyle;
  button: ViewStyle;
  errorContainer: ViewStyle;
  imagePreviewContainer: ViewStyle;
  imageOverlay: ViewStyle;
  previewHint: TextStyle;
  imageActions: ViewStyle;
  imageButton: ViewStyle;
  documentInfo: ViewStyle;
  documentText: TextStyle;
  lineItem: ViewStyle;
  lineItemHeader: ViewStyle;
  lineItemName: TextStyle;
  lineItemTotal: TextStyle;
  lineItemDetails: ViewStyle;
  lineItemQuantity: TextStyle;
  lineItemDivider: ViewStyle;
};

const ReceiptDetailsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<ReceiptDetailsNavigationProp>();
  const route =
    useRoute<RouteProp<Record<string, ReceiptDetailsRouteParams>, string>>();
  const { receiptId } = route.params;
  const { t } = useTranslation();
  const dimensions = useWindowDimensions();

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

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
          setImageUrl(data.receipt_image_path);
        } catch (imageError) {
          console.error("Error setting image URL:", imageError);
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
      window.open(imageUrl, "_blank");
    }
  };

  const handleEditReceipt = () => {
    if (receipt) {
      navigation.navigate("EditReceipt", { receiptId: receipt.id });
    }
  };

  const formatCurrency = (amount: number | undefined | null) => {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return "N/A";
    }
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const calculateItemTotal = (item: LineItem) => {
    const quantity = Number(item.qty) || 0;
    const price = Number(item.unitPrice) || 0;
    return quantity * price;
  };

  const handleCopyLink = async () => {
    if (imageUrl) {
      try {
        await navigator.clipboard.writeText(imageUrl);
        setShowCopySuccess(true);
        setTimeout(() => setShowCopySuccess(false), 2000);
      } catch (error) {
        console.error("Error copying link:", error);
      }
    }
  };

  const overlayStyle: CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    opacity: isHovered ? 1 : 0,
    cursor: "pointer",
    transition: "opacity 0.2s ease",
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
          showHelpButton={true}
          absolute={false}
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
        showHelpButton={true}
        absolute={false}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            maxWidth: isLargeScreen ? 1400 : isMediumScreen ? 1100 : "100%",
            paddingHorizontal: isLargeScreen ? 48 : isMediumScreen ? 32 : 16,
          },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.headerSection}>
          <Text style={styles.pageTitle}>#{receipt.receipt_number}</Text>
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
          </View>
        </View>

        <View style={styles.gridContainer}>
          <View style={styles.gridColumn}>
            <Animated.View entering={FadeIn.delay(100)}>
              {/* Receipt Header */}
              <Surface style={styles.detailsCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <View style={styles.iconContainer}>
                      <IconButton
                        icon="receipt"
                        size={20}
                        iconColor="#64748b"
                        style={styles.headerIcon}
                      />
                    </View>
                    <Text style={styles.cardTitle}>Receipt Information</Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Merchant:</Text>
                    <Text style={styles.detailValue}>
                      {receipt.merchant_name}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Uploaded Date:</Text>
                    <Text style={styles.detailValue}>
                      {format(new Date(receipt.created_at), "MMMM d, yyyy")}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Transaction Date:</Text>
                    <Text style={styles.detailValue}>
                      {receipt.transaction_date
                        ? format(
                            new Date(receipt.transaction_date),
                            "MMMM d, yyyy"
                          )
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

                  {receipt.merchant_vat && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>VAT/Tax Number:</Text>
                      <Text style={styles.detailValue}>
                        {receipt.merchant_vat}
                      </Text>
                    </View>
                  )}

                  {receipt.merchant_phone && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Phone:</Text>
                      <Text style={styles.detailValue}>
                        {receipt.merchant_phone}
                      </Text>
                    </View>
                  )}

                  {receipt.merchant_website && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Website:</Text>
                      <Text style={styles.detailValue}>
                        {receipt.merchant_website}
                      </Text>
                    </View>
                  )}

                  {receipt.language_hint && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Language:</Text>
                      <Text style={styles.detailValue}>
                        {receipt.language_hint}
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
              <Surface style={[styles.detailsCard, { marginTop: 24 }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <View style={styles.iconContainer}>
                      <IconButton
                        icon="cash-multiple"
                        size={20}
                        iconColor="#64748b"
                        style={styles.headerIcon}
                      />
                    </View>
                    <Text style={styles.cardTitle}>Financial Details</Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  {receipt.subtotal_amount !== undefined && (
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Subtotal Amount:</Text>
                      <Text style={styles.amountValue}>
                        {formatCurrency(Number(receipt.subtotal_amount))}
                      </Text>
                    </View>
                  )}

                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Tax Amount:</Text>
                    <Text style={styles.amountValue}>
                      {formatCurrency(Number(receipt.tax_amount))}
                    </Text>
                  </View>

                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Total Amount:</Text>
                    <Text style={styles.amountValue}>
                      {formatCurrency(Number(receipt.total_amount))}
                    </Text>
                  </View>

                  {receipt.final_price !== undefined && (
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Final Price:</Text>
                      <Text style={styles.amountValue}>
                        {formatCurrency(Number(receipt.final_price))}
                      </Text>
                    </View>
                  )}

                  {receipt.paid_amount !== undefined && (
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Paid Amount:</Text>
                      <Text style={styles.amountValue}>
                        {formatCurrency(Number(receipt.paid_amount))}
                      </Text>
                    </View>
                  )}

                  {receipt.change_amount !== undefined && (
                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Change Amount:</Text>
                      <Text style={styles.amountValue}>
                        {formatCurrency(Number(receipt.change_amount))}
                      </Text>
                    </View>
                  )}

                  <Divider style={styles.divider} />

                  <View style={styles.amountRow}>
                    <Text style={styles.amountLabel}>Payment Method:</Text>
                    <Chip icon="credit-card" style={styles.paymentChip}>
                      {receipt.payment_method}
                    </Chip>
                  </View>

                  {receipt.vat_details && (
                    <>
                      <Divider style={styles.divider} />
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>VAT Details:</Text>
                        <Text style={styles.detailValue}>
                          {receipt.vat_details}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </Surface>
            </Animated.View>
          </View>

          <View style={styles.gridColumn}>
            <Animated.View entering={FadeIn.delay(200)}>
              {/* Line Items */}
              {receipt &&
                receipt.line_items &&
                receipt.line_items.length > 0 && (
                  <Surface style={styles.detailsCard}>
                    <View style={styles.cardHeader}>
                      <View style={styles.headerLeft}>
                        <View style={styles.iconContainer}>
                          <IconButton
                            icon="format-list-bulleted"
                            size={20}
                            iconColor="#64748b"
                            style={styles.headerIcon}
                          />
                        </View>
                        <Text style={styles.cardTitle}>Line Items</Text>
                      </View>
                    </View>

                    <View style={styles.cardContent}>
                      {(receipt.line_items as LineItem[]).map(
                        (item: LineItem, index: number) => (
                          <View key={index}>
                            <View style={styles.lineItem}>
                              <View style={styles.lineItemHeader}>
                                <Text style={styles.lineItemName}>
                                  {item.name || "Unnamed Item"}
                                </Text>
                                <Text style={styles.lineItemTotal}>
                                  {formatCurrency(Number(item.totalPrice))}
                                </Text>
                              </View>
                              <View style={styles.lineItemDetails}>
                                <Text style={styles.lineItemQuantity}>
                                  {Number(item.qty)} x{" "}
                                  {formatCurrency(Number(item.unitPrice))}
                                </Text>
                              </View>
                            </View>
                            {index <
                              (receipt.line_items as LineItem[]).length - 1 && (
                              <Divider style={styles.lineItemDivider} />
                            )}
                          </View>
                        )
                      )}
                    </View>
                  </Surface>
                )}

              {/* Receipt Document */}
              {(receipt.receipt_image_path || imageUrl) && (
                <Animated.View entering={FadeIn.delay(600)}>
                  <Surface style={[styles.detailsCard, { marginTop: 24 }]}>
                    <View style={styles.cardHeader}>
                      <View style={styles.headerLeft}>
                        <View style={styles.iconContainer}>
                          <IconButton
                            icon="file-cloud"
                            size={20}
                            iconColor="#64748b"
                            style={styles.headerIcon}
                          />
                        </View>
                        <Text style={styles.cardTitle}>Receipt</Text>
                      </View>
                    </View>

                    <View style={styles.cardContent}>
                      {loadingImage ? (
                        <View style={styles.imageLoadingContainer}>
                          <ActivityIndicator
                            size="large"
                            color={theme.colors.primary}
                          />
                          <Text style={styles.imageLoadingText}>
                            Loading receipt...
                          </Text>
                        </View>
                      ) : imageUrl ? (
                        <View style={styles.imageActions}>
                          <Button
                            mode="contained"
                            icon="open-in-new"
                            onPress={handleViewImage}
                            style={[styles.imageButton, { marginRight: 8 }]}
                          >
                            Open Receipt
                          </Button>
                          <Button
                            mode="outlined"
                            icon={showCopySuccess ? "check" : "content-copy"}
                            onPress={handleCopyLink}
                            style={styles.imageButton}
                          >
                            {showCopySuccess ? "Copied!" : "Copy Link"}
                          </Button>
                        </View>
                      ) : (
                        <Text style={styles.noImageText}>
                          Receipt document not available
                        </Text>
                      )}
                    </View>
                  </Surface>
                </Animated.View>
              )}
            </Animated.View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create<Styles>({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 32,
    alignSelf: "center",
    width: "100%",
  },
  headerSection: {
    marginBottom: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pageTitle: {
    fontSize: Platform.OS === "web" ? 32 : 24,
    fontWeight: "600",
    color: "#1e293b",
    fontFamily: "Poppins-SemiBold",
  },
  gridContainer: {
    flexDirection: "row",
    gap: 24,
    flexWrap: "wrap",
  },
  gridColumn: {
    flex: 1,
    minWidth: 320,
    gap: 24,
  },
  detailsCard: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "rgba(0,0,0,0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerIcon: {
    margin: 0,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    fontFamily: "Poppins-SemiBold",
  },
  cardContent: {
    padding: 24,
    backgroundColor: "#ffffff",
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
    fontFamily: "Poppins-Regular",
  },
  noImageText: {
    fontStyle: "italic",
    color: "#757575",
    textAlign: "center",
    padding: 20,
    fontFamily: "Poppins-Regular",
  },
  actionButtons: {
    marginTop: 32,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  button: {
    minWidth: 120,
    padding: 5,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  imagePreviewContainer: {
    position: "relative",
    width: "100%",
    height: 300,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f1f5f9",
  },
  imageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    opacity: Platform.OS === "web" ? 0 : 1,
  },
  previewHint: {
    color: "#FFFFFF",
    marginTop: 8,
    fontSize: 14,
    fontFamily: "Poppins-Medium",
  },
  imageActions: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 12,
  },
  imageButton: {
    flex: 1,
    maxWidth: 200,
  },
  documentInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    marginBottom: 16,
  },
  documentText: {
    fontSize: 16,
    color: "#475569",
    fontFamily: "Poppins-Regular",
    marginLeft: 8,
  },
  lineItem: {
    marginBottom: 16,
  },
  lineItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  lineItemName: {
    fontSize: 16,
    color: "#1e293b",
    flex: 1,
    marginRight: 16,
    fontFamily: "Poppins-Regular",
  },
  lineItemTotal: {
    fontSize: 16,
    color: "#1e293b",
    fontFamily: "Poppins-Medium",
  },
  lineItemDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  lineItemQuantity: {
    fontSize: 14,
    color: "#64748b",
    fontFamily: "Poppins-Regular",
  },
  lineItemDivider: {
    marginVertical: 16,
  },
});

export default ReceiptDetailsScreen;
