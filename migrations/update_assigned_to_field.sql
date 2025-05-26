-- First, identify the trigger function
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'check_user_exists';

-- Backup the original trigger function before modifying
CREATE OR REPLACE FUNCTION check_user_exists_backup()
RETURNS TRIGGER AS $$
BEGIN
    -- Copy the original function here (this is placeholder code)
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the existing trigger if it exists
DROP TRIGGER IF EXISTS check_user_exists_trigger ON tasks;

-- Create a new version of the check_user_exists function that handles JSON
CREATE OR REPLACE FUNCTION check_user_exists()
RETURNS TRIGGER AS $$
DECLARE
    user_id uuid;
    user_ids uuid[];
    json_array json;
BEGIN
    -- Skip check if assigned_to is NULL
    IF NEW.assigned_to IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Try to parse as JSON
    BEGIN
        json_array := NEW.assigned_to::json;
        
        -- If it's a JSON array, check each UUID in the array
        IF json_typeof(json_array) = 'array' THEN
            -- For each user ID in the array
            FOR i IN 0..json_array_length(json_array)-1 LOOP
                user_id := json_array->i;
                
                -- Check if user exists in either company_user or admin table
                IF NOT EXISTS (SELECT 1 FROM company_user WHERE id = user_id) AND
                   NOT EXISTS (SELECT 1 FROM admin WHERE id = user_id) THEN
                    RAISE EXCEPTION 'User with ID % does not exist', user_id;
                END IF;
            END LOOP;
        END IF;
        
        RETURN NEW;
    EXCEPTION WHEN others THEN
        -- If parsing as JSON fails, treat as a single UUID
        -- For backward compatibility with existing data
        IF NOT EXISTS (SELECT 1 FROM company_user WHERE id = NEW.assigned_to::uuid) AND
           NOT EXISTS (SELECT 1 FROM admin WHERE id = NEW.assigned_to::uuid) THEN
            RAISE EXCEPTION 'User with ID % does not exist', NEW.assigned_to;
        END IF;
        
        RETURN NEW;
    END;
END;
$$ LANGUAGE plpgsql;

-- First, create a temporary column to store the current values
ALTER TABLE tasks ADD COLUMN temp_assigned_to UUID;

-- Copy current values to the temporary column
UPDATE tasks SET temp_assigned_to = assigned_to::UUID WHERE assigned_to IS NOT NULL;

-- Drop the current column
ALTER TABLE tasks DROP COLUMN assigned_to;

-- Create a new column as TEXT to store JSON array of UUIDs
ALTER TABLE tasks ADD COLUMN assigned_to TEXT DEFAULT '[]';

-- Migrate single UUIDs to JSON arrays
UPDATE tasks SET assigned_to = CONCAT('["', temp_assigned_to, '"]') WHERE temp_assigned_to IS NOT NULL;

-- Drop the temporary column
ALTER TABLE tasks DROP COLUMN temp_assigned_to;

-- Re-add the trigger for the new column
CREATE TRIGGER check_user_exists_trigger
BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION check_user_exists();

-- Add comment explaining the column
COMMENT ON COLUMN tasks.assigned_to IS 'JSON array of user UUIDs this task is assigned to'; 