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
  Dimensions,
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
  Surface,
  Portal,
  Modal,
  ActivityIndicator,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useForm, Controller } from "react-hook-form";
import DateTimePicker from "@react-native-community/datetimepicker";
import { format, parseISO } from "date-fns";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import { UserRole } from "../../types";
import Animated, { FadeIn } from "react-native-reanimated";
import Constants from "expo-constants";

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

const PAYMENT_METHODS = [
  "Credit Card",
  "Debit Card",
  "Cash",
  "Bank Transfer",
  "Check",
  "Other",
];

interface DateChangeEvent extends Event {
  type?: string;
  nativeEvent?: {
    timestamp?: number;
  };
  target?: HTMLInputElement;
}

interface TaggunResponse {
  totalAmount?: {
    data: number;
    confidenceLevel: number;
  };
  taxAmount?: {
    data: number;
    confidenceLevel: number;
  };
  date?: {
    data: string;
    confidenceLevel: number;
  };
  merchantName?: {
    data: string;
    confidenceLevel: number;
  };
  merchantAddress?: {
    data: string;
    confidenceLevel: number;
  };
  merchantCity?: {
    data: string;
    confidenceLevel: number;
  };
  merchantState?: {
    data: string;
    confidenceLevel: number;
  };
  merchantCountryCode?: {
    data: string;
    confidenceLevel: number;
  };
  merchantPostalCode?: {
    data: string;
    confidenceLevel: number;
  };
}

// Replace the environment variable access with Expo's format
const TAGGUN_API_KEY = Constants.expoConfig?.extra?.EXPO_PUBLIC_TAGGUN_API_KEY;
const TAGGUN_API_URL = "https://api.taggun.io/api/receipt/v1/simple/file";

const CreateReceiptScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const dimensions = useWindowDimensions();

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

  const [loading, setLoading] = useState(false);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTransactionDatePicker, setShowTransactionDatePicker] =
    useState(false);
  const [datePickerType, setDatePickerType] = useState<
    "receipt" | "transaction"
  >("receipt");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [companies, setCompanies] = useState<any[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
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
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [fileType, setFileType] = useState<"image" | "pdf" | null>(null);

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

  const processReceiptWithOCR = async (imageUri: string) => {
    try {
      if (!TAGGUN_API_KEY) {
        throw new Error("Taggun API key is not configured");
      }

      setIsProcessingOCR(true);
      setSnackbarMessage("Processing receipt...");
      setSnackbarVisible(true);

      // Convert image URI to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Create form data
      const formData = new FormData();
      formData.append(
        "file",
        blob,
        fileType === "pdf" ? "receipt.pdf" : "receipt.jpg"
      );
      formData.append("extractTime", "false");
      formData.append("refresh", "false");
      formData.append("incognito", "false");

      // Call Taggun API
      const ocrResponse = await fetch(TAGGUN_API_URL, {
        method: "POST",
        headers: {
          accept: "application/json",
          apikey: TAGGUN_API_KEY,
        },
        body: formData,
      });

      if (!ocrResponse.ok) {
        const errorData = await ocrResponse.json().catch(() => null);
        console.error("OCR API Error Response:", {
          status: ocrResponse.status,
          statusText: ocrResponse.statusText,
          errorData,
        });

        if (ocrResponse.status === 401) {
          throw new Error(
            "Invalid API key. Please check your Taggun API key configuration."
          );
        } else if (ocrResponse.status === 413) {
          throw new Error("File size too large. Please upload a smaller file.");
        } else if (ocrResponse.status === 415) {
          throw new Error(
            "Unsupported file type. Please upload a valid image or PDF file."
          );
        } else {
          throw new Error(`OCR processing failed: ${ocrResponse.statusText}`);
        }
      }

      const ocrData: TaggunResponse = await ocrResponse.json();

      if (!ocrData) {
        throw new Error("No data received from OCR service");
      }

      // Update form fields with OCR data
      if (ocrData.totalAmount?.data) {
        setValue("total_amount", ocrData.totalAmount.data.toString());
      }
      if (ocrData.taxAmount?.data) {
        setValue("tax_amount", ocrData.taxAmount.data.toString());
      }
      if (ocrData.merchantName?.data) {
        setValue("merchant_name", ocrData.merchantName.data);
      }
      if (ocrData.merchantAddress?.data) {
        setValue("merchant_address", ocrData.merchantAddress.data);
      }
      if (ocrData.date?.data) {
        const parsedDate = parseISO(ocrData.date.data);
        setValue("date", parsedDate);
        setValue("transaction_date", parsedDate);
      }

      setSnackbarMessage("Receipt details extracted successfully!");
      setSnackbarVisible(true);
    } catch (error: any) {
      console.error("OCR processing error:", error);
      let errorMessage =
        "Failed to process receipt. Please fill in details manually.";

      if (error.message.includes("API key")) {
        errorMessage = "API key error. Please contact support.";
      } else if (error.message.includes("file size")) {
        errorMessage = "File is too large. Please try a smaller file.";
      } else if (error.message.includes("file type")) {
        errorMessage = "Invalid file type. Please upload a valid image or PDF.";
      }

      setSnackbarMessage(errorMessage);
      setSnackbarVisible(true);
    } finally {
      setIsProcessingOCR(false);
    }
  };

  const handleImageSelection = async (
    uri: string,
    source: "camera" | "gallery"
  ) => {
    setReceiptImage(uri);
    setImageSource(source);
    await processReceiptWithOCR(uri);
  };

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
      await handleImageSelection(result.assets[0].uri, "gallery");
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
      await handleImageSelection(result.assets[0].uri, "camera");
    }
  };

  const pickDocument = async () => {
    try {
      if (!TAGGUN_API_KEY) {
        setSnackbarMessage(
          "OCR service is not configured. Please contact support."
        );
        setSnackbarVisible(true);
        return;
      }

      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "application/pdf"],
        multiple: false,
        copyToCacheDirectory: true, // This ensures we have a local URI to work with
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const file = result.assets[0];

        // Check file size (limit to 10MB)
        if (file.size && file.size > 10 * 1024 * 1024) {
          setSnackbarMessage("File size must be less than 10MB");
          setSnackbarVisible(true);
          return;
        }

        // Validate file type
        const validTypes = [
          "image/jpeg",
          "image/png",
          "image/heic",
          "application/pdf",
        ];
        if (file.mimeType && !validTypes.includes(file.mimeType)) {
          setSnackbarMessage(
            "Please upload a valid image (JPEG, PNG, HEIC) or PDF file"
          );
          setSnackbarVisible(true);
          return;
        }

        setFileType(file.mimeType?.includes("pdf") ? "pdf" : "image");
        await handleImageSelection(file.uri, "gallery");
      }
    } catch (error) {
      console.error("Error picking document:", error);
      setSnackbarMessage("Failed to pick document");
      setSnackbarVisible(true);
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

  const handleDateChange = (
    event: DateChangeEvent,
    type: "receipt" | "transaction"
  ) => {
    if (Platform.OS === "web") {
      const selectedDate = new Date((event.target as HTMLInputElement).value);
      setValue(type === "receipt" ? "date" : "transaction_date", selectedDate);
    } else {
      if (event.type === "set" && event.nativeEvent?.timestamp) {
        setValue(
          type === "receipt" ? "date" : "transaction_date",
          new Date(event.nativeEvent.timestamp)
        );
      }
      type === "receipt"
        ? setShowDatePicker(false)
        : setShowTransactionDatePicker(false);
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

  const renderUploadSection = () => {
    const isWebPlatform = Platform.OS === "web";
    const isMobileWeb = isWebPlatform && dimensions.width < 768;

    return (
      <Surface style={[styles.formCard, { marginTop: 24 }]}>
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.iconContainer}>
              <IconButton
                icon="file-upload"
                size={20}
                iconColor="#64748b"
                style={styles.headerIcon}
              />
            </View>
            <Text style={styles.cardTitle}>Upload Receipt</Text>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.imageButtonsContainer}>
            {!isWebPlatform || isMobileWeb ? (
              <>
                <Button
                  mode="outlined"
                  icon="camera"
                  onPress={takePhoto}
                  style={[styles.imageButton, { marginRight: 8 }]}
                  disabled={isProcessingOCR}
                >
                  Take Photo
                </Button>
                <Button
                  mode="outlined"
                  icon="image"
                  onPress={pickImage}
                  style={styles.imageButton}
                  disabled={isProcessingOCR}
                >
                  Gallery
                </Button>
              </>
            ) : (
              <Button
                mode="outlined"
                icon="file-upload"
                onPress={pickDocument}
                style={styles.uploadButton}
                disabled={isProcessingOCR}
              >
                Upload Image/PDF
              </Button>
            )}
          </View>

          {(receiptImage || fileType === "pdf") && (
            <View style={styles.imagePreviewContainer}>
              {fileType === "pdf" ? (
                <View style={styles.pdfPreview}>
                  <IconButton icon="file-pdf" size={48} />
                  <Text style={styles.pdfText}>PDF Document</Text>
                </View>
              ) : (
                <Image
                  source={receiptImage ? { uri: receiptImage } : undefined}
                  style={styles.imagePreview}
                  resizeMode="contain"
                />
              )}
              <IconButton
                icon="delete"
                size={24}
                style={styles.deleteImageButton}
                onPress={() => {
                  setReceiptImage(null);
                  setFileType(null);
                }}
                disabled={isProcessingOCR}
              />
              {isProcessingOCR && (
                <View style={styles.ocrLoadingOverlay}>
                  <ActivityIndicator size="large" />
                  <Text style={styles.ocrLoadingText}>
                    Processing Receipt...
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </Surface>
    );
  };

  if (loadingCompanies) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Create Receipt"
        subtitle="Add new receipt information"
        showBackButton
        showHelpButton
        showLogo={false}
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
            <Text style={styles.pageTitle}>Create New Receipt</Text>
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
                    <Controller
                      control={control}
                      rules={{ required: "Receipt number is required" }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <>
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
                          <HelperText
                            type="error"
                            visible={!!errors.receipt_number}
                          >
                            {errors.receipt_number?.message}
                          </HelperText>
                        </>
                      )}
                      name="receipt_number"
                    />

                    {Platform.OS === "web" ? (
                      <View style={styles.dateInputWrapper}>
                        <Text style={styles.inputLabel}>
                          Transaction Date *
                        </Text>
                        <View style={styles.webDateInputContainer}>
                          <input
                            type="date"
                            value={format(transaction_date, "yyyy-MM-dd")}
                            onChange={(e) => handleDateChange(e, "transaction")}
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
                    ) : (
                      <>
                        <Text style={styles.inputLabel}>
                          Transaction Date *
                        </Text>
                        <Button
                          mode="outlined"
                          onPress={() => {
                            setDatePickerType("transaction");
                            setShowTransactionDatePicker(true);
                          }}
                          style={styles.dateButton}
                          icon="calendar"
                        >
                          {format(transaction_date, "MMMM d, yyyy")}
                        </Button>

                        {showTransactionDatePicker && (
                          <DateTimePicker
                            value={transaction_date}
                            mode="date"
                            display="default"
                            onChange={(e) => handleDateChange(e, "transaction")}
                          />
                        )}
                      </>
                    )}

                    <Controller
                      control={control}
                      rules={{ required: "Merchant name is required" }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <>
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
                          <HelperText
                            type="error"
                            visible={!!errors.merchant_name}
                          >
                            {errors.merchant_name?.message}
                          </HelperText>
                        </>
                      )}
                      name="merchant_name"
                    />

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
                          multiline
                          numberOfLines={3}
                          disabled={loading}
                        />
                      )}
                      name="merchant_address"
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
                    <Controller
                      control={control}
                      rules={{ required: "Total amount is required" }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <>
                          <TextInput
                            label="Total Amount *"
                            mode="outlined"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            error={!!errors.total_amount}
                            style={styles.input}
                            keyboardType="decimal-pad"
                            disabled={loading}
                            left={<TextInput.Affix text="$" />}
                          />
                          <HelperText
                            type="error"
                            visible={!!errors.total_amount}
                          >
                            {errors.total_amount?.message}
                          </HelperText>
                        </>
                      )}
                      name="total_amount"
                    />

                    <Controller
                      control={control}
                      rules={{ required: "Tax amount is required" }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <>
                          <TextInput
                            label="Tax Amount *"
                            mode="outlined"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            error={!!errors.tax_amount}
                            style={styles.input}
                            keyboardType="decimal-pad"
                            disabled={loading}
                            left={<TextInput.Affix text="$" />}
                          />
                          <HelperText
                            type="error"
                            visible={!!errors.tax_amount}
                          >
                            {errors.tax_amount?.message}
                          </HelperText>
                        </>
                      )}
                      name="tax_amount"
                    />

                    <Button
                      mode="outlined"
                      onPress={() => setShowPaymentMethodModal(true)}
                      style={styles.selectButton}
                      icon="credit-card"
                    >
                      {payment_method || "Select Payment Method"}
                    </Button>
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
                      {selectedCompany
                        ? selectedCompany.company_name
                        : "Select Company"}
                    </Button>
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
                    {lineItems.map((item, index) => (
                      <View key={index} style={styles.lineItem}>
                        <TextInput
                          label="Item Name"
                          value={item.name}
                          onChangeText={(text) => {
                            const updatedItems = [...lineItems];
                            updatedItems[index].name = text;
                            setLineItems(updatedItems);
                          }}
                          style={[styles.input, styles.lineItemInput]}
                          mode="outlined"
                        />
                        <TextInput
                          label="Qty"
                          value={item.quantity.toString()}
                          onChangeText={(text) => {
                            const updatedItems = [...lineItems];
                            updatedItems[index].quantity = Number(text) || 0;
                            setLineItems(updatedItems);
                          }}
                          keyboardType="numeric"
                          style={[styles.input, styles.qtyInput]}
                          mode="outlined"
                        />
                        <TextInput
                          label="Price"
                          value={item.price.toString()}
                          onChangeText={(text) => {
                            const updatedItems = [...lineItems];
                            updatedItems[index].price = Number(text) || 0;
                            setLineItems(updatedItems);
                          }}
                          keyboardType="decimal-pad"
                          style={[styles.input, styles.priceInput]}
                          mode="outlined"
                        />
                        <IconButton
                          icon="delete"
                          size={24}
                          onPress={() => {
                            const updatedItems = lineItems.filter(
                              (_, i) => i !== index
                            );
                            setLineItems(updatedItems);
                          }}
                          iconColor={theme.colors.error}
                        />
                      </View>
                    ))}

                    <Button
                      mode="outlined"
                      onPress={() =>
                        setLineItems([
                          ...lineItems,
                          { name: "", quantity: 1, price: 0 },
                        ])
                      }
                      style={styles.addItemButton}
                      icon="plus"
                    >
                      Add Line Item
                    </Button>
                  </View>
                </Surface>

                {renderUploadSection()}
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
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSubmit(onSubmit)}
              style={[styles.button, styles.saveButton]}
              disabled={loading}
              buttonColor={theme.colors.primary}
            >
              {loading ? (
                <ActivityIndicator color={theme.colors.surface} />
              ) : (
                "Create Receipt"
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
                    setSelectedCompany(company);
                    setShowCompanyModal(false);
                  }}
                  right={(props) =>
                    selectedCompany?.id === company.id ? (
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
            {PAYMENT_METHODS.map((method) => (
              <React.Fragment key={method}>
                <List.Item
                  title={method}
                  onPress={() => {
                    setValue("payment_method", method);
                    setShowPaymentMethodModal(false);
                  }}
                  right={(props) =>
                    payment_method === method ? (
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

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: "OK",
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
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
    marginTop: 10,
    width: "20%",
    marginBottom: 10,
  },
  dateInputWrapper: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    color: "#1e293b",
    fontFamily: "Poppins-regular",
  },
  ocrLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  ocrLoadingText: {
    marginTop: 8,
    fontSize: 14,
    color: "#1e293b",
  },
  uploadButton: {
    flex: 1,
    height: 48,
  } as const,
  pdfPreview: {
    width: "100%",
    height: 200,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    borderRadius: 8,
  } as const,
  pdfText: {
    marginTop: 8,
    fontSize: 14,
    color: "#64748b",
  } as const,
});

export default CreateReceiptScreen;
