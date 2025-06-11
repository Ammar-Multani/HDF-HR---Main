import React from "react";
import {
  logTaskActivity,
  formatUserInfo,
  ActivityType,
} from "../utils/activityLogger";
import { useAuth } from "../contexts/AuthContext";

interface TaskActivityLoggerProps {
  children: (logActivity: typeof logTaskActivity) => React.ReactNode;
}

export const TaskActivityLogger: React.FC<TaskActivityLoggerProps> = ({
  children,
}) => {
  const { user } = useAuth();

  const handleLogActivity = async (
    activityType: ActivityType,
    taskId: string,
    taskTitle: string,
    companyId: string,
    additionalMetadata: any = {},
    oldValue: any = null,
    newValue: any = {}
  ) => {
    if (!user) {
      console.error("No user found for activity logging");
      return false;
    }

    const userInfo = formatUserInfo(user);
    return await logTaskActivity(
      activityType,
      taskId,
      taskTitle,
      companyId,
      userInfo,
      additionalMetadata,
      oldValue,
      newValue
    );
  };

  return <>{children(handleLogActivity)}</>;
};

// Example usage:
/*
<TaskActivityLogger>
  {(logActivity) => (
    <Button
      onPress={() => {
        logActivity(
          'UPDATE_STATUS',
          task.id,
          task.title,
          task.company_id,
          { status_change: { from: oldStatus, to: newStatus } },
          { status: oldStatus },
          { status: newStatus }
        );
      }}
    >
      Update Status
    </Button>
  )}
</TaskActivityLogger>
*/
