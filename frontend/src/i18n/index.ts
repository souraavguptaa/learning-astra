import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import as from "./locales/as.js";
import bn from "./locales/bn.js";
import en from "./locales/en.js";
import hi from "./locales/hi.js";
import hinglish from "./locales/hinglish.js";
import or from "./locales/or.js";

export const SUPPORTED_LANGUAGES = ["en", "hi", "bn", "as", "or", "hinglish"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const STORAGE_KEY = "la_language";

export function getStoredLanguage(): SupportedLanguage {
  const stored = localStorage.getItem(STORAGE_KEY);
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(stored ?? "") ? (stored as SupportedLanguage) : "en";
}

export function setLanguage(lang: SupportedLanguage): void {
  localStorage.setItem(STORAGE_KEY, lang);
  i18next.changeLanguage(lang);
}

i18next.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    bn: { translation: bn },
    as: { translation: as },
    or: { translation: or },
    hinglish: { translation: hinglish },
  },
  lng: getStoredLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18next;
