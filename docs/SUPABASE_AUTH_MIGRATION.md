# Migrating to Supabase Auth

This document outlines the steps to migrate from our custom authentication system to Supabase Auth.

## Overview

The migration involves:

1. Setting up Supabase Auth
2. Migrating users from `public.users` to `auth.users`
3. Updating references in `admin` and `company_user` tables
4. Updating the application code to use Supabase Auth

## Prerequisites

- Supabase project with service role key
- Node.js and npm/yarn installed
- Access to the database

## Step 1: Install Dependencies

```bash
yarn add bcryptjs dotenv
```

## Step 2: Configure Environment Variables

Create a `.env` file in the project root (if not already present):

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Step 3: Run the Migration Script

```bash
node scripts/migrate-to-supabase-auth.js
```

This script will:

- Migrate users from `public.users` to `auth.users`
- Update references in `admin` and `company_user` tables
- Log the migration process to `scripts/migration-log.txt`

## Step 4: Update Application Code

The following files have been updated to use Supabase Auth:

- `contexts/AuthContext.tsx`
- `utils/auth.ts`
- `screens/auth/LoginScreen.tsx`
- `screens/auth/RegisterScreen.tsx`
- `screens/auth/ForgotPasswordScreen.tsx`
- `screens/auth/ResetPasswordScreen.tsx`

## Step 5: Test the Migration

1. Test login with existing accounts
2. Test registration of new accounts
3. Test password reset flow
4. Verify that user roles work correctly

## Step 6: Handle Password Reset for Migrated Users

Since we cannot migrate password hashes directly to Supabase Auth, users will need to reset their passwords on first login after migration. The migration script sets a temporary password, but users should be prompted to change it.

## Database Schema Changes

The migration relies on the following schema:

### Foreign Key Updates

Foreign keys in the following tables now reference `auth.users(id)` instead of `public.users(id)`:

- `public.admin`
- `public.company_user`
- `public.activity_logs`
- `public.employee_documents`

### Role-Based Access

User roles are still stored in:

- `public.admin.role` for admin users
- `public.company_user.role` for company users and employees

## Troubleshooting

### Common Issues

1. **User cannot log in after migration**

   - Check if the user exists in `auth.users`
   - The user may need to reset their password

2. **Role not being recognized**

   - Verify that the user ID in `admin` or `company_user` matches the ID in `auth.users`

3. **Foreign key constraint errors**
   - Check that all references to user IDs have been updated

## Rollback Plan

If issues arise, you can temporarily revert to the custom authentication system by:

1. Restoring the original code files from version control
2. Ensuring the `public.users` table is still intact

## Support

For any issues during migration, contact the development team.
