export type TaskPriority = 'Low' | 'Medium' | 'High';
export type TaskStatus = 'Open' | 'In Progress' | 'Awaiting Response' | 'Completed' | 'Overdue';
export type ReminderDays = 2 | 3 | 5 | 10;

export interface Task {
  id: string;
  title: string;
  description?: string;
  company_id: string;
  created_by: string; // UUID of company_user with role 'admin'
  assigned_to?: string; // UUID of company_user with role 'admin'
  deadline: string; // ISO date string
  priority: TaskPriority;
  status: TaskStatus;
  reminder_days_before: ReminderDays;
  reminder_sent_on?: string; // ISO date string
  created_at: string; // ISO date string
  updated_at: string; // ISO date string
}

export interface TaskComment {
  id: string;
  task_id: string;
  company_id: string;
  sender_id: string; // UUID of company_user
  message: string;
  attachment_path?: string;
  created_at: string; // ISO date string
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  file_path: string;
  file_type: string;
  uploaded_by: string; // UUID of company_user
  created_at: string; // ISO date string
}

// Type for creating a new task (omits auto-generated fields)
export type TaskInsert = Omit<Task, 'id' | 'created_at' | 'updated_at'>;

// Type for updating an existing task
export type TaskUpdate = Partial<Omit<Task, 'id' | 'created_at' | 'updated_at'>>;

// Type for creating a new task comment
export type TaskCommentInsert = Omit<TaskComment, 'id' | 'created_at'>;

// Type for creating a new task attachment
export type TaskAttachmentInsert = Omit<TaskAttachment, 'id' | 'created_at'>; 