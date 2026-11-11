import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './data/locales/en/translation.json';
import am from './data/locales/am/translation.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, am: { translation: am } },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    detection: { order: ['localStorage', 'navigator'], caches: ['localStorage'] }
  });

i18n.on('languageChanged', (lng) => {
  const language = String(lng || 'en').toLowerCase().startsWith('am') ? 'am' : 'en';
  if (typeof document !== 'undefined') document.documentElement.lang = language;
  // Database-backed sections refetch with ?lang=... when the visitor swaps EN / AM.
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    window.dispatchEvent(new CustomEvent('fenote:languagechange', { detail: { language } }));
  }
});

if (typeof document !== 'undefined') {
  document.documentElement.lang = String(i18n.language || 'en').toLowerCase().startsWith('am') ? 'am' : 'en';
}

export default i18n;
