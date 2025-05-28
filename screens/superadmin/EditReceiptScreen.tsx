import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
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
  merchant_name: string;
  total_amount: number;
  tax_amount: number;
  payment_method: string;
  merchant_address?: string;
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    receipt_number: "",
    date: new Date(),
    merchant_name: "",
    merchant_address: "",
    total_amount: "",
    tax_amount: "",
    payment_method: "",
    company_id: "",
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
          receipt_number: data.receipt_number,
          date: new Date(data.date),
          merchant_name: data.merchant_name,
          merchant_address: data.merchant_address || "",
          total_amount: data.total_amount.toString(),
          tax_amount: data.tax_amount.toString(),
          payment_method: data.payment_method,
          company_id: data.company_id,
          line_items: data.line_items || [],
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

      const updatedReceipt = {
        receipt_number: formData.receipt_number,
        date: format(formData.date, "yyyy-MM-dd"),
        merchant_name: formData.merchant_name,
        merchant_address: formData.merchant_address,
        total_amount: Number(formData.total_amount),
        tax_amount: Number(formData.tax_amount),
        payment_method: formData.payment_method,
        company_id: formData.company_id,
        line_items: formData.line_items,
      };

      const { error } = await supabase
        .from("receipts")
        .update(updatedReceipt)
        .eq("id", receiptId);

      if (error) throw error;

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
      [field]: field === "name" ? value : Number(value),
    };
    setFormData({ ...formData, line_items: updatedLineItems });
  };

  const handleRemoveLineItem = (index: number) => {
    const updatedLineItems = formData.line_items.filter((_, i) => i !== index);
    setFormData({ ...formData, line_items: updatedLineItems });
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
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.scrollView}>
          <Surface style={styles.formCard}>
            {/* Basic Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Basic Information</Text>

              <TextInput
                label="Receipt Number"
                value={formData.receipt_number}
                onChangeText={(text) =>
                  setFormData({ ...formData, receipt_number: text })
                }
                style={styles.input}
                error={!!errors.receipt_number}
              />
              <HelperText type="error" visible={!!errors.receipt_number}>
                {errors.receipt_number}
              </HelperText>

              <Button
                mode="outlined"
                onPress={() => setShowDatePicker(true)}
                style={styles.dateButton}
              >
                {format(formData.date, "MMMM d, yyyy")}
              </Button>

              <TextInput
                label="Merchant Name"
                value={formData.merchant_name}
                onChangeText={(text) =>
                  setFormData({ ...formData, merchant_name: text })
                }
                style={styles.input}
                error={!!errors.merchant_name}
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
              />
            </View>

            {/* Financial Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Financial Details</Text>

              <TextInput
                label="Total Amount"
                value={formData.total_amount}
                onChangeText={(text) =>
                  setFormData({ ...formData, total_amount: text })
                }
                keyboardType="decimal-pad"
                style={styles.input}
                error={!!errors.total_amount}
              />
              <HelperText type="error" visible={!!errors.total_amount}>
                {errors.total_amount}
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
              />
              <HelperText type="error" visible={!!errors.tax_amount}>
                {errors.tax_amount}
              </HelperText>

              <Button
                mode="outlined"
                onPress={() => setShowPaymentMethodModal(true)}
                style={styles.selectButton}
              >
                {formData.payment_method || "Select Payment Method"}
              </Button>
              <HelperText type="error" visible={!!errors.payment_method}>
                {errors.payment_method}
              </HelperText>
            </View>

            {/* Company Section - Renamed from Organization */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Company</Text>

              <Button
                mode="outlined"
                onPress={() => setShowCompanyModal(true)}
                style={styles.selectButton}
              >
                {companies.find((c) => c.id === formData.company_id)
                  ?.company_name || "Select Company"}
              </Button>
              <HelperText type="error" visible={!!errors.company_id}>
                {errors.company_id}
              </HelperText>
            </View>

            {/* Line Items */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Line Items</Text>

              {formData.line_items.map((item, index) => (
                <View key={index} style={styles.lineItem}>
                  <TextInput
                    label="Item Name"
                    value={item.name}
                    onChangeText={(text) =>
                      handleUpdateLineItem(index, "name", text)
                    }
                    style={[styles.input, styles.lineItemInput]}
                  />
                  <TextInput
                    label="Qty"
                    value={item.qty.toString()}
                    onChangeText={(text) =>
                      handleUpdateLineItem(index, "qty", text)
                    }
                    keyboardType="numeric"
                    style={[styles.input, styles.qtyInput]}
                  />
                  <TextInput
                    label="Price"
                    value={item.price.toString()}
                    onChangeText={(text) =>
                      handleUpdateLineItem(index, "price", text)
                    }
                    keyboardType="decimal-pad"
                    style={[styles.input, styles.priceInput]}
                  />
                  <IconButton
                    icon="delete"
                    size={24}
                    onPress={() => handleRemoveLineItem(index)}
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
        </ScrollView>

        <Surface style={styles.bottomBar}>
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
          >
            {saving ? (
              <ActivityIndicator color={theme.colors.surface} />
            ) : (
              "Save Changes"
            )}
          </Button>
        </Surface>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={formData.date}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setFormData({ ...formData, date: selectedDate });
            }
          }}
        />
      )}

      {/* Company Selection Modal */}
      <Portal>
        <Modal
          visible={showCompanyModal}
          onDismiss={() => setShowCompanyModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.modalTitle}>Select Company</Text>
          <ScrollView>
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
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.modalTitle}>Select Payment Method</Text>
          <ScrollView>
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
  formCard: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    backgroundColor: "#FFFFFF",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#212121",
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
    marginBottom: 8,
  },
  lineItemInput: {
    flex: 2,
    marginRight: 8,
  },
  qtyInput: {
    flex: 0.5,
    marginRight: 8,
  },
  priceInput: {
    flex: 1,
    marginRight: 8,
  },
  addItemButton: {
    marginTop: 8,
  },
  bottomBar: {
    flexDirection: "row",
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#EEEEEE",
  },
  button: {
    flex: 1,
    marginHorizontal: 8,
  },
  cancelButton: {
    borderColor: "#757575",
  },
  saveButton: {
    backgroundColor: "#1a73e8",
  },
  modal: {
    backgroundColor: "white",
    margin: 20,
    borderRadius: 12,
    padding: 20,
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    color: "#212121",
  },
});

export default EditReceiptScreen;
