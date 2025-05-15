import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import {
  Text,
  Card,
  Searchbar,
  useTheme,
  FAB,
  Avatar,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../lib/supabase";
import AppHeader from "../../components/AppHeader";
import LoadingIndicator from "../../components/LoadingIndicator";
import EmptyState from "../../components/EmptyState";
import StatusBadge from "../../components/StatusBadge";
import { Admin, UserStatus } from "../../types";

const SuperAdminUsersScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
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

  const renderAdminItem = ({ item }: { item: Admin }) => (
    <TouchableOpacity
      onPress={() =>
        navigation.navigate(
          "SuperAdminDetails" as never,
          { adminId: item.id } as never
        )
      }
    >
      <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <View style={styles.userInfo}>
              <Avatar.Text
                size={40}
                label={getInitials(item.name || "", item.email)}
                style={{ backgroundColor: theme.colors.primary }}
              />
              <View style={styles.userTextContainer}>
                <Text style={styles.userName}>
                  {item.name || "Unnamed Admin"}
                </Text>
                <Text style={styles.userEmail}>{item.email}</Text>
              </View>
            </View>
            <StatusBadge status={item.status} />
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
      <AppHeader title="Super Admins" showBackButton />

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
              navigation.navigate("CreateSuperAdmin" as never);
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
        onPress={() => navigation.navigate("CreateSuperAdmin" as never)}
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
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  card: {
    marginBottom: 16,
    elevation: 0,
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
    fontWeight: "bold",
  },
  userEmail: {
    opacity: 0.7,
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
  },
});

export default SuperAdminUsersScreen;
