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
const DOMAIN_COUNTRY_MAP: Record<string, string> = {
  vn: "VN",
  kr: "KR",
  jp: "JP",
  cn: "CN",
  tw: "TW",
  hk: "HK",
  th: "TH",
  id: "ID",
  fr: "FR",
  de: "DE",
  es: "ES",
};
const HOST_COUNTRY_HINTS: Array<{ pattern: RegExp; countryCode: string }> = [
  { pattern: /(^|\.)france24\./i, countryCode: "FR" },
  { pattern: /(^|\.)elpais\./i, countryCode: "ES" },
  { pattern: /(^|\.)yna\.co\.kr$/i, countryCode: "KR" },
  { pattern: /(^|\.)japantimes\.co\.jp$/i, countryCode: "JP" },
];
const COUNTRY_KEYWORD_HINTS: Array<{ pattern: RegExp; countryCode: string }> = [
  { pattern: /\b(france|french)\b/i, countryCode: "FR" },
  { pattern: /\b(japan|japanese)\b/i, countryCode: "JP" },
  { pattern: /\b(korea|korean|seoul)\b/i, countryCode: "KR" },
  { pattern: /\b(taiwan|taipei|taiwanese)\b/i, countryCode: "TW" },
  { pattern: /\b(vietnam|viet\s?nam|vietnamese)\b/i, countryCode: "VN" },
  { pattern: /\b(spain|spanish|españa|espanol|español)\b/i, countryCode: "ES" },
  { pattern: /\b(thailand|thai|bangkok)\b/i, countryCode: "TH" },
  { pattern: /\b(indonesia|indonesian|jakarta)\b/i, countryCode: "ID" },
  { pattern: /\b(germany|german|berlin)\b/i, countryCode: "DE" },
];

const MIN_SAMPLE_LENGTH = 40;
const DEFAULT_MIN_CONFIDENCE = 0.85;
const VI_MIN_CONFIDENCE = 0.7;
const MIN_CONFIDENCE_GAP = 0.05;
const VI_MIN_CONFIDENCE_GAP = 0.02;

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
  sourceUrl?: string | null;
  siteUrl?: string | null;
}

export interface InferFeedCountryInput extends FeedLanguageDetectionInput {
  defaultCountryCode?: string;
  sourceUrl?: string | null;
  siteUrl?: string | null;
}

export interface FeedCountryInferenceResult {
  inferredLanguage: string | null;
  inferredCountryCode: string;
  inferenceConfidence: number | null;
  inferenceSource: "LANG_DETECTION" | "DEFAULT";
  inferredAt: Date;
}

function resolveHostFromUrl(value: string | null | undefined) {
  if (!value || typeof value !== "string") {
    return null;
  }

  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function resolveCountryFromDomain(options?: MapLanguageToCountryOptions) {
  const host = resolveHostFromUrl(options?.siteUrl) ?? resolveHostFromUrl(options?.sourceUrl);

  if (!host) {
    return null;
  }

  const segments = host.split(".").filter(Boolean);
  if (segments.length === 0) {
    return null;
  }

  const tld = segments[segments.length - 1] ?? "";
  const fromTld = DOMAIN_COUNTRY_MAP[tld];
  if (fromTld) {
    return fromTld;
  }

  for (const hint of HOST_COUNTRY_HINTS) {
    if (hint.pattern.test(host)) {
      return hint.countryCode;
    }
  }

  return null;
}

function resolveCountryFromKeywords(input: {
  title?: string | null;
  description?: string | null;
  sourceUrl?: string | null;
  siteUrl?: string | null;
}) {
  const text = [input.title, input.description, input.sourceUrl, input.siteUrl]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ");

  if (!text) {
    return null;
  }

  for (const hint of COUNTRY_KEYWORD_HINTS) {
    if (hint.pattern.test(text)) {
      return hint.countryCode;
    }
  }

  return null;
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

  const confidenceGapThreshold = language === "vi" ? VI_MIN_CONFIDENCE_GAP : MIN_CONFIDENCE_GAP;

  if (confidence < threshold || confidenceGap < confidenceGapThreshold) {
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
    const domainCountry = resolveCountryFromDomain(options);
    if (domainCountry) {
      return domainCountry;
    }

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
    const domainCountry = resolveCountryFromDomain({
      sourceUrl: input.sourceUrl,
      siteUrl: input.siteUrl,
    });
    const keywordCountry = resolveCountryFromKeywords(input);

    return {
      inferredLanguage: null,
      inferredCountryCode: domainCountry ?? keywordCountry ?? defaultCountryCode,
      inferenceConfidence: null,
      inferenceSource: "DEFAULT",
      inferredAt: new Date(),
    };
  }

  const mappedCountry = mapLanguageToCountry(detected.language, {
    defaultCountryCode,
    sourceUrl: input.sourceUrl,
    siteUrl: input.siteUrl,
  });

  return {
    inferredLanguage: detected.language,
    inferredCountryCode: mappedCountry,
    inferenceConfidence: detected.confidence,
    inferenceSource: "LANG_DETECTION",
    inferredAt: new Date(),
  };
}
