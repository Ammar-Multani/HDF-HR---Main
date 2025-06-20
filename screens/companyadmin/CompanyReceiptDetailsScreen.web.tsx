import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Platform,
  Dimensions,
  Image,
  ImageStyle,
} from "react-native";
import {
  Text,
  useTheme,
  Button,
  IconButton,
  Surface,
  Portal,
  Modal,
  Divider,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import Animated, { FadeIn } from "react-native-reanimated";
import { format } from "date-fns";
import { t } from "i18next";

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

interface Receipt {
  id: string;
  receipt_number: string;
  date: string;
  transaction_date: string;
  merchant_name: string;
  merchant_address?: string;
  total_amount: number;
  tax_amount: number;
  payment_method: string;
  created_at: string;
  receipt_image_path?: string;
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

// Define the navigation param list type
type RootStackParamList = {
  CompanyReceiptDetails: { receiptId: string };
  EditCompanyReceipt: { receiptId: string };
};

type CompanyReceiptDetailsNavigationProp =
  NativeStackNavigationProp<RootStackParamList>;

const CompanyReceiptDetailsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<CompanyReceiptDetailsNavigationProp>();
  const route = useRoute<any>();
  const { receiptId } = route.params;
  const { user } = useAuth();
  const dimensions = useWindowDimensions();

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  useEffect(() => {
    if (companyId) {
      fetchReceipt();
    }
  }, [companyId]);

  const fetchCompanyInfo = async () => {
    if (!user) return;

    try {
      const { data: companyUser, error: companyUserError } = await supabase
        .from("company_user")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (companyUserError) throw companyUserError;

      if (companyUser) {
        setCompanyId(companyUser.company_id);
      }
    } catch (error) {
      console.error("Error fetching company info:", error);
    }
  };

  const fetchReceipt = async () => {
    try {
      const { data, error } = await supabase
        .from("receipts")
        .select("*")
        .eq("id", receiptId)
        .eq("company_id", companyId)
        .single();

      if (error) throw error;

      if (data) {
        setReceipt(data);
      }
    } catch (error) {
      console.error("Error fetching receipt:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleViewImage = () => {
    if (receipt?.receipt_image_path) {
      window.open(receipt.receipt_image_path, "_blank");
    }
  };

  const handleCopyLink = async () => {
    if (receipt?.receipt_image_path) {
      try {
        await navigator.clipboard.writeText(receipt.receipt_image_path);
        setShowCopySuccess(true);
        setTimeout(() => setShowCopySuccess(false), 2000);
      } catch (error) {
        console.error("Error copying link:", error);
      }
    }
  };

  const handleEditReceipt = () => {
    if (receipt) {
      navigation.navigate("EditCompanyReceipt", { receiptId: receipt.id });
    }
  };

  if (loading) {
    return <LoadingIndicator />;
  }

  if (!receipt) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader
          title="Receipt Details"
          showBackButton
          showLogo={false}
          absolute={false}
        />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Receipt not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Receipt Details"
        subtitle="View detailed information about this receipt"
        showBackButton
        showLogo={false}
        absolute={false}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            maxWidth: isLargeScreen ? 1700 : isMediumScreen ? 1100 : "100%",
            paddingHorizontal: isLargeScreen ? 48 : isMediumScreen ? 32 : 16,
          },
        ]}
      >
        <View style={styles.headerSection}>
          <Text style={styles.pageTitle}>{`#${receipt.receipt_number}`}</Text>
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
                    <Text style={styles.cardTitle}>Basic Information</Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Receipt Number</Text>
                    <Text style={styles.detailValue}>
                      {receipt.receipt_number}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Uploaded Date</Text>
                    <Text style={styles.detailValue}>
                      {format(new Date(receipt.created_at), "dd/MM/yyyy")}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Transaction Date</Text>
                    <Text style={styles.detailValue}>
                      {format(new Date(receipt.transaction_date), "dd/MM/yyyy")}
                    </Text>
                  </View>

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Payment Method</Text>
                    <Text style={styles.detailValue}>
                      {receipt.payment_method}
                    </Text>
                  </View>
                </View>
              </Surface>
            </Animated.View>

            <Animated.View entering={FadeIn.delay(200)}>
              <Surface style={styles.detailsCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.headerLeft}>
                    <View style={styles.iconContainer}>
                      <IconButton
                        icon="store"
                        size={20}
                        iconColor="#64748b"
                        style={styles.headerIcon}
                      />
                    </View>
                    <Text style={styles.cardTitle}>Merchant Information</Text>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Merchant Name</Text>
                    <Text style={styles.detailValue}>
                      {receipt.merchant_name}
                    </Text>
                  </View>

                  {receipt.merchant_address && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Address</Text>
                      <Text style={styles.detailValue}>
                        {receipt.merchant_address}
                      </Text>
                    </View>
                  )}

                  {receipt.merchant_phone && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Phone</Text>
                      <Text style={styles.detailValue}>
                        {receipt.merchant_phone}
                      </Text>
                    </View>
                  )}

                  {receipt.merchant_website && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Website</Text>
                      <Text style={styles.detailValue}>
                        {receipt.merchant_website}
                      </Text>
                    </View>
                  )}

                  {receipt.merchant_vat && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>VAT Number</Text>
                      <Text style={styles.detailValue}>
                        {receipt.merchant_vat}
                      </Text>
                    </View>
                  )}
                </View>
              </Surface>
            </Animated.View>
            {receipt.vat_details && (
              <Animated.View entering={FadeIn.delay(500)}>
                <Surface style={styles.detailsCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <View style={styles.iconContainer}>
                        <IconButton
                          icon="percent"
                          size={20}
                          iconColor="#64748b"
                          style={styles.headerIcon}
                        />
                      </View>
                      <Text style={styles.cardTitle}>VAT Details</Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <Text style={styles.vatDetails}>{receipt.vat_details}</Text>
                  </View>
                </Surface>
              </Animated.View>
            )}
            {receipt.receipt_image_path && (
              <Animated.View entering={FadeIn.delay(600)}>
                <Surface style={styles.detailsCard}>
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
                  </View>
                </Surface>
              </Animated.View>
            )}
          </View>

          <View style={styles.gridColumn}>
            <Animated.View entering={FadeIn.delay(300)}>
              <Surface style={styles.detailsCard}>
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
                  {receipt.subtotal_amount && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Subtotal</Text>
                      <Text style={styles.detailValue}>
                        CHF {parseFloat(receipt.subtotal_amount).toFixed(2)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Tax Amount</Text>
                    <Text style={styles.detailValue}>
                      CHF {receipt.tax_amount.toFixed(2)}
                    </Text>
                  </View>

                  {receipt.rounding_amount && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Rounding</Text>
                      <Text style={styles.detailValue}>
                        CHF {parseFloat(receipt.rounding_amount).toFixed(2)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Total Amount</Text>
                    <Text style={[styles.detailValue, styles.totalAmount]}>
                      CHF {receipt.total_amount.toFixed(2)}
                    </Text>
                  </View>

                  {receipt.paid_amount && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Paid Amount</Text>
                      <Text style={styles.detailValue}>
                        CHF {parseFloat(receipt.paid_amount).toFixed(2)}
                      </Text>
                    </View>
                  )}

                  {receipt.change_amount && (
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Change</Text>
                      <Text style={styles.detailValue}>
                        CHF {parseFloat(receipt.change_amount).toFixed(2)}
                      </Text>
                    </View>
                  )}
                </View>
              </Surface>
            </Animated.View>

            {receipt.line_items && receipt.line_items.length > 0 && (
              <Animated.View entering={FadeIn.delay(400)}>
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
                    {receipt.line_items.map((item, index) => (
                      <View key={index}>
                        <View style={styles.lineItem}>
                          <View style={styles.lineItemHeader}>
                            <Text style={styles.lineItemName}>{item.name}</Text>
                            <Text style={styles.lineItemTotal}>
                              CHF {item.totalPrice.toFixed(2)}
                            </Text>
                          </View>
                          <View style={styles.lineItemDetails}>
                            <Text style={styles.lineItemQuantity}>
                              {item.qty} x CHF {item.unitPrice.toFixed(2)}
                            </Text>
                          </View>
                        </View>
                        {index < receipt.line_items!.length - 1 && (
                          <Divider style={styles.lineItemDivider} />
                        )}
                      </View>
                    ))}
                  </View>
                </Surface>
              </Animated.View>
            )}
          </View>
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
    paddingVertical: 32,
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
  pageSubtitle: {
    fontSize: 16,
    color: "#64748b",
    marginTop: 8,
    fontFamily: "Poppins-Regular",
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
    borderWidth: 0.5,
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
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 4,
    fontFamily: "Poppins-Medium",
  },
  detailValue: {
    fontSize: 16,
    color: "#1e293b",
    fontFamily: "Poppins-Regular",
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    fontFamily: "Poppins-SemiBold",
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
  vatDetails: {
    fontSize: 14,
    color: "#1e293b",
    lineHeight: 20,
    fontFamily: "Poppins-Regular",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
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
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  button: {
    flex: 1,
    maxWidth: 200,
  },
});

export default CompanyReceiptDetailsScreen;
