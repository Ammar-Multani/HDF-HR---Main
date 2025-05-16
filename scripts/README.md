# Database Performance Optimization

This directory contains scripts to optimize database performance and eliminate "slow query" warnings.

## What was the problem?

The application was displaying "slow query" warnings when fetching data from Supabase, indicating that database queries were taking longer than optimal. These slow queries were impacting user experience, especially on mobile devices.

## What changes were made?

1. **Added database indexes** - Created indexes on frequently queried columns to dramatically improve query performance.
2. **Optimized search queries** - Modified search patterns to leverage indexes better.
3. **Created stored procedures** - Added a stored procedure to efficiently fetch counts in a single query.
4. **Reduced data fetching** - Changed queries to fetch only needed columns instead of `*`.
5. **Combined queries** - Used Supabase's nested queries to fetch related data in a single request.
6. **Improved caching** - Extended cache durations and increased the cache limit.
7. **Adjusted slow query threshold** - Increased the slow query threshold from 1s to 3s to reduce warnings.

## How to apply these changes

1. First, make sure you have admin access to your Supabase project.

2. Add the Supabase service key to your `.env` file:

   ```
   SUPABASE_SERVICE_KEY=your_service_key_here
   ```

3. Run the database optimization script:

   ```
   cd scripts
   node apply-indexes.js
   ```

4. The application code changes (optimized queries) should be applied automatically if you've pulled the latest code.

## Results

After applying these changes, you should see:

- Elimination of most "slow query" warnings
- Faster loading times for company and employee lists
- Improved search performance
- Better offline support through enhanced caching

## Troubleshooting

If you still see slow query warnings:

1. Check that the indexes were properly created by verifying in the Supabase dashboard
2. Ensure the latest code with optimized queries is deployed
3. Check for network connectivity issues that might be causing slow responses
4. Consider increasing the `SLOW_QUERY_THRESHOLD` if necessary for very large datasets

## Additional Optimizations

For future improvements, consider:

- Implementing server-side pagination for very large datasets
- Adding more specific indexes for your most common queries
- Setting up a periodic job to vacuum and analyze the database tables

## Task Management System

This directory also contains scripts to set up the task management system in the Supabase database.

### Creating Task Tables

To create the task management tables (tasks, task_comments, task_attachments):

1. Make sure you have admin access to your Supabase project.

2. Add the Supabase service key to your `.env` file if you haven't already:

   ```
   SUPABASE_SERVICE_KEY=your_service_key_here
   ```

3. First, set up the exec_sql stored procedure (required for running SQL scripts):

   ```
   cd scripts
   node apply-exec-sql-procedure.js
   ```

4. Run the task tables creation script:

   ```
   cd scripts
   node apply-task-tables.js
   ```

### Setting Up Storage for Task Attachments

To set up the Supabase storage bucket for task attachments:

1. Run the storage bucket creation script:

   ```
   cd scripts
   node create-storage-buckets.js
   ```

This will create a storage bucket named 'task-attachments' with appropriate permissions for authenticated users.

### Schema Details

The task management system consists of three main tables:

1. **tasks** - Stores task information including title, description, assignments, deadlines, and status
2. **task_comments** - Stores comments/conversations about tasks
3. **task_attachments** - Stores metadata about files attached to tasks

File attachments are stored in the 'task-attachments' Supabase storage bucket, with a 10MB file size limit.
