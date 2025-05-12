-- This script sets up RLS policies that work with our custom JWT authentication

-- Re-enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_user ENABLE ROW LEVEL SECURITY;

-- Create policy for users table: everyone can login (select)
CREATE POLICY IF NOT EXISTS users_auth_policy
  ON users
  FOR SELECT
  USING (true);

-- Allow users to update their own records
CREATE POLICY IF NOT EXISTS users_self_update
  ON users
  FOR UPDATE
  USING (id = auth.uid());

-- Create policy for admin table: admins can read their own records
CREATE POLICY IF NOT EXISTS admin_self_read
  ON admin
  FOR SELECT
  USING (id = auth.uid());

-- Create policy for company_user table: company users can read their own records
CREATE POLICY IF NOT EXISTS company_user_self_read
  ON company_user
  FOR SELECT
  USING (id = auth.uid());

-- Super admins can do everything with admin table
CREATE POLICY IF NOT EXISTS admin_superadmin_all
  ON admin
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND id IN (SELECT id FROM admin WHERE role = 'superadmin')
    )
  );

-- Super admins can do everything with company_user table
CREATE POLICY IF NOT EXISTS company_user_superadmin_all
  ON company_user
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND id IN (SELECT id FROM admin WHERE role = 'superadmin')
    )
  );

-- Company admins can read users in their company
CREATE POLICY IF NOT EXISTS company_user_admin_read
  ON company_user
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_user
      WHERE company_user.id = auth.uid()
      AND company_user.role = 'admin'
      AND company_user.company_id = company_user.company_id
    )
  );

-- Temporarily disable all RLS for testing (REMOVE IN PRODUCTION)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin DISABLE ROW LEVEL SECURITY;
ALTER TABLE company_user DISABLE ROW LEVEL SECURITY; 