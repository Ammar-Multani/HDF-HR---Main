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
import {
  hashPassword,
  validatePassword,
  generateResetToken,
  generateJWT,
  checkUserStatus,
  AdminUser,
  CompanyUser,
  UserStatus,
} from "../utils/auth";
import * as Crypto from "expo-crypto";
import { generatePasswordResetEmail } from "../utils/emailTemplates";
import { sendPasswordResetEmail } from "../utils/emailService";
import { logDebug } from "../utils/logger";
import NetInfo from "@react-native-community/netinfo";

// Auth token constants
const AUTH_TOKEN_KEY = "auth_token";
const USER_DATA_KEY = "user_data";
const USER_ROLE_KEY = "user_role";
const AUTH_STATE_VERSION = "auth_state_v1"; // Used to invalidate cache when auth structure changes
const SKIP_LOADING_KEY = "skip_loading_after_login";

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

  // Function to handle user authentication with optimized caching
  const authenticate = useCallback(
    async (token: string, userData: any) => {
      logDebug("Authentication starting...", {
        token: token.substring(0, 10) + "...",
        hasRole: !!userData?.role,
      });

      // Skip loading screens after login
      await AsyncStorage.setItem(SKIP_LOADING_KEY, "true");

      // Set session and user immediately for better UI responsiveness
      setSession({ access_token: token });
      setUser(userData);

      try {
        // Store auth data in AsyncStorage
        const storePromises = [
          AsyncStorage.setItem(AUTH_TOKEN_KEY, token),
          AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData)),
        ];

        // Process role faster without waiting for database
        let roleToStore: UserRole | null = null;

        if (userData?.role) {
          const roleValue = userData.role.toLowerCase();

          if (roleValue === "superadmin") {
            roleToStore = UserRole.SUPER_ADMIN;
          } else if (roleValue === "admin" || roleValue === "companyadmin") {
            roleToStore = UserRole.COMPANY_ADMIN;
          } else if (roleValue === "employee") {
            roleToStore = UserRole.EMPLOYEE;
          }

          // Set role immediately for better UI responsiveness
          if (roleToStore) {
            setUserRole(roleToStore);
            storePromises.push(
              AsyncStorage.setItem(USER_ROLE_KEY, roleToStore)
            );
          }
        }

        // Only fetch role from database if absolutely necessary
        if (!roleToStore && userData?.id && isConnected) {
          await fetchUserRole(userData.id);
        }

        // Complete the storage operations in background
        await Promise.all(storePromises);
      } catch (error) {
        console.error("Error in authenticate function:", error);
      }

      // Ensure loading is set to false
      setLoading(false);

      // Use our navigateToDashboard function instead of direct navigation
      if (userData?.role) {
        setTimeout(navigateToDashboard, 100);
      }
    },
    [isConnected, navigateToDashboard]
  );

  useEffect(() => {
    // Check for existing session in AsyncStorage
    const loadStoredSession = async () => {
      try {
        logDebug("Checking for stored session...");

        // Load token, user data and role in parallel for better performance
        const [storedToken, storedUserData, storedRole] = await Promise.all([
          AsyncStorage.getItem(AUTH_TOKEN_KEY),
          AsyncStorage.getItem(USER_DATA_KEY),
          AsyncStorage.getItem(USER_ROLE_KEY),
        ]);

        logDebug("Stored session check result:", {
          hasToken: !!storedToken,
          hasUserData: !!storedUserData,
          hasRole: !!storedRole,
        });

        if (storedToken && storedUserData) {
          const userData = JSON.parse(storedUserData);
          logDebug("Found stored session, restoring...", {
            userId: userData.id,
          });

          // Set session and user state immediately for better UI responsiveness
          setSession({ access_token: storedToken });
          setUser(userData);

          // If we have a cached role, use it immediately
          if (storedRole) {
            setUserRole(storedRole as UserRole);
            setLoading(false);

            // Verify role in background only if we're online
            if (isConnected && userData?.id) {
              fetchUserRole(userData.id).catch(console.error);
            }
          } else if (userData?.role) {
            // If user has role in stored data, extract and use it
            const roleValue = userData.role.toLowerCase();
            let extractedRole: UserRole | null = null;

            if (roleValue === "superadmin") {
              extractedRole = UserRole.SUPER_ADMIN;
            } else if (roleValue === "admin" || roleValue === "companyadmin") {
              extractedRole = UserRole.COMPANY_ADMIN;
            } else if (roleValue === "employee") {
              extractedRole = UserRole.EMPLOYEE;
            }

            if (extractedRole) {
              setUserRole(extractedRole);
              // Cache for future use
              AsyncStorage.setItem(USER_ROLE_KEY, extractedRole).catch(
                console.error
              );
              setLoading(false);
            } else if (userData?.id && isConnected) {
              // Only fetch from database if online
              await fetchUserRole(userData.id);
            } else {
              setLoading(false);
            }
          } else if (userData?.id && isConnected) {
            // Only fetch role from database if we're online
            await fetchUserRole(userData.id);
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error("Error loading stored session:", error);
        setLoading(false);
      }
    };

    loadStoredSession();
  }, [isConnected]);

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

  /**
   * Simplified password validation without migration
   */
  const validateUserPassword = useCallback(
    async (password: string, hash: string): Promise<boolean> => {
      logDebug("Validating user password...");
      try {
        // Directly use the validatePassword function from utils/auth
        const isValid = await validatePassword(password, hash);
        logDebug("Password validation result:", { isValid });
        return isValid;
      } catch (error) {
        console.error("Error validating password:", error);
        return false;
      }
    },
    []
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      setLoading(true);
      logDebug("Sign-in attempt for:", email);

      try {
        if (!isConnected) {
          logDebug("Can't sign in while offline");
          return {
            error: {
              message:
                "You are offline. Please check your internet connection and try again.",
            },
          };
        }

        // First check if user exists in users table
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("id, email, password_hash")
          .eq("email", email)
          .single();

        if (userError || !userData) {
          logDebug("Sign-in failed: User not found");
          setLoading(false);
          return { error: { message: "Invalid email or password" } };
        }

        // Validate password
        const isPasswordValid = await validateUserPassword(
          password,
          userData.password_hash
        );

        if (!isPasswordValid) {
          logDebug("Sign-in failed: Invalid password");
          setLoading(false);
          return { error: { message: "Invalid email or password" } };
        }

        // Check both admin and company_user tables in parallel
        const [adminResult, companyUserResult] = await Promise.all([
          supabase
            .from("admin")
            .select("id, email, role, status")
            .eq("id", userData.id)
            .single(),
          supabase
            .from("company_user")
            .select("id, email, role, active_status")
            .eq("id", userData.id)
            .single(),
        ]);

        // Process the results
        const adminData: AdminUser | null = adminResult.data
          ? { ...adminResult.data, table: "admin" }
          : null;

        const companyUserData: CompanyUser | null = companyUserResult.data
          ? { ...companyUserResult.data, table: "company_user" }
          : null;

        // Check user status
        const userStatus = await checkUserStatus(adminData, companyUserData);

        if (!userStatus.isActive) {
          logDebug("Sign-in failed: Account not active");
          return {
            error: { message: userStatus.message },
            status: userStatus,
          };
        }

        // Determine final user data and role
        const finalUserData = adminData || companyUserData;
        if (!finalUserData) {
          return {
            error: { message: "User account not properly configured" },
            status: userStatus,
          };
        }

        // Generate JWT token
        const tokenData = {
          id: finalUserData.id,
          email: finalUserData.email,
          role: finalUserData.role,
          table: finalUserData.table,
        };

        const token = await generateJWT(tokenData);

        // Remove sensitive data before storing
        const { password_hash, ...userDataWithoutPassword } = userData;

        // Add role and status to userData
        const userDataWithRole = {
          ...userDataWithoutPassword,
          ...finalUserData,
        };

        logDebug("Calling authenticate with user data");
        await authenticate(token, userDataWithRole);

        logDebug("Sign-in process completed successfully");
        return { error: null, status: userStatus };
      } catch (error: any) {
        console.error("Sign-in error:", error);
        return { error };
      } finally {
        setLoading(false);
      }
    },
    [authenticate, validateUserPassword, isConnected]
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

        // Check if user already exists
        const { data: existingUser } = await supabase
          .from("users")
          .select("id")
          .eq("email", email)
          .single();

        if (existingUser) {
          return {
            error: { message: "User with this email already exists" },
            data: null,
          };
        }

        // Hash the password
        const hashedPassword = await hashPassword(password);

        // Insert new user
        const { data, error } = await supabase
          .from("users")
          .insert({
            email,
            password_hash: hashedPassword,
            status: "pending_confirmation", // Require email verification
          })
          .select("id, email, status")
          .single();

        if (error) {
          throw error;
        }

        // In a real app, send verification email here

        return { data, error: null };
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
      // Clear stored session
      await Promise.all([
        AsyncStorage.removeItem(AUTH_TOKEN_KEY),
        AsyncStorage.removeItem(USER_DATA_KEY),
        AsyncStorage.removeItem(USER_ROLE_KEY),
      ]);

      // Reset state
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

        // Hash the new password
        const hashedPassword = await hashPassword(newPassword);

        // Update password and clear reset token
        const { error } = await supabase
          .from("users")
          .update({
            password_hash: hashedPassword,
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
