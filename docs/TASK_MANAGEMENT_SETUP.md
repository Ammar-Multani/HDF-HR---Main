# Task Management System Setup

This document provides instructions for setting up the task management system in your HDF-HR application.

## Overview

The task management system consists of the following components:

1. Database tables for storing task data:

   - `tasks` - Stores task information, deadlines, assignments, etc.
   - `task_comments` - Stores comments/conversations about tasks
   - `task_attachments` - Stores metadata about files attached to tasks

2. Storage bucket for task attachments:
   - `task-attachments` - Supabase storage bucket for files

## Prerequisites

1. A Supabase project set up and configured with your application
2. Admin access to your Supabase project (Service Role Key)
3. Node.js installed on your system

## Setup Instructions

### 1. Set up required environment variables

First, make sure you have the required environment variables in your `.env` file:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

The Service Role Key can be found in your Supabase dashboard under Project Settings > API > Project API keys.

### 2. Run the complete setup script

The easiest way to set up the entire task management system is to run the following command:

```bash
npm run setup:tasks
```

This script will:

1. Create the required exec_sql stored procedure
2. Create all necessary database tables
3. Set up the storage bucket for task attachments
4. Apply optimization indexes

### 3. Verify the setup

After running the setup script, verify that the tables and storage bucket have been created:

1. Log in to your Supabase dashboard
2. Go to the "Table Editor" section and check for the `tasks`, `task_comments`, and `task_attachments` tables
3. Go to the "Storage" section and check for the `task-attachments` bucket

## Individual Setup Steps (if needed)

If you prefer to run the setup steps individually:

### Setup the exec_sql procedure

```bash
npm run db:create-exec-sql
```

### Create the database tables

```bash
npm run db:create-task-tables
```

### Create the storage bucket

```bash
npm run db:create-storage
```

## Troubleshooting

If you encounter any issues during setup:

1. Check your Supabase credentials in the `.env` file
2. Make sure your Supabase service role key has sufficient permissions
3. Check the console output for specific error messages
4. Try running the individual setup steps one by one

## Usage

Once the task management system is set up, you can use the provided utility functions in `utils/taskService.ts` to interact with tasks:

- `getCompanyTasks` - Get all tasks for a company
- `createTask` - Create a new task
- `updateTask` - Update an existing task
- `getTaskComments` - Get all comments for a task
- `addTaskComment` - Add a comment to a task
- `getTaskAttachments` - Get all attachments for a task
- `uploadTaskFile` - Upload a file for a task

For additional details, refer to the TypeScript interfaces in `types/tasks.ts`.
