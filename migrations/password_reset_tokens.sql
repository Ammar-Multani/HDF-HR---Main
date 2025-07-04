-- Create password_reset_tokens table for custom password reset flow
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  
  -- Add indexes for faster lookups
  CONSTRAINT idx_token UNIQUE (token),
  CONSTRAINT idx_email_token UNIQUE (email, token)
);

-- Create RLS policies
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own reset tokens" ON password_reset_tokens;
DROP POLICY IF EXISTS "Users can update their own reset tokens" ON password_reset_tokens;
DROP POLICY IF EXISTS "Service role can manage all tokens" ON password_reset_tokens;
DROP POLICY IF EXISTS "Anon users can create tokens" ON password_reset_tokens;
DROP POLICY IF EXISTS "Anon users can read tokens" ON password_reset_tokens;
DROP POLICY IF EXISTS "Anon users can update tokens" ON password_reset_tokens;

-- Allow authenticated users to read tokens matching their email
CREATE POLICY "Users can read their own reset tokens" ON password_reset_tokens
  FOR SELECT
  USING (
    auth.jwt() ->> 'email' = email OR
    auth.jwt() ->> 'role' IN ('service_role', 'supabase_admin', 'admin', 'superadmin')
  );

-- Allow authenticated users to insert tokens for their own email
CREATE POLICY "Users can create their own reset tokens" ON password_reset_tokens
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'email' = email OR
    auth.jwt() ->> 'role' IN ('service_role', 'supabase_admin', 'admin', 'superadmin')
  );

-- Allow authenticated users to update their own tokens
CREATE POLICY "Users can update their own reset tokens" ON password_reset_tokens
  FOR UPDATE
  USING (
    auth.jwt() ->> 'email' = email OR
    auth.jwt() ->> 'role' IN ('service_role', 'supabase_admin', 'admin', 'superadmin')
  );

-- Allow service role and admins to manage all tokens
CREATE POLICY "Admins can manage all tokens" ON password_reset_tokens
  FOR ALL
  USING (auth.jwt() ->> 'role' IN ('service_role', 'supabase_admin', 'admin', 'superadmin'));

-- Allow anon users to create tokens (needed for initial password reset request)
CREATE POLICY "Anon users can create tokens" ON password_reset_tokens
  FOR INSERT
  TO anon
  WITH CHECK (
    -- Basic validation that email is provided
    email IS NOT NULL AND
    -- Ensure token and expiry are set
    token IS NOT NULL AND
    expires_at IS NOT NULL AND
    -- Ensure expiry is in the future
    expires_at > NOW()
  );

-- Allow anon users to read tokens (needed for verification)
CREATE POLICY "Anon users can read tokens" ON password_reset_tokens
  FOR SELECT
  TO anon
  USING (
    -- Only allow reading unexpired and unused tokens
    expires_at > NOW() AND
    NOT used
  );

-- Add function to clean up expired tokens
CREATE OR REPLACE FUNCTION cleanup_expired_reset_tokens()
RETURNS json AS $$
DECLARE
  expired_count INTEGER;
  used_count INTEGER;
  result json;
BEGIN
  -- Delete expired tokens
  WITH deleted_expired AS (
    DELETE FROM password_reset_tokens
    WHERE expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO expired_count FROM deleted_expired;
  
  -- Delete used tokens older than 7 days
  WITH deleted_used AS (
    DELETE FROM password_reset_tokens
    WHERE used = true AND created_at < NOW() - INTERVAL '7 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO used_count FROM deleted_used;
  
  -- Create result JSON
  SELECT json_build_object(
    'success', true,
    'expired_tokens_removed', expired_count,
    'used_tokens_removed', used_count,
    'timestamp', NOW()
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated and service role users
GRANT EXECUTE ON FUNCTION cleanup_expired_reset_tokens() TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_reset_tokens() TO service_role;

-- Create a scheduled job to run the cleanup function daily
-- Note: This requires pg_cron extension to be enabled
-- COMMENT OUT IF pg_cron is not available
-- SELECT cron.schedule('0 0 * * *', 'SELECT cleanup_expired_reset_tokens()'); 