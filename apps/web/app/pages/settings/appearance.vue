<script setup lang="ts">
import { computed } from "vue";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReadingPreferences } from "@/composables/use-reading-preferences";
import {
  DEFAULT_READER_PREFERENCES,
  getReaderColorPresetOptions,
  getReaderContentWidthOptions,
  getReaderFontFamilyOptions,
  getReaderFontSizeOptions,
  getReaderLineHeightOptions,
  getThemeModeOptions,
  isReaderColorPreset,
  isReaderContentWidth,
  isReaderFontFamily,
  isReaderFontSize,
  isReaderLineHeight,
  isThemeMode,
  type ReaderPreferenceOption,
} from "@/lib/reader-preferences";

definePageMeta({
  layout: "dashboard",
  middleware: "dashboard-auth",
  titleKey: "settings.appearance.metaTitle",
});

const readingPreferences = useReadingPreferences();
const { t } = useI18n();

const themeModeOptions = computed(() => getThemeModeOptions(t));
const readerColorPresetOptions = computed(() => getReaderColorPresetOptions(t));
const readerFontFamilyOptions = computed(() => getReaderFontFamilyOptions(t));
const readerFontSizeOptions = computed(() => getReaderFontSizeOptions(t));
const readerLineHeightOptions = computed(() => getReaderLineHeightOptions(t));
const readerContentWidthOptions = computed(() => getReaderContentWidthOptions(t));

const resolveDescription = <TValue extends string>(
  options: ReaderPreferenceOption<TValue>[],
  value: TValue
): string => options.find((option) => option.value === value)?.description ?? "";

const themeModeDescription = computed(() =>
  resolveDescription(themeModeOptions.value, readingPreferences.value.themeMode)
);
const colorPresetDescription = computed(() =>
  resolveDescription(readerColorPresetOptions.value, readingPreferences.value.colorPreset)
);
const fontFamilyDescription = computed(() =>
  resolveDescription(readerFontFamilyOptions.value, readingPreferences.value.fontFamily)
);
const fontSizeDescription = computed(() =>
  resolveDescription(readerFontSizeOptions.value, readingPreferences.value.fontSize)
);
const lineHeightDescription = computed(() =>
  resolveDescription(readerLineHeightOptions.value, readingPreferences.value.lineHeight)
);
const contentWidthDescription = computed(() =>
  resolveDescription(readerContentWidthOptions.value, readingPreferences.value.contentWidth)
);

const updateThemeMode = (value: unknown) => {
  if (typeof value !== "string" || !isThemeMode(value)) {
    return;
  }

  readingPreferences.value.themeMode = value;
};

const updateColorPreset = (value: unknown) => {
  if (typeof value !== "string" || !isReaderColorPreset(value)) {
    return;
  }

  readingPreferences.value.colorPreset = value;
};

const updateFontFamily = (value: unknown) => {
  if (typeof value !== "string" || !isReaderFontFamily(value)) {
    return;
  }

  readingPreferences.value.fontFamily = value;
};

const updateFontSize = (value: unknown) => {
  if (typeof value !== "string" || !isReaderFontSize(value)) {
    return;
  }

  readingPreferences.value.fontSize = value;
};

const updateLineHeight = (value: unknown) => {
  if (typeof value !== "string" || !isReaderLineHeight(value)) {
    return;
  }

  readingPreferences.value.lineHeight = value;
};

const updateContentWidth = (value: unknown) => {
  if (typeof value !== "string" || !isReaderContentWidth(value)) {
    return;
  }

  readingPreferences.value.contentWidth = value;
};

const resetToDefaults = () => {
  readingPreferences.value = {
    ...DEFAULT_READER_PREFERENCES,
  };
};
</script>

<template>
  <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
    <Card>
      <CardHeader class="space-y-2">
        <CardTitle>{{ t("settings.appearance.page.readingExperience.title") }}</CardTitle>
        <CardDescription>
          {{ t("settings.appearance.page.readingExperience.description") }}
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("settings.appearance.page.fields.themeMode") }}</p>
            <Select
              :model-value="readingPreferences.themeMode"
              @update:model-value="updateThemeMode"
            >
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="modeOption in themeModeOptions"
                  :key="modeOption.value"
                  :value="modeOption.value"
                >
                  {{ modeOption.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p class="text-xs text-muted-foreground">
              {{ themeModeDescription }}
            </p>
          </div>

          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("settings.appearance.page.fields.colorPreset") }}</p>
            <Select
              :model-value="readingPreferences.colorPreset"
              @update:model-value="updateColorPreset"
            >
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="colorOption in readerColorPresetOptions"
                  :key="colorOption.value"
                  :value="colorOption.value"
                >
                  {{ colorOption.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p class="text-xs text-muted-foreground">
              {{ colorPresetDescription }}
            </p>
          </div>

          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("settings.appearance.page.fields.fontFamily") }}</p>
            <Select
              :model-value="readingPreferences.fontFamily"
              @update:model-value="updateFontFamily"
            >
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="fontOption in readerFontFamilyOptions"
                  :key="fontOption.value"
                  :value="fontOption.value"
                >
                  {{ fontOption.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p class="text-xs text-muted-foreground">
              {{ fontFamilyDescription }}
            </p>
          </div>

          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("settings.appearance.page.fields.fontSize") }}</p>
            <Select
              :model-value="readingPreferences.fontSize"
              @update:model-value="updateFontSize"
            >
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="fontSizeOption in readerFontSizeOptions"
                  :key="fontSizeOption.value"
                  :value="fontSizeOption.value"
                >
                  {{ fontSizeOption.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p class="text-xs text-muted-foreground">
              {{ fontSizeDescription }}
            </p>
          </div>

          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("settings.appearance.page.fields.lineHeight") }}</p>
            <Select
              :model-value="readingPreferences.lineHeight"
              @update:model-value="updateLineHeight"
            >
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="lineHeightOption in readerLineHeightOptions"
                  :key="lineHeightOption.value"
                  :value="lineHeightOption.value"
                >
                  {{ lineHeightOption.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p class="text-xs text-muted-foreground">
              {{ lineHeightDescription }}
            </p>
          </div>

          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("settings.appearance.page.fields.readingWidth") }}</p>
            <Select
              :model-value="readingPreferences.contentWidth"
              @update:model-value="updateContentWidth"
            >
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="contentWidthOption in readerContentWidthOptions"
                  :key="contentWidthOption.value"
                  :value="contentWidthOption.value"
                >
                  {{ contentWidthOption.label }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p class="text-xs text-muted-foreground">
              {{ contentWidthDescription }}
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 p-4">
          <p class="text-sm text-muted-foreground">
            {{ t("settings.appearance.page.savedNotice") }}
          </p>
          <Button variant="outline" @click="resetToDefaults">
            {{ t("settings.appearance.page.resetDefaults") }}
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card class="h-fit xl:sticky xl:top-6">
      <CardHeader>
        <CardTitle>{{ t("settings.appearance.preview.title") }}</CardTitle>
        <CardDescription>
          {{ t("settings.appearance.preview.description") }}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <article class="reader-article-shell rounded-xl border p-4 md:p-5">
          <div class="reader-content">
            <h2>{{ t("settings.appearance.preview.sample.heading") }}</h2>
            <p>
              <strong>{{ t("settings.appearance.preview.sample.highlightsLabel") }}</strong>
              {{ t("settings.appearance.preview.sample.paragraph1") }}
            </p>
            <p>
              {{ t("settings.appearance.preview.sample.paragraph2Prefix") }} <em>{{ t("settings.appearance.preview.sample.italic") }}</em>,
              <strong>{{ t("settings.appearance.preview.sample.bold") }}</strong>{{ t("settings.appearance.preview.sample.paragraph2Suffix") }}
            </p>
            <blockquote>
              "{{ t("settings.appearance.preview.sample.quote") }}"
            </blockquote>
            <ul>
              <li>{{ t("settings.appearance.preview.sample.bullet1") }}</li>
              <li>{{ t("settings.appearance.preview.sample.bullet2") }}</li>
              <li>{{ t("settings.appearance.preview.sample.bullet3") }}</li>
            </ul>
            <p>
              <a href="#">{{ t("settings.appearance.preview.sample.openSourceReport") }}</a>
            </p>
          </div>
        </article>
      </CardContent>
    </Card>
  </div>
</template>
