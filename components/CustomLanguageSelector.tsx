import React, { useState } from "react";
import { StyleSheet, View, TouchableOpacity, Modal } from "react-native";
import { Text, useTheme, Button, Surface } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useLanguage, LANGUAGES } from "../contexts/LanguageContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Flag from "react-native-flags";

const CustomLanguageSelector = ({ compact = false }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const { t } = useTranslation();
  const { currentLanguage, setLanguage } = useLanguage();
  const theme = useTheme();

  // Map of language codes to display names
  const languageNames = {
    [LANGUAGES.GERMAN]: "Deutsch",
    [LANGUAGES.ENGLISH]: "English",
    [LANGUAGES.FRENCH]: "Français",
    [LANGUAGES.ITALIAN]: "Italiano",
    [LANGUAGES.ALBANIAN]: "Shqip",
  };

  // Map of language codes to country codes for flags
  const languageFlags = {
    [LANGUAGES.GERMAN]: "DE",
    [LANGUAGES.ENGLISH]: "GB",
    [LANGUAGES.FRENCH]: "FR",
    [LANGUAGES.ITALIAN]: "IT",
    [LANGUAGES.ALBANIAN]: "AL",
  };

  // Gradient colors used across the app - defined as tuple to satisfy TypeScript
  const gradientColors = [
    "rgba(6,169,169,255)",
    "rgba(38,127,161,255)",
    "rgba(54,105,157,255)",
    "rgba(74,78,153,255)",
    "rgba(94,52,149,255)",
  ] as const;

  const handleLanguageChange = async (language: string) => {
    await setLanguage(language);
    setModalVisible(false);
  };

  const getCurrentLanguageName = () => {
    return languageNames[currentLanguage] || languageNames[LANGUAGES.GERMAN];
  };

  const getCurrentLanguageFlag = () => {
    return languageFlags[currentLanguage] || languageFlags[LANGUAGES.GERMAN];
  };

  return (
    <View style={styles.container}>
      {/* Language Selector Button */}
      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={[
          styles.selectorButton,
          compact ? styles.compactButton : styles.fullButton,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outline,
          },
        ]}
      >
        <View style={styles.flagContainer}>
          <Flag code={getCurrentLanguageFlag()} size={24} />
        </View>
        <Text style={[styles.languageName, { color: theme.colors.onSurface }]}>
          {getCurrentLanguageName()}
        </Text>
        <MaterialCommunityIcons
          name="chevron-down"
          size={16}
          color={theme.colors.onSurfaceVariant}
        />
      </TouchableOpacity>

      {/* Language Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        statusBarTranslucent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View
          style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}
        >
          <Surface
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
                borderWidth: 0.5,
              },
            ]}
            elevation={2}
          >
            <View style={styles.modalHeader}>
              <LinearGradient
                colors={[
                  theme.colors.secondary,
                  theme.colors.tertiary,
                  (theme.colors as any).quaternary,
                  (theme.colors as any).quinary,
                  (theme.colors as any).senary,
                ]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modalHeaderGradient}
              >
                <Text style={[styles.modalTitle, { color: "#fff" }]}>
                  {t("language.select")}
                </Text>
                <TouchableOpacity
                  onPress={() => setModalVisible(false)}
                  style={styles.closeButton}
                >
                  <MaterialCommunityIcons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </LinearGradient>
            </View>

            <View style={styles.languageList}>
              {Object.entries(LANGUAGES).map(([key, code]) => (
                <TouchableOpacity
                  key={code}
                  style={[
                    styles.languageOption,
                    { borderBottomColor: theme.colors.outline },
                    currentLanguage === code && {
                      backgroundColor: (theme.colors as any).surfaceHover,
                    },
                  ]}
                  onPress={() => handleLanguageChange(code)}
                >
                  <View style={styles.flagContainer}>
                    <Flag code={languageFlags[code]} size={24} />
                  </View>
                  <Text
                    style={[
                      styles.languageOptionText,
                      { color: theme.colors.onSurface },
                      currentLanguage === code && {
                        color: theme.colors.primary,
                        fontFamily: "Poppins-Medium",
                      },
                    ]}
                  >
                    {languageNames[code]}
                  </Text>
                  {currentLanguage === code && (
                    <MaterialCommunityIcons
                      name="check-circle"
                      size={20}
                      color={theme.colors.primary}
                      style={styles.checkIcon}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <Button
              mode="contained"
              onPress={() => setModalVisible(false)}
              style={[styles.cancelButton, { marginTop: 8 }]}
              buttonColor={theme.colors.primary}
              labelStyle={{ fontFamily: "Poppins-Medium" }}
            >
              {t("common.cancel")}
            </Button>
          </Surface>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  selectorButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    paddingVertical: 6,
    borderWidth: 1,
  },
  compactButton: {
    paddingHorizontal: 8,
  },
  fullButton: {
    paddingHorizontal: 12,
  },
  flagContainer: {
    marginRight: 8,
    overflow: "hidden",
    borderRadius: 4,
  },
  languageName: {
    fontSize: 14,
    fontFamily: "Poppins-Medium",
    marginRight: 6,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "90%",
    maxWidth: 400,
    borderRadius: 16,
    overflow: "hidden",
  },
  modalHeader: {
    overflow: "hidden",
  },
  modalHeaderGradient: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
  },
  closeButton: {
    padding: 4,
  },
  languageList: {
    paddingVertical: 16,
  },
  languageOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  languageOptionText: {
    fontSize: 16,
    fontFamily: "Poppins-Regular",
  },
  checkIcon: {
    marginLeft: "auto",
  },
  cancelButton: {
    margin: 16,
    borderRadius: 8,
  },
});

export default CustomLanguageSelector;
