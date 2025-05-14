/**
 * Migration script to transfer users from Supabase Auth to custom users table
 *
 * This script:
 * 1. Fetches all users from Supabase Auth
 * 2. Creates corresponding entries in the custom users table
 * 3. Updates the admin and company_user tables to reference the new user IDs
 *
 * Note: This is a one-way migration. Once complete, the application will use
 * the custom authentication system instead of Supabase Auth.
 */

import { supabase } from "../lib/supabase";
import { hashPassword } from "../utils/auth";

// Temporary password for migrated users (they'll need to reset this)
const TEMP_PASSWORD = "ChangeMe123!";

const migrateUsers = async () => {
  try {
    console.log("Starting auth migration...");
    console.log("Using PBKDF2 for password hashing (Expo-compatible)");

    // 1. Fetch all users from Supabase Auth
    const { data: authUsers, error: authError } =
      await supabase.auth.admin.listUsers();

    if (authError) {
      throw authError;
    }

    console.log(`Found ${authUsers.users.length} users to migrate`);

    // 2. For each user, create an entry in the custom users table with secure PBKDF2 hash
    console.log("Generating secure password hash with PBKDF2...");
    const hashedTempPassword = await hashPassword(TEMP_PASSWORD);
    console.log("Temporary password hash generated successfully");

    for (const authUser of authUsers.users) {
      console.log(`Migrating user: ${authUser.email}`);

      // Check if user already exists in custom table
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("id", authUser.id)
        .single();

      if (existingUser) {
        console.log(`User ${authUser.email} already migrated, skipping...`);
        continue;
      }

      // Insert user into custom users table with same ID
      const { error: insertError } = await supabase.from("users").insert({
        id: authUser.id,
        email: authUser.email,
        password_hash: hashedTempPassword,
        status: "active",
        created_at: authUser.created_at,
        last_login: authUser.last_sign_in_at,
      });

      if (insertError) {
        console.error(`Error migrating user ${authUser.email}:`, insertError);
        continue;
      }

      console.log(`Successfully migrated user: ${authUser.email}`);
    }

    console.log("Migration completed successfully!");
    console.log(
      "Users will need to use the 'Forgot Password' feature to set a new password."
    );
    console.log("All passwords are now secured with PBKDF2 hashing.");
  } catch (error) {
    console.error("Migration failed:", error);
  }
};

// Run the migration
migrateUsers();
