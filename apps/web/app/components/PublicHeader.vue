<script setup lang="ts">
import { Languages, Menu, MonitorCog, Moon, Sun } from "lucide-vue-next";
import { computed, ref } from "vue";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useReadingPreferences } from "@/composables/use-reading-preferences";
import { AppLocale, isAppLocale } from "@/lib/i18n";
import { getThemeModeOptions, isThemeMode } from "@/lib/reader-preferences";

const { t, locale, locales, setLocale } = useI18n();
defineOptions({ name: "PublicHeader" });
const mobileOpen = ref(false);
const readingPreferences = useReadingPreferences();

const navItems = [
  { labelKey: "public.nav.home", href: "/" },
  { labelKey: "public.nav.features", href: "/features" },
  { labelKey: "public.nav.pricing", href: "/pricing" },
  { labelKey: "public.nav.about", href: "/about" },
];

const languageCodes: Record<AppLocale, string> = {
  en: "US",
  vi: "VN",
  zh: "CN",
  jp: "JP",
  kr: "KR",
};

const languageOptions = computed(() =>
  locales.value.map((item) => {
    const code = typeof item === "string" ? item : item.code;
    if (!isAppLocale(code)) {
      return { code, label: t("locale.label"), short: "--" };
    }
    return { code, label: t(`locale.options.${code}`), short: languageCodes[code] };
  })
);

const currentLanguageShort = computed(() => {
  if (!isAppLocale(locale.value)) return "--";
  return languageCodes[locale.value];
});

const localizedThemeModeOptions = computed(() => getThemeModeOptions(t));

const currentThemeModeLabel = computed(
  () =>
    localizedThemeModeOptions.value.find(
      (item) => item.value === readingPreferences.value.themeMode
    )?.label ?? t("settings.appearance.page.fields.themeMode")
);

const handleLanguageChange = async (value: unknown) => {
  if (typeof value !== "string") return;
  if (!isAppLocale(value)) return;
  await setLocale(value);
};

const handleThemeModeChange = (value: unknown) => {
  if (typeof value !== "string") return;
  if (!isThemeMode(value)) return;
  readingPreferences.value.themeMode = value;
};
</script>

<template>
  <div class="sticky top-4 z-40">
    <div class="mx-auto w-full max-w-6xl px-6">
      <div
        class="flex items-center justify-between gap-4 rounded-2xl border bg-card/95 px-5 py-3 shadow-sm backdrop-blur"
      >
        <NuxtLink to="/" class="text-sm font-semibold tracking-wide">
          {{ t("app.name") }}
        </NuxtLink>

        <nav class="hidden items-center gap-6 text-sm font-medium md:flex">
          <NuxtLink
            v-for="item in navItems"
            :key="item.href"
            :to="item.href"
            class="text-muted-foreground transition hover:text-foreground"
          >
            {{ t(item.labelKey) }}
          </NuxtLink>
        </nav>

        <div class="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button
                variant="outline"
                size="sm"
                class="hidden items-center gap-2 md:inline-flex"
              >
                <Languages class="size-4" />
                <span class="text-xs font-semibold tracking-wide">
                  {{ currentLanguageShort }}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="min-w-44 rounded-xl">
              <DropdownMenuRadioGroup
                :model-value="locale"
                @update:model-value="handleLanguageChange"
              >
                <DropdownMenuRadioItem
                  v-for="option in languageOptions"
                  :key="option.code"
                  :value="option.code"
                >
                  <span class="inline-flex w-8 text-xs font-semibold">{{ option.short }}</span>
                  {{ option.label }}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger as-child>
              <Button
                variant="outline"
                size="sm"
                class="hidden items-center gap-2 md:inline-flex"
              >
                <MonitorCog v-if="readingPreferences.themeMode === 'system'" class="size-4" />
                <Sun v-else-if="readingPreferences.themeMode === 'light'" class="size-4" />
                <Moon v-else class="size-4" />
                <span class="text-xs font-semibold">{{ currentThemeModeLabel }}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" class="min-w-48 rounded-xl">
              <DropdownMenuRadioGroup
                :model-value="readingPreferences.themeMode"
                @update:model-value="handleThemeModeChange"
              >
                <DropdownMenuRadioItem
                  v-for="modeOption in localizedThemeModeOptions"
                  :key="modeOption.value"
                  :value="modeOption.value"
                >
                  <MonitorCog v-if="modeOption.value === 'system'" class="size-4" />
                  <Sun v-else-if="modeOption.value === 'light'" class="size-4" />
                  <Moon v-else class="size-4" />
                  {{ modeOption.label }}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button as-child size="sm" class="hidden md:inline-flex">
            <NuxtLink to="/signup">
              {{ t("public.nav.cta") }}
            </NuxtLink>
          </Button>

          <Sheet :open="mobileOpen" @update:open="(value) => (mobileOpen = value)">
            <SheetTrigger as-child>
              <Button variant="outline" size="sm" class="md:hidden">
                <Menu class="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" class="w-72">
              <SheetHeader>
                <SheetTitle>{{ t("app.name") }}</SheetTitle>
              </SheetHeader>
              <div class="mt-6 flex flex-col gap-4">
                <NuxtLink
                  v-for="item in navItems"
                  :key="item.href"
                  :to="item.href"
                  class="text-sm font-medium"
                  @click="mobileOpen = false"
                >
                  {{ t(item.labelKey) }}
                </NuxtLink>
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="outline" size="sm" class="justify-start gap-2">
                      <Languages class="size-4" />
                      <span class="text-xs font-semibold tracking-wide">
                        {{ currentLanguageShort }}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" class="min-w-44 rounded-xl">
                    <DropdownMenuRadioGroup
                      :model-value="locale"
                      @update:model-value="handleLanguageChange"
                    >
                      <DropdownMenuRadioItem
                        v-for="option in languageOptions"
                        :key="option.code"
                        :value="option.code"
                      >
                        <span class="inline-flex w-8 text-xs font-semibold">
                          {{ option.short }}
                        </span>
                        {{ option.label }}
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                <DropdownMenu>
                  <DropdownMenuTrigger as-child>
                    <Button variant="outline" size="sm" class="justify-start gap-2">
                      <MonitorCog
                        v-if="readingPreferences.themeMode === 'system'"
                        class="size-4"
                      />
                      <Sun v-else-if="readingPreferences.themeMode === 'light'" class="size-4" />
                      <Moon v-else class="size-4" />
                      <span class="text-xs font-semibold">{{ currentThemeModeLabel }}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" class="min-w-48 rounded-xl">
                    <DropdownMenuRadioGroup
                      :model-value="readingPreferences.themeMode"
                      @update:model-value="handleThemeModeChange"
                    >
                      <DropdownMenuRadioItem
                        v-for="modeOption in localizedThemeModeOptions"
                        :key="modeOption.value"
                        :value="modeOption.value"
                      >
                        <MonitorCog v-if="modeOption.value === 'system'" class="size-4" />
                        <Sun v-else-if="modeOption.value === 'light'" class="size-4" />
                        <Moon v-else class="size-4" />
                        {{ modeOption.label }}
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button as-child size="sm">
                  <NuxtLink to="/signup">{{ t("public.nav.cta") }}</NuxtLink>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </div>
  </div>
</template>
