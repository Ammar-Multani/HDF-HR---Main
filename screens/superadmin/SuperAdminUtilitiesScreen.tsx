import React from "react";
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Platform,
  ScrollView,
  ImageBackground,
  Dimensions,
} from "react-native";
import { useTheme, Surface } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AppHeader from "../../components/AppHeader";
import Text from "../../components/Text";
import { useTranslation } from "react-i18next";
import { LinearGradient } from "expo-linear-gradient";

// Get screen dimensions
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_MARGIN = 10;
const CARD_WIDTH =
  Platform.OS === "web"
    ? Math.min(450, (SCREEN_WIDTH - CARD_MARGIN * 4) / 2) // 2 columns on web
    : SCREEN_WIDTH - CARD_MARGIN * 2; // 1 column on mobile

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
    {
      id: "users",
      title: "Users",
      description:
        "Manage and oversee all user accounts, roles and permissions across companies",
      icon: "account-group",
      color: "#9C27B0",
      gradientColors: ["#9C27B0", "#BA68C8"] as const,
      screen: "UsersList",
      badge: "Analytics",
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
        style={[
          styles.card,
          {
            backgroundColor: "#FFFFFF",
            borderWidth: 0.5,
            borderColor: "#e0e0e0",
            width: CARD_WIDTH,
            margin: CARD_MARGIN / 2,
          },
        ]}
        elevation={0}
      >
        <TouchableOpacity
          style={styles.cardTouchable}
          onPress={() => {
            if (card.id === "receipt") {
              //@ts-ignore
              navigation.navigate("ReceiptsListScreen");
            } else if (card.id === "users") {
              //@ts-ignore
              navigation.navigate("UsersList");
            } else {
              //@ts-ignore
              navigation.navigate(card.screen);
            }
          }}
        >
          <View style={styles.badgeContainer}>
            <LinearGradient
              colors={["rgba(255,255,255,0.9)", "rgba(255,255,255,0.7)"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.badgeGradient}
            >
              <Text style={styles.badgeText}>{card.badge}</Text>
            </LinearGradient>
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
              <Text style={styles.cardDescription} numberOfLines={2}>
                {card.description}
              </Text>
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

      <View style={styles.mainContainer}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={true}
          overScrollMode="always"
        >
          <View style={styles.cardsContainer}>
            {utilityCards.map((card, index) => renderUtilityCard(card, index))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  mainContainer: {
    flex: 1,
    width: "100%",
  },
  scrollView: {
    flex: 1,
    width: "100%",
    backgroundColor: "#F8F9FA",
  },
  content: {
    padding: CARD_MARGIN / 2,
    paddingTop: CARD_MARGIN,
    minHeight: "100%",
  },
  cardsContainer: {
    flexDirection: Platform.OS === "web" ? "row" : "column",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    alignItems: "center",
    width: "100%",
  },
  card: {
    borderRadius: 16,
    height: 150,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    backgroundColor: "#FFFFFF",
    width: CARD_WIDTH,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {},
      web: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
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
    zIndex: 1,
  },
  badgeGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(19, 19, 19, 0.13)",
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
    lineHeight: 20,
  },
  cardFooter: {
    position: "absolute",
    bottom: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    marginTop: 16,
  },
  viewText: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    marginRight: 6,
  },
});

export default SuperAdminUtilitiesScreen;
