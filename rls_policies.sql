-- COMPREHENSIVE RLS POLICIES FOR CUSTOM JWT AUTHENTICATION
-- This script sets up Row Level Security for the entire application
-- with proper handling of custom JWT authentication

-- Configure JWT settings
-- Set the JWT secret used to verify tokens
ALTER SYSTEM SET jwt.secret TO 'g5jFRZ21CM678CxS81yKGDRIjTHcLwSP/2bZTkfxwqU=';

-- The following line is optional and sets the expiration claim name if different from 'exp'
ALTER SYSTEM SET jwt.exp_claim TO 'exp';

-- This sets the JWT claim containing the user ID, matching the 'sub' claim in your token
ALTER SYSTEM SET jwt.claim.sub TO 'sub';

-- Define what roles claim to use if you have role-based policies
ALTER SYSTEM SET jwt.claim.role TO 'role';

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_user ENABLE ROW LEVEL SECURITY;
-- Add others as needed

-- First, drop any existing policies to avoid conflicts
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
DROP POLICY IF EXISTS users_select_self ON public.users;
DROP POLICY IF EXISTS users_select_superadmin ON public.users;
DROP POLICY IF EXISTS users_select_company_admin ON public.users;
DROP POLICY IF EXISTS users_update_self ON public.users;
DROP POLICY IF EXISTS users_update_superadmin ON public.users;
DROP POLICY IF EXISTS users_insert_superadmin ON public.users;
DROP POLICY IF EXISTS users_insert_company_admin ON public.users;
DROP POLICY IF EXISTS admin_self_read ON public.admin;
DROP POLICY IF EXISTS company_admin_read_own ON public.company;
DROP POLICY IF EXISTS company_user_read_self ON public.company_user;
DROP POLICY IF EXISTS company_user_admin_manage ON public.company_user;

-- Clean up any existing helper functions to avoid conflicts
DROP FUNCTION IF EXISTS public.get_current_user_id();
DROP FUNCTION IF EXISTS public.get_user_role();
DROP FUNCTION IF EXISTS public.is_super_admin();
DROP FUNCTION IF EXISTS public.is_company_admin();
DROP FUNCTION IF EXISTS public.is_employee();
DROP FUNCTION IF EXISTS public.get_user_company_id();
DROP FUNCTION IF EXISTS public.get_user_companies();

-- Create indexes to improve RLS performance
CREATE INDEX IF NOT EXISTS idx_users_id ON public.users(id);
CREATE INDEX IF NOT EXISTS idx_admin_id ON public.admin(id);
CREATE INDEX IF NOT EXISTS idx_admin_role ON public.admin(role);
CREATE INDEX IF NOT EXISTS idx_company_user_id ON public.company_user(id);
CREATE INDEX IF NOT EXISTS idx_company_user_company_id ON public.company_user(company_id);
CREATE INDEX IF NOT EXISTS idx_company_user_role ON public.company_user(role);

-- =======================================
-- JWT HELPER FUNCTIONS
-- =======================================

-- Create function to get current user ID from JWT
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid AS $$
BEGIN
  -- Extract user ID (sub claim) from JWT
  RETURN (current_setting('request.jwt.claims', true)::json->>'sub')::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is a super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
DECLARE
  user_id uuid;
BEGIN
  user_id := public.get_current_user_id();
  
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 
    FROM public.admin 
    WHERE id = user_id 
    AND role = 'superadmin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is a company admin
CREATE OR REPLACE FUNCTION public.is_company_admin()
RETURNS boolean AS $$
DECLARE
  user_id uuid;
BEGIN
  user_id := public.get_current_user_id();
  
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 
    FROM public.company_user 
    WHERE id = user_id 
    AND (role = 'admin' OR role = 'companyadmin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is an employee
CREATE OR REPLACE FUNCTION public.is_employee()
RETURNS boolean AS $$
DECLARE
  user_id uuid;
BEGIN
  user_id := public.get_current_user_id();
  
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  RETURN EXISTS (
    SELECT 1 
    FROM public.company_user 
    WHERE id = user_id 
    AND role = 'employee'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get the user's company ID
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid AS $$
DECLARE
  user_id uuid;
  company_id uuid;
BEGIN
  user_id := public.get_current_user_id();
  
  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT cu.company_id INTO company_id
  FROM public.company_user cu
  WHERE cu.id = user_id;
  
  RETURN company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get array of company IDs that a user belongs to
-- (for future multi-company support)
CREATE OR REPLACE FUNCTION public.get_user_companies()
RETURNS uuid[] AS $$
DECLARE
  user_id uuid;
BEGIN
  user_id := public.get_current_user_id();
  
  IF user_id IS NULL THEN
    RETURN '{}';
  END IF;
  
  RETURN ARRAY(
    SELECT company_id
    FROM public.company_user
    WHERE id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =======================================
-- RLS POLICIES
-- =======================================

-- =======================================
-- USERS TABLE POLICIES
-- =======================================

-- Allow public access for login/registration
CREATE POLICY users_select ON public.users 
  FOR SELECT
  USING (true);

-- Users can update their own data
CREATE POLICY users_update ON public.users 
  FOR UPDATE 
  USING (id = public.get_current_user_id());

-- Super admin can do everything with users
CREATE POLICY users_superadmin_all ON public.users 
  FOR ALL 
  USING (public.is_super_admin());

-- Company admins can see users from their company
CREATE POLICY users_company_admin_select ON public.users 
  FOR SELECT 
  USING (
    public.is_company_admin() AND 
    EXISTS (
      SELECT 1 
      FROM public.company_user cu 
      WHERE cu.email = users.email AND cu.company_id = public.get_user_company_id()
    )
  );

-- =======================================
-- ADMIN TABLE POLICIES
-- =======================================

-- Super admin has full access to admin table
CREATE POLICY admin_superadmin_all ON public.admin 
  FOR ALL 
  USING (public.is_super_admin());

-- Admins can read their own record
CREATE POLICY admin_self_read ON public.admin 
  FOR SELECT 
  USING (id = public.get_current_user_id());

-- =======================================
-- COMPANY TABLE POLICIES
-- =======================================

-- Super admin has full access to companies
CREATE POLICY company_superadmin_all ON public.company 
  FOR ALL 
  USING (public.is_super_admin());

-- Company admins can see their own company
CREATE POLICY company_admin_read ON public.company 
  FOR SELECT 
  USING (id = ANY(public.get_user_companies()));

-- Employees can read their own company
CREATE POLICY company_employee_read ON public.company 
  FOR SELECT 
  USING (id = ANY(public.get_user_companies()));

-- =======================================
-- COMPANY_USER TABLE POLICIES
-- =======================================

-- Super admin has full access to all company users
CREATE POLICY company_user_superadmin_all ON public.company_user 
  FOR ALL 
  USING (public.is_super_admin());

-- Company admin can manage users in their own company
CREATE POLICY company_user_admin_manage ON public.company_user 
  FOR ALL 
  USING (
    public.is_company_admin() AND company_id = public.get_user_company_id()
  );

-- Employees can read themselves
CREATE POLICY company_user_self_read ON public.company_user 
  FOR SELECT 
  USING (id = public.get_current_user_id());

-- Employees can read others in same company
CREATE POLICY company_user_coworkers_read ON public.company_user 
  FOR SELECT 
  USING (
    public.is_employee() AND 
    company_id = public.get_user_company_id()
  );

-- =======================================
-- SERVICE ROLE BYPASS - For server-side operations
-- =======================================

-- Bypass policies for service_role (for server-side operations)
CREATE POLICY bypass_service_role ON public.users FOR ALL TO service_role USING (true);
CREATE POLICY bypass_service_role ON public.admin FOR ALL TO service_role USING (true);
CREATE POLICY bypass_service_role ON public.company FOR ALL TO service_role USING (true);
CREATE POLICY bypass_service_role ON public.company_user FOR ALL TO service_role USING (true);

-- USAGE NOTES:
-- 1. Run this script in your Supabase SQL editor
-- 2. Make sure your JWT secret in Supabase project settings matches the one in your app (EXPO_PUBLIC_JWT_SECRET)
-- 3. Verify your authentication flow correctly sets the 'sub' claim to the user's UUID
-- 4. Check that the JWT token is properly passed to Supabase in your authenticated client 