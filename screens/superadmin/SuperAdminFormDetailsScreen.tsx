import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Alert,
  Linking,
} from "react-native";
import {
  Card,
  Button,
  Divider,
  useTheme,
  TextInput,
  Chip,
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

type FormDetailsRouteParams = {
  formId: string;
  formType: "accident" | "illness" | "departure";
};

const SuperAdminFormDetailsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const route =
    useRoute<RouteProp<Record<string, FormDetailsRouteParams>, string>>();
  const { formId, formType } = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [companyInfo, setCompanyInfo] = useState<any>(null);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    if (!form) return;

    try {
      setSubmitting(true);

      let table;
      if (formType === "accident") {
        table = "accident_report";
      } else if (formType === "illness") {
        table = "illness_report";
      } else if (formType === "departure") {
        table = "staff_departure_report";
      }

      const { error } = await supabase
        .from(table)
        .update({
          status: newStatus,
          comments: comments.trim() || null,
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
      });

      Alert.alert(
        "Success",
        `Form status updated to ${newStatus.replace("_", " ")}`
      );
    } catch (error: any) {
      console.error("Error updating form status:", error);
      Alert.alert("Error", error.message || "Failed to update form status");
    } finally {
      setSubmitting(false);
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
      <>
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
          >
            {t("superAdmin.forms.viewMedicalCertificate")}
          </Button>
        )}
      </>
    );
  };

  const renderIllnessDetails = () => {
    if (!form) return null;

    return (
      <>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            {t("superAdmin.forms.leaveStart")}:
          </Text>
          <Text style={styles.detailValue}>
            {formatDate(form.date_of_onset_leave)}
          </Text>
        </View>

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
          >
            {t("superAdmin.forms.viewMedicalCertificate")}
          </Button>
        )}
      </>
    );
  };

  const renderDepartureDetails = () => {
    if (!form) return null;

    return (
      <>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>
            {t("superAdmin.forms.exitDate")}:
          </Text>
          <Text style={styles.detailValue}>{formatDate(form.exit_date)}</Text>
        </View>

        <Text style={styles.sectionSubtitle}>
          {t("superAdmin.forms.requiredDocuments")}
        </Text>
        <View style={styles.documentsContainer}>
          {form.documents_required.map((doc: DocumentType, index: number) => (
            <View key={index} style={styles.documentItem}>
              <Text style={styles.documentName}>
                {doc
                  .split("_")
                  .map(
                    (word: string) =>
                      word.charAt(0).toUpperCase() + word.slice(1)
                  )
                  .join(" ")}
              </Text>
            </View>
          ))}
        </View>
      </>
    );
  };

  if (loading && !refreshing) {
    return <LoadingIndicator />;
  }

  if (!form || !employee) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <AppHeader title={getFormTitle()} showBackButton />
        <View style={styles.errorContainer}>
          <Text style={{ color: theme.colors.error }}>
            {t("superAdmin.forms.formNotFound")}
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={styles.button}
          >
            {t("superAdmin.forms.goBack")}
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader
        title={getFormTitle()}
        showBackButton={true}
        showHelpButton={false}
        showProfileMenu={false}
        showLogo={false}
        showTitle={true}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.headerRow}>
              <Text style={styles.formTitle}>{getFormTitle()}</Text>
              <StatusBadge status={form.status} />
            </View>

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>
              {t("superAdmin.forms.companyInformation")}
            </Text>

            {companyInfo && (
              <>
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
                    {t("superAdmin.forms.companyEmail")}:
                  </Text>
                  <Text style={styles.detailValue}>
                    {companyInfo.contact_email || "N/A"}
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
              </>
            )}

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>
              {t("superAdmin.forms.employeeInformation")}
            </Text>

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

            <Divider style={styles.divider} />

            <Text style={styles.sectionTitle}>
              {t("superAdmin.forms.formDetails")}
            </Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>
                {t("superAdmin.forms.submissionDate")}:
              </Text>
              <Text style={styles.detailValue}>
                {formatDate(form.submission_date || form.created_at)}
              </Text>
            </View>

            {/* Type-specific details */}
            {formType === "accident" && renderAccidentDetails()}
            {formType === "illness" && renderIllnessDetails()}
            {formType === "departure" && renderDepartureDetails()}
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={styles.sectionTitle}>
              {t("superAdmin.forms.comments")}
            </Text>

            <TextInput
              label={t("superAdmin.forms.adminComments")}
              value={comments}
              onChangeText={setComments}
              mode="outlined"
              multiline
              numberOfLines={4}
              style={styles.commentsInput}
              disabled={submitting}
            />
          </Card.Content>
        </Card>

        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={styles.sectionTitle}>
              {t("superAdmin.forms.updateStatus")}
            </Text>

            <View style={styles.statusButtonsContainer}>
              <Button
                mode="outlined"
                onPress={() => handleUpdateStatus(FormStatus.IN_PROGRESS)}
                style={[
                  styles.statusButton,
                  form.status === FormStatus.IN_PROGRESS &&
                    styles.activeStatusButton,
                ]}
                textColor={
                  form.status === FormStatus.IN_PROGRESS
                    ? theme.colors.primary
                    : undefined
                }
                loading={submitting}
                disabled={submitting}
              >
                {t("superAdmin.forms.inProgress")}
              </Button>

              <Button
                mode="outlined"
                onPress={() => handleUpdateStatus(FormStatus.APPROVED)}
                style={[
                  styles.statusButton,
                  form.status === FormStatus.APPROVED &&
                    styles.activeStatusButton,
                ]}
                textColor={
                  form.status === FormStatus.APPROVED
                    ? theme.colors.primary
                    : undefined
                }
                loading={submitting}
                disabled={submitting}
              >
                {t("superAdmin.forms.approve")}
              </Button>

              <Button
                mode="outlined"
                onPress={() => handleUpdateStatus(FormStatus.DECLINED)}
                style={[
                  styles.statusButton,
                  form.status === FormStatus.DECLINED &&
                    styles.activeStatusButton,
                ]}
                textColor={
                  form.status === FormStatus.DECLINED
                    ? theme.colors.primary
                    : undefined
                }
                loading={submitting}
                disabled={submitting}
              >
                {t("superAdmin.forms.decline")}
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    marginBottom: 16,
    elevation: 0,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 22,
    fontFamily: "Poppins-Bold",
    flex: 1,
    marginRight: 8,
    color: "#333",
  },
  divider: {
    marginVertical: 16,
    backgroundColor: "#e0e0e0",
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    marginBottom: 12,
    color: "#1a73e8",
  },
  sectionSubtitle: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    marginTop: 16,
    marginBottom: 8,
    color: "#333",
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
    fontFamily: "Poppins-Regular",
    color: "#555",
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: 8,
    alignItems: "flex-start",
  },
  detailLabel: {
    fontFamily: "Poppins-Medium",
    width: 120,
    opacity: 0.7,
    color: "#333",
  },
  detailValue: {
    flex: 1,
    fontFamily: "Poppins-Regular",
    color: "#555",
  },
  documentsContainer: {
    marginBottom: 16,
  },
  documentItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  documentName: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    color: "#333",
  },
  documentButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  commentsInput: {
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  statusButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statusButton: {
    flex: 1,
    marginHorizontal: 4,
  },
  activeStatusButton: {
    borderWidth: 2,
    borderColor: "#1a73e8",
  },
  button: {
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
});

export default SuperAdminFormDetailsScreen;
