import React, { useState, useEffect, useRef } from "react";
import { logDebug } from "../../utils/logger";
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
  ProgressBar,
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

interface DateChangeEvent {
  type: string;
  nativeEvent?: {
    timestamp?: number;
  };
  target?: HTMLInputElement;
}

interface WebDateChangeEvent extends React.ChangeEvent<HTMLInputElement> {}
interface NativeDateChangeEvent {
  type: string;
  nativeEvent: {
    timestamp: number;
  };
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
    merchantTaxId?: TaggunEntity;
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

// OCR processing is now handled by the Supabase Edge Function

// Add this helper function outside the component
const getWebStyles = (isDisabled: boolean) => {
  if (Platform.OS === "web") {
    return {
      cursor: isDisabled ? "not-allowed" : "pointer",
    } as any; // Using any to bypass type checking for web-specific styles
  }
  return {};
};

const baseStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollView: {},
  contentContainer: {
    paddingBottom: 24,
  },
  dropzoneText: {
    fontSize: 16,
    color: "#64748B",
    fontFamily: "Poppins-Medium",
    textAlign: "center",
    marginTop: 16,
  },
  dropzoneSubtext: {
    fontSize: 14,
    color: "#94A3B8",
    fontFamily: "Poppins-Regular",
    textAlign: "center",
    marginTop: 8,
  },
  previewContainer: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 16,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0,
  },
  previewText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Poppins-Medium",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    marginTop: 8,
  },
  uploadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});

// Add this after the imports
const webSpecificStyles =
  Platform.OS === "web"
    ? ({
        dropzoneTransition: {
          transition: "all 1s ease",
        },
        uploadingOverlayTransition: {
          backdropFilter: "blur(4px)",
        },
        cursorNotAllowed: {
          cursor: "not-allowed",
        } as { cursor: "not-allowed" },
      } as const)
    : {};

// Utility functions
const getDisabledStyle = (isDisabled: boolean): { cursor?: "not-allowed" } => {
  if (Platform.OS === "web" && isDisabled) {
    return { cursor: "not-allowed" };
  }
  return {};
};

// Web-specific styles that will be applied conditionally
const webStyles = {
  disabled: Platform.OS === "web" ? { pointerEvents: "none" as const } : {},
};

const CreateReceiptScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const dimensions = useWindowDimensions();

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

  // Dynamic styles definition
  const dynamicStyles = StyleSheet.create({
    dropzone: {
      borderWidth: 2,
      borderColor: "#E0E0E0",
      borderStyle: "dashed",
      borderRadius: 16,
      padding: 24,
      backgroundColor: "#FAFAFA",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 16,
      minHeight: 200,
      position: "relative",
      overflow: "hidden",
      ...(Platform.OS === "web" ? webSpecificStyles.dropzoneTransition : {}),
    },
    dropzoneActive: {
      borderColor: "#FF867E",
      backgroundColor: "rgba(255, 134, 126, 0.02)",
    },
    dropzoneUploading: {
      borderColor: theme.colors.primary,
      backgroundColor: "rgba(59, 130, 246, 0.05)",
      opacity: 0.8,
    },
    dropzoneDisabled: {
      opacity: 0.5,
      backgroundColor: "#F1F5F9",
    },
    uploadingOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 5,
      ...(Platform.OS === "web"
        ? webSpecificStyles.uploadingOverlayTransition
        : {}),
    },
  });

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

  // Add image manipulation state
  const [imageScale, setImageScale] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);

  // Add OneDrive upload state
  const [uploadingToOneDrive, setUploadingToOneDrive] = useState(false);
  const [oneDriveUploadProgress, setOneDriveUploadProgress] = useState(0);
  const [oneDriveUploadError, setOneDriveUploadError] = useState<string | null>(
    null
  );
  const [oneDriveItemId, setOneDriveItemId] = useState<string | null>(null);
  const [oneDriveSharingLink, setOneDriveSharingLink] = useState<string | null>(
    null
  );
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadedDocumentId, setUploadedDocumentId] = useState<string | null>(
    null
  );
  const [deletingReceipt, setDeletingReceipt] = useState(false);

  // Add drop handler for web
  const dropRef = useRef(null);

  useEffect(() => {
    if (Platform.OS === "web" && dropRef.current) {
      const element = dropRef.current as unknown as HTMLElement;
      let dragCounter = 0;

      const handleDragEnter = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter++;
        if (dragCounter === 1) {
          setIsDragActive(true);
        }
      };

      const handleDragOver = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
      };

      const handleDragLeave = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter--;
        if (dragCounter === 0) {
          setIsDragActive(false);
        }
      };

      const handleDrop = async (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter = 0;
        setIsDragActive(false);

        if (!selectedCompany) {
          setSnackbarMessage("Please select a company first");
          setSnackbarVisible(true);
          return;
        }

        if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
          const file = e.dataTransfer.files[0];

          // Simple and clear file validation
          const validTypes = [
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/jpg",
            "image/heic",
          ];

          if (!validTypes.includes(file.type)) {
            setSnackbarMessage(
              "Invalid file type. Please upload PDF or image files (JPEG, PNG, HEIC)."
            );
            setSnackbarVisible(true);
            return;
          }

          // Simple size check
          if (file.size > 10 * 1024 * 1024) {
            setSnackbarMessage("File is too large. Maximum size is 10MB.");
            setSnackbarVisible(true);
            return;
          }

          try {
            // Clean up previous file URL if it exists
            if (receiptImage && receiptImage.startsWith("blob:")) {
              URL.revokeObjectURL(receiptImage);
            }

            // Set file type and create URL
            setFileType(file.type.includes("pdf") ? "pdf" : "image");
            const fileUrl = URL.createObjectURL(file);
            setReceiptImage(fileUrl);

            // Process with OCR and handle upload
            await handleImageSelection(fileUrl, "gallery", file);
          } catch (error) {
            console.error("Error handling dropped file:", error);
            setSnackbarMessage("Error processing the file. Please try again.");
            setSnackbarVisible(true);

            // Clean up on error
            if (receiptImage && receiptImage.startsWith("blob:")) {
              URL.revokeObjectURL(receiptImage);
            }
            setReceiptImage(null);
            setFileType(null);
          }
        }
      };

      element.addEventListener("dragenter", handleDragEnter);
      element.addEventListener("dragover", handleDragOver);
      element.addEventListener("dragleave", handleDragLeave);
      element.addEventListener("drop", handleDrop);

      return () => {
        element.removeEventListener("dragenter", handleDragEnter);
        element.removeEventListener("dragover", handleDragOver);
        element.removeEventListener("dragleave", handleDragLeave);
        element.removeEventListener("drop", handleDrop);

        // Clean up any existing blob URLs
        if (receiptImage && receiptImage.startsWith("blob:")) {
          URL.revokeObjectURL(receiptImage);
        }
      };
    }
  }, [dropRef, selectedCompany, receiptImage]);

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
      payment_method: "",
      merchant_address: "",
      language_hint: "",
      subtotal_amount: "",
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

  // Snackbar message handling
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

  // Add a reusable function to check if a receipt number already exists for the selected company
  const checkReceiptNumberExists = async (
    receiptNumber: string
  ): Promise<boolean> => {
    if (!receiptNumber || !selectedCompany?.id) return false;

    try {
      logDebug(
        `Checking if receipt number "${receiptNumber}" exists for company ID "${selectedCompany.id}"`
      );

      // Only check for duplicates within the same company
      const { data, error } = await supabase
        .from("receipts")
        .select("id, receipt_number")
        .eq("receipt_number", receiptNumber)
        .eq("company_id", selectedCompany.id); // This ensures we only check within the selected company

      // If we found any receipts with this number in this company, it's a duplicate
      const exists = Array.isArray(data) && data.length > 0;
      logDebug(`Receipt exists for this company: ${exists}`, data);

      return exists;
    } catch (error: any) {
      console.error("Error checking receipt number:", error);
      return false;
    }
  };

  const processReceiptWithOCR = async (imageUri: string) => {
    try {
      setIsProcessingOCR(true);
      showSnackbarMessage(
        "Processing receipt... This may take a few moments",
        "info"
      );

      // Convert image URI to blob
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Create form data for the Edge Function
      const formData = new FormData();
      formData.append(
        "file",
        blob,
        fileType === "pdf" ? "receipt.pdf" : "receipt.jpg"
      );

      // Add optional parameters
      formData.append("language", "de");
      formData.append("near", "Switzerland");
      formData.append(
        "filename",
        fileType === "pdf" ? "receipt.pdf" : "receipt.jpg"
      );

      // Call the Supabase Edge Function instead of directly calling Taggun API
      const functionResponse = await supabase.functions.invoke("ocr-service", {
        body: formData,
      });

      if (functionResponse.error) {
        throw new Error(
          `OCR processing failed: ${functionResponse.error.message}`
        );
      }

      // Extract the formatted data from the response
      const formattedData = functionResponse.data?.data;
      // Keep the raw OCR data for reference if needed
      const ocrData: TaggunResponse = functionResponse.data?.raw_data;

      // Helper function for proper rounding (kept for any additional calculations)
      const roundToTwoDecimals = (num: number): number => {
        return Math.round((num + Number.EPSILON) * 100) / 100;
      };

      const formatAmount = (amount: number): string => {
        return roundToTwoDecimals(amount).toFixed(2);
      };

      // Update form with extracted data from the formatted response
      if (formattedData) {
        // Basic receipt information
        if (formattedData.receipt_number) {
          // Check if this receipt number already exists for the selected company
          if (selectedCompany) {
            const exists = await checkReceiptNumberExists(
              formattedData.receipt_number
            );
            if (exists) {
              showSnackbarMessage(
                `Receipt number "${formattedData.receipt_number}" already exists for this company. Please use a different receipt number.`,
                "error"
              );
              // Still set the value so the user can edit it
              setValue("receipt_number", formattedData.receipt_number);
            } else {
              setValue("receipt_number", formattedData.receipt_number);
            }
          } else {
            setValue("receipt_number", formattedData.receipt_number);
          }
        }

        if (formattedData.total_amount) {
          setValue("total_amount", formattedData.total_amount);
          // Also set final_price if it's not already set
          if (!getValues("final_price")) {
            setValue("final_price", formattedData.total_amount);
          }
        }

        if (formattedData.tax_amount) {
          setValue("tax_amount", formattedData.tax_amount);
        }

        if (formattedData.merchant_name) {
          setValue("merchant_name", formattedData.merchant_name);
        }

        if (formattedData.merchant_address) {
          setValue("merchant_address", formattedData.merchant_address);
        }

        // Financial details
        if (formattedData.subtotal_amount) {
          setValue("subtotal_amount", formattedData.subtotal_amount);
        }

        if (formattedData.paid_amount) {
          setValue("paid_amount", formattedData.paid_amount);
        }

        if (formattedData.change_amount) {
          setValue("change_amount", formattedData.change_amount);
        }

        // Additional merchant information
        if (formattedData.merchant_vat) {
          setValue("merchant_vat", formattedData.merchant_vat);
        }

        if (formattedData.merchant_phone) {
          setValue("merchant_phone", formattedData.merchant_phone);
        }

        if (formattedData.merchant_website) {
          setValue("merchant_website", formattedData.merchant_website);
        }

        // VAT details
        if (formattedData.vat_details) {
          setValue("vat_details", formattedData.vat_details);
        }

        // Handle date
        if (formattedData.date) {
          const parsedDate = new Date(formattedData.date);
          if (!isNaN(parsedDate.getTime())) {
            setValue("date", parsedDate);
            setValue("transaction_date", parsedDate);
          }
        }

        // Update line items if available
        if (formattedData.line_items && formattedData.line_items.length > 0) {
          setLineItems(formattedData.line_items);
        }
      }

      // Enhanced receipt number extraction
      const extractReceiptNumber = (text: string): string | null => {
        const receiptPatterns = [
          // Common receipt number patterns
          /(?:Beleg|Receipt|Bon|Quittung|Rechnung)[-\s]?(?:Nr\.?|Number|Nummer)?[:.\s]*([A-Z0-9][-A-Z0-9\/]{3,20})/i,
          /(?:Nr\.?|No\.?|Number|Nummer)[:.\s]*([A-Z0-9][-A-Z0-9\/]{3,20})/i,
          /#\s*([A-Z0-9][-A-Z0-9\/]{3,20})/i,
          /\b(?:KA|RE|BN|RG|BLG)[-:]([A-Z0-9][-A-Z0-9\/]{3,20})\b/i,

          // Date-based receipt numbers
          /\b(\d{4}[-\/]\d{2}[-\/]\d{2}[-\/][A-Z0-9]+)\b/,
          /\b([A-Z]{2,3}[-\/]?\d{2}[-\/]?\d{2}[-\/]?\d{4}[-\/]?[A-Z0-9]*)\b/,

          // Sequential numbers with prefix
          /\b([A-Z]{1,3}[-\/]?\d{6,10})\b/,
          /\b(R-\d{4,10})\b/i,
        ];

        // Try each pattern
        for (const pattern of receiptPatterns) {
          const match = text.match(pattern);
          if (match && match[1]) {
            return match[1].trim();
          }
        }
        return null;
      };

      // Try to get receipt number from multiple sources
      let receiptNumber = null;

      // 1. Try from direct receipt number field
      if (ocrData.entities?.receiptNumber?.data) {
        logDebug(
          "Found receipt number in receiptNumber field:",
          ocrData.entities.receiptNumber.data
        );
        // Clean the receipt number - remove special characters except - and /
        receiptNumber = String(ocrData.entities.receiptNumber.data)
          .replace(/[^a-zA-Z0-9-\/]/g, "")
          .trim();
      }

      // 2. Try from invoice number if receipt number not found
      if (!receiptNumber && ocrData.entities?.invoiceNumber?.data) {
        logDebug(
          "Found receipt number in invoiceNumber field:",
          ocrData.entities.invoiceNumber.data
        );
        // Clean the invoice number
        receiptNumber = String(ocrData.entities.invoiceNumber.data)
          .replace(/[^a-zA-Z0-9-\/]/g, "")
          .trim();
      }

      // 3. Try extracting from raw text
      if (!receiptNumber && ocrData.text?.text) {
        const extractedNumber = extractReceiptNumber(ocrData.text.text);
        if (extractedNumber) {
          logDebug("Found receipt number in raw text:", extractedNumber);
          // Clean the extracted number
          receiptNumber = extractedNumber
            .replace(/[^a-zA-Z0-9-\/]/g, "")
            .trim();
        }
      }

      // 4. Generate a fallback receipt number if none found
      if (!receiptNumber) {
        // Generate receipt number based on date and random number
        const today = new Date();
        const randomNum = Math.floor(Math.random() * 10000)
          .toString()
          .padStart(4, "0");
        receiptNumber = `R-${today.getFullYear()}${(today.getMonth() + 1).toString().padStart(2, "0")}${today.getDate().toString().padStart(2, "0")}-${randomNum}`;
        logDebug("Generated fallback receipt number:", receiptNumber);
      }

      // Set the receipt number
      if (receiptNumber) {
        setValue("receipt_number", receiptNumber);
      }

      // Update form with extracted data
      if (ocrData.totalAmount?.data) {
        const totalAmount = roundToTwoDecimals(
          Number(ocrData.totalAmount.data)
        );
        setValue("total_amount", formatAmount(totalAmount));
        // Also set final_price if it's not already set
        if (!getValues("final_price")) {
          setValue("final_price", formatAmount(totalAmount));
        }
      }

      if (ocrData.taxAmount?.data) {
        const taxAmount = roundToTwoDecimals(Number(ocrData.taxAmount.data));
        setValue("tax_amount", formatAmount(taxAmount));
      }

      if (ocrData.merchantName?.data) {
        setValue("merchant_name", String(ocrData.merchantName.data));
      }

      if (ocrData.merchantAddress?.data) {
        setValue("merchant_address", String(ocrData.merchantAddress.data));
      }

      // Handle subtotal amount - try multiple sources
      const subtotal = roundToTwoDecimals(
        Number(
          ocrData.entities?.productLineItems?.reduce(
            (sum, item) => sum + (Number(item.data.totalPrice?.data) || 0),
            0
          ) ||
            ocrData.amounts?.find((a) =>
              a.text?.toLowerCase().includes("zwischensumme")
            )?.data ||
            ocrData.amounts?.find((a) =>
              a.text?.toLowerCase().includes("subtotal")
            )?.data ||
            0
        )
      );

      if (subtotal > 0) {
        setValue("subtotal_amount", formatAmount(subtotal));
      }

      // Handle paid amount and change with improved calculation
      if (
        ocrData.paidAmount?.data ||
        ocrData.amounts?.find(
          (a) =>
            a.text?.toLowerCase().includes("bezahlt") ||
            a.text?.toLowerCase().includes("paid")
        )?.data
      ) {
        const paidAmount = roundToTwoDecimals(
          Number(
            ocrData.paidAmount?.data ||
              ocrData.amounts?.find(
                (a) =>
                  a.text?.toLowerCase().includes("bezahlt") ||
                  a.text?.toLowerCase().includes("paid")
              )?.data ||
              0
          )
        );

        if (paidAmount > 0) {
          setValue("paid_amount", formatAmount(paidAmount));

          // Calculate change amount if we have both paid amount and total amount
          const totalAmount = Number(ocrData.totalAmount?.data || 0);
          if (!isNaN(paidAmount) && !isNaN(totalAmount) && totalAmount > 0) {
            const change = roundToTwoDecimals(paidAmount - totalAmount);
            if (change > 0) {
              setValue("change_amount", formatAmount(change));
            }
          }
        }
      }

      // Try to determine payment method
      const paymentMethodKeywords = {
        "Credit Card": [
          "credit",
          "card",
          "visa",
          "mastercard",
          "amex",
          "kreditkarte",
        ],
        "Debit Card": ["debit", "ec", "maestro", "vpay", "debitkarte"],
        Cash: ["cash", "bar", "bargeld"],
        "Bank Transfer": ["bank", "transfer", "überweisung", "sepa"],
        Check: ["check", "cheque", "scheck"],
      };

      const receiptText = ocrData.text?.text?.toLowerCase() || "";
      for (const [method, keywords] of Object.entries(paymentMethodKeywords)) {
        if (keywords.some((keyword) => receiptText.includes(keyword))) {
          setValue("payment_method", method);
          break;
        }
      }

      // Handle final price - try multiple sources
      const finalPrice = roundToTwoDecimals(
        Number(
          ocrData.totalAmount?.data ||
            ocrData.amounts?.find(
              (a) =>
                a.text?.toLowerCase().includes("total") ||
                a.text?.toLowerCase().includes("summe")
            )?.data ||
            0
        )
      );

      if (finalPrice > 0) {
        setValue("final_price", formatAmount(finalPrice));
      }

      // Enhanced merchant VAT number extraction
      const extractVatNumber = (text: string): string | null => {
        const vatPatterns = [
          // Swiss VAT patterns
          /(?:CHE-?)?(\d{3}\.?\d{3}\.?\d{3}(?:\s?MWST|\s?TVA|\s?IVA)?)/i,
          /(?:MWST|USt|VAT|UID|TVA)[-.]?(?:Nr\.?|Nummer|\s)*[:\s]*((?:CHE-?)?\d{3}\.?\d{3}\.?\d{3})/i,

          // General VAT patterns
          /(?:VAT|MWST|USt|UID)[-.]?(?:ID|Nr\.?|Nummer)?[:\s]*([A-Z0-9]{8,15})/i,
          /(?:Steuer|Tax)[-.]?(?:Nr\.?|Nummer)[:\s]*([A-Z0-9]{8,15})/i,

          // Direct number patterns
          /\b(CHE-?\d{3}\.?\d{3}\.?\d{3})\b/i,
        ];

        // Try each pattern
        for (const pattern of vatPatterns) {
          const match = text.match(pattern);
          if (match && match[1]) {
            // Clean up the found VAT number
            let vatNumber = match[1].replace(/[^A-Z0-9]/gi, "");

            // Format Swiss VAT numbers
            if (vatNumber.length === 9 && /^\d+$/.test(vatNumber)) {
              vatNumber = `CHE-${vatNumber.slice(0, 3)}.${vatNumber.slice(3, 6)}.${vatNumber.slice(6)}`;
            }

            return vatNumber;
          }
        }
        return null;
      };

      // Try to extract merchant VAT number from multiple sources
      const vatNumber =
        extractVatNumber(ocrData.text?.text) ||
        (ocrData.merchantTaxId?.data
          ? String(ocrData.merchantTaxId.data)
          : null);

      if (vatNumber) {
        setValue("merchant_vat", vatNumber);
      }

      // Format VAT details for display with improved formatting and NaN handling
      if (ocrData.entities?.multiTaxLineItems?.length > 0) {
        logDebug("Raw VAT data:", ocrData.entities.multiTaxLineItems);

        const vatDetailsText = ocrData.entities.multiTaxLineItems
          .map((vat) => {
            // Try to get values from different possible locations in the data structure
            const base = roundToTwoDecimals(
              parseFloat(
                String(
                  vat.base ||
                    vat.data?.base ||
                    vat.data?.grossAmount?.data ||
                    vat.data?.baseAmount?.data ||
                    "0"
                )
              )
            );
            const rate = roundToTwoDecimals(
              parseFloat(
                String(
                  vat.rate ||
                    vat.data?.rate ||
                    vat.data?.taxRate?.data ||
                    vat.data?.percentage?.data ||
                    "0"
                )
              ) * (vat.data?.taxRate?.data ? 100 : 1)
            );

            logDebug("Parsed VAT values:", { base, rate });

            if (isNaN(base) || isNaN(rate) || base === 0 || rate === 0) {
              logDebug("Skipping invalid VAT entry:", { base, rate });
              return null;
            }

            const vatAmount = roundToTwoDecimals((base * rate) / 100);
            const total = roundToTwoDecimals(base + vatAmount);

            logDebug("Calculated VAT values:", {
              base: formatAmount(base),
              rate: rate.toFixed(1),
              vatAmount: formatAmount(vatAmount),
              total: formatAmount(total),
            });

            return `MwSt ${rate.toFixed(1)}%\nBasis: CHF ${formatAmount(base)}\nMwSt: CHF ${formatAmount(vatAmount)}\nTotal: CHF ${formatAmount(total)}`;
          })
          .filter(Boolean)
          .join("\n\n");

        if (vatDetailsText) {
          setValue("vat_details", vatDetailsText);
        } else {
          logDebug(
            "No valid VAT details to display, trying fallback calculation"
          );

          // Fallback: Try to calculate VAT from total and tax amounts
          const total = roundToTwoDecimals(
            parseFloat(String(ocrData.totalAmount?.data || "0"))
          );
          const tax = roundToTwoDecimals(
            parseFloat(String(ocrData.taxAmount?.data || "0"))
          );

          if (!isNaN(total) && !isNaN(tax) && total > 0 && tax > 0) {
            const base = roundToTwoDecimals(total - tax);
            const rate = roundToTwoDecimals((tax / base) * 100);

            logDebug("Fallback VAT calculation:", {
              total: formatAmount(total),
              tax: formatAmount(tax),
              base: formatAmount(base),
              rate: rate.toFixed(1),
            });

            const fallbackVatText = `MwSt ${rate.toFixed(1)}%\nBasis: CHF ${formatAmount(base)}\nMwSt: CHF ${formatAmount(tax)}\nTotal: CHF ${formatAmount(total)}`;
            setValue("vat_details", fallbackVatText);
          }
        }
      }

      // Set date if available
      if (ocrData.date?.data) {
        const parsedDate = new Date(ocrData.date.data);
        setValue("date", parsedDate);
        setValue("transaction_date", parsedDate);
      }

      // Update line items
      if (ocrData.entities?.productLineItems?.length > 0) {
        setLineItems(
          ocrData.entities.productLineItems.map((item) => ({
            name: item.data.name.data,
            quantity: item.data.quantity.data,
            unitPrice: item.data.unitPrice.data,
            totalPrice: item.data.totalPrice.data,
          }))
        );
      }

      // Update success message with more details
      const confidenceScore = (ocrData.confidenceLevel * 100).toFixed(1);
      let successMessage = `Receipt processed successfully! (${confidenceScore}% confidence)`;

      // Add details about what was found
      const extractedFields = [];
      if (ocrData.merchantName?.data) extractedFields.push("merchant name");
      if (ocrData.totalAmount?.data) extractedFields.push("total amount");
      if (ocrData.taxAmount?.data) extractedFields.push("tax amount");
      if (ocrData.entities?.multiTaxLineItems?.length)
        extractedFields.push("VAT details");

      if (extractedFields.length > 0) {
        successMessage += `\nFound: ${extractedFields.join(", ")}`;
      }

      showSnackbarMessage(successMessage, "success");
    } catch (error: any) {
      console.error("OCR processing error:", error);

      // More descriptive error messages
      let errorMessage = "Failed to process receipt. ";
      if (error.message.includes("file size")) {
        errorMessage +=
          "File is too large. Please try a smaller file (max 10MB).";
      } else if (error.message.includes("file type")) {
        errorMessage +=
          "Please upload a valid image (JPEG, PNG, HEIC) or PDF file.";
      } else if (
        error.message.includes("network") ||
        error.message.includes("timeout")
      ) {
        errorMessage +=
          "Network error. Please check your connection and try again.";
      } else if (
        error.message.includes("Edge Function") ||
        error.message.includes("Supabase")
      ) {
        errorMessage +=
          "OCR service error. Please try again later or contact support.";
      } else {
        errorMessage += "Please try again or fill in details manually.";
      }

      showSnackbarMessage(errorMessage, "error");
    } finally {
      setIsProcessingOCR(false);
    }
  };

  useEffect(() => {
    if (Platform.OS === "web" && dropRef.current) {
      const element = dropRef.current as unknown as HTMLElement;

      const handleDragEnter = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(true);
      };

      const handleDragOver = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(true);
      };

      const handleDragLeave = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);
      };

      const handleDrop = (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);

        if (
          e.dataTransfer &&
          e.dataTransfer.files &&
          e.dataTransfer.files.length > 0
        ) {
          const file = e.dataTransfer.files[0];

          // Check file type
          const validTypes = [
            "application/pdf",
            "image/jpeg",
            "image/png",
            "image/jpg",
            "image/heic",
          ];

          if (!validTypes.includes(file.type)) {
            setSnackbarMessage(
              "Invalid file type. Please upload PDF or image files."
            );
            setSnackbarVisible(true);
            return;
          }

          // Check file size (10MB)
          if (file.size > 10 * 1024 * 1024) {
            setSnackbarMessage("File is too large. Maximum size is 10MB.");
            setSnackbarVisible(true);
            return;
          }

          handleImageSelection(URL.createObjectURL(file), "gallery", file);
        }
      };

      element.addEventListener("dragenter", handleDragEnter);
      element.addEventListener("dragover", handleDragOver);
      element.addEventListener("dragleave", handleDragLeave);
      element.addEventListener("drop", handleDrop);

      return () => {
        element.removeEventListener("dragenter", handleDragEnter);
        element.removeEventListener("dragover", handleDragOver);
        element.removeEventListener("dragleave", handleDragLeave);
        element.removeEventListener("drop", handleDrop);
      };
    }
  }, [dropRef, selectedCompany]);

  // Update handleImageSelection to accept an optional File parameter
  const handleImageSelection = async (
    uri: string,
    source: "camera" | "gallery",
    droppedFile?: File
  ) => {
    setReceiptImage(uri);
    setImageSource(source);

    // Process with OCR first
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
    event: WebDateChangeEvent | NativeDateChangeEvent,
    type: "receipt" | "transaction"
  ) => {
    if (Platform.OS === "web") {
      const webEvent = event as WebDateChangeEvent;
      const selectedDate = new Date(webEvent.target.value);
      setValue(type === "receipt" ? "date" : "transaction_date", selectedDate);
    } else {
      const nativeEvent = event as NativeDateChangeEvent;
      if (event.type === "set" && nativeEvent.nativeEvent?.timestamp) {
        setValue(
          type === "receipt" ? "date" : "transaction_date",
          new Date(nativeEvent.nativeEvent.timestamp)
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

      // First validate if receipt number already exists for this company
      const exists = await checkReceiptNumberExists(data.receipt_number);
      if (exists) {
        showSnackbarMessage(
          `Receipt number "${data.receipt_number}" already exists for this company. Please use a different receipt number.`,
          "error"
        );
        // Focus the receipt number input field
        const receiptNumberInput = document.querySelector(
          'input[name="receipt_number"]'
        );
        if (receiptNumberInput) {
          (receiptNumberInput as HTMLInputElement).focus();
        }
        setLoading(false);
        return; // Exit early if duplicate receipt number
      }

      // Variable to store OneDrive sharing link
      let receiptImagePath = null;

      // Only proceed with OneDrive upload if we have a receipt image
      if (receiptImage) {
        try {
          setUploadingToOneDrive(true);
          setOneDriveUploadProgress(10);
          setOneDriveUploadError(null);

          // Create a File object from the image URI
          let fileObject;
          let fileName;
          let mimeType;

          // For camera or gallery images, fetch the blob and create a File
          const response = await fetch(receiptImage);
          const blob = await response.blob();

          // Generate a filename based on date and source
          fileName = `receipt_${Date.now()}.${fileType === "pdf" ? "pdf" : "jpg"}`;
          mimeType = fileType === "pdf" ? "application/pdf" : "image/jpeg";

          fileObject = new File([blob], fileName, { type: mimeType });

          setOneDriveUploadProgress(20);

          // Create FormData for the upload
          const formData = new FormData();
          formData.append("file", fileObject);
          formData.append("companyId", selectedCompany.id);
          formData.append("employeeId", user.id);
          formData.append("uploadedBy", user.id);

          // Add receipt-specific metadata
          const metadata = {
            receiptType: "company_receipt",
            company_id: selectedCompany.id,
            merchant_name: data.merchant_name || "Unknown Merchant",
            receipt_number: data.receipt_number || `REC-${Date.now()}`,
            receipt_date: data.date?.toISOString() || new Date().toISOString(),
            total_amount: data.total_amount || "0.00",
          };

          formData.append("metadata", JSON.stringify(metadata));
          formData.append("reportType", "company_receipt");
          formData.append("reportId", "temp");

          setOneDriveUploadProgress(40);

          // Call the Edge Function to upload to OneDrive
          const oneDriveResponse = await supabase.functions.invoke(
            "onedrive-upload",
            {
              body: formData,
            }
          );

          if (oneDriveResponse.error) {
            throw new Error(oneDriveResponse.error.message || "Upload failed");
          }

          setOneDriveUploadProgress(80);

          // Process the response and store the sharing link
          if (oneDriveResponse.data?.data) {
            const responseData = oneDriveResponse.data.data;
            setOneDriveItemId(responseData.itemId);
            setOneDriveSharingLink(responseData.sharingLink);
            // Store the sharing link for the receipt
            receiptImagePath = responseData.sharingLink;
            if (responseData.document?.id) {
              setUploadedDocumentId(responseData.document.id);
            }
          }

          setOneDriveUploadProgress(100);
          showSnackbarMessage(
            "Receipt uploaded to OneDrive successfully",
            "success"
          );
        } catch (error: any) {
          console.error("Error uploading to OneDrive:", error);
          setOneDriveUploadError(
            error.message || "Failed to upload receipt to OneDrive"
          );
          showSnackbarMessage(
            "Error uploading to OneDrive: " + error.message,
            "error"
          );
          setLoading(false);
          setUploadingToOneDrive(false);
          return; // Stop the submission if OneDrive upload fails
        } finally {
          setUploadingToOneDrive(false);
        }
      }

      // Find a super admin to use as created_by
      logDebug("Current user:", user);

      const { data: adminUser, error: adminError } = await supabase
        .from("admin")
        .select("id, name, email, role, status")
        .eq("email", user.email)
        .single();

      logDebug("Admin query result:", { adminUser, adminError });

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

      // Format line items for storage
      const formattedLineItems = lineItems.map((item) => ({
        name: item.name,
        qty: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      }));

      // Create receipt with the receipt_image_path
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
        receipt_image_path: receiptImagePath, // Use the stored OneDrive sharing link
        language_hint: data.language_hint || null,
        created_by: adminUser.id,
      };

      logDebug("Creating receipt with data:", receiptData);

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

      showSnackbarMessage(
        "Receipt created successfully! Redirecting...",
        "success"
      );

      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error: any) {
      console.error("Error creating receipt:", error);

      // Handle specific database errors
      if (
        error.code === "23505" &&
        error.message.includes("receipts_receipt_number_key")
      ) {
        showSnackbarMessage(
          `Receipt number "${data.receipt_number}" is already in use by another company. Please use a different receipt number.`,
          "error"
        );
        // Focus the receipt number input field
        const receiptNumberInput = document.querySelector(
          'input[name="receipt_number"]'
        );
        if (receiptNumberInput) {
          (receiptNumberInput as HTMLInputElement).focus();
        }
      } else if (
        error.code === "23505" &&
        error.message.includes("unique_receipt_number")
      ) {
        showSnackbarMessage(
          `Receipt number "${data.receipt_number}" already exists for this company. Please use a different receipt number.`,
          "error"
        );
        // Focus the receipt number input field
        const receiptNumberInput = document.querySelector(
          'input[name="receipt_number"]'
        );
        if (receiptNumberInput) {
          (receiptNumberInput as HTMLInputElement).focus();
        }
      } else {
        // Handle other errors
        const errorMessage =
          error instanceof Error
            ? `Failed to create receipt: ${error.message}`
            : "Failed to create receipt. Please try again.";
        showSnackbarMessage(errorMessage, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewClick = () => {
    logDebug("Opening preview modal...");
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
    showSnackbarMessage(
      "Receipt image and auto-filled fields have been cleared",
      "info"
    );
  };

  // Add function to upload receipt to OneDrive
  const uploadReceiptToOneDrive = async (uri: string, droppedFile?: File) => {
    // Check for duplicate receipt number before starting the upload
    const receiptNumber = watch("receipt_number");
    if (receiptNumber && selectedCompany) {
      const exists = await checkReceiptNumberExists(receiptNumber);
      if (exists) {
        showSnackbarMessage(
          `Receipt number "${receiptNumber}" already exists for this company. Please use a different receipt number.`,
          "error"
        );
        return false; // Return false to indicate upload should not proceed
      }
    }

    try {
      if (!selectedCompany || !user) {
        setSnackbarMessage("Missing required information for upload");
        setSnackbarVisible(true);
        return false;
      }

      setUploadingToOneDrive(true);
      setOneDriveUploadProgress(10);
      setOneDriveUploadError(null);

      // Create a File object from the image URI if not provided
      let fileObject;
      let fileName;
      let mimeType;

      if (droppedFile) {
        fileObject = droppedFile;
        fileName = droppedFile.name;
        mimeType = droppedFile.type;
      } else {
        // For camera or gallery images, fetch the blob and create a File
        const response = await fetch(uri);
        const blob = await response.blob();

        // Generate a filename based on date and source
        fileName = `receipt_${Date.now()}.${fileType === "pdf" ? "pdf" : "jpg"}`;
        mimeType = fileType === "pdf" ? "application/pdf" : "image/jpeg";

        fileObject = new File([blob], fileName, { type: mimeType });
      }

      setOneDriveUploadProgress(20);

      // Create FormData for the upload
      const formData = new FormData();
      formData.append("file", fileObject);
      formData.append("companyId", selectedCompany.id);
      formData.append("employeeId", user.id); // Using user ID as employee ID
      formData.append("uploadedBy", user.id);

      // Create a temporary receipt record if needed for reference
      let receiptId = "";

      // Add receipt-specific metadata
      const metadata = {
        receiptType: "company_receipt",
        company_id: selectedCompany.id,
        merchant_name: watch("merchant_name") || "Unknown Merchant",
        receipt_number: watch("receipt_number") || `REC-${Date.now()}`,
        receipt_date: watch("date")?.toISOString() || new Date().toISOString(),
        total_amount: watch("total_amount") || "0.00",
      };

      formData.append("metadata", JSON.stringify(metadata));
      formData.append("reportType", "company_receipt");
      formData.append("reportId", receiptId || "temp");

      setOneDriveUploadProgress(40);

      // Call the Edge Function to upload to OneDrive
      const response = await supabase.functions.invoke("onedrive-upload", {
        body: formData,
      });

      logDebug("OneDrive upload response:", response);

      if (response.error) {
        throw new Error(response.error.message || "Upload failed");
      }

      setOneDriveUploadProgress(80);

      // Process the response
      if (response.data?.data) {
        const responseData = response.data.data;

        // Store the OneDrive item ID and sharing link
        setOneDriveItemId(responseData.itemId);
        setOneDriveSharingLink(responseData.sharingLink);

        // Store document ID if available
        if (responseData.document?.id) {
          setUploadedDocumentId(responseData.document.id);
        }

        setSnackbarMessage("Receipt uploaded to OneDrive successfully");
        setSnackbarVisible(true);
      }

      setOneDriveUploadProgress(100);

      // Complete upload after showing progress
      setTimeout(() => {
        setUploadingToOneDrive(false);
      }, 800);
    } catch (error: any) {
      console.error("Error uploading to OneDrive:", error);
      setOneDriveUploadError(
        error.message || "Failed to upload receipt to OneDrive"
      );
      setSnackbarMessage("Error uploading to OneDrive: " + error.message);
      setSnackbarVisible(true);
      setUploadingToOneDrive(false);
    }
  };

  // Add function to delete receipt from OneDrive
  const handleDeleteReceiptFromOneDrive = async () => {
    if (!oneDriveItemId && !uploadedDocumentId) {
      // If we don't have OneDrive data, just proceed with local deletion
      handleDeleteReceipt();
      return;
    }

    try {
      setDeletingReceipt(true);

      // Call the Edge Function to delete from OneDrive
      const response = await supabase.functions.invoke("onedrive-upload", {
        method: "DELETE",
        body: {
          itemId: oneDriveItemId || "unknown",
          documentId: uploadedDocumentId,
          userId: user?.id,
          companyId: selectedCompany?.id,
          reportType: "company_receipt",
        },
      });

      logDebug("Delete response:", response);

      // Reset OneDrive-related state
      setOneDriveItemId(null);
      setOneDriveSharingLink(null);
      setUploadedDocumentId(null);

      // Continue with local deletion
      handleDeleteReceipt();
    } catch (error: any) {
      console.error("Error deleting from OneDrive:", error);

      // Even if OneDrive deletion fails, proceed with local deletion
      handleDeleteReceipt();

      setSnackbarMessage(
        "Receipt removed but there was an issue with cloud storage: " +
          error.message
      );
      setSnackbarVisible(true);
    } finally {
      setDeletingReceipt(false);
    }
  };

  const handleDeleteReceipt = () => {
    try {
      // Reset OneDrive related states
      setOneDriveItemId(null);
      setOneDriveSharingLink(null);
      setUploadedDocumentId(null);

      // Reset file related states
      setReceiptImage(null);
      setFileType(null);
      setImageSource(null);
      setUploadProgress(0);
      setOneDriveUploadProgress(0);
      setOneDriveUploadError(null);
      setIsProcessingOCR(false);
      setUploadingToOneDrive(false);
      setIsDragActive(false);

      // Clear all form fields that might have been filled by OCR
      setValue("receipt_number", "");
      setValue("merchant_name", "");
      setValue("merchant_address", "");
      setValue("total_amount", "");
      setValue("tax_amount", "");
      setValue("subtotal_amount", "");
      setValue("final_price", "");
      setValue("paid_amount", "");
      setValue("change_amount", "");
      setValue("merchant_vat", "");
      setValue("merchant_phone", "");
      setValue("merchant_website", "");
      setValue("vat_details", "");
      setValue("language_hint", "");
      setLineItems([]);

      // Close modals
      setShowDeleteConfirmModal(false);
      setShowPreviewModal(false);

      // Revoke object URL if it exists to prevent memory leaks
      if (receiptImage && receiptImage.startsWith("blob:")) {
        URL.revokeObjectURL(receiptImage);
      }

      // Show success message
      showSnackbarMessage(
        "Receipt image and auto-filled fields have been cleared",
        "info"
      );
    } catch (error) {
      console.error("Error clearing receipt:", error);
      showSnackbarMessage(
        "There was an error clearing the receipt. Please try again.",
        "error"
      );
    }
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
                onPress={handleDeleteReceiptFromOneDrive}
                style={[styles.confirmButton, styles.confirmDeleteButton]}
                buttonColor="#ef4444"
                loading={deletingReceipt}
                disabled={deletingReceipt}
              >
                Delete
              </Button>
            </View>
          </View>
        </Modal>
      </Portal>
    );
  };

  // Add visual feedback styles for drag and drop
  const renderUploadSection = () => {
    const isWebPlatform = Platform.OS === "web";
    const isMobileWeb = isWebPlatform && dimensions.width < 768;
    const isDisabled =
      !selectedCompany || isProcessingOCR || uploadingToOneDrive;

    return (
      <View>
        {!receiptImage ? (
          <TouchableOpacity
            ref={dropRef}
            style={[
              dynamicStyles.dropzone,
              isDragActive && dynamicStyles.dropzoneActive,
              (isProcessingOCR || uploadingToOneDrive) &&
                dynamicStyles.dropzoneUploading,
              isDisabled && dynamicStyles.dropzoneDisabled,
              isDisabled && webStyles.disabled,
            ]}
            onPress={showImageOptions}
            disabled={isDisabled}
          >
            <IconButton
              icon={isDragActive ? "file-upload" : "receipt"}
              size={48}
              iconColor={isDragActive ? "#F44336" : theme.colors.primary}
            />
            <Text
              style={[
                styles.dropzoneText,
                isDragActive && { color: "#F44336" },
              ]}
            >
              {!selectedCompany
                ? "Please select a company first"
                : isDragActive
                  ? "Drop your receipt here"
                  : "Click to upload a receipt image or PDF"}
            </Text>
            <Text style={styles.dropzoneSubtext}>
              Supported formats: PDF, JPG, PNG (max 10MB)
            </Text>
            {isWebPlatform && !isMobileWeb && (
              <Text style={styles.dropzoneSubtext}>
                Or drag and drop files here
              </Text>
            )}

            <View style={styles.uploadButtonContainer}>
              {!isWebPlatform || isMobileWeb ? (
                <>
                  <Button
                    mode="outlined"
                    icon="camera"
                    onPress={takePhoto}
                    style={[styles.uploadButtonPrimary, { marginRight: 8 }]}
                    disabled={isDisabled}
                  >
                    Take Photo
                  </Button>
                  <Button
                    mode="outlined"
                    icon="image"
                    onPress={pickImage}
                    style={styles.uploadButtonPrimary}
                    disabled={isDisabled}
                  >
                    Gallery
                  </Button>
                </>
              ) : (
                <Button
                  mode="outlined"
                  icon="file-upload"
                  onPress={pickDocument}
                  style={styles.uploadButtonSecondary}
                  disabled={isDisabled}
                >
                  Browse Files
                </Button>
              )}
            </View>
          </TouchableOpacity>
        ) : (
          renderPreview()
        )}

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
            <Text style={styles.pageTitle}>Upload a Receipt</Text>
            <Text style={styles.pageSubtitle}>
              Follow the steps below to upload a new receipt
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  dropzoneText: {
    fontSize: 16,
    color: "#64748B",
    fontFamily: "Poppins-Medium",
    textAlign: "center",
    marginTop: 16,
  },
  uploadingText: {
    fontSize: 16,
    color: "#64748B",
    fontFamily: "Poppins-Medium",
    textAlign: "center",
    marginTop: 16,
  },
  previewContainer: {
    width: "100%",
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 16,
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
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
  previewText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontFamily: "Poppins-Medium",
  },
  errorText: {
    color: "#EF4444",
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    marginTop: 8,
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
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderStyle: "dashed",
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    minHeight: 120,
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
  uploadProgressContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f0f9ff",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  uploadProgressText: {
    fontSize: 14,
    marginBottom: 8,
    color: "#0369a1",
  },
  progressBar: {
    width: "80%",
    height: 4,
    borderRadius: 2,
    marginTop: 16,
  },
  uploadErrorContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#fecaca",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  uploadErrorText: {
    fontSize: 14,
    color: "#b91c1c",
    flex: 1,
  },
  dismissErrorButton: {
    marginLeft: 8,
  },
  sharingLinkContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  sharingLinkLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
    color: "#166534",
  },
  sharingLinkButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#dcfce7",
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sharingLinkText: {
    fontSize: 14,
    color: "#0891b2",
    textDecorationLine: "underline",
    flex: 1,
  },
  dropzoneSubtext: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    marginBottom: 16,
    fontFamily: "Poppins-Regular",
  },
  uploadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    position: "relative",
    overflow: "hidden",
  },
  uploadingSubtext: {
    fontSize: 14,
    color: "#94A3B8",
    fontFamily: "Poppins-Regular",
    marginTop: 8,
    textAlign: "center",
  },
  imageButtonsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
    width: "100%",
    maxWidth: 400,
  },
  imageButton: {
    flex: 1,
    maxWidth: 160,
  },
  uploadButton: {
    width: "100%",
    maxWidth: 320,
  },
  uploadButtonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 16,
    width: "100%",
    maxWidth: 400,
  },
  uploadButtonPrimary: {
    flex: 1,
    maxWidth: 160,
  },
  uploadButtonSecondary: {
    width: "100%",
    maxWidth: 320,
  },
});

// Add web-specific hover styles
if (Platform.OS === "web") {
  const existingStyleTag = document.getElementById("receipt-screen-styles");
  if (!existingStyleTag) {
    const styleSheet = document.createElement("style");
    styleSheet.id = "receipt-screen-styles";
    styleSheet.textContent = `
      .previewTouchable:hover .previewOverlay {
        opacity: 1 !important;
        transition: opacity 0.2s ease;
      }
    `;
    document.head.appendChild(styleSheet);
  }
}

export default CreateReceiptScreen;
