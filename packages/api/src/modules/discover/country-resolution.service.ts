import { PhoneNumberUtil } from "google-libphonenumber";

const phoneNumberUtil = PhoneNumberUtil.getInstance();

const ACCEPT_LANGUAGE_LOCALE_PATTERN = /^([a-zA-Z]{2,3})(?:[-_]([a-zA-Z]{2}))?$/;

export function resolveCountryFromPhone(
  phoneNumber: string | null | undefined
): string | null {
  if (typeof phoneNumber !== "string") {
    return null;
  }

  const normalizedPhoneNumber = phoneNumber.trim();

  if (!normalizedPhoneNumber || !normalizedPhoneNumber.startsWith("+")) {
    return null;
  }

  try {
    const parsed = phoneNumberUtil.parse(normalizedPhoneNumber);

    if (!phoneNumberUtil.isValidNumber(parsed)) {
      return null;
    }

    const regionCode = phoneNumberUtil.getRegionCodeForNumber(parsed);

    if (!regionCode || regionCode.length !== 2) {
      return null;
    }

    return regionCode.toUpperCase();
  } catch {
    return null;
  }
}

export function resolveCountryFromAcceptLanguage(
  acceptLanguageHeader: string | null | undefined
): string | null {
  if (typeof acceptLanguageHeader !== "string") {
    return null;
  }

  const segments = acceptLanguageHeader
    .split(",")
    .map((segment) => segment.trim())
    .filter(Boolean);

  for (const segment of segments) {
    const localeToken = segment.split(";")[0]?.trim();

    if (!localeToken) {
      continue;
    }

    const localeMatch = localeToken.match(ACCEPT_LANGUAGE_LOCALE_PATTERN);

    if (!localeMatch) {
      continue;
    }

    const regionCode = localeMatch[2];

    if (regionCode && regionCode.length === 2) {
      return regionCode.toUpperCase();
    }
  }

  return null;
}
