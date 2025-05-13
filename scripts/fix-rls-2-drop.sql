-- Part 2: Drop existing policies
-- This can be run as a single script

-- Drop policies for users table
DROP POLICY IF EXISTS users_select ON public.users;
DROP POLICY IF EXISTS users_update ON public.users;
DROP POLICY IF EXISTS users_superadmin_all ON public.users;
DROP POLICY IF EXISTS users_company_admin_select ON public.users;

-- Drop policies for admin table
DROP POLICY IF EXISTS admin_superadmin_all ON public.admin;
DROP POLICY IF EXISTS admin_self_read ON public.admin;

-- Drop policies for company table
DROP POLICY IF EXISTS company_superadmin_all ON public.company;
DROP POLICY IF EXISTS company_admin_read ON public.company;
DROP POLICY IF EXISTS company_employee_read ON public.company;
DROP POLICY IF EXISTS company_user_read ON public.company;

-- Drop policies for company_user table
DROP POLICY IF EXISTS company_user_superadmin_all ON public.company_user;
DROP POLICY IF EXISTS company_user_admin_manage ON public.company_user;
DROP POLICY IF EXISTS company_user_self_read ON public.company_user;
DROP POLICY IF EXISTS company_user_coworkers_read ON public.company_user;

-- Drop service role bypass policies
DROP POLICY IF EXISTS bypass_service_role ON public.users;
DROP POLICY IF EXISTS bypass_service_role ON public.admin;
DROP POLICY IF EXISTS bypass_service_role ON public.company;
DROP POLICY IF EXISTS bypass_service_role ON public.company_user; 