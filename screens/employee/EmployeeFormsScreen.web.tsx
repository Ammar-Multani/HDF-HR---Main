import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Platform,
  Dimensions,
  ActivityIndicator,
  Pressable,
  PressableStateCallbackType,
} from "react-native";
import {
  Text,
  Card,
  Searchbar,
  useTheme,
  Chip,
  Divider,
  FAB,
  IconButton,
  Surface,
  Portal,
  Modal,
  RadioButton,
  Menu,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import { format } from "date-fns";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../contexts/AuthContext";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import EmptyState from "../../components/EmptyState";
import StatusBadge from "../../components/StatusBadge";
import { FormStatus } from "../../types";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import FilterModal from "../../components/FilterModal";
import {
  FilterSection,
  RadioFilterGroup,
  FilterDivider,
} from "../../components/FilterSections";

interface FormSubmission {
  id: string;
  type: "accident" | "illness" | "departure";
  title: string;
  status: FormStatus;
  submission_date: string;
}

// Add Shimmer component for loading states
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

// Add FormItemSkeleton component
const FormItemSkeleton = () => {
  return (
    <Surface style={[styles.cardSurface, { backgroundColor: "#FFFFFF" }]}>
      <View style={styles.cardTouchable}>
        <View style={styles.cardHeader}>
          <View style={styles.titleContainer}>
            <Shimmer width={180} height={20} style={{ marginBottom: 8 }} />
          </View>
          <Shimmer width={80} height={24} style={{ borderRadius: 12 }} />
        </View>

        <View style={[styles.cardDetails, { borderLeftColor: "#E0E0E0" }]}>
          <View style={styles.detailItem}>
            <Shimmer width={100} height={14} style={{ marginRight: 8 }} />
            <Shimmer width={150} height={14} />
          </View>
          <View style={styles.detailItem}>
            <Shimmer width={80} height={14} style={{ marginRight: 8 }} />
            <Shimmer width={120} height={14} />
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.viewDetailsContainer}>
            <Shimmer width={100} height={14} style={{ marginRight: 8 }} />
            <Shimmer width={24} height={24} style={{ borderRadius: 12 }} />
          </View>
        </View>
      </View>
    </Surface>
  );
};

const getFormTypeColor = (type: string) => {
  switch (type) {
    case "accident":
      return "#F44336"; // Red for accident reports
    case "illness":
      return "#FF9800"; // Orange for illness reports
    case "departure":
      return "#2196F3"; // Blue for departure reports
    default:
      return "#9C27B0"; // Purple for unknown types
  }
};

const getFormTypeIcon = (type: string) => {
  switch (type) {
    case "accident":
      return "alert-circle"; // Icon for accident reports
    case "illness":
      return "medical-bag"; // Icon for illness reports
    case "departure":
      return "account-arrow-right"; // Icon for departure reports
    default:
      return "file-document";
  }
};

// Update RootStackParamList to include all possible routes
type RootStackParamList = {
  FormDetails: {
    formId: string;
    formType: string;
  };
  CreateAccidentReport: undefined;
  CreateIllnessReport: undefined;
  CreateStaffDeparture: undefined;
  Help: undefined;
};

// Define navigation prop type
type FormNavigationProp = NavigationProp<RootStackParamList>;

// Add TableHeader component
const TableHeader = () => (
  <View style={styles.tableHeader}>
    <View style={styles.tableHeaderCell}>
      <Text style={styles.tableHeaderText}>Form Type</Text>
    </View>
    <View style={styles.tableHeaderCell}>
      <Text style={styles.tableHeaderText}>Submitted Date</Text>
    </View>
    <View style={styles.tableHeaderCell}>
      <Text style={styles.tableHeaderText}>Status</Text>
    </View>
    <View style={styles.tableHeaderCell}>
      <Text style={styles.tableHeaderText}>Actions</Text>
    </View>
  </View>
);

// Add TableRow component
interface TableRowProps {
  item: FormSubmission;
  navigation: FormNavigationProp;
}

const TableRow = ({ item, navigation }: TableRowProps) => (
  <Pressable
    onPress={() =>
      navigation.navigate("FormDetails", {
        formId: item.id,
        formType: item.type,
      })
    }
    style={({ pressed }: PressableStateCallbackType) => [
      styles.tableRow,
      pressed && { backgroundColor: "#f8fafc" },
    ]}
  >
    <View style={styles.tableCell}>
      <Text
        style={[
          styles.tableCellText,
          {
            color: getFormTypeColor(item.type),
            fontFamily: "Poppins-Medium",
          },
        ]}
      >
        {item.title}
      </Text>
    </View>
    <View style={styles.tableCell}>
      <Text style={styles.tableCellText}>
        {format(new Date(item.submission_date), "MMM d, yyyy")}
      </Text>
    </View>
    <View style={styles.tableCell}>
      <StatusBadge status={item.status} />
    </View>
    <View style={styles.actionCell}>
      <IconButton
        icon="eye"
        size={20}
        onPress={(e) => {
          e.stopPropagation();
          navigation.navigate("FormDetails", {
            formId: item.id,
            formType: item.type,
          });
        }}
        style={styles.actionIcon}
      />
    </View>
  </Pressable>
);

// Add TableSkeleton component
const TableSkeleton = () => {
  return (
    <View style={styles.tableContainer}>
      <TableHeader />
      {Array(5)
        .fill(0)
        .map((_, index) => (
          <View key={`skeleton-${index}`} style={styles.tableRow}>
            <View style={styles.tableCell}>
              <Shimmer width={140} height={16} />
            </View>
            <View style={styles.tableCell}>
              <Shimmer width={100} height={16} />
            </View>
            <View style={styles.tableCell}>
              <Shimmer width={80} height={24} style={{ borderRadius: 12 }} />
            </View>
            <View style={styles.actionCell}>
              <Shimmer width={40} height={40} style={{ borderRadius: 20 }} />
            </View>
          </View>
        ))}
    </View>
  );
};

const EmployeeFormsScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<FormNavigationProp>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [forms, setForms] = useState<FormSubmission[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredForms, setFilteredForms] = useState<FormSubmission[]>([]);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [typeFilter, setTypeFilter] = useState<
    "all" | "accident" | "illness" | "departure"
  >("all");
  const [statusFilter, setStatusFilter] = useState<FormStatus | "all">("all");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  const [appliedFilters, setAppliedFilters] = useState({
    status: "all" as FormStatus | "all",
    formType: "all" as "all" | "accident" | "illness" | "departure",
    sortOrder: "desc",
  });

  const [windowDimensions, setWindowDimensions] = useState({
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
  });

  const [fabMenuVisible, setFabMenuVisible] = useState(false);

  // Add window resize listener
  useEffect(() => {
    if (Platform.OS === "web") {
      const handleResize = () => {
        setWindowDimensions({
          width: Dimensions.get("window").width,
          height: Dimensions.get("window").height,
        });
      };

      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  const isLargeScreen = windowDimensions.width >= 1440;
  const isMediumScreen =
    windowDimensions.width >= 768 && windowDimensions.width < 1440;

  const fetchForms = async () => {
    try {
      setLoading(true);

      if (!user) return;

      // Fetch accident reports
      const { data: accidentData, error: accidentError } = await supabase
        .from("accident_report")
        .select("*")
        .eq("employee_id", user.id)
        .order("created_at", { ascending: false });

      // Fetch illness reports
      const { data: illnessData, error: illnessError } = await supabase
        .from("illness_report")
        .select("*")
        .eq("employee_id", user.id)
        .order("submission_date", { ascending: false });

      // Fetch staff departure reports
      const { data: departureData, error: departureError } = await supabase
        .from("staff_departure_report")
        .select("*")
        .eq("employee_id", user.id)
        .order("created_at", { ascending: false });

      if (accidentError || illnessError || departureError) {
        console.error("Error fetching forms:", {
          accidentError,
          illnessError,
          departureError,
        });
        return;
      }

      // Format accident reports
      const formattedAccidents = (accidentData || []).map((report) => ({
        id: report.id,
        type: "accident" as const,
        title: "Accident Report",
        status: report.status,
        submission_date: report.created_at,
      }));

      // Format illness reports
      const formattedIllness = (illnessData || []).map((report) => ({
        id: report.id,
        type: "illness" as const,
        title: "Illness Report",
        status: report.status,
        submission_date: report.submission_date,
      }));

      // Format departure reports
      const formattedDeparture = (departureData || []).map((report) => ({
        id: report.id,
        type: "departure" as const,
        title: "Staff Departure Report",
        status: report.status,
        submission_date: report.created_at,
      }));

      // Combine all reports
      const allForms = [
        ...formattedAccidents,
        ...formattedIllness,
        ...formattedDeparture,
      ].sort(
        (a, b) =>
          new Date(b.submission_date).getTime() -
          new Date(a.submission_date).getTime()
      );

      setForms(allForms);
      setFilteredForms(allForms);
    } catch (error) {
      console.error("Error fetching forms:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchForms();
  }, [user]);

  // Memoize filteredForms
  const memoizedFilteredForms = useMemo(() => {
    let filtered = forms;

    // Apply type filter
    if (appliedFilters.formType !== "all") {
      filtered = filtered.filter(
        (form) => form.type === appliedFilters.formType
      );
    }

    // Apply status filter
    if (appliedFilters.status !== "all") {
      filtered = filtered.filter(
        (form) => form.status === appliedFilters.status
      );
    }

    // Apply search filter
    if (searchQuery.trim() !== "") {
      filtered = filtered.filter((form) =>
        form.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  }, [forms, appliedFilters.status, appliedFilters.formType, searchQuery]);

  useEffect(() => {
    setFilteredForms(memoizedFilteredForms);
  }, [memoizedFilteredForms]);

  const applyFilters = () => {
    setFilterModalVisible(false);
    const newFilters = {
      status: statusFilter,
      formType: typeFilter,
      sortOrder: sortOrder,
    };
    setAppliedFilters(newFilters);
  };

  const clearFilters = () => {
    setTypeFilter("all");
    setStatusFilter("all");
    setSortOrder("desc");
    setAppliedFilters({
      status: "all",
      formType: "all",
      sortOrder: "desc",
    });
  };

  const hasActiveFilters = () => {
    return (
      appliedFilters.status !== "all" ||
      appliedFilters.formType !== "all" ||
      appliedFilters.sortOrder !== "desc"
    );
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchForms();
  }, []);

  const renderFormItem = useCallback(
    ({ item }: { item: FormSubmission }) => (
      <Surface style={[styles.cardSurface, { backgroundColor: "#FFFFFF" }]}>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate("FormDetails", {
              formId: item.id,
              formType: item.type,
            })
          }
          style={styles.cardTouchable}
        >
          <View style={styles.cardHeader}>
            <View style={styles.titleContainer}>
              <View style={styles.formTypeContainer}>
                <Chip
                  icon={getFormTypeIcon(item.type)}
                  style={[
                    styles.formTypeChip,
                    { backgroundColor: `${getFormTypeColor(item.type)}20` },
                  ]}
                  textStyle={{ color: getFormTypeColor(item.type) }}
                >
                  {item.title}
                </Chip>
              </View>
            </View>
            <StatusBadge status={item.status} />
          </View>

          <View
            style={[
              styles.cardDetails,
              { borderLeftColor: getFormTypeColor(item.type) },
            ]}
          >
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>Submitted:</Text>
              <Text style={styles.detailValue}>
                {format(new Date(item.submission_date), "MMM d, yyyy")}
              </Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.viewDetailsContainer}>
              <Text
                style={[
                  styles.viewDetailsText,
                  { color: getFormTypeColor(item.type) },
                ]}
              >
                VIEW DETAILS
              </Text>
              <IconButton
                icon="chevron-right"
                size={18}
                iconColor={getFormTypeColor(item.type)}
                style={styles.chevronIcon}
              />
            </View>
          </View>
        </TouchableOpacity>
      </Surface>
    ),
    [navigation]
  );

  const renderFilterModal = () => {
    const formTypeOptions = [
      { label: "All Types", value: "all" },
      { label: "Accident Report", value: "accident" },
      { label: "Illness Report", value: "illness" },
      { label: "Staff Departure", value: "departure" },
    ];

    const statusOptions = [
      { label: "All Status", value: "all" },
      ...Object.values(FormStatus).map((status) => ({
        label: status
          .split("_")
          .map(
            (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          )
          .join(" "),
        value: status,
      })),
    ];

    return (
      <FilterModal
        visible={filterModalVisible}
        onDismiss={() => setFilterModalVisible(false)}
        title="Filter Options"
        onClear={clearFilters}
        onApply={applyFilters}
        isLargeScreen={isLargeScreen}
        isMediumScreen={isMediumScreen}
      >
        <FilterSection title="Form Type">
          <RadioFilterGroup
            options={formTypeOptions}
            value={typeFilter}
            onValueChange={(value) =>
              setTypeFilter(
                value as "all" | "accident" | "illness" | "departure"
              )
            }
          />
        </FilterSection>

        <FilterDivider />

        <FilterSection title="Status">
          <RadioFilterGroup
            options={statusOptions}
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as FormStatus | "all")
            }
          />
        </FilterSection>
      </FilterModal>
    );
  };

  const renderFabMenu = () => (
    <View style={{ position: "relative" }}>
      <FAB
        icon={fabMenuVisible ? "close" : "plus"}
        label={isLargeScreen ? "Create Form" : undefined}
        style={[
          styles.fab,
          {
            backgroundColor: theme.colors.primary,
            position: "relative",
            margin: 0,
            marginLeft: 16,
          },
        ]}
        onPress={() => setFabMenuVisible(!fabMenuVisible)}
        color={theme.colors.surface}
        mode="flat"
        theme={{ colors: { accent: theme.colors.surface } }}
      />
      {fabMenuVisible && (
        <Portal>
          <Pressable
            style={styles.fabMenuOverlay}
            onPress={() => setFabMenuVisible(false)}
          >
            <View style={[styles.fabMenuContainer]}>
              <View style={styles.fabMenuHeader}>
                <Text style={styles.fabMenuHeaderTitle}>Create New Form</Text>
                <IconButton
                  icon="close"
                  size={24}
                  onPress={() => setFabMenuVisible(false)}
                />
              </View>
              <Divider style={styles.fabMenuDivider} />
              <View style={styles.fabMenuContent}>
                <TouchableOpacity
                  style={[styles.fabMenuItem, { backgroundColor: "#ffebee" }]}
                  onPress={() => {
                    setFabMenuVisible(false);
                    navigation.navigate("CreateAccidentReport");
                  }}
                >
                  <View style={styles.fabMenuItemContent}>
                    <View style={styles.fabMenuItemIcon}>
                      <IconButton
                        icon="alert-circle"
                        size={24}
                        iconColor="#f44336"
                      />
                    </View>
                    <View style={styles.fabMenuItemText}>
                      <Text style={styles.fabMenuItemTitle}>
                        Report Accident
                      </Text>
                      <Text style={styles.fabMenuItemDescription}>
                        Submit a workplace accident report
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.fabMenuItem, { backgroundColor: "#fff3e0" }]}
                  onPress={() => {
                    setFabMenuVisible(false);
                    navigation.navigate("CreateIllnessReport");
                  }}
                >
                  <View style={styles.fabMenuItemContent}>
                    <View style={styles.fabMenuItemIcon}>
                      <IconButton
                        icon="medical-bag"
                        size={24}
                        iconColor="#ff9800"
                      />
                    </View>
                    <View style={styles.fabMenuItemText}>
                      <Text style={styles.fabMenuItemTitle}>
                        Report Illness
                      </Text>
                      <Text style={styles.fabMenuItemDescription}>
                        Submit a health-related report
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.fabMenuItem, { backgroundColor: "#e3f2fd" }]}
                  onPress={() => {
                    setFabMenuVisible(false);
                    navigation.navigate("CreateStaffDeparture");
                  }}
                >
                  <View style={styles.fabMenuItemContent}>
                    <View style={styles.fabMenuItemIcon}>
                      <IconButton
                        icon="account-arrow-right"
                        size={24}
                        iconColor="#2196f3"
                      />
                    </View>
                    <View style={styles.fabMenuItemText}>
                      <Text style={styles.fabMenuItemTitle}>
                        Staff Departure
                      </Text>
                      <Text style={styles.fabMenuItemDescription}>
                        Submit a staff departure notice
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Portal>
      )}
    </View>
  );

  // Update the return statement for loading state
  if (loading && !refreshing) {
    const useTableLayout = isLargeScreen || isMediumScreen;

    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <AppHeader
          title="My Forms"
          showBackButton={false}
          showHelpButton={false}
          showProfileMenu={false}
          showLogo={false}
          showTitle={true}
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
            <Shimmer
              width="100%"
              height={60}
              style={{
                borderRadius: 18,
                marginRight: 8,
              }}
            />
            <Shimmer
              width={48}
              height={48}
              style={{
                borderRadius: 8,
              }}
            />
          </View>
        </View>

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
          {useTableLayout ? (
            <TableSkeleton />
          ) : (
            <FlatList
              data={Array(4).fill(0)}
              renderItem={() => <FormItemSkeleton />}
              keyExtractor={(_, index) => `skeleton-${index}`}
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Update the main return statement
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader
        title="My Forms"
        showBackButton={false}
        showHelpButton={false}
        showProfileMenu={false}
        showLogo={false}
        showTitle={true}
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
            placeholder="Search forms..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
            theme={{ colors: { primary: "#1a73e8" } }}
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
              size={30}
              style={[
                styles.filterButton,
                hasActiveFilters() && styles.activeFilterButton,
              ]}
              iconColor={hasActiveFilters() ? "#1a73e8" : undefined}
              onPress={() => setFilterModalVisible(true)}
            />
            {hasActiveFilters() && <View style={styles.filterBadge} />}
          </View>
        </View>

        {renderFabMenu()}
      </View>

      {renderFilterModal()}

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
        {filteredForms.length === 0 ? (
          <EmptyState
            icon="file-document"
            title="No Forms Found"
            message={
              searchQuery || hasActiveFilters()
                ? "No forms match your search criteria."
                : "You haven't submitted any forms yet."
            }
            buttonTitle={
              searchQuery || hasActiveFilters()
                ? "Clear Filters"
                : "Create Form"
            }
            onButtonPress={
              searchQuery || hasActiveFilters()
                ? () => {
                    setSearchQuery("");
                    clearFilters();
                  }
                : () => navigation.navigate("CreateAccidentReport")
            }
          />
        ) : isMediumScreen || isLargeScreen ? (
          <View style={styles.tableContainer}>
            <TableHeader />
            <FlatList
              data={filteredForms}
              renderItem={({ item }) => (
                <TableRow item={item} navigation={navigation} />
              )}
              keyExtractor={(item) => `${item.type}-${item.id}`}
              contentContainerStyle={styles.tableContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            />
          </View>
        ) : (
          <FlatList
            data={filteredForms}
            renderItem={renderFormItem}
            keyExtractor={(item) => `${item.type}-${item.id}`}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: Platform.OS === "web" ? 24 : 16,
    paddingTop: 22,
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
    height: 60,
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
  activeFilterButton: {
    backgroundColor: "#E8F0FE",
    borderWidth: 1,
    borderColor: "#1a73e8",
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
  contentContainer: {
    flex: 1,
    paddingHorizontal: Platform.OS === "web" ? 24 : 16,
    paddingVertical: 16,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
    paddingBottom: 100,
  },
  cardSurface: {
    marginBottom: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    overflow: "hidden",
  },
  cardTouchable: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
    marginRight: 8,
  },
  formTypeContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  formTypeChip: {
    alignSelf: "flex-start",
  },
  cardDetails: {
    marginBottom: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  detailLabel: {
    color: "#555",
    fontSize: 13,
    fontWeight: "600",
    marginRight: 4,
  },
  detailValue: {
    flex: 1,
    color: "#666",
    fontSize: 13,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginTop: 4,
  },
  viewDetailsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewDetailsText: {
    fontSize: 12,
    fontFamily: "Poppins-SemiBold",
  },
  chevronIcon: {
    margin: 0,
    padding: 0,
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    margin: 16,
    overflow: "hidden",
    maxHeight: "80%",
    elevation: 5,
    width: 400,
    alignSelf: "center",
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
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#212121",
  },
  modalContent: {
    padding: 16,
  },
  modalDivider: {
    height: 1,
    backgroundColor: "#E0E0E0",
  },
  modalSection: {
    marginVertical: 16,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#212121",
  },
  radioItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  radioLabel: {
    fontSize: 14,
    marginLeft: 12,
    fontFamily: "Poppins-Regular",
    color: "#424242",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    gap: 12,
  },
  footerButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  applyButton: {
    backgroundColor: "#1a73e8",
  },
  clearButtonText: {
    color: "#616161",
    fontSize: 14,
    fontFamily: "Poppins-Medium",
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontFamily: "Poppins-Medium",
  },
  tableContainer: {
    flex: 1,
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
    fontFamily: "Poppins-Medium",
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
  tableCellText: {
    fontSize: 14,
    color: "#334155",
    fontFamily: "Poppins-Regular",
  },
  tableContent: {
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
  fab: {
    borderRadius: 17,
    height: 56,
  },
  fabMenuOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1000,
    justifyContent: "center",
    alignItems: "center",
  },
  fabMenuContainer: {
    width: 380,
    backgroundColor: "#fff",
    borderRadius: 16,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1001,
  },
  fabMenuHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingBottom: 12,
  },
  fabMenuHeaderTitle: {
    fontSize: 20,
    fontFamily: "Poppins-SemiBold",
    color: "#333",
  },
  fabMenuDivider: {
    backgroundColor: "#e0e0e0",
  },
  fabMenuContent: {
    padding: 16,
  },
  fabMenuItem: {
    borderRadius: 12,
    marginVertical: 6,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  fabMenuItemContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  fabMenuItemIcon: {
    marginRight: 16,
  },
  fabMenuItemText: {
    flex: 1,
  },
  fabMenuItemTitle: {
    fontSize: 16,
    fontFamily: "Poppins-Medium",
    color: "#333",
    marginBottom: 4,
  },
  fabMenuItemDescription: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    color: "#666",
    lineHeight: 18,
  },
  statusContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  statusOption: {
    borderRadius: 25,
  },
  statusPill: {
    borderRadius: 25,
    paddingVertical: 7,
    paddingHorizontal: 12,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
  },
} as const);

export default EmployeeFormsScreen;
