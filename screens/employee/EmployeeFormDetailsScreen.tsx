import React, { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, RefreshControl, Linking } from 'react-native';
import { Text, Card, Button, Divider, useTheme } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { format } from 'date-fns';
import { supabase } from '../../lib/supabase';
import AppHeader from '../../components/AppHeader';
import LoadingIndicator from '../../components/LoadingIndicator';
import StatusBadge from '../../components/StatusBadge';
import { FormStatus, DocumentType } from '../../types';

type FormDetailsRouteParams = {
  formId: string;
  formType: 'accident' | 'illness' | 'departure';
};

const EmployeeFormDetailsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<Record<string, FormDetailsRouteParams>, string>>();
  const { formId, formType } = route.params;
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState<any>(null);

  const fetchFormDetails = async () => {
    try {
      setLoading(true);
      
      let formData;
      
      // Fetch form details based on type
      if (formType === 'accident') {
        const { data, error } = await supabase
          .from('accident_report')
          .select('*')
          .eq('id', formId)
          .single();
        
        if (error) {
          console.error('Error fetching accident report:', error);
          return;
        }
        
        formData = data;
      } else if (formType === 'illness') {
        const { data, error } = await supabase
          .from('illness_report')
          .select('*')
          .eq('id', formId)
          .single();
        
        if (error) {
          console.error('Error fetching illness report:', error);
          return;
        }
        
        formData = data;
      } else if (formType === 'departure') {
        const { data, error } = await supabase
          .from('staff_departure_report')
          .select('*')
          .eq('id', formId)
          .single();
        
        if (error) {
          console.error('Error fetching staff departure report:', error);
          return;
        }
        
        formData = data;
      }
      
      setForm(formData);
    } catch (error) {
      console.error('Error fetching form details:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchFormDetails();
  }, [formId, formType]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchFormDetails();
  };

  const handleViewDocument = (documentUrl: string) => {
    if (documentUrl) {
      Linking.openURL(documentUrl);
    } else {
      alert('Document URL is not available');
    }
  };

  const getFormTitle = () => {
    switch (formType) {
      case 'accident':
        return 'Accident Report';
      case 'illness':
        return 'Illness Report';
      case 'departure':
        return 'Staff Departure Report';
      default:
        return 'Form Details';
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMMM d, yyyy');
  };

  const formatTime = (timeString: string | undefined) => {
    if (!timeString) return 'N/A';
    return timeString;
  };

  const renderAccidentDetails = () => {
    if (!form) return null;
    
    return (
      <>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Accident Date:</Text>
          <Text style={styles.detailValue}>{formatDate(form.date_of_accident)}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Accident Time:</Text>
          <Text style={styles.detailValue}>{formatTime(form.time_of_accident)}</Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Location:</Text>
          <Text style={styles.detailValue}>{form.accident_address}, {form.city}</Text>
        </View>
        
        <Text style={styles.sectionSubtitle}>Accident Description</Text>
        <Text style={styles.description}>{form.accident_description}</Text>
        
        <Text style={styles.sectionSubtitle}>Objects Involved</Text>
        <Text style={styles.description}>{form.objects_involved}</Text>
        
        <Text style={styles.sectionSubtitle}>Injuries</Text>
        <Text style={styles.description}>{form.injuries}</Text>
        
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Accident Type:</Text>
          <Text style={styles.detailValue}>{form.accident_type}</Text>
        </View>
        
        {form.medical_certificate && (
          <Button
            mode="outlined"
            onPress={() => handleViewDocument(form.medical_certificate)}
            style={styles.documentButton}
            icon="file-document"
          >
            View Medical Certificate
          </Button>
        )}
      </>
    );
  };

  const renderIllnessDetails = () => {
    if (!form) return null;
    
    return (
      <>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Leave Start:</Text>
          <Text style={styles.detailValue}>{formatDate(form.date_of_onset_leave)}</Text>
        </View>
        
        <Text style={styles.sectionSubtitle}>Leave Description</Text>
        <Text style={styles.description}>{form.leave_description}</Text>
        
        {form.medical_certificate && (
          <Button
            mode="outlined"
            onPress={() => handleViewDocument(form.medical_certificate)}
            style={styles.documentButton}
            icon="file-document"
          >
            View Medical Certificate
          </Button>
        )}
      </>
    );
  };

  const renderDepartureDetails = () => {
    if (!form) return null;
    
    return (
      <>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Exit Date:</Text>
          <Text style={styles.detailValue}>{formatDate(form.exit_date)}</Text>
        </View>
        
        <Text style={styles.sectionSubtitle}>Required Documents</Text>
        <View style={styles.documentsContainer}>
          {form.documents_required.map((doc: DocumentType, index: number) => (
            <View key={index} style={styles.documentItem}>
              <Text style={styles.documentName}>
                {doc.split('_').map((word: string) => 
                  word.charAt(0).toUpperCase() + word.slice(1)
                ).join(' ')}
              </Text>
            </View>
          ))}
        </View>
        
        {form.comments && (
          <>
            <Text style={styles.sectionSubtitle}>Comments</Text>
            <Text style={styles.description}>{form.comments}</Text>
          </>
        )}
      </>
    );
  };

  if (loading && !refreshing) {
    return <LoadingIndicator />;
  }

  if (!form) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <AppHeader title={getFormTitle()} showBackButton />
        <View style={styles.errorContainer}>
          <Text style={{ color: theme.colors.error }}>Form not found</Text>
          <Button mode="contained" onPress={() => navigation.goBack()} style={styles.button}>
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader title={getFormTitle()} showBackButton />
      
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
              <Text style={styles.formTitle}>{getFormTitle()}</Text>
              <StatusBadge status={form.status} />
            </View>
            
            <Divider style={styles.divider} />
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Submission Date:</Text>
              <Text style={styles.detailValue}>
                {formatDate(form.created_at || form.submission_date)}
              </Text>
            </View>
            
            {formType === 'accident' && renderAccidentDetails()}
            {formType === 'illness' && renderIllnessDetails()}
            {formType === 'departure' && renderDepartureDetails()}
            
            {form.comments && formType !== 'departure' && (
              <>
                <Divider style={styles.divider} />
                <Text style={styles.sectionTitle}>Admin Comments</Text>
                <Text style={styles.description}>{form.comments}</Text>
              </>
            )}
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
    marginBottom: 12,
  },
  formTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  divider: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    marginTop: 16,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontWeight: '500',
    width: 120,
    opacity: 0.7,
  },
  detailValue: {
    flex: 1,
  },
  documentsContainer: {
    marginBottom: 16,
  },
  documentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  documentName: {
    fontSize: 16,
  },
  documentButton: {
    marginTop: 8,
    marginBottom: 16,
  },
  button: {
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
});

export default EmployeeFormDetailsScreen;