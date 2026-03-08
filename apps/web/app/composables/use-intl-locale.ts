import { computed } from "vue";

import { toIntlLocale } from "@/lib/i18n";

export const useIntlLocale = () => {
  const { locale } = useI18n();

  return computed(() => toIntlLocale(locale.value));
};
