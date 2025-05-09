
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, useTheme, Card, Button } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import AppHeader from '../../components/AppHeader';
import LoadingIndicator from '../../components/LoadingIndicator';
import { FormStatus } from '../../types';

const EmployeeDashboard = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    draftForms: 0,
    pendingForms: 0,
    approvedForms: 0,
    declinedForms: 0,
  });

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        setLoading(false);
        return;
      }
      
      // Fetch forms count by status
      const formsPromises = [
        // Draft forms
        Promise.all([
          supabase
            .from('accident_report')
            .select('*', { count: 'exact', head: true })
            .eq('employee_id', user.id)
            .eq('status', FormStatus.DRAFT),
          
          supabase
            .from('illness_report')
            .select('*', { count: 'exact', head: true })
            .eq('employee_id', user.id)
            .eq('status', FormStatus.DRAFT),
          
          supabase
            .from('staff_departure_report')
            .select('*', { count: 'exact', head: true })
            .eq('employee_id', user.id)
            .eq('status', FormStatus.DRAFT),
        ]),
        
        // Pending forms
        Promise.all([
          supabase
            .from('accident_report')
            .select('*', { count: 'exact', head: true })
            .eq('employee_id', user.id)
            .eq('status', FormStatus.PENDING),
          
          supabase
            .from('illness_report')
            .select('*', { count: 'exact', head: true })
            .eq('employee_id', user.id)
            .eq('status', FormStatus.PENDING),
          
          supabase
            .from('staff_departure_report')
            .select('*', { count: 'exact', head: true })
            .eq('employee_id', user.id)
            .eq('status', FormStatus.PENDING),
        ]),
        
        // Approved forms
        Promise.all([
          supabase
            .from('accident_report')
            .select('*', { count: 'exact', head: true })
            .eq('employee_id', user.id)
            .eq('status', FormStatus.APPROVED),
          
          supabase
            .from('illness_report')
            .select('*', { count: 'exact', head: true })
            .eq('employee_id', user.id)
            .eq('status', FormStatus.APPROVED),
          
          supabase
            .from('staff_departure_report')
            .select('*', { count: 'exact', head: true })
            .eq('employee_id', user.id)
            .eq('status', FormStatus.APPROVED),
        ]),
        
        // Declined forms
        Promise.all([
          supabase
            .from('accident_report')
            .select('*', { count: 'exact', head: true })
            .eq('employee_id', user.id)
            .eq('status', FormStatus.DECLINED),
          
          supabase
            .from('illness_report')
            .select('*', { count: 'exact', head: true })
            .eq('employee_id', user.id)
            .eq('status', FormStatus.DECLINED),
          
          supabase
            .from('staff_departure_report')
            .select('*', { count: 'exact', head: true })
            .eq('employee_id', user.id)
            .eq('status', FormStatus.DECLINED),
        ]),
      ];
      
      const [
        draftFormsResults,
        pendingFormsResults,
        approvedFormsResults,
        declinedFormsResults,
      ] = await Promise.all(formsPromises);
      
      // Calculate totals for each status
      const draftForms = draftFormsResults.reduce((sum, { count }) => sum + (count || 0), 0);
      const pendingForms = pendingFormsResults.reduce((sum, { count }) => sum + (count || 0), 0);
      const approvedForms = approvedFormsResults.reduce((sum, { count }) => sum + (count || 0), 0);
      const declinedForms = declinedFormsResults.reduce((sum, { count }) => sum + (count || 0), 0);
      
      setStats({
        draftForms,
        pendingForms,
        approvedForms,
        declinedForms,
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
      <AppHeader title="Employee Dashboard" showBackButton={false} />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          Create New Form
        </Text>
        
        <View style={styles.formCardsContainer}>
          <TouchableOpacity
            style={styles.formCard}
            onPress={() => navigation.navigate('CreateAccidentReport' as never)}
          >
            <Card style={{ backgroundColor: theme.colors.surface }}>
              <Card.Content style={styles.formCardContent}>
                <MaterialCommunityIcons
                  name="alert-circle"
                  size={40}
                  color={theme.colors.error}
                />
                <Text style={styles.formCardTitle}>Accident Report</Text>
              </Card.Content>
            </Card>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.formCard}
            onPress={() => navigation.navigate('CreateIllnessReport' as never)}
          >
            <Card style={{ backgroundColor: theme.colors.surface }}>
              <Card.Content style={styles.formCardContent}>
                <MaterialCommunityIcons
                  name="medical-bag"
                  size={40}
                  color={theme.colors.primary}
                />
                <Text style={styles.formCardTitle}>Illness Report</Text>
              </Card.Content>
            </Card>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.formCard}
            onPress={() => navigation.navigate('CreateStaffDeparture' as never)}
          >
            <Card style={{ backgroundColor: theme.colors.surface }}>
              <Card.Content style={styles.formCardContent}>
                <MaterialCommunityIcons
                  name="exit-run"
                  size={40}
                  color={theme.colors.tertiary}
                />
                <Text style={styles.formCardTitle}>Staff Departure</Text>
              </Card.Content>
            </Card>
          </TouchableOpacity>
        </View>
        
        <Text style={[styles.sectionTitle, { color: theme.colors.onBackground }]}>
          My Forms
        </Text>
        
        <Card style={[styles.statsCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.draftForms}</Text>
                <Text style={styles.statLabel}>Draft</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.pendingForms}</Text>
                <Text style={styles.statLabel}>Pending</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.approvedForms}</Text>
                <Text style={styles.statLabel}>Approved</Text>
              </View>
              
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.declinedForms}</Text>
                <Text style={styles.statLabel}>Declined</Text>
              </View>
            </View>
            
            <Button
              mode="contained"
              onPress={() => navigation.navigate('Forms' as never)}
              style={styles.viewAllButton}
            >
              View All Forms
            </Button>
          </Card.Content>
        </Card>
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
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 16,
    marginBottom: 12,
  },
  formCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  formCard: {
    width: '31%',
    marginBottom: 12,
  },
  formCardContent: {
    alignItems: 'center',
    padding: 16,
  },
  formCardTitle: {
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  statsCard: {
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  viewAllButton: {
    marginTop: 8,
  },
});

export default EmployeeDashboard;
