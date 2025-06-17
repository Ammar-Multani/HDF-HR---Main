-- Function to generate test logs with different dates
CREATE OR REPLACE FUNCTION generate_test_logs()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    test_user_id uuid;
    test_company_id uuid;
    i integer;
    log_date timestamp;
BEGIN
    -- Get a test user and company ID (modify this according to your data)
    SELECT id INTO test_user_id FROM users LIMIT 1;
    SELECT id INTO test_company_id FROM company LIMIT 1;
    
    -- Generate logs from the past 2 years
    FOR i IN 1..100 LOOP
        -- Random date between 2 years ago and now
        log_date := NOW() - (random() * INTERVAL '2 years');
        
        INSERT INTO activity_logs (
            user_id,
            company_id,
            activity_type,
            description,
            metadata,
            created_at
        ) VALUES (
            test_user_id,
            test_company_id,
            (ARRAY['login', 'logout', 'profile_update', 'data_access'])[floor(random() * 4 + 1)],
            'Test log entry #' || i,
            jsonb_build_object(
                'test_data', true,
                'sequence', i
            ),
            log_date
        );
    END LOOP;
END;
$$;

-- Execute the function to generate test data
SELECT generate_test_logs(); 