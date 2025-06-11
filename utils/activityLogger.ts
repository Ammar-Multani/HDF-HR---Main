import { supabase } from "../lib/supabase";
import { TaskStatus, TaskPriority } from "../types";

export type ActivityType =
  | "CREATE"
  | "UPDATE"
  | "UPDATE_STATUS"
  | "ADD_COMMENT"
  | "DELETE";

interface ActivityLogBase {
  user_id: string;
  company_id: string;
  activity_type: ActivityType;
  description: string;
  metadata: {
    task_id: string;
    task_title: string;
    [key: string]: any;
  };
  old_value: any | null;
  new_value: any;
}

interface UserInfo {
  id: string;
  name: string;
  email: string;
}

export const logTaskActivity = async (
  activityType: ActivityType,
  taskId: string,
  taskTitle: string,
  companyId: string,
  user: UserInfo,
  additionalMetadata: any = {},
  oldValue: any = null,
  newValue: any = {}
) => {
  try {
    const activityLogData: ActivityLogBase = {
      user_id: user.id,
      company_id: companyId,
      activity_type: activityType,
      description: generateDescription(
        activityType,
        taskTitle,
        user,
        oldValue,
        newValue
      ),
      metadata: {
        task_id: taskId,
        task_title: taskTitle,
        ...additionalMetadata,
      },
      old_value: oldValue ? { id: taskId, ...oldValue } : null,
      new_value: { id: taskId, ...newValue },
    };

    const { error } = await supabase
      .from("activity_logs")
      .insert([activityLogData]);

    if (error) {
      console.error("Error logging activity:", error);
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Error in logTaskActivity:", error);
    return false;
  }
};

const generateDescription = (
  activityType: ActivityType,
  taskTitle: string,
  user: UserInfo,
  oldValue: any,
  newValue: any
): string => {
  switch (activityType) {
    case "CREATE":
      return `New task "${taskTitle}" created by ${user.name} (${user.email})`;

    case "UPDATE":
      const changes: string[] = [];
      if (oldValue?.title !== newValue?.title) {
        changes.push(
          `Title changed from "${oldValue?.title}" to "${newValue?.title}"`
        );
      }
      if (oldValue?.description !== newValue?.description) {
        changes.push(`Description updated`);
      }
      if (oldValue?.priority !== newValue?.priority) {
        changes.push(
          `Priority changed from "${oldValue?.priority}" to "${newValue?.priority}"`
        );
      }
      return `Task "${taskTitle}" updated by ${user.name} (${user.email}). ${changes.join(". ")}`;

    case "UPDATE_STATUS":
      return `Task status updated by ${user.name} (${user.email}). Status changed from "${oldValue?.status}" to "${newValue?.status}"`;

    case "ADD_COMMENT":
      return `New comment added by ${user.name} (${user.email}) on task "${taskTitle}"`;

    case "DELETE":
      return `Task "${taskTitle}" deleted by ${user.name} (${user.email})`;

    default:
      return `Task "${taskTitle}" modified by ${user.name} (${user.email})`;
  }
};

// Helper function to format user info
export const formatUserInfo = (user: any): UserInfo => {
  return {
    id: user.id,
    name: user.name || user.email,
    email: user.email,
  };
};

// Helper function to track task changes
export const getTaskChanges = (oldTask: any, newTask: any) => {
  const changes: any = {};

  if (oldTask.title !== newTask.title) {
    changes.title = {
      previous: oldTask.title,
      current: newTask.title,
      changed: true,
    };
  }

  if (oldTask.description !== newTask.description) {
    changes.description = {
      previous: oldTask.description,
      current: newTask.description,
      changed: true,
    };
  }

  if (oldTask.priority !== newTask.priority) {
    changes.priority = {
      previous: oldTask.priority,
      current: newTask.priority,
      changed: true,
    };
  }

  if (oldTask.status !== newTask.status) {
    changes.status = {
      previous: oldTask.status,
      current: newTask.status,
      changed: true,
    };
  }

  return changes;
};
