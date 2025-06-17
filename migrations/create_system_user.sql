-- First, create a UUID for the system user
DO $$
DECLARE
    system_user_id uuid := gen_random_uuid();
BEGIN
    -- Insert into users table
    INSERT INTO public.users (
        id,
        email,
        name,
        status,
        created_at,
        updated_at,
        deleted_at,
        role
    ) VALUES (
        system_user_id,
        'system@maintenance.internal',
        'System Maintenance',
        'active',
        NOW(),
        NOW(),
        NULL,
        'system'
    ) ON CONFLICT (email) DO NOTHING;

    -- Output the system user ID for reference
    RAISE NOTICE 'System User ID: %', system_user_id;
END $$;

-- Grant necessary permissions to the system user
DO $$
DECLARE
    system_user_id uuid;
BEGIN
    -- Get the system user ID
    SELECT id INTO system_user_id
    FROM public.users
    WHERE email = 'system@maintenance.internal';

    -- Add any necessary role assignments or permissions here
    -- For example, if you have a company_user or admin table:
    
    -- Insert into admin table if needed
    INSERT INTO public.admin (
        id,
        status,
        created_at,
        updated_at,
        deleted_at
    ) VALUES (
        system_user_id,
        true,
        NOW(),
        NOW(),
        NULL
    ) ON CONFLICT (id) DO NOTHING;

END $$; 