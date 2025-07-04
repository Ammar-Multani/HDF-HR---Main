-- Fix activity_logs foreign key constraint
BEGIN;

-- Drop the incorrect foreign key constraint
ALTER TABLE public.activity_logs
DROP CONSTRAINT IF EXISTS activity_logs_id_fkey1;

-- Ensure we have the correct user_id foreign key only
ALTER TABLE public.activity_logs
DROP CONSTRAINT IF EXISTS activity_logs_user_id_fkey,
ADD CONSTRAINT activity_logs_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES auth.users(id);

COMMIT; 