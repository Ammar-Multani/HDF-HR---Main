import React, { useState, useEffect } from "react";
import { logDebug } from "../../utils/logger";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Dimensions,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Snackbar,
  HelperText,
  Checkbox,
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
import { FormStatus, DocumentType } from "../../types";
import { pickAndUploadDocument } from "../../utils/documentPicker";
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
  company_id?: string;
}

interface Company {
  id: string;
  company_name: string;
  active: boolean;
}

interface StaffDepartureFormData {
  id?: string;
  exit_date: Date;
  comments: string;
  company_id: string;
}

const CreateStaffDepartureScreen = () => {
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
  const [selectedDocuments, setSelectedDocuments] = useState<DocumentType[]>(
    []
  );
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [uploadedDocuments, setUploadedDocuments] = useState<
    Record<DocumentType, string | null>
  >({} as Record<DocumentType, string | null>);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(
    null
  );
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
  } = useForm<StaffDepartureFormData>({
    defaultValues: {
      exit_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
      comments: "",
    },
  });

  const exitDate = watch("exit_date");

  const handleDateConfirm = (selectedDate: Date) => {
    setShowDatePicker(false);
    setValue("exit_date", selectedDate);
  };

  const handleDateCancel = () => {
    setShowDatePicker(false);
  };

  const toggleDocument = (document: DocumentType) => {
    if (selectedDocuments.includes(document)) {
      setSelectedDocuments(selectedDocuments.filter((doc) => doc !== document));
    } else {
      setSelectedDocuments([...selectedDocuments, document]);
    }
  };

  const handlePickDocument = async (documentType: DocumentType) => {
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

      // Format document type for folder name
      const formattedType = documentType.toLowerCase().replace(/_/g, "-");

      // Create staff departure report first if it doesn't exist
      let reportId = watch("id");
      if (!reportId) {
        logDebug("Creating new staff departure report...");
        const { data: departureReport, error: createError } = await supabase
          .from("staff_departure")
          .insert([
            {
              employee_id: selectedEmployee.id,
              company_id: selectedCompany.id,
              exit_date: watch("exit_date").toISOString(),
              comments: watch("comments") || "",
              documents_required: selectedDocuments,
              documents_submitted: uploadedDocuments,
              status: FormStatus.DRAFT,
              submitted_by: user?.id,
              submission_date: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (createError) {
          console.error("Error creating staff departure report:", createError);
          throw createError;
        }

        if (!departureReport) {
          console.error("No staff departure report data returned from insert");
          throw new Error(
            "Failed to create staff departure report - no data returned"
          );
        }

        logDebug("Created staff departure report:", departureReport);
        reportId = departureReport.id;
        setValue("id", reportId);
      }

      const documentUrl = await pickAndUploadDocument(
        "departure-documents",
        `${formattedType}/${selectedCompany.id}/${selectedEmployee.id}`,
        {
          type: [
            "application/pdf",
            "image/*",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ],
        }
      );

      if (documentUrl) {
        // Update uploaded documents state
        setUploadedDocuments((prev) => ({
          ...prev,
          [documentType]: documentUrl,
        }));

        setSnackbarMessage("Document uploaded successfully");
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

  const onSubmit = async (data: StaffDepartureFormData) => {
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

      if (selectedDocuments.length === 0) {
        setSnackbarMessage("Please select at least one required document");
        setSnackbarVisible(true);
        return;
      }

      setLoading(true);

      // Create staff departure report with selectedCompany.id
      const { error } = await supabase.from("staff_departure").insert([
        {
          employee_id: selectedEmployee.id,
          company_id: selectedCompany.id,
          exit_date: data.exit_date.toISOString(),
          comments: data.comments,
          documents_required: selectedDocuments,
          documents_submitted: uploadedDocuments,
          status: FormStatus.PENDING,
          submitted_by: user?.id,
          submission_date: new Date().toISOString(),
        },
      ]);

      if (error) {
        throw error;
      }

      setSnackbarMessage("Staff departure report submitted successfully");
      setSnackbarVisible(true);

      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (error: any) {
      console.error("Error submitting staff departure report:", error);
      setSnackbarMessage(error.message || "Failed to submit report");
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  // Web-specific date picker component
  const WebDatePicker = () => {
    const [year, setYear] = useState(watch("exit_date").getFullYear());
    const [month, setMonth] = useState(watch("exit_date").getMonth() + 1);
    const [day, setDay] = useState(watch("exit_date").getDate());

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
                  buttonColor="#2196F3"
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

  const renderDocumentItem = (document: DocumentType, label: string) => {
    const isSelected = selectedDocuments.includes(document);
    const isUploaded = !!uploadedDocuments[document];

    return (
      <View style={styles.documentItem} key={document}>
        <Checkbox
          status={isSelected ? "checked" : "unchecked"}
          onPress={() => toggleDocument(document)}
          color="#2196F3"
        />
        <Text style={styles.documentLabel}>{label}</Text>
        {/* {isSelected && (
          <Button
            mode={isUploaded ? "contained" : "outlined"}
            onPress={() => handlePickDocument(document)}
            style={styles.uploadButton}
            icon={isUploaded ? "check" : "upload"}
            loading={uploadingDocument}
            disabled={loading || uploadingDocument}
            textColor={isUploaded ? "#fff" : "#2196F3"}
            buttonColor={isUploaded ? "#2196F3" : undefined}
            compact
          >
            {isUploaded ? "Uploaded" : "Upload"}
          </Button>
        )} */}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#F8F9FA" }]}>
      <AppHeader
        title="Staff Departure"
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
            <Text style={styles.pageTitle}>Submit staff departure details</Text>
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
                            iconColor="#2196F3"
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


                  <Surface style={[styles.formCard, { marginTop: 24 }]}>
                    <View style={styles.cardHeader}>
                      <View style={styles.headerLeft}>
                        <View style={styles.iconContainer}>
                          <IconButton
                            icon="calendar"
                            size={20}
                            iconColor="#2196F3"
                            style={styles.headerIcon}
                          />
                        </View>
                        <Text style={styles.cardTitle}>Exit Date</Text>
                      </View>
                    </View>

                    <View style={styles.cardContent}>
                      <Text style={styles.inputLabel}>Exit Date *</Text>
                      <Button
                        mode="outlined"
                        onPress={() => setShowDatePicker(true)}
                        style={styles.dateButton}
                        icon="calendar"
                        textColor="#2196F3"
                      >
                        {format(watch("exit_date"), "MMMM d, yyyy")}
                      </Button>

                      <Controller
                        control={control}
                        render={({ field: { onChange, onBlur, value } }) => (
                          <>
                            <Text style={styles.inputLabel}>
                              Additional Comments
                            </Text>
                            <TextInput
                              mode="outlined"
                              value={value}
                              onChangeText={onChange}
                              onBlur={onBlur}
                              style={styles.input}
                              multiline
                              numberOfLines={4}
                              disabled={loading}
                              outlineColor="#E0E0E0"
                              activeOutlineColor="#2196F3"
                            />
                          </>
                        )}
                        name="comments"
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
                            iconColor="#2196F3"
                            style={styles.headerIcon}
                          />
                        </View>
                        <Text style={styles.cardTitle}>Required Documents</Text>
                      </View>
                    </View>

                    <View style={styles.cardContent}>
                      <Text style={styles.helperText}>
                        Select the documents you need to submit for your
                        departure:
                      </Text>

                      <View style={styles.documentsContainer}>
                        {renderDocumentItem(
                          DocumentType.RESIGNATION_LETTER,
                          "Resignation Letter"
                        )}
                        {renderDocumentItem(
                          DocumentType.EXIT_INTERVIEW,
                          "Exit Interview"
                        )}
                        {renderDocumentItem(
                          DocumentType.EQUIPMENT_RETURN,
                          "Equipment Return Form"
                        )}
                        {renderDocumentItem(
                          DocumentType.FINAL_SETTLEMENT,
                          "Final Settlement Form"
                        )}
                        {renderDocumentItem(
                          DocumentType.NON_DISCLOSURE,
                          "Non-Disclosure Agreement"
                        )}
                        {renderDocumentItem(
                          DocumentType.NON_COMPETE,
                          "Non-Compete Agreement"
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
          date={watch("exit_date")}
          minimumDate={new Date()}
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
    backgroundColor: "#e3f2fd",
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
  helperText: {
    fontSize: 14,
    color: "#64748b",
    fontFamily: "Poppins-Regular",
    marginBottom: 16,
  },
  documentsContainer: {
    gap: 12,
  },
  documentItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 8,
  },
  documentLabel: {
    fontSize: 14,
    marginLeft: 12,
    color: "#334155",
    fontFamily: "Poppins-Medium",
    flex: 1,
  },
  uploadButton: {
    marginLeft: 12,
    minWidth: 100,
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
});

export default CreateStaffDepartureScreen;
