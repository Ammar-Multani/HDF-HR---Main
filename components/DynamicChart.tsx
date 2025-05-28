import React from "react";
import { StyleSheet, View, Dimensions, Platform } from "react-native";
import { LineChart } from "react-native-chart-kit";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useTheme } from "react-native-paper";
import Text from "./Text";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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

  // Calculate responsive dimensions
  const isLargeScreen = width >= 1440;
  const isMediumScreen = width >= 768 && width < 1440;
  const chartHeight = isLargeScreen ? 250 : isMediumScreen ? 220 : 190;
  const dotSize = isLargeScreen ? 8 : isMediumScreen ? 7 : 6;
  const strokeWidth = isLargeScreen ? 4 : isMediumScreen ? 3.5 : 3;
  const fontSize = isLargeScreen ? 14 : isMediumScreen ? 13 : 12;
  const paddingRight = isLargeScreen ? 40 : isMediumScreen ? 35 : 10;
  const paddingTop = isLargeScreen ? 20 : isMediumScreen ? 16 : 12;

  // Gradient colors used across the app
  const gradientColors = [
    "rgba(6,169,169,255)",
    "rgba(38,127,161,255)",
    "rgba(54,105,157,255)",
    "rgba(74,78,153,255)",
    "rgba(94,52,149,255)",
  ] as const;

  // Primary color from the gradient
  const primaryColor = "rgba(54,105,157,255)";
  const secondaryColor = "rgba(38,127,161,255)";

  const chartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    color: (opacity = 1) =>
      primaryColor.replace("255", (opacity * 255).toString()),
    strokeWidth,
    barPercentage: 0.5,
    useShadowColorFromDataset: false,
    decimalPlaces: 0,
    propsForDots: {
      r: dotSize.toString(),
      strokeWidth: "2",
      stroke: primaryColor,
    },
    propsForBackgroundLines: {
      strokeDasharray: "",
      strokeWidth: 1,
      stroke: "#e5e7eb",
    },
    fillShadowGradient: primaryColor,
    fillShadowGradientOpacity: 0.2,
    labelColor: (opacity = 1) => `rgba(75, 85, 99, ${opacity})`,
    style: {
      borderRadius: 10,
      paddingRight: 0,
    },
    propsForLabels: {
      fontSize,
      fontFamily: "Poppins-Medium",
      fill: "#4b5563",
    },
    horizontalOffset: 15,
    xLabelsOffset: -10,
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
    labels: monthLabels,
    datasets: [
      {
        data: monthlyData,
        color: (opacity = 1) =>
          primaryColor.replace("255", (opacity * 255).toString()),
        strokeWidth: 3,
      },
    ],
  };

  if (!monthlyData.some((count) => count > 0)) {
    const emptyStateIconSize = isLargeScreen ? 80 : isMediumScreen ? 72 : 64;
    const emptyStatePadding = isLargeScreen ? 80 : isMediumScreen ? 70 : 60;

    return (
      <View
        style={[
          styles.emptyChartContainer,
          { paddingVertical: emptyStatePadding },
        ]}
      >
        <MaterialCommunityIcons
          name="chart-line"
          size={emptyStateIconSize}
          color={theme.colors.outlineVariant}
        />
        <Text
          variant="medium"
          style={[styles.emptyStateText, { fontSize: fontSize + 4 }]}
        >
          No data available
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.chartContainer]}>
      <LineChart
        data={chartData}
        width={width}
        height={chartHeight}
        chartConfig={dynamicChartConfig}
        bezier
        style={styles.chart}
        withHorizontalLines={true}
        withVerticalLines={true}
        withDots={true}
        withShadow={false}
        withInnerLines={true}
        fromZero={true}
        yAxisSuffix=""
        segments={getSegmentCount(yAxisMax)}
        horizontalLabelRotation={0}
        verticalLabelRotation={0}
        formatXLabel={(value: string): string => value}
        getDotColor={(dataPoint) =>
          dataPoint > 0 ? primaryColor : "transparent"
        }
        getDotProps={(dataPoint) => {
          const isHighlight = dataPoint > 0;
          return {
            r: isHighlight ? dotSize.toString() : (dotSize - 2).toString(),
            strokeWidth: "2",
            stroke: primaryColor,
            fill: isHighlight ? primaryColor : "#ffffff",
          };
        }}
        renderDotContent={({ x, y, indexData }) =>
          indexData > 0 ? (
            <View
              key={x}
              style={[
                styles.valueBubble,
                {
                  top: y - (isLargeScreen ? 30 : isMediumScreen ? 28 : 27),
                  left: x - (isLargeScreen ? 12 : isMediumScreen ? 11 : 11),
                  borderRadius: isLargeScreen ? 30 : isMediumScreen ? 28 : 25,
                  minWidth: isLargeScreen ? 24 : isMediumScreen ? 22 : 20,
                  
                },
              ]}
            >
              <LinearGradient
                colors={[primaryColor, secondaryColor]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />
              <Text
                style={[
                  styles.valueText,
                  { fontSize: isLargeScreen ? 14 : isMediumScreen ? 13 : 12 },
                ]}
              >
                {indexData}
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  chartContainer: {
    alignItems: "center",
    width: "100%",
    overflow: "hidden",
    backgroundColor: "transparent",
    paddingHorizontal: Platform.OS === "web" ? 4 : 16,
    paddingRight: Platform.OS === "web" ? 14 : 16,
    marginHorizontal: Platform.OS === "web" ? -13 : 0,
    paddingLeft: Platform.OS === "web" ? 4 : 10,
  },
  chart: {
    overflow: "hidden",
    borderRadius: 12,
  },
  emptyChartContainer: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    width: "100%",
  },
  emptyStateText: {
    marginTop: 12,
    color: "#666",
  },
  valueBubble: {
    position: "absolute",
    marginTop: 15,
    height: 20,
    width: 20,
    alignItems: "center",
    overflow: "hidden",
  },
  valueText: {
    paddingTop: 2,
    color: "white",
    fontFamily: "Poppins-Medium",
  },
});

export default DynamicChart;
