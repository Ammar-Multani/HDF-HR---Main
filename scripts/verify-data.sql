-- Verify Super Admin Exists
SELECT 'Super Admin' AS check_type, 
       CASE 
         WHEN COUNT(*) > 0 THEN 'FOUND'
         ELSE 'MISSING'
       END AS status
FROM admin 
WHERE id = '9b493703-31b0-406a-9be2-6a991448a245';

-- Verify Company Admin Exists
SELECT 'Company Admin' AS check_type, 
       CASE 
         WHEN COUNT(*) > 0 THEN 'FOUND'
         ELSE 'MISSING'
       END AS status
FROM company_user 
WHERE id = '1687dcac-856a-4d9c-b613-f363934cd445' AND role = 'admin';

-- Verify Employee Exists
SELECT 'Employee' AS check_type, 
       CASE 
         WHEN COUNT(*) > 0 THEN 'FOUND'
         ELSE 'MISSING'
       END AS status
FROM company_user 
WHERE id = '1199b0a6-bcd1-4d28-9748-a1ec96d897cb' AND role = 'employee';

-- Now check what data actually exists (for debugging)
SELECT 'Admin table count' AS info, COUNT(*) AS value FROM admin;
SELECT 'Company_user table count' AS info, COUNT(*) AS value FROM company_user;

-- Show all admins
SELECT id, name, email, role, status FROM admin LIMIT 10;

-- Show all company users
SELECT id, first_name, last_name, email, role, active_status FROM company_user LIMIT 10; 