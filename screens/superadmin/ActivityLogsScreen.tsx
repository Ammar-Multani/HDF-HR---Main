import React, { useState, useEffect } from "react";
import { StyleSheet, View, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Text, useTheme, Surface, Button, Menu } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { supabase } from "../../lib/supabase";
import AppHeader from "../../components/AppHeader";
import ActivityLogTimeline from "../../components/ActivityLogTimeline";
import LoadingIndicator from "../../components/LoadingIndicator";

interface ActivityLog {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
  metadata?: any;
  user_id: string;
  company_id?: string;
}

const ActivityLogsScreen = () => {
  const theme = useTheme();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [filterMenuVisible, setFilterMenuVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  // Fetch activity logs
  const fetchActivityLogs = async (filter: string = "all") => {
    try {
      setLoading(true);
      let query = supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false });

      // Apply filters
      if (filter !== "all") {
        query = query.eq("activity_type", filter.toUpperCase());
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching activity logs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivityLogs(selectedFilter);
  }, [selectedFilter]);

  const filterOptions = [
    { label: "All Activities", value: "all" },
    { label: "Task Creation", value: "create_task" },
    { label: "Task Updates", value: "update_task" },
    { label: "Status Changes", value: "update_status" },
    { label: "Comments", value: "add_comment" },
    { label: "User Assignment", value: "assign_user" },
  ];

  if (loading) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: "#F8F9FA" }]}>
      <AppHeader
        title={t("superAdmin.activityLogs.title")}
        subtitle={t("superAdmin.activityLogs.subtitle")}
        showLogo={false}
        showTitle={true}
        showHelpButton={true}
        absolute={false}
      />

      <View
        style={[
          styles.content,
          { maxWidth: Platform.OS === "web" ? 1200 : "100%" },
        ]}
      >
        <View style={styles.filterContainer}>
          <Menu
            visible={filterMenuVisible}
            onDismiss={() => setFilterMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setFilterMenuVisible(true)}
                icon="filter-variant"
                style={styles.filterButton}
              >
                {
                  filterOptions.find(
                    (option) => option.value === selectedFilter
                  )?.label
                }
              </Button>
            }
          >
            {filterOptions.map((option) => (
              <Menu.Item
                key={option.value}
                onPress={() => {
                  setSelectedFilter(option.value);
                  setFilterMenuVisible(false);
                }}
                title={option.label}
              />
            ))}
          </Menu>
        </View>

        {logs.length > 0 ? (
          <ActivityLogTimeline logs={logs} />
        ) : (
          <Surface style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {t("superAdmin.activityLogs.noLogs")}
            </Text>
          </Surface>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    alignSelf: "center",
    width: "100%",
  },
  filterContainer: {
    marginBottom: 24,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  filterButton: {
    borderColor: "#E2E8F0",
  },
  emptyState: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyStateText: {
    fontSize: 16,
    color: "#64748B",
    fontFamily: "Poppins-Regular",
    textAlign: "center",
  },
});

export default ActivityLogsScreen;
