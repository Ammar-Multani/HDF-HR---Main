-- Create activity_logs_archive table
CREATE TABLE IF NOT EXISTS public.activity_logs_archive (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL,
  activity_type activity_type NOT NULL,
  description text NOT NULL,
  ip_address text,
  user_agent text,
  metadata jsonb,
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  company_id uuid,
  archived_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT activity_logs_archive_pkey PRIMARY KEY (id),
  CONSTRAINT activity_logs_archive_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT activity_logs_archive_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.company(id)
);

-- Create indexes for faster queries
CREATE INDEX idx_activity_logs_archive_user_id ON public.activity_logs_archive(user_id);
CREATE INDEX idx_activity_logs_archive_created_at ON public.activity_logs_archive(created_at);
CREATE INDEX idx_activity_logs_archive_activity_type ON public.activity_logs_archive(activity_type);
CREATE INDEX idx_activity_logs_archive_company_id ON public.activity_logs_archive(company_id);
CREATE INDEX idx_activity_logs_archive_archived_at ON public.activity_logs_archive(archived_at);

