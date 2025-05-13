import * as React from "react";
import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
} from "react";
import { supabase, getAuthenticatedClient } from "../lib/supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { UserRole } from "../types";
import {
  hashPassword,
  validatePassword,
  generateResetToken,
  generateJWT,
  storeAuthToken,
  getAuthToken,
  removeAuthToken,
  getValidToken,
  verifyJWT,
} from "../utils/auth";

// Default super admin credentials
const DEFAULT_ADMIN_EMAIL = "admin@businessmanagement.com";
const DEFAULT_ADMIN_PASSWORD = "Admin@123";

// User data storage key
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
    console.log("Authentication starting...", {
      token: token.substring(0, 10) + "...",
      userData,
    });

    setSession({ access_token: token });
    setUser(userData);

    try {
      // Store auth token securely
      await storeAuthToken(token);

      // Store user data
      await AsyncStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));

      console.log("Authentication data stored securely");

      // Update user role
      await fetchUserRole(userData.id);
    } catch (error) {
      console.error("Authentication error:", error);
    }
  };

  // Initialize the auth state on startup
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      try {
        // Check for existing token
        const token = await getValidToken();

        if (!token) {
          // If no valid token, check if this is first run
          await checkFirstTimeSetup();
          setLoading(false);
          return;
        }

        // Verify token
        const tokenData = await verifyJWT(token);
        if (!tokenData || !tokenData.sub) {
          // Invalid token
          await signOut();
          return;
        }

        // Get stored user data
        const storedUserStr = await AsyncStorage.getItem(USER_DATA_KEY);
        if (!storedUserStr) {
          await signOut();
          return;
        }

        const storedUser = JSON.parse(storedUserStr);

        // Set auth state
        setSession({ access_token: token });
        setUser(storedUser);
        await fetchUserRole(tokenData.sub as string);
      } catch (error) {
        console.error("Error initializing auth:", error);
        await signOut();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // Check if this is the first time setup
  const checkFirstTimeSetup = async () => {
    try {
      // Check if admin exists
      const { data: adminData, error: adminError } = await supabase
        .from("admin")
        .select("count")
        .single();

      if (adminError) {
        console.error("Error checking admin count:", adminError);
        setIsFirstTimeSetup(false);
        return;
      }

      // If no admin records, it's first time setup
      setIsFirstTimeSetup(adminData.count === 0);
    } catch (error) {
      console.error("First time setup check error:", error);
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

      // For debugging - log the user roles enum
      console.log("UserRole enum values:", UserRole);

      // First check if user is a super admin
      console.log("Checking admin role directly...");

      try {
        const { data: adminData, error: adminError } = await supabase
          .from("admin")
          .select("role, status")
          .eq("id", userId);

        console.log("Admin check result:", {
          adminData,
          adminError: adminError ? adminError.message : null,
        });

        if (adminData && adminData.length > 0 && adminData[0].role) {
          const role = adminData[0].role.toLowerCase();
          const status = adminData[0].status;
          console.log(
            "User is an admin with raw role value:",
            role,
            "status:",
            status
          );

          // Only assign role if status is active or true
          if (
            role === "superadmin" &&
            (status === "active" || status === true || status === "true")
          ) {
            console.log("Setting role to SUPER_ADMIN");
            setUserRole(UserRole.SUPER_ADMIN);
            setLoading(false);
            return;
          } else {
            console.log(
              "Admin account not active or has invalid status:",
              status
            );
          }
        }
      } catch (adminCheckError) {
        console.error("Error checking admin role:", adminCheckError);
      }

      // If not a super admin, check if user is a company user
      console.log("Checking company user role directly...");

      try {
        const { data: companyUserData, error: companyUserError } =
          await supabase
            .from("company_user")
            .select("role, active_status")
            .eq("id", userId);

        console.log("Company user check result:", {
          companyUserData,
          companyUserError: companyUserError ? companyUserError.message : null,
        });

        if (
          companyUserData &&
          companyUserData.length > 0 &&
          companyUserData[0].role
        ) {
          const role = companyUserData[0].role.toLowerCase();
          const status = companyUserData[0].active_status;
          console.log(
            "User is a company user with raw role value:",
            role,
            "status:",
            status
          );

          // Only assign role if status is active
          if (status === "active" || status === true || status === "true") {
            // Map string role to enum
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
            console.log("Company user account not active, status:", status);
            setUserRole(null);
          }
        } else {
          console.log("User has no role assigned");
          setUserRole(null);
        }
      } catch (companyUserCheckError) {
        console.error(
          "Error checking company user role:",
          companyUserCheckError
        );
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
        return { error: { message: "Invalid email or password" } };
      }

      // Validate password
      console.log("Validating password...");
      const isPasswordValid = await validatePassword(
        password,
        userData.password_hash
      );

      console.log("Password validation result:", { isValid: isPasswordValid });

      if (!isPasswordValid) {
        console.log("Sign-in failed: Invalid password");
        return { error: { message: "Invalid email or password" } };
      }

      if (userData.status !== "active") {
        console.log(
          "Sign-in failed: Account not active, status:",
          userData.status
        );
        return { error: { message: "Account is not active" } };
      }

      console.log("Sign-in successful, updating last login");

      // Update last login time using regular client since RLS is disabled
      await supabase
        .from("users")
        .update({ last_login: new Date().toISOString() })
        .eq("id", userData.id);

      // First, check if user has a role
      let role = null;

      // Check admin table
      const { data: adminData } = await supabase
        .from("admin")
        .select("role")
        .eq("id", userData.id);

      if (adminData && adminData.length > 0 && adminData[0].role) {
        role = adminData[0].role;
      } else {
        // Check company_user table
        const { data: companyUserData } = await supabase
          .from("company_user")
          .select("role")
          .eq("id", userData.id);

        if (
          companyUserData &&
          companyUserData.length > 0 &&
          companyUserData[0].role
        ) {
          role = companyUserData[0].role;
        }
      }

      console.log("Retrieved user role:", role);

      // Generate a proper JWT token for RLS
      console.log("Generating JWT token with user data:", {
        id: userData.id,
        email: userData.email,
        role: role || "user",
      });

      try {
        const jwtToken = await generateJWT({
          id: userData.id,
          email: userData.email,
          role: role || "user",
        });

        console.log("JWT token generation successful");

        // Verify the token immediately to catch any signature issues
        console.log("Verifying JWT token immediately after generation");
        const verifiedToken = await verifyJWT(jwtToken);

        if (!verifiedToken) {
          console.error("JWT verification failed immediately after creation");
          return {
            error: { message: "Authentication error: token validation failed" },
          };
        }

        console.log("JWT verification successful, payload:", {
          sub: verifiedToken.sub,
          role: verifiedToken.role,
        });

        console.log("Generated JWT token for authentication");

        // Remove password_hash from user data before storing
        const { password_hash, ...userDataWithoutPassword } = userData;

        // Add role to userData for easier access
        const userDataWithRole = {
          ...userDataWithoutPassword,
          role,
        };

        console.log(
          "Calling authenticate with user data including role:",
          userDataWithRole
        );
        await authenticate(jwtToken, userDataWithRole);

        console.log("Sign-in process completed successfully");
        return { error: null };
      } catch (error: any) {
        console.error("JWT generation failed:", error);
        return { error };
      }
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
      // Clear stored session and user data
      await removeAuthToken();
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

      // Get authenticated client for RLS
      const supabaseAuth = await getAuthenticatedClient();

      // Save the reset token directly to users table
      const { error: updateError } = await supabaseAuth
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

      // Get authenticated client for RLS
      const supabaseAuth = await getAuthenticatedClient();

      // Update password and clear reset token directly in users table
      const { error } = await supabaseAuth
        .from("users")
        .update({
          password_hash: hashedPassword,
          reset_token: null,
          reset_token_expires: null,
          updated_at: new Date().toISOString(),
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
