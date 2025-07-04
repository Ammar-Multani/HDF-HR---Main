-- Migration script for transitioning to Supabase Auth
-- This script updates foreign key references and adds necessary triggers

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_trgm extension to extensions schema
DROP EXTENSION IF EXISTS pg_trgm;
CREATE EXTENSION pg_trgm WITH SCHEMA extensions;

-- Grant usage on extensions schema to authenticated users
GRANT USAGE ON SCHEMA extensions TO authenticated;

-- Start a transaction
BEGIN;

-- 1. Create a backup of the users table before making changes
CREATE TABLE IF NOT EXISTS public.users_backup AS 
SELECT * FROM public.users;

-- 2. Update foreign key references to point to auth.users instead of public.users

-- First, temporarily disable foreign key constraints
ALTER TABLE public.admin DROP CONSTRAINT IF EXISTS admin_id_fkey;
ALTER TABLE public.company_user DROP CONSTRAINT IF EXISTS company_user_id_fkey;
ALTER TABLE public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey;
ALTER TABLE public.employee_documents DROP CONSTRAINT IF EXISTS employee_documents_uploaded_by_fkey;

-- Then add the new constraints pointing to auth.users
ALTER TABLE public.admin 
  ADD CONSTRAINT admin_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id);

ALTER TABLE public.company_user 
  ADD CONSTRAINT company_user_id_fkey 
  FOREIGN KEY (id) 
  REFERENCES auth.users(id);

ALTER TABLE public.activity_logs 
  ADD CONSTRAINT activity_logs_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id);

ALTER TABLE public.employee_documents 
  ADD CONSTRAINT employee_documents_uploaded_by_fkey 
  FOREIGN KEY (uploaded_by) 
  REFERENCES auth.users(id);

-- 3. Create a trigger to sync user roles with auth.users metadata
-- This will keep the role information in sync between our tables and auth.users

-- Function to update auth.users metadata when admin role changes
CREATE OR REPLACE FUNCTION public.sync_admin_role_to_auth()
RETURNS TRIGGER AS $$
BEGIN
  SET search_path = public, pg_temp;
  UPDATE auth.users
  SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object('role', NEW.role)
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update auth.users metadata when company_user role changes
CREATE OR REPLACE FUNCTION public.sync_company_user_role_to_auth()
RETURNS TRIGGER AS $$
BEGIN
  SET search_path = public, pg_temp;
  UPDATE auth.users
  SET raw_user_meta_data = 
    COALESCE(raw_user_meta_data, '{}'::jsonb) || 
    jsonb_build_object(
      'role', NEW.role,
      'company_id', NEW.company_id,
      'active_status', NEW.active_status
    )
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for admin table
DROP TRIGGER IF EXISTS sync_admin_role_trigger ON public.admin;
CREATE TRIGGER sync_admin_role_trigger
AFTER INSERT OR UPDATE OF role ON public.admin
FOR EACH ROW
EXECUTE FUNCTION public.sync_admin_role_to_auth();

-- Trigger for company_user table
DROP TRIGGER IF EXISTS sync_company_user_role_trigger ON public.company_user;
CREATE TRIGGER sync_company_user_role_trigger
AFTER INSERT OR UPDATE OF role, active_status ON public.company_user
FOR EACH ROW
EXECUTE FUNCTION public.sync_company_user_role_to_auth();

-- 4. Create a function to handle user registration and role assignment
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  SET search_path = public, pg_temp;
  -- If the user has company_id in metadata, add them to company_user table
  IF NEW.raw_user_meta_data->>'company_id' IS NOT NULL THEN
    INSERT INTO public.company_user (
      id,
      company_id,
      first_name,
      last_name,
      email,
      role,
      active_status
    ) VALUES (
      NEW.id,
      (NEW.raw_user_meta_data->>'company_id')::uuid,
      COALESCE(NEW.raw_user_meta_data->>'first_name', 'New'),
      COALESCE(NEW.raw_user_meta_data->>'last_name', 'User'),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'role', 'employee')::user_role,
      'active'::user_status
    );
  -- If the user has is_admin flag, add them to admin table
  ELSIF NEW.raw_user_meta_data->>'is_admin' = 'true' THEN
    INSERT INTO public.admin (
      id,
      name,
      email,
      role,
      status
    ) VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', 'Admin User'),
      NEW.email,
      COALESCE(NEW.raw_user_meta_data->>'role', 'admin')::admin_role,
      true
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- 5. Create RLS policies for auth.users to restrict access based on roles

-- Allow users to read their own data
-- CREATE POLICY "Users can view own user data" ON auth.users
--   FOR SELECT
--   USING (auth.uid() = id);

-- -- Allow users to update their own data
-- CREATE POLICY "Users can update own user data" ON auth.users
--   FOR UPDATE
--   USING (auth.uid() = id);

-- 6. Create a view to simplify user queries that combines auth.users with role information
CREATE OR REPLACE VIEW public.user_details AS
SELECT 
  u.id,
  u.email,
  u.last_sign_in_at,
  u.created_at,
  u.updated_at,
  u.raw_user_meta_data,
  CASE 
    WHEN a.id IS NOT NULL THEN a.role
    WHEN c.id IS NOT NULL THEN c.role
    ELSE NULL
  END as role,
  CASE 
    WHEN a.id IS NOT NULL THEN 'admin'
    WHEN c.id IS NOT NULL THEN 'company_user'
    ELSE 'unassigned'
  END as user_type,
  c.company_id,
  c.active_status,
  a.status as admin_status
FROM 
  auth.users u
LEFT JOIN 
  public.admin a ON u.id = a.id
LEFT JOIN 
  public.company_user c ON u.id = c.id;

-- Commit the transaction
COMMIT; 




-- Step 1: Fix auth RLS initialization plan warnings by using subqueries

-- Helper functions optimization
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
DECLARE
  admin_role TEXT;
  company_role TEXT;
  user_id UUID := (SELECT auth.uid());
BEGIN
  SET search_path = public, pg_temp;
  -- Check if user is in admin table
  SELECT role INTO admin_role FROM public.admin WHERE id = user_id;
  
  -- Check if user is in company_user table
  SELECT role INTO company_role FROM public.company_user WHERE id = user_id;
  
  -- Return the role (admin takes precedence)
  IF admin_role = 'superadmin' THEN
    RETURN 'superadmin';
  ELSIF company_role = 'admin' THEN
    RETURN 'companyadmin';
  ELSIF company_role = 'employee' THEN
    RETURN 'employee';
  ELSE
    RETURN 'anonymous';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update company_user policies
DROP POLICY IF EXISTS "Employees can view their own user record" ON public.company_user;
CREATE POLICY "Employees can view their own user record" ON public.company_user
  FOR SELECT USING (
    get_user_role() = 'employee' AND id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Employees can update their own user record" ON public.company_user;
CREATE POLICY "Employees can update their own user record" ON public.company_user
  FOR UPDATE USING (
    get_user_role() = 'employee' AND id = (SELECT auth.uid())
  );

-- Update accident_report policies
DROP POLICY IF EXISTS "Employees can view their own accident reports" ON public.accident_report;
CREATE POLICY "Employees can view their own accident reports" ON public.accident_report
  FOR SELECT USING (
    get_user_role() = 'employee' AND employee_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Employees can insert their own accident reports" ON public.accident_report;
CREATE POLICY "Employees can insert their own accident reports" ON public.accident_report
  FOR INSERT WITH CHECK (
    get_user_role() = 'employee' AND employee_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Employees can update their own accident reports" ON public.accident_report;
CREATE POLICY "Employees can update their own accident reports" ON public.accident_report
  FOR UPDATE USING (
    get_user_role() = 'employee' AND employee_id = (SELECT auth.uid())
  );

-- Update illness_report policies
DROP POLICY IF EXISTS "Employees can view their own illness reports" ON public.illness_report;
CREATE POLICY "Employees can view their own illness reports" ON public.illness_report
  FOR SELECT USING (
    get_user_role() = 'employee' AND employee_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Employees can insert their own illness reports" ON public.illness_report;
CREATE POLICY "Employees can insert their own illness reports" ON public.illness_report
  FOR INSERT WITH CHECK (
    get_user_role() = 'employee' AND employee_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Employees can update their own illness reports" ON public.illness_report;
CREATE POLICY "Employees can update their own illness reports" ON public.illness_report
  FOR UPDATE USING (
    get_user_role() = 'employee' AND employee_id = (SELECT auth.uid())
  );

-- Update tasks policies
DROP POLICY IF EXISTS "Employees can view tasks assigned to them" ON public.tasks;
CREATE POLICY "Employees can view tasks assigned to them" ON public.tasks
  FOR SELECT USING (
    get_user_role() = 'employee' AND assigned_to = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Employees can update tasks assigned to them" ON public.tasks;
CREATE POLICY "Employees can update tasks assigned to them" ON public.tasks
  FOR UPDATE USING (
    get_user_role() = 'employee' AND assigned_to = (SELECT auth.uid())
  );

-- Update employee_documents policies
DROP POLICY IF EXISTS "Employees can view their own documents" ON public.employee_documents;
CREATE POLICY "Employees can view their own documents" ON public.employee_documents
  FOR SELECT USING (
    get_user_role() = 'employee' AND employee_id = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "Employees can upload their own documents" ON public.employee_documents;
CREATE POLICY "Employees can upload their own documents" ON public.employee_documents
  FOR INSERT WITH CHECK (
    get_user_role() = 'employee' AND employee_id = (SELECT auth.uid())
  );

-- Update admin table policies
DROP POLICY IF EXISTS "Company admins can view their own admin record" ON public.admin;
CREATE POLICY "Company admins can view their own admin record" ON public.admin
  FOR SELECT USING (
    get_user_role() = 'companyadmin' AND id = (SELECT auth.uid())
  );

-- Step 2: Consolidate multiple permissive policies

-- Consolidate admin table policies
DROP POLICY IF EXISTS "Superadmins can view all admins" ON public.admin;
DROP POLICY IF EXISTS "Company admins can view superadmins" ON public.admin;
DROP POLICY IF EXISTS "Company admins can view their own admin record" ON public.admin;
CREATE POLICY "Consolidated admin select policy" ON public.admin
  FOR SELECT USING (
    (get_user_role() = 'superadmin') OR
    (get_user_role() = 'companyadmin' AND (role = 'superadmin' OR id = (SELECT auth.uid())))
  );

-- Consolidate company table policies
DROP POLICY IF EXISTS "Superadmins can view all companies" ON public.company;
DROP POLICY IF EXISTS "Company admins can view their company" ON public.company;
CREATE POLICY "Consolidated company select policy" ON public.company
  FOR SELECT USING (
    (get_user_role() = 'superadmin') OR
    (get_user_role() = 'companyadmin' AND id = get_user_company_id())
  );

-- Consolidate company_user policies
DROP POLICY IF EXISTS "Company admins can view users in their company" ON public.company_user;
DROP POLICY IF EXISTS "Employees can view their own user record" ON public.company_user;
CREATE POLICY "Consolidated company_user select policy" ON public.company_user
  FOR SELECT USING (
    (get_user_role() = 'superadmin') OR
    (get_user_role() = 'companyadmin' AND company_id = get_user_company_id()) OR
    (get_user_role() = 'employee' AND id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Company admins can update users in their company" ON public.company_user;
DROP POLICY IF EXISTS "Employees can update their own user record" ON public.company_user;
CREATE POLICY "Consolidated company_user update policy" ON public.company_user
  FOR UPDATE USING (
    (get_user_role() = 'superadmin') OR
    (get_user_role() = 'companyadmin' AND company_id = get_user_company_id()) OR
    (get_user_role() = 'employee' AND id = (SELECT auth.uid()))
  );

-- Consolidate accident_report policies
DROP POLICY IF EXISTS "Company admins can view all forms in their company" ON public.accident_report;
DROP POLICY IF EXISTS "Employees can view their own accident reports" ON public.accident_report;
CREATE POLICY "Consolidated accident_report select policy" ON public.accident_report
  FOR SELECT USING (
    (get_user_role() = 'superadmin') OR
    (get_user_role() = 'companyadmin' AND company_id = get_user_company_id()) OR
    (get_user_role() = 'employee' AND employee_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Company admins can insert forms in their company" ON public.accident_report;
DROP POLICY IF EXISTS "Employees can insert their own accident reports" ON public.accident_report;
CREATE POLICY "Consolidated accident_report insert policy" ON public.accident_report
  FOR INSERT WITH CHECK (
    (get_user_role() = 'superadmin') OR
    (get_user_role() = 'companyadmin' AND company_id = get_user_company_id()) OR
    (get_user_role() = 'employee' AND employee_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Company admins can update forms in their company" ON public.accident_report;
DROP POLICY IF EXISTS "Employees can update their own accident reports" ON public.accident_report;
CREATE POLICY "Consolidated accident_report update policy" ON public.accident_report
  FOR UPDATE USING (
    (get_user_role() = 'superadmin') OR
    (get_user_role() = 'companyadmin' AND company_id = get_user_company_id()) OR
    (get_user_role() = 'employee' AND employee_id = (SELECT auth.uid()))
  );

-- Consolidate illness_report policies
DROP POLICY IF EXISTS "Company admins can view all illness reports in their company" ON public.illness_report;
DROP POLICY IF EXISTS "Employees can view their own illness reports" ON public.illness_report;
CREATE POLICY "Consolidated illness_report select policy" ON public.illness_report
  FOR SELECT USING (
    (get_user_role() = 'superadmin') OR
    (get_user_role() = 'companyadmin' AND company_id = get_user_company_id()) OR
    (get_user_role() = 'employee' AND employee_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Company admins can insert illness reports in their company" ON public.illness_report;
DROP POLICY IF EXISTS "Employees can insert their own illness reports" ON public.illness_report;
CREATE POLICY "Consolidated illness_report insert policy" ON public.illness_report
  FOR INSERT WITH CHECK (
    (get_user_role() = 'superadmin') OR
    (get_user_role() = 'companyadmin' AND company_id = get_user_company_id()) OR
    (get_user_role() = 'employee' AND employee_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Company admins can update illness reports in their company" ON public.illness_report;
DROP POLICY IF EXISTS "Employees can update their own illness reports" ON public.illness_report;
CREATE POLICY "Consolidated illness_report update policy" ON public.illness_report
  FOR UPDATE USING (
    (get_user_role() = 'superadmin') OR
    (get_user_role() = 'companyadmin' AND company_id = get_user_company_id()) OR
    (get_user_role() = 'employee' AND employee_id = (SELECT auth.uid()))
  );

-- Consolidate staff_departure_report policies (if there are multiple)
DROP POLICY IF EXISTS "Company admins can view all departure reports in their company" ON public.staff_departure_report;
CREATE POLICY "Consolidated staff_departure_report select policy" ON public.staff_departure_report
  FOR SELECT USING (
    (get_user_role() = 'superadmin') OR
    (get_user_role() = 'companyadmin' AND company_id = get_user_company_id()) OR
    (get_user_role() = 'employee' AND employee_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Company admins can insert departure reports in their company" ON public.staff_departure_report;
CREATE POLICY "Consolidated staff_departure_report insert policy" ON public.staff_departure_report
  FOR INSERT WITH CHECK (
    (get_user_role() = 'superadmin') OR
    (get_user_role() = 'companyadmin' AND company_id = get_user_company_id()) OR
    (get_user_role() = 'employee' AND employee_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Company admins can update departure reports in their company" ON public.staff_departure_report;
CREATE POLICY "Consolidated staff_departure_report update policy" ON public.staff_departure_report
  FOR UPDATE USING (
    (get_user_role() = 'superadmin') OR
    (get_user_role() = 'companyadmin' AND company_id = get_user_company_id()) OR
    (get_user_role() = 'employee' AND employee_id = (SELECT auth.uid()))
  );

-- Consolidate employee_documents policies
DROP POLICY IF EXISTS "Company admins can view all documents in their company" ON public.employee_documents;
DROP POLICY IF EXISTS "Employees can view their own documents" ON public.employee_documents;
CREATE POLICY "Consolidated employee_documents select policy" ON public.employee_documents
  FOR SELECT USING (
    (get_user_role() = 'superadmin') OR
    (get_user_role() = 'companyadmin' AND company_id = get_user_company_id()) OR
    (get_user_role() = 'employee' AND employee_id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "Company admins can insert documents in their company" ON public.employee_documents;
DROP POLICY IF EXISTS "Employees can upload their own documents" ON public.employee_documents;
CREATE POLICY "Consolidated employee_documents insert policy" ON public.employee_documents
  FOR INSERT WITH CHECK (
    (get_user_role() = 'superadmin') OR
    (get_user_role() = 'companyadmin' AND company_id = get_user_company_id()) OR
    (get_user_role() = 'employee' AND employee_id = (SELECT auth.uid()))
  );

-- Consolidate tasks policies
DROP POLICY IF EXISTS "Company admins can insert tasks in their company" ON public.tasks;
DROP POLICY IF EXISTS "Consolidated tasks insert policy" ON public.tasks;
DROP POLICY IF EXISTS "Consolidated tasks select policy" ON public.tasks;
DROP POLICY IF EXISTS "Consolidated tasks update policy" ON public.tasks;

CREATE POLICY "tasks_access" ON public.tasks
  FOR ALL
  TO authenticated
  USING (
    get_user_role() = 'superadmin' OR
    (get_user_role() = 'companyadmin' AND (
      company_id = get_user_company_id() OR
      created_by IN (SELECT id FROM public.admin WHERE role = 'superadmin')
    )) OR
    (get_user_role() = 'employee' AND assigned_to = (SELECT auth.uid()))
  )
  WITH CHECK (
    get_user_role() = 'superadmin' OR
    (get_user_role() = 'companyadmin' AND company_id = get_user_company_id())
  );

-- Consolidate receipts policies
DROP POLICY IF EXISTS "Company admins can insert receipts in their company" ON public.receipts;
DROP POLICY IF EXISTS "Consolidated receipts insert policy" ON public.receipts;
DROP POLICY IF EXISTS "Consolidated receipts select policy" ON public.receipts;
DROP POLICY IF EXISTS "Consolidated receipts update policy" ON public.receipts;
DROP POLICY IF EXISTS "Consolidated receipts delete policy" ON public.receipts;

CREATE POLICY "receipts_access" ON public.receipts
  FOR ALL
  TO authenticated
  USING (
    get_user_role() = 'superadmin' OR
    (get_user_role() = 'companyadmin' AND (
      company_id = get_user_company_id() OR
      created_by IN (SELECT id FROM public.admin WHERE role = 'superadmin')
    ))
  )
  WITH CHECK (
    get_user_role() = 'superadmin' OR
    (get_user_role() = 'companyadmin' AND company_id = get_user_company_id())
  );

-- Re-add Activity Logs RLS policies
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy for admins to see all logs
DROP POLICY IF EXISTS admin_all_access ON public.activity_logs;
CREATE POLICY admin_all_access ON public.activity_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin 
      WHERE admin.id = auth.uid() 
      AND admin.status = true 
      AND admin.deleted_at IS NULL
    )
  );

-- Policy for company users to see only their company's logs
DROP POLICY IF EXISTS company_user_access ON public.activity_logs;
CREATE POLICY company_user_access ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_user 
      WHERE company_user.id = (SELECT auth.uid()) 
      AND company_user.company_id = activity_logs.company_id
      AND company_user.deleted_at IS NULL
    )
  );

-- Ensure proper permissions are granted
GRANT ALL ON public.activity_logs TO authenticated;

-- Add policy for employees to view their company details
DROP POLICY IF EXISTS "Employees can view their company details" ON public.company;
CREATE POLICY "Employees can view their company details" ON public.company
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.company_user 
      WHERE company_user.id = auth.uid()
      AND company_user.company_id = company.id
      AND company_user.deleted_at IS NULL
    )
  );

-- Ensure proper permissions are granted
GRANT SELECT ON public.company TO authenticated;

-- Function to get user's company ID
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
DECLARE
  company_id UUID;
BEGIN
  SET search_path = public, pg_temp;
  SELECT cu.company_id INTO company_id
  FROM public.company_user cu
  WHERE cu.id = auth.uid();
  RETURN company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to validate receipt created by
CREATE OR REPLACE FUNCTION public.validate_receipt_created_by()
RETURNS TRIGGER AS $$
BEGIN
  SET search_path = public, pg_temp;
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check sender exists
CREATE OR REPLACE FUNCTION public.check_sender_exists()
RETURNS TRIGGER AS $$
BEGIN
  SET search_path = public, pg_temp;
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = NEW.sender_id
  ) THEN
    RAISE EXCEPTION 'Sender does not exist';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check user exists
CREATE OR REPLACE FUNCTION public.check_user_exists()
RETURNS TRIGGER AS $$
BEGIN
  SET search_path = public, pg_temp;
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'User does not exist';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update modified column
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  SET search_path = public, pg_temp;
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add RLS policies for activity_logs_archive
ALTER TABLE public.activity_logs_archive ENABLE ROW LEVEL SECURITY;

-- Policy for admins to see all archived logs
DROP POLICY IF EXISTS admin_all_access_archive ON public.activity_logs_archive;
CREATE POLICY admin_all_access_archive ON public.activity_logs_archive
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin 
      WHERE admin.id = (SELECT auth.uid())
      AND admin.status = true 
      AND admin.deleted_at IS NULL
    )
  );

-- Policy for company users to see only their company's archived logs
DROP POLICY IF EXISTS company_user_access_archive ON public.activity_logs_archive;
CREATE POLICY company_user_access_archive ON public.activity_logs_archive
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_user 
      WHERE company_user.id = (SELECT auth.uid())
      AND company_user.company_id = activity_logs_archive.company_id
      AND company_user.deleted_at IS NULL
    )
  );

-- Add RLS policies for task_attachments
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

-- Policy for admins to see all task attachments
CREATE POLICY admin_all_access_attachments ON public.task_attachments
  FOR ALL
  TO authenticated
  USING (
    get_user_role() = 'superadmin' OR
    (get_user_role() = 'companyadmin' AND task_id IN (
      SELECT id FROM public.tasks 
      WHERE company_id = get_user_company_id()
    ))
  );

-- Policy for employees to see attachments of their tasks
CREATE POLICY employee_task_attachments_access ON public.task_attachments
  FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'employee' AND
    task_id IN (
      SELECT id FROM public.tasks 
      WHERE assigned_to = auth.uid()
    )
  );

-- Policy for employees to add attachments to their tasks
CREATE POLICY employee_task_attachments_insert ON public.task_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    get_user_role() = 'employee' AND
    task_id IN (
      SELECT id FROM public.tasks 
      WHERE assigned_to = auth.uid()
    )
  );

-- Ensure proper permissions are granted
GRANT ALL ON public.activity_logs_archive TO authenticated;
GRANT ALL ON public.task_attachments TO authenticated;

-- Consolidate company policies into a single policy
DROP POLICY IF EXISTS "Consolidated company select policy" ON public.company;
DROP POLICY IF EXISTS "Employees can view their company details" ON public.company;
CREATE POLICY "company_access_policy" ON public.company
  FOR SELECT
  TO authenticated
  USING (
    (get_user_role() = 'superadmin') OR
    (get_user_role() = 'companyadmin' AND id = get_user_company_id()) OR
    EXISTS (
      SELECT 1 FROM public.company_user 
      WHERE company_user.id = (SELECT auth.uid())
      AND company_user.company_id = company.id
      AND company_user.deleted_at IS NULL
    )
  );

-- Consolidate password reset token policies
DROP POLICY IF EXISTS "Admins can manage all tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Users can create their own reset tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Users can read their own reset tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Users can update their own reset tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Anon users can create tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Anon users can read tokens" ON public.password_reset_tokens;

-- Create consolidated policies for password reset tokens
CREATE POLICY "password_reset_tokens_access" ON public.password_reset_tokens
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin 
      WHERE admin.id = (SELECT auth.uid())
      AND admin.status = true 
      AND admin.deleted_at IS NULL
    ) OR
    user_id = (SELECT auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin 
      WHERE admin.id = (SELECT auth.uid())
      AND admin.status = true 
      AND admin.deleted_at IS NULL
    ) OR
    user_id = (SELECT auth.uid())
  );

-- Allow anonymous token creation and reading (for password reset flow)
CREATE POLICY "password_reset_tokens_anon_access" ON public.password_reset_tokens
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "password_reset_tokens_anon_insert" ON public.password_reset_tokens
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Consolidate task_attachments policies
DROP POLICY IF EXISTS admin_all_access_attachments ON public.task_attachments;
DROP POLICY IF EXISTS employee_task_attachments_access ON public.task_attachments;
DROP POLICY IF EXISTS employee_task_attachments_insert ON public.task_attachments;

CREATE POLICY "task_attachments_access" ON public.task_attachments
  FOR ALL
  TO authenticated
  USING (
    get_user_role() = 'superadmin' OR
    (get_user_role() = 'companyadmin' AND task_id IN (
      SELECT id FROM public.tasks 
      WHERE company_id = get_user_company_id()
    )) OR
    (get_user_role() = 'employee' AND task_id IN (
      SELECT id FROM public.tasks 
      WHERE assigned_to = (SELECT auth.uid())
    ))
  )
  WITH CHECK (
    get_user_role() = 'superadmin' OR
    (get_user_role() = 'companyadmin' AND task_id IN (
      SELECT id FROM public.tasks 
      WHERE company_id = get_user_company_id()
    )) OR
    (get_user_role() = 'employee' AND task_id IN (
      SELECT id FROM public.tasks 
      WHERE assigned_to = (SELECT auth.uid())
    ))
  );