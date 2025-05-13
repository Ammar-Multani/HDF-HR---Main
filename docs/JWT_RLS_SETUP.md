# JWT and RLS Setup Guide

This guide provides step-by-step instructions to correctly set up JWT authentication and Row Level Security (RLS) in your Supabase project.

## JWT Configuration

1. **Set up JWT Secret in Supabase Dashboard**

   - Go to your Supabase Dashboard
   - Navigate to Project Settings > API
   - Under "JWT Settings", set the JWT Secret to match your app's JWT secret
   - Your JWT secret: `g5jFRZ21CM678CxS81yKGDRIjTHcLwSP/2bZTkfxwqU=`
   

2. **Apply JWT Settings via SQL**
   - Run the `scripts/setup-jwt.sql` script in the SQL Editor
   - This will configure the JWT claims and reload the configuration

## Verify User Data

1. **Check if users exist in database**
   - Run the `scripts/verify-data.sql` script
   - This will check if the required users exist in the database
   - Should show the following users:
     - Super Admin: 9b493703-31b0-406a-9be2-6a991448a245 (aamultani.enacton@gmail.com)
     - Company Admin: 1687dcac-856a-4d9c-b613-f363934cd445 (test@gmail.com)
     - Employee: 1199b0a6-bcd1-4d28-9748-a1ec96d897cb (test@outlook.com)

## Check RLS Status

1. **Verify RLS is enabled**
   - Run the `scripts/check-rls.sql` script
   - This will show if RLS is enabled on core tables
   - It will also list all existing RLS policies

## Fix RLS Policies

1. **Apply simplified RLS policies**
   - Run the `scripts/fix-rls-policies.sql` script
   - This creates simpler and more direct RLS policies
   - The policies use direct JWT claim access instead of helper functions

## Test JWT Authentication

1. **Test JWT Authentication**
   - Get a valid JWT token from your app (use the Test screen)
   - In the Supabase SQL Editor, run the `scripts/test-jwt-auth.sql` script
   - Before running, add an Authorization header with your JWT token:
     - Click on "User" dropdown in the SQL Editor
     - Select "Request Headers"
     - Add: `Authorization: Bearer your_jwt_token_here`
   - This will verify if Supabase can correctly read the JWT claims

## Troubleshooting

### JWT Not Working

- Make sure the JWT secret in Supabase matches exactly the one in your app
- Ensure the JWT token is correctly formatted (header.payload.signature)
- Check that the 'sub' claim contains a valid UUID that exists in your database
- Verify the token is not expired

### RLS Policies Not Working

- Make sure RLS is enabled on all tables
- Verify that the JWT claim can be accessed using:
  ```sql
  SELECT current_setting('request.jwt.claims', true);
  ```
- Check that the user ID in the JWT sub claim exists in the database
- For specific role issues, verify the relationship in the database:
  - For super admin: check the 'admin' table for the user ID
  - For company admin/employee: check the 'company_user' table

## Using the Test Screen

The app includes a Test screen that checks:

1. JWT generation and verification
2. Database queries for user IDs
3. RLS policy enforcement

To access the Test screen:

- From the login screen, click "Test RLS Policies"
- Or navigate to /test if already logged in

## Important Details

- JWT tokens are valid for 24 hours
- The main JWT claims used are:
  - 'sub': Contains the user's UUID
  - 'role': Contains the user's role (superadmin, admin, employee)
- All database tables have RLS enabled
- The 'service_role' can bypass all RLS policies
 