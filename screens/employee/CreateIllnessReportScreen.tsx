import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme, Snackbar, HelperText } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import AppHeader from '../../components/AppHeader';
import LoadingIndicator from '../../components/LoadingIndicator';
import { FormStatus } from '../../types';

interface IllnessReportFormData {
  date_of_onset_leave: Date;
  leave_description: string;
  medical_certificate?: string;
}

const CreateIllnessReportScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const { control, handleSubmit, formState: { errors }, watch, setValue } = useForm<IllnessReportFormData>({
    defaultValues: {
      date_of_onset_leave: new Date(),
      leave_description: '',
      medical_certificate: '',
    },
  });

  const dateOfOnsetLeave = watch('date_of_onset_leave');

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
      setValue('date_of_onset_leave', selectedDate);
    }
  };

  const onSubmit = async (data: IllnessReportFormData) => {
    try {
      if (!user || !companyId) {
        setSnackbarMessage('User or company information not available');
        setSnackbarVisible(true);
        return;
      }
      
      setLoading(true);
      
      // Create illness report
      const { error } = await supabase
        .from('illness_report')
        .insert([
          {
            employee_id: user.id,
            company_id: companyId,
            date_of_onset_leave: data.date_of_onset_leave.toISOString(),
            leave_description: data.leave_description,
            medical_certificate: data.medical_certificate || null,
            status: FormStatus.PENDING,
            submission_date: new Date().toISOString(),
          },
        ]);
      
      if (error) {
        throw error;
      }
      
      setSnackbarMessage('Illness report submitted successfully');
      setSnackbarVisible(true);
      
      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (error: any) {
      console.error('Error submitting illness report:', error);
      setSnackbarMessage(error.message || 'Failed to submit illness report');
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
      <AppHeader title="Report Illness" showBackButton />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Illness Details
          </Text>
          
          <Text style={styles.inputLabel}>Date of Onset/Leave *</Text>
          <Button
            mode="outlined"
            onPress={() => setShowDatePicker(true)}
            style={styles.dateButton}
            icon="calendar"
          >
            {format(dateOfOnsetLeave, 'MMMM d, yyyy')}
          </Button>
          
          {showDatePicker && (
            <DateTimePicker
              value={dateOfOnsetLeave}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}
          
          <Controller
            control={control}
            rules={{ required: 'Leave description is required' }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Leave Description *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.leave_description}
                style={styles.input}
                multiline
                numberOfLines={4}
                disabled={loading}
              />
            )}
            name="leave_description"
          />
          {errors.leave_description && (
            <HelperText type="error">{errors.leave_description.message}</HelperText>
          )}
          
          <Controller
            control={control}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Medical Certificate URL (if available)"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                style={styles.input}
                disabled={loading}
              />
            )}
            name="medical_certificate"
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
});

export default CreateIllnessReportScreen;
