import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslation from './locales/en.json';
import deTranslation from './locales/de.json';
import frTranslation from './locales/fr.json';
import itTranslation from './locales/it.json';
import sqTranslation from './locales/sq.json';

// Configure i18next
i18n
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources: {
      de: { translation: deTranslation },
      en: { translation: enTranslation },
      fr: { translation: frTranslation },
      it: { translation: itTranslation },
      sq: { translation: sqTranslation }
    },
    lng: 'de', // default language is German
    fallbackLng: 'en', // fallback language when a translation isn't found
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    react: {
      useSuspense: false,
    },
  });

export default i18n; 