import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { defaultLocale, getInitialLocale, supportedLocales, writeStoredLocale, type SupportedLocale } from "./locales";
import { enUS } from "./resources/en-US";
import { zhCN } from "./resources/zh-CN";

export { defaultLocale, localeLabels, supportedLocales, type SupportedLocale } from "./locales";

export const resources = {
  "zh-CN": { translation: zhCN },
  "en-US": { translation: enUS },
} as const;

void i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLocale(),
  fallbackLng: defaultLocale,
  supportedLngs: supportedLocales,
  interpolation: {
    escapeValue: false,
  },
  returnNull: false,
});

i18n.on("languageChanged", (locale) => {
  const supported = supportedLocales.find((item) => item === locale);

  if (supported) {
    writeStoredLocale(supported);
    document.documentElement.lang = supported;
  }
});

document.documentElement.lang = i18n.resolvedLanguage ?? i18n.language ?? defaultLocale;

export const changeAppLocale = (locale: SupportedLocale) => i18n.changeLanguage(locale);

export default i18n;
