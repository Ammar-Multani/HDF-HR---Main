
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Text, TextInput, Button, useTheme, Chip, SegmentedButtons, Snackbar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import AppHeader from '../../components/AppHeader';
import LoadingIndicator from '../../components/LoadingIndicator';
import { TaskPriority, UserRole } from '../../types';

interface TaskFormData {
  title: string;
  description: string;
  deadline: Date;
  priority: TaskPriority;
  reminder_days: string;
}

const CompanyAdminCreateTaskScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedFollowers, setSelectedFollowers] = useState<string[]>([]);

  const { control, handleSubmit, formState: { errors }, watch, setValue } = useForm<TaskFormData>({
    defaultValues: {
      title: '',
      description: '',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 1 week from now
      priority: TaskPriority.MEDIUM,
      reminder_days: '1',
    },
  });

  const deadline = watch('deadline');

  const fetchCompanyId = async () => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('company_user')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      if (error) {
        console.error('Error fetching company ID:', error);
        return null;
      }
      
      return data?.company_id || null;
    } catch (error) {
      console.error('Error fetching company ID:', error);
      return null;
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      
      // Get company ID if not already set
      const currentCompanyId = companyId || await fetchCompanyId();
      if (!currentCompanyId) {
        console.error('No company ID found');
        setLoadingUsers(false);
        return;
      }
      
      setCompanyId(currentCompanyId);
      
      // Fetch company employees
      const { data: employeesData, error: employeesError } = await supabase
        .from('company_user')
        .select('id, first_name, last_name, email, role')
        .eq('company_id', currentCompanyId)
        .eq('active_status', 'active');
      
      if (employeesError) {
        console.error('Error fetching employees:', employeesError);
        return;
      }
      
      // Format users
      const formattedUsers = (employeesData || []).map(user => ({
        id: user.id,
        name: user.first_name && user.last_name 
          ? `${user.first_name} ${user.last_name}` 
          : user.email,
        email: user.email,
        role: user.role,
      }));
      
      setAvailableUsers(formattedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [user]);

  const toggleAssignee = (userId: string) => {
    if (selectedAssignees.includes(userId)) {
      setSelectedAssignees(selectedAssignees.filter(id => id !== userId));
    } else {
      setSelectedAssignees([...selectedAssignees, userId]);
    }
  };

  const toggleFollower = (userId: string) => {
    if (selectedFollowers.includes(userId)) {
      setSelectedFollowers(selectedFollowers.filter(id => id !== userId));
    } else {
      setSelectedFollowers([...selectedFollowers, userId]);
    }
  };

  const onSubmit = async (data: TaskFormData) => {
    try {
      if (!user || !companyId) {
        setSnackbarMessage('User or company information not available');
        setSnackbarVisible(true);
        return;
      }
      
      if (selectedAssignees.length === 0) {
        setSnackbarMessage('Please assign the task to at least one user');
        setSnackbarVisible(true);
        return;
      }
      
      setLoading(true);
      
      const reminderDays = parseInt(data.reminder_days);
      if (isNaN(reminderDays) || reminderDays < 0) {
        setSnackbarMessage('Please enter a valid reminder days value');
        setSnackbarVisible(true);
        setLoading(false);
        return;
      }
      
      // Create task
      const { data: taskData, error } = await supabase
        .from('task')
        .insert([
          {
            title: data.title,
            description: data.description,
            deadline: data.deadline.toISOString(),
            priority: data.priority,
            status: 'open',
            assigned_users: selectedAssignees,
            followers: selectedFollowers,
            created_by: user.id,
            company_id: companyId,
            reminder_days: reminderDays,
          },
        ])
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      setSnackbarMessage('Task created successfully');
      setSnackbarVisible(true);
      
      // Navigate back after a short delay
      setTimeout(() => {
        navigation.goBack();
      }, 1500);
    } catch (error: any) {
      console.error('Error creating task:', error);
      setSnackbarMessage(error.message || 'Failed to create task');
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setValue('deadline', selectedDate);
    }
  };

  if (loadingUsers) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Create Task" showBackButton />
      
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingView}
      >
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Task Details
          </Text>
          
          <Controller
            control={control}
            rules={{ required: 'Title is required' }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Title *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.title}
                style={styles.input}
                disabled={loading}
              />
            )}
            name="title"
          />
          {errors.title && (
            <Text style={styles.errorText}>{errors.title.message}</Text>
          )}
          
          <Controller
            control={control}
            rules={{ required: 'Description is required' }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Description *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.description}
                style={styles.input}
                multiline
                numberOfLines={4}
                disabled={loading}
              />
            )}
            name="description"
          />
          {errors.description && (
            <Text style={styles.errorText}>{errors.description.message}</Text>
          )}
          
          <Text style={styles.inputLabel}>Deadline *</Text>
          <Button
            mode="outlined"
            onPress={() => setShowDatePicker(true)}
            style={styles.dateButton}
            icon="calendar"
          >
            {format(deadline, 'MMMM d, yyyy')}
          </Button>
          
          {showDatePicker && (
            <DateTimePicker
              value={deadline}
              mode="date"
              display="default"
              onChange={handleDateChange}
              minimumDate={new Date()}
            />
          )}
          
          <Text style={styles.inputLabel}>Priority *</Text>
          <Controller
            control={control}
            render={({ field: { onChange, value } }) => (
              <SegmentedButtons
                value={value}
                onValueChange={onChange}
                buttons={[
                  { value: TaskPriority.LOW, label: 'Low' },
                  { value: TaskPriority.MEDIUM, label: 'Medium' },
                  { value: TaskPriority.HIGH, label: 'High' },
                ]}
                style={styles.segmentedButtons}
              />
            )}
            name="priority"
          />
          
          <Controller
            control={control}
            rules={{ 
              required: 'Reminder days is required',
              validate: value => 
                !isNaN(parseInt(value)) && parseInt(value) >= 0 
                  ? true 
                  : 'Please enter a valid number of days'
            }}
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                label="Reminder (days before deadline) *"
                mode="outlined"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={!!errors.reminder_days}
                style={styles.input}
                keyboardType="numeric"
                disabled={loading}
              />
            )}
            name="reminder_days"
          />
          {errors.reminder_days && (
            <Text style={styles.errorText}>{errors.reminder_days.message}</Text>
          )}
          
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Assign Users
          </Text>
          
          <Text style={styles.helperText}>
            Select users to assign this task to (required)
          </Text>
          
          <View style={styles.usersContainer}>
            {availableUsers.map((user) => (
              <Chip
                key={`assignee-${user.id}`}
                selected={selectedAssignees.includes(user.id)}
                onPress={() => toggleAssignee(user.id)}
                style={styles.userChip}
                showSelectedCheck
                mode="outlined"
              >
                {user.name} ({user.role === UserRole.COMPANY_ADMIN ? 'Admin' : 'Employee'})
              </Chip>
            ))}
          </View>
          
          <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
            Add Followers
          </Text>
          
          <Text style={styles.helperText}>
            Select users who should follow this task (optional)
          </Text>
          
          <View style={styles.usersContainer}>
            {availableUsers.map((user) => (
              <Chip
                key={`follower-${user.id}`}
                selected={selectedFollowers.includes(user.id)}
                onPress={() => toggleFollower(user.id)}
                style={styles.userChip}
                showSelectedCheck
                mode="outlined"
              >
                {user.name} ({user.role === UserRole.COMPANY_ADMIN ? 'Admin' : 'Employee'})
              </Chip>
            ))}
          </View>
          
          <Button
            mode="contained"
            onPress={handleSubmit(onSubmit)}
            style={styles.submitButton}
            loading={loading}
            disabled={loading}
          >
            Create Task
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
    marginTop: 24,
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
  segmentedButtons: {
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 4,
  },
  helperText: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 12,
  },
  usersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  userChip: {
    margin: 4,
  },
  submitButton: {
    marginTop: 24,
    paddingVertical: 6,
  },
});

export default CompanyAdminCreateTaskScreen;
