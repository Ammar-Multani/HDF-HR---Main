-- Add performance indexes to improve query speed and reduce "slow query" warnings

-- Company table indexes
CREATE INDEX IF NOT EXISTS idx_company_company_name ON company(company_name);
CREATE INDEX IF NOT EXISTS idx_company_registration_number ON company(registration_number);
CREATE INDEX IF NOT EXISTS idx_company_industry_type ON company(industry_type);
CREATE INDEX IF NOT EXISTS idx_company_created_at ON company(created_at);
CREATE INDEX IF NOT EXISTS idx_company_active ON company(active);

-- Add a combined index for search patterns commonly used together
CREATE INDEX IF NOT EXISTS idx_company_search 
ON company(company_name, registration_number, industry_type);

-- Company_user table indexes
CREATE INDEX IF NOT EXISTS idx_company_user_company_id ON company_user(company_id);
CREATE INDEX IF NOT EXISTS idx_company_user_email ON company_user(email);
CREATE INDEX IF NOT EXISTS idx_company_user_first_name ON company_user(first_name);
CREATE INDEX IF NOT EXISTS idx_company_user_last_name ON company_user(last_name);
CREATE INDEX IF NOT EXISTS idx_company_user_job_title ON company_user(job_title);
CREATE INDEX IF NOT EXISTS idx_company_user_created_at ON company_user(created_at);

-- Add a combined index for employee searches
CREATE INDEX IF NOT EXISTS idx_company_user_search 
ON company_user(first_name, last_name, email, job_title);

-- Add a GIN index for text search operations on company
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_company_trgm_search ON company 
USING gin((company_name || ' ' || registration_number || ' ' || industry_type) gin_trgm_ops);

-- Add a GIN index for text search operations on company_user
CREATE INDEX IF NOT EXISTS idx_company_user_trgm_search ON company_user 
USING gin((first_name || ' ' || last_name || ' ' || email || ' ' || job_title) gin_trgm_ops);

-- Create an efficient stored procedure to get company counts in a single query
CREATE OR REPLACE FUNCTION get_company_counts(company_id UUID)
RETURNS JSON AS $$
DECLARE
    total_count INTEGER;
    active_count INTEGER;
    result JSON;
BEGIN
    -- Get total count and active count in a single query using conditional count
    SELECT 
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE active_status = 'ACTIVE') AS active
    INTO total_count, active_count
    FROM company_user
    WHERE company_id = $1;
    
    -- Construct the result as JSON
    result := json_build_object(
        'total_count', total_count,
        'active_count', active_count
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql; 