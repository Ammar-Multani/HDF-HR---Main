# Setting Up Row Level Security (RLS) for Supabase

This guide explains how to properly configure Row Level Security (RLS) policies in your Supabase project to work with custom JWT authentication.

## What is Row Level Security?

Row Level Security (RLS) is a feature in PostgreSQL that allows you to restrict access to rows in a table based on the identity of the user executing a query. In simpler terms, it ensures users can only see and modify data they're authorized to access.

## Prerequisites

Before setting up RLS, ensure you have:

1. A Supabase project with tables created
2. Custom JWT authentication implemented
3. JWT secret configured in your environment variables

## RLS Setup Steps

### 1. Configure Environment Variables

Make sure your `.env` file includes your JWT secret:

```
EXPO_PUBLIC_JWT_SECRET=g5jFRZ2lCN678CxS81yKGDRIjTHcLwSP/2bZTkfxmoU=
```

### 2. Update Your JWT Generation

The `utils/auth.ts` file should be using the environment variable for the JWT secret:

```typescript
// Use environment variable for JWT secret
const jwtSecret = EXPO_PUBLIC_JWT_SECRET;
```

### 3. Apply RLS Policies

Run the script to apply RLS policies to your Supabase project:

```bash
yarn apply-rls
```

This script will:

- Check if Supabase CLI is installed
- Confirm before applying changes
- Apply the consolidated RLS policies from the `supabase/migrations/consolidated_rls_policies.sql` file

### 4. Configure JWT Secret in Supabase Dashboard

After applying the RLS policies, you need to configure the JWT secret in your Supabase project:

1. Go to Supabase Dashboard -> Project Settings -> API
2. Find the JWT Settings section
3. Enable JWT verification
4. Enter the same JWT secret that you have in your `.env` file (EXPO_PUBLIC_JWT_SECRET)
5. Save the settings

### 5. Test Your RLS Policies

To test if your RLS policies are working correctly:

1. Log in with a regular user and attempt to access data they should and shouldn't be able to see
2. Log in with a company admin and verify they can only see data for their company
3. Log in as a super admin and verify they can access all data

## Understanding the RLS Policies

Our RLS policy setup includes:

### Performance Optimizations

The following optimizations have been applied to prevent infinite recursion and improve performance:

1. **Function Result Caching**: All function calls are wrapped in `SELECT` statements to cache results

   ```sql
   -- Instead of:
   public.is_super_admin()

   -- We use:
   (SELECT public.is_super_admin())
   ```

2. **Indexes for RLS Columns**: Created indexes on all columns used in RLS policies

   ```sql
   CREATE INDEX IF NOT EXISTS idx_users_id ON public.users(id);
   CREATE INDEX IF NOT EXISTS idx_admin_id ON public.admin(id);
   CREATE INDEX IF NOT EXISTS idx_admin_role ON public.admin(role);
   CREATE INDEX IF NOT EXISTS idx_company_user_id ON public.company_user(id);
   CREATE INDEX IF NOT EXISTS idx_company_user_company_id ON public.company_user(company_id);
   CREATE INDEX IF NOT EXISTS idx_company_user_role ON public.company_user(role);
   ```

3. **Security Definer Functions**: All helper functions use `SECURITY DEFINER` to bypass RLS checks within the function

4. **Direct Queries in Functions**: Use direct table access in functions to avoid recursive RLS checks

5. **Array Functions for Multiple Values**: Use `ANY` with arrays for better performance when checking multiple values

   ```sql
   company_id = ANY((SELECT public.get_user_companies()))
   ```

6. **EXISTS Instead of IN**: Use `EXISTS` for better performance than `IN` where possible

7. **Explicit Role Specification**: All policies explicitly specify `TO authenticated` to avoid unnecessary processing for anonymous users

### Helper Functions

- `get_current_user_id()`: Extracts the user ID from the JWT
- `is_super_admin()`: Checks if the current user is a super admin
- `get_user_companies()`: Gets an array of company IDs the user belongs to
- `get_user_company_id()`: Gets the primary company ID of the current user
- `is_company_admin()`: Checks if the current user is a company admin

### Policies by Table

#### Users Table

- Everyone can query users for authentication (authenticated users only)
- Users can view and update their own data
- Super admins can do everything
- Company admins can see users from their company

#### Admin Table

- Super admins have full access
- Admins can read their own data

#### Company Table

- Super admins have full access
- Company admins can read their own company

#### Company User Table

- Super admins have full access
- Company admins can manage users in their company
- Users can read their own company user record

## Troubleshooting

### "Infinite recursion detected in policy" Errors

If you encounter this error, check for:

1. **Self-referencing policies**: RLS policies that query the same table they're protecting can cause recursion

   ```sql
   -- Problematic (recursion):
   CREATE POLICY "policy_name" ON table_name
   USING (
     id IN (SELECT id FROM table_name WHERE user_id = auth.uid())
   );

   -- Better (no recursion):
   CREATE POLICY "policy_name" ON table_name
   USING (
     id IN (SELECT get_user_authorized_ids())
   );
   ```

2. **Circular policy references**: Policies across tables that reference each other can cause recursion

   ```sql
   -- Fix by using security definer functions that bypass RLS
   CREATE OR REPLACE FUNCTION check_authorization()
   RETURNS BOOLEAN AS $$
   BEGIN
     -- Direct table access bypasses RLS
     RETURN EXISTS (SELECT 1 FROM ...);
   END;
   $$ LANGUAGE plpgsql SECURITY DEFINER;
   ```

3. **Function calls on each row**: Always cache function results with `SELECT`

   ```sql
   -- Instead of:
   USING (function_call(column))

   -- Use:
   USING (column = (SELECT function_result()))
   ```

### "Permission denied" Errors

If you're getting "permission denied" errors when trying to access data:

1. Check that the JWT is being properly sent with requests:

   ```typescript
   const client = await getAuthenticatedClient();
   const { data, error } = await client.from("table_name").select("*");
   ```

2. Verify the JWT structure matches the expected format:
   ```json
   {
     "sub": "user_id_uuid",
     "email": "user_email",
     "role": "user_role",
     "iat": timestamp,
     "exp": expiry_timestamp,
     "iss": "hdfhr"
   }
   ```

### Testing RLS Policies Directly

You can test your RLS policies directly in the Supabase SQL editor:

```sql
-- Set the role to authenticate
SET LOCAL ROLE authenticated;

-- Set the request.jwt.claims variable to simulate a JWT
SET LOCAL request.jwt.claims TO '{"sub":"user-id-here", "role":"user-role-here"}';

-- Try to query a protected table
SELECT * FROM users;
```

### Measuring RLS Performance

To measure the performance impact of your RLS policies:

```sql
-- Enable timing
\timing on

-- Set role and JWT claims
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"your-user-id-here"}';

-- Run query with EXPLAIN ANALYZE to see performance
EXPLAIN ANALYZE SELECT * FROM your_table LIMIT 10;
```

## Maintaining RLS Policies

When making changes to your RLS policies:

1. Edit the `supabase/migrations/consolidated_rls_policies.sql` file
2. Run `yarn apply-rls` to apply the changes
3. Test thoroughly to ensure the changes work as expected

Remember that RLS policies are crucial for your application's security. Always test thoroughly after making changes.
