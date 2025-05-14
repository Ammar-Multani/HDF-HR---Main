-- Row Level Security Policies for Business Management App
-- This file contains all the RLS policies needed for the application's tables

-- =================================================================
-- STEP 1: Enable RLS on all tables
-- =================================================================

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "admin" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "company" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "company_user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "payroll" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "leave_request" ENABLE ROW LEVEL SECURITY;

-- =================================================================
-- STEP 2: Create helper functions to identify user roles
-- =================================================================

-- Function to check if current user is a super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
DECLARE
  result BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM "admin"
    WHERE id = auth.uid() AND role = 'superadmin'
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if current user is a company admin
CREATE OR REPLACE FUNCTION is_company_admin()
RETURNS BOOLEAN AS $$
DECLARE
  result BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM "company_user"
    WHERE id = auth.uid() AND (role = 'admin' OR role = 'companyadmin')
  ) INTO result;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get the company ID of the current user
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
DECLARE
  company_id UUID;
BEGIN
  SELECT company_id INTO company_id FROM "company_user"
  WHERE id = auth.uid();
  RETURN company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =================================================================
-- STEP 3: Create RLS policies for each table
-- =================================================================

-- USERS TABLE
-- Super admins can see all users, company admins can see users in their company, users can see themselves
CREATE POLICY "Users view policy" ON "users"
FOR SELECT
USING (
  is_super_admin() OR 
  id = auth.uid() OR
  (is_company_admin() AND id IN (
    SELECT id FROM "company_user" WHERE company_id = get_user_company_id()
  ))
);

-- Only super admins can create/update/delete any user
CREATE POLICY "Users manage policy for super admins" ON "users"
FOR ALL
USING (is_super_admin());

-- ADMIN TABLE
-- Only super admins can view and manage the admin table
CREATE POLICY "Admin view policy" ON "admin"
FOR SELECT
USING (is_super_admin() OR id = auth.uid());

CREATE POLICY "Admin manage policy" ON "admin"
FOR ALL
USING (is_super_admin());

-- COMPANY TABLE
-- Super admins can see all companies
-- Company admins and employees can only see their own company
CREATE POLICY "Company view policy" ON "company"
FOR SELECT
USING (
  is_super_admin() OR 
  id IN (SELECT company_id FROM "company_user" WHERE id = auth.uid())
);

-- Only super admins can create companies
CREATE POLICY "Company create policy" ON "company"
FOR INSERT
WITH CHECK (is_super_admin());

-- Super admins can update any company, company admins can update their own company
CREATE POLICY "Company update policy" ON "company"
FOR UPDATE
USING (
  is_super_admin() OR 
  (is_company_admin() AND id = get_user_company_id())
);

-- Only super admins can delete companies
CREATE POLICY "Company delete policy" ON "company"
FOR DELETE
USING (is_super_admin());

-- COMPANY_USER TABLE
-- Super admins can see all company users
-- Company admins can see users in their company
-- Employees can see themselves and other employees in their company
CREATE POLICY "Company user view policy" ON "company_user"
FOR SELECT
USING (
  is_super_admin() OR
  id = auth.uid() OR
  company_id = get_user_company_id()
);

-- Super admins can create company users for any company
-- Company admins can create users for their own company
CREATE POLICY "Company user create policy" ON "company_user"
FOR INSERT
WITH CHECK (
  is_super_admin() OR
  (is_company_admin() AND company_id = get_user_company_id())
);

-- Super admins can update any company user
-- Company admins can update users in their company
-- Users can update their own profile
CREATE POLICY "Company user update policy" ON "company_user"
FOR UPDATE
USING (
  is_super_admin() OR
  (is_company_admin() AND company_id = get_user_company_id()) OR
  id = auth.uid()
);

-- Super admins can delete any company user
-- Company admins can delete users in their company (except themselves)
CREATE POLICY "Company user delete policy" ON "company_user"
FOR DELETE
USING (
  is_super_admin() OR
  (is_company_admin() AND company_id = get_user_company_id() AND id != auth.uid())
);

-- PAYROLL TABLE
-- Super admins can see all payrolls
-- Company admins can see payrolls for their company
-- Employees can see only their own payrolls
CREATE POLICY "Payroll view policy" ON "payroll"
FOR SELECT
USING (
  is_super_admin() OR
  (is_company_admin() AND company_id = get_user_company_id()) OR
  employee_id = auth.uid()
);

-- Super admins and company admins can manage payrolls
CREATE POLICY "Payroll manage policy" ON "payroll"
FOR ALL
USING (
  is_super_admin() OR
  (is_company_admin() AND company_id = get_user_company_id())
);

-- DOCUMENT TABLE
-- Super admins can see all documents
-- Company admins can see documents for their company
-- Employees can see documents shared with them or created by them
CREATE POLICY "Document view policy" ON "document"
FOR SELECT
USING (
  is_super_admin() OR
  (is_company_admin() AND company_id = get_user_company_id()) OR
  (created_by = auth.uid()) OR
  (shared_with @> ARRAY[auth.uid()::text])
);

-- Super admins, company admins and document owners can manage documents
CREATE POLICY "Document manage policy" ON "document"
FOR ALL
USING (
  is_super_admin() OR
  (is_company_admin() AND company_id = get_user_company_id()) OR
  created_by = auth.uid()
);

-- NOTIFICATION TABLE
-- Users can only see their own notifications
CREATE POLICY "Notification view policy" ON "notification"
FOR SELECT
USING (user_id = auth.uid());

-- Super admins and company admins can create notifications for any user
CREATE POLICY "Notification create policy" ON "notification"
FOR INSERT
WITH CHECK (
  is_super_admin() OR
  (is_company_admin() AND user_id IN (
    SELECT id FROM "company_user" WHERE company_id = get_user_company_id()
  ))
);

-- Users can mark their own notifications as read
CREATE POLICY "Notification update policy" ON "notification"
FOR UPDATE
USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Notification delete policy" ON "notification"
FOR DELETE
USING (user_id = auth.uid());

-- TASK TABLE
-- Super admins can see all tasks
-- Company admins can see tasks in their company
-- Employees can see tasks assigned to them or created by them
CREATE POLICY "Task view policy" ON "task"
FOR SELECT
USING (
  is_super_admin() OR
  (is_company_admin() AND company_id = get_user_company_id()) OR
  assigned_to = auth.uid() OR
  created_by = auth.uid()
);

-- Super admins and company admins can create tasks for their company
-- Employees can create tasks for themselves or others in their company
CREATE POLICY "Task create policy" ON "task"
FOR INSERT
WITH CHECK (
  is_super_admin() OR
  (company_id = get_user_company_id())
);

-- Task creators, admins, and assignees can update tasks
CREATE POLICY "Task update policy" ON "task"
FOR UPDATE
USING (
  is_super_admin() OR
  (is_company_admin() AND company_id = get_user_company_id()) OR
  created_by = auth.uid() OR
  assigned_to = auth.uid()
);

-- Task creators and admins can delete tasks
CREATE POLICY "Task delete policy" ON "task"
FOR DELETE
USING (
  is_super_admin() OR
  (is_company_admin() AND company_id = get_user_company_id()) OR
  created_by = auth.uid()
);

-- LEAVE_REQUEST TABLE
-- Super admins can see all leave requests
-- Company admins can see leave requests in their company
-- Employees can see their own leave requests
CREATE POLICY "Leave request view policy" ON "leave_request"
FOR SELECT
USING (
  is_super_admin() OR
  (is_company_admin() AND company_id = get_user_company_id()) OR
  employee_id = auth.uid()
);

-- Employees can create their own leave requests
CREATE POLICY "Leave request create policy" ON "leave_request"
FOR INSERT
WITH CHECK (employee_id = auth.uid());

-- Employees can update their pending leave requests
-- Company admins can approve/reject any leave request in their company
CREATE POLICY "Leave request update policy" ON "leave_request"
FOR UPDATE
USING (
  is_super_admin() OR
  (is_company_admin() AND company_id = get_user_company_id()) OR
  (employee_id = auth.uid() AND status = 'pending')
);

-- Employees can delete their pending leave requests
-- Company admins can delete any leave request in their company
CREATE POLICY "Leave request delete policy" ON "leave_request"
FOR DELETE
USING (
  is_super_admin() OR
  (is_company_admin() AND company_id = get_user_company_id()) OR
  (employee_id = auth.uid() AND status = 'pending')
);

-- =================================================================
-- STEP 4: Add bypass for authenticated service roles
-- =================================================================

-- Allow service roles to bypass RLS
ALTER TABLE "users" FORCE ROW LEVEL SECURITY;
ALTER TABLE "admin" FORCE ROW LEVEL SECURITY;
ALTER TABLE "company" FORCE ROW LEVEL SECURITY;
ALTER TABLE "company_user" FORCE ROW LEVEL SECURITY;
ALTER TABLE "payroll" FORCE ROW LEVEL SECURITY;
ALTER TABLE "document" FORCE ROW LEVEL SECURITY;
ALTER TABLE "notification" FORCE ROW LEVEL SECURITY;
ALTER TABLE "task" FORCE ROW LEVEL SECURITY;
ALTER TABLE "leave_request" FORCE ROW LEVEL SECURITY;

-- Grant permissions to authenticated service role
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role; 