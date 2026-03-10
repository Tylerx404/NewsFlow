import { PhoneNumberUtil } from "google-libphonenumber";

const phoneNumberUtil = PhoneNumberUtil.getInstance();

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
