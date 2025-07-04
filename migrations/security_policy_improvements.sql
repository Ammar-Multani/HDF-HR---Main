-- Migration: Security Policy Improvements
-- Description: Improves RLS policies performance and consolidates multiple permissive policies

BEGIN;

-- ==========================================
-- Activity Logs Policy Improvements
-- ==========================================
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

-- ==========================================
-- Activity Logs Archive Policy Improvements
-- ==========================================
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

-- ==========================================
-- Company Policy Consolidation
-- ==========================================
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

-- ==========================================
-- Password Reset Tokens Policy Consolidation
-- ==========================================
DROP POLICY IF EXISTS "Admins can manage all tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Users can create their own reset tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Users can read their own reset tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Users can update their own reset tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Anon users can create tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Anon users can read tokens" ON public.password_reset_tokens;

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

CREATE POLICY "password_reset_tokens_anon_access" ON public.password_reset_tokens
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "password_reset_tokens_anon_insert" ON public.password_reset_tokens
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- ==========================================
-- Task Attachments Policy Consolidation
-- ==========================================
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

-- ==========================================
-- Tasks Policy Consolidation
-- ==========================================
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

-- ==========================================
-- Receipts Policy Consolidation
-- ==========================================
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

COMMIT; 