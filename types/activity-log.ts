export interface ActivityLogUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface ActivityLogCompany {
  id: string;
  name: string;
}

export interface ActivityLogMetadata {
  // Core metadata
  task_id?: string;
  task_title?: string;
  status?: string;
  priority?: string;

  // User information
  created_by?: ActivityLogUser;
  updated_by?: ActivityLogUser;
  assigned_to?: ActivityLogUser;
  added_by?: ActivityLogUser;
  admin?: ActivityLogUser;
  employee?: ActivityLogUser;

  // Company information
  company?: ActivityLogCompany;
  company_admin?: ActivityLogUser;

  // Action specific data
  changes?: string[];
  comment?: string;
  action?: string;
}

export interface ActivityLog {
  id?: string;
  user_id: string;
  activity_type: string;
  description: string;
  company_id?: string;
  metadata: ActivityLogMetadata;
  old_value?: any;
  new_value?: any;
  created_at?: string;
}

// Activity Types
export enum ActivityType {
  CREATE_TASK = "CREATE_TASK",
  UPDATE_TASK = "UPDATE_TASK",
  UPDATE_TASK_STATUS = "UPDATE_TASK_STATUS",
  ADD_COMMENT = "ADD_COMMENT",
  ASSIGN_USER = "ASSIGN_USER",
  REMOVE_USER = "REMOVE_USER",
  UPDATE_PROFILE = "UPDATE_PROFILE",
  PASSWORD_RESET = "PASSWORD_RESET",
  DATA_EXPORT = "DATA_EXPORT",
  ACCOUNT_DELETION = "ACCOUNT_DELETION",
  CREATE_COMPANY = "CREATE_COMPANY",
  UPDATE_COMPANY = "UPDATE_COMPANY",
  CREATE_SUPER_ADMIN = "CREATE_SUPER_ADMIN",
  UPDATE_SUPER_ADMIN = "UPDATE_SUPER_ADMIN",
  CREATE_COMPANY_ADMIN = "CREATE_COMPANY_ADMIN",
  UPDATE_COMPANY_ADMIN = "UPDATE_COMPANY_ADMIN",
  CREATE_EMPLOYEE = "CREATE_EMPLOYEE",
  UPDATE_EMPLOYEE = "UPDATE_EMPLOYEE",
  CREATE_RECEIPT = "CREATE_RECEIPT",
  UPDATE_RECEIPT = "UPDATE_RECEIPT",
  SIGN_OUT = "SIGN_OUT",
}
