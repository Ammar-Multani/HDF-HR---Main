import React, { useEffect, useRef } from "react";
import {
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
  View,
  Dimensions,
} from "react-native";
import { Text, useTheme } from "react-native-paper";
import { createTextStyle } from "../utils/globalStyles";

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
}

const CustomSnackbar: React.FC<CustomSnackbarProps> = ({
  visible,
  message,
  onDismiss,
  action,
  duration = 3000,
  style,
}) => {
  const theme = useTheme();
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

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
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
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
    ]).start();
  };

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
          backgroundColor: theme.colors.surfaceVariant,
        },
        style,
      ]}
    >
      <View style={styles.content}>
        <Text
          style={[styles.message, { color: theme.colors.onSurface }]}
          numberOfLines={2}
        >
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
            <Text style={[styles.actionText, { color: theme.colors.primary }]}>
              {action.label}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: Platform.OS === "web" ? 24 : 16,
    left: "50%",
    transform: [{ translateX: -width / 2 }],
    width: Platform.OS === "web" ? 600 : width - 32,
    minHeight: 48,
    borderRadius: 8,
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
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  message: {
    flex: 1,
    marginRight: 16,
    ...createTextStyle({
      fontSize: 14,
      fontWeight: "500",
    }),
  },
  actionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  actionText: {
    ...createTextStyle({
      fontSize: 14,
      fontWeight: "600",
      textTransform: "uppercase",
    }),
  },
});

export default CustomSnackbar;
