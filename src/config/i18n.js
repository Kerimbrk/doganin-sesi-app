import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

import tr from '../locales/tr.json';
import en from '../locales/en.json';

const LANGUAGE_KEY = '@doganin_sesi_lang';

const languageDetector = {
  type: 'languageDetector',
  async: true,
  detect: async (callback) => {
    const saved = await AsyncStorage.getItem(LANGUAGE_KEY);
    callback(saved || 'tr');
  },
  init: () => {},
  cacheUserLanguage: async (lang) => {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'tr',
    resources: {
      tr: { translation: tr },
      en: { translation: en },
    },
    interpolation: { escapeValue: false },
  });

export default i18n;
