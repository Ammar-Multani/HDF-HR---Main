import React from "react";
import { StyleSheet, View, Dimensions, Animated } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import Text from "./Text";
import { LinearGradient } from "expo-linear-gradient";

interface DynamicChartProps {
  monthlyData: number[];
  monthLabels: string[];
  width: number;
}

const DynamicChart: React.FC<DynamicChartProps> = ({
  monthlyData,
  monthLabels,
  width,
}) => {
  const theme = useTheme();

  // Gradient colors used across the app
  const gradientColors = [
    "rgba(6,169,169,255)",
    "rgba(38,127,161,255)",
    "rgba(54,105,157,255)",
    "rgba(74,78,153,255)",
    "rgba(94,52,149,255)",
  ];

  // Primary color from the gradient
  const primaryColor = "rgba(54,105,157,255)";

  const chartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    color: (opacity = 1) =>
      primaryColor.replace("255", (opacity * 255).toString()),
    strokeWidth: 3, // Increased stroke width for better visibility
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    propsForDots: {
      r: "6", // Slightly larger dots
      strokeWidth: "2",
      stroke: primaryColor,
    },
    propsForBackgroundLines: {
      strokeDasharray: "", // Solid lines instead of dashed
      strokeWidth: 1,
      stroke: "#e5e7eb",
    },
    fillShadowGradient: primaryColor,
    fillShadowGradientOpacity: 0.2, // Increased opacity for better area fill
    labelColor: (opacity = 1) => `rgba(75, 85, 99, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForLabels: {
      fontSize: 12, // Slightly larger font
      fontFamily: "Poppins-Medium",
      fill: "#4b5563", // Darker color for better readability
    },
  };

  // Calculate the dynamic y-axis max value based on the current data
  const calculateYAxisMax = (data: number[]) => {
    if (!data || data.length === 0) return 2;

    const maxValue = Math.max(...data);

    // If max value is 0, return a default of 2
    if (maxValue === 0) return 2;

    // For very small values (≤2), use exactly 2
    if (maxValue <= 2) return 2;

    // For small values, round up to the next integer
    if (maxValue <= 5) return Math.ceil(maxValue);

    // For medium values, use multiples of 2
    if (maxValue <= 10) return Math.ceil(maxValue / 2) * 2;

    // For larger values, use multiples of 5
    if (maxValue <= 30) return Math.ceil(maxValue / 5) * 5;

    // For even larger values, use multiples of 10
    if (maxValue <= 100) return Math.ceil(maxValue / 10) * 10;

    // For even larger values, use multiples of 100
    return Math.ceil(maxValue / 100) * 100;
  };

  // Get dynamic y-axis max
  const yAxisMax = calculateYAxisMax(monthlyData);

  // Create clean y-axis with even divisions
  const getYAxisLabels = (max: number) => {
    const result = [];
    let step;

    if (max <= 2) step = 1;
    else if (max <= 5) step = 1;
    else if (max <= 10) step = 2;
    else if (max <= 30) step = 5;
    else if (max <= 100) step = 10;
    else step = 100;

    for (let i = 0; i <= max; i += step) {
      result.push(i);
    }
    return result;
  };

  const yAxisLabels = getYAxisLabels(yAxisMax);

  // Group months into quarters for display
  const getQuarterlyLabels = (labels: string[], data: number[]) => {
    // Return the labels directly since we're already passing the 5 recent months
    return labels;
  };

  // Aggregate monthly data into quarterly data
  const getQuarterlyData = (monthlyData: number[]) => {
    if (!monthlyData.length) {
      // Sample data if no data is available
      return [0, 0, 0, 0, 0];
    }

    // Return the data directly - no quarterly grouping needed
    return monthlyData;
  };

  // For better grid appearance with small numbers
  const getSegmentCount = (max: number) => {
    if (max <= 2) return 2;
    if (max <= 5) return max;
    return 5;
  };

  // Add max value to chart config with custom formatter to prevent repeating labels
  const dynamicChartConfig = {
    ...chartConfig,
    max: yAxisMax,
    formatYLabel: (value: string) => {
      const num = parseInt(value, 10);
      // Only return labels that are in our calculated set
      return yAxisLabels.includes(num) ? num.toString() : "";
    },
    // Adjust the number of decimals for small values
    decimalPlaces: yAxisMax <= 2 ? 0 : 0,
  };

  const chartData = {
    labels: getQuarterlyLabels(monthLabels, monthlyData),
    datasets: [
      {
        data: getQuarterlyData(monthlyData),
        color: (opacity = 1) =>
          primaryColor.replace("255", (opacity * 255).toString()),
        strokeWidth: 3, // Match the stroke width from config
      },
    ],
  };

  if (!monthlyData.some((count) => count > 0)) {
    return (
      <View style={styles.emptyChartContainer}>
        <MaterialCommunityIcons
          name="chart-line"
          size={64} // Increased icon size
          color={theme.colors.outlineVariant}
        />
        <Text variant="medium" style={styles.emptyStateText}>
          No data available
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.chartContainer}>
      <LineChart
        data={chartData}
        width={width} // Adjust width to prevent horizontal overflow
        height={190} // Increased height for better visualization
        chartConfig={dynamicChartConfig}
        bezier
        style={styles.chart}
        withHorizontalLines={true}
        withVerticalLines={true}
        withDots={true}
        withShadow={false} // Remove shadows for flat design
        withInnerLines={true}
        fromZero={true}
        yAxisSuffix=""
        segments={getSegmentCount(yAxisMax)}
        renderDotContent={({ x, y, indexData }) =>
          indexData > 0 ? (
            <View
              key={x}
              style={[styles.valueBubble, { top: y - 25, left: x - 10 }]}
            >
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
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.valueText}>{indexData}</Text>
            </View>
          ) : null
        }
        formatXLabel={(label) => {
          // Return shorter quarter names to save space
          return label;
        }}
        getDotColor={(dataPoint, dataPointIndex) => {
          return dataPoint > 0 ? primaryColor : "transparent";
        }}
        getDotProps={(dataPoint, dataPointIndex) => {
          const isHighlight = dataPoint > 0;
          return {
            r: isHighlight ? "6" : "4",
            strokeWidth: "2",
            stroke: primaryColor,
            fill: isHighlight ? primaryColor : "#ffffff",
          };
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    marginVertical: 10,
  },
  chart: {
    borderRadius: 12,
    paddingRight: 30,
    paddingTop: 12, // Increased padding top for value bubbles
    marginVertical: 0,
    paddingLeft: 0,
    overflow: "hidden",
  },
  emptyChartContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60, // Increased padding for empty state
    borderRadius: 16,
    marginVertical: 9,
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  valueBubble: {
    position: "absolute",
    borderRadius: 25,
    marginTop: 15,
    paddingHorizontal: 3,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
    overflow: "hidden",
  },
  valueText: {
    color: "white",
    fontSize: 12,
    fontFamily: "Poppins-Medium",
  },
});

export default DynamicChart;
