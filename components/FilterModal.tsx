import React from "react";
import {
  StyleSheet,
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  ViewStyle,
} from "react-native";
import {
  Text,
  Portal,
  Modal,
  IconButton,
  Divider,
  useTheme,
} from "react-native-paper";

export interface FilterModalProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  children: React.ReactNode;
  onClear?: () => void;
  onApply: () => void;
  clearButtonText?: string;
  applyButtonText?: string;
  isLargeScreen?: boolean;
  isMediumScreen?: boolean;
  contentContainerStyle?: ViewStyle;
}

const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  onDismiss,
  title,
  children,
  onClear,
  onApply,
  clearButtonText = "Clear Filters",
  applyButtonText = "Apply",
  isLargeScreen = false,
  isMediumScreen = false,
  contentContainerStyle,
}) => {
  const theme = useTheme();

  const modalWidth =
    Platform.OS === "web"
      ? isLargeScreen
        ? 600
        : isMediumScreen
          ? 500
          : "90%"
      : "90%";

  const modalPadding =
    Platform.OS === "web"
      ? isLargeScreen
        ? 25  
        : isMediumScreen
          ? 24
          : 16
      : 16;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={[
          styles.modalContainer,
          {
            width: modalWidth,
            maxWidth: Platform.OS === "web" ? 600 : "100%",
            alignSelf: "center",
          },
          contentContainerStyle,
        ]}
      >
        <View style={[styles.modalHeaderContainer, { padding: modalPadding }]}>
          <View style={styles.modalHeader}>
            <Text
              style={[
                styles.modalTitle,
                { fontSize: isLargeScreen ? 24 : isMediumScreen ? 22 : 20 },
              ]}
            >
              {title}
            </Text>
            <IconButton
              icon="close"
              size={isLargeScreen ? 28 : 24}
              onPress={onDismiss}
            />
          </View>
          <Divider style={styles.modalDivider} />
        </View>

        <ScrollView style={styles.modalContent}>{children}</ScrollView>

        <View style={[styles.modalFooter, { padding: modalPadding }]}>
          {onClear && (
            <TouchableOpacity
              style={[
                styles.footerButton,
                {
                  paddingVertical: isLargeScreen
                    ? 14
                    : isMediumScreen
                      ? 12
                      : 10,
                  paddingHorizontal: isLargeScreen
                    ? 28
                    : isMediumScreen
                      ? 24
                      : 20,
                },
              ]}
              onPress={onClear}
            >
              <Text
                style={[
                  styles.clearButtonText,
                  { fontSize: isLargeScreen ? 16 : 14 },
                ]}
              >
                {clearButtonText}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.footerButton,
              styles.applyButton,
              {
                paddingVertical: isLargeScreen ? 14 : isMediumScreen ? 12 : 10,
                paddingHorizontal: isLargeScreen
                  ? 28
                  : isMediumScreen
                    ? 24
                    : 20,
                backgroundColor: theme.colors.primary,
              },
            ]}
            onPress={onApply}
          >
            <Text
              style={[
                styles.applyButtonText,
                { fontSize: isLargeScreen ? 16 : 14 },
              ]}
            >
              {applyButtonText}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </Portal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 16,
    margin: 16,
    overflow: "hidden",
    maxHeight: "80%",
    elevation: 5,
  },
  modalHeaderContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    zIndex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontFamily: "Poppins-SemiBold",
    color: "#212121",
  },
  modalContent: {
    padding: 16,
    maxHeight: 400,
  },
  modalDivider: {
    height: 1,
    backgroundColor: "#E0E0E0",
    marginTop: 16,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    backgroundColor: "#FFFFFF",
    gap: 12,
  },
  footerButton: {
    borderRadius: 8,
  },
  applyButton: {
    elevation: 2,
  },
  clearButtonText: {
    color: "#616161",
    fontFamily: "Poppins-Medium",
  },
  applyButtonText: {
    color: "#FFFFFF",
    fontFamily: "Poppins-Medium",
  },
});

export default FilterModal;
