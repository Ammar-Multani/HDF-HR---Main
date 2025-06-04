import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import {
  Text,
  TextInput,
  Button,
  useTheme,
  Snackbar,
  HelperText,
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
import { pickAndUploadDocument } from "../../utils/documentPicker";
import CustomSnackbar from "../../components/CustomSnackbar";

interface AccidentReportFormData {
  date_of_accident: Date;
  time_of_accident: string;
  accident_address: string;
  city: string;
  accident_description: string;
  objects_involved: string;
  injuries: string;
  accident_type: string;
  medical_certificate?: string;
}

const CreateAccidentReportScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [documentName, setDocumentName] = useState<string | null>(null);

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
    setValue("date_of_accident", selectedDate);
  };

  const handleDateCancel = () => {
    setShowDatePicker(false);
  };

  const onSubmit = async (data: AccidentReportFormData) => {
    try {
      if (!user || !companyId) {
        setSnackbarMessage("User or company information not available");
        setSnackbarVisible(true);
        return;
      }

      setLoading(true);

      // Create accident report - make medical_certificate optional
      const { error } = await supabase.from("accident_report").insert([
        {
          employee_id: user.id,
          company_id: companyId,
          date_of_accident: data.date_of_accident.toISOString(),
          time_of_accident: data.time_of_accident,
          accident_address: data.accident_address,
          city: data.city,
          accident_description: data.accident_description,
          objects_involved: data.objects_involved,
          injuries: data.injuries,
          accident_type: data.accident_type,
          // Allow medical_certificate to be null or empty string
          medical_certificate: data.medical_certificate || null,
          status: FormStatus.PENDING,
        },
      ]);

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
    try {
      setUploadingDocument(true);
      const documentUrl = await pickAndUploadDocument(
        "accident-documents",
        `${user?.id}`,
        {
          type: [
            "application/pdf",
            "image/*",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          ],
        }
      );

      if (documentUrl) {
        setValue("medical_certificate", documentUrl);
        // Extract file name from URL
        const fileName = documentUrl.split("/").pop() || "Document uploaded";
        setDocumentName(fileName);
      }
    } catch (error) {
      console.error("Error picking document:", error);
      setSnackbarMessage("Failed to upload document. Please try again.");
      setSnackbarVisible(true);
    } finally {
      setUploadingDocument(false);
    }
  };

  if (!companyId) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader title="Report Accident" showBackButton />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          <Text
            style={[styles.sectionTitle, { color: theme.colors.onBackground }]}
          >
            Accident Details
          </Text>

          <Text style={styles.inputLabel}>Date of Accident *</Text>
          <Button
            mode="outlined"
            onPress={() => setShowDatePicker(true)}
            style={styles.dateButton}
            icon="calendar"
          >
            {format(dateOfAccident, "MMMM d, yyyy")}
          </Button>

          <DateTimePickerModal
            isVisible={showDatePicker}
            mode="date"
            onConfirm={handleDateConfirm}
            onCancel={handleDateCancel}
            date={dateOfAccident}
            maximumDate={new Date()}
          />

          <Controller
            control={control}
            rules={{ required: "Time of accident is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Time of Accident *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.time_of_accident}
                style={styles.input}
                disabled={loading}
              />
            )}
            name="time_of_accident"
          />
          {errors.time_of_accident && (
            <HelperText type="error">
              {errors.time_of_accident.message}
            </HelperText>
          )}

          <Controller
            control={control}
            rules={{ required: "Address is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Accident Address *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.accident_address}
                style={styles.input}
                disabled={loading}
              />
            )}
            name="accident_address"
          />
          {errors.accident_address && (
            <HelperText type="error">
              {errors.accident_address.message}
            </HelperText>
          )}

          <Controller
            control={control}
            rules={{ required: "City is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="City *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.city}
                style={styles.input}
                disabled={loading}
              />
            )}
            name="city"
          />
          {errors.city && (
            <HelperText type="error">{errors.city.message}</HelperText>
          )}

          <Controller
            control={control}
            rules={{ required: "Accident description is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Accident Description *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.accident_description}
                style={styles.input}
                multiline
                numberOfLines={4}
                disabled={loading}
              />
            )}
            name="accident_description"
          />
          {errors.accident_description && (
            <HelperText type="error">
              {errors.accident_description.message}
            </HelperText>
          )}

          <Controller
            control={control}
            rules={{ required: "Objects involved is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Objects Involved *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.objects_involved}
                style={styles.input}
                disabled={loading}
              />
            )}
            name="objects_involved"
          />
          {errors.objects_involved && (
            <HelperText type="error">
              {errors.objects_involved.message}
            </HelperText>
          )}

          <Controller
            control={control}
            rules={{ required: "Injuries is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Injuries *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.injuries}
                style={styles.input}
                multiline
                numberOfLines={2}
                disabled={loading}
              />
            )}
            name="injuries"
          />
          {errors.injuries && (
            <HelperText type="error">{errors.injuries.message}</HelperText>
          )}

          <Controller
            control={control}
            rules={{ required: "Accident type is required" }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Accident Type *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.accident_type}
                style={styles.input}
                disabled={loading}
              />
            )}
            name="accident_type"
          />
          {errors.accident_type && (
            <HelperText type="error">{errors.accident_type.message}</HelperText>
          )}

          <Text style={styles.inputLabel}>Medical Certificate</Text>
          <View style={styles.documentPickerContainer}>
            <Button
              mode="outlined"
              onPress={handlePickDocument}
              style={styles.documentButton}
              icon="file-upload"
              loading={uploadingDocument}
              disabled={loading || uploadingDocument}
            >
              {documentName || "Upload Medical Certificate"}
            </Button>
          </View>

          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            style={styles.submitButton}
            loading={loading}
            disabled={loading}
          >
            Submit Report
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>

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
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 8,
    marginBottom: 16,
  },
  input: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    opacity: 0.7,
  },
  dateButton: {
    marginBottom: 16,
  },
  submitButton: {
    marginTop: 24,
    paddingVertical: 6,
  },
  documentPickerContainer: {
    marginBottom: 16,
  },
  documentButton: {
    marginTop: 8,
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

export default CreateAccidentReportScreen;
