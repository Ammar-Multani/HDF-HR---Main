import * as React from "react";
import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { supabase } from "../lib/supabase";
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

// Auth token constants
const AUTH_TOKEN_KEY = "auth_token";
const USER_DATA_KEY = "user_data";

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to handle user authentication
  const authenticate = async (token: string, userData: any) => {
    console.log("Authentication starting...", {
      token: token.substring(0, 10) + "...",
      userData,
    });

    setSession({ access_token: token });
    setUser(userData);

    try {
      // Store auth data in AsyncStorage
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
      console.log("Authentication data stored in AsyncStorage");

      // If userData has role, set it directly
      if (userData?.role) {
        console.log("User has role in userData:", userData.role);

        const roleValue = userData.role.toLowerCase();
        if (roleValue === "superadmin") {
          console.log("Setting role to SUPER_ADMIN directly");
          setUserRole(UserRole.SUPER_ADMIN);
        } else if (roleValue === "admin" || roleValue === "companyadmin") {
          console.log("Setting role to COMPANY_ADMIN directly");
          setUserRole(UserRole.COMPANY_ADMIN);
        } else if (roleValue === "employee") {
          console.log("Setting role to EMPLOYEE directly");
          setUserRole(UserRole.EMPLOYEE);
        } else {
          console.log("Unknown role value, fetching from database:", roleValue);
          // Fetch user role from database
          if (userData?.id) {
            await fetchUserRole(userData.id);
          }
        }
      } else {
        // Fetch user role from database
        if (userData?.id) {
          console.log("No role in userData, fetching from database");
          await fetchUserRole(userData.id);
        }
      }
    } catch (error) {
      console.error("Error in authenticate function:", error);
    }

    console.log("Authentication completed, setting loading to false");
    setLoading(false);
  };

  useEffect(() => {
    // Check for existing session in AsyncStorage
    const loadStoredSession = async () => {
      try {
        console.log("Checking for stored session...");

        // Load token and user data in parallel instead of sequentially
        const [storedToken, storedUserData] = await Promise.all([
          AsyncStorage.getItem(AUTH_TOKEN_KEY),
          AsyncStorage.getItem(USER_DATA_KEY),
        ]);

        console.log("Stored session check result:", {
          hasToken: !!storedToken,
          hasUserData: !!storedUserData,
        });

        if (storedToken && storedUserData) {
          const userData = JSON.parse(storedUserData);
          console.log("Found stored session, restoring...", {
            userId: userData.id,
          });

          // Set session and user state immediately
          setSession({ access_token: storedToken });
          setUser(userData);

          // If user already has a role in stored data, use it directly
          if (userData?.role) {
            console.log("Using role from stored user data:", userData.role);
            setUserRole(userData.role);
            setLoading(false);
          } else if (userData?.id) {
            // Only fetch role from database if not in stored data
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
  }, []);

  const fetchUserRole = async (userId: string) => {
    try {
      console.log("Fetching user role for ID:", userId);

      // Optimized approach: check both tables in parallel
      const [adminResult, companyUserResult] = await Promise.all([
        supabase.from("admin").select("role").eq("id", userId).single(),
        supabase.from("company_user").select("role").eq("id", userId).single(),
      ]);

      const adminData = adminResult.data;
      const companyUserData = companyUserResult.data;

      console.log("Role check results:", {
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
        } else if (role === "employee") {
          console.log("Setting role to EMPLOYEE");
          setUserRole(UserRole.EMPLOYEE);
        } else {
          console.log("Unknown company user role:", role);
          setUserRole(null);
        }
      } else {
        console.log("User has no assigned role");
        setUserRole(null);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Simplified password validation without migration
   */
  const validateUserPassword = async (
    password: string,
    hash: string
  ): Promise<boolean> => {
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
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    console.log("Sign-in attempt for:", email);

    try {
      // Find user by email
      console.log("Looking up user by email...");
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, email, password_hash, status")
        .eq("email", email)
        .single();

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

      // Fetch user role directly in a single step
      let role = null;

      // First check admin table
      const { data: adminData } = await supabase
        .from("admin")
        .select("role")
        .eq("id", userData.id)
        .single();

      if (adminData && adminData.role) {
        role = adminData.role;
      } else {
        // If not in admin table, check company_user table
        const { data: companyUserData } = await supabase
          .from("company_user")
          .select("role")
          .eq("id", userData.id)
          .single();

        if (companyUserData && companyUserData.role) {
          role = companyUserData.role;
        }
      }

      console.log("Retrieved user role:", role);

      // For now, use a simple token
      const simpleToken = `user-token-${userData.id}-${Date.now()}`;
      console.log("Using simple token for authentication");

      // Remove password_hash from user data before storing
      const { password_hash, ...userDataWithoutPassword } = userData;

      // Add role to userData for easier access
      const userDataWithRole = {
        ...userDataWithoutPassword,
        role,
      };

      console.log("Calling authenticate with user data");
      await authenticate(simpleToken, userDataWithRole);

      console.log("Sign-in process completed successfully");
      return { error: null };
    } catch (error: any) {
      console.error("Sign-in error:", error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    try {
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
  };

  const signOut = async () => {
    setLoading(true);
    try {
      // Clear stored session
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
      await AsyncStorage.removeItem(USER_DATA_KEY);

      // Reset state
      setSession(null);
      setUser(null);
      setUserRole(null);
    } catch (error) {
      console.error("Sign out error:", error);
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    setLoading(true);
    try {
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
  };

  const resetPassword = async (newPassword: string, token: string) => {
    setLoading(true);
    try {
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
