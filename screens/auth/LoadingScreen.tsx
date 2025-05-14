import React, { useState, useEffect } from "react";
import { StyleSheet, View, Image } from "react-native";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";

// Cache the loading animation values for reuse
const loadingTexts = ["Loading", "Loading.", "Loading..", "Loading..."];
const ANIMATION_TIMEOUT = 500; // Reduced from 500ms

const LoadingScreen = () => {
  const theme = useTheme();
  const [loadingText, setLoadingText] = useState("Loading");
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [textIndex, setTextIndex] = useState(0);

  // Use simplified, more efficient loading progress
  useEffect(() => {
    // Only update progress every 300ms
    const interval = setInterval(() => {
      setLoadingProgress((prev) => {
        // Faster animation cycling
        if (prev >= 100) {
          return 0;
        }
        return prev + 20; // Larger step for smoother animation
      });
    }, 300);

    // Use pre-calculated text values for dots animation
    const textInterval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % loadingTexts.length);
      setLoadingText(loadingTexts[textIndex]);
    }, ANIMATION_TIMEOUT);

    return () => {
      clearInterval(interval);
      clearInterval(textInterval);
    };
  }, [textIndex]);

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
