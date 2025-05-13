-- Part 6: Company_user table policies
-- This can be run as a single script

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