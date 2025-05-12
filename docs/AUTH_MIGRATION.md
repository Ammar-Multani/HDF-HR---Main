# Migrating from Supabase Auth to Custom Authentication

This document outlines the process for migrating your application from Supabase Auth to custom authentication while still using Supabase as the database.

## Overview

The migration involves:

1. Creating a new `users` table in Supabase
2. Updating the authentication logic in the application
3. Running a migration script to move existing users
4. Testing the new authentication system
5. Communicating with users about the change

## Prerequisites

- Supabase project access with admin privileges
- Node.js and npm/yarn installed

## Migration Steps

### 1. Create Custom Users Table

Run the migration SQL script to create the custom users table:

```bash
# Apply the migration
cd supabase
supabase db push
```

### 2. Install Required Dependencies

```bash
yarn add expo-crypto
```

### 3. Run the Migration Script

```bash
# Compile TypeScript
yarn tsc scripts/migrate-auth.ts --outDir dist

# Run the migration
node dist/scripts/migrate-auth.js
```

### 4. Test the Authentication

1. Test login with existing accounts
2. Test the "Forgot Password" flow for users to set up new passwords
3. Test registration of new accounts

### 5. Communication with Users

Send an email to all users explaining:

- The authentication system has been updated
- They will need to use "Forgot Password" to set a new password
- Reassure them that all their data is preserved

## Post-Migration Cleanup

Once the migration is complete and working correctly, you can:

1. Remove Supabase Auth dependencies from package.json
2. Remove Supabase Auth integration from supabase.ts

## Troubleshooting

### Users cannot log in after migration

Users need to reset their passwords using the "Forgot Password" function after migration. This is because we cannot migrate password hashes from Supabase Auth.

### Missing user data

Check if the user ID in the `users` table matches the ID in `admin` or `company_user` tables. The foreign key relationships should be preserved during migration.

### Reset token issues

If users are having issues with password reset, check:

- The reset token generation in `AuthContext.tsx`
- The token expiration time (default: 1 hour)
- Email delivery (check spam folders)

## Security Considerations

The custom authentication system implements:

- Password hashing with SHA-256 (consider upgrading to bcrypt or Argon2)
- Token-based authentication
- Password reset functionality
- Session management

For production environments, consider additional security measures:

- Rate limiting on login attempts
- Multi-factor authentication
- IP-based login restrictions
- Enhanced password requirements
