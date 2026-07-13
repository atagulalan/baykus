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

export default i18n;
