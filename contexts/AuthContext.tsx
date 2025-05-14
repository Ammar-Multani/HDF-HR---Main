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
} from "../utils/auth";
import * as Crypto from "expo-crypto";
import { generatePasswordResetEmail } from "../utils/emailTemplates";
import { sendPasswordResetEmail } from "../utils/emailService";
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
  signIn: (email: string, password: string) => Promise<{ error: any }>;
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
      console.log("Authentication starting...", {
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
        console.log("Checking for stored session...");

        // Load token, user data and role in parallel for better performance
        const [storedToken, storedUserData, storedRole] = await Promise.all([
          AsyncStorage.getItem(AUTH_TOKEN_KEY),
          AsyncStorage.getItem(USER_DATA_KEY),
          AsyncStorage.getItem(USER_ROLE_KEY),
        ]);

        console.log("Stored session check result:", {
          hasToken: !!storedToken,
          hasUserData: !!storedUserData,
          hasRole: !!storedRole,
        });

        if (storedToken && storedUserData) {
          const userData = JSON.parse(storedUserData);
          console.log("Found stored session, restoring...", {
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
        console.log("Fetching user role for ID:", userId);

        // If offline, don't attempt to fetch
        if (!isConnected) {
          console.log("Offline - can't fetch user role");
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

        console.log("Role check results:", {
          fromCache: result.fromCache,
          adminData,
          companyUserData,
        });

        // Process admin role first if it exists
        if (adminData && adminData.role) {
          const role = adminData.role.toLowerCase();
          console.log("User is an admin with role:", role);

          if (role === "superadmin") {
            console.log("Setting role to SUPER_ADMIN");
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
          console.log("User is a company user with role:", role);

          if (role === "companyadmin" || role === "admin") {
            console.log("Setting role to COMPANY_ADMIN");
            setUserRole(UserRole.COMPANY_ADMIN);
            AsyncStorage.setItem(USER_ROLE_KEY, UserRole.COMPANY_ADMIN).catch(
              console.error
            );
          } else if (role === "employee") {
            console.log("Setting role to EMPLOYEE");
            setUserRole(UserRole.EMPLOYEE);
            AsyncStorage.setItem(USER_ROLE_KEY, UserRole.EMPLOYEE).catch(
              console.error
            );
          } else {
            console.log("Unknown company user role:", role);
            setUserRole(null);
            AsyncStorage.removeItem(USER_ROLE_KEY).catch(console.error);
          }
        } else {
          console.log("User has no assigned role");
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
      console.log("Validating user password...");
      try {
        // Directly use the validatePassword function from utils/auth
        const isValid = await validatePassword(password, hash);
        console.log("Password validation result:", { isValid });
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
      console.log("Sign-in attempt for:", email);

      try {
        // Check if we're online
        if (!isConnected) {
          console.log("Can't sign in while offline");
          return {
            error: {
              message:
                "You are offline. Please check your internet connection and try again.",
            },
          };
        }

        // Use caching for user lookup to improve performance
        const cacheKey = `user_email_${email.toLowerCase()}`;

        const fetchUserData = async () => {
          return await supabase
            .from("users")
            .select("id, email, password_hash, status")
            .eq("email", email)
            .single();
        };

        // Try cached version first, but always force refresh for login security
        const { data: userData, error: userError } = await fetchUserData();

        console.log("User lookup result:", {
          found: !!userData,
          error: userError ? userError.message : null,
        });

        if (userError || !userData) {
          console.log("Sign-in failed: User not found");
          setLoading(false);
          return { error: { message: "Invalid email or password" } };
        }

        // Validate password directly without migration
        const isPasswordValid = await validateUserPassword(
          password,
          userData.password_hash
        );

        if (!isPasswordValid) {
          console.log("Sign-in failed: Invalid password");
          setLoading(false);
          return { error: { message: "Invalid email or password" } };
        }

        if (userData.status !== "active") {
          console.log(
            "Sign-in failed: Account not active, status:",
            userData.status
          );
          setLoading(false);
          return { error: { message: "Account is not active" } };
        }

        console.log("Sign-in successful, updating last login");

        // Update last login time using regular client since RLS is disabled
        await supabase
          .from("users")
          .update({ last_login: new Date().toISOString() })
          .eq("id", userData.id);

        // Fetch user role - use cached version to improve performance
        const roleCacheKey = `user_role_${userData.id}`;

        const fetchRole = async () => {
          // First check admin table
          const adminPromise = supabase
            .from("admin")
            .select("role")
            .eq("id", userData.id)
            .single();

          // Then check company_user table
          const companyUserPromise = supabase
            .from("company_user")
            .select("role")
            .eq("id", userData.id)
            .single();

          // Run both queries in parallel for better performance
          const [adminResult, companyUserResult] = await Promise.all([
            adminPromise,
            companyUserPromise,
          ]);

          return {
            data: {
              adminData: adminResult.data,
              companyUserData: companyUserResult.data,
            },
            error: null,
          };
        };

        const roleResult = await cachedQuery<any>(
          fetchRole,
          roleCacheKey,
          { forceRefresh: true } // Always get fresh role data on login
        );

        let role = null;
        const { adminData, companyUserData } = roleResult.data;

        if (adminData && adminData.role) {
          role = adminData.role;
        } else if (companyUserData && companyUserData.role) {
          role = companyUserData.role;
        }

        console.log("Retrieved user role:", role);

        // Generate JWT token with user data for more secure approach
        const tokenData = {
          id: userData.id,
          email: userData.email,
          role,
        };

        const token = await generateJWT(tokenData);
        console.log("Generated token for authentication");

        // Remove password_hash from user data before storing
        const { password_hash, ...userDataWithoutPassword } = userData;

        // Add role to userData for easier access
        const userDataWithRole = {
          ...userDataWithoutPassword,
          role,
        };

        console.log("Calling authenticate with user data");
        await authenticate(token, userDataWithRole);

        console.log("Sign-in process completed successfully");
        return { error: null };
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

        console.log(`Reset email sent to ${email} successfully`);
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
