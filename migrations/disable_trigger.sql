-- Disable the trigger temporarily
ALTER TABLE tasks DISABLE TRIGGER check_user_exists_trigger;

-- You can re-enable it later with:
-- ALTER TABLE tasks ENABLE TRIGGER check_user_exists_trigger; 