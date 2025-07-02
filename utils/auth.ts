import * as Crypto from "expo-crypto";
import { t } from "i18next";


/**
 * Generates a secure random token for password reset
 */
export const generateResetToken = async (): Promise<string> => {
  const randomBytes = await Crypto.getRandomBytesAsync(32);
  return Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

/**
 * Validates an email format
 */
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates password strength
 * Requirements:
 * - At least 8 characters
 * - Contains at least one uppercase letter
 * - Contains at least one lowercase letter
 * - Contains at least one number
 */
export const validatePasswordStrength = (
  password: string
): { valid: boolean; message: string } => {
  if (password.length < 8) {
    return {
      valid: false,
      message: "Password must be at least 8 characters long",
    };
  }

  if (!/[A-Z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one uppercase letter",
    };
  }

  if (!/[a-z]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one lowercase letter",
    };
  }

  if (!/[0-9]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one number",
    };
  }

  return { valid: true, message: "Password is strong" };
};

// Interfaces for checking user status
export interface AdminUser {
  id: string;
  email: string;
  role: string;
  status: boolean; // boolean for superadmin
  table: "admin";
}

export interface CompanyUser {
  id: string;
  email: string;
  role: string;
  active_status: string; // 'active' | 'inactive' for company users
  table: "company_user";
}

export type UserStatus = {
  isActive: boolean;
  message: string;
};

// Add this function after the existing functions
export const checkUserStatus = async (
  adminData: AdminUser | null,
  companyUserData: CompanyUser | null
): Promise<UserStatus> => {
  // Check admin status first
  if (adminData && adminData.role.toLowerCase() === "superadmin") {
    return {
      isActive: adminData.status === true,
      message: adminData.status
        ? "Active"
        : "Account is inactive. Please contact system support.",
    };
  }

  // Check company user status
  if (companyUserData) {
    return {
      isActive: companyUserData.active_status === "active",
      message:
        companyUserData.active_status === "active"
          ? t("login.active")
          : t("login.accountInactiveMessage"),
    };
  }

  return {
    isActive: false,
    message: t("login.userNotFound"),
  };
};
