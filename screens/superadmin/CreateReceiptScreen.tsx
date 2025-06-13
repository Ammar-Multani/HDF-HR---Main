import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
  TouchableOpacity,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Snackbar,
  Menu,
  HelperText,
  Divider,
  List,
  IconButton,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useForm, Controller } from "react-hook-form";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format } from "date-fns";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import { UserRole } from "../../types";
import CustomSnackbar from "../../components/CustomSnackbar";
import { t } from "i18next";

interface ReceiptFormData {
  receipt_number: string;
  date: Date;
  transaction_date: Date;
  merchant_name: string;
  total_amount: string;
  tax_amount: string;
  payment_method: string;
  merchant_address?: string;
  language_hint?: string;
}

interface LineItem {
  name: string;
  quantity: number;
  price: number;
}

const PAYMENT_METHODS = ["Credit Card", "Debit Card", "Cash"];

const CreateReceiptScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTransactionDatePicker, setShowTransactionDatePicker] =
    useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [companyMenuVisible, setCompanyMenuVisible] = useState(false);
  const [paymentMethodMenuVisible, setPaymentMethodMenuVisible] =
    useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [newItemName, setNewItemName] = useState("");
  const [newItemQuantity, setNewItemQuantity] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [showAddItem, setShowAddItem] = useState(false);
  const [imageSource, setImageSource] = useState<"camera" | "gallery" | null>(
    null
  );
  const [datePickerType, setDatePickerType] = useState<
    "receipt" | "transaction"
  >("receipt");

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    getValues,
  } = useForm<ReceiptFormData>({
    defaultValues: {
      receipt_number: "",
      date: new Date(),
      transaction_date: new Date(),
      merchant_name: "",
      total_amount: "",
      tax_amount: "",
      payment_method: "Credit Card",
      merchant_address: "",
      language_hint: "",
    },
  });

  const date = watch("date");
  const transaction_date = watch("transaction_date");
  const payment_method = watch("payment_method");

  const fetchCompanies = async () => {
    try {
      setLoadingCompanies(true);
      const { data, error } = await supabase
        .from("company")
        .select("id, company_name, active")
        .eq("active", true);

      if (error) {
        console.error("Error fetching companies:", error);
        return;
      }

      setCompanies(data || []);
    } catch (error) {
      console.error("Error fetching companies:", error);
    } finally {
      setLoadingCompanies(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "We need camera roll permission to upload receipts"
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setReceiptImage(result.assets[0].uri);
      setImageSource("gallery");
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "We need camera permission to take photos of receipts"
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setReceiptImage(result.assets[0].uri);
      setImageSource("camera");
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      "Upload Receipt Image",
      "Choose an option",
      [
        {
          text: "Take Photo",
          onPress: takePhoto,
        },
        {
          text: "Choose from Gallery",
          onPress: pickImage,
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  const uploadImage = async (uri: string): Promise<string> => {
    try {
      const fileExt = uri.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      // Convert URI to blob for Supabase storage
      const response = await fetch(uri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from("receipt-images")
        .upload(filePath, blob, {
          contentType: `image/${fileExt}`,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("receipt-images")
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw new Error("Failed to upload receipt image");
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (datePickerType === "receipt") {
      setShowDatePicker(false);
      if (selectedDate) {
        setValue("date", selectedDate);
      }
    } else {
      setShowTransactionDatePicker(false);
      if (selectedDate) {
        setValue("transaction_date", selectedDate);
      }
    }
  };

  const addLineItem = () => {
    if (!newItemName || !newItemQuantity || !newItemPrice) {
      setSnackbarMessage("Please fill in all line item fields");
      setSnackbarVisible(true);
      return;
    }

    const quantity = parseFloat(newItemQuantity);
    const price = parseFloat(newItemPrice);

    if (isNaN(quantity) || isNaN(price)) {
      setSnackbarMessage("Quantity and price must be valid numbers");
      setSnackbarVisible(true);
      return;
    }

    const newItem: LineItem = {
      name: newItemName,
      quantity,
      price,
    };

    setLineItems([...lineItems, newItem]);
    setNewItemName("");
    setNewItemQuantity("");
    setNewItemPrice("");
    setShowAddItem(false);
  };

  const removeLineItem = (index: number) => {
    const updatedItems = [...lineItems];
    updatedItems.splice(index, 1);
    setLineItems(updatedItems);
  };

  const calculateTotal = () => {
    return lineItems
      .reduce((total, item) => total + item.quantity * item.price, 0)
      .toFixed(2);
  };

  const onSubmit = async (data: ReceiptFormData) => {
    try {
      if (!user) {
        setSnackbarMessage("User not authenticated");
        setSnackbarVisible(true);
        return;
      }

      if (!selectedCompany) {
        setSnackbarMessage("Please select a company for this receipt");
        setSnackbarVisible(true);
        return;
      }

      setLoading(true);

      // Skip image upload and set imagePath to null
      const imagePath = null;

      // Format line items for storage
      const formattedLineItems = lineItems.map((item) => ({
        name: item.name,
        qty: item.quantity,
        price: item.price,
      }));

      // Find a super admin to use as created_by
      const { data: adminUser, error: adminError } = await supabase
        .from("admin")
        .select("id")
        .eq("status", true) // Assuming active admins have status=true
        .limit(1)
        .single();

      if (adminError || !adminUser) {
        console.error("Error finding admin user:", adminError);
        setSnackbarMessage("Cannot create receipt: No active admin found");
        setSnackbarVisible(true);
        setLoading(false);
        return;
      }

      // Create receipt
      const receiptData = {
        company_id: selectedCompany.id,
        receipt_number: data.receipt_number,
        date: data.date.toISOString().split("T")[0],
        transaction_date: data.transaction_date.toISOString().split("T")[0],
        merchant_name: data.merchant_name,
        line_items: formattedLineItems,
        total_amount: parseFloat(data.total_amount),
        tax_amount: parseFloat(data.tax_amount),
        payment_method: data.payment_method,
        merchant_address: data.merchant_address || null,
        receipt_image_path: imagePath,
        language_hint: data.language_hint || null,
        created_by: adminUser.id,
      };

      const { data: createdReceipt, error } = await supabase
        .from("receipts")
        .insert([receiptData])
        .select()
        .single();

      if (error) {
        throw error;
      }

      setSnackbarMessage("Receipt created successfully");
      setSnackbarVisible(true);

      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error: any) {
      console.error("Error creating receipt:", error);
      setSnackbarMessage(error.message || "Failed to create receipt");
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  if (loadingCompanies) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader
        title="Add a Receipt"
        showBackButton
        showHelpButton
        showLogo={false}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <Text
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            Receipt Details
          </Text>

          <Text style={styles.inputLabel}>Select Company *</Text>
          <View style={styles.companySelector}>
            <Button
              mode="outlined"
              onPress={() => setCompanyMenuVisible(true)}
              style={styles.companyButton}
            >
              {selectedCompany
                ? selectedCompany.company_name
                : "Select Company"}
            </Button>
            <Menu
              visible={companyMenuVisible}
              onDismiss={() => setCompanyMenuVisible(false)}
              anchor={{ x: 0, y: 0 }}
            >
              {companies.map((company) => (
                <Menu.Item
                  key={company.id}
                  title={company.company_name}
                  onPress={() => {
                    setSelectedCompany(company);
                    setCompanyMenuVisible(false);
                  }}
                />
              ))}
            </Menu>
          </View>

          <Controller
            control={control}
            rules={{ required: "Receipt number is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Receipt Number *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.receipt_number}
                style={styles.input}
                disabled={loading}
                placeholder="e.g., WF-2024-01-15-1234"
              />
            )}
            name="receipt_number"
          />
          {errors.receipt_number && (
            <Text style={styles.errorText}>
              {errors.receipt_number.message}
            </Text>
          )}

          <Text style={styles.inputLabel}>Receipt Date *</Text>
          <Button
            mode="outlined"
            onPress={() => setShowDatePicker(true)}
            style={styles.dateButton}
            icon="calendar"
          >
            {format(date, "MMMM d, yyyy")}
          </Button>

          <Text style={styles.inputLabel}>Transaction Date *</Text>
          <Button
            mode="outlined"
            onPress={() => setShowTransactionDatePicker(true)}
            style={styles.dateButton}
            icon="calendar"
          >
            {format(transaction_date, "MMMM d, yyyy")}
          </Button>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setDatePickerType("receipt");
                handleDateChange(event, date);
              }}
            />
          )}

          {showTransactionDatePicker && (
            <DateTimePicker
              value={transaction_date}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setDatePickerType("transaction");
                handleDateChange(event, date);
              }}
            />
          )}

          <Controller
            control={control}
            rules={{ required: "Merchant name is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Merchant Name *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.merchant_name}
                style={styles.input}
                disabled={loading}
              />
            )}
            name="merchant_name"
          />
          {errors.merchant_name && (
            <Text style={styles.errorText}>{errors.merchant_name.message}</Text>
          )}

          <Controller
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Merchant Address (Optional)"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                style={styles.input}
                disabled={loading}
              />
            )}
            name="merchant_address"
          />

          <Text
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            Line Items
          </Text>

          {lineItems.length > 0 && (
            <View style={styles.lineItemsContainer}>
              {lineItems.map((item, index) => (
                <View key={index} style={styles.lineItemRow}>
                  <Text style={styles.lineItemText}>{item.name}</Text>
                  <Text style={styles.lineItemText}>
                    {item.quantity} x ${item.price.toFixed(2)}
                  </Text>
                  <Button
                    icon="delete"
                    mode="text"
                    onPress={() => removeLineItem(index)}
                  >
                    {""}
                  </Button>
                </View>
              ))}
              <Divider style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalText}>Subtotal:</Text>
                <Text style={styles.totalAmount}>${calculateTotal()}</Text>
              </View>
            </View>
          )}

          {showAddItem ? (
            <View style={styles.addItemContainer}>
              <TextInput
                label="Item Name"
                mode="outlined"
                value={newItemName}
                onChangeText={setNewItemName}
                style={styles.itemInput}
              />
              <View style={styles.itemQuantityRow}>
                <TextInput
                  label="Quantity"
                  mode="outlined"
                  value={newItemQuantity}
                  onChangeText={setNewItemQuantity}
                  keyboardType="numeric"
                  style={[styles.itemInput, { flex: 1, marginRight: 8 }]}
                />
                <TextInput
                  label="Price"
                  mode="outlined"
                  value={newItemPrice}
                  onChangeText={setNewItemPrice}
                  keyboardType="numeric"
                  style={[styles.itemInput, { flex: 1 }]}
                />
              </View>
              <View style={styles.itemButtonRow}>
                <Button
                  mode="outlined"
                  onPress={() => setShowAddItem(false)}
                  style={{ marginRight: 8 }}
                >
                  Cancel
                </Button>
                <Button mode="contained" onPress={addLineItem}>
                  Add Item
                </Button>
              </View>
            </View>
          ) : (
            <Button
              mode="outlined"
              icon="plus"
              onPress={() => setShowAddItem(true)}
              style={styles.addItemButton}
            >
              Add Line Item
            </Button>
          )}

          <Controller
            control={control}
            rules={{ required: "Total amount is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Total Amount *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.total_amount}
                style={styles.input}
                keyboardType="numeric"
                disabled={loading}
                left={<TextInput.Affix text="$" />}
              />
            )}
            name="total_amount"
          />
          {errors.total_amount && (
            <Text style={styles.errorText}>{errors.total_amount.message}</Text>
          )}

          <Controller
            control={control}
            rules={{ required: "Tax amount is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Tax Amount *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.tax_amount}
                style={styles.input}
                keyboardType="numeric"
                disabled={loading}
                left={<TextInput.Affix text="$" />}
              />
            )}
            name="tax_amount"
          />
          {errors.tax_amount && (
            <Text style={styles.errorText}>{errors.tax_amount.message}</Text>
          )}

          <Text style={styles.inputLabel}>Payment Method *</Text>
          <View style={styles.paymentMethodSelector}>
            <Button
              mode="outlined"
              onPress={() => setPaymentMethodMenuVisible(true)}
              style={styles.paymentMethodButton}
            >
              {payment_method || "Select Payment Method"}
            </Button>
            <Menu
              visible={paymentMethodMenuVisible}
              onDismiss={() => setPaymentMethodMenuVisible(false)}
              anchor={{ x: 0, y: 0 }}
            >
              {PAYMENT_METHODS.map((method) => (
                <Menu.Item
                  key={method}
                  title={method}
                  onPress={() => {
                    setValue("payment_method", method);
                    setPaymentMethodMenuVisible(false);
                  }}
                />
              ))}
            </Menu>
          </View>

          <Controller
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Language Hint (Optional)"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                style={styles.input}
                disabled={loading}
                placeholder="e.g., en, fr, es"
              />
            )}
            name="language_hint"
          />

          <Text
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            Receipt Image
          </Text>

          <View style={styles.imageButtonsContainer}>
            <Button
              mode="outlined"
              icon="camera"
              onPress={takePhoto}
              style={[styles.imageButton, { marginRight: 8 }]}
            >
              Take Photo
            </Button>
            <Button
              mode="outlined"
              icon="image"
              onPress={pickImage}
              style={styles.imageButton}
            >
              Gallery
            </Button>
          </View>

          {receiptImage && (
            <View style={styles.imagePreviewContainer}>
              <Image
                source={{ uri: receiptImage }}
                style={styles.imagePreview}
                resizeMode="contain"
              />
              <IconButton
                icon="delete"
                size={24}
                style={styles.deleteImageButton}
                onPress={() => setReceiptImage(null)}
              />
            </View>
          )}

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            style={styles.submitButton}
            loading={loading}
            disabled={loading}
          >
            Add a Receipt
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

      <CustomSnackbar
        visible={snackbarVisible}
        message={snackbarMessage}
        onDismiss={() => setSnackbarVisible(false)}
        type={
          snackbarMessage?.includes("successful") ||
          snackbarMessage?.includes("instructions will be sent")
            ? "success"
            : snackbarMessage?.includes("rate limit") ||
                snackbarMessage?.includes("network")
              ? "warning"
              : "error"
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 24,
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.7,
  },
  dateButton: {
    marginBottom: 16,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 4,
  },
  companySelector: {
    marginBottom: 16,
    zIndex: 1000,
  },
  companyButton: {
    width: "100%",
  },
  paymentMethodSelector: {
    marginBottom: 16,
    zIndex: 900,
  },
  paymentMethodButton: {
    width: "100%",
    marginBottom: 16,
  },
  uploadButton: {
    marginBottom: 16,
  },
  imageButtonsContainer: {
    flexDirection: "row",
    marginBottom: 16,
  },
  imageButton: {
    flex: 1,
  },
  imagePreviewContainer: {
    alignItems: "center",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 8,
    position: "relative",
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 4,
  },
  deleteImageButton: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
  },
  submitButton: {
    marginTop: 24,
    paddingVertical: 6,
  },
  lineItemsContainer: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
  },
  lineItemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  lineItemText: {
    flex: 1,
    fontSize: 14,
  },
  divider: {
    marginVertical: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  totalText: {
    fontWeight: "bold",
    fontSize: 16,
  },
  totalAmount: {
    fontWeight: "bold",
    fontSize: 16,
  },
  addItemContainer: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
  },
  itemInput: {
    marginBottom: 8,
  },
  itemQuantityRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  itemButtonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  addItemButton: {
    marginBottom: 16,
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
});

export default CreateReceiptScreen;
