-- RLS POLICY FOR CUSTOM AUTHENTICATION
-- This script sets up Row Level Security for the custom authentication system

-- Enable RLS on all tables
ALTER TABLE public.company ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_user ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- Enable for other tables as needed

-- First, drop any existing policies and functions to start clean
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

DROP FUNCTION IF EXISTS public.get_current_user_id();
DROP FUNCTION IF EXISTS public.get_user_role();
DROP FUNCTION IF EXISTS public.is_super_admin();
DROP FUNCTION IF EXISTS public.is_company_admin();
DROP FUNCTION IF EXISTS public.belongs_to_company();

-- IMPORTANT: We need to be careful about infinite recursion
-- First, create a simple function to get the current user ID from JWT
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS uuid AS $$
BEGIN
  -- This extracts the user ID from the request.jwt.claims
  RETURN nullif(current_setting('request.jwt.claims', true)::json->>'sub', '')::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a simplified function to check if user is super admin
-- This avoids recursion by directly checking the admin table
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
DECLARE
  user_id uuid;
  role_val text;
BEGIN
  user_id := public.get_current_user_id();
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Direct query to admin table (no RLS check)
  SELECT role INTO role_val FROM public.admin WHERE id = user_id;
  RETURN role_val = 'superadmin';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a simplified function to get a company ID for a user
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS uuid AS $$
DECLARE
  user_id uuid;
  company_id_val uuid;
BEGIN
  user_id := public.get_current_user_id();
  IF user_id IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Direct query to company_user table (no RLS check)
  SELECT company_id INTO company_id_val FROM public.company_user WHERE id = user_id;
  RETURN company_id_val;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a simplified function to check if user is company admin
CREATE OR REPLACE FUNCTION public.is_company_admin()
RETURNS boolean AS $$
DECLARE
  user_id uuid;
  role_val text;
BEGIN
  user_id := public.get_current_user_id();
  IF user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Direct query to company_user table (no RLS check)
  SELECT role INTO role_val FROM public.company_user WHERE id = user_id;
  RETURN role_val = 'admin';
EXCEPTION
  WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- BYPASS POLICY: Allow Supabase service role to manage all data
-- This is critical for table initialization and system operations
CREATE POLICY bypass_service_role ON public.users FOR ALL TO service_role USING (true);
CREATE POLICY bypass_service_role ON public.admin FOR ALL TO service_role USING (true);
CREATE POLICY bypass_service_role ON public.company FOR ALL TO service_role USING (true);
CREATE POLICY bypass_service_role ON public.company_user FOR ALL TO service_role USING (true);

-- USERS TABLE POLICIES
-- Allow users to select and update their own data
CREATE POLICY users_select_self ON public.users 
  FOR SELECT USING (id = public.get_current_user_id());
  
-- Allow super admins to see all users
CREATE POLICY users_select_superadmin ON public.users 
  FOR SELECT USING (public.is_super_admin());

-- Company admins can see users from their company
CREATE POLICY users_select_company_admin ON public.users 
  FOR SELECT USING (
    public.is_company_admin() AND 
    EXISTS (
      SELECT 1 FROM public.company_user cu 
      WHERE cu.email = users.email AND cu.company_id = public.get_user_company_id()
    )
  );

-- Users can update their own data
CREATE POLICY users_update_self ON public.users
  FOR UPDATE USING (id = public.get_current_user_id());

-- Super admins can update any user
CREATE POLICY users_update_superadmin ON public.users
  FOR UPDATE USING (public.is_super_admin());

-- Super admins can insert new users
CREATE POLICY users_insert_superadmin ON public.users
  FOR INSERT WITH CHECK (public.is_super_admin());

-- Company admins can insert new users
CREATE POLICY users_insert_company_admin ON public.users
  FOR INSERT WITH CHECK (public.is_company_admin());

-- ADMIN TABLE POLICIES
-- Super admin has full access to admin table
CREATE POLICY admin_superadmin_access ON public.admin
  FOR ALL USING (public.is_super_admin());

-- Admin can read their own info
CREATE POLICY admin_self_read ON public.admin
  FOR SELECT USING (id = public.get_current_user_id());

-- COMPANY TABLE POLICIES
-- Super admin has full access to companies
CREATE POLICY company_superadmin_all ON public.company
  FOR ALL USING (public.is_super_admin());

-- Company admin can read their own company
CREATE POLICY company_admin_read_own ON public.company
  FOR SELECT USING (id = public.get_user_company_id());

-- COMPANY_USER TABLE POLICIES
-- Super admin has full access to all company users
CREATE POLICY company_user_superadmin_all ON public.company_user
  FOR ALL USING (public.is_super_admin());

-- Company admin can manage users in their own company
CREATE POLICY company_user_admin_manage ON public.company_user
  FOR ALL USING (
    public.is_company_admin() AND company_id = public.get_user_company_id()
  );

-- All users can read their own company_user record
CREATE POLICY company_user_read_self ON public.company_user
  FOR SELECT USING (id = public.get_current_user_id());

-- CRITICAL: Ensure that tables have a default deny policy
ALTER TABLE public.users ALTER COLUMN id SET DEFAULT gen_random_uuid();
ALTER TABLE public.company ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- TO APPLY THIS POLICY:
-- 1. Run this script in your Supabase SQL editor
-- 2. Configure your JWT secret in Supabase project settings
-- 3. Ensure the JWT secret matches the one used in your app (utils/auth.ts)
-- 4. The key is to avoid circular dependencies between policies

-- Configure Supabase to validate your custom JWT
-- First, you need to set the JWT secret in your Supabase project settings
-- This should match the secret you use for signing the JWT in your app

-- To apply these policies, run this script in your Supabase SQL editor
-- or connect directly to your PostgreSQL database 