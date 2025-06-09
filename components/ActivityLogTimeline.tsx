import React from "react";
import { View, StyleSheet, ScrollView } from "react-native";
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

interface ActivityLog {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
  metadata?: {
    task_title?: string;
    priority?: string;
    created_by?: {
      name: string;
      email: string;
    };
    updated_by?: {
      name: string;
      email: string;
    };
    assigned_to?: {
      id: string;
      name: string;
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
}

const ActivityLogTimeline: React.FC<ActivityLogTimelineProps> = ({ logs }) => {
  const theme = useTheme();

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

  // Format metadata for display
  const formatMetadata = (log: ActivityLog) => {
    if (!log.metadata) return null;

    const metadata: { [key: string]: string } = {};

    if (log.metadata.task_title) {
      metadata["Task"] = log.metadata.task_title;
    }

    if (log.metadata.priority) {
      metadata["Priority"] = log.metadata.priority;
    }

    if (log.metadata.changes) {
      metadata["Changes"] = log.metadata.changes.join(", ");
    }

    if (log.metadata.status_change) {
      metadata["Status Change"] =
        `${log.metadata.status_change.from} → ${log.metadata.status_change.to}`;
    }

    if (log.metadata.comment) {
      metadata["Comment"] = log.metadata.comment;
    }

    if (log.metadata.assigned_to) {
      metadata["Assigned To"] = log.metadata.assigned_to.name;
    }

    const actor = log.metadata.created_by || log.metadata.updated_by;
    if (actor) {
      metadata["By"] = `${actor.name} (${actor.email})`;
    }

    return Object.entries(metadata);
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
    <Surface style={styles.container}>
      <View style={styles.header}>
        <IconButton
          icon="clock-outline"
          size={24}
          iconColor={theme.colors.primary}
        />
        <Text style={styles.headerTitle}>
          {t("superAdmin.dashboard.latestActivities")}
        </Text>
        <View style={styles.viewAllButtonContainer}>
          <Button
            mode="outlined"
          onPress={() => {
            // @ts-ignore - Navigation typing can be complex
            navigation.navigate("ActivityLogsScreen" as never);
          }}
          icon="chevron-right"
          style={styles.viewAllButton}
          labelStyle={styles.viewAllButtonLabel}
        >
            {t("superAdmin.dashboard.viewAll")}
          </Button>
        </View>
      </View>
      <Divider />
      <ScrollView style={styles.scrollView}>
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
                    <Surface style={styles.logContent}>
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
                        <Text style={styles.logTime}>
                          {format(new Date(log.created_at), "h:mm a")}
                        </Text>
                      </View>
                      <Text style={styles.logDescription}>
                        {log.description}
                      </Text>
                      {formatMetadata(log) && (
                        <View style={styles.metadataContainer}>
                          {formatMetadata(log)?.map(([key, value]) => (
                            <View key={key} style={styles.metadataItem}>
                              <Text style={styles.metadataLabel}>
                                {key.toUpperCase()}:
                              </Text>
                              <Text style={styles.metadataValue}>{value}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </Surface>
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
    marginBottom: 16,
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
  },
  logContent: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  logTypeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  logIcon: {
    margin: 0,
    marginRight: 8,
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
});

export default ActivityLogTimeline;
