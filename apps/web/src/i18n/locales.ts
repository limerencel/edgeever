export const supportedLocales = ["zh-CN", "en-US"] as const;

export type SupportedLocale = (typeof supportedLocales)[number];

export const defaultLocale: SupportedLocale = "zh-CN";

export const localeStorageKey = "edgeever.locale";

export const localeLabels: Record<SupportedLocale, string> = {
  "zh-CN": "简体中文",
  "en-US": "English",
};

export const normalizeLocale = (locale: string | null | undefined): SupportedLocale | null => {
  if (!locale) {
    return null;
  }

  const normalized = locale.toLowerCase();

  if (normalized === "zh" || normalized === "zh-cn" || normalized.startsWith("zh-hans")) {
    return "zh-CN";
  }

  if (normalized === "en" || normalized === "en-us" || normalized.startsWith("en-")) {
    return "en-US";
  }

  return null;
};

export const readStoredLocale = (): SupportedLocale | null => {
  try {
    return normalizeLocale(window.localStorage.getItem(localeStorageKey));
  } catch {
    return null;
  }
};

export const writeStoredLocale = (locale: SupportedLocale) => {
  try {
    window.localStorage.setItem(localeStorageKey, locale);
  } catch {
    // Local storage can be unavailable in private or restricted browser contexts.
  }
};

export const getBrowserLocale = (): SupportedLocale | null => {
  const browserLocales = navigator.languages?.length ? navigator.languages : [navigator.language];

  for (const locale of browserLocales) {
    const supported = normalizeLocale(locale);

    if (supported) {
      return supported;
    }
  }

  return null;
};

export const getInitialLocale = () => readStoredLocale() ?? getBrowserLocale() ?? defaultLocale;
