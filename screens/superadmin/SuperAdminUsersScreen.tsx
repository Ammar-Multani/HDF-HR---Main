import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import {
  Card,
  Searchbar,
  useTheme,
  FAB,
  Avatar,
  Chip,
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
import { Admin, UserStatus } from "../../types";
import Text from "../../components/Text";
import { LinearGradient } from "expo-linear-gradient";

const SuperAdminUsersScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredAdmins, setFilteredAdmins] = useState<Admin[]>([]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("admin")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching admins:", error);
        return;
      }

      setAdmins(data || []);
      setFilteredAdmins(data || []);
    } catch (error) {
      console.error("Error fetching admins:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredAdmins(admins);
    } else {
      const filtered = admins.filter(
        (admin) =>
          admin.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          admin.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredAdmins(filtered);
    }
  }, [searchQuery, admins]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAdmins();
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

  // Render a status chip instead of using StatusBadge component
  const renderStatusChip = (status?: UserStatus) => {
    if (!status) return null;

    let color;
    switch (status) {
      case UserStatus.ACTIVE:
        color = "#4CAF50"; // Green
        break;
      case UserStatus.INACTIVE:
        color = "#757575"; // Grey
        break;
      default:
        color = theme.colors.primary;
    }

    return (
      <Chip
        style={{ backgroundColor: color + "20" }}
        textStyle={{ color: color, fontFamily: "Poppins-Medium" }}
      >
        {typeof status === "string" && status.length > 0
          ? status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
          : "Unknown"}
      </Chip>
    );
  };

  const renderAdminItem = ({ item }: { item: Admin }) => (
    <TouchableOpacity
      onPress={() => {
        // We need to fix the navigation type - this is a temporary workaround
        // TODO: Add a SuperAdminDetails screen and proper navigation type
        console.log("Admin selected:", item.id);
        // navigation.navigate("SuperAdminDetails", { adminId: item.id });
      }}
    >
      <Card
        style={[
          styles.card,
          {
            backgroundColor: "#FFFFFF",
            shadowColor: "transparent",
          },
        ]}
        elevation={0}
      >
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.userInfo}>
              <Avatar.Text
                size={40}
                label={getInitials(item.name || "", item.email)}
                style={{ backgroundColor: "rgba(54,105,157,255)" }}
              />
              <View style={styles.userTextContainer}>
                <Text variant="bold" style={styles.userName}>
                  {item.name || "Unnamed Admin"}
                </Text>
                <Text style={styles.userEmail}>{item.email}</Text>
              </View>
            </View>
            {item.status ? renderStatusChip(item.status) : null}
          </View>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  if (loading && !refreshing) {
    return <LoadingIndicator />;
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <AppHeader
        title="Super Admins"
        showBackButton={false}
        showLogo={false}
        subtitle="Manage super admin users"
      />

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search super admins..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
        />
      </View>

      {filteredAdmins.length === 0 ? (
        <EmptyState
          icon="account-off"
          title="No Super Admins Found"
          message={
            searchQuery
              ? "No super admins match your search criteria."
              : "You haven't added any super admins yet."
          }
          buttonTitle={searchQuery ? "Clear Search" : "Add Super Admin"}
          onButtonPress={() => {
            if (searchQuery) {
              setSearchQuery("");
            } else {
              navigation.navigate("CreateSuperAdmin");
            }
          }}
        />
      ) : (
        <FlatList
          data={filteredAdmins}
          renderItem={renderAdminItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}

      <FAB
        icon="plus"
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => navigation.navigate("CreateSuperAdmin")}
        color={theme.colors.surface}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchbar: {
    elevation: 0,
    borderRadius: 18,
    height: 60,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 100,
  },
  card: {
    marginBottom: 16,
    elevation: 0,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    color: "#333",
  },
  userEmail: {
    opacity: 0.7,
    color: "#666",
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 80,
  },
});

export default SuperAdminUsersScreen;
