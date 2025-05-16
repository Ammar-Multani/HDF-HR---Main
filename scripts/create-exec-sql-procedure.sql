-- This file creates a stored procedure that allows executing dynamic SQL
-- from Node.js scripts. This is needed for our table creation scripts to work.

-- Create the exec_sql function if it doesn't exist
CREATE OR REPLACE FUNCTION exec_sql(sql_query text) 
RETURNS void AS $$
BEGIN
  EXECUTE sql_query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 