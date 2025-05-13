-- NOTE: Run each ALTER SYSTEM command separately in the SQL Editor
-- since they can't run in a transaction block

-- Set the JWT Secret to match our app's environment variable
-- Run this first:
ALTER SYSTEM SET jwt.secret TO 'g5jFRZ21CM678CxS81yKGDRIjTHcLwSP/2bZTkfxwqU=';

-- Then run this:
ALTER SYSTEM SET jwt.claim.sub TO 'sub';

-- Then run this:
ALTER SYSTEM SET jwt.exp_claim TO 'exp';

-- Then run this:
ALTER SYSTEM SET jwt.claim.role TO 'role';

-- Then run this:
ALTER DATABASE postgres SET pgrst.db_schema_cache_max_size TO 1;

-- Then run this:
ALTER DATABASE postgres SET pgrst.db_extra_search_path TO 'public';

-- Then run this to reload configurations:
SELECT pg_reload_conf();

-- Finally, run this to verify JWT settings:
SELECT name, setting, category 
FROM pg_settings 
WHERE name LIKE 'jwt%'; 
-- Finally, run this to verify JWT settings:
SELECT name, setting, category 
FROM pg_settings 
