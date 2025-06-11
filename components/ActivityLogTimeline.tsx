import React from "react";
import { View, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import {
  Text,
  Surface,
  useTheme,
  IconButton,
  Divider,
  Button,
} from "react-native-paper";
import { format, isToday, isYesterday } from "date-fns";
import { t } from "i18next";
import { useNavigation } from "@react-navigation/native";

interface ActivityLog {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
  metadata?: {
    task_title?: string;
    task_id?: string;
    created_by?: {
      name: string;
      email: string;
      id: string;
      role?: string;
    };
    updated_by?: {
      name: string;
      email: string;
      id: string;
      role?: string;
    };
    assigned_to?: {
      id: string;
      name: string;
      role?: string;
    };
    changes?: string[];
    status_change?: {
      from: string;
      to: string;
    };
    comment?: string;
  };
  old_value?: any;
  new_value?: any;
  user_id: string;
  company_id?: string;
}

interface ActivityLogTimelineProps {
  logs: ActivityLog[];
  showViewAll?: boolean;
  showHeader?: boolean;
  title?: string;
  containerStyle?: any;
}

const ActivityLogTimeline: React.FC<ActivityLogTimelineProps> = ({
  logs,
  showViewAll = true,
  showHeader = true,
  title,
  containerStyle,
}) => {
  const theme = useTheme();
  const navigation = useNavigation();

  // Group logs by date
  const groupedLogs = logs.reduce(
    (groups: { [key: string]: ActivityLog[] }, log) => {
      const date = format(new Date(log.created_at), "yyyy-MM-dd");
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(log);
      return groups;
    },
    {}
  );

  // Get activity icon based on type
  const getActivityIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case "CREATE":
        return "plus-circle";
      case "CREATE_TASK":
        return "plus-circle";
      case "UPDATE":
        return "pencil";
      case "UPDATE_TASK":
        return "pencil";
      case "UPDATE_STATUS":
        return "refresh";
      case "ADD_COMMENT":
        return "comment-text";
      case "ASSIGN_USER":
        return "account-plus";
      case "REMOVE_USER":
        return "account-minus";
      default:
        return "information";
    }
  };

  // Get activity color based on type
  const getActivityColor = (type: string) => {
    switch (type.toUpperCase()) {
      case "CREATE":
      case "CREATE_TASK":
        return "#10B981"; // Green
      case "UPDATE":
      case "UPDATE_TASK":
        return "#6366F1"; // Indigo
      case "UPDATE_STATUS":
        return "#F59E0B"; // Amber
      case "ADD_COMMENT":
        return "#8B5CF6"; // Purple
      case "ASSIGN_USER":
        return "#3B82F6"; // Blue
      case "REMOVE_USER":
        return "#EF4444"; // Red
      default:
        return "#6B7280"; // Gray
    }
  };

  // Function to handle navigation to task details
  const handleTaskPress = (taskId: string) => {
    // @ts-ignore - Navigation typing can be complex
    navigation.navigate("TaskDetails", { taskId });
  };

  // Function to handle navigation to user details
  const handleUserPress = (userId: string, userRole?: string) => {
    if (userRole?.toLowerCase().includes("superadmin")) {
      // @ts-ignore - Navigation typing can be complex
      navigation.navigate("EditSuperAdmin", { adminId: userId });
    } else if (userRole?.toLowerCase().includes("admin")) {
      // @ts-ignore - Navigation typing can be complex
      navigation.navigate("EditCompanyAdmin", { adminId: userId });
    } else {
      // @ts-ignore - Navigation typing can be complex
      navigation.navigate("EditEmployee", { employeeId: userId });
    }
  };

  // Function to render clickable text with metadata
  const renderClickableDescription = (log: ActivityLog) => {
    const parts: React.ReactNode[] = [];
    let currentIndex = 0;

    // Helper function to add non-clickable text
    const addTextPart = (text: string) => {
      if (text) {
        parts.push(
          <Text key={`text-${currentIndex}`} style={styles.logDescription}>
            {text}
          </Text>
        );
        currentIndex++;
      }
    };

    // Helper function to add clickable user
    const addUserPart = (
      user: { id: string; name: string; role?: string },
      prefix: string = ""
    ) => {
      if (user?.id && user?.name) {
        parts.push(
          <TouchableOpacity
            key={`user-${currentIndex}`}
            onPress={() => handleUserPress(user.id, user.role)}
          >
            <Text style={[styles.logDescription, styles.clickableText]}>
              {prefix}
              {user.name}
            </Text>
          </TouchableOpacity>
        );
        currentIndex++;
      }
    };

    // Helper function to add clickable task
    const addTaskPart = (
      taskId: string,
      taskTitle: string,
      prefix: string = ""
    ) => {
      if (taskId && taskTitle) {
        parts.push(
          <TouchableOpacity
            key={`task-${currentIndex}`}
            onPress={() => handleTaskPress(taskId)}
          >
            <Text style={[styles.logDescription, styles.clickableText]}>
              {prefix}"{taskTitle}"
            </Text>
          </TouchableOpacity>
        );
        currentIndex++;
      }
    };

    // Start building the interactive description
    if (log.metadata) {
      const { task_id, task_title, created_by, updated_by, assigned_to } =
        log.metadata;

      switch (log.activity_type.toUpperCase()) {
        case "CREATE_TASK":
          addUserPart(created_by!, "");
          addTextPart(" created task ");
          addTaskPart(task_id!, task_title!, "");
          break;

        case "UPDATE_TASK":
          addUserPart(updated_by!, "");
          addTextPart(" updated task ");
          addTaskPart(task_id!, task_title!, "");
          break;

        case "UPDATE_STATUS":
          addUserPart(updated_by!, "");
          addTextPart(" updated status of task ");
          addTaskPart(task_id!, task_title!, "");
          addTextPart(
            ` from "${log.metadata.status_change?.from}" to "${log.metadata.status_change?.to}"`
          );
          break;

        case "ADD_COMMENT":
          addUserPart(created_by!, "");
          addTextPart(" commented on task ");
          addTaskPart(task_id!, task_title!, "");
          if (log.metadata.comment) {
            addTextPart(`: "${log.metadata.comment}"`);
          }
          break;

        case "ASSIGN_USER":
          addUserPart(updated_by!, "");
          addTextPart(" assigned ");
          addUserPart(assigned_to!, "");
          addTextPart(" to task ");
          addTaskPart(task_id!, task_title!, "");
          break;

        default:
          addTextPart(log.description);
      }
    } else {
      addTextPart(log.description);
    }

    return <View style={styles.logDescriptionContainer}>{parts}</View>;
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return "Today";
    }
    if (isYesterday(date)) {
      return "Yesterday";
    }
    return format(date, "MMMM d, yyyy");
  };

  return (
    <Surface style={[styles.container, containerStyle]}>
      {showHeader && (
        <>
          <View style={styles.header}>
            <IconButton
              icon="clock-outline"
              size={24}
              iconColor={theme.colors.primary}
            />
            <Text style={styles.headerTitle}>
              {title || t("superAdmin.dashboard.latestActivities")}
            </Text>
            {showViewAll && (
              <View style={styles.viewAllButtonContainer}>
                <Button
                  mode="outlined"
                  onPress={() => {
                    // @ts-ignore - Navigation typing can be complex
                    navigation.navigate("ActivityLogs" as never);
                  }}
                  icon="chevron-right"
                  style={styles.viewAllButton}
                  labelStyle={styles.viewAllButtonLabel}
                >
                  {t("superAdmin.dashboard.viewAll")}
                </Button>
              </View>
            )}
          </View>
          <Divider />
        </>
      )}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
      >
        {Object.entries(groupedLogs)
          .sort(
            ([dateA], [dateB]) =>
              new Date(dateB).getTime() - new Date(dateA).getTime()
          )
          .map(([date, dayLogs]) => (
            <View key={date} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>{formatDate(date)}</Text>
              {dayLogs
                .sort(
                  (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
                )
                .map((log, index) => (
                  <View key={log.id} style={styles.logItem}>
                    <View style={styles.timelineConnector}>
                      <View
                        style={[
                          styles.dot,
                          {
                            backgroundColor: getActivityColor(
                              log.activity_type
                            ),
                          },
                        ]}
                      />
                      {index !== dayLogs.length - 1 && (
                        <View
                          style={[
                            styles.line,
                            { backgroundColor: theme.colors.surfaceVariant },
                          ]}
                        />
                      )}
                    </View>
                    <View style={styles.logContent}>
                      <View style={styles.logTimeContainer}>
                        <Text style={styles.logTime}>
                          {format(new Date(log.created_at), "h:mm a")}
                        </Text>
                      </View>
                      <View style={styles.logHeader}>
                        <View style={styles.logTypeContainer}>
                          <IconButton
                            icon={getActivityIcon(log.activity_type)}
                            size={20}
                            iconColor={getActivityColor(log.activity_type)}
                            style={styles.logIcon}
                          />
                          <Text
                            style={[
                              styles.logType,
                              { color: getActivityColor(log.activity_type) },
                            ]}
                          >
                            {log.activity_type.replace(/_/g, " ")}
                          </Text>
                        </View>
                      </View>
                      {renderClickableDescription(log)}
                    </View>
                  </View>
                ))}
            </View>
          ))}
      </ScrollView>
    </Surface>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#1E293B",
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  scrollViewContent: {
    padding: 20,
  },
  viewAllButton: {
    borderColor: "#E2E8F0",
    borderRadius: 16,
  },
  viewAllButtonLabel: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
  },
  dateGroup: {
    marginBottom: 24,
  },
  dateHeader: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    color: "#64748B",
    marginBottom: 16,
  },
  logItem: {
    flexDirection: "row",
  },
  timelineConnector: {
    width: 24,
    alignItems: "center",
    marginRight: 16,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 6,
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: 4,
    marginBottom: -6,
  },
  logContent: {
    flex: 1,
    padding: 12,
    alignItems: "flex-start",
    justifyContent: "flex-start",
    marginTop: -7,
    marginBottom: 10,
  },
  logTimeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  logHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  logTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logIcon: {
    margin: 0,
    marginRight: 4,
    marginLeft: -12,
  },
  logType: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
  },
  logTime: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Poppins-Regular",
  },
  logDescription: {
    fontSize: 14,
    color: "#334155",
    lineHeight: 20,
    fontFamily: "Poppins-Regular",
  },
  metadataContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 8,
  },
  metadataItem: {
    flexDirection: "row",
    marginBottom: 4,
  },
  metadataLabel: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Poppins-Medium",
    marginRight: 8,
  },
  metadataValue: {
    fontSize: 12,
    color: "#334155",
    fontFamily: "Poppins-Regular",
    flex: 1,
  },
  viewAllButtonContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  logDescriptionContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
  },
  clickableText: {
    color: "#2563EB", // Link blue color
    textDecorationLine: "underline",
  },
});

export default ActivityLogTimeline;
