-- This script focuses on fixing RLS policies for the core tables

-- First, explicitly enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_user ENABLE ROW LEVEL SECURITY;

-- Drop any existing conflicting policies
DO $$ 
BEGIN
  -- Drop policies for users table
  DROP POLICY IF EXISTS users_select ON public.users;
  DROP POLICY IF EXISTS users_update ON public.users;
  DROP POLICY IF EXISTS users_superadmin_all ON public.users;
  DROP POLICY IF EXISTS users_company_admin_select ON public.users;
  
  -- Drop policies for admin table
  DROP POLICY IF EXISTS admin_superadmin_all ON public.admin;
  DROP POLICY IF EXISTS admin_self_read ON public.admin;
  
  -- Drop policies for company table
  DROP POLICY IF EXISTS company_superadmin_all ON public.company;
  DROP POLICY IF EXISTS company_admin_read ON public.company;
  DROP POLICY IF EXISTS company_employee_read ON public.company;
  
  -- Drop policies for company_user table
  DROP POLICY IF EXISTS company_user_superadmin_all ON public.company_user;
  DROP POLICY IF EXISTS company_user_admin_manage ON public.company_user;
  DROP POLICY IF EXISTS company_user_self_read ON public.company_user;
  DROP POLICY IF EXISTS company_user_coworkers_read ON public.company_user;
  
  -- Drop service role bypass policies
  DROP POLICY IF EXISTS bypass_service_role ON public.users;
  DROP POLICY IF EXISTS bypass_service_role ON public.admin;
  DROP POLICY IF EXISTS bypass_service_role ON public.company;
  DROP POLICY IF EXISTS bypass_service_role ON public.company_user;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error dropping policies: %', SQLERRM;
END $$;

-- Create simplified policies with direct JWT claims access

-- Users table policies
-- Allow public access for login/registration
CREATE POLICY users_select ON public.users 
  FOR SELECT USING (true);

-- Users can update their own data
CREATE POLICY users_update ON public.users 
  FOR UPDATE 
  USING (id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid);

-- Super admin can do everything with users
CREATE POLICY users_superadmin_all ON public.users 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.admin 
      WHERE id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND role = 'superadmin'
    )
  );

-- Admin table policies
-- Super admin has full access to admin table
CREATE POLICY admin_superadmin_all ON public.admin 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.admin 
      WHERE id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND role = 'superadmin'
    )
  );

-- Admins can read their own record
CREATE POLICY admin_self_read ON public.admin 
  FOR SELECT 
  USING (id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid);

-- Company table policies
-- Super admin has full access to companies
CREATE POLICY company_superadmin_all ON public.company 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.admin 
      WHERE id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND role = 'superadmin'
    )
  );

-- Company admins and employees can see their own company
CREATE POLICY company_user_read ON public.company 
  FOR SELECT 
  USING (
    id IN (
      SELECT company_id FROM public.company_user 
      WHERE id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
    )
  );

-- Company_user table policies
-- Super admin has full access to all company users
CREATE POLICY company_user_superadmin_all ON public.company_user 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.admin 
      WHERE id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND role = 'superadmin'
    )
  );

-- Company admin can manage users in their own company
CREATE POLICY company_user_admin_manage ON public.company_user 
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM public.company_user cu
      WHERE cu.id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
      AND (cu.role = 'admin' OR cu.role = 'companyadmin')
      AND cu.company_id = company_user.company_id
    )
  );

-- Users can read their own record
CREATE POLICY company_user_self_read ON public.company_user 
  FOR SELECT 
  USING (id = (current_setting('request.jwt.claims', true)::json->>'sub')::uuid);

-- Create bypass policies for service_role
CREATE POLICY bypass_service_role ON public.users FOR ALL TO service_role USING (true);
CREATE POLICY bypass_service_role ON public.admin FOR ALL TO service_role USING (true);
CREATE POLICY bypass_service_role ON public.company FOR ALL TO service_role USING (true);
CREATE POLICY bypass_service_role ON public.company_user FOR ALL TO service_role USING (true); 