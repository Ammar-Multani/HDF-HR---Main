-- Part 7: Service role bypass policies
-- This can be run as a single script

-- Create bypass policies for service_role
CREATE POLICY bypass_service_role ON public.users FOR ALL TO service_role USING (true);
CREATE POLICY bypass_service_role ON public.admin FOR ALL TO service_role USING (true);
CREATE POLICY bypass_service_role ON public.company FOR ALL TO service_role USING (true);
CREATE POLICY bypass_service_role ON public.company_user FOR ALL TO service_role USING (true); 