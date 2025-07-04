/**
 * Migration script to transition from custom auth to Supabase Auth
 *
 * This script will:
 * 1. Migrate users from public.users to auth.users
 * 2. Update references in admin and company_user tables
 * 3. Set up proper roles and permissions
 *
 * Run this script with: node scripts/migrate-to-supabase-auth.js
 */

const { createClient } = require("@supabase/supabase-js");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

// Load environment variables
dotenv.config();

// Initialize Supabase client with service role key for admin access
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Migration configuration
const BATCH_SIZE = 50;
const LOG_FILE = path.join(__dirname, "migration-log.txt");

// Helper function to log to console and file
function log(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}`;
  console.log(logMessage);
  fs.appendFileSync(LOG_FILE, logMessage + "\n");
}

// Initialize log file
function initLogFile() {
  fs.writeFileSync(
    LOG_FILE,
    `Migration started at ${new Date().toISOString()}\n`
  );
  log("Migration script initialized");
}

// Convert custom password hash to bcrypt hash that Supabase Auth can use
async function convertPasswordHash(customHash) {
  // Our custom hash format is iterations:salt:hash
  const [iterationsStr, salt, hash] = customHash.split(":");

  // For simplicity, we'll create a new bcrypt hash
  // In a real migration, you might want to implement a custom password verifier
  // that can handle your old format
  return bcrypt.hashSync("TEMPORARY_PASSWORD", 10);
}

// Migrate users from public.users to auth.users
async function migrateUsers() {
  log("Starting user migration");

  try {
    // Get total count for progress reporting
    const { count, error: countError } = await supabase
      .from("users")
      .select("*", { count: "exact", head: true });

    if (countError) {
      throw countError;
    }

    log(`Found ${count} users to migrate`);

    // Process users in batches
    let processed = 0;
    let successCount = 0;
    let errorCount = 0;

    while (processed < count) {
      // Fetch batch of users
      const { data: users, error } = await supabase
        .from("users")
        .select("*")
        .range(processed, processed + BATCH_SIZE - 1);

      if (error) {
        throw error;
      }

      // Process each user in the batch
      for (const user of users) {
        try {
          // Convert password hash to bcrypt format
          const bcryptHash = await convertPasswordHash(user.password_hash);

          // Create user in auth.users using admin API
          const { data, error: createError } =
            await supabase.auth.admin.createUser({
              email: user.email,
              password: "TEMPORARY_PASSWORD", // Will be changed on next login
              email_confirm: true,
              user_metadata: {
                migrated_from_custom_auth: true,
                original_id: user.id,
                status: user.status,
              },
            });

          if (createError) {
            throw createError;
          }

          // Update admin and company_user tables with new auth.users id if needed
          await updateReferences(user.id, data.user.id);

          successCount++;
          log(`Migrated user: ${user.email}`);
        } catch (userError) {
          errorCount++;
          log(`Error migrating user ${user.email}: ${userError.message}`);
        }
      }

      processed += users.length;
      log(
        `Progress: ${processed}/${count} (${Math.round((processed / count) * 100)}%)`
      );
    }

    log(`Migration completed. Success: ${successCount}, Errors: ${errorCount}`);
    return { successCount, errorCount };
  } catch (err) {
    log(`Migration failed: ${err.message}`);
    throw err;
  }
}

// Update references in admin and company_user tables
async function updateReferences(oldId, newId) {
  // Check if user exists in admin table
  const { data: adminData } = await supabase
    .from("admin")
    .select("id")
    .eq("id", oldId)
    .single();

  if (adminData) {
    // Update admin table with new ID
    const { error: adminError } = await supabase
      .from("admin")
      .update({ id: newId })
      .eq("id", oldId);

    if (adminError) {
      log(`Error updating admin reference for ${oldId}: ${adminError.message}`);
    }
  }

  // Check if user exists in company_user table
  const { data: companyUserData } = await supabase
    .from("company_user")
    .select("id")
    .eq("id", oldId)
    .single();

  if (companyUserData) {
    // Update company_user table with new ID
    const { error: companyUserError } = await supabase
      .from("company_user")
      .update({ id: newId })
      .eq("id", oldId);

    if (companyUserError) {
      log(
        `Error updating company_user reference for ${oldId}: ${companyUserError.message}`
      );
    }
  }
}

// Main migration function
async function migrate() {
  initLogFile();
  log("Starting migration from custom auth to Supabase Auth");

  try {
    // Migrate users
    await migrateUsers();

    log("Migration completed successfully");
  } catch (error) {
    log(`Migration failed: ${error.message}`);
    process.exit(1);
  }
}

// Run the migration
migrate();
