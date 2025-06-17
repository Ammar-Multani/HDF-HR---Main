-- 1. Check system maintenance logs
SELECT 
    created_at,
    description,
    metadata->>'archived_count' as archived_count,
    metadata->>'archive_date' as archive_date
FROM activity_logs
WHERE activity_type = 'SYSTEM_MAINTENANCE'
ORDER BY created_at DESC
LIMIT 5;

-- 2. Count logs by age
WITH log_counts AS (
    SELECT
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '6 months') as active_logs,
        COUNT(*) FILTER (WHERE created_at <= NOW() - INTERVAL '6 months') as should_be_archived
    FROM activity_logs
),
archive_counts AS (
    SELECT
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 year') as archived_logs,
        COUNT(*) FILTER (WHERE created_at <= NOW() - INTERVAL '1 year') as should_be_deleted
    FROM activity_logs_archive
)
SELECT 
    active_logs as "Active Logs (< 6 months)",
    should_be_archived as "Logs To Archive (> 6 months)",
    archived_logs as "Archived Logs (6-12 months)",
    should_be_deleted as "Archives To Delete (> 1 year)"
FROM log_counts, archive_counts;

-- 3. Check latest archived logs
SELECT 
    created_at,
    archived_at,
    activity_type,
    description
FROM activity_logs_archive
ORDER BY archived_at DESC
LIMIT 5;

-- 4. Check oldest logs still in main table
SELECT 
    created_at,
    activity_type,
    description
FROM activity_logs
WHERE created_at < NOW() - INTERVAL '5 months'
ORDER BY created_at ASC
LIMIT 5;

-- 5. Check archive distribution by month
SELECT 
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) as log_count
FROM activity_logs_archive
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC; 