-- Part 4: Admin table policies
-- This can be run as a single script

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