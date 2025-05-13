-- Part 3: User table policies
-- This can be run as a single script

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