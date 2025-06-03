import React from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { Text, RadioButton, Divider } from "react-native-paper";

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
}

export const FilterSection: React.FC<FilterSectionProps> = ({
  title,
  children,
}) => {
  return (
    <View style={styles.modalSection}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
};

interface RadioOptionProps {
  label: string;
  value: string;
  color?: string;
}

interface RadioGroupProps {
  options: RadioOptionProps[];
  value: string;
  onValueChange: (value: string) => void;
  color?: string;
}

export const RadioFilterGroup: React.FC<RadioGroupProps> = ({
  options,
  value,
  onValueChange,
  color = "#1a73e8",
}) => {
  return (
    <RadioButton.Group onValueChange={onValueChange} value={value}>
      {options.map((option) => (
        <View key={option.value} style={styles.radioItem}>
          <RadioButton.Android
            value={option.value}
            color={option.color || color}
          />
          <Text style={styles.radioLabel}>{option.label}</Text>
        </View>
      ))}
    </RadioButton.Group>
  );
};

interface PillFilterGroupProps {
  options: RadioOptionProps[];
  value: string;
  onValueChange: (value: string) => void;
  containerStyle?: any;
}

export const PillFilterGroup: React.FC<PillFilterGroupProps> = ({
  options,
  value,
  onValueChange,
  containerStyle,
}) => {
  const getOptionColor = (optionValue: string) => {
    switch (optionValue) {
      case "active":
        return "#10B981"; // Green
      case "inactive":
        return "#EF4444"; // Red
      case "accident":
        return "#F44336"; // Red
      case "illness":
        return "#FF9800"; // Orange
      case "departure":
        return "#2196F3"; // Blue
      default:
        return "#1a73e8"; // Default blue
    }
  };

  return (
    <View style={[styles.pillContainer, containerStyle]}>
      {options.map((option) => {
        const isSelected = value === option.value;
        const statusColor = option.color || getOptionColor(option.value);

        return (
          <TouchableOpacity
            key={option.value}
            style={styles.statusOption}
            onPress={() => onValueChange(option.value)}
          >
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: isSelected
                    ? `${statusColor}20`
                    : "#9CA3AF20",
                  borderWidth: isSelected ? 1.5 : 0,
                  borderColor: statusColor,
                },
              ]}
            >
              <Text
                style={[
                  styles.statusPillText,
                  { color: isSelected ? statusColor : "#9CA3AF" },
                ]}
              >
                {option.label}
              </Text>
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

export const FilterDivider: React.FC = () => (
  <Divider style={styles.modalDivider} />
);

const styles = StyleSheet.create({
  modalSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#212121",
  },
  radioItem: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  radioLabel: {
    fontSize: 14,
    marginLeft: 8,
    fontFamily: "Poppins-Regular",
    color: "#424242",
  },
  modalDivider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginVertical: 16,
  },
  // Pill styles
  pillContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  statusOption: {
    borderRadius: 25,
  },
  statusPill: {
    borderRadius: 25,
    paddingVertical: 7,
    paddingHorizontal: 12,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  statusPillText: {
    fontSize: 11,
    fontFamily: "Poppins-Medium",
  },
});
