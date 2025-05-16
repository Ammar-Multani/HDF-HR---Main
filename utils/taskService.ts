import { supabase, cachedQuery } from '../lib/supabase';
import {
  Task,
  TaskInsert,
  TaskUpdate,
  TaskComment,
  TaskCommentInsert,
  TaskAttachment,
  TaskAttachmentInsert
} from '../types/tasks';

// TASKS FUNCTIONS

/**
 * Get all tasks for a company
 */
export const getCompanyTasks = async (companyId: string) => {
  return await cachedQuery<Task[]>(
    () => supabase
      .from('tasks')
      .select(`
        *,
        creator:created_by(id, first_name, last_name, email),
        assignee:assigned_to(id, first_name, last_name, email)
      `)
      .eq('company_id', companyId)
      .order('deadline', { ascending: true }),
    `company_tasks_${companyId}`,
    { cacheTtl: 5 * 60 * 1000 } // Cache for 5 minutes
  );
};

/**
 * Get a specific task by ID
 */
export const getTaskById = async (taskId: string) => {
  return await cachedQuery<Task>(
    () => supabase
      .from('tasks')
      .select(`
        *,
        creator:created_by(id, first_name, last_name, email),
        assignee:assigned_to(id, first_name, last_name, email)
      `)
      .eq('id', taskId)
      .single(),
    `task_${taskId}`,
    { cacheTtl: 5 * 60 * 1000 } // Cache for 5 minutes
  );
};

/**
 * Create a new task
 */
export const createTask = async (task: TaskInsert) => {
  const { data, error } = await supabase
    .from('tasks')
    .insert(task)
    .select(`
      *,
      creator:created_by(id, first_name, last_name, email),
      assignee:assigned_to(id, first_name, last_name, email)
    `)
    .single();
  
  return { data, error };
};

/**
 * Update an existing task
 */
export const updateTask = async (taskId: string, updates: TaskUpdate) => {
  const { data, error } = await supabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select(`
      *,
      creator:created_by(id, first_name, last_name, email),
      assignee:assigned_to(id, first_name, last_name, email)
    `)
    .single();
  
  return { data, error };
};

/**
 * Delete a task
 */
export const deleteTask = async (taskId: string) => {
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);
  
  return { error };
};

// TASK COMMENTS FUNCTIONS

/**
 * Get all comments for a task
 */
export const getTaskComments = async (taskId: string) => {
  return await cachedQuery<TaskComment[]>(
    () => supabase
      .from('task_comments')
      .select(`
        *,
        sender:sender_id(id, first_name, last_name, email, role)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true }),
    `task_comments_${taskId}`,
    { cacheTtl: 5 * 60 * 1000 } // Cache for 5 minutes
  );
};

/**
 * Add a comment to a task
 */
export const addTaskComment = async (comment: TaskCommentInsert) => {
  const { data, error } = await supabase
    .from('task_comments')
    .insert(comment)
    .select(`
      *,
      sender:sender_id(id, first_name, last_name, email, role)
    `)
    .single();
  
  return { data, error };
};

/**
 * Delete a task comment
 */
export const deleteTaskComment = async (commentId: string) => {
  const { error } = await supabase
    .from('task_comments')
    .delete()
    .eq('id', commentId);
  
  return { error };
};

// TASK ATTACHMENTS FUNCTIONS

/**
 * Get all attachments for a task
 */
export const getTaskAttachments = async (taskId: string) => {
  return await cachedQuery<TaskAttachment[]>(
    () => supabase
      .from('task_attachments')
      .select(`
        *,
        uploader:uploaded_by(id, first_name, last_name, email)
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true }),
    `task_attachments_${taskId}`,
    { cacheTtl: 5 * 60 * 1000 } // Cache for 5 minutes
  );
};

/**
 * Add an attachment to a task
 */
export const addTaskAttachment = async (attachment: TaskAttachmentInsert) => {
  const { data, error } = await supabase
    .from('task_attachments')
    .insert(attachment)
    .select(`
      *,
      uploader:uploaded_by(id, first_name, last_name, email)
    `)
    .single();
  
  return { data, error };
};

/**
 * Delete a task attachment
 */
export const deleteTaskAttachment = async (attachmentId: string) => {
  const { error } = await supabase
    .from('task_attachments')
    .delete()
    .eq('id', attachmentId);
  
  return { error };
};

/**
 * Upload a file to Supabase storage for a task attachment
 */
export const uploadTaskFile = async (
  file: File | Blob,
  companyId: string,
  taskId: string,
  fileName: string
) => {
  const filePath = `${companyId}/tasks/${taskId}/${fileName}`;
  
  const { data, error } = await supabase
    .storage
    .from('task-attachments')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });
  
  return { data, error };
};

/**
 * Get the URL for a task attachment
 */
export const getTaskFileUrl = async (filePath: string) => {
  const { data } = await supabase
    .storage
    .from('task-attachments')
    .getPublicUrl(filePath);
  
  return data.publicUrl;
}; 