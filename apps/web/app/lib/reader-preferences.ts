export type ThemeMode = "system" | "light" | "dark";
export type ReaderColorPreset = "default" | "paper" | "slate";
export type ReaderFontFamily = "sans" | "serif" | "mono";
export type ReaderFontSize = "sm" | "md" | "lg" | "xl";
export type ReaderLineHeight = "compact" | "normal" | "relaxed";
export type ReaderContentWidth = "narrow" | "normal" | "wide";

export type ReaderPreferences = {
  themeMode: ThemeMode;
  colorPreset: ReaderColorPreset;
  fontFamily: ReaderFontFamily;
  fontSize: ReaderFontSize;
  lineHeight: ReaderLineHeight;
  contentWidth: ReaderContentWidth;
};

export type ReaderPreferenceOption<TValue extends string> = {
  value: TValue;
  label: string;
  description: string;
};

export const themeModeOptions: ReaderPreferenceOption<ThemeMode>[] = [
  {
    value: "system",
    label: "System",
    description: "Follow your device appearance setting.",
  },
  {
    value: "light",
    label: "Light",
    description: "Always use the light interface.",
  },
  {
    value: "dark",
    label: "Dark",
    description: "Always use the dark interface.",
  },
];

export const readerColorPresetOptions: ReaderPreferenceOption<ReaderColorPreset>[] = [
  {
    value: "default",
    label: "Neutral",
    description: "Balanced contrast with neutral tones.",
  },
  {
    value: "paper",
    label: "Warm paper",
    description: "Soft warm background for long reading.",
  },
  {
    value: "slate",
    label: "Slate",
    description: "Cooler tones with sharper text contrast.",
  },
];

export const readerFontFamilyOptions: ReaderPreferenceOption<ReaderFontFamily>[] = [
  {
    value: "sans",
    label: "Modern sans",
    description: "Clean sans-serif text with high legibility.",
  },
  {
    value: "serif",
    label: "Editorial serif",
    description: "Magazine-like serif rhythm for long-form reading.",
  },
  {
    value: "mono",
    label: "Monospace",
    description: "Fixed-width text for dense technical content.",
  },
];

export const readerFontSizeOptions: ReaderPreferenceOption<ReaderFontSize>[] = [
  {
    value: "sm",
    label: "Small",
    description: "Compact layout that keeps more content in view.",
  },
  {
    value: "md",
    label: "Medium",
    description: "Balanced size for everyday reading.",
  },
  {
    value: "lg",
    label: "Large",
    description: "Larger text for easier scanning.",
  },
  {
    value: "xl",
    label: "Extra large",
    description: "Maximum readability with larger body text.",
  },
];

export const readerLineHeightOptions: ReaderPreferenceOption<ReaderLineHeight>[] = [
  {
    value: "compact",
    label: "Compact",
    description: "Tighter lines for denser reading.",
  },
  {
    value: "normal",
    label: "Normal",
    description: "Standard spacing for most articles.",
  },
  {
    value: "relaxed",
    label: "Relaxed",
    description: "More vertical space for slower reading.",
  },
];

export const readerContentWidthOptions: ReaderPreferenceOption<ReaderContentWidth>[] = [
  {
    value: "narrow",
    label: "Narrow",
    description: "Shorter lines for focused reading.",
  },
  {
    value: "normal",
    label: "Normal",
    description: "Balanced width for mixed content.",
  },
  {
    value: "wide",
    label: "Wide",
    description: "More horizontal room for rich media.",
  },
];

export const DEFAULT_READER_PREFERENCES: ReaderPreferences = {
  themeMode: "system",
  colorPreset: "default",
  fontFamily: "serif",
  fontSize: "md",
  lineHeight: "normal",
  contentWidth: "normal",
};

export const READER_PREFERENCES_STORAGE_KEY = "newsflow:reader-preferences";

type ReaderColorPalette = {
  surface: string;
  text: string;
  mutedText: string;
  border: string;
  link: string;
};

const themeModeValues = new Set<ThemeMode>(["system", "light", "dark"]);
const colorPresetValues = new Set<ReaderColorPreset>(["default", "paper", "slate"]);
const fontFamilyValues = new Set<ReaderFontFamily>(["sans", "serif", "mono"]);
const fontSizeValues = new Set<ReaderFontSize>(["sm", "md", "lg", "xl"]);
const lineHeightValues = new Set<ReaderLineHeight>(["compact", "normal", "relaxed"]);
const contentWidthValues = new Set<ReaderContentWidth>(["narrow", "normal", "wide"]);

const fontFamilyByValue: Record<ReaderFontFamily, string> = {
  sans: '"Nunito Sans", "Segoe UI", sans-serif',
  serif: '"Source Serif 4", "Palatino Linotype", "Book Antiqua", serif',
  mono: '"IBM Plex Mono", "SFMono-Regular", "Menlo", monospace',
};

const fontSizeByValue: Record<ReaderFontSize, string> = {
  sm: "0.95rem",
  md: "1.05rem",
  lg: "1.15rem",
  xl: "1.25rem",
};

const lineHeightByValue: Record<ReaderLineHeight, string> = {
  compact: "1.6",
  normal: "1.78",
  relaxed: "1.95",
};

const contentWidthByValue: Record<ReaderContentWidth, string> = {
  narrow: "64ch",
  normal: "72ch",
  wide: "84ch",
};

const colorPaletteByPreset: Record<
  ReaderColorPreset,
  {
    light: ReaderColorPalette;
    dark: ReaderColorPalette;
  }
> = {
  default: {
    light: {
      surface: "oklch(0.99 0.003 250)",
      text: "oklch(0.25 0.01 250)",
      mutedText: "oklch(0.47 0.01 250)",
      border: "oklch(0.9 0.004 250)",
      link: "oklch(0.54 0.14 255)",
    },
    dark: {
      surface: "oklch(0.24 0.01 250)",
      text: "oklch(0.94 0.01 250)",
      mutedText: "oklch(0.75 0.01 250)",
      border: "oklch(0.36 0.01 250)",
      link: "oklch(0.79 0.1 245)",
    },
  },
  paper: {
    light: {
      surface: "oklch(0.98 0.012 85)",
      text: "oklch(0.29 0.015 75)",
      mutedText: "oklch(0.5 0.01 80)",
      border: "oklch(0.89 0.01 85)",
      link: "oklch(0.5 0.13 230)",
    },
    dark: {
      surface: "oklch(0.23 0.012 85)",
      text: "oklch(0.93 0.012 85)",
      mutedText: "oklch(0.73 0.01 85)",
      border: "oklch(0.35 0.01 85)",
      link: "oklch(0.78 0.09 230)",
    },
  },
  slate: {
    light: {
      surface: "oklch(0.98 0.006 230)",
      text: "oklch(0.24 0.012 230)",
      mutedText: "oklch(0.45 0.01 230)",
      border: "oklch(0.88 0.008 230)",
      link: "oklch(0.52 0.15 255)",
    },
    dark: {
      surface: "oklch(0.22 0.012 235)",
      text: "oklch(0.95 0.012 230)",
      mutedText: "oklch(0.74 0.01 230)",
      border: "oklch(0.35 0.01 230)",
      link: "oklch(0.8 0.1 255)",
    },
  },
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const pickEnum = <TValue extends string>(
  value: unknown,
  values: Set<TValue>,
  fallback: TValue
): TValue => {
  if (typeof value === "string" && values.has(value as TValue)) {
    return value as TValue;
  }

  return fallback;
};

const cloneDefaultReaderPreferences = (): ReaderPreferences => ({
  ...DEFAULT_READER_PREFERENCES,
});

export const isThemeMode = (value: string): value is ThemeMode =>
  themeModeValues.has(value as ThemeMode);

export const normalizeReaderPreferences = (value: unknown): ReaderPreferences => {
  if (!isRecord(value)) {
    return cloneDefaultReaderPreferences();
  }

  return {
    themeMode: pickEnum(
      value.themeMode,
      themeModeValues,
      DEFAULT_READER_PREFERENCES.themeMode
    ),
    colorPreset: pickEnum(
      value.colorPreset,
      colorPresetValues,
      DEFAULT_READER_PREFERENCES.colorPreset
    ),
    fontFamily: pickEnum(
      value.fontFamily,
      fontFamilyValues,
      DEFAULT_READER_PREFERENCES.fontFamily
    ),
    fontSize: pickEnum(
      value.fontSize,
      fontSizeValues,
      DEFAULT_READER_PREFERENCES.fontSize
    ),
    lineHeight: pickEnum(
      value.lineHeight,
      lineHeightValues,
      DEFAULT_READER_PREFERENCES.lineHeight
    ),
    contentWidth: pickEnum(
      value.contentWidth,
      contentWidthValues,
      DEFAULT_READER_PREFERENCES.contentWidth
    ),
  };
};

export const readReaderPreferencesFromStorage = (): ReaderPreferences => {
  if (!import.meta.client) {
    return cloneDefaultReaderPreferences();
  }

  try {
    const rawValue = localStorage.getItem(READER_PREFERENCES_STORAGE_KEY);
    if (!rawValue) {
      return cloneDefaultReaderPreferences();
    }

    return normalizeReaderPreferences(JSON.parse(rawValue));
  } catch {
    return cloneDefaultReaderPreferences();
  }
};

export const writeReaderPreferencesToStorage = (
  preferences: ReaderPreferences
): void => {
  if (!import.meta.client) {
    return;
  }

  localStorage.setItem(
    READER_PREFERENCES_STORAGE_KEY,
    JSON.stringify(preferences)
  );
};

export const resolveShouldUseDarkMode = (
  mode: ThemeMode,
  prefersDark: boolean
): boolean => {
  if (mode === "dark") {
    return true;
  }

  if (mode === "light") {
    return false;
  }

  return prefersDark;
};

export const applyReaderPreferencesToDocument = (
  preferences: ReaderPreferences,
  prefersDark: boolean
): void => {
  if (!import.meta.client) {
    return;
  }

  const root = document.documentElement;
  const shouldUseDarkMode = resolveShouldUseDarkMode(
    preferences.themeMode,
    prefersDark
  );
  const paletteByTheme = colorPaletteByPreset[preferences.colorPreset];
  const palette = shouldUseDarkMode ? paletteByTheme.dark : paletteByTheme.light;

  root.classList.toggle("dark", shouldUseDarkMode);
  root.dataset.themeMode = preferences.themeMode;
  root.dataset.readerColorPreset = preferences.colorPreset;
  root.dataset.readerFontFamily = preferences.fontFamily;
  root.dataset.readerFontSize = preferences.fontSize;
  root.dataset.readerLineHeight = preferences.lineHeight;
  root.dataset.readerContentWidth = preferences.contentWidth;

  root.style.setProperty(
    "--reader-font-family",
    fontFamilyByValue[preferences.fontFamily]
  );
  root.style.setProperty("--reader-font-size", fontSizeByValue[preferences.fontSize]);
  root.style.setProperty(
    "--reader-line-height",
    lineHeightByValue[preferences.lineHeight]
  );
  root.style.setProperty(
    "--reader-max-width",
    contentWidthByValue[preferences.contentWidth]
  );
  root.style.setProperty("--reader-surface", palette.surface);
  root.style.setProperty("--reader-text", palette.text);
  root.style.setProperty("--reader-muted-text", palette.mutedText);
  root.style.setProperty("--reader-border", palette.border);
  root.style.setProperty("--reader-link", palette.link);
};
