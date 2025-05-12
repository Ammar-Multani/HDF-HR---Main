import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Session } from '@supabase/supabase-js';
import { UserRole } from '../types';

// Default super admin credentials
const DEFAULT_ADMIN_EMAIL = 'admin@businessmanagement.com';
const DEFAULT_ADMIN_PASSWORD = 'Admin@123';

interface AuthContextType {
  session: Session | null;
  user: any | null;
  userRole: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any, data: any }>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ error: any }>;
  resetPassword: (newPassword: string) => Promise<{ error: any }>;
  isFirstTimeSetup: boolean;
  setupDefaultAdmin: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        checkIfFirstTimeSetup();
        setLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchUserRole(session.user.id);
        } else {
          setUserRole(null);
          checkIfFirstTimeSetup();
          setLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkIfFirstTimeSetup = async () => {
    try {
      // Check if any admin exists in the system
      const { data, error, count } = await supabase
        .from('admin')
        .select('*', { count: 'exact' });

      if (count === 0) {
        setIsFirstTimeSetup(true);
      } else {
        setIsFirstTimeSetup(false);
      }
    } catch (error) {
      console.error('Error checking first time setup:', error);
      setIsFirstTimeSetup(false);
    }
  };

  const setupDefaultAdmin = async () => {
    setLoading(true);
    try {
      // First, create the user in auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: DEFAULT_ADMIN_EMAIL,
        password: DEFAULT_ADMIN_PASSWORD,
      });

      if (authError) {
        setLoading(false);
        return { error: authError };
      }

      if (authData.user) {
        // Then, add the user to the admin table with super admin role
        const { error: adminError } = await supabase
          .from('admin')
          .insert({
            id: authData.user.id,
            email: DEFAULT_ADMIN_EMAIL,
            role: UserRole.SUPER_ADMIN,
            name: 'System Administrator',
            status: 'active',
          });

        if (adminError) {
          setLoading(false);
          return { error: adminError };
        }

        // Auto sign in with the default admin
        return await signIn(DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD);
      }

      setLoading(false);
      return { error: new Error('Failed to create default admin') };
    } catch (error) {
      setLoading(false);
      return { error };
    }
  };

  const fetchUserRole = async (userId: string) => {
    try {
      // First check if user is a super admin
      const { data: adminData, error: adminError } = await supabase
        .from('admin')
        .select('role')
        .eq('id', userId)
        .single();

      if (adminData) {
        setUserRole(adminData.role as UserRole);
        setLoading(false);
        return;
      }

      // If not a super admin, check if user is a company user
      const { data: companyUserData, error: companyUserError } = await supabase
        .from('company_user')
        .select('role')
        .eq('id', userId)
        .single();

      if (companyUserData) {
        setUserRole(companyUserData.role as UserRole);
      } else {
        setUserRole(null);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);
    return { data, error };
  };

  const signOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  };

  const forgotPassword = async (email: string) => {
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'businessmanagementapp://auth/reset-password',
    });
    setLoading(false);
    return { error };
  };

  const resetPassword = async (newPassword: string) => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    setLoading(false);
    return { error };
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        userRole,
        loading,
        signIn,
        signUp,
        signOut,
        forgotPassword,
        resetPassword,
        isFirstTimeSetup,
        setupDefaultAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
