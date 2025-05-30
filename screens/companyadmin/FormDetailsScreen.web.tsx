import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Alert,
  Linking,
  TouchableOpacity,
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

// Add SUBMITTED to FormStatus for backward compatibility if needed
const ExtendedFormStatus = {
  ...FormStatus,
  SUBMITTED: "submitted" as const,
};

type ExtendedFormStatusType = FormStatus | "submitted";

type FormDetailsRouteParams = {
  formId: string;
  formType: "accident" | "illness" | "departure";
};

const FormDetailsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const route =
    useRoute<RouteProp<Record<string, FormDetailsRouteParams>, string>>();
  const { formId, formType } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<FormStatus | null>(null);

  const fetchFormDetails = async () => {
    try {
      setLoading(true);

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
    } catch (error) {
      console.error("Error fetching form details:", error);
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

  const handleViewDocument = (documentUrl: string) => {
    if (documentUrl) {
      Linking.openURL(documentUrl);
    } else {
      Alert.alert("Error", "Document URL is not available");
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
            <IconButton icon="alert-circle" size={22} iconColor="#F44336" />
            <Text style={styles.simpleCardHeaderTitle}>Accident Details</Text>
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
            <Button
              mode="outlined"
              onPress={() => handleViewDocument(form.medical_certificate)}
              style={styles.documentButton}
              icon="file-document"
              textColor="#F44336"
            >
              View Medical Certificate
            </Button>
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
            <IconButton icon="hospital-box" size={22} iconColor="#FF9800" />
            <Text style={styles.simpleCardHeaderTitle}>Illness Details</Text>
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
            <Button
              mode="outlined"
              onPress={() => handleViewDocument(form.medical_certificate)}
              style={styles.documentButton}
              icon="file-document"
              textColor="#FF9800"
            >
              View Medical Certificate
            </Button>
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
            <IconButton icon="exit-to-app" size={22} iconColor="#2196F3" />
            <Text style={styles.simpleCardHeaderTitle}>Departure Details</Text>
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
        onHelpPress={() => {
          navigation.navigate("Help" as never);
        }}
        showLogo={false}
      />

      <Portal>
        <Modal
          visible={statusMenuVisible}
          onDismiss={() => setStatusMenuVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Surface style={styles.modalSurface}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Status</Text>
              <IconButton
                icon="close"
                onPress={() => setStatusMenuVisible(false)}
              />
            </View>
            <Divider />

            <ScrollView style={styles.statusOptionsContainer}>
              {Object.values(ExtendedFormStatus)
                .filter((status) => status !== FormStatus.DRAFT) // Remove only DRAFT status
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
                            styles.statusText,
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
        contentContainerStyle={styles.scrollContent}
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
                  {
                    color: getStatusTextColor(
                      form.status as ExtendedFormStatusType
                    ),
                    fontSize: 16,
                    fontWeight: "500",
                    textTransform: "capitalize",
                    paddingLeft: 12,
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

        <Surface style={styles.detailsCard}>
          <View style={styles.cardHeader}>
            <View style={styles.simpleCardHeader}>
              <IconButton
                icon="account"
                size={22}
                iconColor={theme.colors.primary}
              />
              <Text style={styles.simpleCardHeaderTitle}>
                Employee Information
              </Text>
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

        {/* Type-specific details */}
        {formType === "accident" && renderAccidentDetails()}
        {formType === "illness" && renderIllnessDetails()}
        {formType === "departure" && renderDepartureDetails()}

        {/* <Surface style={styles.detailsCard}>
          <View style={styles.cardHeader}>
            <View style={styles.simpleCardHeader}>
              <IconButton
                icon="comment-text"
                size={22}
                iconColor={theme.colors.primary}
              />
              <Text style={styles.simpleCardHeaderTitle}>Admin Comments</Text>
            </View>
          </View>

          <View style={styles.cardContent}>
            <TextInput
              mode="outlined"
              value={comments}
              onChangeText={setComments}
              multiline
              numberOfLines={4}
              style={styles.commentsInput}
              placeholder="Add comments about this form..."
              disabled={submitting}
            />
          </View>
        </Surface> */}
      </ScrollView>
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
    padding: 16,
    paddingBottom: 40,
  },
  statusSection: {
    marginBottom: 20,
    paddingHorizontal: 6,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
  },
  statusLabel: {
    fontSize: 16,
    fontWeight: "500",
    marginRight: 8,
    color: "#616161",
  },
  statusBadgeClickable: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  editStatusIcon: {
    margin: 0,
    marginLeft: 4,
  },
  detailsCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "rgba(0,0,0,0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  cardHeader: {
    width: "100%",
  },
  cardHeaderGradient: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  headerIcon: {
    margin: 0,
  },
  cardHeaderTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#FFFFFF",
    marginLeft: 8,
    opacity: 0.95,
  },
  cardContent: {
    padding: 20,
  },
  sectionDivider: {
    marginVertical: 16,
    backgroundColor: "#EEEEEE",
    height: 1,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
    color: "#424242",
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
    color: "#616161",
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 14,
    alignItems: "flex-start",
  },
  detailLabel: {
    fontWeight: "500",
    width: 120,
    color: "#757575",
    fontSize: 13,
  },
  detailValue: {
    flex: 1,
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
    marginTop: 20,
    borderRadius: 12,
  },
  commentsInput: {
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
  },
  statusButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusButton: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
  },
  activeStatusButton: {
    borderWidth: 1,
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
  // Modal styles
  modalContainer: {
    margin: 20,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  modalSurface: {
    backgroundColor: "white",
    borderRadius: 16,
    overflow: "hidden",
    elevation: 1,
    shadowColor: "rgba(0,0,0,0.1)",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#424242",
  },
  statusOptionsContainer: {
    maxHeight: 400,
    padding: 12,
  },
  statusOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    marginVertical: 6,
  },
  statusOptionContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  statusIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  statusTextContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  statusDescription: {
    fontSize: 12,
    color: "#757575",
  },
  simpleCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 5,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  simpleCardHeaderTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#424242",
  },
  detailsSection: {},
});

export default FormDetailsScreen;
