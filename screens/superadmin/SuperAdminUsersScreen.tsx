import React, { useState, useEffect, useRef } from "react";
import { logDebug } from "../../utils/logger";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Platform,
  Animated,
  TouchableWithoutFeedback,
  Pressable,
  Dimensions,
  PressableStateCallbackType,
  Switch,
} from "react-native";
import {
  Card,
  Searchbar,
  useTheme,
  FAB,
  Avatar,
  Chip,
  SegmentedButtons,
  ActivityIndicator,
  Divider,
  Button,
  TextInput,
  List,
  Menu,
  IconButton,
  Modal,
  Portal,
  RadioButton,
  MD3Theme,
  Banner,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
  useFocusEffect,
} from "@react-navigation/native";
import { supabase } from "../../lib/supabase";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import EmptyState from "../../components/EmptyState";
import Text from "../../components/Text";
import { LinearGradient } from "expo-linear-gradient";
import StatusBadge from "../../components/StatusBadge";
import { UserStatus } from "../../types";
import {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useTranslation } from "react-i18next";
import FilterModal from "../../components/FilterModal";
import {
  FilterSection,
  RadioFilterGroup,
  FilterDivider,
  PillFilterGroup,
} from "../../components/FilterSections";
import { formatDate } from "../../utils/dateUtils";
import Pagination from "../../components/Pagination";
import { FlashList } from "@shopify/flash-list";

// User list types
enum UserListType {
  SUPER_ADMIN = "super_admin",
  COMPANY_ADMIN = "company_admin",
  EMPLOYEE = "employee",
}

// Date sort options
enum DateSortOrder {
  NEWEST_FIRST = "desc",
  OLDEST_FIRST = "asc",
}

// Admin type for super admins
interface Admin {
  id: string;
  name?: string;
  email: string;
  status?: string | boolean;
  role: string;
  created_at: string;
  admin_sequence_id?: number;
}

// Company type
interface Company {
  id: string;
  company_name: string;
  active: boolean;
}

// Company User interface
interface CompanyUser {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number?: string;
  role: string;
  active_status?: string | boolean;
  job_title?: string;
  created_at: string;
  company_user_sequence_id?: number;
}

// Add this component after the imports and before other components
const TooltipText = React.memo(
  ({
    text,
    numberOfLines = 1,
    styles,
  }: {
    text: string;
    numberOfLines?: number;
    styles: ReturnType<typeof getStyles>;
  }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const containerRef = useRef<View>(null);

    const updateTooltipPosition = () => {
      if (Platform.OS === "web" && containerRef.current) {
        // @ts-ignore - web specific
        const rect = containerRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        const spaceAbove = rect.top;
        const spaceBelow = windowHeight - rect.bottom;

        // Calculate horizontal position to prevent overflow
        const windowWidth = window.innerWidth;
        let xPos = rect.left;

        // Ensure tooltip doesn't overflow right edge
        if (xPos + 300 > windowWidth) {
          // 300 is max tooltip width
          xPos = windowWidth - 310; // Add some padding
        }

        // Position vertically based on available space
        let yPos;
        if (spaceBelow >= 100) {
          // If enough space below
          yPos = rect.bottom + window.scrollY + 5;
        } else if (spaceAbove >= 100) {
          // If enough space above
          yPos = rect.top + window.scrollY - 5;
        } else {
          // If neither, position it where there's more space
          yPos =
            spaceAbove > spaceBelow
              ? rect.top + window.scrollY - 5
              : rect.bottom + window.scrollY + 5;
        }

        setTooltipPosition({ x: xPos, y: yPos });
      }
    };

    useEffect(() => {
      if (isHovered) {
        updateTooltipPosition();
        // Add scroll and resize listeners
        if (Platform.OS === "web") {
          window.addEventListener("scroll", updateTooltipPosition);
          window.addEventListener("resize", updateTooltipPosition);

          return () => {
            window.removeEventListener("scroll", updateTooltipPosition);
            window.removeEventListener("resize", updateTooltipPosition);
          };
        }
      }
    }, [isHovered]);

    if (Platform.OS !== "web") {
      return (
        <Text style={styles.tableCellText} numberOfLines={numberOfLines}>
          {text}
        </Text>
      );
    }

    return (
      <View
        ref={containerRef}
        style={styles.tooltipContainer}
        // @ts-ignore - web specific props
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Text style={styles.tableCellText} numberOfLines={numberOfLines}>
          {text}
        </Text>
        {isHovered && (
          <Portal>
            <View
              style={[
                styles.tooltip,
                {
                  position: "absolute",
                  left: tooltipPosition.x,
                  top: tooltipPosition.y,
                },
              ]}
            >
              <Text style={styles.tooltipText}>{text}</Text>
            </View>
          </Portal>
        )}
      </View>
    );
  }
);

// Add Shimmer component after TooltipText component
interface ShimmerProps {
  width: number | string;
  height: number;
  style?: any;
}

const Shimmer: React.FC<ShimmerProps> = ({ width, height, style }) => {
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: withRepeat(
            withSequence(
              withTiming(typeof width === "number" ? -width : -200, {
                duration: 800,
              }),
              withTiming(typeof width === "number" ? width : 200, {
                duration: 800,
              })
            ),
            -1
          ),
        },
      ],
    };
  });

  return (
    <View
      style={[
        {
          width,
          height,
          backgroundColor: "#E8E8E8",
          overflow: "hidden",
          borderRadius: 4,
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          {
            width: "100%",
            height: "100%",
            position: "absolute",
            backgroundColor: "transparent",
          },
          animatedStyle,
        ]}
      >
        <LinearGradient
          colors={["transparent", "rgba(255, 255, 255, 0.4)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ width: "100%", height: "100%" }}
        />
      </Animated.View>
    </View>
  );
};

const getStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      minHeight: 100, // Ensure minimum height
    },
    contentContainer: {
      flex: 1,
      paddingHorizontal: Platform.OS === "web" ? 24 : 0,
    },
    filterCard: {
      marginBottom: 12,
      borderRadius: 12,
      elevation: 2,
      overflow: "hidden",
      borderColor: "#E0E0E0",
      borderWidth: 1,
    },
    filterHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    filterLabel: {
      fontSize: 14,
      marginBottom: 0,
      fontWeight: "bold",
    },
    filterRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    companyFilterContainer: {
      flex: 1,
      marginRight: 8,
    },
    searchContainer: {
      padding: Platform.OS === "web" ? 24 : 16,
      paddingTop: 10,
      paddingBottom: 8,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    searchBarContainer: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    searchbar: {
      elevation: 0,
      borderRadius: 18,
      height: 56,
      backgroundColor: "#fff",
      borderWidth: 1,
      borderColor: "#e0e0e0",
      flex: 1,
    },
    filterButtonContainer: {
      position: "relative",
      marginLeft: 8,
    },
    filterButton: {
      borderWidth: 1,
      borderColor: "#e0e0e0",
      borderRadius: 8,
      backgroundColor: "#fff",
    },
    inputContainer: {
      height: 40,
      paddingHorizontal: 8,
    },
    tabCount: {
      fontSize: 12,
      color: "#1a73e8",
      fontFamily: "Poppins-Medium",
    },
    card: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#F0F0F0",
      elevation: 0,
      backgroundColor: "#FFFFFF",
      marginBottom: 0,
      marginHorizontal: 0,
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    cardContent: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    cardContainer: {
      marginBottom: 5,
      marginHorizontal: 0,
    },
    userInfo: {
      flexDirection: "row",
      alignItems: "flex-start",
      flex: 1,
    },
    userTextContainer: {
      marginLeft: 16,
      flex: 1,
    },
    userName: {
      fontSize: 16,
      fontFamily: "Poppins-SemiBold",
      marginBottom: 4,
      color: "#212121",
    },
    userEmail: {
      fontSize: 14,
      color: "#757575",
      fontFamily: "Poppins-Regular",
      marginBottom: 8,
    },
    userRole: {
      fontSize: 12,
      color: "#1a73e8",
      fontFamily: "Poppins-Medium",
      marginTop: 2,
    },
    userCompany: {
      fontSize: 12,
      color: "#616161",
      fontFamily: "Poppins-Medium",
      marginTop: 2,
    },
    jobTitle: {
      fontSize: 12,
      color: "#616161",
      fontFamily: "Poppins-Regular",
      marginTop: 2,
    },
    employeeDetails: {
      marginTop: 2,
    },
    listContent: {
      padding: 16,
      paddingTop: 8,
      paddingBottom: 100,
      flexGrow: 1,
    },
    listContainer: {
      flex: 1,
      marginTop: 0,
      marginBottom: 0,
      minHeight: 400,
    },
    listHeaderContainer: {
      backgroundColor: "#FFFFFF",
      paddingHorizontal: 16,
      paddingVertical: 14,
      marginBottom: 10,
      borderRadius: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      elevation: 2,
      borderWidth: 1,
      borderColor: "#F0F0F0",
      marginHorizontal: 2,
    },
    listHeaderTitle: {
      fontSize: 18,
      fontFamily: "Poppins-Medium",
      color: "#212121",
    },
    listHeaderCount: {
      color: "#1a73e8",
      fontSize: 16,
      fontFamily: "Poppins-Regular",
    },
    activeFilterButton: {
      backgroundColor: "#E8F0FE",
      borderWidth: 1,
      borderColor: "#1a73e8",
    },
    clearFilterButtonLabel: {
      fontSize: 12,
      color: "#1a73e8",
    },
    dropdownContainer: {
      // marginBottom: 8,
    },
    dropdownButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: "#E0E0E0",
      borderRadius: 12,
      paddingLeft: 4,
      paddingRight: 8,
      paddingVertical: 6,
      backgroundColor: "#FFFFFF",
    },
    dropdownContent: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    dropdownLeadingIcon: {
      margin: 0,
      padding: 0,
    },
    dropdownButtonText: {
      fontFamily: "Poppins-Regular",
      color: "#424242",
      flex: 1,
      fontSize: 14,
    },
    dropdownIcon: {
      margin: 0,
      padding: 0,
    },
    modalContainer: {
      backgroundColor: "white",
      borderRadius: 16,
      margin: 16,
      overflow: "hidden",
      maxHeight: "100%",
      elevation: 5,
      maxWidth: "40%",
      justifyContent: "center",
    },
    modalHeaderContainer: {
      backgroundColor: "white",
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      zIndex: 1,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 16,
    },
    modalTitle: {
      fontSize: 20,
      fontFamily: "Poppins-SemiBold",
      color: "#212121",
    },
    modalContent: {
      padding: 16,
    },
    modalFooter: {
      flexDirection: "row",
      justifyContent: "flex-end",
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: "#E0E0E0",
      backgroundColor: "#FFFFFF",
    },
    modalButton: {
      marginLeft: 12,
      borderRadius: 8,
    },
    modalDivider: {
      height: 1,
      backgroundColor: "#E0E0E0",
    },
    modalSection: {
      marginBottom: 14,
    },
    sectionHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 12,
    },
    selectionBadge: {
      backgroundColor: "#F5F5F5",
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 16,
    },
    selectionHint: {
      fontSize: 12,
      color: "#616161",
      fontFamily: "Poppins-Medium",
    },
    sectionTitle: {
      fontSize: 16,
      fontFamily: "Poppins-SemiBold",
      color: "#212121",
      marginBottom: 0,
    },
    activeDropdownButton: {
      borderColor: "#1a73e8",
      backgroundColor: "#F0F7FF",
    },
    activeFilterSection: {
      marginBottom: 16,
      backgroundColor: "#F5F5F5",
      borderRadius: 12,
      padding: 12,
    },
    activeFilterHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 8,
    },
    activeFilterTitle: {
      fontSize: 14,
      fontFamily: "Poppins-Medium",
      color: "#424242",
    },
    activeFilterContainer: {
      flexDirection: "column",
      marginTop: 8,
    },
    activeFiltersContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      flexWrap: "wrap",
      paddingHorizontal: 14,
      paddingBottom: 12,
    },
    activeFiltersText: {
      fontSize: 14,
      fontFamily: "Poppins-Regular",
      color: "#616161",
      marginRight: 8,
    },
    filtersScrollView: {
      flexGrow: 0,
      marginVertical: 4,
    },
    clearAllButton: {
      marginVertical: 0,
      height: 30,
      justifyContent: "center",
      paddingBottom: 5,
    },
    menuHeader: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      backgroundColor: "#F5F5F5",
    },
    menuTitle: {
      fontSize: 14,
      fontFamily: "Poppins-Medium",
      color: "#212121",
    },
    menuSubtitle: {
      fontSize: 12,
      fontFamily: "Poppins-Regular",
      color: "#616161",
      marginTop: 2,
    },
    menuContainer: {
      borderRadius: 8,
      width: 280,
      marginTop: 4,
      elevation: 3,
    },
    menuItemStyle: {
      height: 48,
      justifyContent: "center",
      borderBottomWidth: 1,
      borderColor: "#E0E0E0",
    },
    menuItemText: {
      fontFamily: "Poppins-Regular",
      fontSize: 14,
      color: "#424242",
    },
    menuItemSelected: {
      color: "#1a73e8",
      fontFamily: "Poppins-Medium",
      paddingRight: 12,
    },
    resultSummary: {
      alignItems: "center",
      padding: 8,
      backgroundColor: "#e8f4fd",
      borderRadius: 8,
      marginTop: 12,
    },
    resultSummaryText: {
      color: "#0066cc",
      fontWeight: "500",
      fontSize: 14,
    },
    resultsText: {
      textAlign: "center",
      fontSize: 14,
      opacity: 0.7,
    },
    fab: {
      borderRadius: 27,
      height: 56,
      elevation: 0,
    },
    avatarContainer: {
      width: 50,
      height: 50,
      borderRadius: 25,
      overflow: "hidden",
    },
    avatarGradient: {
      width: "100%",
      height: "100%",
      alignItems: "center",
      justifyContent: "center",
      paddingTop: 3,
    },
    avatarText: {
      color: "#FFFFFF",
      fontSize: 18,
      fontFamily: "Poppins-Bold",
    },
    filterBadge: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#ff5252",
      position: "absolute",
      top: 8,
      right: 8,
      zIndex: 2,
    },
    statusContainer: {
      flexDirection: "column",
      alignItems: "flex-end",
      justifyContent: "flex-start",
    },
    menuButton: {
      margin: 0,
      marginTop: -5,
    },
    superAdminAvatar: {
      backgroundColor: "rgba(54,105,157,0.9)",
    },
    companyAdminAvatar: {
      backgroundColor: "rgba(140,82,255,0.9)",
    },
    employeeAvatar: {
      backgroundColor: "rgba(76,175,80,0.9)",
    },
    badgeContainer: {
      flexDirection: "column",
      marginTop: 2,
    },
    roleBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#1a73e8",
      borderRadius: 16,
      paddingRight: 8,
      marginBottom: 4,
      alignSelf: "flex-start",
    },
    employeeRoleBadge: {
      backgroundColor: "#4CAF50",
    },
    roleIcon: {
      margin: 0,
      padding: 0,
    },
    roleBadgeText: {
      color: "#FFFFFF",
      fontSize: 12,
      fontFamily: "Poppins-Medium",
    },
    companyBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#F5F5F5",
      borderRadius: 16,
      paddingRight: 8,
      marginBottom: 4,
      alignSelf: "flex-start",
    },
    companyIcon: {
      margin: 0,
      padding: 0,
    },
    companyBadgeText: {
      color: "#616161",
      fontSize: 12,
      fontFamily: "Poppins-Regular",
    },
    jobTitleBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "#F5F5F5",
      borderRadius: 16,
      paddingRight: 8,
      alignSelf: "flex-start",
    },
    jobTitleIcon: {
      margin: 0,
      padding: 0,
    },
    jobTitleBadgeText: {
      color: "#616161",
      fontSize: 12,
      fontFamily: "Poppins-Regular",
    },
    footerButton: {
      paddingVertical: 10,
      paddingHorizontal: 20,
      borderRadius: 8,
      marginLeft: 12,
    },
    clearButtonText: {
      fontSize: 14,
      fontFamily: "Poppins-Medium",
      color: "#616161",
    },
    applyButton: {
      elevation: 2,
    },
    applyButtonText: {
      fontSize: 14,
      fontFamily: "Poppins-Medium",
      color: "#FFFFFF",
    },
    radioItem: {
      flexDirection: "row",
      alignItems: "center",
      marginVertical: 4,
    },
    radioLabel: {
      fontSize: 16,
      marginLeft: 8,
      fontFamily: "Poppins-Regular",
      color: "#424242",
    },
    searchTips: {
      backgroundColor: "#e8f4fd",
      padding: 12,
      borderRadius: 8,
      marginBottom: 12,
    },
    searchTipsText: {
      color: "#0066cc",
      fontWeight: "500",
      fontSize: 14,
    },
    searchResultsContainer: {
      backgroundColor: "#e8f4fd",
      padding: 12,
      borderRadius: 8,
      marginBottom: 12,
    },
    searchResultsText: {
      color: "#0066cc",
      fontWeight: "500",
      fontSize: 14,
    },
    userTypeDropdownContainer: {
      marginBottom: 10,
      zIndex: 10,
    },
    userTypeDropdown: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1.5,
      borderColor: "#E0E0E0",
      borderRadius: 15,
      paddingVertical: 6,
      paddingLeft: 6,
      paddingRight: 8,
      backgroundColor: "#FFFFFF",
      elevation: 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      paddingHorizontal: 10,
    },
    userTypeDropdownContent: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    iconContainer: {
      borderRadius: 12,
      marginRight: 4,
      padding: 2,
    },
    userTypeDropdownText: {
      fontFamily: "Poppins-Medium",
      color: "#424242",
      flex: 1,
      fontSize: 16,
      marginLeft: 4,
    },
    menuBackdrop: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.01)",
    },
    enhancedMenuContainer: {
      backgroundColor: "#FFFFFF",
      borderRadius: 15,
      paddingVertical: 8,
      elevation: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 6,
      overflow: "hidden",
      width: "100%",
      maxWidth: 350,
    },
    userTypeMenuHeader: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: "#F0F0F0",
    },
    userTypeMenuTitle: {
      fontSize: 16,
      fontFamily: "Poppins-Medium",
      color: "#333333",
    },
    enhancedMenuItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: "#F0F0F0",
    },
    selectedMenuItem: {
      backgroundColor: "#F8F8F8",
    },
    menuIconContainer: {
      borderRadius: 12,
      padding: 2,
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    menuIcon: {
      margin: 0,
      padding: 0,
    },
    menuItemContent: {
      flex: 1,
      marginLeft: 12,
    },
    menuItemTitleText: {
      fontSize: 16,
      fontFamily: "Poppins-Medium",
      color: "#333333",
      marginBottom: 2,
    },
    menuItemDescription: {
      fontSize: 12,
      fontFamily: "Poppins-Regular",
      color: "#757575",
    },
    checkIconContainer: {
      marginLeft: 8,
    },
    tabsContainer: {},
    tabsWrapper: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
    },
    tab: {
      paddingVertical: 5,
      paddingHorizontal: 10,
      borderWidth: 0.5,
      borderRadius: 25,
      marginHorizontal: 5,
    },
    activeTab: {},
    tabText: {
      fontSize: 14,
      fontFamily: "Poppins-Medium",
      color: "#616161",
    },
    activeTabText: {
      color: "#1a73e8",
    },
    tableContainer: {
      flex: 1,
      minHeight: 400,
      backgroundColor: "#fff",
      borderRadius: 16,
      borderWidth: 1,
      borderColor: "#e0e0e0",
      overflow: "hidden",
    },
    tableHeader: {
      flexDirection: "row",
      backgroundColor: "#f8fafc",
      borderBottomWidth: 1,
      borderBottomColor: "#e0e0e0",
      paddingVertical: 16,
      paddingHorizontal: 26,
      alignContent: "center",
      justifyContent: "center",
      alignItems: "center",
    },
    tableHeaderCell: {
      flex: 1,
      paddingHorizontal: 16,
      justifyContent: "space-around",
      paddingLeft: 25,
      alignItems: "flex-start",
    },
    tableHeaderText: {
      fontSize: 14,
      color: "#64748b",
    },
    tableRow: {
      flexDirection: "row",
      borderBottomWidth: 1,
      borderBottomColor: "#e0e0e0",
      paddingVertical: 16,
      backgroundColor: "#fff",
      paddingHorizontal: 26,
      alignItems: "center",
    },
    tableCell: {
      flex: 1,
      paddingHorizontal: 26,
      justifyContent: "space-evenly",
      alignItems: "flex-start",
    },
    receiptIdLink: {
      color: "#1a73e8",
      cursor: "pointer",
      fontSize: 14,
      fontFamily: "Poppins-Regular",
    },
    tableCellText: {
      fontSize: 14,
      color: "#334155",
    },
    tableContent: {
      padding: 8,
      paddingBottom: 50,
      backgroundColor: "#fff",
      flexGrow: 1,
    },
    actionCell: {
      flex: 1,
      flexDirection: "row",
      justifyContent: "flex-start",
      alignItems: "center",
      paddingHorizontal: 26,
    },
    actionIcon: {
      margin: 0,
      marginRight: 8,
    },
    tooltipContainer: {
      position: "relative",
      flex: 1,
      maxWidth: "100%",
      zIndex: 10, // Higher z-index to appear above table header
    },
    tooltip: {
      backgroundColor: "rgba(255, 255, 255, 0.95)",
      padding: 8,
      marginLeft: 30,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: "#e0e0e0",
      maxWidth: 300,
      shadowColor: "#000",
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      zIndex: 9999,
      ...(Platform.OS === "web"
        ? {
            // @ts-ignore - web specific style
            willChange: "transform",
            // @ts-ignore - web specific style
            isolation: "isolate",
          }
        : {}),
    },
    tooltipText: {
      color: "#000",
      fontSize: 12,
      fontFamily: "Poppins-Regular",
      lineHeight: 16,
    },
    skeleton: {
      backgroundColor: "#F3F4F6",
      borderRadius: 4,
      overflow: "hidden",
    },
    skeletonCard: {
      backgroundColor: "#FFFFFF",
      borderRadius: 12,
      borderWidth: 1,
      borderColor: "#F0F0F0",
      padding: 16,
      marginBottom: 16,
    },
    activeFilterChip: {
      margin: 4,
      backgroundColor: "rgba(26, 115, 232, 0.1)",
      borderColor: "#1a73e8",
    },
    paginationWrapper: {
      marginTop: 5,
      overflow: "hidden",
      width: "auto",
      alignSelf: "center",
    },
    totalCountContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    totalCountText: {
      fontSize: 11,
      color: "#666",
      fontFamily: "Poppins-Regular",
    },
    totalCountValue: {
      fontSize: 14,
      color: theme.colors.primary,
      fontFamily: "Poppins-Medium",
      marginLeft: 4,
    },
    switchContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    switchLabel: {
      fontSize: 14,
      color: "#424242",
      fontFamily: "Poppins-Regular",
      flex: 1,
      marginRight: 16,
    },
    userNameContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-start",
      marginBottom: 4,
    },
    sequenceId: {
      fontSize: 14,
      color: "#757575",
      marginLeft: 8,
      fontFamily: "Poppins-Regular",
    },
  });

const SuperAdminUsersScreen = () => {
  const theme = useTheme();
  const styles = React.useMemo(() => getStyles(theme), [theme]);
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [menuVisible, setMenuVisible] = useState(false);

  // Add pagination state
  const PAGE_SIZE = 20;
  const [page, setPage] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);

  // Add separate count states for each user type
  const [superAdminCount, setSuperAdminCount] = useState(0);
  const [companyAdminCount, setCompanyAdminCount] = useState(0);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [totalItems, setTotalItems] = useState(0);

  // State for different user types
  const [superAdmins, setSuperAdmins] = useState<Admin[]>([]);
  const [companyAdmins, setCompanyAdmins] = useState<CompanyUser[]>([]);
  const [employees, setEmployees] = useState<CompanyUser[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSuperAdmins, setFilteredSuperAdmins] = useState<Admin[]>([]);
  const [filteredCompanyAdmins, setFilteredCompanyAdmins] = useState<
    CompanyUser[]
  >([]);
  const [filteredEmployees, setFilteredEmployees] = useState<CompanyUser[]>([]);

  // Company filter states
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("all");

  // Date sort filter
  const [sortOrder, setSortOrder] = useState<string>(
    DateSortOrder.NEWEST_FIRST
  );

  // Filter modal state
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Tab selection
  const [selectedTab, setSelectedTab] = useState<string>(
    UserListType.SUPER_ADMIN
  );

  // User type dropdown state
  const [userTypeMenuVisible, setUserTypeMenuVisible] = useState(false);
  const userTypeDropdownRef = React.useRef(null);
  const [userTypeMenuPosition, setUserTypeMenuPosition] = useState({
    x: 0,
    y: 0,
  });

  // Animation values for dropdown
  const [dropdownAnimation] = useState(new Animated.Value(0));
  const [rotateAnimation] = useState(new Animated.Value(0));

  // Create styles with theme access
  const localStyles = {
    activeFilterChip: {
      margin: 4,
      backgroundColor: "rgba(26, 115, 232, 0.1)",
      borderColor: theme.colors.primary,
    },
  };

  // Fetch companies for filtering
  const fetchCompanies = async () => {
    try {
      const { data, error } = await supabase
        .from("company")
        .select("id, company_name, active")
        .eq("active", true)
        .order("company_name");

      if (error) {
        console.error("Error fetching companies:", error);
        return;
      }

      setCompanies(data || []);
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  // Fetch super admins with pagination
  const fetchSuperAdmins = async (refresh = false) => {
    try {
      if (refresh) {
        setPage(0);
        setHasMoreData(true);
      } else {
        setLoadingMore(true);
      }

      const currentPage = refresh ? 0 : page;
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("admin")
        .select("*", { count: "exact" })
        .eq("role", "superadmin")
        .order("created_at", { ascending: false });

      // Apply status filter
      if (statusFilter === "deleted") {
        query = query.not("deleted_at", "is", null);
      } else {
        query = query.is("deleted_at", null);
        if (statusFilter === "active") {
          query = query.eq("status", true);
        } else if (statusFilter === "inactive") {
          query = query.eq("status", false);
        }
      }

      // Apply search filter
      if (searchQuery && searchQuery.length >= 3) {
        query = query.or(
          `name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
        );
      }

      // Apply pagination
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching super admins:", error);
        return;
      }

      // Check if we have more data
      if (count !== null) {
        setHasMoreData(from + (data?.length || 0) < count);
        setSuperAdminCount(count);
        setTotalItems(count);
      } else {
        setHasMoreData(data?.length === PAGE_SIZE);
      }

      if (refresh) {
        setSuperAdmins(data || []);
        setFilteredSuperAdmins(data || []);
      } else {
        setSuperAdmins((prev) => [...prev, ...(data || [])]);
        setFilteredSuperAdmins((prev) => [...prev, ...(data || [])]);
      }
    } catch (error) {
      console.error("Error in fetchSuperAdmins:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  // Fetch company admins with pagination
  const fetchCompanyAdmins = async (refresh = false) => {
    try {
      if (refresh) {
        setPage(0);
        setHasMoreData(true);
      } else {
        setLoadingMore(true);
      }

      const currentPage = refresh ? 0 : page;
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("company_user")
        .select("*, company:company_id(company_name)", { count: "exact" })
        .eq("role", "admin")
        .order("created_at", { ascending: false })
        .order("company_user_sequence_id", { ascending: true });

      // Apply status filter
      if (statusFilter === "deleted") {
        query = query.not("deleted_at", "is", null);
      } else {
        query = query.is("deleted_at", null);
        if (statusFilter === "active") {
          query = query.eq("active_status", "active");
        } else if (statusFilter === "inactive") {
          query = query.eq("active_status", "inactive");
        }
      }

      // Apply search filter
      if (searchQuery && searchQuery.length >= 3) {
        query = query.or(
          `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
        );
      }

      // Apply company filter
      if (selectedCompanyIds.length > 0) {
        query = query.in("company_id", selectedCompanyIds);
      } else if (selectedCompanyId !== "all") {
        query = query.eq("company_id", selectedCompanyId);
      }

      // Apply pagination
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching company admins:", error);
        return;
      }

      // Check if we have more data
      if (count !== null) {
        setHasMoreData(from + (data?.length || 0) < count);
        setCompanyAdminCount(count);
        setTotalItems(count);
      } else {
        setHasMoreData(data?.length === PAGE_SIZE);
      }

      if (refresh) {
        setCompanyAdmins(data || []);
        setFilteredCompanyAdmins(data || []);
      } else {
        setCompanyAdmins((prev) => [...prev, ...(data || [])]);
        setFilteredCompanyAdmins((prev) => [...prev, ...(data || [])]);
      }
    } catch (error) {
      console.error("Error in fetchCompanyAdmins:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  // Fetch employees with pagination
  const fetchEmployees = async (refresh = false) => {
    try {
      if (refresh) {
        setPage(0);
        setHasMoreData(true);
      } else {
        setLoadingMore(true);
      }

      const currentPage = refresh ? 0 : page;
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("company_user")
        .select("*, company:company_id(company_name)", { count: "exact" })
        .eq("role", "employee")
        .order("created_at", { ascending: false })
        .order("company_user_sequence_id", { ascending: true });

      // Apply status filter
      if (statusFilter === "deleted") {
        query = query.not("deleted_at", "is", null);
      } else {
        query = query.is("deleted_at", null);
        if (statusFilter === "active") {
          query = query.eq("active_status", "active");
        } else if (statusFilter === "inactive") {
          query = query.eq("active_status", "inactive");
        }
      }

      // Apply search filter
      if (searchQuery && searchQuery.length >= 3) {
        query = query.or(
          `first_name.ilike.%${searchQuery}%,last_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`
        );
      }

      // Apply company filter
      if (selectedCompanyIds.length > 0) {
        query = query.in("company_id", selectedCompanyIds);
      } else if (selectedCompanyId !== "all") {
        query = query.eq("company_id", selectedCompanyId);
      }

      // Apply pagination
      query = query.range(from, to);

      const { data, error, count } = await query;

      if (error) {
        console.error("Error fetching employees:", error);
        return;
      }

      // Check if we have more data
      if (count !== null) {
        setHasMoreData(from + (data?.length || 0) < count);
        setEmployeeCount(count);
        setTotalItems(count);
      } else {
        setHasMoreData(data?.length === PAGE_SIZE);
      }

      if (refresh) {
        setEmployees(data || []);
        setFilteredEmployees(data || []);
      } else {
        setEmployees((prev) => [...prev, ...(data || [])]);
        setFilteredEmployees((prev) => [...prev, ...(data || [])]);
      }
    } catch (error) {
      console.error("Error in fetchEmployees:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  };

  // Fetch all user data
  const fetchAllUsers = async (refresh = false) => {
    try {
      if (refresh) {
        setLoading(true);
        setPage(0);
        setHasMoreData(true);
      }

      if (selectedTab === UserListType.SUPER_ADMIN) {
        await fetchSuperAdmins(refresh);
      } else if (selectedTab === UserListType.COMPANY_ADMIN) {
        await fetchCompanyAdmins(refresh);
      } else if (selectedTab === UserListType.EMPLOYEE) {
        await fetchEmployees(refresh);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchCompanies();
    fetchAllUsers(true);
  }, []);

  // Add load more function
  const loadMoreUsers = () => {
    if (!loading && !loadingMore && hasMoreData) {
      setPage((prevPage) => prevPage + 1);
      fetchAllUsers(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllUsers(true);
  };

  // Filter users based on search query
  useEffect(() => {
    // Only perform client-side filtering if we're not doing a server search
    if (searchQuery.length > 0 && searchQuery.length < 3) {
      const query = searchQuery.toLowerCase();

      // Filter super admins
      const filteredAdmins = superAdmins.filter(
        (admin) =>
          admin.name?.toLowerCase().includes(query) ||
          admin.email.toLowerCase().includes(query) ||
          admin.role?.toLowerCase().includes(query)
      );
      setFilteredSuperAdmins(filteredAdmins);

      // Filter company admins with more comprehensive matching
      const filteredAdmins2 = companyAdmins.filter(
        (admin) =>
          admin.first_name?.toLowerCase().includes(query) ||
          admin.last_name?.toLowerCase().includes(query) ||
          admin.email.toLowerCase().includes(query) ||
          admin.phone_number?.toLowerCase().includes(query) ||
          admin.job_title?.toLowerCase().includes(query) ||
          admin.role?.toLowerCase().includes(query) ||
          (admin as any).company?.company_name?.toLowerCase().includes(query) ||
          // Add fuzzy matching for full name
          `${admin.first_name} ${admin.last_name}`.toLowerCase().includes(query)
      );
      setFilteredCompanyAdmins(filteredAdmins2);

      // Filter employees with more comprehensive matching
      const filteredEmps = employees.filter(
        (emp) =>
          emp.first_name?.toLowerCase().includes(query) ||
          emp.last_name?.toLowerCase().includes(query) ||
          emp.email.toLowerCase().includes(query) ||
          emp.phone_number?.toLowerCase().includes(query) ||
          emp.job_title?.toLowerCase().includes(query) ||
          emp.role?.toLowerCase().includes(query) ||
          (emp as any).company?.company_name?.toLowerCase().includes(query) ||
          // Add fuzzy matching for full name
          `${emp.first_name} ${emp.last_name}`.toLowerCase().includes(query)
      );
      setFilteredEmployees(filteredEmps);
    }
  }, [searchQuery, superAdmins, companyAdmins, employees]);

  // Update useEffect for fetching data when filters change
  useEffect(() => {
    // Reset pagination and fetch new data when filters change
    setPage(0);
    setHasMoreData(true);

    // Only fetch from server if search query is significant (3+ chars) or empty
    if (searchQuery.length === 0 || searchQuery.length >= 3) {
      fetchAllUsers(true);
    }
  }, [
    selectedTab,
    statusFilter,
    selectedCompanyIds,
    selectedCompanyId,
    // Only trigger fetch when search is significant or cleared
    searchQuery.length === 0 || searchQuery.length >= 3 ? searchQuery : null,
  ]);

  // Update the applyFiltersDirect function
  const applyFiltersDirect = async () => {
    setFilterModalVisible(false);
    setPage(0); // Reset page when applying filters
    setHasMoreData(true);
    fetchAllUsers(true);
  };

  // Update handleClearFilters to ensure proper state reset
  const handleClearFilters = () => {
    setFilterModalVisible(false);
    setSelectedCompanyIds([]);
    setSelectedCompanyId("all");
    setStatusFilter("");
    setPage(0);
    setHasMoreData(true);
    fetchAllUsers(true);
  };

  // Update handleClearIndividualFilter to ensure proper refresh
  const handleClearIndividualFilter = async (
    filterType: "status" | "company" | "deleted"
  ) => {
    if (filterType === "deleted" || filterType === "status") {
      setStatusFilter("");
    } else {
      setSelectedCompanyIds([]);
      setSelectedCompanyId("all");
    }
    setPage(0);
    setHasMoreData(true);
    fetchAllUsers(true);
  };

  const getInitials = (name: string, email: string) => {
    if (!name) return email.charAt(0).toUpperCase();

    const nameParts = name.split(" ");
    if (nameParts.length === 1) return nameParts[0].charAt(0).toUpperCase();

    return (
      nameParts[0].charAt(0).toUpperCase() +
      nameParts[nameParts.length - 1].charAt(0).toUpperCase()
    );
  };

  const getCompanyUserInitials = (
    firstName: string,
    lastName: string,
    email: string
  ) => {
    if (!firstName && !lastName) return email.charAt(0).toUpperCase();

    return (
      (firstName ? firstName.charAt(0).toUpperCase() : "") +
      (lastName ? lastName.charAt(0).toUpperCase() : "")
    );
  };

  // Render a gradient avatar with initials
  const renderGradientAvatar = (initials: string, userType: string) => {
    // Different gradient colors based on user type
    let gradientColors: readonly [string, string, ...string[]] = ["", ""]; // Default initialization

    switch (userType) {
      case "super":
        gradientColors = [
          "rgba(6,169,169,255)",
          "rgba(38,127,161,255)",
          "rgba(54,105,157,255)",
          "rgba(74,78,153,255)",
          "rgba(94,52,149,255)",
        ] as const;
        break;
      case "company":
        gradientColors = [
          "rgba(140,82,255,0.9)",
          "rgba(127,90,240,0.9)",
          "rgba(115,98,225,0.9)",
          "rgba(102,106,210,0.9)",
          "rgba(90,114,195,0.9)",
        ] as const;
        break;
      case "employee":
        gradientColors = [
          "rgba(76,175,80,0.9)",
          "rgba(67,160,71,0.9)",
          "rgba(56,142,60,0.9)",
          "rgba(46,125,50,0.9)",
          "rgba(27,94,32,0.9)",
        ] as const;
        break;
      default:
        gradientColors = [
          "rgba(38,127,161,255)",
          "rgba(74,78,153,255)",
        ] as const;
    }

    return (
      <View style={styles.avatarContainer}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.avatarGradient}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </LinearGradient>
      </View>
    );
  };

  const renderSuperAdminItem = ({ item }: { item: Admin }) => (
    <TouchableOpacity
      onPress={() => {
        logDebug("Super Admin selected:", item.id);
        navigation.navigate("SuperAdminDetailsScreen", {
          adminId: item.id,
          adminType: "super",
        });
      }}
      style={styles.cardContainer}
    >
      <Card style={[styles.card]} elevation={0}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.userInfo}>
              {renderGradientAvatar(
                getInitials(item.name || "", item.email),
                "super"
              )}
              <View style={styles.userTextContainer}>
                <View style={styles.userNameContainer}>
                  <Text
                    variant="bold"
                    style={styles.userName}
                    numberOfLines={1}
                  >
                    {item.name || "Unnamed Admin"}
                  </Text>
                  <Text style={styles.sequenceId}>
                    #{item.admin_sequence_id || "-"}
                  </Text>
                </View>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {item.email}
                </Text>
              </View>
            </View>
            <View style={styles.statusContainer}>
              <StatusBadge
                status={
                  item.status === true || item.status === "active"
                    ? UserStatus.ACTIVE
                    : UserStatus.INACTIVE
                }
                size="small"
              />
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderCompanyAdminItem = ({ item }: { item: CompanyUser }) => (
    <TouchableOpacity
      onPress={() => {
        logDebug("Company Admin selected:", item.id);
        navigation.navigate("CompanyAdminDetailsScreen", {
          adminId: item.id,
          adminType: "company",
        });
      }}
      style={styles.cardContainer}
    >
      <Card style={[styles.card]} elevation={0}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.userInfo}>
              {renderGradientAvatar(
                getCompanyUserInitials(
                  item.first_name || "",
                  item.last_name || "",
                  item.email
                ),
                "company"
              )}
              <View style={styles.userTextContainer}>
                <View style={styles.userNameContainer}>
                  <Text
                    variant="bold"
                    style={styles.userName}
                    numberOfLines={1}
                  >
                    {`${item.first_name || ""} ${item.last_name || ""}`.trim() ||
                      "Unnamed Admin"}
                  </Text>
                  <Text style={styles.sequenceId}>
                    #{item.company_user_sequence_id || "-"}
                  </Text>
                </View>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {item.email}
                </Text>
                <View style={styles.badgeContainer}>
                  <View style={styles.companyBadge}>
                    <IconButton
                      icon="domain"
                      size={14}
                      iconColor="#616161"
                      style={styles.companyIcon}
                    />
                    <Text style={styles.companyBadgeText} numberOfLines={1}>
                      {(item as any).company?.company_name || "Unknown Company"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.statusContainer}>
              <StatusBadge
                status={
                  item.active_status === true || item.active_status === "active"
                    ? UserStatus.ACTIVE
                    : UserStatus.INACTIVE
                }
                size="small"
              />
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderEmployeeItem = ({ item }: { item: CompanyUser }) => (
    <TouchableOpacity
      onPress={() => {
        logDebug("Employee selected:", item.id);
        navigation.navigate("EmployeeDetails", {
          employeeId: item.id,
          companyId: item.company_id,
        });
      }}
      style={styles.cardContainer}
    >
      <Card style={[styles.card]} elevation={0}>
        <Card.Content style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.userInfo}>
              {renderGradientAvatar(
                getCompanyUserInitials(
                  item.first_name || "",
                  item.last_name || "",
                  item.email
                ),
                "employee"
              )}
              <View style={styles.userTextContainer}>
                <View style={styles.userNameContainer}>
                  <Text
                    variant="bold"
                    style={styles.userName}
                    numberOfLines={1}
                  >
                    {`${item.first_name || ""} ${item.last_name || ""}`.trim() ||
                      "Unnamed Employee"}
                  </Text>
                  <Text style={styles.sequenceId}>
                    #{item.company_user_sequence_id || "-"}
                  </Text>
                </View>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {item.email}
                </Text>
                <View style={styles.badgeContainer}>
                  <View style={styles.companyBadge}>
                    <IconButton
                      icon="domain"
                      size={14}
                      iconColor="#616161"
                      style={styles.companyIcon}
                    />
                    <Text style={styles.companyBadgeText} numberOfLines={1}>
                      {(item as any).company?.company_name || "Unknown Company"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            <View style={styles.statusContainer}>
              <StatusBadge
                status={
                  item.active_status === true || item.active_status === "active"
                    ? UserStatus.ACTIVE
                    : UserStatus.INACTIVE
                }
                size="small"
              />
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  // Update the renderActiveFilterIndicator function
  const renderActiveFilterIndicator = () => {
    if (!hasActiveFilters()) return null;

    const chipStyle = {
      margin: 4,
      backgroundColor: "rgba(26, 115, 232, 0.1)",
      borderColor: theme.colors.primary,
    };

    return (
      <View style={styles.activeFiltersContainer}>
        <Text style={styles.activeFiltersText}>Active filters:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScrollView}
        >
          {statusFilter && (
            <Chip
              mode="outlined"
              onClose={() => handleClearIndividualFilter("status")}
              style={chipStyle}
              textStyle={{ color: theme.colors.primary }}
            >
              Status:{" "}
              {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}
            </Chip>
          )}

          {(selectedCompanyIds.length > 0 || selectedCompanyId !== "all") && (
            <Chip
              mode="outlined"
              onClose={() => handleClearIndividualFilter("company")}
              style={chipStyle}
              textStyle={{ color: theme.colors.primary }}
            >
              {selectedCompanyIds.length > 0
                ? `${selectedCompanyIds.length} Companies`
                : companies.find((c) => c.id === selectedCompanyId)
                    ?.company_name || "Company"}
            </Chip>
          )}
        </ScrollView>
      </View>
    );
  };

  const renderEmptyState = () => {
    const currentTab = selectedTab;
    let title = "No Users Found";
    let message = "No users match your search criteria.";
    let buttonTitle = "Clear Filters";
    let icon = "account-off";

    // If there are active filters, show filter-specific message
    if (
      statusFilter ||
      selectedCompanyIds.length > 0 ||
      selectedCompanyId !== "all"
    ) {
      title = "No Results Found";
      message = `No ${
        currentTab === UserListType.SUPER_ADMIN
          ? "HDF users"
          : currentTab === UserListType.COMPANY_ADMIN
            ? "company admins"
            : "employees"
      } match your filter criteria.`;
      buttonTitle = "Clear Filters";
      return (
        <EmptyState
          icon={icon}
          title={title}
          message={message}
          buttonTitle={buttonTitle}
          onButtonPress={handleClearFilters}
        />
      );
    }

    // Add search length guidance if search query is short
    if (searchQuery && searchQuery.length < 3) {
      message = "Try typing at least 3 characters for better search results.";
      return (
        <EmptyState
          icon={icon}
          title={title}
          message={message}
          buttonTitle="Clear Search"
          onButtonPress={() => setSearchQuery("")}
        />
      );
    }

    // If there's a search query but no filters
    if (searchQuery) {
      message = `No ${
        currentTab === UserListType.SUPER_ADMIN
          ? "HDF users"
          : currentTab === UserListType.COMPANY_ADMIN
            ? "company admins"
            : "employees"
      } match your search term "${searchQuery}".`;
      buttonTitle = "Clear Search";
      return (
        <EmptyState
          icon={icon}
          title={title}
          message={message}
          buttonTitle={buttonTitle}
          onButtonPress={() => setSearchQuery("")}
        />
      );
    }

    // Default empty states for each tab when no data exists
    if (currentTab === UserListType.SUPER_ADMIN) {
      title = "No HDF Users Found";
      message = "You haven't added any HDF users yet.";
      buttonTitle = "Add HDF User";
      icon = "shield-account-outline";
    } else if (currentTab === UserListType.COMPANY_ADMIN) {
      title = "No Company Admins Found";
      message = "You haven't added any company admins yet.";
      buttonTitle = "Add Company Admin";
      icon = "office-building-outline";
    } else {
      title = "No Employees Found";
      message = "No employees have been added to the system yet.";
      buttonTitle = "View Companies";
      icon = "account-group-outline";
    }

    return (
      <EmptyState
        icon={icon}
        title={title}
        message={message}
        buttonTitle={buttonTitle}
        onButtonPress={() => {
          if (searchQuery || hasActiveFilters()) {
            handleClearFilters();
          } else if (currentTab === UserListType.SUPER_ADMIN) {
            navigation.navigate("CreateSuperAdmin");
          } else if (currentTab === UserListType.COMPANY_ADMIN) {
            navigation.navigate("CreateCompanyAdmin");
          } else {
            navigation.navigate("Companies");
          }
        }}
      />
    );
  };

  // Add table header components
  const SuperAdminTableHeader = () => (
    <View style={styles.tableHeader}>
      <View style={[styles.tableHeaderCell, { flex: 0.6 }]}>
        <Text variant="medium" style={styles.tableHeaderText}>
          ID
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          Name
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          Email
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          Role
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          Created Date
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          Status
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          Actions
        </Text>
      </View>
    </View>
  );

  const CompanyAdminTableHeader = () => (
    <View style={styles.tableHeader}>
      <View style={[styles.tableHeaderCell, { flex: 0.6 }]}>
        <Text variant="medium" style={styles.tableHeaderText}>
          Admin ID
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          Name
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          Email
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          Company
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          Created Date
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          Status
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          Actions
        </Text>
      </View>
    </View>
  );

  const EmployeeTableHeader = () => (
    <View style={styles.tableHeader}>
      <View style={[styles.tableHeaderCell, { flex: 0.6 }]}>
        <Text variant="medium" style={styles.tableHeaderText}>
          Employee ID
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          Name
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          Email
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          Company
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          Job Title
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          Status
        </Text>
      </View>
      <View style={styles.tableHeaderCell}>
        <Text variant="medium" style={styles.tableHeaderText}>
          Actions
        </Text>
      </View>
    </View>
  );

  // Add table row components
  const SuperAdminTableRow = ({ item }: { item: Admin }) => (
    <Pressable
      onPress={() => {
        navigation.navigate("SuperAdminDetailsScreen", {
          adminId: item.id,
          adminType: "super",
        });
      }}
      style={({ pressed }: PressableStateCallbackType) => [
        styles.tableRow,
        pressed && { backgroundColor: "#f8fafc" },
      ]}
    >
      <View style={[styles.tableCell, { flex: 0.6 }]}>
        <TouchableOpacity
          onPress={() => {
            navigation.navigate("SuperAdminDetailsScreen", {
              adminId: item.id,
              adminType: "super",
            });
          }}
        >
          <Text style={styles.receiptIdLink}>
            {item.admin_sequence_id || "-"}
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.tableCell}>
        <TooltipText text={item.name || "Unnamed Admin"} styles={styles} />
      </View>
      <View style={styles.tableCell}>
        <TooltipText text={item.email} styles={styles} />
      </View>
      <View style={styles.tableCell}>
        <Text style={styles.tableCellText}>Super Admin</Text>
      </View>
      <View style={styles.tableCell}>
        <Text style={styles.tableCellText}>
          {formatDate(item.created_at || "", { type: "long" })}
        </Text>
      </View>
      <View style={styles.tableCell}>
        <StatusBadge
          status={
            item.status === true || item.status === "active"
              ? UserStatus.ACTIVE
              : UserStatus.INACTIVE
          }
          size="small"
        />
      </View>
      <View style={styles.actionCell}>
        <IconButton
          icon="pencil"
          size={20}
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate("EditSuperAdmin", { adminId: item.id });
          }}
          style={styles.actionIcon}
        />
        <IconButton
          icon="eye"
          size={20}
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate("SuperAdminDetailsScreen", {
              adminId: item.id,
              adminType: "super",
            });
          }}
          style={styles.actionIcon}
        />
      </View>
    </Pressable>
  );

  const CompanyAdminTableRow = ({ item }: { item: CompanyUser }) => (
    <Pressable
      onPress={() => {
        navigation.navigate("CompanyAdminDetailsScreen", {
          adminId: item.id,
          adminType: "company",
        });
      }}
      style={({ pressed }: PressableStateCallbackType) => [
        styles.tableRow,
        pressed && { backgroundColor: "#f8fafc" },
      ]}
    >
      <View style={[styles.tableCell, { flex: 0.6 }]}>
        <Text style={styles.receiptIdLink}>
          {item.company_user_sequence_id || "-"}
        </Text>
      </View>
      <View style={styles.tableCell}>
        <TooltipText
          text={
            `${item.first_name || ""} ${item.last_name || ""}`.trim() ||
            "Unnamed Admin"
          }
          styles={styles}
        />
      </View>
      <View style={styles.tableCell}>
        <TooltipText text={item.email} styles={styles} />
      </View>
      <View style={styles.tableCell}>
        <TooltipText
          text={(item as any).company?.company_name || "Unknown Company"}
          styles={styles}
        />
      </View>
      <View style={styles.tableCell}>
        <Text style={styles.tableCellText}>
          {formatDate(item.created_at || "", { type: "long" })}
        </Text>
      </View>
      <View style={styles.tableCell}>
        <StatusBadge
          status={
            item.active_status === true || item.active_status === "active"
              ? UserStatus.ACTIVE
              : UserStatus.INACTIVE
          }
          size="small"
        />
      </View>
      <View style={styles.actionCell}>
        <IconButton
          icon="pencil"
          size={20}
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate("EditCompanyAdmin", { adminId: item.id });
          }}
          style={styles.actionIcon}
        />
        <IconButton
          icon="eye"
          size={20}
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate("CompanyAdminDetailsScreen", {
              adminId: item.id,
              adminType: "company",
            });
          }}
          style={styles.actionIcon}
        />
      </View>
    </Pressable>
  );

  const EmployeeTableRow = ({ item }: { item: CompanyUser }) => (
    <Pressable
      onPress={() => {
        navigation.navigate("EmployeeDetails", {
          employeeId: item.id,
          companyId: item.company_id,
        });
      }}
      style={({ pressed }: PressableStateCallbackType) => [
        styles.tableRow,
        pressed && { backgroundColor: "#f8fafc" },
      ]}
    >
      <View style={[styles.tableCell, { flex: 0.6 }]}>
        <Text style={styles.receiptIdLink}>
          {item.company_user_sequence_id || "-"}
        </Text>
      </View>
      <View style={styles.tableCell}>
        <TooltipText
          text={
            `${item.first_name || ""} ${item.last_name || ""}`.trim() ||
            "Unnamed Employee"
          }
          styles={styles}
        />
      </View>
      <View style={styles.tableCell}>
        <TooltipText text={item.email} styles={styles} />
      </View>
      <View style={styles.tableCell}>
        <TooltipText
          text={(item as any).company?.company_name || "Unknown Company"}
          styles={styles}
        />
      </View>
      <View style={styles.tableCell}>
        <TooltipText text={item.job_title || "-"} styles={styles} />
      </View>
      <View style={styles.tableCell}>
        <StatusBadge
          status={
            item.active_status === true || item.active_status === "active"
              ? UserStatus.ACTIVE
              : UserStatus.INACTIVE
          }
          size="small"
        />
      </View>
      <View style={styles.actionCell}>
        <IconButton
          icon="eye"
          size={20}
          onPress={(e) => {
            e.stopPropagation();
            navigation.navigate("EmployeeDetails", {
              employeeId: item.id,
              companyId: item.company_id,
            });
          }}
          style={styles.actionIcon}
        />
      </View>
    </Pressable>
  );
  const windowWidth = Dimensions.get("window").width;
  const isLargeScreen = windowWidth >= 1440;
  const isMediumScreen = windowWidth >= 768 && windowWidth < 1440;
  const useTableLayout = isLargeScreen || isMediumScreen;

  // Add loading footer component
  const LoadingFooter = () => {
    const currentListLength =
      selectedTab === UserListType.SUPER_ADMIN
        ? filteredSuperAdmins.length
        : selectedTab === UserListType.COMPANY_ADMIN
          ? filteredCompanyAdmins.length
          : filteredEmployees.length;

    return (
      <View style={{ padding: 16, alignItems: "center" }}>
        {loadingMore && hasMoreData && (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        )}
        {!hasMoreData && currentListLength > 0 && (
          <Text
            style={{
              fontSize: 14,
              color: "#616161",
              fontFamily: "Poppins-Regular",
            }}
          >
            No more users to load
          </Text>
        )}
      </View>
    );
  };

  // Render total count component
  const renderTotalCount = () => (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        marginLeft: 5,
        paddingTop: 16,
        marginBottom: 8,
      }}
    >
      <Text
        style={{
          fontSize: 14,
          color: "#666",
          fontFamily: "Poppins-Regular",
        }}
      >
        Total:
      </Text>
      <Text
        style={{
          fontSize: 14,
          color: theme.colors.primary,
          fontFamily: "Poppins-Medium",
          marginLeft: 4,
        }}
      >
        {selectedTab === UserListType.SUPER_ADMIN
          ? superAdminCount
          : selectedTab === UserListType.COMPANY_ADMIN
            ? companyAdminCount
            : employeeCount}
      </Text>
    </View>
  );

  // Update the renderCurrentList function
  const renderCurrentList = () => {
    if (loading && !refreshing) {
      return (
        <FlashList
          estimatedItemSize={80}
          data={Array(6)
            .fill(null)
            .map((_, index) => ({ id: `skeleton-${index}` }))}
          renderItem={() => (
            <View style={styles.cardContainer}>
              <Card style={[styles.card]} elevation={0}>
                <Card.Content style={styles.cardContent}>
                  <View style={styles.cardHeader}>
                    <View style={styles.userInfo}>
                      <Shimmer
                        width={40}
                        height={40}
                        style={{ borderRadius: 20 }}
                      />
                      <View style={styles.userTextContainer}>
                        <Shimmer
                          width={150}
                          height={20}
                          style={{ marginBottom: 4 }}
                        />
                        <Shimmer width={120} height={16} />
                      </View>
                    </View>
                    <View style={styles.statusContainer}>
                      <Shimmer
                        width={80}
                        height={24}
                        style={{ borderRadius: 12 }}
                      />
                    </View>
                  </View>
                </Card.Content>
              </Card>
            </View>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      );
    }

    switch (selectedTab) {
      case UserListType.SUPER_ADMIN:
        if (filteredSuperAdmins.length === 0) {
          return renderEmptyState();
        }
        return (
          <>
            {useTableLayout ? (
              <View style={styles.tableContainer}>
                <SuperAdminTableHeader />
                <FlashList
                  estimatedItemSize={60}
                  data={filteredSuperAdmins}
                  renderItem={({ item }) => <SuperAdminTableRow item={item} />}
                  keyExtractor={(item) => `super-${item.id}`}
                  contentContainerStyle={styles.tableContent}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={onRefresh}
                    />
                  }
                  onEndReached={loadMoreUsers}
                  onEndReachedThreshold={0.5}
                  ListFooterComponent={LoadingFooter}
                  extraData={[refreshing, loadingMore]}
                  drawDistance={200}
                />
              </View>
            ) : (
              <FlashList
                estimatedItemSize={80}
                data={filteredSuperAdmins}
                renderItem={renderSuperAdminItem}
                keyExtractor={(item) => `super-${item.id}`}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                  />
                }
                onEndReached={loadMoreUsers}
                onEndReachedThreshold={0.5}
                ListFooterComponent={LoadingFooter}
                extraData={[refreshing, loadingMore]}
                drawDistance={200}
              />
            )}
          </>
        );

      case UserListType.COMPANY_ADMIN:
        if (filteredCompanyAdmins.length === 0) {
          return renderEmptyState();
        }
        return (
          <>
            {useTableLayout ? (
              <View style={styles.tableContainer}>
                <CompanyAdminTableHeader />
                <FlashList
                  estimatedItemSize={60}
                  data={filteredCompanyAdmins}
                  renderItem={({ item }) => (
                    <CompanyAdminTableRow item={item} />
                  )}
                  keyExtractor={(item) => `admin-${item.id}`}
                  contentContainerStyle={styles.tableContent}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={onRefresh}
                    />
                  }
                  onEndReached={loadMoreUsers}
                  onEndReachedThreshold={0.5}
                  ListFooterComponent={LoadingFooter}
                  extraData={[refreshing, loadingMore]}
                  drawDistance={200}
                />
              </View>
            ) : (
              <FlashList
                estimatedItemSize={80}
                data={filteredCompanyAdmins}
                renderItem={renderCompanyAdminItem}
                keyExtractor={(item) => `admin-${item.id}`}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                  />
                }
                onEndReached={loadMoreUsers}
                onEndReachedThreshold={0.5}
                ListFooterComponent={LoadingFooter}
                extraData={[refreshing, loadingMore]}
                drawDistance={200}
              />
            )}
          </>
        );

      case UserListType.EMPLOYEE:
        if (filteredEmployees.length === 0) {
          return renderEmptyState();
        }
        return (
          <>
            {useTableLayout ? (
              <View style={styles.tableContainer}>
                <EmployeeTableHeader />
                <FlashList
                  estimatedItemSize={60}
                  data={filteredEmployees}
                  renderItem={({ item }) => <EmployeeTableRow item={item} />}
                  keyExtractor={(item) => `emp-${item.id}`}
                  contentContainerStyle={styles.tableContent}
                  refreshControl={
                    <RefreshControl
                      refreshing={refreshing}
                      onRefresh={onRefresh}
                    />
                  }
                  onEndReached={loadMoreUsers}
                  onEndReachedThreshold={0.5}
                  ListFooterComponent={LoadingFooter}
                  extraData={[refreshing, loadingMore]}
                  drawDistance={200}
                />
              </View>
            ) : (
              <FlashList
                estimatedItemSize={80}
                data={filteredEmployees}
                renderItem={renderEmployeeItem}
                keyExtractor={(item) => `emp-${item.id}`}
                contentContainerStyle={styles.listContent}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={onRefresh}
                  />
                }
                onEndReached={loadMoreUsers}
                onEndReachedThreshold={0.5}
                ListFooterComponent={LoadingFooter}
                extraData={[refreshing, loadingMore]}
                drawDistance={200}
              />
            )}
          </>
        );

      default:
        return null;
    }
  };

  // Filter modal component
  const renderFilterModal = () => {
    const statusOptions = [
      { label: "All Status", value: "" },
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
      { label: "Deleted", value: "deleted" },
    ];

    return (
      <FilterModal
        visible={filterModalVisible}
        onDismiss={() => setFilterModalVisible(false)}
        title="Filter Options"
        onClear={handleClearFilters}
        onApply={applyFiltersDirect}
        isLargeScreen={isLargeScreen}
        isMediumScreen={isMediumScreen}
      >
        <FilterSection title="Status">
          <PillFilterGroup
            options={statusOptions}
            value={statusFilter}
            onValueChange={(value: string) => {
              setStatusFilter(value);
              // No need to call applyFiltersDirect here as it will be handled by useEffect
            }}
          />
        </FilterSection>

        {/* {selectedTab !== UserListType.SUPER_ADMIN && (
          <>
            <FilterDivider />
            <FilterSection title="Companies">
              <View style={styles.dropdownContainer}>
                <TouchableOpacity
                  ref={dropdownRef}
                  style={[
                    styles.dropdownButton,
                    (selectedCompanyIds.length > 0 ||
                      selectedCompanyId !== "all") &&
                      styles.activeDropdownButton,
                  ]}
                  onPress={showMenu}
                >
                  <View style={styles.dropdownContent}>
                    <IconButton
                      icon="office-building"
                      size={20}
                      iconColor={
                        selectedCompanyIds.length > 0 ||
                        selectedCompanyId !== "all"
                          ? theme.colors.primary
                          : "#757575"
                      }
                      style={styles.dropdownLeadingIcon}
                    />
                    <Text
                      style={[
                        styles.dropdownButtonText,
                        (selectedCompanyIds.length > 0 ||
                          selectedCompanyId !== "all") && {
                          color: theme.colors.primary,
                        },
                      ]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {getSelectedCompaniesText()}
                    </Text>
                  </View>
                  <IconButton
                    icon="chevron-down"
                    size={20}
                    style={styles.dropdownIcon}
                    iconColor={
                      selectedCompanyIds.length > 0 ||
                      selectedCompanyId !== "all"
                        ? theme.colors.primary
                        : "#757575"
                    }
                  />
                </TouchableOpacity>
              </View>
            </FilterSection>
          </>
        )} */}
      </FilterModal>
    );
  };

  // Toggle company selection
  const toggleCompanySelection = (companyId: string) => {
    setSelectedCompanyIds((prev) => {
      if (prev.includes(companyId)) {
        return prev.filter((id) => id !== companyId);
      } else {
        return [...prev, companyId];
      }
    });
    // Reset the single company selection mode
    setSelectedCompanyId("all");
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return (
      selectedCompanyIds.length > 0 ||
      selectedCompanyId !== "all" ||
      statusFilter !== ""
    );
  };

  // Get display text for selected user type
  const getUserTypeDisplayText = () => {
    switch (selectedTab) {
      case UserListType.SUPER_ADMIN:
        return "Admins";
      case UserListType.COMPANY_ADMIN:
        return "Company Admins";
      case UserListType.EMPLOYEE:
        return "Employees";
      default:
        return "Select User Type";
    }
  };

  // Enhanced dropdown menu show/hide with animations
  const showUserTypeMenu = () => {
    if (userTypeDropdownRef.current) {
      // @ts-ignore - Getting layout measurements
      userTypeDropdownRef.current.measure(
        (
          x: number,
          y: number,
          width: number,
          height: number,
          pageX: number,
          pageY: number
        ) => {
          setUserTypeMenuPosition({ x: pageX, y: pageY + height });

          // Start animations
          Animated.parallel([
            Animated.timing(dropdownAnimation, {
              toValue: 1,
              duration: 250,
              useNativeDriver: true,
            }),
            Animated.timing(rotateAnimation, {
              toValue: 1,
              duration: 250,
              useNativeDriver: true,
            }),
          ]).start();

          setUserTypeMenuVisible(true);
        }
      );
    }
  };

  // Render the dropdown menu
  const renderUserTypeMenu = () => {
    if (!userTypeMenuVisible) return null;

    return (
      <Portal>
        <TouchableWithoutFeedback onPress={hideUserTypeMenu}>
          <View style={styles.menuBackdrop} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.enhancedMenuContainer,
            {
              position: "absolute",
              top: userTypeMenuPosition.y + 5,
              left: userTypeMenuPosition.x,
              right: 16,
              opacity: opacityInterpolate,
              transform: [{ scale: scaleInterpolate }],
            },
          ]}
        >
          <View style={styles.userTypeMenuHeader}>
            <Text style={styles.userTypeMenuTitle}>Select User Type</Text>
          </View>

          {/* Super Admin Option */}
          <TouchableOpacity
            style={[
              styles.enhancedMenuItem,
              selectedTab === UserListType.SUPER_ADMIN &&
                styles.selectedMenuItem,
            ]}
            onPress={() => {
              setSelectedTab(UserListType.SUPER_ADMIN);
              hideUserTypeMenu();
              setSelectedCompanyIds([]);
              setSelectedCompanyId("all");
              if (searchQuery) setSearchQuery("");
            }}
          >
            <View
              style={[
                styles.menuIconContainer,
                { backgroundColor: "rgba(54,105,157,0.1)" },
              ]}
            >
              <IconButton
                icon="shield-account"
                size={22}
                iconColor="rgba(54,105,157,255)"
                style={styles.menuIcon}
              />
            </View>
            <View style={styles.menuItemContent}>
              <Text
                style={[
                  styles.menuItemTitleText,
                  selectedTab === UserListType.SUPER_ADMIN &&
                    styles.menuItemSelected,
                ]}
              >
                Admins
              </Text>
              <Text style={styles.menuItemDescription}>
                Super administrators with full access
              </Text>
            </View>
            {selectedTab === UserListType.SUPER_ADMIN && (
              <View style={styles.checkIconContainer}>
                <IconButton
                  icon="check"
                  size={18}
                  iconColor="rgba(54,105,157,255)"
                />
              </View>
            )}
          </TouchableOpacity>

          {/* Company Admin Option */}
          <TouchableOpacity
            style={[
              styles.enhancedMenuItem,
              selectedTab === UserListType.COMPANY_ADMIN &&
                styles.selectedMenuItem,
            ]}
            onPress={() => {
              setSelectedTab(UserListType.COMPANY_ADMIN);
              hideUserTypeMenu();
              if (searchQuery) setSearchQuery("");
            }}
          >
            <View
              style={[
                styles.menuIconContainer,
                { backgroundColor: "rgba(115,98,225,0.1)" },
              ]}
            >
              <IconButton
                icon="office-building"
                size={22}
                iconColor="rgba(115,98,225,0.9)"
                style={styles.menuIcon}
              />
            </View>
            <View style={styles.menuItemContent}>
              <Text
                style={[
                  styles.menuItemTitleText,
                  selectedTab === UserListType.COMPANY_ADMIN &&
                    styles.menuItemSelected,
                ]}
              >
                Company Admins
              </Text>
              <Text style={styles.menuItemDescription}>
                Manage company-specific settings and users
              </Text>
            </View>
            {selectedTab === UserListType.COMPANY_ADMIN && (
              <View style={styles.checkIconContainer}>
                <IconButton
                  icon="check"
                  size={18}
                  iconColor="rgba(115,98,225,0.9)"
                />
              </View>
            )}
          </TouchableOpacity>

          {/* Employee Option */}
          <TouchableOpacity
            style={[
              styles.enhancedMenuItem,
              { borderBottomWidth: 0, paddingBottom: 5 },
              selectedTab === UserListType.EMPLOYEE && styles.selectedMenuItem,
            ]}
            onPress={() => {
              setSelectedTab(UserListType.EMPLOYEE);
              hideUserTypeMenu();
              if (searchQuery) setSearchQuery("");
            }}
          >
            <View
              style={[
                styles.menuIconContainer,
                { backgroundColor: "rgba(56,142,60,0.1)" },
              ]}
            >
              <IconButton
                icon="account-group"
                size={22}
                iconColor="rgba(56,142,60,0.9)"
                style={styles.menuIcon}
              />
            </View>
            <View style={styles.menuItemContent}>
              <Text
                style={[
                  styles.menuItemTitleText,
                  selectedTab === UserListType.EMPLOYEE &&
                    styles.menuItemSelected,
                ]}
              >
                Employees
              </Text>
              <Text style={styles.menuItemDescription}>
                Regular users within companies
              </Text>
            </View>
            {selectedTab === UserListType.EMPLOYEE && (
              <View style={styles.checkIconContainer}>
                <IconButton
                  icon="check"
                  size={18}
                  iconColor="rgba(56,142,60,0.9)"
                />
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>
      </Portal>
    );
  };

  const hideUserTypeMenu = () => {
    Animated.parallel([
      Animated.timing(dropdownAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setUserTypeMenuVisible(false);
    });
  };

  // Get the rotation for the dropdown icon
  const rotateInterpolate = rotateAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });

  // Get the scale animation for the dropdown menu
  const scaleInterpolate = dropdownAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1],
  });

  // Get the opacity animation for the dropdown menu
  const opacityInterpolate = dropdownAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Get icon and color based on user type
  const getUserTypeIcon = () => {
    switch (selectedTab) {
      case UserListType.SUPER_ADMIN:
        return {
          icon: "shield-account",
          color: "rgba(54,105,157,255)",
          background: "rgba(54,105,157,0.1)",
        };
      case UserListType.COMPANY_ADMIN:
        return {
          icon: "office-building",
          color: "rgba(115,98,225,0.9)",
          background: "rgba(115,98,225,0.1)",
        };
      case UserListType.EMPLOYEE:
        return {
          icon: "account-group",
          color: "rgba(56,142,60,0.9)",
          background: "rgba(56,142,60,0.1)",
        };
      default:
        return {
          icon: "account",
          color: theme.colors.primary,
          background: `${theme.colors.primary}15`,
        };
    }
  };

  // Enhanced dropdown with better styling
  const renderEnhancedDropdown = () => {
    const userTypeInfo = getUserTypeIcon();

    return (
      <View style={styles.userTypeDropdownContainer}>
        <TouchableOpacity
          ref={userTypeDropdownRef}
          style={[
            styles.userTypeDropdown,
            { borderColor: userTypeInfo.color + "50" },
          ]}
          onPress={showUserTypeMenu}
          activeOpacity={0.7}
        >
          <View style={styles.userTypeDropdownContent}>
            <View style={[styles.iconContainer]}>
              <IconButton
                icon={userTypeInfo.icon}
                size={22}
                iconColor={userTypeInfo.color}
                style={styles.dropdownLeadingIcon}
              />
            </View>
            <Text
              style={[styles.userTypeDropdownText, { color: "#333333" }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {getUserTypeDisplayText()}
            </Text>
          </View>

          <Animated.View
            style={{
              transform: [{ rotate: rotateInterpolate }],
            }}
          >
            <IconButton
              icon="chevron-down"
              size={24}
              style={styles.dropdownIcon}
              iconColor={"#666666"}
            />
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  };

  // Add these lines
  const dropdownRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  // Add the showMenu function
  const showMenu = () => {
    if (dropdownRef.current) {
      // @ts-ignore - Getting layout measurements
      dropdownRef.current.measure((x, y, width, height, pageX, pageY) => {
        setMenuPosition({ x: pageX, y: pageY + height });
        setMenuVisible(true);
      });
    }
  };

  // Add the getSelectedCompaniesText function
  const getSelectedCompaniesText = () => {
    if (selectedCompanyIds.length > 0) {
      if (selectedCompanyIds.length === 1) {
        const company = companies.find((c) => c.id === selectedCompanyIds[0]);
        return company?.company_name || "1 Company";
      }
      return `${selectedCompanyIds.length} Companies`;
    } else if (selectedCompanyId !== "all") {
      const company = companies.find((c) => c.id === selectedCompanyId);
      return company?.company_name || "Select Company";
    }
    return "All Companies";
  };

  return (
    <SafeAreaView style={[styles.container]}>
      <AppHeader
        title="All Users"
        showBackButton={true}
        showHelpButton={true}
        showLogo={false}
        subtitle="Manage all system users"
      />
      <View
        style={[
          styles.searchContainer,
          {
            maxWidth: isLargeScreen ? 1500 : isMediumScreen ? 900 : "100%",
            alignSelf: "center",
            width: "100%",
          },
        ]}
      >
        <View style={styles.searchBarContainer}>
          <Searchbar
            placeholder="Search users..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
            theme={{ colors: { primary: theme.colors.primary } }}
            loading={refreshing && searchQuery.length > 0}
            clearIcon={() =>
              searchQuery ? (
                <IconButton
                  icon="close-circle"
                  size={18}
                  onPress={() => setSearchQuery("")}
                />
              ) : null
            }
            icon="magnify"
          />
          <View style={styles.filterButtonContainer}>
            <IconButton
              icon="filter-variant"
              size={24}
              style={[
                styles.filterButton,
                hasActiveFilters() && styles.activeFilterButton,
              ]}
              iconColor={hasActiveFilters() ? theme.colors.primary : undefined}
              onPress={() => setFilterModalVisible(true)}
            />
            {hasActiveFilters() && <View style={styles.filterBadge} />}
          </View>
        </View>

        <FAB
          icon="plus"
          style={[
            styles.fab,
            {
              backgroundColor: theme.colors.primary,
              position: "relative",
              margin: 0,
              marginLeft: 16,
              elevation: 0,
              shadowColor: "transparent",
            },
          ]}
          onPress={() => {
            if (selectedTab === UserListType.SUPER_ADMIN) {
              navigation.navigate("CreateSuperAdmin");
            } else if (selectedTab === UserListType.COMPANY_ADMIN) {
              navigation.navigate("CreateCompanyAdmin");
            } else {
              navigation.navigate("CreateEmployee");
            }
          }}
          color={theme.colors.surface}
        />
      </View>

      {searchQuery && searchQuery.length > 0 && searchQuery.length < 3 && (
        <View style={styles.searchTips}>
          <Text style={styles.searchTipsText}>
            Type at least 3 characters for better search results.
          </Text>
        </View>
      )}

      <View
        style={[
          styles.contentContainer,
          {
            maxWidth: isLargeScreen ? 1500 : isMediumScreen ? 900 : "100%",
            alignSelf: "center",
            width: "100%",
            flex: 1,
          },
        ]}
      >
        {renderActiveFilterIndicator()}
        <View style={styles.tabsContainer}>
          <View style={styles.tabsWrapper}>
            <TouchableOpacity
              style={[
                styles.tab,
                selectedTab === UserListType.SUPER_ADMIN && {
                  borderColor: theme.colors.primary,
                  borderWidth: 1,
                },
              ]}
              onPress={() => {
                setSelectedTab(UserListType.SUPER_ADMIN);
                setSelectedCompanyIds([]);
                setSelectedCompanyId("all");
                if (searchQuery) setSearchQuery("");
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === UserListType.SUPER_ADMIN && {
                    color: theme.colors.primary,
                  },
                ]}
              >
                HDF Users
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                selectedTab === UserListType.COMPANY_ADMIN && {
                  borderColor: theme.colors.primary,
                  borderWidth: 0.5,
                },
              ]}
              onPress={() => {
                setSelectedTab(UserListType.COMPANY_ADMIN);
                if (searchQuery) setSearchQuery("");
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === UserListType.COMPANY_ADMIN && {
                    color: theme.colors.primary,
                  },
                ]}
              >
                Admins
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                selectedTab === UserListType.EMPLOYEE && {
                  borderColor: theme.colors.primary,
                  borderWidth: 0.5,
                },
              ]}
              onPress={() => {
                setSelectedTab(UserListType.EMPLOYEE);
                if (searchQuery) setSearchQuery("");
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  selectedTab === UserListType.EMPLOYEE && {
                    color: theme.colors.primary,
                  },
                ]}
              >
                Employees
              </Text>
            </TouchableOpacity>
            {renderTotalCount()}
          </View>
        </View>
        <View style={styles.listContainer}>{renderCurrentList()}</View>
      </View>

      {renderUserTypeMenu()}

      {renderFilterModal()}

      {searchQuery && searchQuery.length > 0 && (
        <View style={styles.searchResultsContainer}>
          <Text style={styles.searchResultsText}>
            Found:{" "}
            {selectedTab === UserListType.SUPER_ADMIN
              ? `${filteredSuperAdmins.length} super admins`
              : selectedTab === UserListType.COMPANY_ADMIN
                ? `${filteredCompanyAdmins.length} company admins`
                : `${filteredEmployees.length} employees`}
          </Text>
        </View>
      )}

      <Menu
        visible={menuVisible}
        onDismiss={() => setMenuVisible(false)}
        anchor={menuPosition}
        contentStyle={{
          borderRadius: 12,
          width: 300,
          marginTop: 4,
          elevation: 4,
          backgroundColor: "#FFFFFF",
          borderWidth: 1,
          borderColor: "#E0E0E0",
        }}
      >
        <View style={styles.menuHeader}>
          <Text style={styles.menuTitle}>Select Companies</Text>
          {selectedCompanyIds.length > 0 && (
            <Text style={styles.menuSubtitle}>
              {selectedCompanyIds.length} selected
            </Text>
          )}
        </View>
        <Divider />
        <ScrollView style={{ maxHeight: 400 }}>
          <Menu.Item
            title="All Companies"
            onPress={() => {
              setSelectedCompanyIds([]);
              setSelectedCompanyId("all");
              setMenuVisible(false);
              applyFiltersDirect();
            }}
            style={styles.menuItemStyle}
            titleStyle={[
              styles.menuItemText,
              selectedCompanyId === "all" &&
                selectedCompanyIds.length === 0 &&
                styles.menuItemSelected,
            ]}
            leadingIcon="earth"
            trailingIcon={
              selectedCompanyId === "all" && selectedCompanyIds.length === 0
                ? "check"
                : undefined
            }
          />
          <Divider />
          {companies.map((company) => (
            <Menu.Item
              key={company.id}
              title={company.company_name}
              onPress={() => {
                toggleCompanySelection(company.id);
                setMenuVisible(false);
                applyFiltersDirect();
              }}
              style={styles.menuItemStyle}
              titleStyle={[
                styles.menuItemText,
                (selectedCompanyIds.includes(company.id) ||
                  selectedCompanyId === company.id) &&
                  styles.menuItemSelected,
              ]}
              leadingIcon="office-building"
              trailingIcon={
                selectedCompanyIds.includes(company.id) ||
                selectedCompanyId === company.id
                  ? "check"
                  : undefined
              }
            />
          ))}
        </ScrollView>
      </Menu>
    </SafeAreaView>
  );
};

export default SuperAdminUsersScreen;
