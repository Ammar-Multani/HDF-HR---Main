-- Part 5: Company table policies
-- This can be run as a single script

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