
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl, Alert, Linking } from 'react-native';
import { Text, Card, Button, Divider, useTheme, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import AppHeader from '../../components/AppHeader';
import LoadingIndicator from '../../components/LoadingIndicator';
import StatusBadge from '../../components/StatusBadge';
import { CompanyUser, UserStatus, Gender, MaritalStatus, IDType, EmploymentType } from '../../types';

type EmployeeDetailsRouteParams = {
  employeeId: string;
};

const EmployeeDetailsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Record<string, EmployeeDetailsRouteParams>, string>>();
  const { employeeId } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employee, setEmployee] = useState<CompanyUser | null>(null);

  const fetchEmployeeDetails = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('company_user')
        .select('*')
        .eq('id', employeeId)
        .single();
      
      if (error) {
        console.error('Error fetching employee details:', error);
        return;
      }
      
      setEmployee(data);
    } catch (error) {
      console.error('Error fetching employee details:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmployeeDetails();
  }, [employeeId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEmployeeDetails();
  };

  const handleToggleStatus = async () => {
    if (!employee) return;
    
    Alert.alert(
      employee.active_status === UserStatus.ACTIVE ? 'Deactivate Employee' : 'Activate Employee',
      `Are you sure you want to ${employee.active_status === UserStatus.ACTIVE ? 'deactivate' : 'activate'} ${employee.first_name} ${employee.last_name}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setLoading(true);
              
              const newStatus = employee.active_status === UserStatus.ACTIVE 
                ? UserStatus.INACTIVE 
                : UserStatus.ACTIVE;
              
              const { error } = await supabase
                .from('company_user')
                .update({ active_status: newStatus })
                .eq('id', employee.id);
              
              if (error) {
                throw error;
              }
              
              // Update local state
              setEmployee({
                ...employee,
                active_status: newStatus,
              });
              
              Alert.alert(
                'Success',
                `Employee ${newStatus === UserStatus.ACTIVE ? 'activated' : 'deactivated'} successfully.`
              );
            } catch (error: any) {
              console.error('Error toggling employee status:', error);
              Alert.alert('Error', error.message || 'Failed to update employee status');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMMM d, yyyy');
  };

  const handleCall = (phoneNumber: string) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleEmail = (email: string) => {
    Linking.openURL(`mailto:${email}`);
  };

  if (loading && !refreshing) {
    return <LoadingIndicator />;
  }

  if (!employee) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="Employee Details" showBackButton />
        <View style={styles.errorContainer}>
          <Text style={{ color: theme.colors.error }}>Employee not found</Text>
          <Button mode="contained" onPress={() => navigation.goBack()} style={styles.button}>
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Employee Details" showBackButton />
      
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
              <View>
                <Text style={styles.employeeName}>
                  {employee.first_name} {employee.last_name}
                </Text>
                <Text style={styles.jobTitle}>{employee.job_title}</Text>
              </View>
              <StatusBadge status={employee.active_status} />
            </View>
            
            <View style={styles.contactButtons}>
              <Button
                mode="contained-tonal"
                icon="phone"
                onPress={() => handleCall(employee.phone_number)}
                style={styles.contactButton}
              >
                Call
              </Button>
              
              <Button
                mode="contained-tonal"
                icon="email"
                onPress={() => handleEmail(employee.email)}
                style={styles.contactButton}
              >
                Email
              </Button>
            </View>
            
            <Divider style={styles.divider} />
            
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email:</Text>
              <Text style={styles.infoValue}>{employee.email}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{employee.phone_number}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date of Birth:</Text>
              <Text style={styles.infoValue}>{formatDate(employee.date_of_birth)}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Gender:</Text>
              <Text style={styles.infoValue}>
                {employee.gender.charAt(0).toUpperCase() + employee.gender.slice(1)}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Nationality:</Text>
              <Text style={styles.infoValue}>{employee.nationality}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Marital Status:</Text>
              <Text style={styles.infoValue}>
                {employee.marital_status.charAt(0).toUpperCase() + 
                 employee.marital_status.slice(1).replace('_', ' ')}
              </Text>
            </View>
            
            <Divider style={styles.divider} />
            
            <Text style={styles.sectionTitle}>Employment Details</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Start Date:</Text>
              <Text style={styles.infoValue}>{formatDate(employee.employment_start_date)}</Text>
            </View>
            
            {employee.employment_end_date && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>End Date:</Text>
                <Text style={styles.infoValue}>{formatDate(employee.employment_end_date)}</Text>
              </View>
            )}
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Employment Type:</Text>
              <Text style={styles.infoValue}>
                {employee.employment_type.split('_').map(
                  word => word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Workload:</Text>
              <Text style={styles.infoValue}>{employee.workload_percentage}%</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Education:</Text>
              <Text style={styles.infoValue}>{employee.education || 'N/A'}</Text>
            </View>
            
            <Divider style={styles.divider} />
            
            <Text style={styles.sectionTitle}>Identification</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>ID Type:</Text>
              <Text style={styles.infoValue}>
                {employee.id_type.split('_').map(
                  word => word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>AHV Number:</Text>
              <Text style={styles.infoValue}>{employee.ahv_number}</Text>
            </View>
            
            <Divider style={styles.divider} />
            
            <Text style={styles.sectionTitle}>Address</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Street:</Text>
              <Text style={styles.infoValue}>
                {employee.address.line1}
                {employee.address.line2 ? `, ${employee.address.line2}` : ''}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>City:</Text>
              <Text style={styles.infoValue}>{employee.address.city}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>State/Province:</Text>
              <Text style={styles.infoValue}>{employee.address.state}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Postal Code:</Text>
              <Text style={styles.infoValue}>{employee.address.postal_code}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Country:</Text>
              <Text style={styles.infoValue}>{employee.address.country}</Text>
            </View>
            
            <Divider style={styles.divider} />
            
            <Text style={styles.sectionTitle}>Bank Details</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Bank Name:</Text>
              <Text style={styles.infoValue}>{employee.bank_details.bank_name}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Account Number:</Text>
              <Text style={styles.infoValue}>{employee.bank_details.account_number}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>IBAN:</Text>
              <Text style={styles.infoValue}>{employee.bank_details.iban}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>SWIFT Code:</Text>
              <Text style={styles.infoValue}>{employee.bank_details.swift_code}</Text>
            </View>
            
            {employee.comments && (
              <>
                <Divider style={styles.divider} />
                
                <Text style={styles.sectionTitle}>Comments</Text>
                <Text style={styles.comments}>{employee.comments}</Text>
              </>
            )}
          </Card.Content>
        </Card>
        
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('EditEmployee' as never, { employeeId: employee.id } as never)}
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
          >
            Edit Employee
          </Button>
          
          <Button
            mode="outlined"
            onPress={handleToggleStatus}
            style={styles.button}
            textColor={employee.active_status === UserStatus.ACTIVE ? theme.colors.error : theme.colors.primary}
          >
            {employee.active_status === UserStatus.ACTIVE ? 'Deactivate Employee' : 'Activate Employee'}
          </Button>
        </View>
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
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  employeeName: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  jobTitle: {
    fontSize: 16,
    opacity: 0.7,
    marginTop: 4,
  },
  contactButtons: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  contactButton: {
    marginRight: 12,
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoLabel: {
    fontWeight: '500',
    width: 120,
    opacity: 0.7,
  },
  infoValue: {
    flex: 1,
  },
  comments: {
    fontSize: 16,
    lineHeight: 24,
  },
  buttonContainer: {
    marginTop: 8,
  },
  button: {
    marginBottom: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});

export default EmployeeDetailsScreen;
