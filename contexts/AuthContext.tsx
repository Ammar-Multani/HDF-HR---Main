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
import { supabase, cachedQuery } from "../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserRole } from "../types";
import { generateResetToken, UserStatus } from "../utils/auth";
import { generatePasswordResetEmail } from "../utils/emailTemplates";
import { sendPasswordResetEmail } from "../utils/emailService";
import { logDebug } from "../utils/logger";
import NetInfo from "@react-native-community/netinfo";

// Storage key for cached role
const USER_ROLE_KEY = "user_role";

interface AuthContextType {
  session: any | null;
  user: any | null;
  userRole: UserRole | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string
  ) => Promise<{
    error: any;
    status?: UserStatus;
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
  navigateToDashboard: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);

  // Setup network status monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected !== false);
    });

    return () => unsubscribe();
  }, []);

  // Function to navigate to dashboard - decoupled from direct navigation import
  const navigateToDashboard = useCallback(() => {
    // We'll use a flag instead of direct navigation to avoid circular dependencies
    AsyncStorage.setItem("NAVIGATE_TO_DASHBOARD", userRole || "").catch(
      console.error
    );
  }, [userRole]);


  const fetchUserRole = useCallback(
    async (userId: string) => {
      try {
        logDebug("Fetching user role for ID:", userId);

        // If offline, don't attempt to fetch
        if (!isConnected) {
          logDebug("Offline - can't fetch user role");
          return;
        }

        // Use cachedQuery to benefit from caching
        const cacheKey = `user_role_${userId}`;

        // Function to fetch role from both tables
        const fetchRoleData = async () => {
          // Optimized approach: check both tables in parallel
          const [adminResult, companyUserResult] = await Promise.all([
            supabase.from("admin").select("role").eq("id", userId).single(),
            supabase
              .from("company_user")
              .select("role")
              .eq("id", userId)
              .single(),
          ]);

          return {
            data: {
              adminData: adminResult.data,
              companyUserData: companyUserResult.data,
            },
            error:
              adminResult.error && companyUserResult.error
                ? { message: "Failed to fetch user role" }
                : null,
          };
        };

        // Use cached query with 1-day cache time for role data
        const result = await cachedQuery<any>(
          fetchRoleData,
          cacheKey,
          { cacheTtl: 24 * 60 * 60 * 1000 } // 24 hours
        );

        const { adminData, companyUserData } = result.data;

        logDebug("Role check results:", {
          fromCache: result.fromCache,
          adminData,
          companyUserData,
        });

        // Process admin role first if it exists
        if (adminData && adminData.role) {
          const role = adminData.role.toLowerCase();
          logDebug("User is an admin with role:", role);

          if (role === "superadmin") {
            logDebug("Setting role to SUPER_ADMIN");
            setUserRole(UserRole.SUPER_ADMIN);
            AsyncStorage.setItem(USER_ROLE_KEY, UserRole.SUPER_ADMIN).catch(
              console.error
            );
            return;
          }
        }

        // Then check company user role
        if (companyUserData && companyUserData.role) {
          const role = companyUserData.role.toLowerCase();
          logDebug("User is a company user with role:", role);

          if (role === "companyadmin" || role === "admin") {
            logDebug("Setting role to COMPANY_ADMIN");
            setUserRole(UserRole.COMPANY_ADMIN);
            AsyncStorage.setItem(USER_ROLE_KEY, UserRole.COMPANY_ADMIN).catch(
              console.error
            );
          } else if (role === "employee") {
            logDebug("Setting role to EMPLOYEE");
            setUserRole(UserRole.EMPLOYEE);
            AsyncStorage.setItem(USER_ROLE_KEY, UserRole.EMPLOYEE).catch(
              console.error
            );
          } else {
            logDebug("Unknown company user role:", role);
            setUserRole(null);
            AsyncStorage.removeItem(USER_ROLE_KEY).catch(console.error);
          }
        } else {
          logDebug("User has no assigned role");
          setUserRole(null);
          AsyncStorage.removeItem(USER_ROLE_KEY).catch(console.error);
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    },
    [isConnected]
  );

  useEffect(() => {
    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        fetchUserRole(data.session.user.id);
      } else {
        setLoading(false);
      }
    };

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserRole(session.user.id);
      } else {
        setUserRole(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchUserRole]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        if (!isConnected) {
          return {
            error: {
              message:
                "You are offline. Please check your internet connection and try again.",
            },
          };
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error };
      } catch (error: any) {
        console.error("Sign-in error:", error);
        return { error };
      } finally {
        setLoading(false);
      }
    },
    [isConnected]
  );

  const signUp = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      try {
        // Check if online
        if (!isConnected) {
          return {
            error: {
              message:
                "You are offline. Please check your internet connection and try again.",
            },
            data: null,
          };
        }
        const { data, error } = await supabase.auth.signUp({ email, password });
        return { data, error };
      } catch (error: any) {
        console.error("Sign up error:", error);
        return { data: null, error };
      } finally {
        setLoading(false);
      }
    },
    [isConnected]
  );

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      await AsyncStorage.removeItem(USER_ROLE_KEY);
      setSession(null);
      setUser(null);
      setUserRole(null);
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const forgotPassword = useCallback(
    async (email: string) => {
      setLoading(true);
      try {
        // Check if online
        if (!isConnected) {
          return {
            error: {
              message:
                "You are offline. Please check your internet connection and try again.",
            },
          };
        }

        // Check if user exists
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("id")
          .eq("email", email)
          .single();

        if (userError || !userData) {
          // Don't reveal if user exists or not for security
          return { error: null }; // Return success even if user doesn't exist
        }

        // Generate a reset token
        const resetToken = await generateResetToken();
        const expiration = new Date();
        expiration.setHours(expiration.getHours() + 1); // Token valid for 1 hour

        // Save the reset token directly to users table
        const { error: updateError } = await supabase
          .from("users")
          .update({
            reset_token: resetToken,
            reset_token_expires: expiration.toISOString(),
          })
          .eq("id", userData.id);

        if (updateError) {
          console.error("Error updating reset token:", updateError);
          return { error: updateError };
        }

        // Send the password reset email using EmailJS
        const emailResult = await sendPasswordResetEmail(email, resetToken);

        if (!emailResult.success) {
          console.error("Failed to send reset email:", emailResult.error);
          return { error: { message: "Failed to send reset email" } };
        }

        logDebug(`Reset email sent to ${email} successfully`);
        return { error: null };
      } catch (error: any) {
        console.error("Forgot password error:", error);
        return { error };
      } finally {
        setLoading(false);
      }
    },
    [isConnected]
  );

  const resetPassword = useCallback(
    async (newPassword: string, token: string) => {
      setLoading(true);
      try {
        // Check if online
        if (!isConnected) {
          return {
            error: {
              message:
                "You are offline. Please check your internet connection and try again.",
            },
          };
        }

        if (!token) {
          return { error: { message: "Reset token is required" } };
        }

        // Find user with matching reset token
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("id, reset_token_expires")
          .eq("reset_token", token)
          .single();

        if (userError || !userData) {
          return { error: { message: "Invalid or expired reset token" } };
        }

        // Check if token has expired
        const tokenExpiry = new Date(userData.reset_token_expires);
        const now = new Date();
        if (now > tokenExpiry) {
          return { error: { message: "Reset token has expired" } };
        }

        // Update password and clear reset token
        const { error } = await supabase
          .from("users")
          .update({
            password_hash: newPassword,
            reset_token: null,
            reset_token_expires: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userData.id);

        if (error) {
          throw error;
        }

        return { error: null };
      } catch (error: any) {
        console.error("Reset password error:", error);
        return { error };
      } finally {
        setLoading(false);
      }
    },
    [isConnected]
  );

  // Memoize context value to prevent unnecessary rerenders
  const contextValue = useMemo(
    () => ({
      session,
      user,
      userRole,
      loading,
      signIn,
      signUp,
      signOut,
      forgotPassword,
      resetPassword,
      navigateToDashboard,
    }),
    [
      session,
      user,
      userRole,
      loading,
      signIn,
      signUp,
      signOut,
      forgotPassword,
      resetPassword,
      navigateToDashboard,
    ]
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
