import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types';
  
export default function AppLayout() {
  const { user, userRole } = useAuth();

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Stack>
      {userRole === UserRole.SUPER_ADMIN && (
        <Stack.Screen
          name="super-admin"
          options={{
            headerShown: false,
          }}
        />
      )}
      {userRole === UserRole.COMPANY_ADMIN && (
        <Stack.Screen
          name="company-admin"
          options={{
            headerShown: false,
          }}
        />
      )}
      {userRole === UserRole.EMPLOYEE && (
        <Stack.Screen
          name="employee"
          options={{
            headerShown: false,
          }}
        />
      )}
    </Stack>
  );
} 