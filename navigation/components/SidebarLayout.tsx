import React, { ReactNode } from "react";
import { View, StyleSheet, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { NavItem } from "./NavItem";
import { MaterialCommunityIcons } from "@expo/vector-icons";

interface SidebarLayoutProps {
  activeScreen: string;
  setActiveScreen: (screen: string) => void;
  navigationItems: Array<{
    icon: keyof typeof MaterialCommunityIcons.glyphMap;
    label: string;
    screen: string;
  }>;
  content: { [key: string]: ReactNode };
}

export const SidebarLayout = ({
  activeScreen,
  setActiveScreen,
  navigationItems,
  content,
}: SidebarLayoutProps) => {
  return (
    <View style={styles.container}>
      {/* Sidebar Navigation */}
      <View style={styles.sidebar}>
        {/* Background gradient */}
        <LinearGradient
          colors={[
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
              onPress={() => setActiveScreen(item.screen)}
            />
          ))}
        </View>
      </View>

      {/* Main Content */}
      <View style={styles.content}>{content[activeScreen]}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    height: "100%",
  },
  sidebar: {
    width: 220,
    height: "100%",
    backgroundColor: "transparent",
    paddingTop: 20,
    paddingBottom: 20,
    borderRightWidth: 0,
    position: "relative",
  },
  logoContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    marginBottom: 10,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  logoWrapper: {
    width: 150,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 160,
    height: 120,
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
