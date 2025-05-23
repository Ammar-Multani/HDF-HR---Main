import React from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
  ScrollView,
  ImageBackground,
} from "react-native";
import { useTheme, Surface, Divider } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppHeader from "../../components/AppHeader";
import Text from "../../components/Text";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";

// Define the type for utility card items
interface UtilityCard {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  gradientColors: readonly [string, string, ...string[]];
  screen: string;
  badge: string;
}

const SuperAdminUtilitiesScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { t } = useTranslation();

  // Navigation cards for the utilities with enhanced details
  const utilityCards: UtilityCard[] = [
    {
      id: "tasks",
      title: t("superAdmin.utilities.tasks") || "Tasks Management",
      description:
        t("superAdmin.utilities.tasksDescription") ||
        "Create, view and manage all tasks across companies",
      icon: "clipboard-text-outline",
      color: "#1a73e8",
      gradientColors: ["#1a73e8", "#6da3f1"] as const,
      screen: "SuperAdminTasksScreen",
      badge: "Essential",
    },
    {
      id: "forms",
      title: t("superAdmin.utilities.forms") || "Forms & Reports",
      description:
        t("superAdmin.utilities.formsDescription") ||
        "View and manage all submitted forms and reports",
      icon: "file-document-outline",
      color: "#4CAF50",
      gradientColors: ["#4CAF50", "#8BC34A"] as const,
      screen: "SuperAdminFormsScreen",
      badge: "Data",
    },
    {
      id: "receipt",
      title: t("superAdmin.utilities.receipt") || "Receipt Management",
      description:
        t("superAdmin.utilities.receiptDescription") ||
        "Create, scan and manage receipts across companies",
      icon: "receipt",
      color: "#E91E63",
      gradientColors: ["#E91E63", "#F48FB1"] as const,
      screen: "ReceiptsListScreen",
      badge: "Scanner",
    },
    // {
    //   id: "reports",
    //   title: "Analytics Dashboard",
    //   description:
    //     "View comprehensive analytics and reports across all companies",
    //   icon: "chart-bar",
    //   color: "#9C27B0",
    //   gradientColors: ["#9C27B0", "#BA68C8"] as const,
    //   screen: "SuperAdminAnalyticsScreen",
    //   badge: "Analytics",
    // },
    // {
    //   id: "notifications",
    //   title: "Notification Center",
    //   description: "Manage global notifications and alerts for all users",
    //   icon: "bell-outline",
    //   color: "#FF9800",
    //   gradientColors: ["#FF9800", "#FFC107"] as const,
    //   screen: "SuperAdminNotificationsScreen",
    //   badge: "Comms",
    // },
  ];

  const renderUtilityCard = (card: UtilityCard, index: number) => {
    return (
      <Surface
        key={card.id}
        style={[styles.card, { backgroundColor: "#FFFFFF" }]}
      >
        <TouchableOpacity
          style={styles.cardTouchable}
          onPress={() => {
            // Navigate to the selected screen when the card is pressed
            if (card.id === "receipt") {
              //@ts-ignore
              navigation.navigate("ReceiptsListScreen");
            } else {
              //@ts-ignore
              navigation.navigate(card.screen);
            }
          }}
        >
          <View style={styles.badgeContainer}>
            <Text style={styles.badgeText}>{card.badge}</Text>
          </View>

          <View style={styles.cardMainContent}>
            <LinearGradient
              colors={card.gradientColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.iconContainer}
            >
              <MaterialCommunityIcons
                name={card.icon as any}
                size={28}
                color="#FFFFFF"
              />
            </LinearGradient>

            <View style={styles.cardContent}>
              <Text variant="bold" style={styles.cardTitle}>
                {card.title}
              </Text>
              <Text style={styles.cardDescription}>{card.description}</Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <Text style={[styles.viewText, { color: card.color }]}>OPEN</Text>
            <MaterialCommunityIcons
              name="arrow-right"
              size={20}
              color={card.color}
            />
          </View>
        </TouchableOpacity>
      </Surface>
    );
  };

  return (
    <SafeAreaView
    style={[styles.container, { backgroundColor: theme.colors.background }]}
  >
      <AppHeader
        title={t("superAdmin.utilities.title") || "Utilities"}
        subtitle="Manage and access essential system tools"
        showBackButton={false}
        showHelpButton={true}
        showProfileMenu={false}
        showLogo={false}
        showTitle={true}
      />

      <ScrollView
        style={[styles.scrollView, { backgroundColor: theme.colors.backgroundSecondary }]}
        contentContainerStyle={styles.content}
      >
        {/* <View style={styles.headerSection}>
          <Text variant="bold" style={styles.pageTitle}>
            {t("superAdmin.utilities.selectOption") || "System Utilities"}
          </Text>
          <Text style={styles.pageSubtitle}>
            Manage and access essential system tools
          </Text>
        </View> */}

        <View style={styles.cardsContainer}>
          {utilityCards.map((card, index) => renderUtilityCard(card, index))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 8,
  },
  headerSection: {
    marginBottom: 2,
    marginLeft: 8,
  },
  pageTitle: {
    fontSize: 17,
    color: "#E91E63",
    marginBottom: 0,
  },
  pageSubtitle: {
    fontSize: 16,
    color: "#757575",
    marginBottom: 10,
  },
  cardsContainer: {
    marginBottom: 24,
    flexDirection: "column",
    width: "100%",
    justifyContent: "space-between",
    marginTop: 10,
  },
  card: {
    borderRadius: 16,
    marginBottom: 16,
    width: "100%",
    height: 150,
    overflow: "hidden",
    borderWidth: Platform.OS === "ios" ? 0 : 1,
    borderColor: "#EEEEEE",
  },
  cardTouchable: {
    padding: 20,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    position: "relative",
  },
  badgeContainer: {
    position: "absolute",
    top: 15,
    right: 15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#F1F3F4",
    zIndex: 1,
  },
  badgeText: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
    color: "#616161",
  },
  cardMainContent: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  cardContent: {
    flex: 1,
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 18,
    marginBottom: 6,
    color: "#212121",
  },
  cardDescription: {
    fontSize: 14,
    color: "#757575",
    lineHeight: 22,
  },
  cardFooter: {
    position: "absolute",
    bottom: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
  },
  viewText: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    marginRight: 6,
  },
});

export default SuperAdminUtilitiesScreen;
