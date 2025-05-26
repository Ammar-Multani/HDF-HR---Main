import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Platform,
  Animated,
  TouchableWithoutFeedback,
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
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useNavigation,
  NavigationProp,
  ParamListBase,
} from "@react-navigation/native";
import { supabase } from "../../lib/supabase";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import EmptyState from "../../components/EmptyState";
import Text from "../../components/Text";
import { LinearGradient } from "expo-linear-gradient";

// User list types
enum UserListType {
  SUPER_ADMIN = "super_admin",
  COMPANY_ADMIN = "company_admin",
  EMPLOYEE = "employee",
}

// User status enum
enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
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
}

const SuperAdminUsersScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
  const [menuVisible, setMenuVisible] = useState(false);

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
      backgroundColor: theme.colors.primary + "15",
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

  // Fetch super admins
  const fetchSuperAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from("admin")
        .select("*")
        .eq("role", "superadmin")
        .order("created_at", {
          ascending: sortOrder === DateSortOrder.OLDEST_FIRST,
        });

      if (error) {
        console.error("Error fetching super admins:", error);
        return;
      }

      setSuperAdmins(data || []);
      setFilteredSuperAdmins(data || []);
    } catch (error) {
      console.error("Error fetching super admins:", error);
    }
  };

  // Fetch company admins
  const fetchCompanyAdmins = async () => {
    try {
      let query = supabase
        .from("company_user")
        .select("*, company:company_id(company_name)")
        .eq("role", "admin")
        .order("created_at", {
          ascending: sortOrder === DateSortOrder.OLDEST_FIRST,
        });

      // Apply company filter if selected
      if (selectedCompanyIds.length > 0) {
        query = query.in("company_id", selectedCompanyIds);
      } else if (selectedCompanyId !== "all") {
        query = query.eq("company_id", selectedCompanyId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching company admins:", error);
        return;
      }

      setCompanyAdmins(data || []);
      setFilteredCompanyAdmins(data || []);
    } catch (error) {
      console.error("Error fetching company admins:", error);
    }
  };

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      let query = supabase
        .from("company_user")
        .select("*, company:company_id(company_name)")
        .eq("role", "employee")
        .order("created_at", {
          ascending: sortOrder === DateSortOrder.OLDEST_FIRST,
        })
        .limit(100); // Limit to 100 employees for better performance

      // Apply company filter if selected
      if (selectedCompanyIds.length > 0) {
        query = query.in("company_id", selectedCompanyIds);
      } else if (selectedCompanyId !== "all") {
        query = query.eq("company_id", selectedCompanyId);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching employees:", error);
        return;
      }

      setEmployees(data || []);
      setFilteredEmployees(data || []);
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  // Fetch all user data
  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchSuperAdmins(),
        fetchCompanyAdmins(),
        fetchEmployees(),
      ]);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Initial data load
  useEffect(() => {
    fetchCompanies();
    fetchAllUsers();
  }, []);

  // Refetch when company filter changes
  useEffect(() => {
    if (selectedTab === UserListType.COMPANY_ADMIN) {
      fetchCompanyAdmins();
    } else if (selectedTab === UserListType.EMPLOYEE) {
      fetchEmployees();
    }
  }, [selectedCompanyIds, selectedCompanyId, selectedTab]);

  // Filter users based on search query
  useEffect(() => {
    // Clear the timeout on unmount or new search
    let debounceTimeout: NodeJS.Timeout;

    const performSearch = () => {
      if (searchQuery.trim() === "") {
        setFilteredSuperAdmins(superAdmins);
        setFilteredCompanyAdmins(companyAdmins);
        setFilteredEmployees(employees);
        setRefreshing(false);
        return;
      }

      // Set refreshing while searching
      setRefreshing(true);

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

      // Turn off refreshing
      setRefreshing(false);
    };

    // Use different debounce times based on query length
    const debounceTime = searchQuery.length < 3 ? 300 : 500;

    // Show refreshing indicator when actively searching
    if (searchQuery.length > 0) {
      setRefreshing(true);
    }

    // Debounce the search
    debounceTimeout = setTimeout(performSearch, debounceTime);

    return () => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
    };
  }, [searchQuery, superAdmins, companyAdmins, employees]);

  const onRefresh = () => {
    setRefreshing(true);
    // Reset company filter on refresh
    setSelectedCompanyIds([]);
    setSelectedCompanyId("all");
    fetchAllUsers();
  };

  const handleClearFilters = () => {
    setSelectedCompanyIds([]);
    setSelectedCompanyId("all");
    setSortOrder(DateSortOrder.NEWEST_FIRST);
    setSearchQuery("");

    // Use our direct approach for more reliable updates
    applyFiltersDirect();
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

  // Render a status chip
  const renderStatusChip = (status?: UserStatus | string | boolean) => {
    if (status === undefined) return null;

    let color;
    let displayText;

    // Handle boolean values
    if (typeof status === "boolean") {
      if (status === true) {
        color = "#4CAF50"; // Green
        displayText = "Active";
      } else {
        color = "#757575"; // Grey
        displayText = "Inactive";
      }
    } else {
      // Handle string values
      switch (status) {
        case UserStatus.ACTIVE:
        case "active":
          color = "#4CAF50"; // Green
          displayText = "Active";
          break;
        case UserStatus.INACTIVE:
        case "inactive":
          color = "#757575"; // Grey
          displayText = "Inactive";
          break;
        default:
          color = theme.colors.primary;
          displayText =
            typeof status === "string" && status.length > 0
              ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
              : "Unknown";
      }
    }

    return (
      <Chip
        style={{ backgroundColor: color + "20" }}
        textStyle={{ color: color, fontFamily: "Poppins-Medium" }}
      >
        {displayText}
      </Chip>
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
        console.log("Super Admin selected:", item.id);
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
                <Text variant="bold" style={styles.userName} numberOfLines={1}>
                  {item.name || "Unnamed Admin"}
                </Text>
                <Text style={styles.userEmail} numberOfLines={1}>
                  {item.email}
                </Text>
              </View>
            </View>
            <View style={styles.statusContainer}>
              {renderStatusChip(item.status)}
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderCompanyAdminItem = ({ item }: { item: CompanyUser }) => (
    <TouchableOpacity
      onPress={() => {
        console.log("Company Admin selected:", item.id);
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
                <Text variant="bold" style={styles.userName} numberOfLines={1}>
                  {`${item.first_name || ""} ${item.last_name || ""}`.trim() ||
                    "Unnamed Admin"}
                </Text>
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
              {renderStatusChip(item.active_status)}
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderEmployeeItem = ({ item }: { item: CompanyUser }) => (
    <TouchableOpacity
      onPress={() => {
        console.log("Employee selected:", item.id);
        navigation.navigate("EmployeeDetailedScreen", {
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
                <Text variant="bold" style={styles.userName} numberOfLines={1}>
                  {`${item.first_name || ""} ${item.last_name || ""}`.trim() ||
                    "Unnamed Employee"}
                </Text>
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
              {renderStatusChip(item.active_status)}
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  // Indicator for active filters
  const renderActiveFilterIndicator = () => {
    if (!hasActiveFilters()) return null;

    return (
      <View style={styles.activeFiltersContainer}>
        <Text style={styles.activeFiltersText}>Active filters:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScrollView}
        >
          {(selectedCompanyIds.length > 0 || selectedCompanyId !== "all") && (
            <Chip
              mode="outlined"
              onClose={() => {
                setSelectedCompanyIds([]);
                setSelectedCompanyId("all");
                applyFiltersDirect();
              }}
              style={localStyles.activeFilterChip}
              textStyle={{ color: theme.colors.primary }}
            >
              {selectedCompanyIds.length > 0
                ? `${selectedCompanyIds.length} Companies`
                : companies.find((c) => c.id === selectedCompanyId)
                    ?.company_name || "Company"}
            </Chip>
          )}

          {sortOrder !== DateSortOrder.NEWEST_FIRST && (
            <Chip
              mode="outlined"
              onClose={() => {
                setSortOrder(DateSortOrder.NEWEST_FIRST);
                applyFiltersDirect();
              }}
              style={localStyles.activeFilterChip}
              textStyle={{ color: theme.colors.primary }}
            >
              Date: Oldest first
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

    // Add search length guidance if search query is short
    if (searchQuery && searchQuery.length < 3) {
      message = "Try typing at least 3 characters for better search results.";
    } else if (
      searchQuery === "" &&
      selectedCompanyIds.length === 0 &&
      selectedCompanyId === "all"
    ) {
      if (currentTab === UserListType.SUPER_ADMIN) {
        title = "No Super Admins Found";
        message = "You haven't added any super admins yet.";
        buttonTitle = "Add Super Admin";
      } else if (currentTab === UserListType.COMPANY_ADMIN) {
        title = "No Company Admins Found";
        message = "You haven't added any company admins yet.";
        buttonTitle = "Add Company Admin";
      } else {
        title = "No Employees Found";
        message = "No employees have been added to the system yet.";
        buttonTitle = "View Companies";
      }
    }

    return (
      <EmptyState
        icon={icon}
        title={title}
        message={message}
        buttonTitle={buttonTitle}
        onButtonPress={() => {
          if (
            searchQuery ||
            selectedCompanyIds.length > 0 ||
            selectedCompanyId !== "all"
          ) {
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

  const renderCurrentList = () => {
    if (loading && !refreshing) {
      return <LoadingIndicator />;
    }

    switch (selectedTab) {
      case UserListType.SUPER_ADMIN:
        if (filteredSuperAdmins.length === 0) {
          return renderEmptyState();
        }
        return (
          <>
            <FlatList
              data={filteredSuperAdmins}
              renderItem={renderSuperAdminItem}
              keyExtractor={(item) => `super-${item.id}`}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            />
          </>
        );

      case UserListType.COMPANY_ADMIN:
        if (filteredCompanyAdmins.length === 0) {
          return renderEmptyState();
        }
        return (
          <>
            <FlatList
              data={filteredCompanyAdmins}
              renderItem={renderCompanyAdminItem}
              keyExtractor={(item) => `admin-${item.id}`}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            />
          </>
        );

      case UserListType.EMPLOYEE:
        if (filteredEmployees.length === 0) {
          return renderEmptyState();
        }
        return (
          <>
            <FlatList
              data={filteredEmployees}
              renderItem={renderEmployeeItem}
              keyExtractor={(item) => `emp-${item.id}`}
              contentContainerStyle={styles.listContent}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
            />
          </>
        );

      default:
        return null;
    }
  };

  // Filter modal component
  const renderFilterModal = () => {
    // Create a ref for the company dropdown
    const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
    const dropdownRef = React.useRef(null);

    const showMenu = () => {
      if (dropdownRef.current) {
        // @ts-ignore - Getting layout measurements
        dropdownRef.current.measure((x, y, width, height, pageX, pageY) => {
          setMenuPosition({ x: pageX, y: pageY + height });
          setMenuVisible(true);
        });
      }
    };

    // Menu container style with theme
    const menuContainerStyle = {
      borderRadius: 12,
      width: 300,
      marginTop: 4,
      elevation: 4,
      backgroundColor: "#FFFFFF",
      borderWidth: 1,
      borderColor: "#E0E0E0",
    };

    // Get display text for selected companies
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
      <Portal>
        <Modal
          visible={filterModalVisible}
          onDismiss={() => setFilterModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modalHeaderContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Options</Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setFilterModalVisible(false)}
              />
            </View>

            <Divider style={styles.modalDivider} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Date Sort Section - Available for all tabs */}
            <View style={styles.modalSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Sort by creation date</Text>
              </View>
              <RadioButton.Group
                onValueChange={(value) => setSortOrder(value)}
                value={sortOrder}
              >
                <View style={styles.radioItem}>
                  <RadioButton.Android
                    value={DateSortOrder.NEWEST_FIRST}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.radioLabel}>Newest first</Text>
                </View>
                <View style={styles.radioItem}>
                  <RadioButton.Android
                    value={DateSortOrder.OLDEST_FIRST}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.radioLabel}>Oldest first</Text>
                </View>
              </RadioButton.Group>
            </View>

            <Divider style={styles.modalDivider} />

            {/* Company section - only for Company Admin and Employee tabs */}
            {selectedTab !== UserListType.SUPER_ADMIN && (
              <View style={styles.modalSection}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionTitle}>Companies</Text>
                  <View style={styles.selectionBadge}>
                    <Text style={styles.selectionHint}>
                      {selectedCompanyIds.length > 0
                        ? `${selectedCompanyIds.length} selected`
                        : selectedCompanyId !== "all"
                          ? "1 selected"
                          : "All"}
                    </Text>
                  </View>
                </View>

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
            )}

            {/* Selected Companies Section */}
            {(selectedCompanyIds.length > 0 || selectedCompanyId !== "all") && (
              <View style={styles.activeFilterSection}>
                <View style={styles.activeFilterHeader}>
                  <Text style={styles.activeFilterTitle}>
                    Selected Companies
                  </Text>
                  <IconButton
                    icon="delete"
                    size={20}
                    onPress={() => {
                      // Clear company filters directly
                      setSelectedCompanyIds([]);
                      setSelectedCompanyId("all");
                      // Don't dismiss modal yet - user can still apply
                    }}
                    iconColor={theme.colors.primary}
                    style={styles.clearAllButton}
                  />
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.filtersScrollView}
                >
                  {selectedCompanyIds.length > 0 ? (
                    companies
                      .filter((company) =>
                        selectedCompanyIds.includes(company.id)
                      )
                      .map((company) => (
                        <Chip
                          key={company.id}
                          mode="outlined"
                          onClose={() => toggleCompanySelection(company.id)}
                          style={localStyles.activeFilterChip}
                          textStyle={{ color: theme.colors.primary }}
                        >
                          {company.company_name}
                        </Chip>
                      ))
                  ) : selectedCompanyId !== "all" ? (
                    <Chip
                      mode="outlined"
                      onClose={() => setSelectedCompanyId("all")}
                      style={localStyles.activeFilterChip}
                      textStyle={{ color: theme.colors.primary }}
                    >
                      {companies.find((c) => c.id === selectedCompanyId)
                        ?.company_name || "Company"}
                    </Chip>
                  ) : null}
                </ScrollView>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.footerButton}
              onPress={() => {
                setSelectedCompanyIds([]);
                setSelectedCompanyId("all");
                setSortOrder(DateSortOrder.NEWEST_FIRST);
                setFilterModalVisible(false);
                // Use the direct fetch approach to refresh the list
                // with cleared filters
                applyFiltersDirect();
                setMenuVisible(false);
              }}
            >
              <Text style={styles.clearButtonText}>Clear Filters</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.footerButton,
                styles.applyButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={() => {
                // Use our new direct filter approach that works on first click
                applyFiltersDirect();
              }}
            >
              <Text style={styles.applyButtonText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        <Menu
          visible={menuVisible}
          onDismiss={() => setMenuVisible(false)}
          anchor={menuPosition}
          contentStyle={menuContainerStyle}
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
                // Apply the changes immediately using our direct approach
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
                  // For multi-select mode
                  toggleCompanySelection(company.id);
                  setMenuVisible(false);
                  // Apply the changes immediately using our direct approach
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
      </Portal>
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

  // Apply filters directly, similar to the improved approach used in CompanyListScreen
  const applyFiltersDirect = () => {
    // Close modal first
    setFilterModalVisible(false);

    // Force complete reset and refresh with new filters
    setLoading(true);

    // This approach directly fetches data with current filter values
    // without relying on state updates to propagate first
    const fetchWithCurrentFilters = async () => {
      try {
        // Based on the current tab, fetch the appropriate data
        if (selectedTab === UserListType.SUPER_ADMIN) {
          // Super admins aren't filtered by company, but can be sorted by date
          let query = supabase
            .from("admin")
            .select("*")
            .eq("role", "superadmin")
            .order("created_at", {
              ascending: sortOrder === DateSortOrder.OLDEST_FIRST,
            });

          const { data, error } = await query;

          if (error) {
            console.error("Error fetching super admins:", error);
            return;
          }

          setSuperAdmins(data || []);

          // Apply search filter if present
          if (searchQuery.trim() === "") {
            setFilteredSuperAdmins(data || []);
          } else {
            const query = searchQuery.toLowerCase();
            const filteredAdmins = (data || []).filter(
              (admin) =>
                admin.name?.toLowerCase().includes(query) ||
                admin.email.toLowerCase().includes(query)
            );
            setFilteredSuperAdmins(filteredAdmins);
          }
        } else if (selectedTab === UserListType.COMPANY_ADMIN) {
          // Fetch company admins with current filters
          let query = supabase
            .from("company_user")
            .select("*, company:company_id(company_name)")
            .eq("role", "admin")
            .order("created_at", {
              ascending: sortOrder === DateSortOrder.OLDEST_FIRST,
            });

          // Apply company filter using the current selection values
          if (selectedCompanyIds.length > 0) {
            query = query.in("company_id", selectedCompanyIds);
          } else if (selectedCompanyId !== "all") {
            query = query.eq("company_id", selectedCompanyId);
          }

          const { data, error } = await query;

          if (error) {
            console.error("Error fetching company admins:", error);
            return;
          }

          setCompanyAdmins(data || []);

          // Apply search filter if present
          if (searchQuery.trim() === "") {
            setFilteredCompanyAdmins(data || []);
          } else {
            const query = searchQuery.toLowerCase();
            const filteredAdmins = (data || []).filter(
              (admin) =>
                admin.first_name?.toLowerCase().includes(query) ||
                admin.last_name?.toLowerCase().includes(query) ||
                admin.email.toLowerCase().includes(query) ||
                (admin as any).company?.company_name
                  ?.toLowerCase()
                  .includes(query)
            );
            setFilteredCompanyAdmins(filteredAdmins);
          }
        } else if (selectedTab === UserListType.EMPLOYEE) {
          // Fetch employees with current filters
          let query = supabase
            .from("company_user")
            .select("*, company:company_id(company_name)")
            .eq("role", "employee")
            .order("created_at", {
              ascending: sortOrder === DateSortOrder.OLDEST_FIRST,
            })
            .limit(100);

          // Apply company filter using the current selection values
          if (selectedCompanyIds.length > 0) {
            query = query.in("company_id", selectedCompanyIds);
          } else if (selectedCompanyId !== "all") {
            query = query.eq("company_id", selectedCompanyId);
          }

          const { data, error } = await query;

          if (error) {
            console.error("Error fetching employees:", error);
            return;
          }

          setEmployees(data || []);

          // Apply search filter if present
          if (searchQuery.trim() === "") {
            setFilteredEmployees(data || []);
          } else {
            const query = searchQuery.toLowerCase();
            const filteredEmps = (data || []).filter(
              (emp) =>
                emp.first_name?.toLowerCase().includes(query) ||
                emp.last_name?.toLowerCase().includes(query) ||
                emp.email.toLowerCase().includes(query) ||
                emp.job_title?.toLowerCase().includes(query) ||
                (emp as any).company?.company_name
                  ?.toLowerCase()
                  .includes(query)
            );
            setFilteredEmployees(filteredEmps);
          }
        }
      } catch (error) {
        console.error("Error applying filters:", error);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };

    // Execute the fetch immediately
    fetchWithCurrentFilters();
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return (
      selectedCompanyIds.length > 0 ||
      selectedCompanyId !== "all" ||
      sortOrder !== DateSortOrder.NEWEST_FIRST
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
            <View
              style={[
                styles.iconContainer,
              ]}
            >
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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader
        title="All Users"
        showBackButton={false}
        showHelpButton={true}
        showLogo={false}
        subtitle="Manage all system users"
      />

      <View style={[styles.mainContent, { backgroundColor: theme.colors.backgroundSecondary }]}>
        <View style={styles.searchContainer}>
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
          {/* Enable filter button for all tabs */}
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

        {searchQuery && searchQuery.length > 0 && searchQuery.length < 3 && (
          <View style={styles.searchTips}>
            <Text style={styles.searchTipsText}>
              Type at least 3 characters for better search results.
            </Text>
          </View>
        )}

        {renderEnhancedDropdown()}

        {renderUserTypeMenu()}

        {renderActiveFilterIndicator()}
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

        <View style={styles.listContainer}>{renderCurrentList()}</View>
      </View>

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => {
          if (selectedTab === UserListType.SUPER_ADMIN) {
            navigation.navigate("CreateSuperAdmin");
          } else if (selectedTab === UserListType.COMPANY_ADMIN) {
            navigation.navigate("CreateCompanyAdmin");
          } else {
            // Show company list to add employees
            navigation.navigate("CreateEmployee");
          }
        }}
        color={theme.colors.surface}
      />
    </SafeAreaView>
  );
};

// Global styles outside component
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7F9",
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: 16,
    // marginBottom: 76,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
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
    flexDirection: "row",
    alignItems: "center",
    height: 60,
    marginTop: 8,
    marginBottom: 8,
  },
  searchbar: {
    flex: 1,
    elevation: 1,
    borderRadius: 18,
    height: 60,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
    fontSize: 16,
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
    marginBottom: 12,
    marginHorizontal: 2,
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
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  listContainer: {
    flex: 1,
    marginTop: 4,
    marginBottom: 76,
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
    marginBottom: 8,
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
    maxHeight: "80%",
    elevation: 5,
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
    marginBottom: 24,
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
    flexWrap: "wrap",
    marginBottom: 12,
    paddingHorizontal: 4,
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
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: Platform.OS === 'web' ? 0 : 80,
    borderRadius: 28,
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
    paddingHorizontal:10,
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
});

export default SuperAdminUsersScreen;
