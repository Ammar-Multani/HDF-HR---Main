import React, { useState, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import {
  Text,
  Surface,
  useTheme,
  IconButton,
  Divider,
  Button,
  TouchableRipple,
} from "react-native-paper";
import { format, isToday, isYesterday } from "date-fns";
import { t } from "i18next";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import {
  ActivityLog,
  ActivityType,
  ActivityLogUser,
} from "../types/activity-log";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { FlashList } from "@shopify/flash-list";

interface ActivityLogTimelineProps {
  logs: ActivityLog[];
  showViewAll?: boolean;
  showHeader?: boolean;
  title?: string;
  containerStyle?: any;
  onRefresh?: () => Promise<void>;
  onLoadMore?: () => Promise<void>;
  isLoading?: boolean;
  nestedScrollEnabled?: boolean;
  maxHeight?: number;
}

const ActivityLogTimeline: React.FC<ActivityLogTimelineProps> = ({
  logs,
  showViewAll = true,
  showHeader = true,
  title,
  containerStyle,
  onRefresh,
  onLoadMore,
  isLoading = false,
  nestedScrollEnabled = false,
  maxHeight = 800,
}) => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const screenWidth = Dimensions.get("window").width;

  // Animation when new items are added
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [logs]);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      borderRadius: 16,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: theme.colors.surfaceVariant,
      maxHeight: maxHeight,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      gap: 12,
    },
    headerTitle: {
      fontSize: 20,
      fontFamily: "Poppins-SemiBold",
      color: "#1E293B",
      letterSpacing: 0.15,
    },
    viewAllButtonContainer: {
      flex: 1,
      alignItems: "flex-end",
    },
    viewAllButton: {
      borderColor: "#E2E8F0",
      borderRadius: 16,
    },
    viewAllButtonLabel: {
      fontSize: 14,
      fontFamily: "Poppins-Medium",
    },
    flashList: {
      flex: 1,
    },
    flashListContent: {
      padding: 20,
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
      width: 11,
      height: 11,
      borderRadius: 6,
      borderWidth: 1.5,
    },
    line: {
      width: 2,
      flex: 1,
    },
    logContent: {
      flex: 1,
      paddingHorizontal: 12,
      paddingBottom: 28,
      alignItems: "flex-start",
      justifyContent: "flex-start",
    },
    logTimeContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
    },
    logHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 2,
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
      fontSize: 13,
      fontFamily: "Poppins-SemiBold",
      textTransform: "uppercase",
      letterSpacing: 0.5,
    },
    logTime: {
      fontSize: 12,
      color: "#64748B",
      fontFamily: "Poppins-Medium",
      letterSpacing: 0.2,
    },
    logDescription: {
      fontSize: 14,
      color: "#334155",
      lineHeight: 22,
      fontFamily: "Poppins-Regular",
    },
    logDescriptionContainer: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      marginTop: 4,
    },
    clickableContainer: {
      marginHorizontal: 2,
    },
    clickableText: {
      color: theme.colors.primary,
      textDecorationLine: "underline",
      fontFamily: "Poppins-Medium",
    },
    statusText: {
      fontFamily: "Poppins-Medium",
      color: "#64748B",
    },
    statusHighlight: {
      color: "#059669",
      fontFamily: "Poppins-SemiBold",
    },
    commentText: {
      fontStyle: "italic",
      color: "#6B7280",
      marginLeft: 4,
    },
    successText: {
      color: "#059669",
      fontFamily: "Poppins-Medium",
    },
    pendingText: {
      color: "#F59E0B",
      fontFamily: "Poppins-Medium",
    },
    changeText: {
      color: "#6366F1",
      fontFamily: "Poppins-Medium",
    },
    loadingContainer: {
      padding: 16,
      alignItems: "center",
    },
    emptyContainer: {
      padding: 24,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.onSurfaceVariant,
      textAlign: "center",
      fontFamily: "Poppins-Regular",
    },
  });

  // Group logs by date
  const groupedLogs = logs.reduce(
    (groups: { [key: string]: ActivityLog[] }, log) => {
      if (!log.created_at) return groups;
      const date = format(new Date(log.created_at), "yyyy-MM-dd");
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(log);
      return groups;
    },
    {}
  );

  // Convert grouped logs to sections for FlashList
  const sections = Object.entries(groupedLogs)
    .sort(([dateA], [dateB]) => {
      const dateObjA = dateA ? new Date(dateA) : new Date(0);
      const dateObjB = dateB ? new Date(dateB) : new Date(0);
      return dateObjB.getTime() - dateObjA.getTime();
    })
    .map(([date, dayLogs]) => ({
      date,
      data: dayLogs.sort(
        (a, b) =>
          new Date(b.created_at || 0).getTime() -
          new Date(a.created_at || 0).getTime()
      ),
    }));

  const handleRefresh = async () => {
    if (onRefresh) {
      setRefreshing(true);
      await onRefresh();
      setRefreshing(false);
    }
  };

  const handleLoadMore = async () => {
    if (onLoadMore && !loadingMore && !isLoading) {
      setLoadingMore(true);
      await onLoadMore();
      setLoadingMore(false);
    }
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No activity logs found</Text>
    </View>
  );

  const renderFooter = () => {
    if (loadingMore) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      );
    }
    return null;
  };

  // Get activity icon based on type
  const getActivityIcon = (type: string) => {
    switch (type.toUpperCase()) {
      case "CREATE":
        return "plus-circle";
      case "CREATE_TASK":
        return "plus-circle";
      case "CREATE_COMPANY":
        return "domain-plus";
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
      case "DATA_EXPORT":
        return "database-export";
      case "UPDATE_COMPANY":
        return "playlist-edit";
      case "CREATE_SUPER_ADMIN":
        return "account-plus";
      case "UPDATE_SUPER_ADMIN":
        return "account-edit";
      case "CREATE_COMPANY_ADMIN":
        return "account-plus";
      case "UPDATE_COMPANY_ADMIN":
        return "account-edit";
      case "CREATE_EMPLOYEE":
        return "account-plus-outline";
      case "UPDATE_EMPLOYEE":
        return "account-edit-outline";
      case "CREATE_RECEIPT":
        return "receipt";
      case "UPDATE_RECEIPT":
        return "playlist-edit";
      default:
        return "information";
    }
  };

  // Get activity color based on type
  const getActivityColor = (type: string) => {
    switch (type.toUpperCase()) {
      case "CREATE":
      case "CREATE_TASK":
      case "CREATE_COMPANY":
      case "CREATE_SUPER_ADMIN":
      case "CREATE_COMPANY_ADMIN":
      case "CREATE_EMPLOYEE":
      case "CREATE_RECEIPT":
        return "#10B981"; // Green
      case "UPDATE":
      case "UPDATE_TASK":
      case "UPDATE_COMPANY":
      case "UPDATE_SUPER_ADMIN":
      case "UPDATE_COMPANY_ADMIN":
      case "UPDATE_EMPLOYEE":
      case "UPDATE_RECEIPT":
        return "#6366F1"; // Indigo
      case "UPDATE_STATUS":
        return "#F59E0B"; // Amber
      case "ADD_COMMENT":
        return "#8B5CF6"; // Purple
      case "ASSIGN_USER":
        return "#3B82F6"; // Blue
      case "REMOVE_USER":
        return "#EF4444"; // Red
      case "DATA_EXPORT":
        return "#0EA5E9"; // Sky blue
      default:
        return "#6B7280"; // Gray
    }
  };

  // Helper function to get display name for a user
  const getDisplayName = (user?: ActivityLogUser) => {
    if (!user) return "";
    // Use the name from metadata if available
    if (user.name) {
      return user.name;
    }
    // Fallback to email if no name is available
    return user.email || "";
  };

  // Function to handle navigation to task details
  const handleTaskPress = (taskId: string) => {
    navigation.navigate("TaskDetails", { taskId });
  };

  // Function to handle navigation to user details
  const handleUserPress = (userId: string, userRole?: string) => {
    if (!userId) return;

    const role = userRole?.toLowerCase() || "";

    if (role.includes("superadmin")) {
      navigation.navigate("SuperAdminDetailsScreen", {
        adminId: userId,
        adminType: "superadmin",
      });
    } else if (role.includes("admin")) {
      navigation.navigate("CompanyAdminDetailsScreen", {
        adminId: userId,
        adminType: "admin",
      });
    } else {
      navigation.navigate("EmployeeDetailedScreen", {
        employeeId: userId,
        companyId: "", // This will be handled by the employee details screen
      });
    }
  };

  // Function to handle navigation to company details
  const handleCompanyPress = (companyId: string) => {
    navigation.navigate("CompanyDetails", { companyId });
  };

  // Helper function to create a valid user object
  const createUserObject = (
    id: string,
    name: string,
    email: string,
    role?: string
  ) => ({
    id,
    name,
    email,
    role,
  });

  // Function to render clickable description
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
      user: { id: string; name: string; role?: string; email?: string },
      prefix: string = ""
    ) => {
      if (user?.id || user?.email) {
        if (prefix) {
          addTextPart(prefix);
        }
        parts.push(
          <TouchableOpacity
            key={`user-${currentIndex}`}
            onPress={() => handleUserPress(user.id, user.role)}
            style={styles.clickableContainer}
          >
            <Text style={[styles.logDescription, styles.clickableText]}>
              {user.name || user.email}
            </Text>
          </TouchableOpacity>
        );
        currentIndex++;
      }
    };

    // Helper function to add clickable task
    const addTaskPart = (taskId: string, taskTitle: string) => {
      if (taskId && taskTitle) {
        parts.push(
          <TouchableOpacity
            key={`task-${currentIndex}`}
            onPress={() => handleTaskPress(taskId)}
            style={styles.clickableContainer}
          >
            <Text style={[styles.logDescription, styles.clickableText]}>
              {taskTitle}
            </Text>
          </TouchableOpacity>
        );
        currentIndex++;
      }
    };

    // Helper function to add clickable company
    const addCompanyPart = (company: { id: string; name: string }) => {
      if (company?.id && company?.name) {
        parts.push(
          <TouchableOpacity
            key={`company-${currentIndex}`}
            onPress={() => handleCompanyPress(company.id)}
            style={styles.clickableContainer}
          >
            <Text style={[styles.logDescription, styles.clickableText]}>
              {company.name}
            </Text>
          </TouchableOpacity>
        );
        currentIndex++;
      }
    };

    // Start building the interactive description
    if (log.metadata) {
      const {
        task_id,
        task_title,
        created_by,
        updated_by,
        assigned_to,
        added_by,
        company,
        company_admin,
        employee,
      } = log.metadata;

      switch (log.activity_type.toUpperCase()) {
        case "DATA_EXPORT":
          const exportUser = log.metadata?.created_by;
          if (log.metadata?.action === "export_initiated" && exportUser) {
            const userObj = createUserObject(
              exportUser.id,
              exportUser.name,
              exportUser.email,
              exportUser.role
            );
            addUserPart(userObj);
            addTextPart(" requested data export");
          } else if (
            log.metadata?.action === "export_completed" &&
            exportUser
          ) {
            const userObj = createUserObject(
              exportUser.id,
              exportUser.name,
              exportUser.email,
              exportUser.role
            );
            addUserPart(userObj);
            addTextPart(" completed data export successfully");
          } else {
            addTextPart(log.description);
          }
          break;

        case "UPDATE_PROFILE":
          const updatingUser = log.metadata?.updated_by;
          if (updatingUser) {
            addUserPart(updatingUser);
            addTextPart(" updated their profile");
            const changes = log.metadata?.changes;
            if (changes && Array.isArray(changes) && changes.length > 0) {
              addTextPart(": ");
              changes.forEach((change: string, idx: number) => {
                parts.push(
                  <Text
                    key={`change-${currentIndex}-${idx}`}
                    style={[styles.logDescription, styles.changeText]}
                  >
                    {change}
                  </Text>
                );
                if (idx < changes.length - 1) {
                  addTextPart(", ");
                }
              });
              currentIndex++;
            }
          } else {
            addTextPart(log.description);
          }
          break;

        case "PROFILE_UPDATE":
          const updatingUserProfile =
            log.metadata?.updated_by || log.metadata?.created_by;
          if (updatingUserProfile) {
            addUserPart(updatingUserProfile);
            addTextPart(" updated their profile");
            const metadata = log.metadata || {};
            const changes = metadata.changes;
            if (changes && Array.isArray(changes) && changes.length > 0) {
              addTextPart(": ");
              changes.forEach((change: string, idx: number) => {
                parts.push(
                  <Text
                    key={`change-${currentIndex}-${idx}`}
                    style={[styles.logDescription, styles.changeText]}
                  >
                    {change}
                  </Text>
                );
                if (idx < changes.length - 1) {
                  addTextPart(", ");
                }
              });
            }
          } else {
            addTextPart(log.description);
          }
          break;

        case "PASSWORD_RESET_REQUESTED":
          const resetUser = log.metadata?.created_by;
          if (resetUser?.id) {
            const userObj = createUserObject(
              resetUser.id,
              resetUser.name,
              resetUser.email,
              resetUser.role
            );
            addUserPart(userObj);
            addTextPart(" requested a password reset");
          } else {
            addTextPart(log.description);
          }
          break;

        case "ACCOUNT_DELETION":
          const deletionUser = log.metadata?.created_by;
          if (log.metadata?.action === "deletion_started" && deletionUser) {
            const userObj = createUserObject(
              deletionUser.id,
              deletionUser.name,
              deletionUser.email,
              deletionUser.role
            );
            addUserPart(userObj);
            addTextPart(" initiated account deletion");
          } else if (
            log.metadata?.action === "deletion_completed" &&
            deletionUser
          ) {
            const userObj = createUserObject(
              deletionUser.id,
              deletionUser.name,
              deletionUser.email,
              deletionUser.role
            );
            addUserPart(userObj);
            addTextPart(" completed account deletion");
          } else {
            addTextPart(log.description);
          }
          break;

        case "UPDATE":
          if (log.metadata?.added_by?.id) {
            const userObj = createUserObject(
              log.metadata.added_by.id,
              log.metadata.added_by.name,
              log.metadata.added_by.email || "",
              log.metadata.added_by.role
            );
            addUserPart(userObj);
            addTextPart(" updated task ");
            if (log.metadata.task_id && log.metadata.task_title) {
              addTaskPart(log.metadata.task_id, log.metadata.task_title);
            }
            const changes = log.metadata?.changes;
            if (changes && Array.isArray(changes) && changes.length > 0) {
              addTextPart(": ");
              changes.forEach((change: string, idx: number) => {
                parts.push(
                  <Text
                    key={`change-${currentIndex}-${idx}`}
                    style={[styles.logDescription, styles.changeText]}
                  >
                    {change}
                  </Text>
                );
                if (idx < changes.length - 1) {
                  addTextPart(", ");
                }
              });
              currentIndex++;
            }
          } else {
            addTextPart(log.description);
          }
          break;

        case "ADD_COMMENT":
          if (added_by) {
            addTextPart("Comment added by ");
            const userObj = {
              id: added_by.id || log.user_id,
              name: added_by.name,
              role: added_by.role,
            };
            addUserPart(userObj);
            if (log.metadata.comment) {
              addTextPart(": ");
              parts.push(
                <Text
                  key={`comment-${currentIndex}`}
                  style={[styles.logDescription, styles.commentText]}
                >
                  "{log.metadata.comment}"
                </Text>
              );
              currentIndex++;
            }
            if (task_id && task_title) {
              addTextPart(" on task ");
              addTaskPart(task_id, task_title);
            }
          } else {
            addTextPart(log.description);
          }
          break;

        case "CREATE_TASK":
          if (created_by) {
            addTextPart("New task ");
            if (task_id && task_title) {
              addTaskPart(task_id, task_title);
            }
            addTextPart(" created by ");
            addUserPart(created_by);
            if (assigned_to) {
              addTextPart(". Assigned to ");
              addUserPart(assigned_to);
            }
          } else {
            addTextPart(log.description);
          }
          break;

        case "UPDATE_TASK":
          const updater = updated_by || created_by;
          if (updater?.id) {
            const userObj = createUserObject(
              updater.id,
              updater.name,
              updater.email || "",
              updater.role
            );
            addUserPart(userObj);
            addTextPart(" updated task ");
            if (task_id && task_title) {
              addTaskPart(task_id, task_title);
            }
            const changes = log.metadata?.changes;
            if (changes && Array.isArray(changes)) {
              addTextPart(": ");
              changes.forEach((change: string, idx: number) => {
                parts.push(
                  <Text
                    key={`change-${currentIndex}-${idx}`}
                    style={[styles.logDescription, styles.changeText]}
                  >
                    {change}
                  </Text>
                );
                if (idx < changes.length - 1) {
                  addTextPart(", ");
                }
              });
              currentIndex++;
            }
            if (assigned_to?.id) {
              addTextPart(". Assigned to ");
              const assignedUserObj = createUserObject(
                assigned_to.id,
                assigned_to.name,
                assigned_to.email || "",
                assigned_to.role
              );
              addUserPart(assignedUserObj);
            }
          } else if (task_id && task_title) {
            addTextPart("Task ");
            addTaskPart(task_id, task_title);
            addTextPart(" was updated");
          } else {
            addTextPart(log.description);
          }
          break;

        case "UPDATE_STATUS":
          if (log.metadata?.added_by?.id) {
            const userObj = createUserObject(
              log.metadata.added_by.id,
              log.metadata.added_by.name,
              log.metadata.added_by.email || "",
              log.metadata.added_by.role
            );
            addUserPart(userObj);
            addTextPart(" updated status of task ");
            if (log.metadata.task_id && log.metadata.task_title) {
              addTaskPart(log.metadata.task_id, log.metadata.task_title);
              const oldStatus = log.metadata.status;
              const newStatus = log.new_value?.status;
              if (oldStatus && newStatus) {
                addTextPart(` from `);
                parts.push(
                  <Text
                    key={`status-from-${currentIndex}`}
                    style={[styles.logDescription, styles.statusText]}
                  >
                    {oldStatus.toLowerCase()}
                  </Text>
                );
                currentIndex++;
                addTextPart(` to `);
                parts.push(
                  <Text
                    key={`status-to-${currentIndex}`}
                    style={[
                      styles.logDescription,
                      styles.statusText,
                      styles.statusHighlight,
                    ]}
                  >
                    {newStatus.toLowerCase()}
                  </Text>
                );
                currentIndex++;
              }
            }
          }
          break;

        case "ASSIGN_USER":
          if (added_by?.id) {
            const userObj = createUserObject(
              added_by.id,
              added_by.name,
              added_by.email || "",
              added_by.role
            );
            addUserPart(userObj);
            addTextPart(" assigned ");
            if (log.metadata?.assigned_to) {
              const assignedUser = log.metadata.assigned_to;
              const assignedUserObj = createUserObject(
                assignedUser.id,
                assignedUser.name,
                assignedUser.email || "",
                assignedUser.role
              );
              addUserPart(assignedUserObj);
              if (task_id && task_title) {
                addTextPart(" to task ");
                addTaskPart(task_id, task_title);
              }
            }
          }
          break;

        case "REMOVE_USER":
          if (added_by?.id) {
            const userObj = createUserObject(
              added_by.id,
              added_by.name,
              added_by.email || "",
              added_by.role
            );
            addUserPart(userObj);
            addTextPart(" removed ");
            if (log.metadata?.assigned_to) {
              const assignedUser = log.metadata.assigned_to;
              const assignedUserObj = createUserObject(
                assignedUser.id,
                assignedUser.name,
                assignedUser.email || "",
                assignedUser.role
              );
              addUserPart(assignedUserObj);
              if (task_id && task_title) {
                addTextPart(" from task ");
                addTaskPart(task_id, task_title);
              }
            }
          }
          break;

        case ActivityType.CREATE_COMPANY:
          if (created_by) {
            const userObj = {
              ...created_by,
              name: created_by.name || created_by.email,
            };
            addUserPart(userObj);
            addTextPart(" created new company ");
            if (company) {
              addCompanyPart(company);
            }
            if (company_admin) {
              addTextPart(" with admin ");
              const adminObj = {
                ...company_admin,
                name: company_admin.name || company_admin.email,
              };
              addUserPart(adminObj);
            }
          } else {
            addTextPart(log.description);
          }
          break;

        case ActivityType.UPDATE_COMPANY:
          const companyUpdater = updated_by || created_by;
          if (companyUpdater?.id) {
            const userObj = {
              id: companyUpdater.id,
              name: companyUpdater.name || companyUpdater.email || "",
              email: companyUpdater.email,
              role: companyUpdater.role,
            };
            addUserPart(userObj);
            addTextPart(" updated company ");
            if (company) {
              addCompanyPart(company);
            }
            const changes = log.metadata?.changes;
            if (changes && Array.isArray(changes) && changes.length > 0) {
              addTextPart(": ");
              changes.forEach((change: string, idx: number) => {
                parts.push(
                  <Text
                    key={`change-${currentIndex}-${idx}`}
                    style={[styles.logDescription, styles.changeText]}
                  >
                    {change}
                  </Text>
                );
                if (idx < changes.length - 1) {
                  addTextPart(", ");
                }
              });
              currentIndex++;
            }
          } else {
            addTextPart(log.description);
          }
          break;

        case ActivityType.CREATE_SUPER_ADMIN:
          if (created_by) {
            const userObj = {
              ...created_by,
              name: created_by.name || created_by.email,
            };
            addUserPart(userObj);
            addTextPart(" created new super admin ");
            if (log.metadata?.admin) {
              const adminObj = {
                id: log.metadata.admin.id,
                name: log.metadata.admin.name,
                email: log.metadata.admin.email,
                role: "superadmin",
              };
              addUserPart(adminObj);
            }
          } else {
            addTextPart(log.description);
          }
          break;

        case ActivityType.UPDATE_SUPER_ADMIN:
          const superAdminUpdater = updated_by || created_by;
          if (superAdminUpdater?.id) {
            const userObj = {
              id: superAdminUpdater.id,
              name: superAdminUpdater.name || superAdminUpdater.email,
              email: superAdminUpdater.email,
              role: superAdminUpdater.role,
            };
            addUserPart(userObj);
            addTextPart(" updated super admin ");
            if (log.metadata?.admin) {
              const adminObj = {
                id: log.metadata.admin.id,
                name: log.metadata.admin.name,
                email: log.metadata.admin.email,
                role: "superadmin",
              };
              addUserPart(adminObj);
            }
            const changes = log.metadata?.changes;
            if (changes && Array.isArray(changes) && changes.length > 0) {
              addTextPart(": ");
              changes.forEach((change: string, idx: number) => {
                parts.push(
                  <Text
                    key={`change-${currentIndex}-${idx}`}
                    style={[styles.logDescription, styles.changeText]}
                  >
                    {change}
                  </Text>
                );
                if (idx < changes.length - 1) {
                  addTextPart(", ");
                }
              });
              currentIndex++;
            }
          } else {
            addTextPart(log.description);
          }
          break;

        case ActivityType.CREATE_COMPANY_ADMIN:
          if (created_by) {
            const userObj = {
              ...created_by,
              name: created_by.name || created_by.email,
            };
            addUserPart(userObj);
            addTextPart(" created new company admin ");
            if (log.metadata?.admin) {
              const adminObj = {
                id: log.metadata.admin.id,
                name: log.metadata.admin.name,
                email: log.metadata.admin.email,
                role: "admin",
              };
              addUserPart(adminObj);
            }
            if (log.metadata?.company) {
              addTextPart(" for company ");
              addCompanyPart(log.metadata.company);
            }
          } else {
            addTextPart(log.description);
          }
          break;

        case ActivityType.UPDATE_COMPANY_ADMIN:
          const companyAdminUpdater = updated_by || created_by;
          if (companyAdminUpdater?.id) {
            const userObj = {
              id: companyAdminUpdater.id,
              name: companyAdminUpdater.name || companyAdminUpdater.email,
              email: companyAdminUpdater.email,
              role: companyAdminUpdater.role,
            };
            addUserPart(userObj);
            addTextPart(" updated company admin ");
            if (log.metadata?.admin) {
              const adminObj = {
                id: log.metadata.admin.id,
                name: log.metadata.admin.name,
                email: log.metadata.admin.email,
                role: "admin",
              };
              addUserPart(adminObj);
            }
            if (log.metadata?.company) {
              addTextPart(" from company ");
              addCompanyPart(log.metadata.company);
            }
            const changes = log.metadata?.changes;
            if (changes && Array.isArray(changes) && changes.length > 0) {
              addTextPart(": ");
              changes.forEach((change: string, idx: number) => {
                parts.push(
                  <Text
                    key={`change-${currentIndex}-${idx}`}
                    style={[styles.logDescription, styles.changeText]}
                  >
                    {change}
                  </Text>
                );
                if (idx < changes.length - 1) {
                  addTextPart(", ");
                }
              });
              currentIndex++;
            }
          } else {
            addTextPart(log.description);
          }
          break;

        case ActivityType.CREATE_EMPLOYEE:
          if (created_by) {
            const userObj = {
              ...created_by,
              name: created_by.name || created_by.email,
            };
            addUserPart(userObj);
            addTextPart(" created new employee ");
            if (employee) {
              const employeeObj = {
                ...employee,
                name: employee.name || employee.email,
              };
              addUserPart(employeeObj);
            }
            if (company) {
              addTextPart(" in company ");
              addCompanyPart(company);
            }
          } else {
            addTextPart(log.description);
          }
          break;

        case ActivityType.CREATE_RECEIPT:
          if (log.metadata?.created_by) {
            const userObj = {
              ...log.metadata.created_by,
              name:
                log.metadata.created_by.name || log.metadata.created_by.email,
            };
            addUserPart(userObj);
            addTextPart(" created receipt ");
            addTextPart(`"${log.new_value?.receipt_number}"`);
            if (log.metadata?.company) {
              addTextPart(" in company ");
              addCompanyPart(log.metadata.company);
            }
          } else {
            addTextPart(log.description);
          }
          break;

        case ActivityType.UPDATE_RECEIPT:
          if (log.metadata?.created_by) {
            const userObj = {
              ...log.metadata.created_by,
              name:
                log.metadata.created_by.name || log.metadata.created_by.email,
            };
            addUserPart(userObj);
            addTextPart(" updated receipt ");
            addTextPart(`"${log.new_value?.receipt_number}"`);
            if (log.metadata?.company) {
              addTextPart(" in company ");
              addCompanyPart(log.metadata.company);
            }
            const changes = log.metadata?.changes;
            if (changes && Array.isArray(changes) && changes.length > 0) {
              addTextPart(". Changes: ");
              changes.forEach((change: string, idx: number) => {
                parts.push(
                  <Text
                    key={`change-${currentIndex}-${idx}`}
                    style={[styles.logDescription, styles.changeText]}
                  >
                    {change}
                  </Text>
                );
                if (idx < changes.length - 1) {
                  addTextPart(", ");
                }
              });
              currentIndex++;
            }
          } else {
            addTextPart(log.description);
          }
          break;

        case "UPDATE_EMPLOYEE":
          if (log.metadata?.created_by && log.metadata?.employee) {
            const userObj = {
              ...log.metadata.created_by,
              name:
                log.metadata.created_by.name || log.metadata.created_by.email,
            };
            addUserPart(userObj);
            addTextPart(" updated employee ");
            const employeeObj = {
              ...log.metadata.employee,
              name: log.metadata.employee.name || log.metadata.employee.email,
            };
            addUserPart(employeeObj);
            if (log.metadata?.company) {
              addTextPart(" in company ");
              addCompanyPart(log.metadata.company);
            }
            const changes = log.metadata?.changes;
            if (changes && Array.isArray(changes) && changes.length > 0) {
              addTextPart(". Changes: ");
              changes.forEach((change: string, idx: number) => {
                parts.push(
                  <Text
                    key={`change-${currentIndex}-${idx}`}
                    style={[styles.logDescription, styles.changeText]}
                  >
                    {change}
                  </Text>
                );
                if (idx < changes.length - 1) {
                  addTextPart(", ");
                }
              });
              currentIndex++;
            }
          } else {
            addTextPart(log.description);
          }
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
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return ""; // Handle invalid dates
    if (isToday(date)) {
      return "Today";
    }
    if (isYesterday(date)) {
      return "Yesterday";
    }
    return format(date, "MMMM d, yyyy");
  };

  // Fix the time display in the render section
  const formatTime = (dateString: string | undefined) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      return format(date, "h:mm a");
    } catch {
      return "";
    }
  };

  return (
    <Surface style={[styles.container, containerStyle]} elevation={0}>
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

      <FlashList
        data={sections}
        renderItem={({ item: section }) => (
          <View style={styles.dateGroup}>
            <Text style={styles.dateHeader}>{formatDate(section.date)}</Text>
            {section.data.map((log, index) => (
              <View key={log.id || index} style={styles.logItem}>
                <View style={styles.timelineConnector}>
                  <View
                    style={[
                      styles.dot,
                      {
                        borderColor: getActivityColor(log.activity_type),
                      },
                    ]}
                  />
                  {index !== section.data.length - 1 && (
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
                      {formatTime(log.created_at)}
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
        )}
        estimatedItemSize={200}
        contentContainerStyle={styles.flashListContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[theme.colors.primary]}
          />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmptyComponent}
        ListFooterComponent={renderFooter}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={nestedScrollEnabled}
      />
    </Surface>
  );
};

export default ActivityLogTimeline;
