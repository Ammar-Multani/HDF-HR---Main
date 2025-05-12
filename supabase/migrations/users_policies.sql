-- Enable Row Level Security on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow public access for login/registration
CREATE POLICY user_auth_policy
  ON users
  FOR SELECT
  USING (true);

-- Allow users to modify their own data
CREATE POLICY user_self_update
  ON users
  FOR UPDATE
  USING (id = auth.uid());

-- Allow users to select their own data
CREATE POLICY user_self_select
  ON users
  FOR SELECT
  USING (id = auth.uid());

-- Allow super admins to do everything
CREATE POLICY superadmin_all
  ON users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM admin
      WHERE admin.id = auth.uid()
      AND admin.role = 'superadmin'
    )
  );

-- Temporarily allow any update (for testing purposes - remove in production)
CREATE POLICY temp_allow_updates
  ON users
  FOR UPDATE
  USING (true); 