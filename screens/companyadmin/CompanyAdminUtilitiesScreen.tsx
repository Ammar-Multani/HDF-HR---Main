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
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

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
  gradientColors: [string, string];
  screen: string;
  badge: string;
}

const CompanyAdminUtilitiesScreen = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { user } = useAuth();
  const [canUploadReceipts, setCanUploadReceipts] = React.useState(false);

  React.useEffect(() => {
    fetchCompanyPermissions();
  }, []);

  const fetchCompanyPermissions = async () => {
    if (!user) return;

    try {
      const { data: companyUser, error: companyUserError } = await supabase
        .from("company_user")
        .select("company_id, company:company_id(can_upload_receipts)")
        .eq("id", user.id)
        .single();

      if (companyUserError) throw companyUserError;

      if (companyUser) {
        // Properly access the can_upload_receipts property
        const can_upload = companyUser.company
          ? (companyUser.company as any).can_upload_receipts
          : false;
        setCanUploadReceipts(can_upload ?? false);
      }
    } catch (error) {
      console.error("Error fetching company permissions:", error);
    }
  };

  // Navigation cards for the utilities with enhanced details
  const getUtilityCards = (): UtilityCard[] => {
    const baseCards = [
      {
        id: "tasks",
        title: t("companyAdmin.utilities.tasks") || "Tasks Management",
        description:
          t("companyAdmin.utilities.tasksDescription") ||
          "Create, view and manage company tasks",
        icon: "clipboard-text-outline",
        color: "#1a73e8",
        gradientColors: ["#1a73e8", "#6da3f1"] as [string, string],
        screen: "TasksScreen",
        badge: "Essential",
      },
      {
        id: "forms",
        title: t("companyAdmin.utilities.forms") || "Forms & Reports",
        description:
          t("companyAdmin.utilities.formsDescription") ||
          "View and manage submitted forms and reports",
        icon: "file-document-outline",
        color: "#4CAF50",
        gradientColors: ["#4CAF50", "#8BC34A"] as [string, string],
        screen: "FormSubmissionsScreen",
        badge: "Data",
      },
    ];

    // Conditionally add receipt management based on permissions
    if (canUploadReceipts) {
      baseCards.push({
        id: "receipt",
        title: t("companyAdmin.utilities.receipt") || "Receipt Management",
        description:
          t("companyAdmin.utilities.receiptDescription") ||
          "Create, scan and manage company receipts",
        icon: "receipt",
        color: "#E91E63",
        gradientColors: ["#E91E63", "#F48FB1"] as [string, string],
        screen: "ReceiptsScreen",
        badge: "Scanner",
      });
    }

    baseCards.push({
      id: "activity",
      title: t("companyAdmin.utilities.activity") || "Activity Logs",
      description:
        t("companyAdmin.utilities.activityDescription") ||
        "View activity logs and recent changes within your company",
      icon: "history",
      color: "#FF9800",
      gradientColors: ["#FF9800", "#FFC107"] as [string, string],
      screen: "ActivityLogs",
      badge: "Logs",
    });

    return baseCards;
  };

  const utilityCards = getUtilityCards();

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
            //@ts-ignore
            navigation.navigate(card.screen);
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
                name={card.icon as keyof typeof MaterialCommunityIcons.glyphMap}
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
        title={t("companyAdmin.utilities.title") || "Utilities"}
        subtitle="Manage and access essential company tools"
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
    paddingBottom: 100,
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

export default CompanyAdminUtilitiesScreen;
