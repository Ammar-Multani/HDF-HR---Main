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
  ImageStyle,
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
import CustomSnackbar from "../../components/CustomSnackbar";
import { t } from "i18next";
import { ActivityType } from "../../types/activity-log";
import CompanySelector from "../../components/CompanySelector";

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
  subtotal_amount: string;
  rounding_amount: string;
  final_price: string;
  paid_amount: string;
  change_amount: string;
  merchant_vat: string;
  merchant_phone: string;
  merchant_website: string;
  vat_details: string;
}

interface LineItem {
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
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

interface TaggunLocation {
  city: { data?: string; confidenceLevel: number };
  continent: { data?: string; confidenceLevel: number };
  country: {
    data?: string;
    confidenceLevel: number;
    iso_code?: string;
    names?: { [key: string]: string };
  };
  postal: { data?: string; confidenceLevel: number };
}

interface TaggunEntity {
  data: string | number;
  confidenceLevel: number;
  text?: string;
  index?: number;
  regions?: any[];
  currencyCode?: string;
}

interface TaggunVatDetail {
  rate: number;
  base: number;
  amount: number;
  category: string;
}

interface TaggunProductLineItem {
  data: {
    name: { data: string };
    quantity: { data: number };
    unitPrice: { data: number };
    totalPrice: { data: number };
    sku?: { data: string };
  };
  confidenceLevel: number;
  text: string;
  index: number;
  regions: any[];
}

interface TaggunResponse {
  location: TaggunLocation;
  totalAmount: TaggunEntity;
  taxAmount: TaggunEntity;
  discountAmount: { confidenceLevel: number };
  paidAmount: TaggunEntity;
  date: TaggunEntity;
  dueDate: { confidenceLevel: number };
  merchantName: TaggunEntity;
  merchantAddress: TaggunEntity;
  merchantCity: TaggunEntity;
  merchantCountryCode: TaggunEntity;
  merchantPostalCode: TaggunEntity;
  merchantState: TaggunEntity;
  merchantTaxId: TaggunEntity;
  merchantTypes: { confidenceLevel: number };
  paymentType: { confidenceLevel: number };
  itemsCount: { data: number; confidenceLevel: number };
  entities: {
    productLineItems: TaggunProductLineItem[];
    IBAN: { data?: string; confidenceLevel: number };
    invoiceNumber: TaggunEntity;
    receiptNumber: TaggunEntity;
    multiTaxLineItems: any[];
  };
  text: {
    text: string;
    regions: any[];
  };
  amounts: any[];
  lineAmounts: any[];
  numbers: any[];
  confidenceLevel: number;
  elapsed: number;
  targetRotation: number;
  trackingId: string;
}

interface TaggunTax {
  rate: number;
  amount: number;
  base: number;
  category?: string;
}

// Replace the environment variable access with Expo's format
const TAGGUN_API_KEY = "914c4c5bb7bc42adaeb662b34f2169c5";
const TAGGUN_API_URL = "https://api.taggun.io/api/receipt/v1/verbose/file";

const CreateReceiptScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const dimensions = useWindowDimensions();

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTransactionDatePicker, setShowTransactionDatePicker] =
    useState(false);
  const [datePickerType, setDatePickerType] = useState<
    "receipt" | "transaction"
  >("receipt");
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<any>(null);
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
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);

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
      payment_method: undefined,
      merchant_address: "",
      language_hint: "",
      subtotal_amount: "",
      rounding_amount: "",
      final_price: "",
      paid_amount: "",
      change_amount: "",
      merchant_vat: "",
      merchant_phone: "",
      merchant_website: "",
      vat_details: "",
    },
  });

  const transaction_date = watch("transaction_date");
  const payment_method = watch("payment_method");

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

      // Create form data with optimal parameters
      const formData = new FormData();
      formData.append(
        "file",
        blob,
        fileType === "pdf" ? "receipt.pdf" : "receipt.jpg"
      );

      // Essential parameters for better extraction
      formData.append("extractLineItems", "true"); // Get detailed line items
      formData.append("extractTime", "true"); // Get receipt time
      formData.append("language", "de"); // German language hint
      formData.append("refresh", "true"); // Force fresh analysis
      formData.append("incognito", "false"); // Allow storage for better learning
      formData.append("near", "Switzerland"); // Location hint for better merchant detection

      // Call Taggun API with verbose endpoint
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

      // Process the response data according to the actual API structure
      const ocrData: TaggunResponse = await ocrResponse.json();

      // Log raw response for debugging with better formatting
      console.log("Raw Taggun Response Details:", {
        totalAmount: ocrData.totalAmount,
        taxAmount: ocrData.taxAmount,
        merchantName: ocrData.merchantName,
        merchantAddress: ocrData.merchantAddress,
        merchantTaxId: ocrData.merchantTaxId,
        date: ocrData.date,
        lineItems: ocrData.entities?.productLineItems,
        multiTaxItems: ocrData.entities?.multiTaxLineItems,
        rawText: ocrData.text?.text?.substring(0, 200) + "...", // First 200 chars for readability
      });

      // Log receipt number extraction attempts with more detail
      const receiptNumberAttempts = {
        fromReceiptNumber: {
          value: ocrData.entities?.receiptNumber?.data,
          confidence: ocrData.entities?.receiptNumber?.confidenceLevel,
        },
        fromInvoiceNumber: {
          value: ocrData.entities?.invoiceNumber?.data,
          confidence: ocrData.entities?.invoiceNumber?.confidenceLevel,
        },
        fromRawText: {
          bonMatch: ocrData.text?.text?.match(
            /(?:Bon|Beleg|Nr|Nummer)[:\s]+(\d+)/i
          )?.[1],
          endOfLineMatch: ocrData.text?.text?.match(
            /\d{3}\s+\d{3}\s+(\d+)\s+\d+$/m
          )?.[1],
        },
      };
      console.log("Receipt Number Extraction Attempts:", receiptNumberAttempts);

      // Extract line items from raw text since the API's productLineItems are empty
      const extractLineItems = (text: string, amounts: any[]) => {
        // First try to use the API's productLineItems
        if (ocrData.entities?.productLineItems?.length > 0) {
          return ocrData.entities.productLineItems.map((item) => ({
            name: item.data.name.data,
            quantity: item.data.quantity.data,
            unitPrice: item.data.unitPrice.data,
            totalPrice: item.data.totalPrice.data,
          }));
        }

        // If no productLineItems, try to extract from amounts array
        if (amounts && amounts.length > 0) {
          return amounts
            .filter(
              (amount) =>
                amount.text &&
                !amount.text.toLowerCase().includes("summe") &&
                !amount.text.toLowerCase().includes("total") &&
                !amount.text.toLowerCase().includes("mwst") &&
                !amount.text.toLowerCase().includes("bar")
            )
            .map((amount) => ({
              name: amount.text.split(/\d/)[0].trim(),
              quantity: 1,
              unitPrice: amount.data,
              totalPrice: amount.data,
            }));
        }

        return [];
      };

      // Extract VAT details from raw text
      const extractVatDetails = (text: string) => {
        const lines = text.split("\n");
        const vatDetails: TaggunVatDetail[] = [];

        lines.forEach((line) => {
          // Match VAT lines (e.g., "A 2.6 % MwSt von 15.80 0.40")
          const vatMatch = line.match(
            /([AB])\s+([\d.]+)\s*%\s*(?:MwSt|MWST)\s+von\s+([\d.]+)\s+([\d.]+)/
          );
          if (vatMatch) {
            vatDetails.push({
              category: vatMatch[1],
              rate: parseFloat(vatMatch[2]),
              base: parseFloat(vatMatch[3]),
              amount: parseFloat(vatMatch[4]),
            });
          }
        });

        return vatDetails;
      };

      // Process the response data according to the actual API structure
      const processedData = {
        // Basic Information
        receiptNumber: String(
          ocrData.entities?.receiptNumber?.data ||
            ocrData.text?.text?.match(
              /(?:Bon|Beleg|Nr|Nummer)[:\s]+(\d+)/i
            )?.[1] ||
            ocrData.text?.text?.match(/\d{3}\s+\d{3}\s+(\d+)\s+\d+$/m)?.[1] ||
            ""
        ),

        // Merchant Information
        merchant: {
          name: ocrData.merchantName?.data || "",
          address: [
            ocrData.merchantAddress?.data,
            ocrData.merchantCity?.data,
            ocrData.merchantState?.data,
            ocrData.merchantPostalCode?.data,
            ocrData.merchantCountryCode?.data,
          ]
            .filter(Boolean)
            .join(", "),
          taxId:
            ocrData.text?.text?.match(
              /(?:MWST|USt|VAT)[-.]?(?:Nr\.?|Nummer)?[:\s]*([\w\d.-]+)/i
            )?.[1] || ocrData.merchantTaxId?.data,
          phone: ocrData.text?.text?.match(
            /(?:Tel|Phone|Telefon)[:\s]*([+\d\s-]+)/i
          )?.[1],
          website: ocrData.text?.text?.match(
            /(?:www\.[\w-]+(?:\.[\w-]+)+)/i
          )?.[0],
        },

        // Financial Information
        amounts: {
          total: ocrData.totalAmount?.data,
          subtotal: ocrData.amounts?.find((a) =>
            a.text?.toLowerCase().includes("zwischensumme")
          )?.data,
          rounding: ocrData.amounts?.find((a) =>
            a.text?.toLowerCase().includes("rundung")
          )?.data,
          finalPrice: ocrData.totalAmount?.data,
          tax: ocrData.taxAmount?.data,
          paid: ocrData.paidAmount?.data,
          change: ocrData.amounts?.find(
            (a) =>
              a.text?.toLowerCase().includes("rückgeld") ||
              a.text?.toLowerCase().includes("change")
          )?.data,
        },

        // Line Items
        lineItems: extractLineItems(ocrData.text?.text || "", ocrData.amounts),

        // VAT Details
        vatDetails:
          ocrData.entities?.multiTaxLineItems?.map((item) => ({
            category: item.data.taxCategory || "",
            rate: item.data.taxRate.data * 100,
            base: item.data.grossAmount.data,
            amount: item.data.netAmount.data,
          })) || [],

        // Raw Text and Metadata
        rawText: ocrData.text?.text,
        metadata: {
          confidence: ocrData.confidenceLevel,
          currency: ocrData.totalAmount?.currencyCode || "CHF",
          language: ocrData.location?.country?.iso_code === "CH" ? "de" : "en",
          trackingId: ocrData.trackingId,
          elapsed: ocrData.elapsed,
          rotation: ocrData.targetRotation,
        },
      };

      // Log processed data with more structure
      console.log("Processed Receipt Data:", {
        basicInfo: {
          receiptNumber: processedData.receiptNumber,
          date: ocrData.date?.data,
          confidence: processedData.metadata.confidence,
        },
        merchant: processedData.merchant,
        amounts: processedData.amounts,
        lineItemsCount: processedData.lineItems.length,
        vatDetailsCount: processedData.vatDetails.length,
      });

      try {
        // Update form with the processed data
        if (processedData.receiptNumber) {
          setValue("receipt_number", processedData.receiptNumber);
        } else {
          console.warn("No receipt number could be extracted");
        }

        if (processedData.amounts.total) {
          setValue("total_amount", processedData.amounts.total.toString());
        } else {
          console.warn("No total amount could be extracted");
        }

        if (processedData.amounts.tax) {
          setValue("tax_amount", processedData.amounts.tax.toString());
        }

        if (processedData.amounts.subtotal) {
          setValue(
            "subtotal_amount",
            processedData.amounts.subtotal.toString()
          );
        }

        if (processedData.amounts.rounding) {
          setValue(
            "rounding_amount",
            processedData.amounts.rounding.toString()
          );
        }

        if (processedData.amounts.paid) {
          setValue("paid_amount", processedData.amounts.paid.toString());
        }

        if (processedData.amounts.change) {
          setValue("change_amount", processedData.amounts.change.toString());
        }

        if (processedData.merchant.name) {
          setValue("merchant_name", String(processedData.merchant.name));
        }

        if (processedData.merchant.taxId) {
          setValue("merchant_vat", String(processedData.merchant.taxId));
        }

        if (processedData.merchant.phone) {
          setValue("merchant_phone", String(processedData.merchant.phone));
        }

        if (processedData.merchant.website) {
          setValue("merchant_website", String(processedData.merchant.website));
        }

        if (processedData.merchant.address) {
          setValue("merchant_address", String(processedData.merchant.address));
        }

        // Extract VAT number with improved pattern matching
        const extractVatNumber = (text: string) => {
          const vatPatterns = [
            /(?:MWST|USt|VAT|UID)[-.]?(?:Nr\.?|Nummer)?[:\s]*(CHE-?[\d.-]+)/i,
            /(?:MWST|USt|VAT|UID)[-.]?(?:Nr\.?|Nummer)?[:\s]*([\d.-]{6,})/i,
            /(CHE-?[\d.-]+)/i,
          ];

          for (const pattern of vatPatterns) {
            const match = text?.match(pattern);
            if (match?.[1]) {
              return match[1].trim();
            }
          }

          return ocrData.merchantTaxId?.data
            ? String(ocrData.merchantTaxId.data)
            : "";
        };

        // Extract merchant VAT number
        if (ocrData.text?.text) {
          const vatNumber = extractVatNumber(ocrData.text.text);
          setValue("merchant_vat", vatNumber);
        }

        // Format VAT details for display with improved formatting
        if (processedData.vatDetails.length > 0) {
          const vatDetailsText = processedData.vatDetails
            .map((vat) => {
              const baseAmount =
                typeof vat.base === "number"
                  ? vat.base.toFixed(2)
                  : parseFloat(vat.base).toFixed(2);
              const rate =
                typeof vat.rate === "number"
                  ? vat.rate
                  : parseFloat(String(vat.rate));
              const vatAmount = (parseFloat(baseAmount) * (rate / 100)).toFixed(
                2
              );
              const totalAmount = (
                parseFloat(baseAmount) + parseFloat(vatAmount)
              ).toFixed(2);
              const category = vat.category ? `${vat.category} ` : "";
              return `${category}MwSt ${rate.toFixed(1)}%\nBasis: CHF ${baseAmount}\nMwSt: CHF ${vatAmount}\nTotal: CHF ${totalAmount}`;
            })
            .join("\n\n");
          setValue("vat_details", vatDetailsText);
        }

        // Set date if available
        if (ocrData.date?.data) {
          const parsedDate = new Date(ocrData.date.data);
          setValue("date", parsedDate);
          setValue("transaction_date", parsedDate);
        }

        // Update line items
        if (processedData.lineItems?.length > 0) {
          setLineItems(
            processedData.lineItems.map((item) => ({
              name: item.name,
              quantity: item.quantity || 1,
              unitPrice: item.unitPrice || item.totalPrice,
              totalPrice: item.totalPrice || item.unitPrice,
            }))
          );
        }

        setSnackbarMessage(
          `Receipt details extracted successfully! Confidence: ${(processedData.metadata.confidence * 100).toFixed(1)}%`
        );
      } catch (error) {
        console.error("Error updating form with processed data:", error);
        setSnackbarMessage("Error updating form with extracted data");
      }
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
    const unitPrice = parseFloat(newItemPrice);

    if (isNaN(quantity) || isNaN(unitPrice)) {
      setSnackbarMessage("Quantity and price must be valid numbers");
      setSnackbarVisible(true);
      return;
    }

    const newItem: LineItem = {
      name: newItemName,
      quantity,
      unitPrice,
      totalPrice: quantity * unitPrice,
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
      .reduce((total, item) => total + item.totalPrice, 0)
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
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      }));

      // Find a super admin to use as created_by
      console.log("Current user:", user);

      const { data: adminUser, error: adminError } = await supabase
        .from("admin")
        .select("id, name, email, role, status")
        .eq("email", user.email)
        .single();

      console.log("Admin query result:", { adminUser, adminError });

      if (!adminUser || adminUser.role !== "superadmin" || !adminUser.status) {
        console.error("User validation failed:", {
          exists: !!adminUser,
          role: adminUser?.role,
          status: adminUser?.status,
        });
        setSnackbarMessage(
          "Error: Could not verify super admin credentials. Please ensure you are logged in with the correct permissions."
        );
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

      // Log the receipt creation activity
      const activityLogData = {
        user_id: adminUser.id,
        activity_type: ActivityType.CREATE_RECEIPT,
        description: `Receipt "${data.receipt_number}" was created for company "${selectedCompany.company_name}" by ${adminUser.name}`,
        company_id: selectedCompany.id,
        metadata: {
          created_by: {
            id: adminUser.id,
            name: adminUser.name,
            email: adminUser.email,
            role: "admin",
          },
          company: {
            id: selectedCompany.id,
            name: selectedCompany.company_name,
          },
        },
        new_value: receiptData,
      };

      const { error: activityLogError } = await supabase
        .from("activity_logs")
        .insert([activityLogData]);

      if (activityLogError) {
        console.error("Error logging activity:", activityLogError);
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

  const handlePreviewClick = () => {
    console.log("Opening preview modal...");
    setShowPreviewModal(true);
  };

  const renderPreview = () => {
    if (!receiptImage && fileType !== "pdf") return null;

    return (
      <View style={styles.imagePreviewContainer}>
        <TouchableOpacity
          style={styles.previewTouchable}
          onPress={handlePreviewClick}
          activeOpacity={0.8}
        >
          {fileType === "pdf" ? (
            <View style={styles.pdfPreview}>
              <IconButton icon="file-pdf-box" size={48} />
              <Text style={styles.pdfPreviewText}>PDF Document</Text>
              <Text style={styles.previewHint}>Click to preview</Text>
            </View>
          ) : receiptImage ? (
            <>
              <Image
                source={{ uri: receiptImage }}
                style={styles.imagePreview}
                resizeMode="contain"
              />
              <View style={styles.previewOverlay}>
                <IconButton icon="magnify-plus" size={32} iconColor="#FFFFFF" />
                <Text style={styles.previewHint}>Click to expand</Text>
              </View>
            </>
          ) : null}
        </TouchableOpacity>
        <IconButton
          icon="delete"
          size={24}
          style={styles.deleteImageButton}
          onPress={() => setShowDeleteConfirmModal(true)}
          iconColor="#ef4444"
          disabled={isProcessingOCR}
        />
        {isProcessingOCR && (
          <View style={styles.ocrLoadingOverlay}>
            <ActivityIndicator size="large" />
            <Text style={styles.ocrLoadingText}>Processing Receipt...</Text>
          </View>
        )}
      </View>
    );
  };

  const renderPreviewModal = () => {
    if (!receiptImage) return null;

    return (
      <Portal>
        <Modal
          visible={showPreviewModal}
          onDismiss={() => setShowPreviewModal(false)}
          contentContainerStyle={[
            styles.previewModal,
            {
              backgroundColor: "white",
              margin: 0,
              padding: 0,
              width: "100%",
              height: "100%",
              maxWidth: "100%",
              maxHeight: "100%",
            },
          ]}
        >
          <Surface style={styles.previewModalContainer}>
            <View style={styles.previewModalHeader}>
              <View style={styles.previewModalHeaderLeft}>
                <IconButton
                  icon={fileType === "pdf" ? "file-pdf-box" : "image"}
                  size={24}
                  iconColor="#64748b"
                />
                <Text style={styles.previewModalTitle}>
                  {fileType === "pdf" ? "PDF Preview" : "Receipt Image"}
                </Text>
              </View>
              <View style={styles.previewModalActions}>
                <IconButton
                  icon="close"
                  size={24}
                  onPress={() => setShowPreviewModal(false)}
                />
              </View>
            </View>
            <View style={styles.previewModalContent}>
              {fileType === "pdf" ? (
                Platform.OS === "web" ? (
                  <iframe
                    src={receiptImage}
                    style={{
                      width: "100%",
                      height: "100%",
                      border: "none",
                      backgroundColor: "#f8fafc",
                    }}
                    title="PDF Preview"
                  />
                ) : (
                  <View style={styles.pdfPreviewPlaceholder}>
                    <IconButton icon="file-pdf-box" size={64} />
                    <Text style={styles.pdfPreviewText}>
                      PDF preview is not available on mobile devices
                    </Text>
                  </View>
                )
              ) : (
                <View style={styles.imagePreviewWrapper}>
                  <Image
                    source={{ uri: receiptImage }}
                    style={styles.previewModalImage}
                    resizeMode="contain"
                  />
                </View>
              )}
            </View>
          </Surface>
        </Modal>
      </Portal>
    );
  };

  const clearOCRFields = () => {
    // Clear all fields that might have been filled by OCR
    setValue("receipt_number", "");
    setValue("merchant_name", "");
    setValue("merchant_address", "");
    setValue("total_amount", "");
    setValue("tax_amount", "");
    setValue("subtotal_amount", "");
    setValue("rounding_amount", "");
    setValue("final_price", "");
    setValue("paid_amount", "");
    setValue("change_amount", "");
    setValue("merchant_vat", "");
    setValue("merchant_phone", "");
    setValue("merchant_website", "");
    setValue("vat_details", "");
    setValue("language_hint", "");
    setLineItems([]);
    // Show success message
    setSnackbarMessage("Receipt and auto-filled fields have been cleared");
    setSnackbarVisible(true);
  };

  const handleDeleteReceipt = () => {
    setReceiptImage(null);
    setFileType(null);
    clearOCRFields();
    setShowDeleteConfirmModal(false);
  };

  // Update the renderDeleteConfirmModal function
  const renderDeleteConfirmModal = () => {
    return (
      <Portal>
        <Modal
          visible={showDeleteConfirmModal}
          onDismiss={() => setShowDeleteConfirmModal(false)}
          contentContainerStyle={[
            styles.confirmModal,
            {
              width: isLargeScreen ? 480 : isMediumScreen ? 420 : "90%",
              alignSelf: "center",
            },
          ]}
        >
          <View style={styles.confirmModalContent}>
            <IconButton
              icon="alert"
              size={32}
              iconColor="#ef4444"
              style={styles.confirmModalIcon}
            />
            <Text style={styles.confirmModalTitle}>Delete Receipt?</Text>
            <Text style={styles.confirmModalText}>
              This will remove the uploaded receipt image and clear all
              automatically filled fields. This action cannot be undone.
            </Text>
            <View style={styles.confirmModalButtons}>
              <Button
                mode="outlined"
                onPress={() => setShowDeleteConfirmModal(false)}
                style={[styles.confirmButton, styles.confirmCancelButton]}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleDeleteReceipt}
                style={[styles.confirmButton, styles.confirmDeleteButton]}
                buttonColor="#ef4444"
              >
                Delete
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>
    );
  };

  // Update the renderUploadSection to include the confirmation modal
  const renderUploadSection = () => {
    const isWebPlatform = Platform.OS === "web";
    const isMobileWeb = isWebPlatform && dimensions.width < 768;

    return (
      <View>

        <View >
          <View style={styles.imageButtonsContainer}>
            {!isWebPlatform || isMobileWeb ? (
              <>
                <Button
                  mode="outlined"
                  icon="camera"
                  onPress={takePhoto}
                  style={[styles.imageButton, { marginRight: 8 }]}
                  disabled={isProcessingOCR || !selectedCompany}
                >
                  Take Photo
                </Button>
                <Button
                  mode="outlined"
                  icon="image"
                  onPress={pickImage}
                  style={styles.imageButton}
                  disabled={isProcessingOCR || !selectedCompany}
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
                disabled={isProcessingOCR || !selectedCompany}
              >
                Upload Image/PDF
              </Button>
            )}
          </View>

          {renderPreview()}
        </View>
        {renderDeleteConfirmModal()}
        {renderPreviewModal()}
      </View>
    );
  };

  // Update the step card content to use CompanySelector
  const renderStepOne = () => (
    <Animated.View entering={FadeIn.delay(200)}>
      <Surface style={[styles.formCard, styles.stepCard]}>
        <View style={styles.stepHeader}>
          <View style={styles.stepNumberContainer}>
            <Text style={styles.stepNumber}>1</Text>
          </View>
          <Text style={styles.stepTitle}>Select Company</Text>
        </View>
        <View style={styles.cardContent}>
          <Text style={styles.stepDescription}>
            Choose the company this receipt belongs to
          </Text>
          <CompanySelector
            onSelect={(company) => setSelectedCompany(company)}
            selectedCompany={selectedCompany}
            required
            label="Select Company"
          />
        </View>
      </Surface>
    </Animated.View>
  );

  // Update the payment method button text
  const getPaymentMethodButtonText = () => {
    return payment_method || "Select Payment Method";
  };

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title="Add a Receipt"
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
              maxWidth: isLargeScreen ? 1700 : isMediumScreen ? 1100 : "100%",
              paddingHorizontal: isLargeScreen ? 48 : isMediumScreen ? 32 : 16,
            },
          ]}
        >
          <View style={styles.headerSection}>
            <Text style={styles.pageTitle}>Add a Receipt</Text>
            <Text style={styles.pageSubtitle}>
              Follow the steps below to add a new receipt
            </Text>
          </View>
          <View style={styles.gridContainer}>
            <View style={styles.gridColumn}>
              {renderStepOne()}
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
                      <Text style={styles.cardTitle}>
                        Basic Receipt Information
                      </Text>
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

                    <Controller
                      control={control}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label="Phone Number"
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          style={styles.input}
                          disabled={loading}
                        />
                      )}
                      name="merchant_phone"
                    />

                    {/* Merchant Website */}
                    <Controller
                      control={control}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label="Website"
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          style={styles.input}
                          disabled={loading}
                        />
                      )}
                      name="merchant_website"
                    />
                    <Controller
                      control={control}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label="Merchant VAT Number"
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          style={styles.input}
                          disabled={loading}
                        />
                      )}
                      name="merchant_vat"
                    />

                    {/* VAT Details */}
                    <Controller
                      control={control}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label="VAT Breakdown"
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          style={styles.input}
                          multiline
                          numberOfLines={4}
                          disabled={loading}
                        />
                      )}
                      name="vat_details"
                    />
                  </View>
                </Surface>
              </Animated.View>
            </View>
            <View style={styles.gridColumn}>
              <Animated.View
                entering={FadeIn.delay(200)}
                style={styles.stepContainer}
              >
                <Surface style={[styles.formCard, styles.stepCard]}>
                  <View style={styles.stepHeader}>
                    <View style={styles.stepNumberContainer}>
                      <Text style={styles.stepNumber}>2</Text>
                    </View>
                    <Text style={styles.stepTitle}>Upload Receipt</Text>
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={styles.stepDescription}>
                      Upload a receipt image or PDF for automatic data
                      extraction
                    </Text>
                    {renderUploadSection()}
                  </View>
                </Surface>
              </Animated.View>
              <Animated.View entering={FadeIn.delay(200)}>
                {/* Line Items */}
                <Surface style={[styles.formCard, { marginTop: 0 }]}>
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
                      <Text style={styles.cardTitle}>Receipt Line Items</Text>
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
                            // Update total price when quantity changes
                            updatedItems[index].totalPrice =
                              updatedItems[index].unitPrice * Number(text);
                            setLineItems(updatedItems);
                          }}
                          keyboardType="numeric"
                          style={[styles.input, styles.qtyInput]}
                          mode="outlined"
                        />
                        <TextInput
                          label="Unit Price"
                          value={item.unitPrice.toString()}
                          onChangeText={(text) => {
                            const updatedItems = [...lineItems];
                            updatedItems[index].unitPrice = Number(text) || 0;
                            // Update total price when unit price changes
                            updatedItems[index].totalPrice =
                              updatedItems[index].quantity * Number(text);
                            setLineItems(updatedItems);
                          }}
                          keyboardType="decimal-pad"
                          style={[styles.input, styles.priceInput]}
                          mode="outlined"
                          left={<TextInput.Affix text="CHF" />}
                        />
                        <TextInput
                          label="Total Price"
                          value={item.totalPrice.toString()}
                          editable={false}
                          style={[styles.input, styles.priceInput]}
                          mode="outlined"
                          left={<TextInput.Affix text="CHF" />}
                        />
                        <IconButton
                          icon="delete"
                          size={24}
                          onPress={() => removeLineItem(index)}
                          iconColor={theme.colors.error}
                        />
                      </View>
                    ))}

                    <Button
                      mode="outlined"
                      onPress={() =>
                        setLineItems([
                          ...lineItems,
                          {
                            name: "",
                            quantity: 1,
                            unitPrice: 0,
                            totalPrice: 0,
                          },
                        ])
                      }
                      style={styles.addItemButton}
                      icon="plus"
                    >
                      Add Line Item
                    </Button>
                  </View>
                </Surface>
              </Animated.View>
              <Animated.View entering={FadeIn.delay(200)}>
                {/* Financial Details */}
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
                        Receipt Financial Details
                      </Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    {/* Subtotal Amount */}
                    <Controller
                      control={control}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label="Subtotal Amount"
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          style={styles.input}
                          keyboardType="decimal-pad"
                          disabled={loading}
                          left={<TextInput.Affix text="CHF" />}
                        />
                      )}
                      name="subtotal_amount"
                    />

                    {/* Rounding */}
                    <Controller
                      control={control}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label="Rounding"
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          style={styles.input}
                          keyboardType="decimal-pad"
                          disabled={loading}
                          left={<TextInput.Affix text="CHF" />}
                        />
                      )}
                      name="rounding_amount"
                    />

                    {/* Final Price */}
                    <Controller
                      control={control}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label="Final Price"
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          style={styles.input}
                          keyboardType="decimal-pad"
                          disabled={loading}
                          left={<TextInput.Affix text="CHF" />}
                        />
                      )}
                      name="final_price"
                    />

                    {/* Total Amount (existing) */}
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
                            left={<TextInput.Affix text="CHF" />}
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

                    {/* Tax Amount (existing) */}
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
                            left={<TextInput.Affix text="CHF" />}
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

                    {/* Paid Amount */}
                    <Controller
                      control={control}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label="Paid Amount"
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          style={styles.input}
                          keyboardType="decimal-pad"
                          disabled={loading}
                          left={<TextInput.Affix text="CHF" />}
                        />
                      )}
                      name="paid_amount"
                    />

                    {/* Change Amount */}
                    <Controller
                      control={control}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <TextInput
                          label="Change"
                          mode="outlined"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          style={styles.input}
                          keyboardType="decimal-pad"
                          disabled={loading}
                          left={<TextInput.Affix text="CHF" />}
                        />
                      )}
                      name="change_amount"
                    />

                    {/* Payment Method (existing) */}
                    <Button
                      mode="outlined"
                      onPress={() => setShowPaymentMethodModal(true)}
                      style={styles.selectButton}
                      icon="credit-card"
                    >
                      {getPaymentMethodButtonText()}
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
                "Add a Receipt"
              )}
            </Button>
          </View>
        </Surface>
      </KeyboardAvoidingView>

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

      {/* Delete Confirmation Modal */}
      <Portal>
        <Modal
          visible={showDeleteConfirmModal}
          onDismiss={() => setShowDeleteConfirmModal(false)}
          contentContainerStyle={[
            styles.confirmModal,
            {
              width: isLargeScreen ? 480 : isMediumScreen ? 420 : "90%",
              alignSelf: "center",
            },
          ]}
        >
          <View style={styles.confirmModalContent}>
            <IconButton
              icon="alert"
              size={32}
              iconColor="#ef4444"
              style={styles.confirmModalIcon}
            />
            <Text style={styles.confirmModalTitle}>Delete Receipt?</Text>
            <Text style={styles.confirmModalText}>
              This will remove the uploaded receipt image and clear all
              automatically filled fields. This action cannot be undone.
            </Text>
            <View style={styles.confirmModalButtons}>
              <Button
                mode="outlined"
                onPress={() => setShowDeleteConfirmModal(false)}
                style={[styles.confirmButton, styles.confirmCancelButton]}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleDeleteReceipt}
                style={[styles.confirmButton, styles.confirmDeleteButton]}
                buttonColor="#ef4444"
              >
                Delete
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>

      <CustomSnackbar
        visible={snackbarVisible}
        message={snackbarMessage}
        onDismiss={() => setSnackbarVisible(false)}
        type={
          snackbarMessage?.includes("successful") ||
          snackbarMessage?.includes("Proccesing") ||
          snackbarMessage?.includes("instructions will be sent")
            ? "success"
            : snackbarMessage?.includes("rate limit") ||
                snackbarMessage?.includes("network") ||
                snackbarMessage?.includes("processing")
              ? "info"
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
  receiptGridContainer: {
    flexDirection: "row",
    gap: 24,
    flexWrap: "wrap",
    marginTop: 24,
    marginBottom: 24,
  },
  stepContainer: {},
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
  stepCard: {
    overflow: "visible",
  },
  stepHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    gap: 16,
  },
  stepNumberContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
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
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
    fontFamily: "Poppins-SemiBold",
  },
  stepDescription: {
    fontSize: 14,
    color: "#64748b",
    marginBottom: 24,
    fontFamily: "Poppins-Regular",
  },
  detailsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 24,
    width: "100%",
  },
  detailsCard: {
    flex: 1,
    minWidth: 300,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  detailsCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#f8fafc",
  },
  detailsCardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
    fontFamily: "Poppins-SemiBold",
  },
  detailsCardContent: {
    padding: 16,
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
    marginTop: 16,
    width: "100%",
    position: "relative",
    borderRadius: 8,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 4,
    objectFit: "contain",
  } as ImageStyle,
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
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
  },
  pdfPreviewPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  pdfPreviewText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    fontWeight: "600",
  },
  previewModal: {
    margin: 0,
    padding: 0,
  },
  previewModalContainer: {
    flex: 1,
    backgroundColor: "white",
    width: "100%",
    height: "100%",
    borderRadius: 0,
  },
  previewModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "white",
    zIndex: 1,
  },
  previewModalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewModalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1e293b",
    fontFamily: "Poppins-SemiBold",
  },
  previewModalActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  previewModalContent: {
    flex: 1,
    backgroundColor: "#f8fafc",
    position: "relative",
  },
  imagePreviewWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  previewModalImage: {
    width: "100%",
    height: "100%",
    maxWidth: 1200,
    maxHeight: "90%",
    objectFit: "contain",
  } as ImageStyle,
  previewTouchable: {
    width: "100%",
    position: "relative",
    cursor: Platform.OS === "web" ? ("pointer" as const) : undefined,
  },
  previewOverlay: {
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
    color: "#64748b",
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    fontWeight: "300",
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
  confirmModal: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
  },
  confirmModalContent: {
    alignItems: "center",
  },
  confirmModalIcon: {
    marginBottom: 16,
    backgroundColor: "#FEF2F2",
    borderRadius: 40,
    padding: 8,
  },
  confirmModalTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#1e293b",
    marginBottom: 12,
    fontFamily: "Poppins-SemiBold",
  },
  confirmModalText: {
    fontSize: 14,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  confirmModalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  confirmButton: {
    flex: 1,
  },
  confirmCancelButton: {
    borderColor: "#e2e8f0",
  },
  confirmDeleteButton: {
    backgroundColor: "#ef4444",
  },
});

// Add web-specific hover styles
if (Platform.OS === "web") {
  const styleSheet = document.createElement("style");
  styleSheet.textContent = `
    .previewTouchable:hover .previewOverlay {
      opacity: 1 !important;
      transition: opacity 0.2s ease;
    }
  `;
  document.head.appendChild(styleSheet);
}

export default CreateReceiptScreen;
