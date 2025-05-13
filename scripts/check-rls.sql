-- Check if RLS is enabled on tables
SELECT table_schema,
       table_name,
       row_security_active AS rls_active
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
AND table_name IN ('users', 'admin', 'company', 'company_user');

-- Check existing RLS policies
SELECT oid::regclass AS table_name, 
       polname AS policy_name, 
       polcmd AS command,  
       polpermissive AS permissive,
       polroles::text AS roles,
       polqual::text AS using_expression,
       polwithcheck::text AS with_check_expression
FROM pg_policy
WHERE polrelid::regclass::text LIKE 'public.%'
ORDER BY table_name, policy_name; 