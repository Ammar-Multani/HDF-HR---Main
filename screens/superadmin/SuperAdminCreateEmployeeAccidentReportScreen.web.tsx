import React, { useState, useEffect } from "react";
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
import Animated, { FadeIn } from "react-native-reanimated";
import CustomSnackbar from "../../components/CustomSnackbar";
import { t } from "i18next";
import EmployeeSelector from "../../components/EmployeeSelector";
import * as DocumentPicker from "expo-document-picker";
import { WebView } from "react-native-webview";
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

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  job_title?: string;
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
};

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

  // Clear employee selection when company changes
  useEffect(() => {
    if (
      selectedEmployee &&
      selectedEmployee.company_id !== selectedCompany?.id
    ) {
      setSelectedEmployee(null);
    }
  }, [selectedCompany]);

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

  const handlePickDocument = async () => {
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

    try {
      setUploadingDocument(true);

      // Validate company ID
      if (!selectedCompany) {
        throw new Error("Company ID is not available");
      }

      // Create accident report first if it doesn't exist
      let reportId = watch("id");
      if (!reportId) {
        console.log("Creating new accident report...");
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

        console.log("Created accident report:", accidentReport);
        reportId = accidentReport.id;
        setValue("id", reportId);
      }

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
        return;
      }

      const file = result.assets[0];

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
          console.log("Attempting to upload file...");
          const response = await supabase.functions.invoke("onedrive-upload", {
            body: formData,
          });

          console.log("Raw upload response:", response);

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
        console.log("Upload response data:", uploadResponse.data);

        // The actual data is nested inside data.data
        const responseData = uploadResponse.data.data;
        console.log("Processed response data:", responseData);

        // Update form with file path if available
        if (responseData?.filePath) {
          setValue("medical_certificate", responseData.filePath);
        }

        // Only try to set document_id if document object exists and has an id
        if (responseData?.document?.id) {
          setValue("document_id", responseData.document.id);
        }

        setDocumentName(file.name);

        // Store both webUrl and sharingLink
        if (responseData?.webUrl) {
          console.log("Original webUrl:", responseData.webUrl);

          // Extract the direct file URL from SharePoint URL
          let directUrl = responseData.webUrl;

          // If it's a SharePoint URL, modify it to get direct access
          if (directUrl.includes("sharepoint.com")) {
            // Remove any query parameters
            directUrl = directUrl.split("?")[0];
            // Add direct access parameter
            directUrl += "?web=1";
          }

          console.log("Setting preview URL to:", directUrl);
          setSharingLink(responseData.sharingLink);
        } else {
          console.warn("No webUrl in response data:", responseData);
        }

        setSnackbarMessage("Medical certificate uploaded successfully");
        setSnackbarVisible(true);
      } else {
        console.warn("Upload response missing data:", uploadResponse);
        setSnackbarMessage("Document uploaded but some data was missing");
        setSnackbarVisible(true);
      }
    } catch (error: any) {
      console.error("Error picking document:", error);
      setSnackbarMessage("Error uploading document. Please try again.");
      setSnackbarVisible(true);
    } finally {
      setUploadingDocument(false);
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
                        onSelect={setSelectedEmployee}
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
                        <Text style={styles.inputLabel}>
                          Date of Accident *
                        </Text>
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
                                <HelperText
                                  type="error"
                                  style={styles.errorText}
                                >
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
                                <HelperText
                                  type="error"
                                  style={styles.errorText}
                                >
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
                                <HelperText
                                  type="error"
                                  style={styles.errorText}
                                >
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
                    <View style={styles.documentPickerContainer}>
                      <Button
                        mode="outlined"
                        onPress={handlePickDocument}
                        style={styles.documentButton}
                        icon="file-upload"
                        loading={uploadingDocument}
                        disabled={loading || uploadingDocument}
                        textColor="#F44336"
                      >
                        {documentName || "Upload Medical Certificate"}
                      </Button>
                      {documentName && sharingLink && (
                        <View style={styles.documentActions}>
                          <Button
                            mode="outlined"
                            onPress={() => {
                              if (Platform.OS === "web") {
                                window.open(sharingLink, "_blank");
                              } else {
                                Linking.openURL(sharingLink);
                              }
                            }}
                            style={styles.documentButton}
                            icon="file-document"
                            textColor="#F44336"
                          >
                            Open Document
                          </Button>
                          <Button
                            mode="outlined"
                            onPress={handleCopyLink}
                            style={styles.documentButton}
                            icon="share-variant"
                            textColor="#F44336"
                          >
                            Copy Link
                          </Button>
                        </View>
                      )}
                    </View>
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
});

export default CreateAccidentReportScreen;
