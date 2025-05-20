import React from "react";
import { StyleSheet, View } from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";

/**
 * Props for the LoadingIndicator component
 * @interface LoadingIndicatorProps
 * @property {string} [message='Loading...'] - Optional message to display below the loading spinner
 */
interface LoadingIndicatorProps {
  message?: string;
}

/**
 * LoadingIndicator component
 *
 * A reusable loading indicator that displays a spinner with an optional message.
 * Used throughout the application to indicate loading states.
 *
 * @component
 * @example
 * // Basic usage with default message
 * <LoadingIndicator />
 *
 * @example
 * // Custom message
 * <LoadingIndicator message="Fetching data..." />
 */
const LoadingIndicator = ({
  message = "Loading...",
}: LoadingIndicatorProps) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={[styles.message, { color: theme.colors.onBackground }]}>
        {message}
      </Text>
    </View>
  );
};

/**
 * Component styles
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  message: {
    marginTop: 16,
    fontSize: 16,
  },
});

export default LoadingIndicator;
