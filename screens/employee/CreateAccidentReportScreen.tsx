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
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const { control, handleSubmit, formState: { errors }, watch, setValue } = useForm<AccidentReportFormData>({
    defaultValues: {
      date_of_accident: new Date(),
      time_of_accident: format(new Date(), 'HH:mm'),
      accident_address: '',
      city: '',
      accident_description: '',
      objects_involved: '',
      injuries: '',
      accident_type: '',
      medical_certificate: '',
    },
  });

  const dateOfAccident = watch('date_of_accident');

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
      setValue('date_of_accident', selectedDate);
    }
  };

  const onSubmit = async (data: AccidentReportFormData) => {
    try {
      if (!user || !companyId) {
        setSnackbarMessage('User or company information not available');
        setSnackbarVisible(true);
        return;
      }
      
      setLoading(true);
      
      // Create accident report
      const { error } = await supabase
        .from('accident_report')
        .insert([
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
            medical_certificate: data.medical_certificate || null,
            status: FormStatus.PENDING,
          },
        ]);
      
      if (error) {
        throw error;
      }
      
      setSnackbarMessage('Accident report submitted successfully');
      setSnackbarVisible(true);
      
      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 2000);
    } catch (error: any) {
      console.error('Error submitting accident report:', error);
      setSnackbarMessage(error.message || 'Failed to submit accident report');
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
      <AppHeader title="Report Accident" showBackButton />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Accident Details
          </Text>
          
          <Text style={styles.inputLabel}>Date of Accident *</Text>
          <Button
            mode="outlined"
            onPress={() => setShowDatePicker(true)}
            style={styles.dateButton}
            icon="calendar"
          >
            {format(dateOfAccident, 'MMMM d, yyyy')}
          </Button>
          
          {showDatePicker && (
            <DateTimePicker
              value={dateOfAccident}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()}
            />
          )}
          
          <Controller
            control={control}
            rules={{ required: 'Time of accident is required' }}
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
            <HelperText type="error">{errors.time_of_accident.message}</HelperText>
          )}
          
          <Controller
            control={control}
            rules={{ required: 'Address is required' }}
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
            <HelperText type="error">{errors.accident_address.message}</HelperText>
          )}
          
          <Controller
            control={control}
            rules={{ required: 'City is required' }}
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
            rules={{ required: 'Accident description is required' }}
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
            <HelperText type="error">{errors.accident_description.message}</HelperText>
          )}
          
          <Controller
            control={control}
            rules={{ required: 'Objects involved is required' }}
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
            <HelperText type="error">{errors.objects_involved.message}</HelperText>
          )}
          
          <Controller
            control={control}
            rules={{ required: 'Injuries is required' }}
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
            rules={{ required: 'Accident type is required' }}
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

export default CreateAccidentReportScreen;