import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

type NoDataMessageProps = {
  message: string;
  icon?: string;
};

const NoDataMessage = ({
  message,
  icon = "information-outline",
}: NoDataMessageProps) => {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <Icon
        name={icon}
        size={64}
        color={theme.colors.outline}
        style={styles.icon}
      />
      <Text style={[styles.message, { color: theme.colors.outline }]}>
        {message}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  icon: {
    marginBottom: 16,
    opacity: 0.6,
  },
  message: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.7,
  },
});

export default NoDataMessage;
