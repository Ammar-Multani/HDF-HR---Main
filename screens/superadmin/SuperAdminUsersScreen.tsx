import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Platform,
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

  // Filter modal state
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Tab selection
  const [selectedTab, setSelectedTab] = useState<string>(
    UserListType.SUPER_ADMIN
  );

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
        .order("created_at", { ascending: false });

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
        .order("created_at", { ascending: false });

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
        .order("created_at", { ascending: false })
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
    if (searchQuery.trim() === "") {
      setFilteredSuperAdmins(superAdmins);
      setFilteredCompanyAdmins(companyAdmins);
      setFilteredEmployees(employees);
    } else {
      const query = searchQuery.toLowerCase();

      // Filter super admins
      const filteredAdmins = superAdmins.filter(
        (admin) =>
          admin.name?.toLowerCase().includes(query) ||
          admin.email.toLowerCase().includes(query)
      );
      setFilteredSuperAdmins(filteredAdmins);

      // Filter company admins
      const filteredAdmins2 = companyAdmins.filter(
        (admin) =>
          admin.first_name?.toLowerCase().includes(query) ||
          admin.last_name?.toLowerCase().includes(query) ||
          admin.email.toLowerCase().includes(query) ||
          (admin as any).company?.company_name?.toLowerCase().includes(query)
      );
      setFilteredCompanyAdmins(filteredAdmins2);

      // Filter employees
      const filteredEmps = employees.filter(
        (emp) =>
          emp.first_name?.toLowerCase().includes(query) ||
          emp.last_name?.toLowerCase().includes(query) ||
          emp.email.toLowerCase().includes(query) ||
          emp.job_title?.toLowerCase().includes(query) ||
          (emp as any).company?.company_name?.toLowerCase().includes(query)
      );
      setFilteredEmployees(filteredEmps);
    }
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
    setSearchQuery("");

    // Refetch data based on current tab
    if (selectedTab === UserListType.COMPANY_ADMIN) {
      fetchCompanyAdmins();
    } else if (selectedTab === UserListType.EMPLOYEE) {
      fetchEmployees();
    }
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
              <Avatar.Text
                size={50}
                label={getInitials(item.name || "", item.email)}
                style={styles.superAdminAvatar}
                labelStyle={styles.avatarLabel}
              />
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
              <IconButton
                icon="dots-vertical"
                size={20}
                style={styles.menuButton}
                onPress={() => console.log("Menu for", item.id)}
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
              <Avatar.Text
                size={50}
                label={getCompanyUserInitials(
                  item.first_name || "",
                  item.last_name || "",
                  item.email
                )}
                style={styles.companyAdminAvatar}
                labelStyle={styles.avatarLabel}
              />
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
              <IconButton
                icon="dots-vertical"
                size={20}
                style={styles.menuButton}
                onPress={() => console.log("Menu for", item.id)}
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
              <Avatar.Text
                size={50}
                label={getCompanyUserInitials(
                  item.first_name || "",
                  item.last_name || "",
                  item.email
                )}
                style={styles.employeeAvatar}
                labelStyle={styles.avatarLabel}
              />
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
              <IconButton
                icon="dots-vertical"
                size={20}
                style={styles.menuButton}
                onPress={() => console.log("Menu for", item.id)}
              />
            </View>
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  // Indicator for active filters
  const renderActiveFilterIndicator = () => {
    if (selectedCompanyIds.length === 0 && selectedCompanyId === "all")
      return null;

    // Get selected companies
    const selectedCompanies =
      selectedCompanyIds.length > 0
        ? companies.filter((company) => selectedCompanyIds.includes(company.id))
        : selectedCompanyId !== "all"
          ? [
              companies.find((company) => company.id === selectedCompanyId),
            ].filter(Boolean)
          : [];

    return (
      <View style={styles.activeFiltersContainer}>
        <Text style={styles.activeFiltersText}>Active filters:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScrollView}
        >
          {selectedCompanies.map((company) => (
            <Chip
              key={company?.id}
              mode="outlined"
              onClose={() => {
                if (selectedCompanyIds.length > 0) {
                  toggleCompanySelection(company?.id || "");
                } else {
                  setSelectedCompanyId("all");
                }
              }}
              style={localStyles.activeFilterChip}
              textStyle={{ color: theme.colors.primary }}
              closeIconAccessibilityLabel="Clear filter"
            >
              {company?.company_name || "Company"}
            </Chip>
          ))}
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

    if (
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
                    selectedCompanyIds.length > 0 || selectedCompanyId !== "all"
                      ? theme.colors.primary
                      : "#757575"
                  }
                />
              </TouchableOpacity>
            </View>

            {(selectedCompanyIds.length > 0 || selectedCompanyId !== "all") && (
              <View style={styles.activeFilterSection}>
                <View style={styles.activeFilterHeader}>
                  <Text style={styles.activeFilterTitle}>
                    Selected Companies
                  </Text>
                  <IconButton
                    icon="delete"
                    size={20}
                    onPress={handleClearFilters}
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

  // Add a helper function to toggle company selection
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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader
        title="All Users"
        showBackButton={false}
        showLogo={false}
        subtitle="Manage all system users"
      />

      <View style={styles.mainContent}>
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search users..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchbar}
          />
          {selectedTab !== UserListType.SUPER_ADMIN && (
            <View style={styles.filterButtonContainer}>
              <IconButton
                icon="filter-variant"
                size={24}
                style={[
                  styles.filterButton,
                  selectedCompanyIds.length > 0 && styles.activeFilterButton,
                ]}
                iconColor={
                  selectedCompanyIds.length > 0
                    ? theme.colors.primary
                    : undefined
                }
                onPress={() => setFilterModalVisible(true)}
              />
              {selectedCompanyIds.length > 0 && (
                <View style={styles.filterBadge} />
              )}
            </View>
          )}
        </View>

        <View style={styles.tabContainer}>
          <SegmentedButtons
            value={selectedTab}
            onValueChange={(value) => {
              setSelectedTab(value);
              // Reset company filter when switching to Super Admin
              if (value === UserListType.SUPER_ADMIN) {
                setSelectedCompanyIds([]);
                setSelectedCompanyId("all");
              }
            }}
            buttons={[
              {
                value: UserListType.SUPER_ADMIN,
                label: `Super Admins`,
                icon: "shield-account",
                showSelectedCheck: true,
              },
              {
                value: UserListType.COMPANY_ADMIN,
                label: `Company Admins`,
                icon: "office-building",
                showSelectedCheck: true,
              },
              {
                value: UserListType.EMPLOYEE,
                label: `Employees`,
                icon: "account-group",
                showSelectedCheck: true,
              },
            ]}
            style={styles.segmentedButtons}
            theme={{
              colors: {
                secondaryContainer: theme.colors.primary + "15",
                onSecondaryContainer: theme.colors.primary,
                outline: "#E0E0E0",
              },
            }}
            density="medium"
          />

          {/* <View style={styles.tabCountContainer}>
            <Text style={styles.tabCount}>
              {selectedTab === UserListType.SUPER_ADMIN &&
                superAdmins.length > 0 &&
                `${superAdmins.length} Super Admins`}
              {selectedTab === UserListType.COMPANY_ADMIN &&
                companyAdmins.length > 0 &&
                `${companyAdmins.length} Company Admins`}
              {selectedTab === UserListType.EMPLOYEE &&
                employees.length > 0 &&
                `${employees.length} Employees`}
            </Text>
          </View> */}
        </View>

        {renderActiveFilterIndicator()}
        {renderFilterModal()}

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
            navigation.navigate("Companies");
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
    marginBottom: 76,
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
    marginBottom: 16,
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
  tabContainer: {
    marginBottom: 16,
  },
  segmentedButtons: {
    backgroundColor: "#f5f5f5",
  },
  tabCountContainer: {
    alignItems: "flex-end",
    paddingTop: 4,
    paddingRight: 4,
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
  modalFooterContainer: {
    backgroundColor: "white",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: 16,
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
  },
  menuItemText: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    color: "#424242",
  },
  menuItemSelected: {
    color: "#1a73e8",
    fontFamily: "Poppins-Medium",
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
    bottom: 0,
  },
  avatarLabel: {
    fontSize: 18,
    fontWeight: "600",
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
});

export default SuperAdminUsersScreen;
