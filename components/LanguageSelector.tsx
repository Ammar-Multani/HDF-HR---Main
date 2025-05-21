import React, { useState } from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { Menu, Button, Text, useTheme } from "react-native-paper";
import { useTranslation } from "react-i18next";
import { useLanguage, LANGUAGES } from "../contexts/LanguageContext";
import { MaterialCommunityIcons } from "@expo/vector-icons";

const LanguageSelector = () => {
  const [menuVisible, setMenuVisible] = useState(false);
  const { t } = useTranslation();
  const { currentLanguage, setLanguage } = useLanguage();
  const theme = useTheme();

  const openMenu = () => setMenuVisible(true);
  const closeMenu = () => setMenuVisible(false);

  // Map of language codes to display names
  const languageNames = {
    [LANGUAGES.GERMAN]: t("language.german"),
    [LANGUAGES.ENGLISH]: t("language.english"),
    [LANGUAGES.FRENCH]: t("language.french"),
    [LANGUAGES.ITALIAN]: t("language.italian"),
    [LANGUAGES.ALBANIAN]: t("language.albanian"),
  };

  // Map of language codes to flag emojis
  const languageFlags = {
    [LANGUAGES.GERMAN]: "🇩🇪",
    [LANGUAGES.ENGLISH]: "🇬🇧",
    [LANGUAGES.FRENCH]: "🇫🇷",
    [LANGUAGES.ITALIAN]: "🇮🇹",
    [LANGUAGES.ALBANIAN]: "🇦🇱",
  };

  const handleLanguageChange = async (language: string) => {
    await setLanguage(language);
    closeMenu();
  };

  const getCurrentLanguageName = () => {
    return languageNames[currentLanguage] || t("language.german");
  };

  const getCurrentLanguageFlag = () => {
    return languageFlags[currentLanguage] || "🇩🇪";
  };

  return (
    <View style={styles.container}>
      <Menu
        visible={menuVisible}
        onDismiss={closeMenu}
        anchor={
          <Button
            mode="outlined"
            onPress={openMenu}
            icon={() => (
              <MaterialCommunityIcons
                name="translate"
                size={20}
                color={theme.colors.primary}
              />
            )}
            style={styles.button}
            labelStyle={styles.buttonLabel}
          >
            {getCurrentLanguageFlag()} {getCurrentLanguageName()}
          </Button>
        }
      >
        <Menu.Item
          leadingIcon={() => (
            <Text style={styles.flag}>{languageFlags[LANGUAGES.GERMAN]}</Text>
          )}
          onPress={() => handleLanguageChange(LANGUAGES.GERMAN)}
          title={languageNames[LANGUAGES.GERMAN]}
          titleStyle={[
            styles.menuItemTitle,
            currentLanguage === LANGUAGES.GERMAN && {
              color: theme.colors.primary,
            },
          ]}
        />
        <Menu.Item
          leadingIcon={() => (
            <Text style={styles.flag}>{languageFlags[LANGUAGES.ENGLISH]}</Text>
          )}
          onPress={() => handleLanguageChange(LANGUAGES.ENGLISH)}
          title={languageNames[LANGUAGES.ENGLISH]}
          titleStyle={[
            styles.menuItemTitle,
            currentLanguage === LANGUAGES.ENGLISH && {
              color: theme.colors.primary,
            },
          ]}
        />
        <Menu.Item
          leadingIcon={() => (
            <Text style={styles.flag}>{languageFlags[LANGUAGES.FRENCH]}</Text>
          )}
          onPress={() => handleLanguageChange(LANGUAGES.FRENCH)}
          title={languageNames[LANGUAGES.FRENCH]}
          titleStyle={[
            styles.menuItemTitle,
            currentLanguage === LANGUAGES.FRENCH && {
              color: theme.colors.primary,
            },
          ]}
        />
        <Menu.Item
          leadingIcon={() => (
            <Text style={styles.flag}>{languageFlags[LANGUAGES.ITALIAN]}</Text>
          )}
          onPress={() => handleLanguageChange(LANGUAGES.ITALIAN)}
          title={languageNames[LANGUAGES.ITALIAN]}
          titleStyle={[
            styles.menuItemTitle,
            currentLanguage === LANGUAGES.ITALIAN && {
              color: theme.colors.primary,
            },
          ]}
        />
        <Menu.Item
          leadingIcon={() => (
            <Text style={styles.flag}>{languageFlags[LANGUAGES.ALBANIAN]}</Text>
          )}
          onPress={() => handleLanguageChange(LANGUAGES.ALBANIAN)}
          title={languageNames[LANGUAGES.ALBANIAN]}
          titleStyle={[
            styles.menuItemTitle,
            currentLanguage === LANGUAGES.ALBANIAN && {
              color: theme.colors.primary,
            },
          ]}
        />
      </Menu>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
  },
  button: {
    borderRadius: 20,
    paddingHorizontal: 10,
  },
  buttonLabel: {
    fontSize: 12,
  },
  menuItemTitle: {
    fontSize: 14,
  },
  flag: {
    fontSize: 16,
    marginRight: 8,
  },
});

export default LanguageSelector;
