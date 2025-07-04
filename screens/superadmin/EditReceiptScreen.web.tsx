import React, { useState, useEffect } from "react";
import { logDebug } from "../../utils/logger";
import {
  StyleSheet,
  View,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Surface,
  IconButton,
  HelperText,
  ActivityIndicator,
  Portal,
  Modal,
  List,
  Divider,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import Animated, { FadeIn } from "react-native-reanimated";
import { useAuth } from "../../contexts/AuthContext";
import { ActivityType } from "../../types/activity-log";

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
  EditReceipt: { receiptId: string };
  ReceiptDetails: { receiptId: string };
};

type EditReceiptNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type EditReceiptRouteProp = RouteProp<RootStackParamList, "EditReceipt">;

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
}

interface LineItem {
  name: string;
  qty: number;
  price: number;
}

interface Company {
  id: string;
  company_name: string;
}

const EditReceiptScreen = () => {
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
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTransactionDatePicker, setShowTransactionDatePicker] =
    useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);

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
    company_id: "",
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
    company_id: "",
    subtotal_amount: "",
    final_price: "",
    paid_amount: "",
  });

  const paymentMethods = [
    "Cash",
    "Credit Card",
    "Debit Card",
    "Bank Transfer",
    "Check",
    "Other",
  ];

  useEffect(() => {
    fetchReceipt();
    fetchCompanies();
  }, [receiptId]);

  const fetchReceipt = async () => {
    try {
      const { data, error } = await supabase
        .from("receipts")
        .select("*")
        .eq("id", receiptId)
        .single();

      if (error) throw error;

      if (data) {
        setReceipt(data);
        setFormData({
          receipt_number: data.receipt_number || "",
          date: new Date(data.date),
          transaction_date: new Date(data.transaction_date || data.date),
          merchant_name: data.merchant_name || "",
          merchant_address: data.merchant_address || "",
          total_amount: (data.total_amount || 0).toString(),
          tax_amount: (data.tax_amount || 0).toString(),
          payment_method: data.payment_method || "",
          company_id: data.company_id || "",
          language_hint: data.language_hint || "",
          subtotal_amount: (data.subtotal_amount || 0).toString(),
          final_price: (data.final_price || 0).toString(),
          paid_amount: (data.paid_amount || 0).toString(),
          change_amount: (data.change_amount || 0).toString(),
          merchant_vat: data.merchant_vat || "",
          merchant_phone: data.merchant_phone || "",
          merchant_website: data.merchant_website || "",
          vat_details: data.vat_details || "",
          line_items: Array.isArray(data.line_items)
            ? data.line_items.map((item: LineItem) => ({
                name: item.name || "",
                qty: item.qty || 0,
                price: item.price || 0,
              }))
            : [],
        });
      }
    } catch (error) {
      console.error("Error fetching receipt:", error);
      Alert.alert("Error", "Failed to load receipt details");
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("company")
        .select("id, company_name")
        .eq("active", true);

      if (error) throw error;
      setCompanies(data || []);
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const validateForm = () => {
    const newErrors = {
      receipt_number: "",
      merchant_name: "",
      total_amount: "",
      tax_amount: "",
      payment_method: "",
      company_id: "",
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

    if (!formData.subtotal_amount || isNaN(Number(formData.subtotal_amount))) {
      newErrors.subtotal_amount = "Valid subtotal amount is required";
      isValid = false;
    }

    if (!formData.final_price || isNaN(Number(formData.final_price))) {
      newErrors.final_price = "Valid final price is required";
      isValid = false;
    }

    if (!formData.paid_amount || isNaN(Number(formData.paid_amount))) {
      newErrors.paid_amount = "Valid paid amount is required";
      isValid = false;
    }

    if (!formData.payment_method) {
      newErrors.payment_method = "Payment method is required";
      isValid = false;
    }

    if (!formData.company_id) {
      newErrors.company_id = "Company is required";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      Alert.alert("Error", "Please fill in all required fields correctly");
      return;
    }

    try {
      setSaving(true);

      // Get the current admin user
      const { data: adminUser, error: adminError } = await supabase
        .from("admin")
        .select("id, name, email, role, status")
        .eq("email", user?.email)
        .single();

      logDebug("Admin query result:", { adminUser, adminError });

      if (!adminUser || adminUser.role !== "superadmin" || !adminUser.status) {
        console.error("User validation failed:", {
          exists: !!adminUser,
          role: adminUser?.role,
          status: adminUser?.status,
        });
        Alert.alert(
          "Error",
          "Could not verify super admin credentials. Please ensure you are logged in with the correct permissions."
        );
        return;
      }

      const updatedReceipt = {
        receipt_number: formData.receipt_number,
        date: format(formData.date, "yyyy-MM-dd"),
        transaction_date: format(formData.transaction_date, "yyyy-MM-dd"),
        merchant_name: formData.merchant_name,
        merchant_address: formData.merchant_address,
        total_amount: Number(formData.total_amount),
        tax_amount: Number(formData.tax_amount),
        payment_method: formData.payment_method,
        company_id: formData.company_id,
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

      // Get the current company name
      const { data: companyData } = await supabase
        .from("company")
        .select("company_name")
        .eq("id", formData.company_id)
        .single();

      // Track changes
      const changes: string[] = [];
      if (receipt) {
        if (receipt.receipt_number !== updatedReceipt.receipt_number) {
          changes.push("receipt number");
        }
        if (receipt.date !== updatedReceipt.date) {
          changes.push("date");
        }
        if (receipt.merchant_name !== updatedReceipt.merchant_name) {
          changes.push("merchant name");
        }
        if (receipt.merchant_address !== updatedReceipt.merchant_address) {
          changes.push("merchant address");
        }
        if (receipt.total_amount !== updatedReceipt.total_amount) {
          changes.push("total amount");
        }
        if (receipt.tax_amount !== updatedReceipt.tax_amount) {
          changes.push("tax amount");
        }
        if (receipt.payment_method !== updatedReceipt.payment_method) {
          changes.push("payment method");
        }
        if (
          JSON.stringify(receipt.line_items) !==
          JSON.stringify(updatedReceipt.line_items)
        ) {
          changes.push("line items");
        }
      }

      const { error } = await supabase
        .from("receipts")
        .update(updatedReceipt)
        .eq("id", receiptId);

      if (error) throw error;

      // Log the activity
      const activityLogData = {
        user_id: adminUser.id,
        activity_type: ActivityType.UPDATE_RECEIPT,
        description: `Receipt "${updatedReceipt.receipt_number}" was updated${companyData ? ` in company "${companyData.company_name}"` : ""}${changes.length > 0 ? `. Changes: ${changes.join(", ")}` : ""}`,
        company_id: formData.company_id,
        metadata: {
          created_by: {
            id: adminUser.id,
            name: adminUser.name,
            email: adminUser.email,
            role: adminUser.role,
          },
          company: companyData
            ? {
                id: formData.company_id,
                name: companyData.company_name,
              }
            : undefined,
          changes,
        },
        old_value: receipt,
        new_value: updatedReceipt,
      };

      const { error: activityLogError } = await supabase
        .from("activity_logs")
        .insert([activityLogData]);

      if (activityLogError) {
        console.error("Error logging activity:", activityLogError);
      }

      Alert.alert("Success", "Receipt updated successfully", [
        {
          text: "OK",
          onPress: () =>
            navigation.navigate("ReceiptDetails", { receiptId: receiptId }),
        },
      ]);
    } catch (error) {
      console.error("Error updating receipt:", error);
      Alert.alert("Error", "Failed to update receipt");
    } finally {
      setSaving(false);
    }
  };

  const handleAddLineItem = () => {
    setFormData({
      ...formData,
      line_items: [...formData.line_items, { name: "", qty: 1, price: 0 }],
    });
  };

  const handleUpdateLineItem = (
    index: number,
    field: keyof LineItem,
    value: string | number
  ) => {
    const updatedLineItems = [...formData.line_items];
    updatedLineItems[index] = {
      ...updatedLineItems[index],
      [field]: field === "name" ? value : Number(value) || 0,
    };
    setFormData({ ...formData, line_items: updatedLineItems });
  };

  const handleRemoveLineItem = (index: number) => {
    const updatedLineItems = formData.line_items.filter((_, i) => i !== index);
    setFormData({ ...formData, line_items: updatedLineItems });
  };

  const handleDateChange = (event: any) => {
    if (Platform.OS === "web") {
      const selectedDate = new Date(event.target.value);
      setFormData({ ...formData, date: selectedDate });
    } else {
      setShowDatePicker(false);
      if (event.type === "set" && event.nativeEvent.timestamp) {
        setFormData({
          ...formData,
          date: new Date(event.nativeEvent.timestamp),
        });
      }
    }
  };

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Edit Receipt"
        subtitle="Update receipt information"
        showBackButton={true}
        showLogo={false}
        showHelpButton={true}
        absolute={false}
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
          <View style={styles.headerSection}>
            <Text style={styles.pageTitle}>
              Edit Receipt #{formData.receipt_number}
            </Text>
          </View>

          <View style={styles.gridContainer}>
            <View style={styles.gridColumn}>
              <Animated.View entering={FadeIn.delay(100)}>
                {/* Basic Information */}
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
                      <Text style={styles.cardTitle}>Basic Information</Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <TextInput
                      label="Receipt Number"
                      value={formData.receipt_number}
                      onChangeText={(text) =>
                        setFormData({ ...formData, receipt_number: text })
                      }
                      style={styles.input}
                      error={!!errors.receipt_number}
                      mode="outlined"
                    />
                    <HelperText type="error" visible={!!errors.receipt_number}>
                      {errors.receipt_number}
                    </HelperText>

                    {Platform.OS === "web" ? (
                      <>


                        <View style={styles.dateInputWrapper}>
                          <Text style={styles.inputLabel}>
                            Transaction Date
                          </Text>
                          <View style={styles.webDateInputContainer}>
                            <input
                              type="date"
                              value={format(
                                formData.transaction_date,
                                "yyyy-MM-dd"
                              )}
                              onChange={(e) => {
                                const selectedDate = new Date(e.target.value);
                                setFormData({
                                  ...formData,
                                  transaction_date: selectedDate,
                                });
                              }}
                              style={{
                                width: "100%",
                                padding: "12px",
                                fontSize: "14px",
                                borderRadius: "8px",
                                border: "1px solid #e2e8f0",
                                outline: "none",
                                backgroundColor: "#f8fafc",
                                transition: "all 0.2s ease",
                                cursor: "pointer",
                              }}
                            />
                          </View>
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

                        <Button
                          mode="outlined"
                          onPress={() => setShowTransactionDatePicker(true)}
                          style={styles.dateButton}
                          icon="calendar"
                        >
                          Transaction Date:{" "}
                          {format(formData.transaction_date, "MMMM d, yyyy")}
                        </Button>


                        {showTransactionDatePicker && (
                            <DateTimePicker
                              value={formData.transaction_date}
                              mode="date"
                              display="default"
                              onChange={(event, selectedDate) => {
                              setShowTransactionDatePicker(false);
                              if (selectedDate) {
                                setFormData({
                                  ...formData,
                                  transaction_date: selectedDate,
                                });
                                }
                              }}
                            />
                        )}
                      </>
                    )}

                    <TextInput
                      label="Merchant Name"
                      value={formData.merchant_name}
                      onChangeText={(text) =>
                        setFormData({ ...formData, merchant_name: text })
                      }
                      style={styles.input}
                      error={!!errors.merchant_name}
                      mode="outlined"
                    />
                    <HelperText type="error" visible={!!errors.merchant_name}>
                      {errors.merchant_name}
                    </HelperText>

                    <TextInput
                      label="Merchant Address"
                      value={formData.merchant_address}
                      onChangeText={(text) =>
                        setFormData({ ...formData, merchant_address: text })
                      }
                      style={styles.input}
                      multiline
                      numberOfLines={3}
                      mode="outlined"
                    />

                    <TextInput
                      label="Merchant VAT/Tax Number"
                      value={formData.merchant_vat}
                      onChangeText={(text) =>
                        setFormData({ ...formData, merchant_vat: text })
                      }
                      style={styles.input}
                      mode="outlined"
                    />

                    <TextInput
                      label="Merchant Phone"
                      value={formData.merchant_phone}
                      onChangeText={(text) =>
                        setFormData({ ...formData, merchant_phone: text })
                      }
                      style={styles.input}
                      mode="outlined"
                    />

                    <TextInput
                      label="Merchant Website"
                      value={formData.merchant_website}
                      onChangeText={(text) =>
                        setFormData({ ...formData, merchant_website: text })
                      }
                      style={styles.input}
                      mode="outlined"
                    />

                    <TextInput
                      label="Language Hint"
                      value={formData.language_hint}
                      onChangeText={(text) =>
                        setFormData({ ...formData, language_hint: text })
                      }
                      style={styles.input}
                      mode="outlined"
                    />
                  </View>
                </Surface>

                {/* Financial Details */}
                <Surface style={[styles.formCard, { marginTop: 24 }]}>
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
                    <TextInput
                      label="Subtotal Amount"
                      value={formData.subtotal_amount}
                      onChangeText={(text) =>
                        setFormData({ ...formData, subtotal_amount: text })
                      }
                      keyboardType="decimal-pad"
                      style={styles.input}
                      error={!!errors.subtotal_amount}
                      mode="outlined"
                    />
                    <HelperText type="error" visible={!!errors.subtotal_amount}>
                      {errors.subtotal_amount}
                    </HelperText>

                    <TextInput
                      label="Tax Amount"
                      value={formData.tax_amount}
                      onChangeText={(text) =>
                        setFormData({ ...formData, tax_amount: text })
                      }
                      keyboardType="decimal-pad"
                      style={styles.input}
                      error={!!errors.tax_amount}
                      mode="outlined"
                    />
                    <HelperText type="error" visible={!!errors.tax_amount}>
                      {errors.tax_amount}
                    </HelperText>

                    <TextInput
                      label="Total Amount"
                      value={formData.total_amount}
                      onChangeText={(text) =>
                        setFormData({ ...formData, total_amount: text })
                      }
                      keyboardType="decimal-pad"
                      style={styles.input}
                      error={!!errors.total_amount}
                      mode="outlined"
                    />
                    <HelperText type="error" visible={!!errors.total_amount}>
                      {errors.total_amount}
                    </HelperText>

                    <TextInput
                      label="Final Price"
                      value={formData.final_price}
                      onChangeText={(text) =>
                        setFormData({ ...formData, final_price: text })
                      }
                      keyboardType="decimal-pad"
                      style={styles.input}
                      error={!!errors.final_price}
                      mode="outlined"
                    />
                    <HelperText type="error" visible={!!errors.final_price}>
                      {errors.final_price}
                    </HelperText>

                    <TextInput
                      label="Paid Amount"
                      value={formData.paid_amount}
                      onChangeText={(text) =>
                        setFormData({ ...formData, paid_amount: text })
                      }
                      keyboardType="decimal-pad"
                      style={styles.input}
                      error={!!errors.paid_amount}
                      mode="outlined"
                    />
                    <HelperText type="error" visible={!!errors.paid_amount}>
                      {errors.paid_amount}
                    </HelperText>

                    <TextInput
                      label="Change Amount"
                      value={formData.change_amount}
                      onChangeText={(text) =>
                        setFormData({ ...formData, change_amount: text })
                      }
                      keyboardType="decimal-pad"
                      style={styles.input}
                      mode="outlined"
                    />

                    <TextInput
                      label="VAT Details"
                      value={formData.vat_details}
                      onChangeText={(text) =>
                        setFormData({ ...formData, vat_details: text })
                      }
                      style={styles.input}
                      multiline
                      numberOfLines={3}
                      mode="outlined"
                    />

                    <Button
                      mode="outlined"
                      onPress={() => setShowPaymentMethodModal(true)}
                      style={styles.selectButton}
                      icon="credit-card"
                    >
                      {formData.payment_method || "Select Payment Method"}
                    </Button>
                    <HelperText type="error" visible={!!errors.payment_method}>
                      {errors.payment_method}
                    </HelperText>
                  </View>
                </Surface>
              </Animated.View>
            </View>

            <View style={styles.gridColumn}>
              <Animated.View entering={FadeIn.delay(200)}>
                {/* Company Section */}
                <Surface style={styles.formCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <View style={styles.iconContainer}>
                        <IconButton
                          icon="domain"
                          size={20}
                          iconColor="#64748b"
                          style={styles.headerIcon}
                        />
                      </View>
                      <Text style={styles.cardTitle}>Company</Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <Button
                      mode="outlined"
                      onPress={() => setShowCompanyModal(true)}
                      style={styles.selectButton}
                      icon="office-building"
                    >
                      {companies.find((c) => c.id === formData.company_id)
                        ?.company_name || "Select Company"}
                    </Button>
                    <HelperText type="error" visible={!!errors.company_id}>
                      {errors.company_id}
                    </HelperText>
                  </View>
                </Surface>

                {/* Line Items */}
                <Surface style={[styles.formCard, { marginTop: 24 }]}>
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
                          value={item.name}
                          onChangeText={(text) =>
                            handleUpdateLineItem(index, "name", text)
                          }
                          style={[styles.input, styles.lineItemInput]}
                          mode="outlined"
                        />
                        <TextInput
                          label="Qty"
                          value={item.qty.toString()}
                          onChangeText={(text) =>
                            handleUpdateLineItem(index, "qty", text)
                          }
                          keyboardType="numeric"
                          style={[styles.input, styles.qtyInput]}
                          mode="outlined"
                        />
                        <TextInput
                          label="Price"
                          value={item.price.toString()}
                          onChangeText={(text) =>
                            handleUpdateLineItem(index, "price", text)
                          }
                          keyboardType="decimal-pad"
                          style={[styles.input, styles.priceInput]}
                          mode="outlined"
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
            </View>
          </View>
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
      </KeyboardAvoidingView>

      {/* Company Selection Modal */}
      <Portal>
        <Modal
          visible={showCompanyModal}
          onDismiss={() => setShowCompanyModal(false)}
          contentContainerStyle={[
            styles.modal,
            {
              width: isLargeScreen ? 480 : isMediumScreen ? 420 : "90%",
              alignSelf: "center",
            },
          ]}
        >
          <Text style={styles.modalTitle}>Select Company</Text>
          <ScrollView style={{ maxHeight: 400 }}>
            {companies.map((company) => (
              <React.Fragment key={company.id}>
                <List.Item
                  title={company.company_name}
                  onPress={() => {
                    setFormData({ ...formData, company_id: company.id });
                    setShowCompanyModal(false);
                  }}
                  right={(props) =>
                    formData.company_id === company.id ? (
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
            {paymentMethods.map((method) => (
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
    alignSelf: "center",
    width: "100%",
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
  cancelButton: {},
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
  webDateInputContainer: {
    width: "100%",
    marginBottom: 10,
  },
  dateInputWrapper: {
    marginBottom: 16,
    marginRight: 26,
  },
  inputLabel: {
    fontSize: 12,
    color: "#1e293b",
    fontFamily: "Poppins-Regular",
    marginBottom: 4,
  },
});

export default EditReceiptScreen;
