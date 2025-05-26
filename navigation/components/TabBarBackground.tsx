import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

export const renderTabBarBackground = () => {
  return (
    <View
      style={{
        borderRadius: 25,
        borderWidth: 1,
        borderColor: "rgb(207, 207, 207)",
        overflow: "hidden",
        ...StyleSheet.absoluteFillObject,
      }}
    >
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
        end={{ x: 1, y: 0 }}
        style={StyleSheet.absoluteFillObject}
      />
    </View>
  );
};

// Common tab bar style options
export const tabBarStyleOptions = {
  position: "absolute" as const,
  elevation: 7,
  backgroundColor: "transparent" as const,
  borderTopWidth: 0,
  height: 70,
  paddingTop: 7.5,
  paddingBottom: 10,
  paddingHorizontal: 5,
  marginHorizontal: 13,
  marginBottom: 10,
  borderRadius: 25,
  shadowColor: "#000",
  shadowOffset: {
    width: 0,
    height: 2,
  },
  shadowOpacity: 0.25,
  shadowRadius: 3.84,
};

// Common tab bar label style
export const tabBarLabelStyle = {
  fontSize: 10,
  fontFamily: "Poppins-Medium",
  color: "#fff",
};

// Common tab bar colors
export const tabBarColors = {
  active: "#fff",
  inactive: "rgba(255, 255, 255, 0.7)",
};
