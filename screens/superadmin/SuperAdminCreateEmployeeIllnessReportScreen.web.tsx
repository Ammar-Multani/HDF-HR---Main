import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
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
import * as DocumentPicker from "expo-document-picker";
import Animated, { FadeIn } from "react-native-reanimated";
import CustomSnackbar from "../../components/CustomSnackbar";
import { t } from "i18next";
import EmployeeSelector from "../../components/EmployeeSelector";
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

interface IllnessReportFormData {
  id?: string;
  date_of_onset_leave: Date;
  leave_description: string;
  medical_certificate?: string;
  document_id?: string;
  company_id: string;
}

const CreateIllnessReportScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const dimensions = useWindowDimensions();

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
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
  } = useForm<IllnessReportFormData>({
    defaultValues: {
      date_of_onset_leave: new Date(),
      leave_description: "",
      medical_certificate: "",
    },
  });

  const dateOfOnsetLeave = watch("date_of_onset_leave");

  const fetchCompanyId = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("company_user")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("Error fetching company ID:", error);
        return;
      }

      setCompanyId(data.company_id);
    } catch (error) {
      console.error("Error fetching company ID:", error);
    }
  };

  useEffect(() => {
    fetchCompanyId();
  }, [user]);

  const handleDateConfirm = (selectedDate: Date) => {
    setShowDatePicker(false);
    setValue("date_of_onset_leave", selectedDate);
  };

  const handleDateCancel = () => {
    setShowDatePicker(false);
  };

  const handlePickDocument = async () => {
    if (!selectedEmployee) {
      setSnackbarMessage("Please select an employee first");
      setSnackbarVisible(true);
      return;
    }

    try {
      setUploadingDocument(true);

      // Validate company ID
      if (!companyId) {
        throw new Error("Company ID is not available");
      }

      // Create illness report first if it doesn't exist
      let reportId = watch("id");
      if (!reportId) {
        console.log("Creating new illness report...");
        const { data: illnessReport, error: createError } = await supabase
          .from("illness_report")
          .insert([
            {
              employee_id: selectedEmployee.id,
              company_id: companyId,
              date_of_onset_leave: watch("date_of_onset_leave").toISOString(),
              leave_description: watch("leave_description") || "",
              status: FormStatus.DRAFT,
              submitted_by: user?.id,
              submission_date: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (createError) {
          console.error("Error creating illness report:", createError);
          throw createError;
        }

        if (!illnessReport) {
          console.error("No illness report data returned from insert");
          throw new Error("Failed to create illness report - no data returned");
        }

        console.log("Created illness report:", illnessReport);
        reportId = illnessReport.id;
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
      formData.append("companyId", companyId as string);
      formData.append("employeeId", selectedEmployee.id as string);
      const uploadedById = user?.id;
      if (typeof uploadedById !== "string") {
        throw new Error("User ID is required");
      }
      formData.append("uploadedBy", uploadedById);
      formData.append("reportId", reportId as string);
      formData.append("reportType", "illness_report");

      // Add metadata as JSON string
      const metadata = {
        reportId: reportId,
        reportType: "illness_report",
        company_id: companyId,
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
      setSnackbarMessage(
        error.message || "Failed to upload document. Please try again."
      );
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

  const onSubmit = async (data: IllnessReportFormData) => {
    try {
      if (!selectedCompany) {
        setCompanyError("Please select a company");
        return;
      }
      setCompanyError("");

      if (!companyId) {
        setSnackbarMessage("Company information not available");
        setSnackbarVisible(true);
        return;
      }

      if (!selectedEmployee) {
        setSnackbarMessage("Please select an employee");
        setSnackbarVisible(true);
        return;
      }

      setLoading(true);

      // Create illness report
      const { error } = await supabase.from("illness_report").insert([
        {
          employee_id: selectedEmployee.id,
          company_id: companyId,
          date_of_onset_leave: data.date_of_onset_leave.toISOString(),
          leave_description: data.leave_description,
          medical_certificate: data.medical_certificate || null,
          status: FormStatus.PENDING,
          submitted_by: user?.id,
          submission_date: new Date().toISOString(),
        },
      ]);

      if (error) {
        throw error;
      }

      setSnackbarMessage("Illness report submitted successfully");
      setSnackbarVisible(true);

      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (error: any) {
      console.error("Error submitting illness report:", error);
      setSnackbarMessage(error.message || "Failed to submit illness report");
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  // Web-specific date picker component
  const WebDatePicker = () => {
    const [year, setYear] = useState(
      watch("date_of_onset_leave").getFullYear()
    );
    const [month, setMonth] = useState(
      watch("date_of_onset_leave").getMonth() + 1
    );
    const [day, setDay] = useState(watch("date_of_onset_leave").getDate());

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
                  buttonColor="#FF9800"
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
        title="Report Illness"
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
            <Text style={styles.pageTitle}>Submit illness report details</Text>
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
                <Surface style={styles.formCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <View style={styles.iconContainer}>
                        <IconButton
                          icon="account"
                          size={20}
                          iconColor="#FF9800"
                          style={styles.headerIcon}
                        />
                      </View>
                      <Text style={styles.cardTitle}>Employee Details</Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    {companyId && (
                      <EmployeeSelector
                        companyId={companyId}
                        onSelect={setSelectedEmployee}
                        selectedEmployee={selectedEmployee}
                      />
                    )}
                  </View>
                </Surface>
                )}

                <Surface style={[styles.formCard, { marginTop: 24 }]}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <View style={styles.iconContainer}>
                        <IconButton
                          icon="calendar"
                          size={20}
                          iconColor="#FF9800"
                          style={styles.headerIcon}
                        />
                      </View>
                      <Text style={styles.cardTitle}>Leave Details</Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <Text style={styles.inputLabel}>Date of Onset/Leave *</Text>
                    <Button
                      mode="outlined"
                      onPress={() => setShowDatePicker(true)}
                      style={styles.dateButton}
                      icon="calendar"
                      textColor="#FF9800"
                    >
                      {format(watch("date_of_onset_leave"), "MMMM d, yyyy")}
                    </Button>

                    <Controller
                      control={control}
                      rules={{ required: "Leave description is required" }}
                      render={({ field: { onChange, onBlur, value } }) => (
                        <>
                          <Text style={styles.inputLabel}>
                            Leave Description *
                          </Text>
                          <TextInput
                            mode="outlined"
                            value={value}
                            onChangeText={onChange}
                            onBlur={onBlur}
                            error={!!errors.leave_description}
                            style={styles.input}
                            multiline
                            numberOfLines={4}
                            disabled={loading}
                            outlineColor="#E0E0E0"
                            activeOutlineColor="#FF9800"
                          />
                          {errors.leave_description && (
                            <HelperText type="error" style={styles.errorText}>
                              {errors.leave_description.message}
                            </HelperText>
                          )}
                        </>
                      )}
                      name="leave_description"
                    />
                  </View>
                </Surface>
              </Animated.View>
            </View>

            <View style={styles.gridColumn}>
              <Animated.View entering={FadeIn.delay(300)}>
                <Surface style={styles.formCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.headerLeft}>
                      <View style={styles.iconContainer}>
                        <IconButton
                          icon="file-document"
                          size={20}
                          iconColor="#FF9800"
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
                        textColor="#FF9800"
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
                            textColor="#FF9800"
                          >
                            Open Document
                          </Button>
                          <Button
                            mode="outlined"
                            onPress={handleCopyLink}
                            style={styles.documentButton}
                            icon="share-variant"
                            textColor="#FF9800"
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

            <View style={styles.gridColumn}>
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
                    onSelect={setSelectedCompany}
                    selectedCompany={selectedCompany}
                    error={companyError}
                    required={true}
                    label="Select Company"
                  />
                </View>
              </Surface>
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
          date={watch("date_of_onset_leave")}
          maximumDate={new Date()}
        />
      )}

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
    backgroundColor: "#fff3e0",
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
    elevation: 4,
    shadowColor: "rgba(0,0,0,0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
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
  documentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
});

export default CreateIllnessReportScreen;
