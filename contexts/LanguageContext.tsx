import React, { createContext, useState, useContext, useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "../i18n";

// Define available languages
export const LANGUAGES = {
  GERMAN: "de",
  ENGLISH: "en",
  FRENCH: "fr",
  ITALIAN: "it",
  ALBANIAN: "sq",
};

interface LanguageContextType {
  currentLanguage: string;
  setLanguage: (language: string) => Promise<void>;
  isRTL: boolean;
}

// Create the context
const LanguageContext = createContext<LanguageContextType>({
  currentLanguage: LANGUAGES.GERMAN,
  setLanguage: async () => {},
  isRTL: false,
});

// Storage key for persisting language preference
const LANGUAGE_KEY = "user_language_preference";

// Provider component
export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentLanguage, setCurrentLanguage] = useState(LANGUAGES.GERMAN);
  const [isRTL, setIsRTL] = useState(false);

  // Load saved language preference
  useEffect(() => {
    const loadLanguagePreference = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);
        if (savedLanguage) {
          await changeLanguage(savedLanguage);
        }
      } catch (error) {
        console.error("Failed to load language preference:", error);
      }
    };

    loadLanguagePreference();
  }, []);

  // Function to change language
  const changeLanguage = async (language: string) => {
    try {
      // Change i18n language
      await i18n.changeLanguage(language);

      // No RTL languages in current set
      setIsRTL(false);

      // Update state
      setCurrentLanguage(language);

      // Save preference
      await AsyncStorage.setItem(LANGUAGE_KEY, language);
    } catch (error) {
      console.error("Failed to change language:", error);
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        setLanguage: changeLanguage,
        isRTL,
      }}
    >
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </LanguageContext.Provider>
  );
};

// Custom hook to use the language context
export const useLanguage = () => useContext(LanguageContext);

export default LanguageContext;
