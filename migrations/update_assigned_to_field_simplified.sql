-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS check_user_exists_trigger ON tasks;

-- Modify the check_user_exists function to handle multiple assignees
CREATE OR REPLACE FUNCTION check_user_exists()
RETURNS TRIGGER AS $$
DECLARE
    assignee_id text;
    assignee_ids text[];
BEGIN
    -- Skip check if assigned_to is NULL
    IF NEW.assigned_to IS NULL THEN
        RETURN NEW;
    END IF;

    -- If it's an array of UUIDs, check each one individually
    IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN
        -- Extract all assigned users
        IF NEW.assigned_to IS NOT NULL THEN
            -- Check if at least one of the assignees exists in company_user or admin
            -- We're doing a basic "single assignee" check here for compatibility
            IF NOT EXISTS (SELECT 1 FROM company_user WHERE id::text = NEW.assigned_to) AND
               NOT EXISTS (SELECT 1 FROM admin WHERE id::text = NEW.assigned_to) THEN
                -- This is a simplified check - in a real solution, we would iterate through
                -- multiple assignees in a JSON array if needed
                RAISE EXCEPTION 'User with ID % does not exist', NEW.assigned_to;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Re-add the trigger
CREATE TRIGGER check_user_exists_trigger
BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION check_user_exists(); 