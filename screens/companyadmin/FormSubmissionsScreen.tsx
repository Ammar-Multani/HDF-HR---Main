
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Card, Searchbar, useTheme, Chip, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import AppHeader from '../../components/AppHeader';
import LoadingIndicator from '../../components/LoadingIndicator';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { FormStatus } from '../../types';

interface FormSubmission {
  id: string;
  type: 'accident' | 'illness' | 'departure';
  title: string;
  employee_name: string;
  employee_id: string;
  status: FormStatus;
  submission_date: string;
}

const FormSubmissionsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [forms, setForms] = useState<FormSubmission[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredForms, setFilteredForms] = useState<FormSubmission[]>([]);
  const [typeFilter, setTypeFilter] = useState<'all' | 'accident' | 'illness' | 'departure'>('all');
  const [statusFilter, setStatusFilter] = useState<FormStatus | 'all'>('all');

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

  const fetchForms = async () => {
    try {
      setLoading(true);
      
      // Get company ID if not already set
      const currentCompanyId = companyId || await fetchCompanyId();
      if (!currentCompanyId) {
        console.error('No company ID found');
        setLoading(false);
        return;
      }
      
      setCompanyId(currentCompanyId);
      
      // Fetch accident reports
      const { data: accidentData, error: accidentError } = await supabase
        .from('accident_report')
        .select(`
          id,
          employee_id,
          status,
          created_at,
          accident_description,
          company_user (
            first_name,
            last_name
          )
        `)
        .eq('company_id', currentCompanyId);
      
      // Fetch illness reports
      const { data: illnessData, error: illnessError } = await supabase
        .from('illness_report')
        .select(`
          id,
          employee_id,
          status,
          submission_date,
          leave_description,
          company_user (
            first_name,
            last_name
          )
        `)
        .eq('company_id', currentCompanyId);
      
      // Fetch staff departure reports
      const { data: departureData, error: departureError } = await supabase
        .from('staff_departure_report')
        .select(`
          id,
          employee_id,
          status,
          created_at,
          comments,
          company_user (
            first_name,
            last_name
          )
        `)
        .eq('company_id', currentCompanyId);
      
      if (accidentError || illnessError || departureError) {
        console.error('Error fetching forms:', { accidentError, illnessError, departureError });
        return;
      }
      
      // Format accident reports
      const formattedAccidents = (accidentData || []).map(report => ({
        id: report.id,
        type: 'accident' as const,
        title: 'Accident Report',
        employee_name: `${report.company_user.first_name} ${report.company_user.last_name}`,
        employee_id: report.employee_id,
        status: report.status,
        submission_date: report.created_at,
      }));
      
      // Format illness reports
      const formattedIllness = (illnessData || []).map(report => ({
        id: report.id,
        type: 'illness' as const,
        title: 'Illness Report',
        employee_name: `${report.company_user.first_name} ${report.company_user.last_name}`,
        employee_id: report.employee_id,
        status: report.status,
        submission_date: report.submission_date,
      }));
      
      // Format departure reports
      const formattedDeparture = (departureData || []).map(report => ({
        id: report.id,
        type: 'departure' as const,
        title: 'Staff Departure Report',
        employee_name: `${report.company_user.first_name} ${report.company_user.last_name}`,
        employee_id: report.employee_id,
        status: report.status,
        submission_date: report.created_at,
      }));
      
      // Combine all reports
      const allForms = [
        ...formattedAccidents,
        ...formattedIllness,
        ...formattedDeparture,
      ].sort((a, b) => new Date(b.submission_date).getTime() - new Date(a.submission_date).getTime());
      
      setForms(allForms);
      setFilteredForms(allForms);
    } catch (error) {
      console.error('Error fetching forms:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, [user]);

  useEffect(() => {
    let filtered = forms;
    
    // Apply type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter(form => form.type === typeFilter);
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(form => form.status === statusFilter);
    }
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(form =>
        form.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        form.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredForms(filtered);
  }, [searchQuery, typeFilter, statusFilter, forms]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchForms();
  };

  const getFormTypeIcon = (type: 'accident' | 'illness' | 'departure') => {
    switch (type) {
      case 'accident':
        return 'alert-circle';
      case 'illness':
        return 'medical-bag';
      case 'departure':
        return 'account-arrow-right';
      default:
        return 'file-document';
    }
  };

  const renderFormItem = ({ item }: { item: FormSubmission }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('FormDetails' as never, { 
        formId: item.id, 
        formType: item.type 
      } as never)}
    >
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              <Chip
                icon={getFormTypeIcon(item.type)}
                style={styles.typeChip}
              >
                {item.title}
              </Chip>
              <Text style={styles.employeeName}>{item.employee_name}</Text>
            </View>
            <StatusBadge status={item.status} />
          </View>
          
          <Divider style={styles.divider} />
          
          <View style={styles.cardFooter}>
            <Text style={styles.submissionDate}>
              Submitted: {format(new Date(item.submission_date), 'MMM d, yyyy')}
            </Text>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderTypeFilter = () => (
    <View style={styles.filterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Chip
          selected={typeFilter === 'all'}
          onPress={() => setTypeFilter('all')}
          style={styles.filterChip}
        >
          All Types
        </Chip>
        <Chip
          selected={typeFilter === 'accident'}
          onPress={() => setTypeFilter('accident')}
          style={styles.filterChip}
          icon="alert-circle"
        >
          Accident
        </Chip>
        <Chip
          selected={typeFilter === 'illness'}
          onPress={() => setTypeFilter('illness')}
          style={styles.filterChip}
          icon="medical-bag"
        >
          Illness
        </Chip>
        <Chip
          selected={typeFilter === 'departure'}
          onPress={() => setTypeFilter('departure')}
          style={styles.filterChip}
          icon="account-arrow-right"
        >
          Departure
        </Chip>
      </ScrollView>
    </View>
  );

  const renderStatusFilter = () => (
    <View style={styles.filterContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <Chip
          selected={statusFilter === 'all'}
          onPress={() => setStatusFilter('all')}
          style={styles.filterChip}
        >
          All Status
        </Chip>
        <Chip
          selected={statusFilter === FormStatus.DRAFT}
          onPress={() => setStatusFilter(FormStatus.DRAFT)}
          style={styles.filterChip}
        >
          Draft
        </Chip>
        <Chip
          selected={statusFilter === FormStatus.PENDING}
          onPress={() => setStatusFilter(FormStatus.PENDING)}
          style={styles.filterChip}
        >
          Pending
        </Chip>
        <Chip
          selected={statusFilter === FormStatus.IN_PROGRESS}
          onPress={() => setStatusFilter(FormStatus.IN_PROGRESS)}
          style={styles.filterChip}
        >
          In Progress
        </Chip>
        <Chip
          selected={statusFilter === FormStatus.APPROVED}
          onPress={() => setStatusFilter(FormStatus.APPROVED)}
          style={styles.filterChip}
        >
          Approved
        </Chip>
        <Chip
          selected={statusFilter === FormStatus.DECLINED}
          onPress={() => setStatusFilter(FormStatus.DECLINED)}
          style={styles.filterChip}
        >
          Declined
        </Chip>
      </ScrollView>
    </View>
  );

  if (loading && !refreshing) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Form Submissions" showBackButton />
      
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search forms..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
      </View>
      
      {renderTypeFilter()}
      {renderStatusFilter()}
      
      {filteredForms.length === 0 ? (
        <EmptyState
          icon="file-document-off"
          title="No Forms Found"
          message={
            searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
              ? "No forms match your search criteria."
              : "No form submissions yet."
          }
          buttonTitle={
            searchQuery || typeFilter !== 'all' || statusFilter !== 'all' ? "Clear Filters" : undefined
          }
          onButtonPress={
            searchQuery || typeFilter !== 'all' || statusFilter !== 'all'
              ? () => {
                  setSearchQuery('');
                  setTypeFilter('all');
                  setStatusFilter('all');
                }
              : undefined
          }
        />
      ) : (
        <FlatList
          data={filteredForms}
          renderItem={renderFormItem}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchbar: {
    elevation: 2,
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  filterChip: {
    marginRight: 8,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
    marginBottom: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  typeChip: {
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  employeeName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    marginVertical: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  submissionDate: {
    opacity: 0.7,
    fontSize: 14,
  },
});

export default FormSubmissionsScreen;
