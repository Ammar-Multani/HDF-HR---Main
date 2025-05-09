import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, Card, Button, Divider, useTheme, ActivityIndicator, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import AppHeader from '../../components/AppHeader';
import LoadingIndicator from '../../components/LoadingIndicator';
import StatusBadge from '../../components/StatusBadge';
import { Company, UserStatus, CompanyUser, UserRole } from '../../types';

type CompanyDetailsRouteParams = {
  companyId: string;
};

const CompanyDetailsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Record<string, CompanyDetailsRouteParams>, string>>();
  const { companyId } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [companyAdmins, setCompanyAdmins] = useState<CompanyUser[]>([]);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [activeEmployeeCount, setActiveEmployeeCount] = useState(0);

  const fetchCompanyDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch company details
      const { data: companyData, error: companyError } = await supabase
        .from('company')
        .select('*')
        .eq('id', companyId)
        .single();
      
      if (companyError) {
        console.error('Error fetching company details:', companyError);
        return;
      }
      
      setCompany(companyData);
      
      // Fetch company admins
      const { data: adminsData, error: adminsError } = await supabase
        .from('company_user')
        .select('*')
        .eq('company_id', companyId)
        .eq('role', UserRole.COMPANY_ADMIN);
      
      if (adminsError) {
        console.error('Error fetching company admins:', adminsError);
      } else {
        setCompanyAdmins(adminsData || []);
      }
      
      // Fetch employee count
      const { count: totalEmployees, error: totalError } = await supabase
        .from('company_user')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);
      
      if (!totalError) {
        setEmployeeCount(totalEmployees || 0);
      }
      
      // Fetch active employee count
      const { count: activeEmployees, error: activeError } = await supabase
        .from('company_user')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .eq('active_status', UserStatus.ACTIVE);
      
      if (!activeError) {
        setActiveEmployeeCount(activeEmployees || 0);
      }
    } catch (error) {
      console.error('Error fetching company details:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCompanyDetails();
  }, [companyId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCompanyDetails();
  };

  const handleToggleStatus = async () => {
    if (!company) return;
    
    Alert.alert(
      company.active ? 'Deactivate Company' : 'Activate Company',
      `Are you sure you want to ${company.active ? 'deactivate' : 'activate'} ${company.company_name}?`,
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
              
              const { error } = await supabase
                .from('company')
                .update({ active: !company.active })
                .eq('id', company.id);
              
              if (error) {
                throw error;
              }
              
              // Update local state
              setCompany({
                ...company,
                active: !company.active,
              });
              
              Alert.alert(
                'Success',
                `Company ${company.active ? 'deactivated' : 'activated'} successfully.`
              );
            } catch (error: any) {
              console.error('Error toggling company status:', error);
              Alert.alert('Error', error.message || 'Failed to update company status');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  if (loading && !refreshing) {
    return <LoadingIndicator />;
  }

  if (!company) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader title="Company Details" showBackButton />
        <View style={styles.errorContainer}>
          <Text style={{ color: theme.colors.error }}>Company not found</Text>
          <Button mode="contained" onPress={() => navigation.goBack()} style={styles.button}>
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Company Details" showBackButton />
      
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
              <Text style={styles.companyName}>{company.company_name}</Text>
              <StatusBadge status={company.active ? UserStatus.ACTIVE : UserStatus.INACTIVE} />
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{employeeCount}</Text>
                <Text style={styles.statLabel}>Total Employees</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{activeEmployeeCount}</Text>
                <Text style={styles.statLabel}>Active Employees</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{companyAdmins.length}</Text>
                <Text style={styles.statLabel}>Admins</Text>
              </View>
            </View>
            
            <Divider style={styles.divider} />
            
            <Text style={styles.sectionTitle}>Company Information</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Registration Number:</Text>
              <Text style={styles.infoValue}>{company.registration_number}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Industry Type:</Text>
              <Text style={styles.infoValue}>{company.industry_type}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Contact Number:</Text>
              <Text style={styles.infoValue}>{company.contact_number}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>VAT Type:</Text>
              <Text style={styles.infoValue}>{company.vat_type}</Text>
            </View>
            
            <Divider style={styles.divider} />
            
            <Text style={styles.sectionTitle}>Address</Text>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Street:</Text>
              <Text style={styles.infoValue}>
                {company.address.line1}
                {company.address.line2 ? `, ${company.address.line2}` : ''}
              </Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>City:</Text>
              <Text style={styles.infoValue}>{company.address.city}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>State/Province:</Text>
              <Text style={styles.infoValue}>{company.address.state}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Postal Code:</Text>
              <Text style={styles.infoValue}>{company.address.postal_code}</Text>
            </View>
            
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Country:</Text>
              <Text style={styles.infoValue}>{company.address.country}</Text>
            </View>
            
            <Divider style={styles.divider} />
            
            <Text style={styles.sectionTitle}>Stakeholders</Text>
            
            <View style={styles.stakeholdersContainer}>
              {company.stakeholders.map((stakeholder, index) => (
                <Chip
                  key={index}
                  style={styles.stakeholderChip}
                  mode="outlined"
                >
                  {stakeholder.name} ({stakeholder.percentage}%)
                </Chip>
              ))}
            </View>
            
            <Divider style={styles.divider} />
            
            <Text style={styles.sectionTitle}>Company Admins</Text>
            
            {companyAdmins.length > 0 ? (
              companyAdmins.map((admin) => (
                <Card key={admin.id} style={styles.adminCard}>
                  <Card.Content>
                    <View style={styles.adminHeader}>
                      <Text style={styles.adminName}>
                        {admin.first_name && admin.last_name
                          ? `${admin.first_name} ${admin.last_name}`
                          : admin.email}
                      </Text>
                      <StatusBadge status={admin.active_status} size="small" />
                    </View>
                    <Text style={styles.adminEmail}>{admin.email}</Text>
                    {admin.phone_number && (
                      <Text style={styles.adminPhone}>{admin.phone_number}</Text>
                    )}
                  </Card.Content>
                </Card>
              ))
            ) : (
              <Text style={styles.noAdminsText}>No company admins found</Text>
            )}
          </Card.Content>
        </Card>
        
        <View style={styles.buttonContainer}>
          <Button
            mode="contained"
            onPress={() => navigation.navigate('EditCompany' as never, { companyId: company.id } as never)}
            style={[styles.button, { backgroundColor: theme.colors.primary }]}
          >
            Edit Company
          </Button>
          
          <Button
            mode="outlined"
            onPress={handleToggleStatus}
            style={styles.button}
            textColor={company.active ? theme.colors.error : theme.colors.primary}
          >
            {company.active ? 'Deactivate Company' : 'Activate Company'}
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
    alignItems: 'center',
    marginBottom: 16,
  },
  companyName: {
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
  },
  divider: {
    marginVertical: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
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
  stakeholdersContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  stakeholderChip: {
    margin: 4,
  },
  adminCard: {
    marginBottom: 8,
  },
  adminHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adminName: {
    fontSize: 16,
    fontWeight: '500',
  },
  adminEmail: {
    opacity: 0.7,
    marginTop: 4,
  },
  adminPhone: {
    opacity: 0.7,
    marginTop: 2,
  },
  noAdminsText: {
    fontStyle: 'italic',
    opacity: 0.7,
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

export default CompanyDetailsScreen;