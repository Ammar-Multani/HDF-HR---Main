# Configuring JWT in Supabase Dashboard

Since the SQL commands for JWT configuration cannot run inside transaction blocks in the SQL Editor, here's how to configure JWT settings directly in the Supabase dashboard:

## JWT Secret Configuration

1. Open your Supabase project dashboard
2. Go to **Project Settings** in the left sidebar
3. Click on **API** in the settings menu
4. Scroll down to the **JWT Settings** section
5. In the **JWT Secret** field, enter your JWT secret:
   ```
   g5jFRZ21CM678CxS81yKGDRIjTHcLwSP/2bZTkfxwqU=
   ```
6. Click **Save** to apply the changes

![JWT Secret Configuration](https://i.imgur.com/example-image.png)

## Additional JWT Settings (Optional)

For additional JWT claim configuration that can't be set via the dashboard, you'll need to run single commands in the SQL Editor:

1. Go to the **SQL Editor** in your Supabase dashboard
2. Run each of these commands **individually** (one at a time):

```sql
-- Set the JWT claim that contains the user ID
ALTER SYSTEM SET jwt.claim.sub TO 'sub';
```

```sql
-- Set the expiration claim name
ALTER SYSTEM SET jwt.exp_claim TO 'exp';
```

```sql
-- Set the role claim name
ALTER SYSTEM SET jwt.claim.role TO 'role';
```

```sql
-- Reload configurations to apply changes
SELECT pg_reload_conf();
```

3. After running each command, click **Run** and wait for the command to complete before running the next one.

## Verify JWT Settings

To verify your JWT settings are correctly applied:

```sql
SELECT name, setting, category
FROM pg_settings
WHERE name LIKE 'jwt%';
```

This should show all your JWT-related settings with their current values.

## Apply RLS Policies

After configuring the JWT settings, run the `scripts/fix-rls-policies.sql` script to apply the simplified RLS policies that work with your JWT configuration.

## Test JWT Authentication

Use the Test screen in your app to generate a valid JWT token, then test it using the JWT verification SQL in `scripts/test-jwt-auth.sql`.
