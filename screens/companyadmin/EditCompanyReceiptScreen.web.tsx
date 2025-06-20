import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  IconButton,
  Surface,
  Portal,
  Modal,
  List,
  Divider,
  HelperText,
  ActivityIndicator,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import Animated, { FadeIn } from "react-native-reanimated";
import { t } from "i18next";
import CustomSnackbar from "../../components/CustomSnackbar";
import { ActivityType } from "../../types/activity-log";
import DateTimePicker from "@react-native-community/datetimepicker";

// Define the navigation param list type
type RootStackParamList = {
  EditCompanyReceipt: { receiptId: string };
  CompanyReceiptDetails: { receiptId: string };
};

type EditReceiptNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type EditReceiptRouteProp = RouteProp<RootStackParamList, "EditCompanyReceipt">;

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
  line_items?: LineItem[];
  receipt_image_path?: string;
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

interface LineItem {
  name: string;
  qty: number;
  unitPrice: number;
  totalPrice: number;
}

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

const EditCompanyReceiptScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<EditReceiptNavigationProp>();
  const route = useRoute<EditReceiptRouteProp>();
  const { receiptId } = route.params;
  const dimensions = useWindowDimensions();
  const { user } = useAuth();

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTransactionDatePicker, setShowTransactionDatePicker] =
    useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [canEditReceipts, setCanEditReceipts] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    receipt_number: "",
    date: new Date(),
    transaction_date: new Date(),
    merchant_name: "",
    merchant_address: "",
    total_amount: "0",
    tax_amount: "0",
    payment_method: "",
    language_hint: "",
    subtotal_amount: "0",
    final_price: "0",
    paid_amount: "0",
    change_amount: "0",
    merchant_vat: "",
    merchant_phone: "",
    merchant_website: "",
    vat_details: "",
    line_items: [] as LineItem[],
  });

  // Form validation state
  const [errors, setErrors] = useState({
    receipt_number: "",
    merchant_name: "",
    total_amount: "",
    tax_amount: "",
    payment_method: "",
    subtotal_amount: "",
    final_price: "",
    paid_amount: "",
  });

  const PAYMENT_METHODS = [
    "Credit Card",
    "Debit Card",
    "Cash",
    "Bank Transfer",
    "Check",
    "Other",
  ];

  useEffect(() => {
    const init = async () => {
      await checkPermissionsAndFetchCompanyInfo();
      if (companyId) {
        await fetchReceipt();
      }
    };
    init();
  }, [companyId]);

  const checkPermissionsAndFetchCompanyInfo = async () => {
    if (!user) {
      showSnackbarMessage("User not authenticated", "error");
      navigation.goBack();
      return;
    }

    try {
      const { data: companyUser, error: companyUserError } = await supabase
        .from("company_user")
        .select("company_id, company:company_id(can_upload_receipts)")
        .eq("id", user.id)
        .single();

      if (companyUserError) {
        console.error("Error fetching company user:", companyUserError);
        showSnackbarMessage("Failed to fetch company information", "error");
        navigation.goBack();
        return;
      }

      if (companyUser) {
        setCompanyId(companyUser.company_id);
        // @ts-ignore - The type system doesn't recognize the nested company object structure
        setCanEditReceipts(!!companyUser.company?.can_upload_receipts);
      }
    } catch (error) {
      console.error("Error in permission check:", error);
      showSnackbarMessage(
        "An error occurred while checking permissions",
        "error"
      );
      navigation.goBack();
    }
  };

  // Show snackbar message with type
  const showSnackbarMessage = (
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    let icon = "";
    switch (type) {
      case "success":
        icon = "✓";
        break;
      case "error":
        icon = "✕";
        break;
      case "info":
        icon = "ℹ";
        break;
    }
    setSnackbarMessage(`${icon} ${message}`);
    setSnackbarVisible(true);
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
        // Update form data with receipt data
        setFormData({
          receipt_number: data.receipt_number,
          date: new Date(data.date),
          transaction_date: new Date(data.transaction_date),
          merchant_name: data.merchant_name,
          merchant_address: data.merchant_address || "",
          total_amount: data.total_amount.toString(),
          tax_amount: data.tax_amount.toString(),
          payment_method: data.payment_method,
          language_hint: data.language_hint || "",
          subtotal_amount: (data.subtotal_amount || 0).toString(),
          final_price: (data.final_price || 0).toString(),
          paid_amount: (data.paid_amount || 0).toString(),
          change_amount: (data.change_amount || 0).toString(),
          merchant_vat: data.merchant_vat || "",
          merchant_phone: data.merchant_phone || "",
          merchant_website: data.merchant_website || "",
          vat_details: data.vat_details || "",
          line_items: data.line_items || [],
        });
      }
    } catch (error) {
      console.error("Error fetching receipt:", error);
      showSnackbarMessage("Failed to fetch receipt details", "error");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {
      receipt_number: "",
      merchant_name: "",
      total_amount: "",
      tax_amount: "",
      payment_method: "",
      subtotal_amount: "",
      final_price: "",
      paid_amount: "",
    };

    let isValid = true;

    if (!formData.receipt_number.trim()) {
      newErrors.receipt_number = "Receipt number is required";
      isValid = false;
    }

    if (!formData.merchant_name.trim()) {
      newErrors.merchant_name = "Merchant name is required";
      isValid = false;
    }

    if (!formData.total_amount || isNaN(Number(formData.total_amount))) {
      newErrors.total_amount = "Valid total amount is required";
      isValid = false;
    }

    if (!formData.tax_amount || isNaN(Number(formData.tax_amount))) {
      newErrors.tax_amount = "Valid tax amount is required";
      isValid = false;
    }

    if (!formData.payment_method) {
      newErrors.payment_method = "Payment method is required";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      showSnackbarMessage(
        "Please fill in all required fields correctly",
        "error"
      );
      return;
    }

    if (!canEditReceipts) {
      showSnackbarMessage(
        "You don't have permission to edit receipts",
        "error"
      );
      return;
    }

    try {
      setSaving(true);

      const updatedReceipt = {
        receipt_number: formData.receipt_number,
        date: format(formData.date, "yyyy-MM-dd"),
        transaction_date: format(formData.transaction_date, "yyyy-MM-dd"),
        merchant_name: formData.merchant_name,
        merchant_address: formData.merchant_address,
        total_amount: Number(formData.total_amount),
        tax_amount: Number(formData.tax_amount),
        payment_method: formData.payment_method,
        language_hint: formData.language_hint,
        subtotal_amount: Number(formData.subtotal_amount),
        final_price: Number(formData.final_price),
        paid_amount: Number(formData.paid_amount),
        change_amount: Number(formData.change_amount),
        merchant_vat: formData.merchant_vat,
        merchant_phone: formData.merchant_phone,
        merchant_website: formData.merchant_website,
        vat_details: formData.vat_details,
        line_items: formData.line_items,
      };

      const { error: updateError } = await supabase
        .from("receipts")
        .update(updatedReceipt)
        .eq("id", receiptId)
        .eq("company_id", companyId);

      if (updateError) throw updateError;

      // Log the activity
      const activityLogData = {
        user_id: user?.id,
        activity_type: ActivityType.UPDATE_RECEIPT,
        description: `Receipt "${formData.receipt_number}" was updated`,
        company_id: companyId,
        metadata: {
          receipt_id: receiptId,
          updated_fields: Object.keys(updatedReceipt),
        },
        new_value: updatedReceipt,
        old_value: receipt,
      };

      const { error: activityLogError } = await supabase
        .from("activity_logs")
        .insert([activityLogData]);

      if (activityLogError) {
        console.error("Error logging activity:", activityLogError);
      }

      showSnackbarMessage(
        "Receipt updated successfully! Redirecting...",
        "success"
      );

      setTimeout(() => {
        navigation.navigate("CompanyReceiptDetails", { receiptId });
      }, 1500);
    } catch (error) {
      console.error("Error updating receipt:", error);
      showSnackbarMessage("Failed to update receipt", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (event: any) => {
    if (Platform.OS === "web") {
      const selectedDate = new Date(event.target.value);
      setFormData({ ...formData, date: selectedDate });
    } else {
      if (event.type === "set" && event.nativeEvent?.timestamp) {
        setFormData({
          ...formData,
          date: new Date(event.nativeEvent.timestamp),
        });
      }
      setShowDatePicker(false);
    }
  };

  const handleTransactionDateChange = (event: any) => {
    if (Platform.OS === "web") {
      const selectedDate = new Date(event.target.value);
      setFormData({ ...formData, transaction_date: selectedDate });
    } else {
      if (event.type === "set" && event.nativeEvent?.timestamp) {
        setFormData({
          ...formData,
          transaction_date: new Date(event.nativeEvent.timestamp),
        });
      }
      setShowTransactionDatePicker(false);
    }
  };

  const handleAddLineItem = () => {
    setFormData({
      ...formData,
      line_items: [
        ...formData.line_items,
        { name: "", qty: 0, unitPrice: 0, totalPrice: 0 },
      ],
    });
  };

  const handleUpdateLineItem = (
    index: number,
    field: keyof LineItem,
    value: string | number
  ) => {
    const updatedItems = [...formData.line_items];
    if (field === "qty" || field === "unitPrice") {
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: Number(value) || 0,
      };
      // Update total price when quantity or unit price changes
      updatedItems[index].totalPrice =
        (updatedItems[index].qty || 0) * (updatedItems[index].unitPrice || 0);
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value,
      };
    }
    setFormData({ ...formData, line_items: updatedItems });
  };

  const handleRemoveLineItem = (index: number) => {
    const updatedItems = [...formData.line_items];
    updatedItems.splice(index, 1);
    setFormData({ ...formData, line_items: updatedItems });
  };

  // if (!canEditReceipts) {
  //   return (
  //     <SafeAreaView style={styles.container}>
  //       <AppHeader
  //         title="Edit Receipt"
  //         subtitle="Update receipt information"
  //         showBackButton
  //         showLogo={false}
  //       />
  //       <View style={styles.content}>
  //         <Text>You don't have permission to edit receipts.</Text>
  //       </View>
  //     </SafeAreaView>
  //   );
  // }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Edit Receipt"
        subtitle="Update receipt information"
        showBackButton
        showLogo={false}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              maxWidth: isLargeScreen ? 1400 : isMediumScreen ? 1100 : "100%",
              paddingHorizontal: isLargeScreen ? 48 : isMediumScreen ? 32 : 16,
            },
          ]}
        >
          {loading ? (
            <LoadingIndicator />
          ) : (
            <>
              <View style={styles.headerSection}>
                <Text style={styles.pageTitle}>Edit Receipt</Text>
                <Text style={styles.pageSubtitle}>
                  Update receipt information and details
                </Text>
              </View>

              <View style={styles.gridContainer}>
                <View style={styles.gridColumn}>
                  {/* Basic Information Section */}
                  <Animated.View entering={FadeIn.delay(100)}>
                    <Surface style={styles.formCard}>
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
                          <Text style={styles.cardTitle}>
                            Basic Information
                          </Text>
                        </View>
                      </View>
                      <View style={styles.cardContent}>
                        <TextInput
                          label="Receipt Number *"
                          mode="outlined"
                          value={formData.receipt_number}
                          onChangeText={(text) =>
                            setFormData({ ...formData, receipt_number: text })
                          }
                          error={!!errors.receipt_number}
                          style={styles.input}
                          placeholder="e.g., WF-2024-01-15-1234"
                        />
                        <HelperText
                          type="error"
                          visible={!!errors.receipt_number}
                        >
                          {errors.receipt_number}
                        </HelperText>

                        {Platform.OS === "web" ? (
                          <>
                            <Text style={styles.inputLabel}>
                              Transaction Date *
                            </Text>
                            <View style={styles.webDateInputContainer}>
                              <input
                                type="date"
                                value={format(
                                  formData.transaction_date,
                                  "yyyy-MM-dd"
                                )}
                                onChange={handleTransactionDateChange}
                                style={{
                                  width: "100%",
                                  padding: "12px",
                                  fontSize: "14px",
                                  borderRadius: "8px",
                                  border: "1px solid #e2e8f0",
                                  outline: "none",
                                  backgroundColor: "#f8fafc",
                                  transition: "all 0.2s ease",
                                  cursor: "pointer",  }}
                              />
                            </View>
                          </>
                        ) : (
                          <>
                            <Button
                              mode="outlined"
                              onPress={() => setShowDatePicker(true)}
                              style={styles.dateButton}
                              icon="calendar"
                            >
                              {format(formData.date, "MMMM d, yyyy")}
                            </Button>
                            {showDatePicker && (
                              <DateTimePicker
                                value={formData.date}
                                mode="date"
                                display="default"
                                onChange={handleDateChange}
                              />
                            )}

                            <Button
                              mode="outlined"
                              onPress={() => setShowTransactionDatePicker(true)}
                              style={styles.dateButton}
                              icon="calendar"
                            >
                              {format(
                                formData.transaction_date,
                                "MMMM d, yyyy"
                              )}
                            </Button>
                            {showTransactionDatePicker && (
                              <DateTimePicker
                                value={formData.transaction_date}
                                mode="date"
                                display="default"
                                onChange={handleTransactionDateChange}
                              />
                            )}
                          </>
                        )}

                        <TextInput
                          label="Merchant Name *"
                          mode="outlined"
                          value={formData.merchant_name}
                          onChangeText={(text) =>
                            setFormData({ ...formData, merchant_name: text })
                          }
                          error={!!errors.merchant_name}
                          style={styles.input}
                        />
                        <HelperText
                          type="error"
                          visible={!!errors.merchant_name}
                        >
                          {errors.merchant_name}
                        </HelperText>

                        <TextInput
                          label="Merchant Address"
                          mode="outlined"
                          value={formData.merchant_address}
                          onChangeText={(text) =>
                            setFormData({ ...formData, merchant_address: text })
                          }
                          style={styles.input}
                          multiline
                          numberOfLines={3}
                        />

                        <TextInput
                          label="Phone Number"
                          mode="outlined"
                          value={formData.merchant_phone}
                          onChangeText={(text) =>
                            setFormData({ ...formData, merchant_phone: text })
                          }
                          style={styles.input}
                        />

                        <TextInput
                          label="Website"
                          mode="outlined"
                          value={formData.merchant_website}
                          onChangeText={(text) =>
                            setFormData({ ...formData, merchant_website: text })
                          }
                          style={styles.input}
                        />

                        <TextInput
                          label="Merchant VAT Number"
                          mode="outlined"
                          value={formData.merchant_vat}
                          onChangeText={(text) =>
                            setFormData({ ...formData, merchant_vat: text })
                          }
                          style={styles.input}
                        />

                        <TextInput
                          label="VAT Details"
                          mode="outlined"
                          value={formData.vat_details}
                          onChangeText={(text) =>
                            setFormData({ ...formData, vat_details: text })
                          }
                          style={styles.input}
                          multiline
                          numberOfLines={4}
                        />
                      </View>
                    </Surface>
                  </Animated.View>
                </View>
                <View style={styles.gridColumn}>
                  {/* Upload Section */}
                  {/* <Animated.View entering={FadeIn.delay(200)}>
                    <Surface style={[styles.formCard, styles.stepCard]}>
                      <View style={styles.stepHeader}>
                        <View style={styles.stepNumberContainer}>
                          <Text style={styles.stepNumber}>1</Text>
                        </View>
                        <Text style={styles.stepTitle}>Receipt Image</Text>
                      </View>
                      <View style={styles.cardContent}>
                        <Text style={styles.stepDescription}>
                          View or update receipt image
                        </Text>
                       
                      </View>
                    </Surface>
                  </Animated.View> */}

                  {/* Line Items Section */}
                  <Animated.View entering={FadeIn.delay(200)}>
                    <Surface style={[styles.formCard]}>
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
                        {formData.line_items.map((item, index) => (
                          <View key={index} style={styles.lineItem}>
                            <TextInput
                              label="Item Name"
                              mode="outlined"
                              value={item.name || ""}
                              onChangeText={(text) =>
                                handleUpdateLineItem(index, "name", text)
                              }
                              style={[styles.input, styles.lineItemInput]}
                            />
                            <TextInput
                              label="Qty"
                              mode="outlined"
                              value={String(item.qty || 0)}
                              onChangeText={(text) =>
                                handleUpdateLineItem(index, "qty", text)
                              }
                              keyboardType="numeric"
                              style={[styles.input, styles.qtyInput]}
                            />
                            <TextInput
                              label="Unit Price"
                              mode="outlined"
                              value={String(item.unitPrice || 0)}
                              onChangeText={(text) =>
                                handleUpdateLineItem(index, "unitPrice", text)
                              }
                              keyboardType="decimal-pad"
                              style={[styles.input, styles.priceInput]}
                              left={<TextInput.Affix text="CHF" />}
                            />
                            <TextInput
                              label="Total Price"
                              mode="outlined"
                              value={String(item.totalPrice || 0)}
                              editable={false}
                              style={[styles.input, styles.priceInput]}
                              left={<TextInput.Affix text="CHF" />}
                            />
                            <IconButton
                              icon="delete"
                              size={24}
                              onPress={() => handleRemoveLineItem(index)}
                              iconColor={theme.colors.error}
                            />
                          </View>
                        ))}
                        <Button
                          mode="outlined"
                          onPress={handleAddLineItem}
                          style={styles.addItemButton}
                          icon="plus"
                        >
                          Add Line Item
                        </Button>
                      </View>
                    </Surface>
                  </Animated.View>

                  {/* Financial Details Section */}
                  <Animated.View entering={FadeIn.delay(200)}>
                    <Surface style={[styles.formCard]}>
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
                          <Text style={styles.cardTitle}>
                            Financial Details
                          </Text>
                        </View>
                      </View>
                      <View style={styles.cardContent}>
                        <TextInput
                          label="Subtotal Amount"
                          mode="outlined"
                          value={formData.subtotal_amount}
                          onChangeText={(text) =>
                            setFormData({ ...formData, subtotal_amount: text })
                          }
                          keyboardType="decimal-pad"
                          style={styles.input}
                          error={!!errors.subtotal_amount}
                          left={<TextInput.Affix text="CHF" />}
                        />
                        <HelperText
                          type="error"
                          visible={!!errors.subtotal_amount}
                        >
                          {errors.subtotal_amount}
                        </HelperText>

                        <TextInput
                          label="Final Price"
                          mode="outlined"
                          value={formData.final_price}
                          onChangeText={(text) =>
                            setFormData({ ...formData, final_price: text })
                          }
                          keyboardType="decimal-pad"
                          style={styles.input}
                          error={!!errors.final_price}
                          left={<TextInput.Affix text="CHF" />}
                        />
                        <HelperText type="error" visible={!!errors.final_price}>
                          {errors.final_price}
                        </HelperText>

                        <TextInput
                          label="Total Amount *"
                          mode="outlined"
                          value={formData.total_amount}
                          onChangeText={(text) =>
                            setFormData({ ...formData, total_amount: text })
                          }
                          keyboardType="decimal-pad"
                          error={!!errors.total_amount}
                          style={styles.input}
                          left={<TextInput.Affix text="CHF" />}
                        />
                        <HelperText
                          type="error"
                          visible={!!errors.total_amount}
                        >
                          {errors.total_amount}
                        </HelperText>

                        <TextInput
                          label="Tax Amount *"
                          mode="outlined"
                          value={formData.tax_amount}
                          onChangeText={(text) =>
                            setFormData({ ...formData, tax_amount: text })
                          }
                          keyboardType="decimal-pad"
                          error={!!errors.tax_amount}
                          style={styles.input}
                          left={<TextInput.Affix text="CHF" />}
                        />
                        <HelperText type="error" visible={!!errors.tax_amount}>
                          {errors.tax_amount}
                        </HelperText>

                        <TextInput
                          label="Paid Amount"
                          mode="outlined"
                          value={formData.paid_amount}
                          onChangeText={(text) =>
                            setFormData({ ...formData, paid_amount: text })
                          }
                          keyboardType="decimal-pad"
                          style={styles.input}
                          left={<TextInput.Affix text="CHF" />}
                        />

                        <TextInput
                          label="Change Amount"
                          mode="outlined"
                          value={formData.change_amount}
                          onChangeText={(text) =>
                            setFormData({ ...formData, change_amount: text })
                          }
                          keyboardType="decimal-pad"
                          style={styles.input}
                          left={<TextInput.Affix text="CHF" />}
                        />

                        <Button
                          mode="outlined"
                          onPress={() => setShowPaymentMethodModal(true)}
                          style={styles.selectButton}
                          icon="credit-card"
                        >
                          {formData.payment_method || "Select Payment Method"}
                        </Button>
                        <HelperText
                          type="error"
                          visible={!!errors.payment_method}
                        >
                          {errors.payment_method}
                        </HelperText>
                      </View>
                    </Surface>
                  </Animated.View>
                </View>
              </View>
            </>
          )}
        </ScrollView>

        <Surface style={styles.bottomBar}>
          <View style={styles.bottomBarContent}>
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={[styles.button, styles.cancelButton]}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSave}
              style={[styles.button, styles.saveButton]}
              disabled={saving}
              buttonColor={theme.colors.primary}
            >
              {saving ? (
                <ActivityIndicator color={theme.colors.surface} />
              ) : (
                "Save Changes"
              )}
            </Button>
          </View>
        </Surface>

        {/* Payment Method Modal */}
        <Portal>
          <Modal
            visible={showPaymentMethodModal}
            onDismiss={() => setShowPaymentMethodModal(false)}
            contentContainerStyle={[
              styles.modal,
              {
                width: isLargeScreen ? 480 : isMediumScreen ? 420 : "90%",
                alignSelf: "center",
              },
            ]}
          >
            <Text style={styles.modalTitle}>Select Payment Method</Text>
            <ScrollView style={{ maxHeight: 400 }}>
              {PAYMENT_METHODS.map((method) => (
                <React.Fragment key={method}>
                  <List.Item
                    title={method}
                    onPress={() => {
                      setFormData({ ...formData, payment_method: method });
                      setShowPaymentMethodModal(false);
                    }}
                    right={(props) =>
                      formData.payment_method === method ? (
                        <List.Icon {...props} icon="check" />
                      ) : null
                    }
                  />
                  <Divider />
                </React.Fragment>
              ))}
            </ScrollView>
          </Modal>
        </Portal>

        <CustomSnackbar
          visible={snackbarVisible}
          message={snackbarMessage}
          onDismiss={() => setSnackbarVisible(false)}
          type={
            snackbarMessage.startsWith("✓")
              ? "success"
              : snackbarMessage.startsWith("✕")
                ? "error"
                : "info"
          }
          duration={6000}
          action={{
            label: t("common.ok"),
            onPress: () => setSnackbarVisible(false),
          }}
          style={[
            styles.snackbar,
            {
              width: Platform.OS === "web" ? 700 : undefined,
              alignSelf: "center",
              position: Platform.OS === "web" ? "absolute" : undefined,
              bottom: Platform.OS === "web" ? 24 : undefined,
            },
          ]}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 32,
  },
  headerSection: {
    marginBottom: 32,
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
  formCard: {
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
  },
  input: {
    marginBottom: 8,
    backgroundColor: "#FFFFFF",
  },
  inputLabel: {
    fontSize: 12,
    color: "#1e293b",
    marginBottom: 4,
    fontFamily: "Poppins-Regular",
  },
  webDateInputContainer: {
    marginBottom: 16,
    marginRight: 26,
  },
  webDateInput: {
    width: "100%",
    padding: 12,
    fontSize: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
    transition: "all 0.2s ease",
    cursor: "pointer",
  },
  dateButton: {
    marginVertical: 8,
  },
  selectButton: {
    marginVertical: 8,
  },
  lineItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  lineItemInput: {
    flex: 2,
  },
  qtyInput: {
    flex: 0.5,
  },
  priceInput: {
    flex: 1,
  },
  addItemButton: {
    marginTop: 16,
  },
  bottomBar: {
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    padding: 16,
  },
  bottomBarContent: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    maxWidth: 1400,
    marginHorizontal: "auto",
    width: "100%",
  },
  button: {
    minWidth: 120,
  },
  cancelButton: {
    borderColor: "#e2e8f0",
  },
  saveButton: {},
  modal: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    color: "#1e293b",
    fontFamily: "Poppins-SemiBold",
  },
  snackbar: {
    marginBottom: 16,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
  },
  stepCard: {
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
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  stepNumberContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    fontFamily: "Poppins-SemiBold",
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    fontFamily: "Poppins-SemiBold",
  },
  stepDescription: {
    fontSize: 12,
    color: "#64748b",
    fontFamily: "Poppins-Regular",
  },
});

export default EditCompanyReceiptScreen;
