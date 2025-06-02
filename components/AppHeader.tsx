import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import {
  useTheme,
  IconButton,
  Tooltip,
  Menu,
  Avatar,
  Divider,
} from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import Text from "./Text";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";

interface AppHeaderProps {
  showBackButton?: boolean;
  showHelpButton?: boolean;
  showProfileMenu?: boolean;
  title?: string;
  subtitle?: string;
  rightComponent?: React.ReactNode;
  onBackPress?: () => void;
  onHelpPress?: () => void;
  onSignOut?: () => void;
  onProfilePress?: () => void;
  disableNavigation?: boolean;
  showLogo?: boolean;
  showTitle?: boolean;
  absolute?: boolean;
  userEmail?: string;
  isAdmin?: boolean;
}

const AppHeader = ({
  showBackButton = false,
  showHelpButton = false,
  showProfileMenu = false,
  title = "",
  subtitle = "",
  rightComponent,
  onBackPress,
  onHelpPress,
  onSignOut,
  onProfilePress,
  disableNavigation = false,
  showLogo = true,
  showTitle = true,
  absolute = false,
  userEmail = "",
  isAdmin = false,
}: AppHeaderProps) => {
  const theme = useTheme();
  const [menuVisible, setMenuVisible] = useState(false);
  let navigationObject = null;

  // Only use navigation if not disabled (prevents errors in screens outside navigation container)
  if (!disableNavigation) {
    try {
      navigationObject = useNavigation();
    } catch (error) {
      console.log("Navigation not available in this context");
    }
  }

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else if (navigationObject) {
      navigationObject.goBack();
    } else {
      console.log("Back navigation not available");
    }
  };

  const handleHelpPress = () => {
    if (onHelpPress) {
      onHelpPress();
    } else {
      // Default help action if no handler provided
      console.log("Help pressed");
    }
  };

  const handleProfilePress = () => {
    setMenuVisible(false);
    if (onProfilePress) {
      onProfilePress();
    } else if (navigationObject) {
      navigationObject.navigate("Profile" as never);
    }
  };

  const handleSignOut = () => {
    setMenuVisible(false);
    if (onSignOut) {
      onSignOut();
    }
  };

  const handleAvatarPress = () => {
    if (onProfilePress) {
      onProfilePress();
    } else if (navigationObject) {
      if (isAdmin === true) {
        navigationObject.navigate("Profile" as never);
      } else if (isAdmin === undefined) {
        navigationObject.navigate("Profile" as never);
      } else {
        navigationObject.navigate("Profile" as never);
      }
    } else {
      console.log("Navigation not available");
    }
  };

  const getInitials = () => {
    if (!userEmail) return "?";
    return userEmail.charAt(0).toUpperCase();
  };

  const headerContent = (
    <View
      style={[
        styles.headerContainer,
        absolute && styles.headerAbsolute,
        {
          backgroundColor: theme.colors.background,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
    >
      <View style={styles.leftSection}>
        {showBackButton && (
          <IconButton
            icon="arrow-left"
            iconColor={theme.colors.primary}
            size={24}
            onPress={handleBackPress}
            style={styles.backButton}
          />
        )}
        <View style={styles.logoWrapper}>
          {showLogo && (
            <Image
              source={
                theme.dark
                  ? require("../assets/splash-icon-light.png")
                  : require("../assets/splash-icon-dark.png")
              }
              style={[styles.logo, { marginRight: showTitle ? 8 : 0 }]}
              resizeMode="contain"
            />
          )}
          {showTitle && (
            <View style={styles.titleContainer}>
              <Text
                variant="bold"
                style={[styles.logoText, { color: theme.colors.onBackground }]}
              >
                {title}
              </Text>
              {subtitle ? (
                <Text
                  style={[
                    styles.subtitleText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {subtitle.length > 20
                    ? `${subtitle.substring(0, 55)}...`
                    : subtitle}
                </Text>
              ) : null}
            </View>
          )}
        </View>
      </View>

      <View style={styles.rightSection}>
        {rightComponent}
        {showHelpButton && (
          <Tooltip title="Get help">
            <IconButton
              icon="help-circle"
              iconColor={theme.colors.onSurfaceVariant}
              size={24}
              onPress={handleHelpPress}
              style={styles.helpButton}
            />
          </Tooltip>
        )}
        {showProfileMenu && (
          <TouchableOpacity onPress={handleAvatarPress}>
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={[
                  "rgba(6,169,169,255)",
                  "rgba(38,127,161,255)",
                  "rgba(54,105,157,255)",
                  "rgba(74,78,153,255)",
                  "rgba(94,52,149,255)",
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.avatarGradient]}
              >
                <Text style={styles.avatarText}>{getInitials()}</Text>
              </LinearGradient>
            </View>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Use SafeAreaView if absolute positioning to handle device notches
  if (absolute) {
    return (
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <StatusBar barStyle={theme.dark ? "light-content" : "dark-content"} />
        {headerContent}
      </SafeAreaView>
    );
  }

  return headerContent;
};

const styles = StyleSheet.create({
  safeArea: {
    width: "100%",
    zIndex: 1000,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    paddingVertical: 8,
    paddingHorizontal: 12,
    height: 70,
    borderBottomWidth: 0.4,
  },
  headerAbsolute: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 120,
    height: 100,
  },
  titleContainer: {
    flexDirection: "column",
    justifyContent: "center",
  },
  logoText: {
    fontSize: 20,
    marginLeft: 10,
  },
  subtitleText: {
    fontSize: 11,
    marginLeft: 10,
  },
  backButton: {
    margin: 0,
    marginRight: 4,
  },
  helpButton: {
    margin: 0,
  },
  avatarContainer: {
    marginLeft: 8,
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: "hidden",
  },
  avatarGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontFamily: "Poppins-Bold",
  },
});

export default AppHeader;
