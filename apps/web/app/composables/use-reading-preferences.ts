import type { ReaderPreferences } from "@/lib/reader-preferences";
import { DEFAULT_READER_PREFERENCES } from "@/lib/reader-preferences";

export const useReadingPreferences = () =>
  useState<ReaderPreferences>("reading-preferences", () => ({
    ...DEFAULT_READER_PREFERENCES,
  }));
