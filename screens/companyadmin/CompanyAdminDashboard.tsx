
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl } from 'react-native';
import { Text, useTheme, FAB } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import AppHeader from '../../components/AppHeader';
import DashboardCard from '../../components/DashboardCard';
import LoadingIndicator from '../../components/LoadingIndicator';
import { TaskStatus, FormStatus } from '../../types';

const CompanyAdminDashboard = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    totalTasks: 0,
    pendingTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    totalForms: 0,
    pendingForms: 0,
  });

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

  const fetchDashboardData = async () => {
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
      
      // Fetch employees count
      const { count: totalEmployees, error: employeesError } = await supabase
        .from('company_user')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompanyId);
      
      // Fetch active employees count
      const { count: activeEmployees, error: activeEmployeesError } = await supabase
        .from('company_user')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompanyId)
        .eq('active_status', 'active');
      
      // Fetch tasks count
      const { count: totalTasks, error: tasksError } = await supabase
        .from('task')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompanyId);
      
      // Fetch pending tasks count (open + in progress + awaiting response)
      const { count: pendingTasks, error: pendingTasksError } = await supabase
        .from('task')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompanyId)
        .in('status', [TaskStatus.OPEN, TaskStatus.IN_PROGRESS, TaskStatus.AWAITING_RESPONSE]);
      
      // Fetch completed tasks count
      const { count: completedTasks, error: completedTasksError } = await supabase
        .from('task')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompanyId)
        .eq('status', TaskStatus.COMPLETED);
      
      // Fetch overdue tasks count
      const { count: overdueTasks, error: overdueTasksError } = await supabase
        .from('task')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompanyId)
        .eq('status', TaskStatus.OVERDUE);
      
      // Fetch forms count (accident reports + illness reports + staff departure reports)
      const { count: accidentReports, error: accidentError } = await supabase
        .from('accident_report')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompanyId);
      
      const { count: illnessReports, error: illnessError } = await supabase
        .from('illness_report')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompanyId);
      
      const { count: departureReports, error: departureError } = await supabase
        .from('staff_departure_report')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompanyId);
      
      // Fetch pending forms count
      const { count: pendingAccidentReports, error: pendingAccidentError } = await supabase
        .from('accident_report')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompanyId)
        .in('status', [FormStatus.DRAFT, FormStatus.PENDING]);
      
      const { count: pendingIllnessReports, error: pendingIllnessError } = await supabase
        .from('illness_report')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompanyId)
        .in('status', [FormStatus.DRAFT, FormStatus.PENDING]);
      
      const { count: pendingDepartureReports, error: pendingDepartureError } = await supabase
        .from('staff_departure_report')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompanyId)
        .in('status', [FormStatus.DRAFT, FormStatus.PENDING]);
      
      const totalForms = (accidentReports || 0) + (illnessReports || 0) + (departureReports || 0);
      const pendingForms = (pendingAccidentReports || 0) + (pendingIllnessReports || 0) + (pendingDepartureReports || 0);
      
      setStats({
        totalEmployees: totalEmployees || 0,
        activeEmployees: activeEmployees || 0,
        totalTasks: totalTasks || 0,
        pendingTasks: pendingTasks || 0,
        completedTasks: completedTasks || 0,
        overdueTasks: overdueTasks || 0,
        totalForms: totalForms,
        pendingForms: pendingForms,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading && !refreshing) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title="Company Admin Dashboard" showBackButton={false} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Employees
        </Text>
        
        <View style={styles.cardsContainer}>
          <DashboardCard
            title="Total Employees"
            count={stats.totalEmployees}
            icon="account-group"
            color={theme.colors.primary}
            onPress={() => navigation.navigate('Employees' as never)}
          />
          
          <DashboardCard
            title="Active Employees"
            count={stats.activeEmployees}
            icon="account-check"
            color={theme.colors.tertiary}
            onPress={() => navigation.navigate('Employees' as never)}
          />
        </View>
        
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Tasks
        </Text>
        
        <View style={styles.cardsContainer}>
          <DashboardCard
            title="Total Tasks"
            count={stats.totalTasks}
            icon="clipboard-list"
            color={theme.colors.primary}
            onPress={() => navigation.navigate('Tasks' as never)}
          />
          
          <DashboardCard
            title="Pending Tasks"
            count={stats.pendingTasks}
            icon="clipboard-clock"
            color="#F59E0B" // Amber
            onPress={() => navigation.navigate('Tasks' as never)}
          />
          
          <DashboardCard
            title="Completed Tasks"
            count={stats.completedTasks}
            icon="clipboard-check"
            color="#10B981" // Green
            onPress={() => navigation.navigate('Tasks' as never)}
          />
          
          <DashboardCard
            title="Overdue Tasks"
            count={stats.overdueTasks}
            icon="clipboard-alert"
            color="#EF4444" // Red
            onPress={() => navigation.navigate('Tasks' as never)}
          />
        </View>
        
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Forms
        </Text>
        
        <View style={styles.cardsContainer}>
          <DashboardCard
            title="Total Forms"
            count={stats.totalForms}
            icon="file-document"
            color={theme.colors.primary}
            onPress={() => navigation.navigate('FormSubmissions' as never)}
          />
          
          <DashboardCard
            title="Pending Forms"
            count={stats.pendingForms}
            icon="file-clock"
            color="#F59E0B" // Amber
            onPress={() => navigation.navigate('FormSubmissions' as never)}
          />
        </View>
      </ScrollView>
      
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 12,
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default CompanyAdminDashboard;
