import en from "../locales/en.json";
import ja from "../locales/ja.json";
import tr from "../locales/tr.json";

export const supportedLocales = ["tr", "en", "ja"] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

export const defaultLocale: SupportedLocale = "tr";

/** i18next `resources` shape shared by web and mobile. */
export const resources = {
  tr: { translation: tr },
  en: { translation: en },
  ja: { translation: ja },
} as const;
