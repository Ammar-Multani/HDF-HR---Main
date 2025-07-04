import React, { ReactNode, useEffect } from "react";
import { View, StyleSheet, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { NavItem } from "./NavItem";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { RootStackParamList } from "../types";

const ACTIVE_SCREEN_KEY = "@active_screen";

interface NavigationItem {
  icon: string;
  label: string;
  screen: keyof RootStackParamList;
}

interface SidebarLayoutProps {
  activeScreen: keyof RootStackParamList;
  setActiveScreen: (screen: keyof RootStackParamList) => void;
  navigationItems: readonly NavigationItem[];
  content: ReactNode;
  onNavigate: (screen: keyof RootStackParamList) => void;
}

export const SidebarLayout: React.FC<SidebarLayoutProps> = ({
  activeScreen,
  setActiveScreen,
  navigationItems,
  content,
  onNavigate,
}) => {
  // Load saved active screen on mount
  useEffect(() => {
    const loadActiveScreen = async () => {
      try {
        const savedScreen = await AsyncStorage.getItem(ACTIVE_SCREEN_KEY);
        if (
          savedScreen &&
          navigationItems.some((item) => item.screen === savedScreen)
        ) {
          setActiveScreen(savedScreen);
          onNavigate(savedScreen);
        }
      } catch (err) {
        console.warn("Failed to load active screen:", err);
      }
    };

    loadActiveScreen();
  }, []);

  // Save active screen when it changes
  useEffect(() => {
    const saveActiveScreen = async () => {
      try {
        await AsyncStorage.setItem(ACTIVE_SCREEN_KEY, activeScreen);
      } catch (err) {
        console.warn("Failed to save active screen:", err);
      }
    };

    if (activeScreen) {
      saveActiveScreen();
    }
  }, [activeScreen]);

  // Handle navigation and active screen update
  const handleScreenChange = async (screen: keyof RootStackParamList) => {
    setActiveScreen(screen);
    onNavigate(screen);
    try {
      await AsyncStorage.setItem(ACTIVE_SCREEN_KEY, screen);
    } catch (err) {
      console.warn("Failed to save active screen:", err);
    }
  };

  return (
    <View style={styles.container}>
      {/* Sidebar Navigation */}
      <View style={styles.sidebar}>
        {/* Background gradient */}
        <LinearGradient
          colors={[
            "rgba(10,185,129,255)",
            "rgba(6,169,169,255)",
            "rgba(38,127,161,255)",
            "rgba(54,105,157,255)",
            "rgba(74,78,153,255)",
            "rgba(94,52,149,255)",
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />

        {/* Logo at the top */}
        <View style={styles.logoContainer}>
          <View style={styles.logoWrapper}>
            <Image
              source={require("../../assets/splash-icon-mono.png")}
              style={styles.logo}
            />
          </View>
        </View>

        {/* Navigation Items */}
        <View style={styles.navItemsContainer}>
          {navigationItems.map((item) => (
            <NavItem
              key={item.screen}
              icon={item.icon}
              label={item.label}
              isActive={activeScreen === item.screen}
              onPress={() => handleScreenChange(item.screen)}
            />
          ))}
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>{content}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    height: "100%",
  },
  sidebar: {
    width: 210,
    height: "100%",
    backgroundColor: "transparent",
    paddingTop: 20,
    paddingBottom: 20,
    borderRightWidth: 0,
    position: "relative",
  },
  logoContainer: {
    paddingHorizontal: 20,
    paddingVertical: 29,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  logoWrapper: {
    width: 160,
    height: 70,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 170,
    height: 130,
    resizeMode: "contain",
    alignSelf: "center",
  },
  navItemsContainer: {
    paddingLeft: 20,
    paddingRight: 20,
    marginTop: 20,
  },
  content: {
    flex: 1,
  },
});
