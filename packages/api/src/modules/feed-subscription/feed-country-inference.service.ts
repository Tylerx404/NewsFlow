import { francAll } from "franc";

const LANGUAGE_CODE_MAP: Record<string, string> = {
  vie: "vi",
  eng: "en",
  fra: "fr",
  fre: "fr",
  deu: "de",
  ger: "de",
  spa: "es",
  tha: "th",
  ind: "id",
};

const LANGUAGE_COUNTRY_MAP: Record<string, string> = {
  vi: "VN",
  th: "TH",
  id: "ID",
  fr: "FR",
  de: "DE",
  es: "ES",
};

const GLOBAL_LANGUAGE_SET = new Set(["en", "es", "pt", "ar"]);

const MIN_SAMPLE_LENGTH = 40;
const DEFAULT_MIN_CONFIDENCE = 0.85;
const VI_MIN_CONFIDENCE = 0.7;
const MIN_CONFIDENCE_GAP = 0.05;

function stripHtml(value: string) {
  return value.replace(/<[^>]*>/g, " ");
}

function normalizeText(value: string) {
  return stripHtml(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function toLanguageCode(language3: string | undefined) {
  if (!language3) {
    return null;
  }

  return LANGUAGE_CODE_MAP[language3] ?? null;
}

function buildDetectionInput(parts: Array<string | null | undefined>) {
  return normalizeText(parts.filter((part): part is string => typeof part === "string").join(" "));
}

export interface FeedLanguageDetectionInput {
  title?: string | null;
  description?: string | null;
  items?: Array<{
    title?: string | null;
    summary?: string | null;
  }>;
}

export interface FeedLanguageDetectionResult {
  language: string;
  confidence: number;
  sampleSize: number;
}

export interface MapLanguageToCountryOptions {
  defaultCountryCode?: string;
}

export interface InferFeedCountryInput extends FeedLanguageDetectionInput {
  defaultCountryCode?: string;
}

export interface FeedCountryInferenceResult {
  inferredLanguage: string | null;
  inferredCountryCode: string;
  inferenceConfidence: number | null;
  inferenceSource: "LANG_DETECTION" | "DEFAULT";
  inferredAt: Date;
}

export function detectFeedLanguage(
  input: FeedLanguageDetectionInput
): FeedLanguageDetectionResult | null {
  const topItems = (input.items ?? []).slice(0, 5);
  const sampleText = buildDetectionInput([
    input.title,
    input.description,
    ...topItems.flatMap((item) => [item.title, item.summary]),
  ]);

  const sampleSize = sampleText.length;

  if (sampleSize < MIN_SAMPLE_LENGTH) {
    return null;
  }

  const ranked = francAll(sampleText, {
    minLength: Math.max(MIN_SAMPLE_LENGTH, Math.min(sampleSize, 100)),
  });

  const [top, second] = ranked;

  if (!top) {
    return null;
  }

  const language = toLanguageCode(top[0]);

  if (!language) {
    return null;
  }

  const confidence = top[1] ?? 0;
  const secondConfidence = second?.[1] ?? 0;
  const confidenceGap = confidence - secondConfidence;

  const threshold = language === "vi" ? VI_MIN_CONFIDENCE : DEFAULT_MIN_CONFIDENCE;

  if (confidence < threshold || confidenceGap < MIN_CONFIDENCE_GAP) {
    return null;
  }

  return {
    language,
    confidence,
    sampleSize,
  };
}

export function mapLanguageToCountry(
  language: string | null | undefined,
  options?: MapLanguageToCountryOptions
) {
  const defaultCountryCode = (options?.defaultCountryCode ?? "GLOBAL")
    .trim()
    .toUpperCase();

  if (typeof language !== "string") {
    return defaultCountryCode;
  }

  const normalizedLanguage = language.trim().toLowerCase();

  if (!normalizedLanguage) {
    return defaultCountryCode;
  }

  if (GLOBAL_LANGUAGE_SET.has(normalizedLanguage)) {
    return defaultCountryCode;
  }

  return LANGUAGE_COUNTRY_MAP[normalizedLanguage] ?? defaultCountryCode;
}

export function inferFeedCountry(
  input: InferFeedCountryInput
): FeedCountryInferenceResult {
  const detected = detectFeedLanguage(input);
  const defaultCountryCode = (input.defaultCountryCode ?? "GLOBAL").toUpperCase();

  if (!detected) {
    return {
      inferredLanguage: null,
      inferredCountryCode: defaultCountryCode,
      inferenceConfidence: null,
      inferenceSource: "DEFAULT",
      inferredAt: new Date(),
    };
  }

  return {
    inferredLanguage: detected.language,
    inferredCountryCode: mapLanguageToCountry(detected.language, {
      defaultCountryCode,
    }),
    inferenceConfidence: detected.confidence,
    inferenceSource: "LANG_DETECTION",
    inferredAt: new Date(),
  };
}
