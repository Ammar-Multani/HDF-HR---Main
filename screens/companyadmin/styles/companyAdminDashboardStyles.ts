import { StyleSheet, Dimensions, Platform } from "react-native";
import { createTextStyle } from "../../../utils/globalStyles";
const { width } = Dimensions.get("window");

export const dashboardStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f7fa",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Platform.OS === "web" ? (width >= 768 ? 24 : 16) : 16,
    paddingVertical: Platform.OS === "web" ? (width >= 768 ? 24 : 16) : 16,
    paddingBottom: 90,
    maxWidth: Platform.OS === "web" ? 1400 : undefined,
    alignSelf: "center",
    width: "100%",
  },
  welcomeHeader: {
    marginBottom: Platform.OS === "web" ? 24 : 16,
    marginTop: Platform.OS === "web" ? 8 : 5,
    marginLeft: 5,
  },
  welcomeTitle: {
    ...createTextStyle({
      fontWeight: "600",
      fontSize: Platform.OS === "web" ? (width >= 768 ? 28 : 22) : 22,
    }),
    color: "#333",
    paddingBottom: 3,
  },
  welcomeSubtitle: {
    ...createTextStyle({
      fontWeight: "400",
      fontSize: Platform.OS === "web" ? (width >= 768 ? 16 : 14) : 14,
    }),
    color: "#666",
  },
  statsGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
    marginBottom: 24,
    justifyContent: "space-between",
  },
  statsGridItem: {
    // Base styles only, dynamic values applied inline
  },
  statsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    height: "100%",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  skeletonStatsCard: {
    padding: Platform.OS === "web" ? 24 : 20,
    minHeight: 120,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
  },
  statLabel: {
    ...createTextStyle({
      fontWeight: "500",
      fontSize: Platform.OS === "web" ? (width >= 768 ? 14 : 13) : 13,
    }),
    color: "#333",
    right: 5,
    paddingRight: 3,
  },
  statGrowth: {
    fontSize: 10,
    color: "#4CAF50",
  },
  negativeGrowth: {
    color: "#F44336",
  },
  statValue: {
    ...createTextStyle({
      fontWeight: "600",
      fontSize: Platform.OS === "web" ? (width >= 768 ? 32 : 25) : 25,
    }),
    color: "#111",
    marginTop: Platform.OS === "web" ? 16 : 8,
  },
  chartsContainer: {
    flexDirection: width >= 1440 ? "row" : "column",
    gap: 24,
    marginBottom: 24,
    width: "100%",
    alignItems: "center",
  },
  chartWrapper: {
    flex: width >= 1440 ? 1 : undefined,
    width: "100%",
    maxWidth: width >= 1440 ? "50%" : 1000,
    marginBottom: width >= 1440 ? 0 : 24,
  },
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 0,
    marginBottom: Platform.OS === "web" ? 0 : 1,
    minHeight: width >= 768 ? 290 : 290,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    flex: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    overflow: "hidden",
  },
  sectionTitle: {
    ...createTextStyle({
      fontWeight: "600",
      fontSize: Platform.OS === "web" ? (width >= 768 ? 18 : 16) : 16,
    }),
    marginBottom: Platform.OS === "web" ? (width >= 768 ? 20 : 16) : 16,
    color: "#374151",
    paddingHorizontal: Platform.OS === "web" ? 24 : 16,
    paddingTop: Platform.OS === "web" ? 24 : 16,
  },
  gridContainer: {
    gap: 24,
    width: "100%",
    marginBottom: 24,
  },
  gridItem: {
    flex: 1,
  },
  taskCardsWrapper: {},
  taskCardsGrid: {
    width: "100%",
  },
  statCardSmall: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: Platform.OS === "web" ? (width >= 768 ? 24 : 20) : 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statCardLabel: {
    fontSize: Platform.OS === "web" ? (width >= 768 ? 14 : 13) : 13,
    color: "#555",
    marginBottom: 8,
  },
  statCardValue: {
    fontSize: Platform.OS === "web" ? (width >= 768 ? 24 : 20) : 20,
    color: "#111",
    marginBottom: 8,
  },
  skeleton: {
    backgroundColor: "#F3F4F6",
    borderRadius: 4,
    overflow: "hidden",
  },
  skeletonTitle: {
    marginBottom: 8,
  },
  skeletonSubtitle: {
    marginBottom: 24,
  },
  listCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: Platform.OS === "web" ? (width >= 768 ? 24 : 16) : 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  employeeCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: Platform.OS === "web" ? (width >= 768 ? 20 : 16) : 16,
    marginBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    ...createTextStyle({
      fontWeight: "600",
      fontSize: Platform.OS === "web" ? (width >= 768 ? 16 : 14) : 14,
    }),
    color: "#333",
  },
  formsCountContainer: {
    alignItems: "center",
  },
  formsCount: {
    fontSize: 18,
    color: "#3b82f6",
  },
  formsLabel: {
    fontSize: 12,
    color: "#666",
  },
  showMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  showMoreText: {
    color: "#3b82f6",
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    marginRight: 5,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyStateText: {
    marginTop: 8,
    fontSize: 16,
    color: "#999",
  },
  activityLogsSection: {
    marginTop: 24,
    width: "100%",
  },
  activityLogsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    borderColor: "#e0e0e0",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 2,
    minHeight: 400,
    maxHeight: 600,
    overflow: "hidden",
  },
  systemNotice: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    padding: 12,
    fontStyle: "italic",
  },
});

export default dashboardStyles;
