export const APP_LOCALES = ["en", "vi", "zh", "kr", "jp"] as const;

export type AppLocale = (typeof APP_LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";

export const INTL_LOCALE_BY_APP_LOCALE: Record<AppLocale, string> = {
  en: "en-US",
  vi: "vi-VN",
  zh: "zh-CN",
  kr: "ko-KR",
  jp: "ja-JP",
};

export const isAppLocale = (value: string): value is AppLocale =>
  APP_LOCALES.includes(value as AppLocale);

export const normalizeAppLocale = (value: string | null | undefined): AppLocale => {
  if (!value) {
    return DEFAULT_LOCALE;
  }

  const normalized = value.trim().toLowerCase();
  if (isAppLocale(normalized)) {
    return normalized;
  }

  // Browser locale aliases mapped to internal locale codes.
  if (normalized.startsWith("ja")) {
    return "jp";
  }

  if (normalized.startsWith("ko")) {
    return "kr";
  }

  if (normalized.startsWith("vi")) {
    return "vi";
  }

  if (normalized.startsWith("zh")) {
    return "zh";
  }

  return DEFAULT_LOCALE;
};

export const toIntlLocale = (locale: string | null | undefined): string => {
  const normalized = normalizeAppLocale(locale);
  return INTL_LOCALE_BY_APP_LOCALE[normalized];
};
