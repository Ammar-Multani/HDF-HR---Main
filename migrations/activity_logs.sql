-- Create enum for activity types
CREATE TYPE activity_type AS ENUM (
  'login',
  'logout',
  'profile_update',
  'password_change',
  'account_creation',
  'account_deletion',
  'data_access',
  'data_modification',
  'permission_change',
  'system_error'
);

-- Create activity_logs table
CREATE TABLE public.activity_logs (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  activity_type activity_type NOT NULL,
  description text NOT NULL,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  company_id uuid,
  CONSTRAINT activity_logs_pkey PRIMARY KEY (id),
  CONSTRAINT activity_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT activity_logs_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company(id)
);

-- Create index for faster queries
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at);
CREATE INDEX idx_activity_logs_activity_type ON public.activity_logs(activity_type);
CREATE INDEX idx_activity_logs_company_id ON public.activity_logs(company_id);

-- Add RLS policies
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy for admins to see all logs
CREATE POLICY admin_all_access ON public.activity_logs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin 
      WHERE admin.id = auth.uid() 
      AND admin.status = true 
      AND admin.deleted_at IS NULL
    )
  );

-- Policy for company users to see only their company's logs
CREATE POLICY company_user_access ON public.activity_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.company_user 
      WHERE company_user.id = auth.uid() 
      AND company_user.company_id = activity_logs.company_id
      AND company_user.deleted_at IS NULL
    )
  );

-- Grant permissions
GRANT ALL ON public.activity_logs TO authenticated; 