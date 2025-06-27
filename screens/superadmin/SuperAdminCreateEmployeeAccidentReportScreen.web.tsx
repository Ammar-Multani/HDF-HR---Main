import React, { useState, useEffect, useCallback } from "react";
import { logDebug } from "../../utils/logger";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
  ViewStyle,
  TextStyle,
  Linking,
  Image,
  TouchableOpacity,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Snackbar,
  HelperText,
  Surface,
  IconButton,
  Portal,
  Modal,
  Divider,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { useForm, Controller } from "react-hook-form";
import DateTimePickerModal from "react-native-modal-datetime-picker";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import { FormStatus } from "../../types";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import CustomSnackbar from "../../components/CustomSnackbar";
import { t } from "i18next";
import EmployeeSelector from "../../components/EmployeeSelector";
import * as DocumentPicker from "expo-document-picker";
import { WebView } from "react-native-webview";
import CompanySelector from "../../components/CompanySelector";
import { AnimatedCircularProgress } from "react-native-circular-progress";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";

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

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  job_title?: string;
  company_id?: string;
}

interface Company {
  id: string;
  company_name: string;
  active: boolean;
}

interface AccidentReportFormData {
  id?: string;
  date_of_accident: Date;
  time_of_accident: string;
  accident_address: string;
  city: string;
  accident_description: string;
  objects_involved: string;
  injuries: string;
  accident_type: string;
  medical_certificate?: string;
  document_id?: string;
  company_id: string;
}

interface OneDriveUploadResponse {
  success: boolean;
  data: {
    filePath: string;
    driveId: string;
    itemId: string;
    webUrl: string;
    fileName: string;
    mimeType: string;
    document: {
      id: string;
      file_path: string;
    };
    report: {
      id: string;
      medical_certificate: string;
    };
    sharingLink?: string;
  };
  error?: string;
}

// Update the styles type at the top of the file after imports
type StylesType = {
  container: ViewStyle;
  keyboardAvoidingView: ViewStyle;
  scrollView: ViewStyle;
  scrollContent: ViewStyle;
  headerSection: ViewStyle;
  pageTitle: TextStyle;
  gridContainer: ViewStyle;
  gridColumn: ViewStyle;
  formCard: ViewStyle;
  cardHeader: ViewStyle;
  headerLeft: ViewStyle;
  iconContainer: ViewStyle;
  headerIcon: ViewStyle;
  cardTitle: TextStyle;
  cardContent: ViewStyle;
  input: ViewStyle;
  inputLabel: TextStyle;
  dateButton: ViewStyle;
  documentPickerContainer: ViewStyle;
  documentButton: ViewStyle;
  errorText: TextStyle;
  bottomBar: ViewStyle;
  bottomBarContent: ViewStyle;
  button: ViewStyle;
  cancelButton: ViewStyle;
  submitButton: ViewStyle;
  webDatePickerModal: ViewStyle;
  modalSurface: ViewStyle;
  modalHeader: ViewStyle;
  modalTitle: TextStyle;
  webDatePickerContainer: ViewStyle;
  webDateInputRow: ViewStyle;
  webDateInputContainer: ViewStyle;
  webDateInputLabel: TextStyle;
  webDateInput: ViewStyle;
  webDatePickerActions: ViewStyle;
  webDatePickerButton: ViewStyle;
  snackbar: ViewStyle;
  previewModal: ViewStyle;
  previewModalContent: ViewStyle;
  previewModalHeader: ViewStyle;
  previewContainer: ViewStyle;
  previewButton: ViewStyle;
  mobilePreviewContainer: ViewStyle;
  mobilePreviewText: TextStyle;
  mobilePreviewButton: ViewStyle;
  fallbackPreviewContainer: ViewStyle;
  fallbackPreviewText: TextStyle;
  fallbackPreviewSubtext: TextStyle;
  fallbackPreviewButton: ViewStyle;
  documentActions: ViewStyle;
  documentUploadSection: ViewStyle;
  dropzone: ViewStyle;
  dropzoneActive: ViewStyle;
  dropzoneIcon: ViewStyle;
  dropzoneText: TextStyle;
  dropzoneSubText: TextStyle;
  uploadPreview: ViewStyle;
  previewIcon: ViewStyle;
  previewContent: ViewStyle;
  fileName: TextStyle;
  fileInfo: TextStyle;
  previewActions: ViewStyle;
  actionButton: ViewStyle;
  actionButtonDanger: ViewStyle;
  progressContainer: ViewStyle;
  uploadProgress: ViewStyle;
  progressText: TextStyle;
  errorContainer: ViewStyle;
  retryButton: ViewStyle;
  retryButtonText: TextStyle;
  dropzoneUploading: ViewStyle;
  uploadingContainer: ViewStyle;
  uploadingText: TextStyle;
  uploadingSubtext: TextStyle;
  downloadButton: ViewStyle;
  downloadButtonText: TextStyle;
  progressTextContainer: ViewStyle;
  progressIcon: ViewStyle;
};

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const formatDate = (date: Date) => {
  return format(date, "MMM d, yyyy");
};

// Update the EmployeeSelector component props type
interface EmployeeSelectorProps {
  companyId: string;
  onSelect: (employee: Employee | null) => void;
  selectedEmployee: Employee | null;
}

const CreateAccidentReportScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const dimensions = useWindowDimensions();

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [documentName, setDocumentName] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
  const [sharingLink, setSharingLink] = useState<string | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [companyError, setCompanyError] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState(0);
  const [uploadDate, setUploadDate] = useState(new Date());
  const [isDragActive, setIsDragActive] = useState(false);
  const [deletingDocument, setDeletingDocument] = useState(false);
  const [documentItemId, setDocumentItemId] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<AccidentReportFormData>({
    defaultValues: {
      date_of_accident: new Date(),
      time_of_accident: format(new Date(), "HH:mm"),
      accident_address: "",
      city: "",
      accident_description: "",
      objects_involved: "",
      injuries: "",
      accident_type: "",
      medical_certificate: "",
    },
  });

  const dateOfAccident = watch("date_of_accident");

  const handleDateConfirm = (selectedDate: Date) => {
    setShowDatePicker(false);
    setValue("date_of_accident", selectedDate);
  };

  const handleDateCancel = () => {
    setShowDatePicker(false);
  };

  const onSubmit = async (data: AccidentReportFormData) => {
    try {
      if (!selectedCompany) {
        setCompanyError("Please select a company");
        return;
      }
      setCompanyError("");

      if (!selectedEmployee) {
        setSnackbarMessage("Please select an employee");
        setSnackbarVisible(true);
        return;
      }

      setLoading(true);

      // Create accident report with selectedCompany.id
      const { data: accidentReport, error } = await supabase
        .from("accident_report")
        .insert([
          {
            employee_id: selectedEmployee.id,
            company_id: selectedCompany.id,
            date_of_accident: data.date_of_accident.toISOString(),
            time_of_accident: data.time_of_accident,
            accident_address: data.accident_address,
            city: data.city,
            accident_description: data.accident_description,
            objects_involved: data.objects_involved,
            injuries: data.injuries,
            accident_type: data.accident_type,
            medical_certificate: data.medical_certificate || null,
            status: FormStatus.PENDING,
            submitted_by: user?.id,
            submission_date: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      setSnackbarMessage("Accident report submitted successfully");
      setSnackbarVisible(true);

      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (error: any) {
      console.error("Error submitting accident report:", error);
      setSnackbarMessage(error.message || "Failed to submit accident report");
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handlePickDocument = async (droppedFile?: File) => {
    if (!selectedCompany) {
      setSnackbarMessage("Please select a company first");
      setSnackbarVisible(true);
      return;
    }

    if (!selectedEmployee) {
      setSnackbarMessage("Please select an employee first");
      setSnackbarVisible(true);
      return;
    }

    let progressInterval: NodeJS.Timeout | undefined;

    try {
      setUploadingDocument(true);
      setUploadProgress(0);
      setUploadError(null);

      // Show initial loading progress
      setUploadProgress(10);

      // Validate company ID
      if (!selectedCompany) {
        throw new Error("Company ID is not available");
      }

      // Create accident report first if it doesn't exist
      let reportId = watch("id");
      if (!reportId) {
        setUploadProgress(20);
        logDebug("Creating new accident report...");
        const { data: accidentReport, error: createError } = await supabase
          .from("accident_report")
          .insert([
            {
              employee_id: selectedEmployee.id,
              company_id: selectedCompany.id,
              date_of_accident: watch("date_of_accident").toISOString(),
              time_of_accident: watch("time_of_accident"),
              accident_address: watch("accident_address") || "",
              city: watch("city") || "",
              accident_description: watch("accident_description") || "",
              objects_involved: watch("objects_involved") || "",
              injuries: watch("injuries") || "",
              accident_type: watch("accident_type") || "",
              status: FormStatus.DRAFT,
              submitted_by: user?.id,
              submission_date: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (createError) {
          console.error("Error creating accident report:", createError);
          throw createError;
        }

        if (!accidentReport) {
          console.error("No accident report data returned from insert");
          throw new Error(
            "Failed to create accident report - no data returned"
          );
        }

        logDebug("Created accident report:", accidentReport);
        reportId = accidentReport.id;
        setValue("id", reportId);

        // After successful report creation
        setUploadProgress(30);
      }

      let file;
      if (droppedFile) {
        // Use the dropped file from react-dropzone
        file = {
          uri: URL.createObjectURL(droppedFile),
          name: droppedFile.name,
          size: droppedFile.size,
          mimeType: droppedFile.type,
        };
        setUploadProgress(40);
      } else {
        // Use document picker
        const result = await DocumentPicker.getDocumentAsync({
          type: [
            "application/pdf",
            "image/*",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ],
          copyToCacheDirectory: true,
        });

        if (result.canceled) {
          if (progressInterval) clearInterval(progressInterval);
          setUploadingDocument(false);
          return;
        }

        file = result.assets[0];
        setUploadProgress(40);
      }

      // Validate file size (10MB limit)
      const MAX_FILE_SIZE = 10 * 1024 * 1024;
      if (!file.size || file.size > MAX_FILE_SIZE) {
        throw new Error(
          `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`
        );
      }

      // Create a File object from the picked document
      const fileBlob = await fetch(file.uri).then((r) => r.blob());
      const fileObject = new File([fileBlob], file.name, {
        type: file.mimeType,
      });

      // Create and validate FormData
      const formData = new FormData();
      formData.append("file", fileObject);
      formData.append("companyId", selectedCompany.id as string);
      formData.append("employeeId", selectedEmployee.id as string);
      const uploadedById = user?.id;
      if (typeof uploadedById !== "string") {
        throw new Error("User ID is required");
      }
      formData.append("uploadedBy", uploadedById);
      formData.append("reportId", reportId as string);
      formData.append("reportType", "accident_report");

      // Add metadata as JSON string
      const metadata = {
        reportId: reportId,
        reportType: "accident_report",
        company_id: selectedCompany.id,
        employee_id: selectedEmployee.id,
      };
      formData.append("metadata", JSON.stringify(metadata));

      // Add retry logic for network issues
      const MAX_RETRIES = 3;
      let retryCount = 0;
      let uploadSuccess = false;
      let uploadResponse = null;

      while (retryCount < MAX_RETRIES && !uploadSuccess) {
        try {
          logDebug("Attempting to upload file...");
          const response = await supabase.functions.invoke("onedrive-upload", {
            body: formData,
          });

          logDebug("Raw upload response:", response);

          if (response.error) {
            throw new Error(response.error.message);
          }

          uploadResponse = response;
          uploadSuccess = true;
        } catch (error) {
          retryCount++;
          console.error(`Upload attempt ${retryCount} failed:`, error);
          if (retryCount === MAX_RETRIES) {
            throw error;
          }
          // Wait before retrying (exponential backoff)
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, retryCount) * 1000)
          );
        }
      }

      if (uploadResponse?.data) {
        logDebug("Upload response data:", uploadResponse.data);

        // The actual data is nested inside data.data
        const responseData = uploadResponse.data.data;
        logDebug("Processed response data:", responseData);

        // Update form with file path if available
        if (responseData?.filePath) {
          setValue("medical_certificate", responseData.filePath);
        }

        // Only try to set document_id if document object exists and has an id
        if (responseData?.document?.id) {
          setValue("document_id", responseData.document.id);
        }

        // Store the itemId for later use in deletion
        if (responseData?.itemId) {
          setDocumentItemId(responseData.itemId);
        }

        setDocumentName(file.name);
        setFileSize(file.size);
        setUploadDate(new Date());

        // Store both webUrl and sharingLink
        if (responseData?.webUrl) {
          logDebug("Original webUrl:", responseData.webUrl);

          // Extract the direct file URL from SharePoint URL
          let directUrl = responseData.webUrl;

          // If it's a SharePoint URL, modify it to get direct access
          if (directUrl.includes("sharepoint.com")) {
            // Remove any query parameters
            directUrl = directUrl.split("?")[0];
            // Add direct access parameter
            directUrl += "?web=1";
          }

          logDebug("Setting preview URL to:", directUrl);
          setSharingLink(responseData.sharingLink);
        } else {
          console.warn("No webUrl in response data:", responseData);
        }

        setSnackbarMessage("Medical certificate uploaded successfully");
        setSnackbarVisible(true);

        // Show almost complete
        setUploadProgress(90);

        // Finish after a short delay to show the animation
        setTimeout(() => {
          setUploadProgress(100);

          // Show success animation for a moment before hiding the loader
          setTimeout(() => {
            setUploadingDocument(false);
          }, 800);
        }, 500);
      } else {
        console.warn("Upload response missing data:", uploadResponse);
        setSnackbarMessage("Document uploaded but some data was missing");
        setSnackbarVisible(true);
        setUploadProgress(100);
        setUploadingDocument(false);
      }

      if (progressInterval) clearInterval(progressInterval);
    } catch (error: any) {
      console.error("Error picking document:", error);
      setUploadError(
        error.message || "Error uploading document. Please try again."
      );
      setSnackbarMessage("Error uploading document. Please try again.");
      setSnackbarVisible(true);
      setUploadProgress(0);
      setUploadingDocument(false);
    } finally {
      if (progressInterval) clearInterval(progressInterval);
    }
  };

  const handleCopyLink = async () => {
    if (sharingLink) {
      try {
        await navigator.clipboard.writeText(sharingLink);
        setSnackbarMessage("Link copied to clipboard");
        setSnackbarVisible(true);
      } catch (err) {
        setSnackbarMessage("Failed to copy link");
        setSnackbarVisible(true);
      }
    }
  };

  const handleDeleteDocument = async () => {
    try {
      // Check if we have the necessary information to delete the document
      const documentId = watch("document_id");
      const reportId = watch("id");

      // Use the stored itemId directly or try to extract it from sharing link if not available
      let itemId = documentItemId;

      if (!itemId && sharingLink) {
        try {
          // For Microsoft 365 sharing links, try to extract the ID from the URL
          const urlMatch = sharingLink.match(/\/([a-zA-Z0-9_-]{43})(\/|\?|$)/);
          if (urlMatch && urlMatch[1]) {
            itemId = urlMatch[1];
          } else {
            // Fallback - try to get ID from query params
            const url = new URL(sharingLink);
            const idParam = url.searchParams.get("id");
            if (idParam) itemId = idParam;
          }
        } catch (error) {
          console.error("Error parsing sharing link:", error);
        }
      }

      if (!documentId) {
        setSnackbarMessage("Cannot delete document: Missing document ID");
        setSnackbarVisible(true);
        return;
      }

      if (!selectedCompany) {
        setSnackbarMessage(
          "Cannot delete document: Company information missing"
        );
        setSnackbarVisible(true);
        return;
      }

      setDeletingDocument(true);
      setSnackbarMessage("Deleting document...");
      setSnackbarVisible(true);

      // Call the Edge Function to delete the file
      const response = await supabase.functions.invoke("onedrive-upload", {
        method: "DELETE",
        body: {
          itemId: itemId || "unknown", // Even without itemId, we'll update the database
          documentId,
          userId: user?.id,
          companyId: selectedCompany.id,
          reportId,
          reportType: "accident_report",
        },
      });

      logDebug("Delete response:", response);

      // Reset document-related state variables even if there was an error
      // This ensures the UI is cleaned up
      setDocumentName(null);
      setSharingLink(null);
      setDocumentItemId(null);
      setValue("medical_certificate", "");
      setValue("document_id", "");

      setSnackbarMessage("Medical certificate deleted successfully");
      setSnackbarVisible(true);
    } catch (error: any) {
      console.error("Error deleting document:", error);

      // Reset document-related state variables even on error
      // This is important for UX - if deletion fails in the cloud but works in the database
      setDocumentName(null);
      setSharingLink(null);
      setDocumentItemId(null);
      setValue("medical_certificate", "");
      setValue("document_id", "");

      setSnackbarMessage(
        "Document removed from report. " + (error.message || "")
      );
      setSnackbarVisible(true);
    } finally {
      setDeletingDocument(false);
    }
  };

  const handleRetryUpload = () => {
    setUploadError(null);
    handlePickDocument();
  };

  // Web-specific date picker component
  const WebDatePicker = () => {
    const [year, setYear] = useState(watch("date_of_accident").getFullYear());
    const [month, setMonth] = useState(
      watch("date_of_accident").getMonth() + 1
    );
    const [day, setDay] = useState(watch("date_of_accident").getDate());

    const handleConfirm = () => {
      const newDate = new Date(year, month - 1, day);
      handleDateConfirm(newDate);
    };

    return (
      <Portal>
        <Modal
          visible={showDatePicker}
          onDismiss={handleDateCancel}
          contentContainerStyle={styles.webDatePickerModal}
        >
          <Surface style={styles.modalSurface}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <IconButton icon="close" onPress={handleDateCancel} />
            </View>
            <Divider />

            <View style={styles.webDatePickerContainer}>
              <View style={styles.webDateInputRow}>
                <View style={styles.webDateInputContainer}>
                  <Text style={styles.webDateInputLabel}>Day</Text>
                  <TextInput
                    mode="outlined"
                    keyboardType="numeric"
                    value={day.toString()}
                    onChangeText={(text) => setDay(parseInt(text) || 1)}
                    style={styles.webDateInput}
                  />
                </View>

                <View style={styles.webDateInputContainer}>
                  <Text style={styles.webDateInputLabel}>Month</Text>
                  <TextInput
                    mode="outlined"
                    keyboardType="numeric"
                    value={month.toString()}
                    onChangeText={(text) => {
                      const newMonth = parseInt(text) || 1;
                      setMonth(Math.min(Math.max(newMonth, 1), 12));
                    }}
                    style={styles.webDateInput}
                  />
                </View>

                <View style={styles.webDateInputContainer}>
                  <Text style={styles.webDateInputLabel}>Year</Text>
                  <TextInput
                    mode="outlined"
                    keyboardType="numeric"
                    value={year.toString()}
                    onChangeText={(text) => setYear(parseInt(text) || 2023)}
                    style={styles.webDateInput}
                  />
                </View>
              </View>

              <View style={styles.webDatePickerActions}>
                <Button
                  onPress={handleDateCancel}
                  style={styles.webDatePickerButton}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleConfirm}
                  style={styles.webDatePickerButton}
                  buttonColor="#F44336"
                >
                  Confirm
                </Button>
              </View>
            </View>
          </Surface>
        </Modal>
      </Portal>
    );
  };

  // Restore the useEffect for company selection
  useEffect(() => {
    if (
      selectedEmployee &&
      selectedEmployee.company_id !== selectedCompany?.id
    ) {
      setSelectedEmployee(null);
    }
  }, [selectedCompany]);

  // Add custom drop handler for web
  const dropRef = React.useRef(null);

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
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ];

          if (!validTypes.includes(file.type)) {
            setSnackbarMessage(
              "Invalid file type. Please upload PDF, DOCX, JPG or PNG files."
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

          handlePickDocument(file);
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
  }, [dropRef, selectedCompany, selectedEmployee]);

  // Simplify the getFileIcon function to use basic icons that are definitely available
  const getFileIcon = (filename: string | null) => {
    if (!filename)
      return <MaterialCommunityIcons name="file" size={24} color="#F44336" />;

    const extension = filename.split(".").pop()?.toLowerCase();

    switch (extension) {
      case "pdf":
        return <MaterialCommunityIcons name="file" size={24} color="#F44336" />;
      case "doc":
      case "docx":
        return <MaterialCommunityIcons name="file" size={24} color="#2196F3" />;
      case "jpg":
      case "jpeg":
      case "png":
        return (
          <MaterialCommunityIcons name="image" size={24} color="#4CAF50" />
        );
      default:
        return <MaterialCommunityIcons name="file" size={24} color="#F44336" />;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#F8F9FA" }]}>
      <AppHeader
        title="Report Accident"
        showBackButton={true}
        showHelpButton={false}
        showProfileMenu={false}
        showLogo={false}
        showTitle={true}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
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
            <Text style={styles.pageTitle}>Submit accident report details</Text>
          </View>

          <View style={styles.gridContainer}>
            <View style={styles.gridColumn}>
              <Animated.View entering={FadeIn.delay(100)}>
                <Surface style={styles.formCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <View style={styles.iconContainer}>
                        <IconButton
                          icon="domain"
                          size={24}
                          style={styles.headerIcon}
                        />
                      </View>
                      <Text style={styles.cardTitle}>Company Information</Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <CompanySelector
                      onSelect={(company) => {
                        setSelectedCompany(company);
                        setCompanyError("");
                      }}
                      selectedCompany={selectedCompany}
                      error={companyError}
                      required={true}
                      label="Select Company"
                    />
                  </View>
                </Surface>

                {selectedCompany && (
                  <Surface style={[styles.formCard, { marginTop: 24 }]}>
                    <View style={styles.cardHeader}>
                      <View style={styles.headerLeft}>
                        <View style={styles.iconContainer}>
                          <IconButton
                            icon="account"
                            size={20}
                            iconColor="#F44336"
                            style={styles.headerIcon}
                          />
                        </View>
                        <Text style={styles.cardTitle}>Employee Details</Text>
                      </View>
                    </View>

                    <View style={styles.cardContent}>
                      <EmployeeSelector
                        companyId={selectedCompany.id}
                        onSelect={(employee: Employee | null) =>
                          setSelectedEmployee(employee)
                        }
                        selectedEmployee={selectedEmployee}
                      />
                    </View>
                  </Surface>
                )}

                <>
                  <Surface style={[styles.formCard, { marginTop: 24 }]}>
                    <View style={styles.cardHeader}>
                      <View style={styles.headerLeft}>
                        <View style={styles.iconContainer}>
                          <IconButton
                            icon="calendar"
                            size={20}
                            iconColor="#F44336"
                            style={styles.headerIcon}
                          />
                        </View>
                        <Text style={styles.cardTitle}>Date and Time</Text>
                      </View>
                    </View>

                    <View style={styles.cardContent}>
                      <Text style={styles.inputLabel}>Date of Accident *</Text>
                      <Button
                        mode="outlined"
                        onPress={() => setShowDatePicker(true)}
                        style={styles.dateButton}
                        icon="calendar"
                        textColor="#F44336"
                      >
                        {format(watch("date_of_accident"), "MMMM d, yyyy")}
                      </Button>

                      <Controller
                        control={control}
                        rules={{ required: "Time of accident is required" }}
                        render={({ field: { onChange, onBlur, value } }) => (
                          <>
                            <Text style={styles.inputLabel}>
                              Time of Accident *
                            </Text>
                            <TextInput
                              mode="outlined"
                              value={value}
                              onChangeText={onChange}
                              onBlur={onBlur}
                              error={!!errors.time_of_accident}
                              style={styles.input}
                              disabled={loading}
                              outlineColor="#E0E0E0"
                              activeOutlineColor="#F44336"
                            />
                            {errors.time_of_accident && (
                              <HelperText type="error" style={styles.errorText}>
                                {errors.time_of_accident.message}
                              </HelperText>
                            )}
                          </>
                        )}
                        name="time_of_accident"
                      />
                    </View>
                  </Surface>

                  <Surface style={[styles.formCard, { marginTop: 24 }]}>
                    <View style={styles.cardHeader}>
                      <View style={styles.headerLeft}>
                        <View style={styles.iconContainer}>
                          <IconButton
                            icon="map-marker"
                            size={20}
                            iconColor="#F44336"
                            style={styles.headerIcon}
                          />
                        </View>
                        <Text style={styles.cardTitle}>Location Details</Text>
                      </View>
                    </View>

                    <View style={styles.cardContent}>
                      <Controller
                        control={control}
                        rules={{ required: "Address is required" }}
                        render={({ field: { onChange, onBlur, value } }) => (
                          <>
                            <Text style={styles.inputLabel}>
                              Accident Address *
                            </Text>
                            <TextInput
                              mode="outlined"
                              value={value}
                              onChangeText={onChange}
                              onBlur={onBlur}
                              error={!!errors.accident_address}
                              style={styles.input}
                              disabled={loading}
                              outlineColor="#E0E0E0"
                              activeOutlineColor="#F44336"
                            />
                            {errors.accident_address && (
                              <HelperText type="error" style={styles.errorText}>
                                {errors.accident_address.message}
                              </HelperText>
                            )}
                          </>
                        )}
                        name="accident_address"
                      />

                      <Controller
                        control={control}
                        rules={{ required: "City is required" }}
                        render={({ field: { onChange, onBlur, value } }) => (
                          <>
                            <Text style={styles.inputLabel}>City *</Text>
                            <TextInput
                              mode="outlined"
                              value={value}
                              onChangeText={onChange}
                              onBlur={onBlur}
                              error={!!errors.city}
                              style={styles.input}
                              disabled={loading}
                              outlineColor="#E0E0E0"
                              activeOutlineColor="#F44336"
                            />
                            {errors.city && (
                              <HelperText type="error" style={styles.errorText}>
                                {errors.city.message}
                              </HelperText>
                            )}
                          </>
                        )}
                        name="city"
                      />
                    </View>
                  </Surface>
                </>
              </Animated.View>
            </View>

            <View style={styles.gridColumn}>
              <Animated.View entering={FadeIn.delay(200)}>
                <Surface style={styles.formCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <View style={styles.iconContainer}>
                        <IconButton
                          icon="alert-circle"
                          size={20}
                          iconColor="#F44336"
                          style={styles.headerIcon}
                        />
                      </View>
                      <Text style={styles.cardTitle}>Accident Details</Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <Controller
                      control={control}
                      rules={{ required: "Accident description is required" }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <>
                          <Text style={styles.inputLabel}>
                            Accident Description *
                          </Text>
                          <TextInput
                            mode="outlined"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            error={!!errors.accident_description}
                            style={styles.input}
                            multiline
                            numberOfLines={4}
                            disabled={loading}
                            outlineColor="#E0E0E0"
                            activeOutlineColor="#F44336"
                          />
                          {errors.accident_description && (
                            <HelperText type="error" style={styles.errorText}>
                              {errors.accident_description.message}
                            </HelperText>
                          )}
                        </>
                      )}
                      name="accident_description"
                    />

                    <Controller
                      control={control}
                      rules={{ required: "Objects involved is required" }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <>
                          <Text style={styles.inputLabel}>
                            Objects Involved *
                          </Text>
                          <TextInput
                            mode="outlined"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            error={!!errors.objects_involved}
                            style={styles.input}
                            disabled={loading}
                            outlineColor="#E0E0E0"
                            activeOutlineColor="#F44336"
                          />
                          {errors.objects_involved && (
                            <HelperText type="error" style={styles.errorText}>
                              {errors.objects_involved.message}
                            </HelperText>
                          )}
                        </>
                      )}
                      name="objects_involved"
                    />

                    <Controller
                      control={control}
                      rules={{ required: "Injuries is required" }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <>
                          <Text style={styles.inputLabel}>Injuries *</Text>
                          <TextInput
                            mode="outlined"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            error={!!errors.injuries}
                            style={styles.input}
                            multiline
                            numberOfLines={2}
                            disabled={loading}
                            outlineColor="#E0E0E0"
                            activeOutlineColor="#F44336"
                          />
                          {errors.injuries && (
                            <HelperText type="error" style={styles.errorText}>
                              {errors.injuries.message}
                            </HelperText>
                          )}
                        </>
                      )}
                      name="injuries"
                    />

                    <Controller
                      control={control}
                      rules={{ required: "Accident type is required" }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <>
                          <Text style={styles.inputLabel}>Accident Type *</Text>
                          <TextInput
                            mode="outlined"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            error={!!errors.accident_type}
                            style={styles.input}
                            disabled={loading}
                            outlineColor="#E0E0E0"
                            activeOutlineColor="#F44336"
                          />
                          {errors.accident_type && (
                            <HelperText type="error" style={styles.errorText}>
                              {errors.accident_type.message}
                            </HelperText>
                          )}
                        </>
                      )}
                      name="accident_type"
                    />
                  </View>
                </Surface>

                <Surface style={[styles.formCard, { marginTop: 24 }]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <View style={styles.iconContainer}>
                        <IconButton
                          icon="file-document"
                          size={20}
                          iconColor="#F44336"
                          style={styles.headerIcon}
                        />
                      </View>
                      <Text style={styles.cardTitle}>Supporting Documents</Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <Text style={styles.inputLabel}>Medical Certificate</Text>

                    {!documentName ? (
                      <View style={styles.documentUploadSection}>
                        <TouchableOpacity
                          ref={dropRef}
                          style={[
                            styles.dropzone,
                            isDragActive && styles.dropzoneActive,
                            uploadingDocument && styles.dropzoneUploading,
                          ]}
                          onPress={() => handlePickDocument()}
                          disabled={uploadingDocument}
                        >
                          {uploadingDocument ? (
                            <Animated.View style={styles.uploadingContainer}>
                              <AnimatedCircularProgress
                                size={64}
                                width={6}
                                fill={uploadProgress}
                                tintColor="#F44336"
                                backgroundColor="#FEE2E2"
                                rotation={0}
                                lineCap="round"
                              />
                              <Text style={styles.uploadingText}>
                                Uploading... {uploadProgress}%
                              </Text>
                              <Text style={styles.uploadingSubtext}>
                                Please wait
                              </Text>
                            </Animated.View>
                          ) : (
                            <>
                              <MaterialCommunityIcons
                                name="cloud-upload"
                                size={48}
                                color="#F44336"
                              />
                              <Text style={styles.dropzoneText}>
                                Click to select your medical certificate
                              </Text>
                              <Text style={styles.dropzoneSubText}>
                                Supported formats: PDF, DOCX, JPG, PNG (max
                                10MB)
                              </Text>
                              {Platform.OS === "web" && (
                                <Text style={styles.dropzoneSubText}>
                                  Or drag and drop files here
                                </Text>
                              )}
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.uploadPreview}>
                        <View style={styles.previewIcon}>
                          {getFileIcon(documentName)}
                        </View>

                        <View style={styles.previewContent}>
                          <Text style={styles.fileName} numberOfLines={1}>
                            {documentName}
                          </Text>
                          <Text style={styles.fileInfo}>
                            {formatFileSize(fileSize)} • Uploaded{" "}
                            {formatDate(uploadDate)}
                          </Text>

                          {/* Add download button */}
                          {/* {sharingLink && (
                            <TouchableOpacity
                              style={styles.downloadButton}
                              onPress={() => {
                                if (Platform.OS === "web") {
                                  window.open(sharingLink, "_blank");
                                } else {
                                  Linking.openURL(sharingLink);
                                }
                              }}
                            >
                              <Text style={styles.downloadButtonText}>
                                Download
                              </Text>
                            </TouchableOpacity>
                          )} */}
                        </View>

                        <View style={styles.previewActions}>
                          {sharingLink && (
                            <>
                              <IconButton
                                icon="eye"
                                size={20}
                                onPress={() => {
                                  if (Platform.OS === "web") {
                                    window.open(sharingLink, "_blank");
                                  } else {
                                    Linking.openURL(sharingLink);
                                  }
                                }}
                                style={styles.actionButton}
                              />
                              <IconButton
                                icon="content-copy"
                                size={20}
                                onPress={handleCopyLink}
                                style={styles.actionButton}
                              />
                            </>
                          )}
                          {deletingDocument ? (
                            <IconButton
                              icon="sync"
                              size={20}
                              disabled={true}
                              style={[
                                styles.actionButton,
                                styles.actionButtonDanger,
                              ]}
                            />
                          ) : (
                            <IconButton
                              icon="delete"
                              size={20}
                              onPress={handleDeleteDocument}
                              style={[
                                styles.actionButton,
                                styles.actionButtonDanger,
                              ]}
                            />
                          )}
                        </View>

                        {uploadingDocument && (
                          <View style={styles.progressContainer}>
                            <View style={styles.uploadProgress}>
                              <AnimatedCircularProgress
                                size={80}
                                width={8}
                                fill={uploadProgress}
                                tintColor={
                                  uploadProgress === 100 ? "#4CAF50" : "#F44336"
                                }
                                backgroundColor={
                                  uploadProgress === 100 ? "#E8F5E9" : "#FEE2E2"
                                }
                                rotation={0}
                                lineCap="round"
                              />
                              {uploadProgress === 100 ? (
                                <MaterialCommunityIcons
                                  name="check"
                                  size={32}
                                  color="#4CAF50"
                                  style={styles.progressIcon}
                                />
                              ) : (
                                <Text style={styles.progressText}>
                                  {uploadProgress}%
                                </Text>
                              )}
                            </View>
                          </View>
                        )}
                      </View>
                    )}

                    {uploadError && (
                      <View style={styles.errorContainer}>
                        <MaterialCommunityIcons
                          name="alert-circle"
                          size={20}
                          color="#EF4444"
                        />
                        <Text style={styles.errorText}>{uploadError}</Text>
                        <TouchableOpacity
                          style={styles.retryButton}
                          onPress={handleRetryUpload}
                        >
                          <Text style={styles.retryButtonText}>Retry</Text>
                        </TouchableOpacity>
                      </View>
                    )}
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
              style={[styles.button, styles.submitButton]}
              loading={loading}
              disabled={loading}
              buttonColor={theme.colors.primary}
            >
              Submit Report
            </Button>
          </View>
        </Surface>
      </KeyboardAvoidingView>

      {Platform.OS === "web" ? (
        <WebDatePicker />
      ) : (
        <DateTimePickerModal
          isVisible={showDatePicker}
          mode="date"
          onConfirm={handleDateConfirm}
          onCancel={handleDateCancel}
          date={watch("date_of_accident")}
          maximumDate={new Date()}
        />
      )}

      <CustomSnackbar
        visible={snackbarVisible}
        message={snackbarMessage}
        onDismiss={() => setSnackbarVisible(false)}
        type={
          snackbarMessage?.includes("successful") ||
          snackbarMessage?.includes("instructions will be sent") ||
          snackbarMessage?.includes("copied")
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

const styles = StyleSheet.create<StylesType>({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  keyboardAvoidingView: {
    flex: 1,
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
    backgroundColor: "#ffebee",
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
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    color: "#64748b",
    fontFamily: "Poppins-Medium",
  },
  dateButton: {
    marginBottom: 24,
    borderColor: "#E0E0E0",
    borderRadius: 8,
  },
  documentPickerContainer: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  documentButton: {
    borderColor: "#E0E0E0",
    borderRadius: 8,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
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
    borderColor: "#E0E0E0",
  },
  submitButton: {},
  webDatePickerModal: {
    margin: 20,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "transparent",
    elevation: 0,
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  modalSurface: {
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 0,
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: "Poppins-SemiBold",
    color: "#424242",
  },
  webDatePickerContainer: {
    padding: 24,
  },
  webDateInputRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
  },
  webDateInputContainer: {
    flex: 1,
  },
  webDateInputLabel: {
    fontSize: 14,
    marginBottom: 8,
    color: "#64748b",
    fontFamily: "Poppins-Medium",
  },
  webDateInput: {
    backgroundColor: "#FFFFFF",
  },
  webDatePickerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  webDatePickerButton: {
    minWidth: 100,
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
  previewModal: {
    margin: 20,
    backgroundColor: "transparent",
  },
  previewModalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
  },
  previewModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
  },
  previewContainer: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  previewButton: {
    marginLeft: 8,
  },
  mobilePreviewContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  mobilePreviewText: {
    textAlign: "center",
    marginBottom: 20,
    fontSize: 16,
    color: "#666",
  },
  mobilePreviewButton: {
    minWidth: 200,
  },
  fallbackPreviewContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  fallbackPreviewText: {
    fontSize: 18,
    fontFamily: "Poppins-Medium",
    color: "#424242",
    textAlign: "center",
    marginBottom: 8,
  },
  fallbackPreviewSubtext: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
  },
  fallbackPreviewButton: {
    minWidth: 200,
  },
  documentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  documentUploadSection: {
    marginTop: 16,
  },
  dropzone: {
    borderWidth: 2,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 24,
    backgroundColor: "#FAFAFA",
    alignItems: "center",
    justifyContent: "center",
  },
  dropzoneActive: {
    borderColor: "#F44336",
    backgroundColor: "#FFEBEE",
  },
  dropzoneIcon: {
    width: 48,
    height: 48,
    marginBottom: 16,
  },
  dropzoneText: {
    fontSize: 16,
    color: "#64748B",
    textAlign: "center",
    fontFamily: "Poppins-Medium",
  },
  dropzoneSubText: {
    fontSize: 14,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 8,
    fontFamily: "Poppins-Regular",
  },
  uploadPreview: {
    marginTop: 24,
    padding: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  previewIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: "#FFEBEE",
    alignItems: "center",
    justifyContent: "center",
  },
  previewContent: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    color: "#1E293B",
    fontFamily: "Poppins-Medium",
    marginBottom: 4,
  },
  fileInfo: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Poppins-Regular",
  },
  previewActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
  },
  actionButtonDanger: {
    backgroundColor: "#FEE2E2",
  },
  progressContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
  },
  uploadProgress: {
    position: "relative",
  },
  progressText: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -20 }, { translateY: -12 }],
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#F44336",
  },
  errorContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#FEF2F2",
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  retryButton: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    fontSize: 14,
    color: "#EF4444",
    fontFamily: "Poppins-Medium",
  },
  dropzoneUploading: {
    borderColor: "#F44336",
    borderWidth: 2,
    backgroundColor: "#FFEBEE",
    opacity: 0.9,
    transform: [{ scale: 1.01 }],
  },
  uploadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    position: "relative",
    overflow: "hidden",
  },
  uploadingText: {
    fontSize: 16,
    color: "#F44336",
    fontFamily: "Poppins-Medium",
    marginTop: 16,
    textAlign: "center",
  },
  uploadingSubtext: {
    fontSize: 14,
    color: "#64748B",
    fontFamily: "Poppins-Regular",
    marginTop: 8,
    textAlign: "center",
  },
  downloadButton: {
    marginTop: 8,
    backgroundColor: "#F1F5F9",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  downloadButtonText: {
    fontSize: 12,
    color: "#475569",
    fontFamily: "Poppins-Medium",
  },
  progressTextContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  progressIcon: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -16 }, { translateY: -16 }],
  },
});

export default CreateAccidentReportScreen;
