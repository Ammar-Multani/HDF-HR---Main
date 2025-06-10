import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Platform,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Animated,
} from "react-native";
import {
  Text,
  TextInput,
  Surface,
  IconButton,
  Portal,
  Modal,
  Divider,
  useTheme,
  HelperText,
  Avatar,
} from "react-native-paper";
import { supabase } from "../lib/supabase";
import debounce from "lodash/debounce";
import EmptyState from "./EmptyState";
import Color from "color";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  job_title?: string;
}

interface EmployeeSelectorProps {
  companyId: string;
  onSelect: (employee: Employee) => void;
  selectedEmployee: Employee | null;
  error?: string;
  required?: boolean;
  label?: string;
}

const EmployeeSelector = ({
  companyId,
  onSelect,
  selectedEmployee,
  error,
  required = false,
  label = "Select Employee",
}: EmployeeSelectorProps) => {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [focusedEmployeeIndex, setFocusedEmployeeIndex] = useState(-1);
  const [scaleAnim] = useState(new Animated.Value(1));

  // Create dynamic styles that depend on theme
  const dynamicStyles = StyleSheet.create({
    employeeItemSelected: {
      backgroundColor: Color(theme.colors.primary).alpha(0.08).toString(),
    },
  });

  // Initial data loading
  useEffect(() => {
    if (modalVisible) {
      fetchInitialEmployees();
    }
  }, [modalVisible]);

  const fetchInitialEmployees = async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      setSearchError(null);
      const { data, error } = await supabase
        .from("company_user")
        .select("id, first_name, last_name, email, job_title")
        .eq("company_id", companyId)
        .eq("role", "employee")
        .order("first_name", { ascending: true })
        .limit(50);

      if (error) {
        console.error("Error fetching initial employees:", error);
        setSearchError("Failed to load employees. Please try again.");
        return;
      }

      setEmployees(data || []);
    } catch (error) {
      console.error("Error fetching initial employees:", error);
      setSearchError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Debounced search function
  const searchEmployees = useCallback(
    debounce(async (query: string) => {
      if (!companyId) return;

      try {
        setLoading(true);
        setSearchError(null);
        const { data, error } = await supabase
          .from("company_user")
          .select("id, first_name, last_name, email, job_title")
          .eq("company_id", companyId)
          .eq("role", "employee")
          .or(
            `first_name.ilike.%${query}%,` +
              `last_name.ilike.%${query}%,` +
              `email.ilike.%${query}%`
          )
          .order("first_name", { ascending: true });

        if (error) {
          console.error("Error searching employees:", error);
          setSearchError("Failed to search employees. Please try again.");
          return;
        }

        setEmployees(data || []);
      } catch (error) {
        console.error("Error searching employees:", error);
        setSearchError("An unexpected error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    }, 300),
    [companyId]
  );

  useEffect(() => {
    if (modalVisible) {
      searchEmployees(searchQuery);
    }
  }, [searchQuery, modalVisible]);

  const handleSelect = (employee: Employee) => {
    onSelect(employee);
    setModalVisible(false);
    setSearchQuery("");
    setFocusedEmployeeIndex(-1);
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (!modalVisible) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedEmployeeIndex((prev) =>
          prev < employees.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedEmployeeIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        if (
          focusedEmployeeIndex >= 0 &&
          focusedEmployeeIndex < employees.length
        ) {
          handleSelect(employees[focusedEmployeeIndex]);
        }
        break;
      case "Escape":
        setModalVisible(false);
        break;
    }
  };

  useEffect(() => {
    if (Platform.OS === "web") {
      window.addEventListener("keydown", handleKeyPress);
      return () => window.removeEventListener("keydown", handleKeyPress);
    }
  }, [modalVisible, focusedEmployeeIndex, employees]);

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const getAvatarColor = (name: string) => {
    const colors = [
      "#F44336",
      "#E91E63",
      "#9C27B0",
      "#673AB7",
      "#3F51B5",
      "#2196F3",
      "#03A9F4",
      "#00BCD4",
      "#009688",
      "#4CAF50",
      "#8BC34A",
      "#CDDC39",
      "#FFC107",
      "#FF9800",
      "#FF5722",
    ];

    const index = name
      .split("")
      .reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  };

  const renderEmployeeItem = (employee: Employee, index: number) => {
    const avatarColor = getAvatarColor(
      `${employee.first_name} ${employee.last_name}`
    );
    const isSelected = selectedEmployee?.id === employee.id;
    const isFocused = focusedEmployeeIndex === index;

    return (
      <TouchableOpacity
        key={employee.id}
        style={[
          staticStyles.employeeItem,
          isFocused && staticStyles.employeeItemFocused,
          isSelected && dynamicStyles.employeeItemSelected,
        ]}
        onPress={() => handleSelect(employee)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View
          style={[
            staticStyles.employeeContent,
            { justifyContent: "space-between" },
          ]}
        >
          <View style={staticStyles.employeeInfo}>
            <Text style={staticStyles.employeeName}>
              {employee.first_name} {employee.last_name}
            </Text>
            <Text style={staticStyles.employeeEmail}>{employee.email}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {employee.job_title && (
              <View
                style={[
                  staticStyles.jobTitleContainer,
                  {
                    backgroundColor: "#f1f5f9",
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: 13,
                    borderWidth: 0.5,
                    borderColor: "#e2e8f0",
                    maxWidth: 150,
                  },
                ]}
              >
                <IconButton
                  icon="briefcase"
                  size={14}
                  style={staticStyles.jobTitleIcon}
                />
                <Text
                  style={[
                    staticStyles.employeeJobTitle,
                    {
                      fontSize: 11,
                      color: "#475569",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {employee.job_title}
                </Text>
              </View>
            )}
            {isSelected && (
              <IconButton
                icon="check-circle"
                size={24}
                iconColor={theme.colors.primary}
                style={staticStyles.selectedIcon}
              />
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const styles = StyleSheet.create({
    container: {
      marginBottom: 14,
      backgroundColor: "transparent",
    },
    label: {
      fontSize: 14,
      marginBottom: 8,
      color: "#64748b",
      fontFamily: "Poppins-Medium",
    },
    required: {
      color: "#dc2626",
    },
    selector: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      padding: 8,
      borderWidth: 1,
      borderColor: "#E0E0E0",
      borderRadius: 12,
      backgroundColor: "#FFFFFF",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    selectorError: {
      borderColor: "#dc2626",
      borderWidth: 2,
    },
    selectorEmpty: {
      backgroundColor: "#FAFAFA",
    },
    selectedContent: {
      flex: 1,
      paddingVertical: 4,
    },
    selectedEmployee: {
      flexDirection: "row",
      alignItems: "center",
    },
    selectedInfo: {
      marginLeft: 12,
      flex: 1,
    },
    selectedName: {
      fontSize: 14,
      color: "#1e293b",
      fontFamily: "Poppins-Medium",
    },
    selectedEmail: {
      fontSize: 12,
      color: "#64748b",
      fontFamily: "Poppins-Regular",
    },
    placeholderContainer: {
      flexDirection: "row",
      alignItems: "center",
    },
    placeholder: {
      fontSize: 14,
      color: "#94a3b8",
      fontFamily: "Poppins-Regular",
      marginLeft: 4,
    },
    chevronIcon: {
      margin: 0,
    },
    modalContainer: {
      padding: 20,
      backgroundColor: "transparent",
      elevation: 0,
      shadowColor: "transparent",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
    },
    modalContent: {
      backgroundColor: "white",
      borderRadius: 16,
      maxWidth: 600,
      width: "100%",
      maxHeight: "80%",
      alignSelf: "center",
      overflow: "hidden",
      elevation: 0,
      shadowColor: "transparent",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      borderWidth: 1,
      borderColor: "#e2e8f0",
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: 16,
      backgroundColor: "#FFFFFF",
    },
    modalTitle: {
      fontSize: 18,
      fontFamily: "Poppins-SemiBold",
      color: "#1e293b",
    },
    searchContainer: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: "#e2e8f0",
      backgroundColor: "#FFFFFF",
    },
    searchInput: {
      backgroundColor: "#FFFFFF",
    },
    employeeList: {
      maxHeight: 400,
    },
    listContainer: {
      flex: 1,
      minHeight: 250,
      backgroundColor: "#FFFFFF",
    },
    emptyStateContainer: {
      minHeight: 250,
      justifyContent: "center",
      alignItems: "center",
    },
    employeeItem: {
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: "#e2e8f0",
      backgroundColor: "#FFFFFF",
    },
    employeeContent: {
      flexDirection: "row",
      alignItems: "center",
      padding: 12,
    },
    employeeItemFocused: {
      backgroundColor: "#f8fafc",
    },
    avatar: {
      marginRight: 12,
    },
    employeeInfo: {
      flex: 1,
    },
    employeeName: {
      fontSize: 14,
      color: "#1e293b",
      fontFamily: "Poppins-Medium",
    },
    employeeEmail: {
      fontSize: 12,
      color: "#64748b",
      fontFamily: "Poppins-Regular",
      marginTop: 2,
    },
    jobTitleContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 2,
    },
    jobTitleIcon: {
      margin: 0,
      padding: 0,
    },
    employeeJobTitle: {
      fontSize: 12,
      color: "#94a3b8",
      fontFamily: "Poppins-Regular",
      marginLeft: 4,
    },
    selectedIcon: {
      margin: 0,
    },
    errorContainer: {
      padding: 16,
      alignItems: "center",
      minHeight: 250,
      justifyContent: "center",
    },
    errorText: {
      color: "#dc2626",
      fontSize: 14,
      fontFamily: "Poppins-Regular",
      marginBottom: 8,
      textAlign: "center",
    },
    retryButton: {
      paddingVertical: 8,
      paddingHorizontal: 16,
      backgroundColor: "#f1f5f9",
      borderRadius: 8,
    },
    retryButtonText: {
      color: "#1e293b",
      fontSize: 14,
      fontFamily: "Poppins-Medium",
    },
  });

  return (
    <>
      <Surface style={styles.container} elevation={0}>
        <Text style={styles.label}>
          {label} {required && <Text style={styles.required}>*</Text>}
        </Text>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            style={[
              styles.selector,
              error && styles.selectorError,
              !selectedEmployee && styles.selectorEmpty,
            ]}
          >
            <View style={styles.selectedContent}>
              {selectedEmployee ? (
                <View style={styles.selectedEmployee}>
                  <View style={styles.selectedInfo}>
                    <Text style={styles.selectedName}>
                      {selectedEmployee.first_name} {selectedEmployee.last_name}
                    </Text>
                    <Text style={styles.selectedEmail}>
                      {selectedEmployee.email}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.placeholderContainer}>
                  <IconButton icon="account-search" size={24} />
                  <Text style={styles.placeholder}>Select an employee</Text>
                </View>
              )}
            </View>
            <IconButton
              icon="chevron-down"
              size={24}
              style={styles.chevronIcon}
            />
          </TouchableOpacity>
        </Animated.View>
        {error && <HelperText type="error">{error}</HelperText>}
      </Surface>

      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => {
            setModalVisible(false);
            setSearchQuery("");
            setFocusedEmployeeIndex(-1);
          }}
          contentContainerStyle={styles.modalContainer}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Employee</Text>
              <IconButton
                icon="close"
                size={24}
                onPress={() => setModalVisible(false)}
              />
            </View>
            <Divider />

            <View style={styles.searchContainer}>
              <TextInput
                mode="outlined"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInput}
                left={<TextInput.Icon icon="magnify" />}
                right={
                  loading ? (
                    <TextInput.Icon
                      icon={() => (
                        <ActivityIndicator
                          size={20}
                          color={theme.colors.primary}
                        />
                      )}
                    />
                  ) : searchQuery ? (
                    <TextInput.Icon
                      icon="close-circle"
                      onPress={() => setSearchQuery("")}
                    />
                  ) : null
                }
                autoFocus
              />
            </View>

            {searchError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{searchError}</Text>
                <TouchableOpacity
                  style={styles.retryButton}
                  onPress={() =>
                    searchQuery
                      ? searchEmployees(searchQuery)
                      : fetchInitialEmployees()
                  }
                >
                  <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView style={styles.employeeList}>
                {employees.length === 0 ? (
                  <View style={styles.emptyStateContainer}>
                    <EmptyState
                      icon="account-search"
                      title="No Employees Found"
                      message={
                        searchQuery
                          ? "Try a different search term"
                          : "No employees available"
                      }
                    />
                  </View>
                ) : (
                  employees.map((employee, index) =>
                    renderEmployeeItem(employee, index)
                  )
                )}
              </ScrollView>
            )}
          </KeyboardAvoidingView>
        </Modal>
      </Portal>
    </>
  );
};

// Move static styles outside the component
const staticStyles = StyleSheet.create({
  container: {
    marginBottom: 24,
    backgroundColor: "transparent",
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: "#64748b",
    fontFamily: "Poppins-Medium",
  },
  required: {
    color: "#dc2626",
  },
  selector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  selectorError: {
    borderColor: "#dc2626",
    borderWidth: 2,
  },
  selectorEmpty: {
    backgroundColor: "#FAFAFA",
  },
  selectedContent: {
    flex: 1,
    paddingVertical: 4,
  },
  selectedEmployee: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectedInfo: {
    marginLeft: 12,
    flex: 1,
  },
  selectedName: {
    fontSize: 14,
    color: "#1e293b",
    fontFamily: "Poppins-Medium",
  },
  selectedEmail: {
    fontSize: 12,
    color: "#64748b",
    fontFamily: "Poppins-Regular",
  },
  placeholderContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  placeholder: {
    fontSize: 14,
    color: "#94a3b8",
    fontFamily: "Poppins-Regular",
    marginLeft: 4,
  },
  chevronIcon: {
    margin: 0,
  },
  modalContainer: {
    padding: 20,
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 16,
    maxWidth: 600,
    width: "100%",
    maxHeight: "90%",
    alignSelf: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#FFFFFF",
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    color: "#1e293b",
  },
  searchContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#FFFFFF",
  },
  searchInput: {
    backgroundColor: "#FFFFFF",
  },
  employeeList: {
    maxHeight: 600,
  },
  listContainer: {
    flex: 1,
    minHeight: 250,
    backgroundColor: "#FFFFFF",
  },
  emptyStateContainer: {
    minHeight: 250,
    justifyContent: "center",
    alignItems: "center",
  },
  employeeItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#FFFFFF",
  },
  employeeContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  },
  employeeItemFocused: {
    backgroundColor: "#f8fafc",
  },
  avatar: {
    marginRight: 12,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 14,
    color: "#1e293b",
    fontFamily: "Poppins-Medium",
  },
  employeeEmail: {
    fontSize: 12,
    color: "#64748b",
    fontFamily: "Poppins-Regular",
    marginTop: 2,
  },
  jobTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  jobTitleIcon: {
    margin: 0,
    padding: 0,
  },
  employeeJobTitle: {
    fontSize: 12,
    color: "#94a3b8",
    fontFamily: "Poppins-Regular",
    marginLeft: 4,
  },
  selectedIcon: {
    margin: 0,
  },
  errorContainer: {
    padding: 16,
    alignItems: "center",
    minHeight: 250,
    justifyContent: "center",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    marginBottom: 8,
    textAlign: "center",
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#1e293b",
    fontSize: 14,
    fontFamily: "Poppins-Medium",
  },
});

export default EmployeeSelector;
