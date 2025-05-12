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
} from "../utils/auth";

// Default super admin credentials
const DEFAULT_ADMIN_EMAIL = "admin@businessmanagement.com";
const DEFAULT_ADMIN_PASSWORD = "Admin@123";

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
  resetPassword: (newPassword: string) => Promise<{ error: any }>;
  isFirstTimeSetup: boolean;
  setupDefaultAdmin: () => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<any | null>(null);
  const [user, setUser] = useState<any | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFirstTimeSetup, setIsFirstTimeSetup] = useState(false);

  // Function to handle user authentication
  const authenticate = async (token: string, userData: any) => {
    setSession({ access_token: token });
    setUser(userData);

    // Store auth data in AsyncStorage
    await AsyncStorage.setItem(AUTH_TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));

    // Fetch user role
    if (userData?.id) {
      await fetchUserRole(userData.id);
    }

    setLoading(false);
  };

  useEffect(() => {
    // Check for existing session in AsyncStorage
    const loadStoredSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        const storedUserData = await AsyncStorage.getItem(USER_DATA_KEY);

        if (storedToken && storedUserData) {
          const userData = JSON.parse(storedUserData);
          setSession({ access_token: storedToken });
          setUser(userData);

          if (userData?.id) {
            await fetchUserRole(userData.id);
          }
        } else {
          await checkIfFirstTimeSetup();
        }
      } catch (error) {
        console.error("Error loading stored session:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStoredSession();
  }, []);

  const checkIfFirstTimeSetup = async () => {
    try {
      // Check if any admin exists in the system
      const { data, error, count } = await supabase
        .from("admin")
        .select("*", { count: "exact" });

      if (count === 0) {
        setIsFirstTimeSetup(true);
      } else {
        setIsFirstTimeSetup(false);
      }
    } catch (error) {
      console.error("Error checking first time setup:", error);
      setIsFirstTimeSetup(false);
    }
  };

  const setupDefaultAdmin = async () => {
    setLoading(true);
    try {
      // Hash the password
      const hashedPassword = await hashPassword(DEFAULT_ADMIN_PASSWORD);

      // Create the default admin in your custom users table
      const { data: userData, error: userError } = await supabase
        .from("users")
        .insert({
          email: DEFAULT_ADMIN_EMAIL,
          password_hash: hashedPassword,
          status: "active",
        })
        .select("id")
        .single();

      if (userError) {
        setLoading(false);
        return { error: userError };
      }

      // Add the user to the admin table with super admin role
      const { error: adminError } = await supabase.from("admin").insert({
        id: userData.id,
        email: DEFAULT_ADMIN_EMAIL,
        role: UserRole.SUPER_ADMIN,
        name: "System Administrator",
        status: "active",
      });

      if (adminError) {
        setLoading(false);
        return { error: adminError };
      }

      // Auto sign in with the default admin
      return await signIn(DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD);
    } catch (error) {
      setLoading(false);
      return { error };
    }
  };

  const fetchUserRole = async (userId: string) => {
    try {
      console.log("Fetching user role for ID:", userId);

      // First check if user is a super admin
      const { data: adminData, error: adminError } = await supabase
        .from("admin")
        .select("role")
        .eq("id", userId)
        .single();

      console.log("Admin check result:", { adminData, adminError });

      if (adminData) {
        console.log("User is an admin with role:", adminData.role);
        setUserRole(adminData.role as UserRole);
        setLoading(false);
        return;
      }

      // If not a super admin, check if user is a company user
      const { data: companyUserData, error: companyUserError } = await supabase
        .from("company_user")
        .select("role")
        .eq("id", userId)
        .single();

      console.log("Company user check result:", {
        companyUserData,
        companyUserError,
      });

      if (companyUserData) {
        console.log("User is a company user with role:", companyUserData.role);
        setUserRole(companyUserData.role as UserRole);
      } else {
        console.log("User has no role assigned");
        setUserRole(null);
      }
    } catch (error) {
      console.error("Error fetching user role:", error);
      setUserRole(null);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      // Find user by email
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, email, password_hash, status")
        .eq("email", email)
        .single();

      if (userError || !userData) {
        return { error: { message: "Invalid email or password" } };
      }

      // Validate password
      const isPasswordValid = await validatePassword(
        password,
        userData.password_hash
      );

      if (!isPasswordValid) {
        return { error: { message: "Invalid email or password" } };
      }

      if (userData.status !== "active") {
        return { error: { message: "Account is not active" } };
      }

      // Update last login time
      await supabase
        .from("users")
        .update({ last_login: new Date().toISOString() })
        .eq("id", userData.id);

      // Generate a token (in a real implementation, do this server-side)
      const token = `user-token-${userData.id}-${Date.now()}`;

      // Remove password_hash from user data before storing
      const { password_hash, ...userDataWithoutPassword } = userData;

      await authenticate(token, userDataWithoutPassword);

      return { error: null };
    } catch (error: any) {
      console.error("Sign in error:", error);
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

      // Save the reset token
      await supabase
        .from("users")
        .update({
          reset_token: resetToken,
          reset_token_expires: expiration.toISOString(),
        })
        .eq("id", userData.id);

      // In a real app, send email with reset link
      // For demo purposes, just console log
      console.log(`Reset token for ${email}: ${resetToken}`);

      return { error: null };
    } catch (error: any) {
      console.error("Forgot password error:", error);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (newPassword: string) => {
    setLoading(true);
    try {
      if (!user?.id) {
        return { error: { message: "No authenticated user" } };
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
        })
        .eq("id", user.id);

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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
