import React, { useState, useEffect } from "react";
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
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";
import { useAuth } from "../../contexts/AuthContext";
import Animated, { FadeIn } from "react-native-reanimated";

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

const SuperAdminFormDetailsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { t } = useTranslation();
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
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<FormStatus | null>(null);

  const fetchFormDetails = async () => {
    try {
      setLoading(true);

      let formData;
      let employeeData;
      let companyData;

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

        // Fetch company details if employee exists
        if (employeeData && employeeData.company_id) {
          const { data: company, error: companyError } = await supabase
            .from("company")
            .select("*")
            .eq("id", employeeData.company_id)
            .single();

          if (!companyError) {
            companyData = company;
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

        // Fetch company details if employee exists
        if (employeeData && employeeData.company_id) {
          const { data: company, error: companyError } = await supabase
            .from("company")
            .select("*")
            .eq("id", employeeData.company_id)
            .single();

          if (!companyError) {
            companyData = company;
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

        // Fetch company details if employee exists
        if (employeeData && employeeData.company_id) {
          const { data: company, error: companyError } = await supabase
            .from("company")
            .select("*")
            .eq("id", employeeData.company_id)
            .single();

          if (!companyError) {
            companyData = company;
          }
        }
      }

      setForm(formData);
      setEmployee(employeeData);
      setCompanyInfo(companyData);
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
        return t("superAdmin.forms.accidentReport") || "Accident Report";
      case "illness":
        return t("superAdmin.forms.illnessReport") || "Illness Report";
      case "departure":
        return (
          t("superAdmin.forms.departureReport") || "Staff Departure Report"
        );
      default:
        return t("superAdmin.forms.formDetails") || "Form Details";
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
            <Text style={styles.detailLabel}>
              {t("superAdmin.forms.accidentDate")}:
            </Text>
            <Text style={styles.detailValue}>
              {formatDate(form.date_of_accident)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {t("superAdmin.forms.accidentTime")}:
            </Text>
            <Text style={styles.detailValue}>
              {formatTime(form.time_of_accident)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {t("superAdmin.forms.location")}:
            </Text>
            <Text style={styles.detailValue}>
              {form.accident_address}, {form.city}
            </Text>
          </View>

          <Divider style={styles.sectionDivider} />

          <Text style={styles.sectionSubtitle}>
            {t("superAdmin.forms.accidentDescription")}
          </Text>
          <Text style={styles.description}>{form.accident_description}</Text>

          <Text style={styles.sectionSubtitle}>
            {t("superAdmin.forms.objectsInvolved")}
          </Text>
          <Text style={styles.description}>{form.objects_involved}</Text>

          <Text style={styles.sectionSubtitle}>
            {t("superAdmin.forms.injuries")}
          </Text>
          <Text style={styles.description}>{form.injuries}</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>
              {t("superAdmin.forms.accidentType")}:
            </Text>
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
              {t("superAdmin.forms.viewMedicalCertificate")}
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
            <Text style={styles.detailLabel}>
              {t("superAdmin.forms.leaveStart")}:
            </Text>
            <Text style={styles.detailValue}>
              {formatDate(form.date_of_onset_leave)}
            </Text>
          </View>

          <Divider style={styles.sectionDivider} />

          <Text style={styles.sectionSubtitle}>
            {t("superAdmin.forms.leaveDescription")}
          </Text>
          <Text style={styles.description}>{form.leave_description}</Text>

          {form.medical_certificate && (
            <Button
              mode="outlined"
              onPress={() => handleViewDocument(form.medical_certificate)}
              style={styles.documentButton}
              icon="file-document"
              textColor="#FF9800"
            >
              {t("superAdmin.forms.viewMedicalCertificate")}
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
            <Text style={styles.detailLabel}>
              {t("superAdmin.forms.exitDate")}:
            </Text>
            <Text style={styles.detailValue}>{formatDate(form.exit_date)}</Text>
          </View>

          <Divider style={styles.sectionDivider} />

          <Text style={styles.sectionSubtitle}>
            {t("superAdmin.forms.requiredDocuments")}
          </Text>

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
        <AppHeader
          title={getFormTitle()}
          showBackButton
          showHelpButton={true}
          absolute={false}
        />
        <View style={styles.errorContainer}>
          <Text style={{ color: theme.colors.error }}>
            {t("superAdmin.forms.formNotFound")}
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={styles.button}
            buttonColor={getFormTypeColor()}
          >
            {t("superAdmin.forms.goBack")}
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
        showProfileMenu={false}
        showLogo={false}
        showTitle={true}
        absolute={false}
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
        {/* <View style={styles.headerSection}>
          <Text style={styles.pageTitle}>{getFormTitle()}</Text>
        </View> */}

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
                          icon="account-group"
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
                    <Text style={styles.sectionSubtitle}>Employee Details</Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>
                        {t("superAdmin.forms.name")}:
                      </Text>
                      <Text style={styles.detailValue}>
                        {employee.first_name} {employee.last_name}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>
                        {t("superAdmin.forms.email")}:
                      </Text>
                      <Text style={styles.detailValue}>{employee.email}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>
                        {t("superAdmin.forms.jobTitle")}:
                      </Text>
                      <Text style={styles.detailValue}>
                        {employee.job_title || "N/A"}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>
                        {t("superAdmin.forms.submissionDate")}:
                      </Text>
                      <Text style={styles.detailValue}>
                        {formatDate(form.submission_date || form.created_at)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>
                        {t("superAdmin.forms.company")}:
                      </Text>
                      <Text style={styles.detailValue}>
                        {companyInfo.company_name}
                      </Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>
                        {t("superAdmin.forms.companyPhone")}:
                      </Text>
                      <Text style={styles.detailValue}>
                        {companyInfo.contact_number || "N/A"}
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
    marginBottom: 24,
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
});

export default SuperAdminFormDetailsScreen;
