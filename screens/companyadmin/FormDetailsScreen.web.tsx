import React, { useState, useEffect } from "react";
import { logDebug } from "../../utils/logger";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Alert,
  Linking,
  TouchableOpacity,
  Platform,
  Dimensions,
  ViewStyle,
  TextStyle,
} from "react-native";
import {
  Card,
  Button,
  Divider,
  useTheme,
  TextInput,
  Chip,
  Surface,
  IconButton,
  Menu,
  Portal,
  Modal,
  Snackbar,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import StatusBadge from "../../components/StatusBadge";
import { FormStatus, DocumentType } from "../../types";
import Text from "../../components/Text";
import { useAuth } from "../../contexts/AuthContext";
import Animated, { FadeIn } from "react-native-reanimated";
import HelpGuideModal from "../../components/HelpGuideModal";
import { WebView } from "react-native-webview";
import { t } from "i18next";
import CustomSnackbar from "../../components/CustomSnackbar";

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

// Add SUBMITTED to FormStatus for backward compatibility
const ExtendedFormStatus = {
  ...FormStatus,
  SUBMITTED: "submitted" as const,
};

type ExtendedFormStatusType = FormStatus | "submitted";

type FormDetailsRouteParams = {
  formId: string;
  formType: "accident" | "illness" | "departure";
};

type StylesType = {
  container: ViewStyle;
  scrollView: ViewStyle;
  scrollContent: ViewStyle;
  gridContainer: ViewStyle;
  gridColumn: ViewStyle;
  statusSection: ViewStyle;
  statusRow: ViewStyle;
  statusLabel: TextStyle;
  statusBadgeClickable: ViewStyle;
  statusText: TextStyle;
  editStatusIcon: ViewStyle;
  detailsCard: ViewStyle;
  cardHeader: ViewStyle;
  headerLeft: ViewStyle;
  iconContainer: ViewStyle;
  headerIcon: ViewStyle;
  cardTitle: TextStyle;
  cardContent: ViewStyle;
  sectionDivider: ViewStyle;
  sectionSubtitle: TextStyle;
  description: TextStyle;
  detailRow: ViewStyle;
  detailLabel: TextStyle;
  detailValue: TextStyle;
  documentsContainer: ViewStyle;
  documentChip: ViewStyle;
  documentButton: ViewStyle;
  button: ViewStyle;
  errorContainer: ViewStyle;
  modalContainer: ViewStyle;
  modalSurface: ViewStyle;
  modalHeader: ViewStyle;
  modalHeaderLeft: ViewStyle;
  modalHeaderIcon: ViewStyle;
  modalTitle: TextStyle;
  modalDivider: ViewStyle;
  statusOptionsContainer: ViewStyle;
  statusOption: ViewStyle;
  statusOptionContent: ViewStyle;
  statusIconContainer: ViewStyle;
  statusTextContainer: ViewStyle;
  statusOptionTitle: TextStyle;
  statusDescription: TextStyle;
  simpleCardHeader: ViewStyle;
  simpleCardHeaderTitle: TextStyle;
  detailsSection: ViewStyle;
  documentActions: ViewStyle;
  snackbar: ViewStyle;
};

const FormDetailsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const route =
    useRoute<RouteProp<Record<string, FormDetailsRouteParams>, string>>();
  const { formId, formType } = route.params;
  const dimensions = useWindowDimensions();

  // Calculate responsive breakpoints
  const isLargeScreen = dimensions.width >= 1440;
  const isMediumScreen = dimensions.width >= 768 && dimensions.width < 1440;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<FormStatus | null>(null);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const fetchFormDetails = async () => {
    try {
      setLoading(true);
      logDebug(
        "Fetching form details for formId:",
        formId,
        "type:",
        formType
      );

      let formData;
      let employeeData;

      // Fetch form details based on type
      if (formType === "accident") {
        const { data, error } = await supabase
          .from("accident_report")
          .select("*, employee:employee_id(*)")
          .eq("id", formId)
          .single();

        if (error) {
          console.error("Error fetching accident report:", error);
          return;
        }

        formData = data;
        employeeData = data.employee;
        logDebug("Fetched accident report:", formData);
        logDebug(
          "Medical certificate field value:",
          formData.medical_certificate
        );

        // Get document details if medical certificate exists
        if (formData.medical_certificate) {
          logDebug(
            "Medical certificate exists, fetching document details..."
          );

          // First try to find by reference_id and type
          const { data: docData, error: documentError } = await supabase
            .from("employee_documents")
            .select("*")
            .eq("reference_type", "accident_report")
            .eq("reference_id", formId)
            .eq("document_type", "MEDICAL_CERTIFICATE");

          logDebug("Document query result:", { docData, documentError });

          if (documentError) {
            console.error("Error fetching document details:", documentError);
          } else if (docData && docData.length > 0) {
            const doc = docData[0];
            logDebug("Found document with URL:", doc.file_url);
            formData.document_url = doc.file_url;
          } else {
            // If not found by reference, try to find by file_path
            logDebug(
              "Trying to find document by file path:",
              formData.medical_certificate
            );
            const { data: pathDocData, error: pathError } = await supabase
              .from("employee_documents")
              .select("*")
              .eq("file_path", formData.medical_certificate);

            logDebug("Path-based document query result:", {
              pathDocData,
              pathError,
            });

            if (pathError) {
              console.error("Error fetching document by path:", pathError);
            } else if (pathDocData && pathDocData.length > 0) {
              const doc = pathDocData[0];
              logDebug("Found document by path with URL:", doc.file_url);
              formData.document_url = doc.file_url;
            } else {
              logDebug(
                "No document found in employee_documents table for this accident report"
              );
              // Let's check if there are any documents for this employee
              const { data: employeeDocs, error: employeeDocsError } =
                await supabase
                  .from("employee_documents")
                  .select("*")
                  .eq("employee_id", formData.employee_id)
                  .eq("document_type", "MEDICAL_CERTIFICATE");

              logDebug(
                "All medical certificates for this employee:",
                employeeDocs
              );
              if (employeeDocsError) {
                console.error(
                  "Error fetching employee documents:",
                  employeeDocsError
                );
              }
            }
          }
        }
      } else if (formType === "illness") {
        const { data, error } = await supabase
          .from("illness_report")
          .select("*, employee:employee_id(*)")
          .eq("id", formId)
          .single();

        if (error) {
          console.error("Error fetching illness report:", error);
          return;
        }

        formData = data;
        employeeData = data.employee;
        logDebug("Fetched illness report:", formData);
        logDebug(
          "Medical certificate field value:",
          formData.medical_certificate
        );

        // Get document details if medical certificate exists
        if (formData.medical_certificate) {
          logDebug(
            "Medical certificate exists, fetching document details..."
          );

          // First try to find by reference_id and type
          const { data: docData, error: documentError } = await supabase
            .from("employee_documents")
            .select("*")
            .eq("reference_type", "illness_report")
            .eq("reference_id", formId)
            .eq("document_type", "MEDICAL_CERTIFICATE");

          logDebug("Document query result:", { docData, documentError });

          if (documentError) {
            console.error("Error fetching document details:", documentError);
          } else if (docData && docData.length > 0) {
            const doc = docData[0];
            logDebug("Found document with URL:", doc.file_url);
            formData.document_url = doc.file_url;
          } else {
            // If not found by reference, try to find by file_path
            logDebug(
              "Trying to find document by file path:",
              formData.medical_certificate
            );
            const { data: pathDocData, error: pathError } = await supabase
              .from("employee_documents")
              .select("*")
              .eq("file_path", formData.medical_certificate);

            logDebug("Path-based document query result:", {
              pathDocData,
              pathError,
            });

            if (pathError) {
              console.error("Error fetching document by path:", pathError);
            } else if (pathDocData && pathDocData.length > 0) {
              const doc = pathDocData[0];
              logDebug("Found document by path with URL:", doc.file_url);
              formData.document_url = doc.file_url;
            } else {
              logDebug(
                "No document found in employee_documents table for this illness report"
              );
              // Let's check if there are any documents for this employee
              const { data: employeeDocs, error: employeeDocsError } =
                await supabase
                  .from("employee_documents")
                  .select("*")
                  .eq("employee_id", formData.employee_id)
                  .eq("document_type", "MEDICAL_CERTIFICATE");

              logDebug(
                "All medical certificates for this employee:",
                employeeDocs
              );
              if (employeeDocsError) {
                console.error(
                  "Error fetching employee documents:",
                  employeeDocsError
                );
              }
            }
          }
        }
      } else if (formType === "departure") {
        const { data, error } = await supabase
          .from("staff_departure_report")
          .select("*, employee:employee_id(*)")
          .eq("id", formId)
          .single();

        if (error) {
          console.error("Error fetching staff departure report:", error);
          return;
        }

        formData = data;
        employeeData = data.employee;
      }

      setForm(formData);
      setEmployee(employeeData);
      setComments(formData?.comments || "");
      logDebug("Final form data with document URL:", formData?.document_url);
    } catch (error) {
      console.error("Error in fetchFormDetails:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFormDetails();
  }, [formId, formType]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFormDetails();
  };

  const handleUpdateStatus = async (newStatus: FormStatus) => {
    if (!form || !user) return;

    try {
      setSubmitting(true);
      setSelectedStatus(newStatus);

      // Determine table name based on form type
      let table = "";
      if (formType === "accident") {
        table = "accident_report";
      } else if (formType === "illness") {
        table = "illness_report";
      } else if (formType === "departure") {
        table = "staff_departure_report";
      }

      // Only proceed if we have a valid table name
      if (table) {
        const { error } = await supabase
          .from(table)
          .update({
            status: newStatus,
            comments: comments.trim() || null,
            modified_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", form.id);

        if (error) {
          throw error;
        }

        // Update local state
        setForm({
          ...form,
          status: newStatus,
          comments: comments.trim() || null,
          modified_by: user.id,
          updated_at: new Date().toISOString(),
        });

        Alert.alert(
          "Success",
          `Form status updated to ${newStatus.replace("_", " ")}`
        );
      }
    } catch (error: any) {
      console.error("Error updating form status:", error);
      Alert.alert("Error", error.message || "Failed to update form status");
    } finally {
      setSubmitting(false);
      setStatusMenuVisible(false);
    }
  };

  const handleCopyLink = async () => {
    if (form?.document_url) {
      logDebug("Copying document URL:", form.document_url);
      try {
        await navigator.clipboard.writeText(form.document_url);
        setSnackbarMessage("Link copied to clipboard");
        setSnackbarVisible(true);
      } catch (err) {
        console.error("Error copying link:", err);
        setSnackbarMessage("Failed to copy link");
        setSnackbarVisible(true);
      }
    }
  };

  const getFormTitle = () => {
    switch (formType) {
      case "accident":
        return "Accident Report";
      case "illness":
        return "Illness Report";
      case "departure":
        return "Staff Departure Report";
      default:
        return "Form Details";
    }
  };

  // Get color based on form type
  const getFormTypeColor = () => {
    switch (formType) {
      case "accident":
        return "#F44336"; // Red for accident reports
      case "illness":
        return "#FF9800"; // Orange for illness reports
      case "departure":
        return "#2196F3"; // Blue for departure reports
      default:
        return "#1a73e8"; // Default blue
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMMM d, yyyy");
  };

  const formatTime = (timeString: string | undefined) => {
    if (!timeString) return "N/A";
    return timeString;
  };

  const renderAccidentDetails = () => {
    if (!form) return null;

    return (
      <Surface style={styles.detailsCard}>
        <View style={styles.cardHeader}>
          <View style={styles.simpleCardHeader}>
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
        </View>

        <View style={styles.cardContent}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Accident Date:</Text>
            <Text style={styles.detailValue}>
              {formatDate(form.date_of_accident)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Accident Time:</Text>
            <Text style={styles.detailValue}>
              {formatTime(form.time_of_accident)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Location:</Text>
            <Text style={styles.detailValue}>
              {form.accident_address}, {form.city}
            </Text>
          </View>

          <Divider style={styles.sectionDivider} />

          <Text style={styles.sectionSubtitle}>Accident Description</Text>
          <Text style={styles.description}>{form.accident_description}</Text>

          <Text style={styles.sectionSubtitle}>Objects Involved</Text>
          <Text style={styles.description}>{form.objects_involved}</Text>

          <Text style={styles.sectionSubtitle}>Injuries</Text>
          <Text style={styles.description}>{form.injuries}</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Accident Type:</Text>
            <Text style={styles.detailValue}>{form.accident_type}</Text>
          </View>

          {form.medical_certificate && (
            <View style={styles.documentActions}>
              <Button
                mode="outlined"
                onPress={() => {
                  logDebug("Opening document URL:", form.document_url);
                  if (form.document_url) {
                    if (Platform.OS === "web") {
                      window.open(form.document_url, "_blank");
                    } else {
                      Linking.openURL(form.document_url);
                    }
                  }
                }}
                style={styles.documentButton}
                icon="file-document"
                textColor={formType === "accident" ? "#F44336" : "#FF9800"}
                disabled={!form.document_url}
              >
                Open Document
              </Button>
              <Button
                mode="outlined"
                onPress={handleCopyLink}
                style={styles.documentButton}
                icon="share-variant"
                textColor={formType === "accident" ? "#F44336" : "#FF9800"}
                disabled={!form.document_url}
              >
                Copy Link
              </Button>
            </View>
          )}
        </View>
      </Surface>
    );
  };

  const renderIllnessDetails = () => {
    if (!form) return null;

    return (
      <Surface style={styles.detailsCard}>
        <View style={styles.cardHeader}>
          <View style={styles.simpleCardHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <IconButton
                  icon="hospital-box"
                  size={20}
                  iconColor="#FF9800"
                  style={styles.headerIcon}
                />
              </View>
              <Text style={styles.cardTitle}>Illness Details</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Leave Start:</Text>
            <Text style={styles.detailValue}>
              {formatDate(form.date_of_onset_leave)}
            </Text>
          </View>

          <Divider style={styles.sectionDivider} />

          <Text style={styles.sectionSubtitle}>Leave Description</Text>
          <Text style={styles.description}>{form.leave_description}</Text>

          {form.medical_certificate && (
            <View style={styles.documentActions}>
              <Button
                mode="outlined"
                onPress={() => {
                  logDebug("Opening document URL:", form.document_url);
                  if (form.document_url) {
                    if (Platform.OS === "web") {
                      window.open(form.document_url, "_blank");
                    } else {
                      Linking.openURL(form.document_url);
                    }
                  }
                }}
                style={styles.documentButton}
                icon="file-document"
                textColor="#FF9800"
                disabled={!form.document_url}
              >
                Open Document
              </Button>
              <Button
                mode="outlined"
                onPress={handleCopyLink}
                style={styles.documentButton}
                icon="share-variant"
                textColor="#FF9800"
                disabled={!form.document_url}
              >
                Copy Link
              </Button>
            </View>
          )}
        </View>
      </Surface>
    );
  };

  const renderDepartureDetails = () => {
    if (!form) return null;

    return (
      <Surface style={styles.detailsCard}>
        <View style={styles.cardHeader}>
          <View style={styles.simpleCardHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                <IconButton
                  icon="exit-to-app"
                  size={20}
                  iconColor="#2196F3"
                  style={styles.headerIcon}
                />
              </View>
              <Text style={styles.cardTitle}>Departure Details</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardContent}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Exit Date:</Text>
            <Text style={styles.detailValue}>{formatDate(form.exit_date)}</Text>
          </View>

          <Divider style={styles.sectionDivider} />

          <Text style={styles.sectionSubtitle}>Required Documents</Text>

          <View style={styles.documentsContainer}>
            {form.documents_required.map((doc: DocumentType, index: number) => (
              <Chip
                key={index}
                style={styles.documentChip}
                icon="file-document-outline"
              >
                {doc
                  .split("_")
                  .map(
                    (word: string) =>
                      word.charAt(0).toUpperCase() + word.slice(1)
                  )
                  .join(" ")}
              </Chip>
            ))}
          </View>
        </View>
      </Surface>
    );
  };

  // Function to get background color based on status
  const getStatusBackgroundColor = (status: ExtendedFormStatusType) => {
    switch (status) {
      case FormStatus.APPROVED:
        return "#E8F5E9";
      case FormStatus.DECLINED:
        return "#FFEBEE";
      case FormStatus.IN_PROGRESS:
        return "#FFF8E1";
      case ExtendedFormStatus.SUBMITTED:
        return "#E3F2FD";
      default:
        return "#F5F5F5";
    }
  };

  // Function to get text color based on status
  const getStatusTextColor = (status: ExtendedFormStatusType) => {
    switch (status) {
      case FormStatus.APPROVED:
        return "#4CAF50";
      case FormStatus.DECLINED:
        return "#F44336";
      case FormStatus.IN_PROGRESS:
        return "#FF9800";
      case ExtendedFormStatus.SUBMITTED:
        return "#2196F3";
      default:
        return "#757575";
    }
  };

  // Function to get icon based on status
  const getStatusIcon = (status: ExtendedFormStatusType) => {
    switch (status) {
      case FormStatus.APPROVED:
        return "check-circle";
      case FormStatus.DECLINED:
        return "close-circle";
      case FormStatus.IN_PROGRESS:
        return "progress-clock";
      case ExtendedFormStatus.SUBMITTED:
        return "send";
      default:
        return "pencil";
    }
  };

  // Define help guide content
  const helpGuideSteps = [
    {
      title: "Form Overview",
      icon: "file-document-outline",
      description:
        "View comprehensive form details including employee information, submission date, and current status. Each form type (Accident, Illness, Departure) has its own specific details section.",
    },
    {
      title: "Status Management",
      icon: "check-circle",
      description:
        "Update form status by clicking the status badge. Choose from options like Pending, In Progress, Approved, or Declined. Each status change is tracked with modification details.",
    },
    {
      title: "Document Access",
      icon: "file-pdf-box",
      description:
        "Access attached documents such as medical certificates or required paperwork by clicking the respective document buttons. Documents open in a new tab for easy viewing.",
    },
    {
      title: "Employee Details",
      icon: "account-details",
      description:
        "Review employee information including name, email, and job title. This section provides quick access to the form submitter's details.",
    },
    {
      title: "Form History",
      icon: "history",
      description:
        "Track form modifications with timestamps and modifier information. The system maintains a record of all status changes and updates.",
    },
  ];

  const helpGuideNote = {
    title: "Important Notes",
    content: [
      "Status changes are immediately reflected in the system",
      "All attached documents are securely stored and accessible",
      "Form details can be refreshed using the pull-to-refresh gesture",
      "Different form types have specific required fields and documents",
      "Status updates may trigger notifications to relevant parties",
    ],
  };

  if (loading && !refreshing) {
    return <LoadingIndicator />;
  }

  if (!form || !employee) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: "#F8F9FA" }]}>
        <AppHeader title={getFormTitle()} showBackButton />
        <View style={styles.errorContainer}>
          <Text style={{ color: theme.colors.error }}>Form not found</Text>
          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={styles.button}
            buttonColor={getFormTypeColor()}
          >
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#F8F9FA" }]}>
      <AppHeader
        title={getFormTitle()}
        subtitle="Review form details and update status"
        showBackButton={true}
        showHelpButton={true}
        onHelpPress={() => setHelpModalVisible(true)}
        showLogo={false}
      />

      <HelpGuideModal
        visible={helpModalVisible}
        onDismiss={() => setHelpModalVisible(false)}
        title="Form Details Guide"
        description="Learn how to review and manage form submissions effectively using the available tools and features."
        steps={helpGuideSteps}
        note={helpGuideNote}
        buttonLabel="Got it"
      />

      <Portal>
        <Modal
          visible={statusMenuVisible}
          onDismiss={() => setStatusMenuVisible(false)}
          contentContainerStyle={[
            styles.modalContainer,
            {
              maxWidth: isLargeScreen ? 480 : isMediumScreen ? 420 : "90%",
              width: isLargeScreen ? 480 : isMediumScreen ? 420 : "90%",
              alignSelf: "center",
              top: isLargeScreen ? "10%" : isMediumScreen ? "8%" : "5%",
            },
          ]}
        >
          <Surface style={styles.modalSurface}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <IconButton
                  icon="check-circle"
                  size={24}
                  iconColor={theme.colors.primary}
                  style={styles.modalHeaderIcon}
                />
                <Text style={styles.modalTitle}>Update Status</Text>
              </View>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setStatusMenuVisible(false)}
              />
            </View>
            <Divider style={styles.modalDivider} />

            <ScrollView
              style={styles.statusOptionsContainer}
              showsVerticalScrollIndicator={Platform.OS === "web"}
            >
              {Object.values(ExtendedFormStatus)
                .filter((status) => status !== FormStatus.DRAFT)
                .map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOption,
                      form.status === status && {
                        backgroundColor: getStatusBackgroundColor(status),
                      },
                    ]}
                    onPress={() => {
                      handleUpdateStatus(status as FormStatus);
                      setStatusMenuVisible(false);
                    }}
                    disabled={submitting}
                  >
                    <View style={styles.statusOptionContent}>
                      <View
                        style={[
                          styles.statusIconContainer,
                          { backgroundColor: getStatusBackgroundColor(status) },
                        ]}
                      >
                        <IconButton
                          icon={getStatusIcon(status)}
                          size={20}
                          iconColor={getStatusTextColor(status)}
                          style={{ margin: 0 }}
                        />
                      </View>
                      <View style={styles.statusTextContainer}>
                        <Text
                          style={[
                            styles.statusOptionTitle,
                            { color: getStatusTextColor(status) },
                          ]}
                        >
                          {status.replace("_", " ")}
                        </Text>
                        <Text style={styles.statusDescription}>
                          {status === FormStatus.APPROVED &&
                            "Mark form as approved"}
                          {status === FormStatus.DECLINED && "Reject this form"}
                          {status === FormStatus.PENDING &&
                            "Mark as pending review"}
                          {status === FormStatus.IN_PROGRESS &&
                            "Mark as under review"}
                          {status === ExtendedFormStatus.SUBMITTED &&
                            "Mark as submitted"}
                        </Text>
                      </View>
                    </View>

                    {form.status === status && (
                      <IconButton
                        icon="check"
                        size={20}
                        iconColor={getStatusTextColor(status)}
                      />
                    )}
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </Surface>
        </Modal>
      </Portal>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            maxWidth: isLargeScreen ? 1400 : isMediumScreen ? 1100 : "100%",
            paddingHorizontal: isLargeScreen ? 48 : isMediumScreen ? 32 : 16,
          },
        ]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.statusSection}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Current Status:</Text>
            <TouchableOpacity
              onPress={() => setStatusMenuVisible(true)}
              disabled={submitting}
              style={[
                styles.statusBadgeClickable,
                {
                  backgroundColor: getStatusBackgroundColor(
                    form.status as ExtendedFormStatusType
                  ),
                },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color: getStatusTextColor(
                      form.status as ExtendedFormStatusType
                    ),
                  },
                ]}
              >
                {form.status?.replace("_", " ")}
              </Text>
              <IconButton
                icon={getStatusIcon(form.status as ExtendedFormStatusType)}
                size={16}
                style={styles.editStatusIcon}
                iconColor={getStatusTextColor(
                  form.status as ExtendedFormStatusType
                )}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.gridContainer}>
          <View style={styles.gridColumn}>
            <Animated.View entering={FadeIn.delay(100)}>
              <Surface style={styles.detailsCard}>
                <View style={styles.cardHeader}>
                  <View style={styles.simpleCardHeader}>
                    <View style={styles.headerLeft}>
                      <View style={styles.iconContainer}>
                        <IconButton
                          icon="account"
                          size={20}
                          iconColor="#64748b"
                          style={styles.headerIcon}
                        />
                      </View>
                      <Text style={styles.cardTitle}>Employee Information</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.detailsSection}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Name:</Text>
                      <Text style={styles.detailValue}>
                        {employee.first_name} {employee.last_name}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Email:</Text>
                      <Text style={styles.detailValue}>{employee.email}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Job Title:</Text>
                      <Text style={styles.detailValue}>
                        {employee.job_title || "N/A"}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Submission Date:</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(form.submission_date || form.created_at)}
                      </Text>
                    </View>
                  </View>
                </View>
              </Surface>
            </Animated.View>
          </View>

          <View style={styles.gridColumn}>
            <Animated.View entering={FadeIn.delay(200)}>
              {formType === "accident" && renderAccidentDetails()}
              {formType === "illness" && renderIllnessDetails()}
              {formType === "departure" && renderDepartureDetails()}
            </Animated.View>
          </View>
        </View>
      </ScrollView>
      <CustomSnackbar
        visible={snackbarVisible}
        message={snackbarMessage}
        onDismiss={() => setSnackbarVisible(false)}
        type={
          snackbarMessage?.includes("successful") ||
          snackbarMessage?.includes("copied") ||
          snackbarMessage?.includes("updated")
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 32,
    alignSelf: "center",
    width: "100%",
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
  statusSection: {
    marginBottom: 32,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusLabel: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    marginRight: 12,
    color: "#64748b",
  },
  statusBadgeClickable: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingLeft: 8,
    paddingRight: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  statusText: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    textTransform: "capitalize",
    marginLeft: 4,
  },
  editStatusIcon: {
    margin: 0,
    marginLeft: 4,
  },
  detailsCard: {
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
    backgroundColor: "#ffffff",
  },
  sectionDivider: {
    marginVertical: 16,
    backgroundColor: "#EEEEEE",
    height: 1,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    marginBottom: 8,
    color: "#424242",
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
    fontFamily: "Poppins-Regular",
    color: "#616161",
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 14,
    alignItems: "flex-start",
  },
  detailLabel: {
    fontFamily: "Poppins-Medium",
    width: 120,
    color: "#757575",
    fontSize: 13,
  },
  detailValue: {
    flex: 1,
    fontFamily: "Poppins-Regular",
    color: "#212121",
    fontSize: 13,
  },
  documentsContainer: {
    marginTop: 12,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  documentChip: {
    margin: 4,
    backgroundColor: "#E3F2FD",
  },
  documentButton: {
    borderColor: "#E0E0E0",
    borderRadius: 8,
  },
  button: {
    marginTop: 16,
    borderRadius: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  // Updated modal styles
  modalContainer: {
    margin: 0,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  modalSurface: {
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "rgba(0,0,0,0.25)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingLeft: 12,
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalHeaderIcon: {
    margin: 0,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#1e293b",
  },
  modalDivider: {
    backgroundColor: "#e2e8f0",
    height: 1,
  },
  statusOptionsContainer: {
    maxHeight: Platform.OS === "web" ? 400 : 400,
    padding: 16,
  },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    backgroundColor: "#ffffff",
    ...(Platform.OS === "web" && {
      cursor: "pointer",
    }),
  },
  statusOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  statusIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  statusTextContainer: {
    flex: 1,
  },
  statusOptionTitle: {
    fontSize: 15,
    fontFamily: "Poppins-Medium",
    textTransform: "capitalize",
    marginBottom: 2,
  },
  statusDescription: {
    fontSize: 13,
    color: "#64748b",
    fontFamily: "Poppins-Regular",
  },
  simpleCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 5,
    backgroundColor: "#FFFFFF",
  },
  simpleCardHeaderTitle: {
    fontSize: 17,
    fontFamily: "Poppins-SemiBold",
    color: "#424242",
  },
  detailsSection: {},
  documentActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
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

export default FormDetailsScreen;
