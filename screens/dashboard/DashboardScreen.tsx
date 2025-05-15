import React from "react";
import { StyleSheet, View, ScrollView, StatusBar } from "react-native";
import { Text, useTheme, Surface, Button } from "react-native-paper";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import AppHeader from "../../components/AppHeader";
import { useAuth } from "../../contexts/AuthContext";

const DashboardScreen = () => {
  const theme = useTheme();
  const { user, signOut } = useAuth();

  const getGradientColors = () => {
    return theme.dark
      ? (["#151729", "#2a2e43"] as const)
      : (["#f0f8ff", "#e6f2ff"] as const);
  };

  return (
    <>
      <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
      <LinearGradient
        colors={getGradientColors()}
        style={styles.container}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <AppHeader
          showProfileMenu={true}
          userEmail={user?.email || ""}
          isAdmin={user?.role === "admin"}
          onSignOut={signOut}
          title="Dashboard"
          absolute={true}
        />

        <SafeAreaView style={styles.content} edges={["bottom"]}>
          <ScrollView
            contentContainerStyle={styles.scrollViewContent}
            showsVerticalScrollIndicator={false}
          >
            <Surface style={styles.welcomeCard}>
              <Text variant="headlineMedium" style={styles.welcomeText}>
                Welcome, {user?.email?.split("@")[0] || "User"}!
              </Text>
              <Text variant="bodyLarge" style={styles.subtitleText}>
                This is your dashboard. You can access all your HR tools here.
              </Text>
            </Surface>

            <View style={styles.cardGrid}>
              <Surface style={styles.card}>
                <Text variant="titleMedium">Payroll</Text>
                <Button mode="contained-tonal" style={styles.cardButton}>
                  View
                </Button>
              </Surface>

              <Surface style={styles.card}>
                <Text variant="titleMedium">Time Off</Text>
                <Button mode="contained-tonal" style={styles.cardButton}>
                  Request
                </Button>
              </Surface>

              <Surface style={styles.card}>
                <Text variant="titleMedium">Benefits</Text>
                <Button mode="contained-tonal" style={styles.cardButton}>
                  Manage
                </Button>
              </Surface>

              <Surface style={styles.card}>
                <Text variant="titleMedium">Performance</Text>
                <Button mode="contained-tonal" style={styles.cardButton}>
                  View
                </Button>
              </Surface>
            </View>
          </ScrollView>
        </SafeAreaView>
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    marginTop: 60, // Space for header
  },
  scrollViewContent: {
    padding: 16,
  },
  welcomeCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    elevation: 0,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
  },
  welcomeText: {
    marginBottom: 8,
    fontWeight: "bold",
  },
  subtitleText: {
    opacity: 0.7,
  },
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  card: {
    width: "48%",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 0,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    alignItems: "center",
  },
  cardButton: {
    marginTop: 12,
    width: "100%",
  },
});

export default DashboardScreen;
