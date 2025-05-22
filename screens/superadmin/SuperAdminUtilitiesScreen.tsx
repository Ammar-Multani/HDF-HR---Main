import React from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
  ScrollView,
} from "react-native";
import { useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppHeader from "../../components/AppHeader";
import Text from "../../components/Text";
import { useTranslation } from "react-i18next";

const SuperAdminUtilitiesScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { t } = useTranslation();

  // Navigation cards for the utilities
  const utilityCards = [
    {
      id: "tasks",
      title: t("superAdmin.utilities.tasks") || "Tasks Management",
      description:
        t("superAdmin.utilities.tasksDescription") ||
        "Create, view and manage all tasks across companies",
      icon: "clipboard-text-outline",
      color: "#1a73e8",
      screen: "SuperAdminTasksScreen",
    },
    {
      id: "forms",
      title: t("superAdmin.utilities.forms") || "Forms & Reports",
      description:
        t("superAdmin.utilities.formsDescription") ||
        "View and manage all submitted forms and reports",
      icon: "file-document-outline",
      color: "#4CAF50",
      screen: "SuperAdminFormsScreen",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title={t("superAdmin.utilities.title") || "Utilities"}
        showBackButton={false}
        showHelpButton={true}
        showProfileMenu={false}
        showLogo={false}
        showTitle={true}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
      >
        <Text variant="bold" style={styles.pageTitle}>
          {t("superAdmin.utilities.selectOption") || "Select an option"}
        </Text>

        <View style={styles.cardsContainer}>
          {utilityCards.map((card) => (
            <TouchableOpacity
              key={card.id}
              style={styles.card}
              onPress={() => {
                // Navigate to the selected screen when the card is pressed
                //@ts-ignore
                navigation.navigate(card.screen);
              }}
            >
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: `${card.color}15` },
                ]}
              >
                <MaterialCommunityIcons
                  name={card.icon}
                  size={40}
                  color={card.color}
                />
              </View>
              <View style={styles.cardContent}>
                <Text variant="bold" style={styles.cardTitle}>
                  {card.title}
                </Text>
                <Text style={styles.cardDescription}>{card.description}</Text>
              </View>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color="#757575"
                style={styles.chevron}
              />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 8,
  },
  pageTitle: {
    fontSize: 18,
    marginBottom: 24,
    marginLeft: 8,
    color: "#424242",
  },
  cardsContainer: {
    marginBottom: 24,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    marginBottom: 4,
    color: "#212121",
  },
  cardDescription: {
    fontSize: 14,
    color: "#757575",
    lineHeight: 20,
  },
  chevron: {
    marginLeft: 8,
  },
});

export default SuperAdminUtilitiesScreen;
