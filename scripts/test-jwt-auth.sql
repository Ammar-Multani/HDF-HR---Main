-- The purpose of this script is to test JWT authentication in Supabase

-- First, check if the JWT-related settings are properly configured
SELECT name, setting FROM pg_settings WHERE name LIKE 'jwt%';

-- Then verify the get_current_user_id function is working with a mock JWT
-- We need to run this in an anonymous session that sends a fake JWT token
-- You can test this in the Supabase dashboard by setting a header:
-- Authorization: Bearer YOUR_ACTUAL_JWT_TOKEN

-- This simulates what happens when a JWT token is sent
-- Replace this with an actual token from your app
SELECT current_setting('request.jwt.claims', true);

-- This will return the user ID from the current request
-- It should match the value in the 'sub' claim of your JWT
SELECT
  (current_setting('request.jwt.claims', true)::json->>'sub')::uuid as user_id,
  (current_setting('request.jwt.claims', true)::json->>'role') as user_role;

-- Test if our helper function can extract the user ID
-- First create a test function
CREATE OR REPLACE FUNCTION test_get_current_user_id()
RETURNS uuid AS $$
BEGIN
  -- Extract user ID (sub claim) from JWT
  RETURN (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function (will only work if called with a JWT)
SELECT test_get_current_user_id() as extracted_user_id;

-- If the function returns NULL, there might be an issue with the JWT token or configuration
-- Clean up
DROP FUNCTION IF EXISTS test_get_current_user_id(); 