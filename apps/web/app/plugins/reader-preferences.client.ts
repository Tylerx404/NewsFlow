import { usePreferredDark } from "@vueuse/core";
import { watch } from "vue";

import { useReadingPreferences } from "@/composables/use-reading-preferences";
import {
  applyReaderPreferencesToDocument,
  readReaderPreferencesFromStorage,
  writeReaderPreferencesToStorage,
} from "@/lib/reader-preferences";

export default defineNuxtPlugin(() => {
  const readingPreferences = useReadingPreferences();
  const prefersDark = usePreferredDark();

  readingPreferences.value = readReaderPreferencesFromStorage();

  watch(
    [readingPreferences, prefersDark],
    ([preferencesValue, prefersDarkValue]) => {
      writeReaderPreferencesToStorage(preferencesValue);
      applyReaderPreferencesToDocument(preferencesValue, prefersDarkValue);
    },
    {
      deep: true,
      immediate: true,
    }
  );
});
