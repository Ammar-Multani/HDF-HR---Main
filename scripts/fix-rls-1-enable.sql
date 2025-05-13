-- Part 1: Enable RLS on tables
-- This can be run as a single script

-- First, explicitly enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_user ENABLE ROW LEVEL SECURITY; 