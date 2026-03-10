import { PhoneNumberUtil } from "google-libphonenumber";

const phoneNumberUtil = PhoneNumberUtil.getInstance();

const ACCEPT_LANGUAGE_LOCALE_PATTERN = /^([a-zA-Z]{2,3})(?:[-_]([a-zA-Z]{2}))?$/;
const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/;

const IP_LOOKUP_TIMEOUT_MS = 3_000;

export interface CountryFromIpProvider {
  resolve(ipAddress: string): Promise<string | null>;
}

class IpApiCountryProvider implements CountryFromIpProvider {
  async resolve(ipAddress: string): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, IP_LOOKUP_TIMEOUT_MS);

    try {
      const response = await fetch(`https://ipapi.co/${encodeURIComponent(ipAddress)}/country/`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        return null;
      }

      const body = (await response.text()).trim().toUpperCase();

      return COUNTRY_CODE_PATTERN.test(body) ? body : null;
    } catch {
      return null;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function isPrivateOrLocalIp(ipAddress: string): boolean {
  const normalized = ipAddress.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  const withoutPort = normalized.startsWith("[")
    ? normalized.slice(1, normalized.indexOf("]"))
    : normalized.split(":").length > 2
      ? normalized
      : normalized.split(":")[0] ?? normalized;

  if (
    withoutPort === "127.0.0.1" ||
    withoutPort === "::1" ||
    withoutPort === "localhost"
  ) {
    return true;
  }

  if (
    withoutPort.startsWith("10.") ||
    withoutPort.startsWith("192.168.") ||
    withoutPort.startsWith("172.16.") ||
    withoutPort.startsWith("172.17.") ||
    withoutPort.startsWith("172.18.") ||
    withoutPort.startsWith("172.19.") ||
    withoutPort.startsWith("172.2") ||
    withoutPort.startsWith("172.30.") ||
    withoutPort.startsWith("172.31.")
  ) {
    return true;
  }

  if (
    withoutPort.startsWith("fc") ||
    withoutPort.startsWith("fd") ||
    withoutPort.startsWith("fe80:")
  ) {
    return true;
  }

  return false;
}

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

export async function resolveCountryFromIp(
  ipAddress: string | null | undefined,
  provider: CountryFromIpProvider = new IpApiCountryProvider()
): Promise<string | null> {
  if (typeof ipAddress !== "string") {
    return null;
  }

  const normalizedIp = ipAddress.trim();

  if (!normalizedIp || isPrivateOrLocalIp(normalizedIp)) {
    return null;
  }

  return provider.resolve(normalizedIp);
}
