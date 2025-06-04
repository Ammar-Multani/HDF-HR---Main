import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
  View,
  Dimensions,
  Easing,
} from "react-native";
import { Text, useTheme, IconButton } from "react-native-paper";
import { createTextStyle } from "../utils/globalStyles";
import { BlurView, BlurTint } from "expo-blur";

const { width } = Dimensions.get("window");

interface CustomSnackbarProps {
  visible: boolean;
  message: string;
  onDismiss: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
  duration?: number;
  style?: any;
  type?: "success" | "error" | "info" | "warning";
}

const CustomSnackbar: React.FC<CustomSnackbarProps> = ({
  visible,
  message,
  onDismiss,
  action,
  duration = 3000,
  style,
  type = "info",
}) => {
  const theme = useTheme();
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  const getSnackbarColor = () => {
    switch (type) {
      case "success":
        return { bg: "rgba(46, 213, 115, 0.95)", icon: "check-circle" };
      case "error":
        return { bg: "rgba(255, 71, 87, 0.95)", icon: "alert-circle" };
      case "warning":
        return { bg: "rgba(255, 177, 66, 0.95)", icon: "alert" };
      default:
        return { bg: "rgba(47, 128, 237, 0.95)", icon: "information" };
    }
  };

  useEffect(() => {
    if (visible) {
      showSnackbar();
    } else {
      hideSnackbar();
    }
  }, [visible]);

  const showSnackbar = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        easing: Easing.bezier(0.2, 0.8, 0.2, 1),
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();

    if (duration !== 0) {
      setTimeout(() => {
        onDismiss();
      }, duration);
    }
  };

  const hideSnackbar = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  if (!visible) return null;

  const { bg, icon } = getSnackbarColor();

  const Container = Platform.OS === "ios" ? BlurView : View;
  const containerProps =
    Platform.OS === "ios"
      ? {
          intensity: 50,
          tint: theme.dark ? ("dark" as BlurTint) : ("light" as BlurTint),
        }
      : {};

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }, { scale }],
          opacity,
        },
        style,
      ]}
    >
      <Container
        style={[
          styles.blurContainer,
          { backgroundColor: Platform.OS === "ios" ? "transparent" : bg },
        ]}
        {...containerProps}
      >
        <View style={styles.content}>
          <IconButton
            icon={icon}
            size={24}
            iconColor="#fff"
            style={styles.icon}
          />
          <Text style={[styles.message]} numberOfLines={2}>
            {message}
          </Text>
          {action && (
            <TouchableOpacity
              onPress={() => {
                action.onPress();
                onDismiss();
              }}
              style={styles.actionButton}
            >
              <Text style={styles.actionText}>{action.label}</Text>
            </TouchableOpacity>
          )}
        </View>
      </Container>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: Platform.OS === "web" ? 24 : 16,
    alignSelf: "center",
    width: Platform.OS === "web" ? 400 : width - 32,
    minHeight: 56,
    borderRadius: 25,
    overflow: "hidden",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    zIndex: 1000,
  },
  blurContainer: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: 16,
  },
  icon: {
    margin: 0,
    marginRight: 8,
    padding: 0,
  },
  message: {
    flex: 1,
    marginRight: 16,
    color: "#FFFFFF",
    ...createTextStyle({
      fontSize: 14,
      fontWeight: "500",
    }),
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  actionText: {
    color: "#FFFFFF",
    ...createTextStyle({
      fontSize: 13,
      fontWeight: "600",
      textTransform: "uppercase",
    }),
  },
});

export default CustomSnackbar;
