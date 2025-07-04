import * as React from "react";
import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  useCallback,
  useMemo,
} from "react";
import { supabase } from "../lib/supabase-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserRole } from "../types";
import {
  validatePassword,
  checkUserStatus,
  AdminUser,
  CompanyUser,
  UserStatus,
} from "../utils/auth";
import { logDebug } from "../utils/logger";
import NetInfo from "@react-native-community/netinfo";
import { Platform } from "react-native";

// Storage keys
const STORAGE_KEYS = {
  AUTH_TOKEN: "auth_token_v2",
  USER_DATA: "user_data_v2",
  USER_ROLE: "user_role_v2",
  SESSION: "session_v2",
  LAST_ACTIVE: "last_active_v2",
  AUTH_STATE: "auth_state_v3",
} as const;

// Storage key type
type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

// Helper function to check if a key is a valid storage key
const isStorageKey = (key: string): key is StorageKey => {
  return Object.values(STORAGE_KEYS).includes(key as StorageKey);
};

// Session configuration
const SESSION_CONFIG = {
  persistSession: true,
  detectSessionInUrl: true,
  autoRefreshToken: true,
  sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours
  refreshThreshold: 15 * 60 * 1000, // 15 minutes before expiry
};

interface AuthContextType {
  session: any | null;
  user: any | null;
  userRole: UserRole | null;
  loading: boolean;
  isAuthenticated: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{
    error: any;
    status?: "active" | "inactive";
  }>;
  signUp: (
    email: string,
    password: string
  ) => Promise<{ error: any; data: any }>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<{ error: any }>;
  resetPassword: (
    newPassword: string,
    token: string
  ) => Promise<{ error: any }>;
  refreshSession: () => Promise<void>;
  navigateToDashboard: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [refreshTimer, setRefreshTimer] = useState<NodeJS.Timeout | null>(null);
  const [isHandlingSignOut, setIsHandlingSignOut] = useState(false);
  const [isProcessingAuthChange, setIsProcessingAuthChange] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<
    "initializing" | "recovering" | "active" | "expired" | "error"
  >("initializing");
  const [lastError, setLastError] = useState<Error | null>(null);

  // Setup network status monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected !== false);
    });

    return () => unsubscribe();
  }, []);

  // Function to persist auth state
  const persistAuthState = async (authState: any) => {
    try {
      if (!authState) {
        await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
        return;
      }

      const stateToStore = {
        session: authState.session,
        user: authState.user,
        userRole: authState.userRole,
        timestamp: Date.now(),
      };

      await AsyncStorage.setItem(
        STORAGE_KEYS.AUTH_STATE,
        JSON.stringify(stateToStore)
      );
    } catch (error) {
      console.error("Error persisting auth state:", error);
    }
  };

  // Function to restore auth state
  const restoreAuthState = async () => {
    try {
      const storedState = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_STATE);
      if (!storedState) return null;

      const parsedState = JSON.parse(storedState);
      const timestamp = parsedState.timestamp;

      // Check if stored state is still valid (24 hours)
      if (Date.now() - timestamp > SESSION_CONFIG.sessionTimeout) {
        await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
        return null;
      }

      return parsedState;
    } catch (error) {
      console.error("Error restoring auth state:", error);
      return null;
    }
  };

  // Function to refresh session
  const refreshSession = async () => {
    try {
      const {
        data: { session: newSession },
        error,
      } = await supabase.auth.refreshSession();

      if (error) {
        console.error("Error refreshing session:", error);
        await handleSignOut();
        return;
      }

      if (newSession) {
        setSession(newSession);
        setUser(newSession.user);
        await persistAuthState({
          session: newSession,
          user: newSession.user,
          userRole,
        });
      }
    } catch (error) {
      console.error("Error in refreshSession:", error);
    }
  };

  // Setup session refresh timer
  useEffect(() => {
    if (session?.expires_at) {
      const expiresAt = new Date(session.expires_at).getTime();
      const timeUntilRefresh =
        expiresAt - Date.now() - SESSION_CONFIG.refreshThreshold;

      if (timeUntilRefresh > 0) {
        const timer = setTimeout(refreshSession, timeUntilRefresh);
        setRefreshTimer(timer);
        return () => clearTimeout(timer);
      }
    }
  }, [session]);

  // Function to fetch user role - with retry mechanism
  const fetchUserRole = useCallback(
    async (userId: string, retryCount = 0) => {
      try {
        if (!isConnected) {
          const storedRole = await AsyncStorage.getItem(STORAGE_KEYS.USER_ROLE);
          if (storedRole) {
            setUserRole(storedRole as UserRole);
            return;
          }
        }

        const { data: adminData, error: adminError } = await supabase
          .from("admin")
          .select("id, role, status")
          .eq("id", userId)
          .maybeSingle();

        if (adminError && adminError.code !== "PGRST116") {
          throw adminError;
        }

        const { data: companyUserData, error: companyUserError } =
          await supabase
            .from("company_user")
            .select("id, role, active_status")
            .eq("id", userId)
            .maybeSingle();

        if (companyUserError && companyUserError.code !== "PGRST116") {
          throw companyUserError;
        }

        if (adminData?.role) {
          const role = adminData.role.toLowerCase();
          if (role === "super_admin" || role === "superadmin") {
            setUserRole(UserRole.SUPER_ADMIN);
            await AsyncStorage.setItem(
              STORAGE_KEYS.USER_ROLE,
              UserRole.SUPER_ADMIN
            );
            return;
          }
        }

        if (companyUserData?.role) {
          const role = companyUserData.role.toLowerCase();
          if (role === "admin") {
            setUserRole(UserRole.COMPANY_ADMIN);
            await AsyncStorage.setItem(
              STORAGE_KEYS.USER_ROLE,
              UserRole.COMPANY_ADMIN
            );
          } else if (role === "employee") {
            setUserRole(UserRole.EMPLOYEE);
            await AsyncStorage.setItem(
              STORAGE_KEYS.USER_ROLE,
              UserRole.EMPLOYEE
            );
          }
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        if (retryCount < 3 && isConnected) {
          // Exponential backoff retry
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, retryCount) * 1000)
          );
          return fetchUserRole(userId, retryCount + 1);
        }

        // If all retries failed, try to use cached role
        const storedRole = await AsyncStorage.getItem(STORAGE_KEYS.USER_ROLE);
        if (storedRole) {
          setUserRole(storedRole as UserRole);
        }
      }
    },
    [isConnected]
  );

  // Helper for consistent logging with timestamps
  const logWithTimestamp = (message: string, data: any = null) => {
    const timestamp = new Date().toISOString().split("T")[1].split(".")[0]; // HH:MM:SS format
    console.log(`[${timestamp}] AUTH_CTX: ${message}`, data ? data : "");
  };

  // Add this helper function for auth state cleanup
  const cleanupAuthState = async () => {
    logWithTimestamp("Starting auth state cleanup");

    // Clear all auth-related storage
    const keys = await AsyncStorage.getAllKeys();
    const authKeys = keys.filter(
      (key) =>
        key.startsWith("supabase.auth.") ||
        key.startsWith("cache:") ||
        key === "auth_token" ||
        key === "auth_token_v2" ||
        key === "user_data_v2" ||
        key === "user_role_v2" ||
        key === "session_v2" ||
        key === "last_active_v2" ||
        key === "auth_state_v3" ||
        key === "auth_check" ||
        key === "NAVIGATE_TO_DASHBOARD" ||
        key === "last_cache_reset" ||
        key === "SKIP_LOADING_KEY" ||
        key === "initial_load_complete"
    );

    if (authKeys.length > 0) {
      await AsyncStorage.multiRemove(authKeys);
    }

    // Reset context state
    setSession(null);
    setUser(null);
    setUserRole(null);
    setIsAuthenticated(false);
    await persistAuthState(null);

    // Reinitialize Supabase client
    await supabase.auth.initialize();

    logWithTimestamp("Auth state cleanup completed");
  };

  // Update handleSignOut to use the cleanup function
  const handleSignOut = async () => {
    logDebug("AUTH_CTX: Starting sign-out process");

    // Prevent multiple simultaneous sign-out attempts
    if (isHandlingSignOut) {
      logDebug("AUTH_CTX: Sign-out already in progress");
      return;
    }

    try {
      setIsHandlingSignOut(true);

      // Clear any existing refresh timers
      if (refreshTimer) {
        clearTimeout(refreshTimer);
        setRefreshTimer(null);
      }

      // Clear auth state first to prevent UI flicker
      setSession(null);
      setUser(null);
      setUserRole(null);
      setIsAuthenticated(false);

      // Clear persistent storage
      await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));

      // Call Supabase sign out
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Set final state
      setSessionStatus("expired");
      logDebug("AUTH_CTX: Sign-out completed successfully");
    } catch (error) {
      console.error("Error during sign-out:", error);
      setLastError(error as Error);
      setSessionStatus("error");
    } finally {
      setIsHandlingSignOut(false);
    }
  };

  // Auth state change handler
  useEffect(() => {
    logDebug("Setting up auth state change listener");

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      logDebug(`Auth state change: ${event}`);

      // Prevent processing auth changes while signing out
      if (isHandlingSignOut) {
        logDebug("Skipping auth state change during sign-out");
        return;
      }

      // Prevent multiple simultaneous auth state processing
      if (isProcessingAuthChange) {
        logDebug("Already processing auth state change");
        return;
      }

      try {
        setIsProcessingAuthChange(true);

        switch (event) {
          case "SIGNED_IN":
            if (currentSession) {
              setSession(currentSession);
              setUser(currentSession.user);
              setIsAuthenticated(true);
              await persistAuthState({
                session: currentSession,
                user: currentSession.user,
                userRole,
              });
              setSessionStatus("active");
            }
            break;

          case "SIGNED_OUT":
            // Only clean up if we're not already handling sign out
            if (!isHandlingSignOut) {
              setSession(null);
              setUser(null);
              setUserRole(null);
              setIsAuthenticated(false);
              await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
              setSessionStatus("expired");
            }
            break;

          case "TOKEN_REFRESHED":
            if (currentSession) {
              setSession(currentSession);
              await persistAuthState({
                session: currentSession,
                user: currentSession.user,
                userRole,
              });
            }
            break;
        }
      } finally {
        setIsProcessingAuthChange(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Update the useEffect for auth state changes
  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        setSessionStatus("initializing");

        // Initialize Supabase client first
        await supabase.auth.initialize();

        // Get current session from Supabase
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        // Try to restore auth state
        const restoredState = await restoreAuthState();

        if (currentSession) {
          setSessionStatus("recovering");
          // We have a valid session from Supabase
          setSession(currentSession);
          setUser(currentSession.user);
          setIsAuthenticated(true);

          // Fetch user role if needed
          if (
            currentSession.user?.id &&
            (!restoredState?.userRole || !isConnected)
          ) {
            await fetchUserRole(currentSession.user.id);
          } else if (restoredState?.userRole) {
            setUserRole(restoredState.userRole);
          }

          // Persist the current state
          await persistAuthState({
            session: currentSession,
            user: currentSession.user,
            userRole: restoredState?.userRole || null,
          });

          setSessionStatus("active");
        } else if (restoredState?.session) {
          setSessionStatus("recovering");
          // We have stored state but no current session - try to recover
          try {
            const {
              data: { session: refreshedSession },
              error,
            } = await supabase.auth.refreshSession();

            if (refreshedSession && !error) {
              setSession(refreshedSession);
              setUser(refreshedSession.user);
              setUserRole(restoredState.userRole);
              setIsAuthenticated(true);
              setSessionStatus("active");
            } else {
              setSessionStatus("expired");
              await handleSignOut();
            }
          } catch (error) {
            console.error("Session refresh error:", error);
            setLastError(
              error instanceof Error
                ? error
                : new Error("Failed to refresh session")
            );
            setSessionStatus("error");
            await handleSignOut();
          }
        } else {
          setSessionStatus("expired");
        }

        // Setup session expiry warning
        if (currentSession?.expires_at) {
          const expiryWarningTime =
            new Date(currentSession.expires_at).getTime() -
            SESSION_CONFIG.refreshThreshold;
          const warningTimeout = setTimeout(
            () => {
              if (sessionStatus === "active") {
                // Attempt to refresh the session before it expires
                refreshSession().catch((error) => {
                  console.error("Failed to refresh session:", error);
                  setLastError(
                    error instanceof Error
                      ? error
                      : new Error("Failed to refresh session")
                  );
                });
              }
            },
            Math.max(0, expiryWarningTime - Date.now())
          );

          return () => {
            clearTimeout(warningTimeout);
          };
        }

        setLoading(false);
      } catch (error) {
        console.error("Error initializing auth:", error);
        setLastError(
          error instanceof Error
            ? error
            : new Error("Failed to initialize auth")
        );
        setSessionStatus("error");
        setLoading(false);
      }
    };

    initAuth();
  }, [fetchUserRole, isConnected]);

  // Sign in implementation
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);

      // Check if we just completed a sign-out
      const justSignedOut = await AsyncStorage.getItem("JUST_SIGNED_OUT");
      if (justSignedOut === "true") {
        logWithTimestamp(
          "Sign-in attempted too soon after sign-out, please wait a moment"
        );
        return {
          error: new Error("Please wait a moment before signing in again"),
        };
      }

      // Clear any existing session data first
      const keys = await AsyncStorage.getAllKeys();
      const authKeys = keys.filter(
        (key) =>
          key.startsWith("supabase.auth.") ||
          key.startsWith("cache:") ||
          isStorageKey(key)
      );
      await AsyncStorage.multiRemove(authKeys);

      // Initialize a fresh auth state
      await supabase.auth.initialize();

      // Attempt sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data?.user) {
        // Check admin status
        const { data: adminData } = await supabase
          .from("admin")
          .select("*")
          .eq("id", data.user.id)
          .single();

        // Check company user status
        const { data: companyUserData } = await supabase
          .from("company_user")
          .select("*")
          .eq("id", data.user.id)
          .single();

        const { isActive } = await checkUserStatus(adminData, companyUserData);

        if (!isActive) {
          await handleSignOut();
          return {
            error: new Error("Account is not active"),
            status: "inactive" as const,
          };
        }

        // Set session data
        setSession(data.session);
        setUser(data.user);
        setIsAuthenticated(true);

        await fetchUserRole(data.user.id);
        return { error: null, status: "active" as const };
      }

      return { error: new Error("No user data returned") };
    } catch (error: any) {
      console.error("Sign in error:", error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Navigation helper
  const navigateToDashboard = useCallback(() => {
    if (userRole) {
      AsyncStorage.setItem("NAVIGATE_TO_DASHBOARD", userRole).catch(
        console.error
      );
    }
  }, [userRole]);

  // Context value
  const value = useMemo(
    () => ({
      session,
      user,
      userRole,
      loading,
      isAuthenticated,
      signIn,
      signUp: async (email: string, password: string) => {
        // Implement signUp logic
        return { error: null, data: null };
      },
      signOut: handleSignOut,
      forgotPassword: async (email: string) => {
        // Implement forgotPassword logic
        return { error: null };
      },
      resetPassword: async (newPassword: string, token: string) => {
        try {
          setLoading(true);
          logDebug("Attempting password reset with token");

          // First ensure we have no active session that could interfere
          await supabase.auth.signOut();

          // Get the email associated with the token
          const { data: tokenData, error: tokenError } = await supabase
            .from("password_reset_tokens")
            .select("email")
            .eq("token", token)
            .single();

          if (tokenError || !tokenData) {
            throw new Error("Invalid reset token");
          }

          // First verify the OTP (token)
          const { data: verifyData, error: verifyError } =
            await supabase.auth.verifyOtp({
              email: tokenData.email,
              token: token,
              type: "recovery",
            });

          if (verifyError) {
            throw verifyError;
          }

          // Now we can update the password with the verified session
          const { error: updateError } = await supabase.auth.updateUser({
            password: newPassword,
          });

          if (updateError) throw updateError;

          logDebug("Password reset successful");
          return { error: null };
        } catch (error) {
          console.error("Password reset error:", error);
          return { error };
        } finally {
          setLoading(false);
        }
      },
      refreshSession,
      navigateToDashboard,
    }),
    [session, user, userRole, loading, isAuthenticated, navigateToDashboard]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
