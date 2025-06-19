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
} from "react-native-paper";
import { supabase } from "../lib/supabase";
import debounce from "lodash/debounce";
import EmptyState from "./EmptyState";
import Color from "color";

interface Company {
  id: string;
  company_name: string;
  active: boolean;
}

interface CompanySelectorProps {
  onSelect: (company: Company) => void;
  selectedCompany: Company | null;
  error?: string;
  required?: boolean;
  label?: string;
}

const CompanySelector = ({
  onSelect,
  selectedCompany,
  error,
  required = false,
  label = "Select Company",
}: CompanySelectorProps) => {
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [focusedCompanyIndex, setFocusedCompanyIndex] = useState(-1);
  const [scaleAnim] = useState(new Animated.Value(1));

  // Create dynamic styles that depend on theme
  const dynamicStyles = StyleSheet.create({
    companyItemSelected: {
      backgroundColor: Color(theme.colors.primary).alpha(0.08).toString(),
    },
  });

  // Initial data loading
  useEffect(() => {
    if (modalVisible) {
      fetchInitialCompanies();
    }
  }, [modalVisible]);

  const fetchInitialCompanies = async () => {
    try {
      setLoading(true);
      setSearchError(null);
      const { data, error } = await supabase
        .from("company")
        .select("id, company_name, active")
        .eq("active", true)
        .order("company_name", { ascending: true })
        .limit(50);

      if (error) {
        console.error("Error fetching initial companies:", error);
        setSearchError("Failed to load companies. Please try again.");
        return;
      }

      setCompanies(data || []);
    } catch (error) {
      console.error("Error fetching initial companies:", error);
      setSearchError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Debounced search function
  const searchCompanies = useCallback(
    debounce(async (query: string) => {
      try {
        setLoading(true);
        setSearchError(null);
        const { data, error } = await supabase
          .from("company")
          .select("id, company_name, active")
          .eq("active", true)
          .ilike("company_name", `%${query}%`)
          .order("company_name", { ascending: true });

        if (error) {
          console.error("Error searching companies:", error);
          setSearchError("Failed to search companies. Please try again.");
          return;
        }

        setCompanies(data || []);
      } catch (error) {
        console.error("Error searching companies:", error);
        setSearchError("An unexpected error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  useEffect(() => {
    if (modalVisible) {
      searchCompanies(searchQuery);
    }
  }, [searchQuery, modalVisible]);

  const handleSelect = (company: Company) => {
    onSelect(company);
    setModalVisible(false);
    setSearchQuery("");
    setFocusedCompanyIndex(-1);
  };

  const handleKeyPress = (e: KeyboardEvent) => {
    if (!modalVisible) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedCompanyIndex((prev) =>
          prev < companies.length - 1 ? prev + 1 : prev
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedCompanyIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case "Enter":
        if (
          focusedCompanyIndex >= 0 &&
          focusedCompanyIndex < companies.length
        ) {
          handleSelect(companies[focusedCompanyIndex]);
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
  }, [modalVisible, focusedCompanyIndex, companies]);

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

  const renderCompanyItem = (company: Company, index: number) => {
    const isSelected = selectedCompany?.id === company.id;
    const isFocused = focusedCompanyIndex === index;

    return (
      <TouchableOpacity
        key={company.id}
        style={[
          styles.companyItem,
          isFocused && styles.companyItemFocused,
          isSelected && dynamicStyles.companyItemSelected,
        ]}
        onPress={() => handleSelect(company)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <View style={styles.companyContent}>
          <View style={styles.companyInfo}>
            <View style={styles.companyNameContainer}>
              <IconButton
                icon="office-building"
                size={20}
                iconColor={isSelected ? theme.colors.primary : "#64748b"}
                style={styles.companyIcon}
              />
              <Text
                style={[
                  styles.companyName,
                  isSelected && { color: theme.colors.primary },
                ]}
                numberOfLines={1}
              >
                {company.company_name}
              </Text>
            </View>
          </View>
          {isSelected && (
            <IconButton
              icon="check-circle"
              size={24}
              iconColor={theme.colors.primary}
              style={styles.selectedIcon}
            />
          )}
        </View>
      </TouchableOpacity>
    );
  };

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
              !selectedCompany && styles.selectorEmpty,
            ]}
          >
            <View style={styles.selectedContent}>
              {selectedCompany ? (
                <View style={styles.selectedCompany}>
                  <IconButton
                    icon="office-building"
                    size={24}
                    iconColor={theme.colors.primary}
                    style={styles.selectedCompanyIcon}
                  />
                  <View style={styles.selectedInfo}>
                    <Text style={styles.selectedName} numberOfLines={1}>
                      {selectedCompany.company_name}
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={styles.placeholderContainer}>
                  <IconButton icon="office-building" size={24} />
                  <Text style={styles.placeholder}>Select a company</Text>
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
            setFocusedCompanyIndex(-1);
          }}
          contentContainerStyle={styles.modalContainer}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.modalContent}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Company</Text>
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
                placeholder="Search companies..."
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

            <View style={styles.listContainer}>
              {searchError ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{searchError}</Text>
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={() =>
                      searchQuery
                        ? searchCompanies(searchQuery)
                        : fetchInitialCompanies()
                    }
                  >
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <ScrollView style={styles.companyList}>
                  {companies.length === 0 ? (
                    <View style={styles.emptyStateContainer}>
                      <EmptyState
                        icon="office-building"
                        title="No Companies Found"
                        message={
                          searchQuery
                            ? "Try a different search term"
                            : "No companies available"
                        }
                      />
                    </View>
                  ) : (
                    companies.map((company, index) =>
                      renderCompanyItem(company, index)
                    )
                  )}
                </ScrollView>
              )}
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
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
  selectedCompany: {
    flexDirection: "row",
    alignItems: "center",
  },
  selectedCompanyIcon: {
    margin: 0,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedName: {
    fontSize: 14,
    color: "#1e293b",
    fontFamily: "Poppins-Medium",
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
    maxHeight: "90%",
    minHeight: 400,
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
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
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
  listContainer: {
    flex: 1,
    minHeight: 250,
    backgroundColor: "#FFFFFF",
  },
  companyList: {
    maxHeight: 600,
  },
  emptyStateContainer: {
    minHeight: 250,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    padding: 24,
  },
  errorContainer: {
    padding: 16,
    alignItems: "center",
    minHeight: 250,
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
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
  companyItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    backgroundColor: "#FFFFFF",
  },
  companyContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 8,
  },
  companyItemFocused: {
    backgroundColor: "#f8fafc",
  },
  companyInfo: {
    flex: 1,
    marginRight: 16,
  },
  companyNameContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  companyIcon: {
    margin: 0,
  },
  companyName: {
    fontSize: 14,
    color: "#1e293b",
    fontFamily: "Poppins-Medium",
    marginLeft: 4,
    flex: 1,
  },
  selectedIcon: {
    margin: 0,
  },
});

export default CompanySelector;
