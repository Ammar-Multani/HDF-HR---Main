import React, { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { Text, Card, Searchbar, useTheme, FAB, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import AppHeader from '../../components/AppHeader';
import LoadingIndicator from '../../components/LoadingIndicator';
import EmptyState from '../../components/EmptyState';
import StatusBadge from '../../components/StatusBadge';
import { CompanyUser, UserStatus } from '../../types';

const EmployeeListScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employees, setEmployees] = useState<CompanyUser[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredEmployees, setFilteredEmployees] = useState<CompanyUser[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);

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

  const fetchEmployees = async () => {
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
      
      // Fetch employees for this company
      const { data, error } = await supabase
        .from('company_user')
        .select('*')
        .eq('company_id', currentCompanyId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching employees:', error);
        return;
      }
      
      setEmployees(data || []);
      setFilteredEmployees(data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [user]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredEmployees(employees);
    } else {
      const filtered = employees.filter(employee =>
        (employee.first_name + ' ' + employee.last_name).toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.job_title?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredEmployees(filtered);
    }
  }, [searchQuery, employees]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEmployees();
  };

  const getInitials = (firstName: string, lastName: string) => {
    return (
      (firstName ? firstName.charAt(0).toUpperCase() : '') +
      (lastName ? lastName.charAt(0).toUpperCase() : '')
    ) || '?';
  };

  const renderEmployeeItem = ({ item }: { item: CompanyUser }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('EmployeeDetails' as never, { employeeId: item.id } as never)}
    >
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.userInfo}>
              <Avatar.Text
                size={40}
                label={getInitials(item.first_name, item.last_name)}
                style={{ backgroundColor: theme.colors.primary }}
              />
              <View style={styles.userTextContainer}>
                <Text style={styles.userName}>
                  {item.first_name} {item.last_name}
                </Text>
                <Text style={styles.userEmail}>{item.email}</Text>
                {item.job_title && (
                  <Text style={styles.jobTitle}>{item.job_title}</Text>
                )}
              </View>
            </View>
            <StatusBadge status={item.active_status} />
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Employees" showBackButton />
      
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search employees..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
      </View>
      
      {filteredEmployees.length === 0 ? (
        <EmptyState
          icon="account-off"
          title="No Employees Found"
          message={
            searchQuery
              ? "No employees match your search criteria."
              : "You haven't added any employees yet."
          }
          buttonTitle={searchQuery ? "Clear Search" : "Add Employee"}
          onButtonPress={() => {
            if (searchQuery) {
              setSearchQuery('');
            } else {
              navigation.navigate('CreateEmployee' as never);
            }
          }}
        />
      ) : (
        <FlatList
          data={filteredEmployees}
          renderItem={renderEmployeeItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
      
      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('CreateEmployee' as never)}
        color={theme.colors.surface}
      />
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
    alignItems: 'center',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  userEmail: {
    opacity: 0.7,
  },
  jobTitle: {
    marginTop: 4,
    fontSize: 14,
    opacity: 0.8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default EmployeeListScreen;