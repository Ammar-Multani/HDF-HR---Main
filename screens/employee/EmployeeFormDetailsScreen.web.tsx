import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  RefreshControl,
  Linking,
  Platform,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import {
  Text,
  Card,
  Button,
  Divider,
  useTheme,
  IconButton,
  Surface,
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
import Animated, { FadeIn } from "react-native-reanimated";
import CustomSnackbar from "../../components/CustomSnackbar";
import { t } from "i18next";

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

type FormDetailsRouteParams = {
  formId: string;
  formType: "accident" | "illness" | "departure";
};

const EmployeeFormDetailsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
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
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  const fetchFormDetails = async () => {
    try {
      setLoading(true);

      let formData;

      // Fetch form details based on type
      if (formType === "accident") {
        const { data, error } = await supabase
          .from("accident_report")
          .select("*")
          .eq("id", formId)
          .single();

        if (error) {
          console.error("Error fetching accident report:", error);
          return;
        }

        formData = data;
        console.log("Fetched accident report:", formData);
        console.log(
          "Medical certificate field value:",
          formData.medical_certificate
        );

        // Get document details if medical certificate exists
        if (formData.medical_certificate) {
          console.log(
            "Medical certificate exists, fetching document details..."
          );

          // First try to find by reference_id and type
          const { data: docData, error: documentError } = await supabase
            .from("employee_documents")
            .select("*")
            .eq("reference_type", "accident_report")
            .eq("reference_id", formId)
            .eq("document_type", "MEDICAL_CERTIFICATE");

          console.log("Document query result:", { docData, documentError });

          if (documentError) {
            console.error("Error fetching document details:", documentError);
          } else if (docData && docData.length > 0) {
            const doc = docData[0];
            console.log("Found document with URL:", doc.file_url);
            formData.document_url = doc.file_url;
          } else {
            // If not found by reference, try to find by file_path
            console.log(
              "Trying to find document by file path:",
              formData.medical_certificate
            );
            const { data: pathDocData, error: pathError } = await supabase
              .from("employee_documents")
              .select("*")
              .eq("file_path", formData.medical_certificate);

            if (pathError) {
              console.error("Error fetching document by path:", pathError);
            } else if (pathDocData && pathDocData.length > 0) {
              const doc = pathDocData[0];
              console.log("Found document by path with URL:", doc.file_url);
              formData.document_url = doc.file_url;
            }
          }
        }
      } else if (formType === "illness") {
        const { data, error } = await supabase
          .from("illness_report")
          .select("*")
          .eq("id", formId)
          .single();

        if (error) {
          console.error("Error fetching illness report:", error);
          return;
        }

        formData = data;
        console.log("Fetched illness report:", formData);
        console.log(
          "Medical certificate field value:",
          formData.medical_certificate
        );

        // Get document details if medical certificate exists
        if (formData.medical_certificate) {
          console.log(
            "Medical certificate exists, fetching document details..."
          );

          // First try to find by reference_id and type
          const { data: docData, error: documentError } = await supabase
            .from("employee_documents")
            .select("*")
            .eq("reference_type", "illness_report")
            .eq("reference_id", formId)
            .eq("document_type", "MEDICAL_CERTIFICATE");

          console.log("Document query result:", { docData, documentError });

          if (documentError) {
            console.error("Error fetching document details:", documentError);
          } else if (docData && docData.length > 0) {
            const doc = docData[0];
            console.log("Found document with URL:", doc.file_url);
            formData.document_url = doc.file_url;
          } else {
            // If not found by reference, try to find by file_path
            console.log(
              "Trying to find document by file path:",
              formData.medical_certificate
            );
            const { data: pathDocData, error: pathError } = await supabase
              .from("employee_documents")
              .select("*")
              .eq("file_path", formData.medical_certificate);

            if (pathError) {
              console.error("Error fetching document by path:", pathError);
            } else if (pathDocData && pathDocData.length > 0) {
              const doc = pathDocData[0];
              console.log("Found document by path with URL:", doc.file_url);
              formData.document_url = doc.file_url;
            }
          }
        }
      } else if (formType === "departure") {
        const { data, error } = await supabase
          .from("staff_departure_report")
          .select("*")
          .eq("id", formId)
          .single();

        if (error) {
          console.error("Error fetching staff departure report:", error);
          return;
        }

        formData = data;
      }

      setForm(formData);
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

  const handleViewDocument = (documentUrl: string) => {
    if (documentUrl) {
      Linking.openURL(documentUrl);
    } else {
      alert("Document URL is not available");
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

  const handleCopyLink = async () => {
    if (form?.document_url) {
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
                  console.log("Opening document URL:", form.document_url);
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
                textColor="#F44336"
                disabled={!form.document_url}
              >
                Open Document
              </Button>
              <Button
                mode="outlined"
                onPress={handleCopyLink}
                style={styles.documentButton}
                icon="share-variant"
                textColor="#F44336"
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
                  icon="medical-bag"
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
                  console.log("Opening document URL:", form.document_url);
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
                  icon="account-arrow-right"
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
              <Surface key={index} style={styles.documentChip}>
                <IconButton icon="file-document-outline" size={18} />
                <Text style={styles.documentName}>
                  {doc
                    .split("_")
                    .map(
                      (word: string) =>
                        word.charAt(0).toUpperCase() + word.slice(1)
                    )
                    .join(" ")}
                </Text>
              </Surface>
            ))}
          </View>
        </View>
      </Surface>
    );
  };

  if (loading && !refreshing) {
    return <LoadingIndicator />;
  }

  if (!form) {
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
        showBackButton={true}
        showHelpButton={false}
        showProfileMenu={false}
        showLogo={false}
        showTitle={true}
      />

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
            <Text style={styles.statusLabel}>Status:</Text>
            <StatusBadge status={form.status} />
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
                          icon="calendar"
                          size={20}
                          iconColor="#64748b"
                          style={styles.headerIcon}
                        />
                      </View>
                      <Text style={styles.cardTitle}>Form Information</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardContent}>
                  <View style={styles.detailsSection}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Form Type:</Text>
                      <Text style={styles.detailValue}>{getFormTitle()}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Submission Date:</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(form.created_at || form.submission_date)}
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

        {/* {form.comments && (
          <Animated.View entering={FadeIn.delay(300)} style={styles.gridColumn}>
            <Surface style={styles.detailsCard}>
              <View style={styles.cardHeader}>
                <View style={styles.simpleCardHeader}>
                  <View style={styles.headerLeft}>
                    <View style={styles.iconContainer}>
                      <IconButton
                        icon="comment"
                        size={20}
                        iconColor="#64748b"
                        style={styles.headerIcon}
                      />
                    </View>
                    <Text style={styles.cardTitle}>Admin Comments</Text>
                  </View>
                </View>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.description}>{form.comments}</Text>
              </View>
            </Surface>
          </Animated.View>
        )} */}
      </ScrollView>

      <CustomSnackbar
        visible={snackbarVisible}
        message={snackbarMessage}
        onDismiss={() => setSnackbarVisible(false)}
        type={snackbarMessage?.includes("copied") ? "success" : "error"}
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
  statusBadge: {
    borderRadius: 20,
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
    gap: 8,
  },
  documentChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    borderRadius: 8,
    padding: 4,
    paddingRight: 12,
  },
  documentName: {
    fontSize: 13,
    color: "#1976D2",
    fontFamily: "Poppins-Medium",
  },
  documentButton: {
    marginTop: 20,
    borderRadius: 12,
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
  simpleCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 5,
    backgroundColor: "#FFFFFF",
  },
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

export default EmployeeFormDetailsScreen;
