import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en.json";
import tr from "./tr.json";

i18n.use(initReactI18next).init({
  resources: {
    tr: { translation: tr },
    en: { translation: en },
  },
  lng: "tr",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

// Keep <html lang> in sync — index.html ships lang="tr"; without this, CSS
// text-transform keeps applying Turkish casing rules (i → İ) to EN chrome.
i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng;
});

export default i18n;
