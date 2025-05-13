-- CONSOLIDATED RLS POLICIES FOR CUSTOM JWT AUTHENTICATION
-- This script sets up Row Level Security for the entire application

-- First, enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_user ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS users_select ON public.users;
DROP POLICY IF EXISTS users_update ON public.users;
DROP POLICY IF EXISTS users_insert ON public.users;
DROP POLICY IF EXISTS admin_superadmin_access ON public.admin;
DROP POLICY IF EXISTS admin_self_read ON public.admin;
DROP POLICY IF EXISTS company_superadmin_all ON public.company;
DROP POLICY IF EXISTS company_admin_read_own ON public.company;
DROP POLICY IF EXISTS company_user_superadmin_all ON public.company_user;
DROP POLICY IF EXISTS company_user_admin_manage_own_company ON public.company_user;
DROP POLICY IF EXISTS company_user_read_self ON public.company_user;
DROP POLICY IF EXISTS bypass_service_role ON public.users;
DROP POLICY IF EXISTS bypass_service_role ON public.admin;
DROP POLICY IF EXISTS bypass_service_role ON public.company;
DROP POLICY IF EXISTS bypass_service_role ON public.company_user;
DROP POLICY IF EXISTS user_auth_policy ON public.users;
DROP POLICY IF EXISTS user_self_update ON public.users;
DROP POLICY IF EXISTS user_self_select ON public.users;
DROP POLICY IF EXISTS superadmin_all ON public.users;
DROP POLICY IF EXISTS temp_allow_updates ON public.users;
DROP POLICY IF EXISTS users_auth_policy ON public.users;
DROP POLICY IF EXISTS users_self_update ON public.users;
DROP POLICY IF EXISTS admin_self_read ON public.admin;
DROP POLICY IF EXISTS company_user_self_read ON public.company_user;
DROP POLICY IF EXISTS admin_superadmin_all ON public.admin;
DROP POLICY IF EXISTS company_user_superadmin_all ON public.company_user;
DROP POLICY IF EXISTS company_user_admin_read ON public.company_user;
DROP POLICY IF EXISTS company_user_admin_manage ON public.company_user;
DROP POLICY IF EXISTS users_public_select ON public.users;
DROP POLICY IF EXISTS users_self_select ON public.users;
DROP POLICY IF EXISTS users_self_update ON public.users;
DROP POLICY IF EXISTS users_superadmin_all ON public.users;
DROP POLICY IF EXISTS users_company_admin_select ON public.users;
DROP POLICY IF EXISTS admin_superadmin_all ON public.admin;
DROP POLICY IF EXISTS admin_self_read ON public.admin;
DROP POLICY IF EXISTS company_superadmin_all ON public.company;
DROP POLICY IF EXISTS company_admin_read ON public.company;
DROP POLICY IF EXISTS company_user_superadmin_all ON public.company_user;
DROP POLICY IF EXISTS company_user_admin_manage ON public.company_user;
DROP POLICY IF EXISTS company_user_self_read ON public.company_user;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.get_current_user_id();
DROP FUNCTION IF EXISTS public.get_user_role();
DROP FUNCTION IF EXISTS public.is_super_admin();
DROP FUNCTION IF EXISTS public.is_company_admin();
DROP FUNCTION IF EXISTS public.get_user_company_id();
DROP FUNCTION IF EXISTS public.get_user_companies();

-- Add indexes to improve RLS performance
CREATE INDEX IF NOT EXISTS idx_users_id ON public.users(id);
CREATE INDEX IF NOT EXISTS idx_admin_id ON public.admin(id);
CREATE INDEX IF NOT EXISTS idx_admin_role ON public.admin(role);
CREATE INDEX IF NOT EXISTS idx_company_user_id ON public.company_user(id);
CREATE INDEX IF NOT EXISTS idx_company_user_company_id ON public.company_user(company_id);
CREATE INDEX IF NOT EXISTS idx_company_user_role ON public.company_user(role);

-- JWT HELPER FUNCTIONS
-- Create function to get current user ID from JWT
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid AS $$
BEGIN
  -- Extract the user ID from the JWT claim
  RETURN nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is super admin
-- Using a direct query approach to avoid recursion
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Get current user ID once to avoid multiple calls
  user_id := (SELECT public.get_current_user_id());
  
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Direct query to admin table without RLS to avoid recursion
  BEGIN
    -- Check if user is a super admin by directly querying admin table
    RETURN EXISTS (
      SELECT 1 
      FROM public.admin 
      WHERE id = user_id AND role = 'superadmin'
    );
  EXCEPTION
    WHEN OTHERS THEN
      RETURN false;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's company IDs as an array
-- This helps optimize queries involving company membership
CREATE OR REPLACE FUNCTION public.get_user_companies()
RETURNS uuid[] AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Get current user ID once to avoid multiple calls
  user_id := (SELECT public.get_current_user_id());
  
  IF user_id IS NULL THEN
    RETURN ARRAY[]::uuid[];
  END IF;
  
  -- Return array of company IDs the user belongs to
  RETURN ARRAY(
    SELECT company_id 
    FROM public.company_user 
    WHERE id = user_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN ARRAY[]::uuid[];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's primary company ID
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid AS $$
DECLARE
  user_id uuid;
  company_id_val uuid;
BEGIN
  -- Get current user ID once to avoid multiple calls
  user_id := (SELECT public.get_current_user_id());
  
  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get first company ID from company_user table
  SELECT company_id INTO company_id_val 
  FROM public.company_user 
  WHERE id = user_id 
  LIMIT 1;
  
  RETURN company_id_val;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is company admin
-- Rewritten to avoid recursion issues
CREATE OR REPLACE FUNCTION public.is_company_admin()
RETURNS boolean AS $$
DECLARE
  user_id uuid;
BEGIN
  -- Get current user ID once to avoid multiple calls
  user_id := (SELECT public.get_current_user_id());
  
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Direct query to company_user table without RLS to avoid recursion
  BEGIN
    -- Check if user is a company admin
    RETURN EXISTS (
      SELECT 1 
      FROM public.company_user 
      WHERE id = user_id AND role = 'admin'
    );
  EXCEPTION
    WHEN OTHERS THEN
      RETURN false;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SERVICE ROLE BYPASS POLICIES
-- Allow service role to bypass RLS for system operations
CREATE POLICY bypass_service_role ON public.users FOR ALL TO service_role USING (true);
CREATE POLICY bypass_service_role ON public.admin FOR ALL TO service_role USING (true);
CREATE POLICY bypass_service_role ON public.company FOR ALL TO service_role USING (true);
CREATE POLICY bypass_service_role ON public.company_user FOR ALL TO service_role USING (true);

-- USERS TABLE POLICIES
-- Public access for login/registration (to authenticated users only)
CREATE POLICY users_public_select ON public.users 
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Users can see their own data
CREATE POLICY users_self_select ON public.users 
  FOR SELECT 
  TO authenticated
  USING (id = (SELECT public.get_current_user_id()));

-- Users can update their own data
CREATE POLICY users_self_update ON public.users 
  FOR UPDATE 
  TO authenticated
  USING (id = (SELECT public.get_current_user_id()));

-- Super admin can do everything with users
CREATE POLICY users_superadmin_all ON public.users 
  FOR ALL 
  TO authenticated
  USING ((SELECT public.is_super_admin()));

-- Company admins can see users from their company
CREATE POLICY users_company_admin_select ON public.users 
  FOR SELECT 
  TO authenticated
  USING (
    (SELECT public.is_company_admin()) AND 
    EXISTS (
      SELECT 1 
      FROM public.company_user cu 
      WHERE cu.email = users.email AND cu.company_id = ANY((SELECT public.get_user_companies()))
    )
  );

-- ADMIN TABLE POLICIES
-- Super admin has full access to admin table
CREATE POLICY admin_superadmin_all ON public.admin 
  FOR ALL 
  TO authenticated
  USING ((SELECT public.is_super_admin()));

-- Admins can read their own record
CREATE POLICY admin_self_read ON public.admin 
  FOR SELECT 
  TO authenticated
  USING (id = (SELECT public.get_current_user_id()));

-- COMPANY TABLE POLICIES
-- Super admin has full access to companies
CREATE POLICY company_superadmin_all ON public.company 
  FOR ALL 
  TO authenticated
  USING ((SELECT public.is_super_admin()));

-- Company admins can read their own company
CREATE POLICY company_admin_read ON public.company 
  FOR SELECT 
  TO authenticated
  USING (id = ANY((SELECT public.get_user_companies())));

-- COMPANY_USER TABLE POLICIES
-- Super admin has full access to all company users
CREATE POLICY company_user_superadmin_all ON public.company_user 
  FOR ALL 
  TO authenticated
  USING ((SELECT public.is_super_admin()));

-- Company admin can manage users in their own company
-- Modified to avoid recursion by directly checking the role
CREATE POLICY company_user_admin_manage ON public.company_user 
  FOR ALL 
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 
      FROM public.company_user cu 
      WHERE cu.id = (SELECT public.get_current_user_id()) 
      AND cu.role = 'admin'
    ) 
    AND company_id = ANY((SELECT public.get_user_companies()))
  );

-- Users can see their own company_user record
CREATE POLICY company_user_self_read ON public.company_user 
  FOR SELECT 
  TO authenticated
  USING (id = (SELECT public.get_current_user_id()));

-- IMPLEMENTATION NOTES:
-- 1. Update your JWT secret in Supabase project settings to match EXPO_PUBLIC_JWT_SECRET
-- 2. All helper functions use (SELECT function()) pattern to cache function results
-- 3. Configure JWT Verification:
--    a. Go to Supabase Dashboard -> Project Settings -> API
--    b. Enable "JWT Verification"
--    c. Set the JWT secret to same value as EXPO_PUBLIC_JWT_SECRET (g5jFRZ2lCN678CxS81yKGDRIjTHcLwSP/2bZTkfxmoU=)
--    d. Ensure the JWT algorithm is set to HS256
-- 4. Make sure your JWT structure matches expected format:
--    {
--      "sub": "user_id_uuid",
--      "email": "user_email",
--      "role": "user_role",
--      "iat": timestamp,
--      "exp": expiry_timestamp,
--      "iss": "hdfhr"
--    }
-- 5. Performance optimizations:
--    - Added indexes on commonly used columns
--    - Used (SELECT function()) pattern to cache function results
--    - Used EXISTS instead of IN for better performance
--    - Used direct queries in functions to avoid recursion
--    - Used ANY with arrays for better performance with multiple values 