import React from "react";
import {
  View,
  ScrollView,
  RefreshControl,
  StatusBar,
  Platform,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import { TaskStatus, FormStatus } from "../../types";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Text from "../../components/Text";
import DynamicChart from "../../components/DynamicChart";
import Animated, { FadeIn } from "react-native-reanimated";
import HelpGuideModal from "../../components/HelpGuideModal";
import ActivityLogTimeline from "../../components/ActivityLogTimeline";
import { useTranslation } from "react-i18next";
import Shimmer from "../../components/Shimmer";
import useDashboardData from "./hooks/useDashboardData";
import dashboardStyles from "./styles/companyAdminDashboardStyles";
import { Surface, useTheme } from "react-native-paper";

// Add this interface above the component
interface CompanyData {
  company_name: string;
}

// Add EmployeeData interface after CompanyData interface
interface EmployeeData {
  id: string;
  name: string;
  forms_count: number;
}

const CompanyAdminDashboard = () => {
  const theme = useTheme();
  const { user, signOut } = useAuth();
  const {
    loading,
    refreshing,
    companyName,
    networkStatus,
    error,
    stats,
    helpModalVisible,
    setHelpModalVisible,
    showAllEmployees,
    setShowAllEmployees,
    isLargeScreen,
    isMediumScreen,
    windowDimensions,
    onRefresh,
    helpGuideSteps,
    helpGuideNote,
  } = useDashboardData(user);
  const styles = dashboardStyles;

  if (loading && !refreshing) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
        <AppHeader
          showProfileMenu={true}
          userEmail={user?.email || ""}
          isAdmin={true}
          onSignOut={signOut}
          showHelpButton={false}
          showLogo={Platform.OS !== "web"}
          title={Platform.OS === "web" ? "" : undefined}
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
        >
          {Platform.OS !== "web" && (
            <View style={styles.welcomeHeader}>
              <Shimmer width={200} height={28} style={styles.skeletonTitle} />
              <Shimmer
                width={300}
                height={16}
                style={styles.skeletonSubtitle}
              />
            </View>
          )}

          <View style={[styles.statsGridContainer, { gap: 16 }]}>
            {[1, 2, 3, 4].map((_, index) => (
              <View
                key={index}
                style={[
                  styles.statsGridItem,
                  {
                    width: isLargeScreen
                      ? "23.5%"
                      : isMediumScreen
                        ? "31.33%"
                        : "100%",
                    minWidth: isMediumScreen || isLargeScreen ? 275 : "100%",
                    marginBottom: isMediumScreen || isLargeScreen ? 0 : 16,
                  },
                ]}
              >
                <View style={[styles.statsCard, styles.skeletonStatsCard]}>
                  <View style={styles.statRow}>
                    <Shimmer
                      width={140}
                      height={16}
                      style={{ marginBottom: 4 }}
                    />
                    <Shimmer
                      width={45}
                      height={14}
                      style={{ marginLeft: "auto" }}
                    />
                  </View>
                  <Shimmer width={90} height={36} style={{ marginTop: 20 }} />
                </View>
              </View>
            ))}
          </View>

          <View
            style={[
              styles.chartsContainer,
              { flexDirection: isLargeScreen ? "row" : "column" },
            ]}
          >
            {[1, 2].map((_, index) => (
              <View
                key={index}
                style={[
                  styles.chartWrapper,
                  {
                    flex: isLargeScreen ? 1 : undefined,
                    width: "100%",
                    maxWidth: isLargeScreen ? "50%" : 1000,
                    marginBottom: isLargeScreen ? 0 : 24,
                  },
                ]}
              >
                <View style={styles.chartCard}>
                  <Shimmer
                    width={200}
                    height={24}
                    style={{ marginBottom: 24, marginLeft: 24, marginTop: 24 }}
                  />
                  <Shimmer
                    width="90%"
                    height={250}
                    style={{ marginHorizontal: "5%", marginBottom: 24 }}
                  />
                </View>
              </View>
            ))}
          </View>

          {/* Add Shimmer for Top Employees and Task Status */}
          <View
            style={[
              styles.gridContainer,
              { flexDirection: isLargeScreen ? "row" : "column" },
            ]}
          >
            {/* Top Employees Shimmer */}
            <View
              style={[
                styles.gridItem,
                {
                  flex: isLargeScreen ? 1 : undefined,
                  width: "100%",
                  maxWidth: isLargeScreen ? "50%" : 1000,
                  marginBottom: isLargeScreen ? 0 : 24,
                },
              ]}
            >
              <View style={styles.listCard}>
                <Shimmer
                  width={200}
                  height={24}
                  style={{ marginBottom: 24, marginLeft: 24, marginTop: 24 }}
                />
                {[1, 2, 3].map((_, index) => (
                  <View key={index} style={styles.employeeCard}>
                    <View style={styles.employeeInfo}>
                      <Shimmer
                        width={150}
                        height={20}
                        style={{ marginBottom: 8 }}
                      />
                    </View>
                    <View style={styles.formsCountContainer}>
                      <Shimmer width={40} height={20} />
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* Task Status Shimmer */}
            <View
              style={[
                styles.gridItem,
                {
                  flex: isLargeScreen ? 1 : undefined,
                  width: "100%",
                  maxWidth: isLargeScreen ? "50%" : 1000,
                },
              ]}
            >
              <View style={styles.taskCardsWrapper}>
                <View style={styles.taskCardsGrid}>
                  {[1, 2, 3].map((_, index) => (
                    <View
                      key={index}
                      style={[
                        styles.statCardSmall,
                        { width: "100%", marginBottom: index === 2 ? 0 : 16 },
                      ]}
                    >
                      <Shimmer
                        width={120}
                        height={20}
                        style={{ marginBottom: 12 }}
                      />
                      <Shimmer
                        width={60}
                        height={28}
                        style={{ marginBottom: 8 }}
                      />
                      <Shimmer
                        width={24}
                        height={24}
                        style={{ borderRadius: 12 }}
                      />
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>

          {/* Activity Logs Shimmer */}
          <View style={styles.activityLogsSection}>
            <Surface style={styles.activityLogsCard} elevation={0}>
              <Shimmer
                width={200}
                height={24}
                style={{ marginBottom: 24, marginLeft: 24, marginTop: 24 }}
              />
              {[1, 2, 3, 4].map((_, index) => (
                <View
                  key={index}
                  style={{
                    padding: 16,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  <Shimmer
                    width={24}
                    height={24}
                    style={{ borderRadius: 12, marginRight: 16 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Shimmer
                      width="80%"
                      height={16}
                      style={{ marginBottom: 8 }}
                    />
                    <Shimmer width="40%" height={14} />
                  </View>
                </View>
              ))}
            </Surface>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
      <View style={styles.container}>
        <AppHeader
          showProfileMenu={true}
          userEmail={user?.email || ""}
          isAdmin={true}
          onSignOut={signOut}
          showHelpButton={true}
          onHelpPress={() => setHelpModalVisible(true)}
          showLogo={Platform.OS !== "web"}
          title={
            Platform.OS === "web"
              ? companyName
                ? `${companyName} Dashboard`
                : "Company Admin Dashboard"
              : undefined
          }
          subtitle={
            Platform.OS === "web"
              ? "Manage your company data and operations"
              : undefined
          }
        />

        <HelpGuideModal
          visible={helpModalVisible}
          onDismiss={() => setHelpModalVisible(false)}
          title="Dashboard Guide"
          description="Learn how to use the dashboard to monitor and manage your company's operations effectively."
          steps={helpGuideSteps}
          note={helpGuideNote}
          buttonLabel="Got it"
        />

        <Animated.View style={styles.container} entering={FadeIn.duration(300)}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {Platform.OS !== "web" && (
              <View style={styles.welcomeHeader}>
                <Text variant={"bold"} style={styles.welcomeTitle}>
                  {companyName
                    ? `${companyName} Dashboard`
                    : "Company Admin Dashboard"}
                </Text>
                <Text style={styles.welcomeSubtitle}>
                  Manage your company data and operations
                </Text>
              </View>
            )}

            <View
              style={[
                styles.statsGridContainer,
                {
                  justifyContent: isLargeScreen ? "flex-start" : "center",
                  gap: isMediumScreen || isLargeScreen ? 24 : 16,
                  marginBottom: isMediumScreen || isLargeScreen ? 32 : 24,
                },
              ]}
            >
              {/* Stats Grid Items */}
              {[
                {
                  label: "Total Employees",
                  value: stats.totalEmployees,
                  growth: stats.employeeGrowth,
                },
                {
                  label: "Total Tasks",
                  value: stats.totalTasks,
                  growth: stats.tasksGrowth,
                },
                {
                  label: "Total Forms",
                  value: stats.totalForms,
                  growth: stats.formsGrowth,
                },
                {
                  label: "Active Employees",
                  value: stats.activeEmployees,
                  growth: "+0%",
                },
              ].map((stat, index) => (
                <View
                  key={index}
                  style={[
                    styles.statsGridItem,
                    {
                      width: isLargeScreen
                        ? "23.5%" // Approximately 25% - 18px gap
                        : isMediumScreen
                          ? "31%" // Approximately 33.33% - 16px gap
                          : "100%",
                      minWidth: isMediumScreen || isLargeScreen ? 275 : "100%",
                      marginBottom: isMediumScreen || isLargeScreen ? 0 : 16,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statsCard,
                      {
                        padding: isMediumScreen || isLargeScreen ? 24 : 20,
                      },
                    ]}
                  >
                    <View style={styles.statRow}>
                      <Text variant={"medium"} style={styles.statLabel}>
                        {stat.label}
                      </Text>
                      <Text
                        variant={"bold"}
                        style={[
                          styles.statGrowth,
                          stat.growth.startsWith("-")
                            ? styles.negativeGrowth
                            : {},
                        ]}
                      >
                        {stat.growth}
                      </Text>
                    </View>
                    <Text variant={"bold"} style={styles.statValue}>
                      {stat.value.toLocaleString()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            <View
              style={[
                styles.chartsContainer,
                { flexDirection: isLargeScreen ? "row" : "column" },
              ]}
            >
              <View
                style={[
                  styles.chartWrapper,
                  {
                    flex: isLargeScreen ? 1 : undefined,
                    width: "100%",
                    maxWidth: isLargeScreen ? "50%" : 1000,
                    marginBottom: isLargeScreen ? 0 : 24,
                  },
                ]}
              >
                <View style={styles.chartCard}>
                  <Text variant={"bold"} style={styles.sectionTitle}>
                    Monthly Employee Onboarding
                  </Text>
                  <DynamicChart
                    monthlyData={stats.monthlyEmployees}
                    monthLabels={stats.monthLabels}
                    width={
                      Platform.OS === "web"
                        ? isLargeScreen
                          ? Math.min((windowDimensions.width - 72) / 2, 600)
                          : isMediumScreen
                            ? Math.min((windowDimensions.width - 48) / 2, 850)
                            : Math.min(windowDimensions.width - 48, 1000)
                        : windowDimensions.width - 32
                    }
                  />
                </View>
              </View>

              <View
                style={[
                  styles.chartWrapper,
                  {
                    flex: isLargeScreen ? 1 : undefined,
                    width: "100%",
                    maxWidth: isLargeScreen ? "50%" : 1000,
                    marginBottom: isLargeScreen ? 0 : 24,
                  },
                ]}
              >
                <View style={styles.chartCard}>
                  <Text variant={"bold"} style={styles.sectionTitle}>
                    Monthly Forms Submitted
                  </Text>
                  <DynamicChart
                    monthlyData={stats.monthlyForms}
                    monthLabels={stats.monthLabels}
                    width={
                      Platform.OS === "web"
                        ? isLargeScreen
                          ? Math.min((windowDimensions.width - 72) / 2, 600)
                          : isMediumScreen
                            ? Math.min((windowDimensions.width - 48) / 2, 850)
                            : Math.min(windowDimensions.width - 48, 1000)
                        : windowDimensions.width - 32
                    }
                  />
                </View>
              </View>
            </View>

            <View
              style={[
                styles.gridContainer,
                { flexDirection: isLargeScreen ? "row" : "column" },
              ]}
            >
              {/* Top Employees Card */}
              <View
                style={[
                  styles.gridItem,
                  {
                    flex: isLargeScreen ? 1 : undefined,
                    width: "100%",
                    maxWidth: isLargeScreen ? "50%" : 1000,
                    marginBottom: isLargeScreen ? 0 : 24,
                  },
                ]}
              >
                <View style={styles.listCard}>
                  <Text variant={"bold"} style={styles.sectionTitle}>
                    Top Performing Employees
                  </Text>
                  {stats.topEmployees.length > 0 ? (
                    <>
                      {stats.topEmployees
                        .slice(
                          0,
                          showAllEmployees ? stats.topEmployees.length : 3
                        )
                        .map((employee, index) => (
                          <View
                            key={index}
                            style={[
                              styles.employeeCard,
                              index ===
                                (showAllEmployees
                                  ? stats.topEmployees.length
                                  : Math.min(3, stats.topEmployees.length)) -
                                  1 && {
                                borderBottomWidth: 0,
                                marginBottom: 0,
                              },
                            ]}
                          >
                            <View style={styles.employeeInfo}>
                              <Text
                                variant={"bold"}
                                style={styles.employeeName}
                              >
                                {employee.name}
                              </Text>
                            </View>
                            <View style={styles.formsCountContainer}>
                              <Text variant={"bold"} style={styles.formsCount}>
                                {employee.forms_count}
                              </Text>
                              <Text style={styles.formsLabel}>Forms</Text>
                            </View>
                          </View>
                        ))}
                      {stats.topEmployees.length > 3 && (
                        <TouchableOpacity
                          style={styles.showMoreButton}
                          onPress={() => setShowAllEmployees(!showAllEmployees)}
                        >
                          <Text style={styles.showMoreText}>
                            {showAllEmployees ? "Show Less" : "Show More"}
                          </Text>
                          <MaterialCommunityIcons
                            name={
                              showAllEmployees ? "chevron-up" : "chevron-down"
                            }
                            size={16}
                            color="#3b82f6"
                          />
                        </TouchableOpacity>
                      )}
                    </>
                  ) : (
                    <View style={styles.emptyState}>
                      <MaterialCommunityIcons
                        name="account-group"
                        size={48}
                        color={theme.colors.outlineVariant}
                      />
                      <Text style={styles.emptyStateText}>
                        No employee data found
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Task Status Cards */}
              <View
                style={[
                  styles.gridItem,
                  {
                    flex: isLargeScreen ? 1 : undefined,
                    width: "100%",
                    maxWidth: isLargeScreen ? "50%" : 1000,
                  },
                ]}
              >
                <View style={styles.taskCardsWrapper}>
                  <View style={styles.taskCardsGrid}>
                    <View
                      style={[
                        styles.statCardSmall,
                        { width: "100%", marginBottom: 14 },
                      ]}
                    >
                      <Text variant={"medium"} style={styles.statCardLabel}>
                        Pending Tasks
                      </Text>
                      <Text variant={"bold"} style={styles.statCardValue}>
                        {stats.pendingTasks}
                      </Text>
                      <MaterialCommunityIcons
                        name="clipboard-clock"
                        size={24}
                        color="#F59E0B"
                      />
                    </View>

                    <View
                      style={[
                        styles.statCardSmall,
                        { width: "100%", marginBottom: 16 },
                      ]}
                    >
                      <Text variant={"medium"} style={styles.statCardLabel}>
                        Completed Tasks
                      </Text>
                      <Text variant={"bold"} style={styles.statCardValue}>
                        {stats.completedTasks}
                      </Text>
                      <MaterialCommunityIcons
                        name="clipboard-check"
                        size={24}
                        color="#10B981"
                      />
                    </View>

                    <View
                      style={[
                        styles.statCardSmall,
                        { width: "100%", marginBottom: 0 },
                      ]}
                    >
                      <Text variant={"medium"} style={styles.statCardLabel}>
                        Overdue Tasks
                      </Text>
                      <Text variant={"bold"} style={styles.statCardValue}>
                        {stats.overdueTasks}
                      </Text>
                      <MaterialCommunityIcons
                        name="clipboard-alert"
                        size={24}
                        color="#EF4444"
                      />
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Activity Logs Section */}
            <View style={styles.activityLogsSection}>
              <Surface style={styles.activityLogsCard} elevation={0}>
                {stats.latestActivities && stats.latestActivities.length > 0 ? (
                  <>
                    <ActivityLogTimeline
                      logs={stats.latestActivities}
                      title="Recent Company Activities"
                    />
                  </>
                ) : (
                  <View style={styles.emptyState}>
                    <MaterialCommunityIcons
                      name="clock-outline"
                      size={48}
                      color={theme.colors.outlineVariant}
                    />
                    <Text style={styles.emptyStateText}>
                      No activity logs found
                    </Text>
                  </View>
                )}
              </Surface>
            </View>
          </ScrollView>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

export default CompanyAdminDashboard;
