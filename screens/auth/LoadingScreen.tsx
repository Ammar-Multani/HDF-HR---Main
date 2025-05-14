import React, { useState, useEffect } from "react";
import { StyleSheet, View, Image } from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";

const LoadingScreen = () => {
  const theme = useTheme();
  const [loadingText, setLoadingText] = useState("Loading");
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Simulate loading progress
  useEffect(() => {
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          return 0;
        }
        return prev + 10;
      });
    }, 300);

    // Update loading text with dots animation
    const textInterval = setInterval(() => {
      setLoadingText((prev) => {
        if (prev === "Loading...") {
          return "Loading";
        }
        return prev + ".";
      });
    }, 500);

    return () => {
      clearInterval(interval);
      clearInterval(textInterval);
    };
  }, []);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Image
        source={
          theme.dark
            ? require("../../assets/splash-icon-light.png")
            : require("../../assets/splash-icon-dark.png")
        }
        style={styles.logo}
        resizeMode="contain"
      />
      <Text
        variant="headlineMedium"
        style={[styles.title, { color: theme.colors.primary }]}
      >
        HDF HR
      </Text>

      <ActivityIndicator
        size="large"
        color={theme.colors.primary}
        style={styles.spinner}
      />

      <Text style={[styles.text, { color: theme.colors.onBackground }]}>
        {loadingText}
      </Text>

      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBar,
            {
              backgroundColor: theme.colors.primary,
              width: `${loadingProgress}%`,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 32,
  },
  spinner: {
    marginBottom: 16,
  },
  text: {
    fontSize: 16,
    marginBottom: 16,
  },
  progressContainer: {
    width: "70%",
    height: 8,
    backgroundColor: "#e0e0e0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    borderRadius: 4,
  },
});

export default LoadingScreen;
