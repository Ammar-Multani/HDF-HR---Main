import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { UserRole } from '../types';

// Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import LoadingScreen from '../screens/auth/LoadingScreen';

// Super Admin Screens
import SuperAdminDashboard from '../screens/superadmin/SuperAdminDashboard';
import CompanyListScreen from '../screens/superadmin/CompanyListScreen';
import CompanyDetailsScreen from '../screens/superadmin/CompanyDetailsScreen';
import CreateCompanyScreen from '../screens/superadmin/CreateCompanyScreen';
import EditCompanyScreen from '../screens/superadmin/EditCompanyScreen';
import SuperAdminTasksScreen from '../screens/superadmin/SuperAdminTasksScreen';
import SuperAdminTaskDetailsScreen from '../screens/superadmin/SuperAdminTaskDetailsScreen';
import CreateTaskScreen from '../screens/superadmin/CreateTaskScreen';
import SuperAdminProfileScreen from '../screens/superadmin/SuperAdminProfileScreen';
import SuperAdminUsersScreen from '../screens/superadmin/SuperAdminUsersScreen';
import CreateSuperAdminScreen from '../screens/superadmin/CreateSuperAdminScreen';

// Company Admin Screens
import CompanyAdminDashboard from '../screens/companyadmin/CompanyAdminDashboard';
import EmployeeListScreen from '../screens/companyadmin/EmployeeListScreen';
import EmployeeDetailsScreen from '../screens/companyadmin/EmployeeDetailsScreen';
import CreateEmployeeScreen from '../screens/companyadmin/CreateEmployeeScreen';
import EditEmployeeScreen from '../screens/companyadmin/EditEmployeeScreen';
import CompanyAdminTasksScreen from '../screens/companyadmin/CompanyAdminTasksScreen';
import CompanyAdminTaskDetailsScreen from '../screens/companyadmin/CompanyAdminTaskDetailsScreen';
import CompanyAdminCreateTaskScreen from '../screens/companyadmin/CompanyAdminCreateTaskScreen';
import FormSubmissionsScreen from '../screens/companyadmin/FormSubmissionsScreen';
import FormDetailsScreen from '../screens/companyadmin/FormDetailsScreen';
import CompanyAdminProfileScreen from '../screens/companyadmin/CompanyAdminProfileScreen';

// Employee Screens
import EmployeeDashboard from '../screens/employee/EmployeeDashboard';
import CreateAccidentReportScreen from '../screens/employee/CreateAccidentReportScreen';
import CreateIllnessReportScreen from '../screens/employee/CreateIllnessReportScreen';
import CreateStaffDepartureScreen from '../screens/employee/CreateStaffDepartureScreen';
import EmployeeFormsScreen from '../screens/employee/EmployeeFormsScreen';
import EmployeeFormDetailsScreen from '../screens/employee/EmployeeFormDetailsScreen';
import EmployeeProfileScreen from '../screens/employee/EmployeeProfileScreen';

// Stack navigators
const AuthStack = createNativeStackNavigator();
const SuperAdminStack = createNativeStackNavigator();
const CompanyAdminStack = createNativeStackNavigator();
const EmployeeStack = createNativeStackNavigator();

// Auth Navigator
const AuthNavigator = () => (
  <AuthStack.Navigator screenOptions={{ headerShown: false }}>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
    <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <AuthStack.Screen name="ResetPassword" component={ResetPasswordScreen} />
  </AuthStack.Navigator>
);

// Super Admin Navigator
const SuperAdminNavigator = () => (
  <SuperAdminStack.Navigator>
    <SuperAdminStack.Screen 
      name="Dashboard" 
      component={SuperAdminDashboard} 
      options={{ headerShown: false }}
    />
    <SuperAdminStack.Screen 
      name="Companies" 
      component={CompanyListScreen} 
      options={{ title: 'Companies' }}
    />
    <SuperAdminStack.Screen 
      name="CompanyDetails" 
      component={CompanyDetailsScreen} 
      options={{ title: 'Company Details' }}
    />
    <SuperAdminStack.Screen 
      name="CreateCompany" 
      component={CreateCompanyScreen} 
      options={{ title: 'Create Company' }}
    />
    <SuperAdminStack.Screen 
      name="EditCompany" 
      component={EditCompanyScreen} 
      options={{ title: 'Edit Company' }}
    />
    <SuperAdminStack.Screen 
      name="Tasks" 
      component={SuperAdminTasksScreen} 
      options={{ title: 'Tasks' }}
    />
    <SuperAdminStack.Screen 
      name="TaskDetails" 
      component={SuperAdminTaskDetailsScreen} 
      options={{ title: 'Task Details' }}
    />
    <SuperAdminStack.Screen 
      name="CreateTask" 
      component={CreateTaskScreen} 
      options={{ title: 'Create Task' }}
    />
    <SuperAdminStack.Screen 
      name="Profile" 
      component={SuperAdminProfileScreen} 
      options={{ title: 'Profile' }}
    />
    <SuperAdminStack.Screen 
      name="Users" 
      component={SuperAdminUsersScreen} 
      options={{ title: 'Super Admins' }}
    />
    <SuperAdminStack.Screen 
      name="CreateSuperAdmin" 
      component={CreateSuperAdminScreen} 
      options={{ title: 'Create Super Admin' }}
    />
  </SuperAdminStack.Navigator>
);

// Company Admin Navigator
const CompanyAdminNavigator = () => (
  <CompanyAdminStack.Navigator>
    <CompanyAdminStack.Screen 
      name="Dashboard" 
      component={CompanyAdminDashboard} 
      options={{ headerShown: false }}
    />
    <CompanyAdminStack.Screen 
      name="Employees" 
      component={EmployeeListScreen} 
      options={{ title: 'Employees' }}
    />
    <CompanyAdminStack.Screen 
      name="EmployeeDetails" 
      component={EmployeeDetailsScreen} 
      options={{ title: 'Employee Details' }}
    />
    <CompanyAdminStack.Screen 
      name="CreateEmployee" 
      component={CreateEmployeeScreen} 
      options={{ title: 'Create Employee' }}
    />
    <CompanyAdminStack.Screen 
      name="EditEmployee" 
      component={EditEmployeeScreen} 
      options={{ title: 'Edit Employee' }}
    />
    <CompanyAdminStack.Screen 
      name="Tasks" 
      component={CompanyAdminTasksScreen} 
      options={{ title: 'Tasks' }}
    />
    <CompanyAdminStack.Screen 
      name="TaskDetails" 
      component={CompanyAdminTaskDetailsScreen} 
      options={{ title: 'Task Details' }}
    />
    <CompanyAdminStack.Screen 
      name="CreateTask" 
      component={CompanyAdminCreateTaskScreen} 
      options={{ title: 'Create Task' }}
    />
    <CompanyAdminStack.Screen 
      name="FormSubmissions" 
      component={FormSubmissionsScreen} 
      options={{ title: 'Form Submissions' }}
    />
    <CompanyAdminStack.Screen 
      name="FormDetails" 
      component={FormDetailsScreen} 
      options={{ title: 'Form Details' }}
    />
    <CompanyAdminStack.Screen 
      name="Profile" 
      component={CompanyAdminProfileScreen} 
      options={{ title: 'Profile' }}
    />
  </CompanyAdminStack.Navigator>
);

// Employee Navigator
const EmployeeNavigator = () => (
  <EmployeeStack.Navigator>
    <EmployeeStack.Screen 
      name="Dashboard" 
      component={EmployeeDashboard} 
      options={{ headerShown: false }}
    />
    <EmployeeStack.Screen 
      name="CreateAccidentReport" 
      component={CreateAccidentReportScreen} 
      options={{ title: 'Accident Report' }}
    />
    <EmployeeStack.Screen 
      name="CreateIllnessReport" 
      component={CreateIllnessReportScreen} 
      options={{ title: 'Illness Report' }}
    />
    <EmployeeStack.Screen 
      name="CreateStaffDeparture" 
      component={CreateStaffDepartureScreen} 
      options={{ title: 'Staff Departure' }}
    />
    <EmployeeStack.Screen 
      name="Forms" 
      component={EmployeeFormsScreen} 
      options={{ title: 'My Forms' }}
    />
    <EmployeeStack.Screen 
      name="FormDetails" 
      component={EmployeeFormDetailsScreen} 
      options={{ title: 'Form Details' }}
    />
    <EmployeeStack.Screen 
      name="Profile" 
      component={EmployeeProfileScreen} 
      options={{ title: 'Profile' }}
    />
  </EmployeeStack.Navigator>
);

// Main Navigator
export const AppNavigator = () => {
  const { user, userRole, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      {!user ? (
        <AuthNavigator />
      ) : (
        <>
          {userRole === UserRole.SUPER_ADMIN && <SuperAdminNavigator />}
          {userRole === UserRole.COMPANY_ADMIN && <CompanyAdminNavigator />}
          {userRole === UserRole.EMPLOYEE && <EmployeeNavigator />}
          {!userRole && <AuthNavigator />}
        </>
      )}
    </NavigationContainer>
  );
};
