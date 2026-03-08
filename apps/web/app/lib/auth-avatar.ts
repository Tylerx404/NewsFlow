const SESSION_IMAGE_PATH = "/api/auth/session-image";

export function isSessionAvatarUrl(image: string | null | undefined) {
  if (typeof image !== "string") {
    return false;
  }

  return image.trim().includes(SESSION_IMAGE_PATH);
}

export function buildAuthAvatarSrc(
  image: string | null | undefined,
  version: string | Date | null | undefined,
) {
  if (typeof image !== "string") {
    return null;
  }

  const normalizedImage = image.trim();

  if (!normalizedImage) {
    return null;
  }

  if (!version || !isSessionAvatarUrl(normalizedImage)) {
    return normalizedImage;
  }

  try {
    const url = new URL(normalizedImage);
    url.searchParams.set(
      "v",
      version instanceof Date ? version.toISOString() : String(version),
    );
    return url.toString();
  } catch {
    return normalizedImage;
  }
}
