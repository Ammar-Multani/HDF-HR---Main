import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme, Snackbar, HelperText, Checkbox } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import AppHeader from '../../components/AppHeader';
import LoadingIndicator from '../../components/LoadingIndicator';
import { FormStatus, DocumentType } from '../../types';

interface StaffDepartureFormData {
  exit_date: Date;
  comments: string;
}

const CreateStaffDepartureScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState<DocumentType[]>([]);

  const { control, handleSubmit, formState: { errors }, watch, setValue } = useForm<StaffDepartureFormData>({
    defaultValues: {
      exit_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 2 weeks from now
      comments: '',
    },
  });

  const exitDate = watch('exit_date');

  const fetchCompanyId = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('company_user')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching company ID:', error);
        return;
      }
      
      setCompanyId(data.company_id);
    } catch (error) {
      console.error('Error fetching company ID:', error);
    }
  };

  useEffect(() => {
    fetchCompanyId();
  }, [user]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setValue('exit_date', selectedDate);
    }
  };

  const toggleDocument = (document: DocumentType) => {
    if (selectedDocuments.includes(document)) {
      setSelectedDocuments(selectedDocuments.filter(doc => doc !== document));
    } else {
      setSelectedDocuments([...selectedDocuments, document]);
    }
  };

  const onSubmit = async (data: StaffDepartureFormData) => {
    try {
      if (!user || !companyId) {
        setSnackbarMessage('User or company information not available');
        setSnackbarVisible(true);
        return;
      }
      
      if (selectedDocuments.length === 0) {
        setSnackbarMessage('Please select at least one required document');
        setSnackbarVisible(true);
        return;
      }
      
      setLoading(true);
      
      // Create staff departure report
      const { error } = await supabase
        .from('staff_departure_report')
        .insert([
          {
            employee_id: user.id,
            company_id: companyId,
            exit_date: data.exit_date.toISOString(),
            comments: data.comments,
            documents_required: selectedDocuments,
            status: FormStatus.PENDING,
          },
        ]);
      
      if (error) {
        throw error;
      }
      
      setSnackbarMessage('Staff departure report submitted successfully');
      setSnackbarVisible(true);
      
      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (error: any) {
      console.error('Error submitting staff departure report:', error);
      setSnackbarMessage(error.message || 'Failed to submit staff departure report');
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  if (!companyId) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Staff Departure" showBackButton />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Departure Details
          </Text>
          
          <Text style={styles.inputLabel}>Exit Date *</Text>
          <Button
            mode="outlined"
            onPress={() => setShowDatePicker(true)}
            style={styles.dateButton}
            icon="calendar"
          >
            {format(exitDate, 'MMMM d, yyyy')}
          </Button>
          
          {showDatePicker && (
            <DateTimePicker
              value={exitDate}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
          
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Required Documents
          </Text>
          
          <Text style={styles.helperText}>
            Select the documents you need to submit for your departure:
          </Text>
          
          <View style={styles.documentsContainer}>
            <View style={styles.documentItem}>
              <Checkbox
                status={selectedDocuments.includes(DocumentType.RESIGNATION_LETTER) ? 'checked' : 'unchecked'}
                onPress={() => toggleDocument(DocumentType.RESIGNATION_LETTER)}
              />
              <Text style={styles.documentLabel}>Resignation Letter</Text>
            </View>
            
            <View style={styles.documentItem}>
              <Checkbox
                status={selectedDocuments.includes(DocumentType.EXIT_INTERVIEW) ? 'checked' : 'unchecked'}
                onPress={() => toggleDocument(DocumentType.EXIT_INTERVIEW)}
              />
              <Text style={styles.documentLabel}>Exit Interview</Text>
            </View>
            
            <View style={styles.documentItem}>
              <Checkbox
                status={selectedDocuments.includes(DocumentType.EQUIPMENT_RETURN) ? 'checked' : 'unchecked'}
                onPress={() => toggleDocument(DocumentType.EQUIPMENT_RETURN)}
              />
              <Text style={styles.documentLabel}>Equipment Return Form</Text>
            </View>
            
            <View style={styles.documentItem}>
              <Checkbox
                status={selectedDocuments.includes(DocumentType.FINAL_SETTLEMENT) ? 'checked' : 'unchecked'}
                onPress={() => toggleDocument(DocumentType.FINAL_SETTLEMENT)}
              />
              <Text style={styles.documentLabel}>Final Settlement Form</Text>
            </View>
            
            <View style={styles.documentItem}>
              <Checkbox
                status={selectedDocuments.includes(DocumentType.NON_DISCLOSURE) ? 'checked' : 'unchecked'}
                onPress={() => toggleDocument(DocumentType.NON_DISCLOSURE)}
              />
              <Text style={styles.documentLabel}>Non-Disclosure Agreement</Text>
            </View>
            
            <View style={styles.documentItem}>
              <Checkbox
                status={selectedDocuments.includes(DocumentType.NON_COMPETE) ? 'checked' : 'unchecked'}
                onPress={() => toggleDocument(DocumentType.NON_COMPETE)}
              />
              <Text style={styles.documentLabel}>Non-Compete Agreement</Text>
            </View>
          </View>
          
          <Controller
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Additional Comments"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                style={styles.input}
                multiline
                numberOfLines={4}
                disabled={loading}
              />
            )}
            name="comments"
          />
          
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
      
      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: 'OK',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
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
    fontWeight: 'bold',
    marginTop: 16,
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
  helperText: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 12,
  },
  documentsContainer: {
    marginBottom: 16,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  documentLabel: {
    fontSize: 16,
    marginLeft: 8,
  },
  submitButton: {
    marginTop: 24,
    paddingVertical: 6,
  },
});

export default CreateStaffDepartureScreen;