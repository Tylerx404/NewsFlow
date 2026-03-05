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
  isReaderColorPreset,
  isReaderContentWidth,
  isReaderFontFamily,
  isReaderFontSize,
  isReaderLineHeight,
  isThemeMode,
  readerColorPresetOptions,
  readerContentWidthOptions,
  readerFontFamilyOptions,
  readerFontSizeOptions,
  readerLineHeightOptions,
  themeModeOptions,
  type ReaderPreferenceOption,
} from "@/lib/reader-preferences";

definePageMeta({
  layout: "dashboard",
  middleware: "dashboard-auth",
  title: "Appearance Settings",
});

const readingPreferences = useReadingPreferences();

const resolveDescription = <TValue extends string>(
  options: ReaderPreferenceOption<TValue>[],
  value: TValue
): string => options.find((option) => option.value === value)?.description ?? "";

const themeModeDescription = computed(() =>
  resolveDescription(themeModeOptions, readingPreferences.value.themeMode)
);
const colorPresetDescription = computed(() =>
  resolveDescription(readerColorPresetOptions, readingPreferences.value.colorPreset)
);
const fontFamilyDescription = computed(() =>
  resolveDescription(readerFontFamilyOptions, readingPreferences.value.fontFamily)
);
const fontSizeDescription = computed(() =>
  resolveDescription(readerFontSizeOptions, readingPreferences.value.fontSize)
);
const lineHeightDescription = computed(() =>
  resolveDescription(readerLineHeightOptions, readingPreferences.value.lineHeight)
);
const contentWidthDescription = computed(() =>
  resolveDescription(readerContentWidthOptions, readingPreferences.value.contentWidth)
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
        <CardTitle>Reading Experience</CardTitle>
        <CardDescription>
          Tune appearance, typography, and layout for a reading flow that fits your preference.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-2">
            <p class="text-sm font-medium">Theme mode</p>
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
            <p class="text-sm font-medium">Color preset</p>
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
            <p class="text-sm font-medium">Font family</p>
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
            <p class="text-sm font-medium">Font size</p>
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
            <p class="text-sm font-medium">Line height</p>
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
            <p class="text-sm font-medium">Reading width</p>
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
            Preferences are saved locally in your browser and applied immediately.
          </p>
          <Button variant="outline" @click="resetToDefaults">
            Reset defaults
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card class="h-fit xl:sticky xl:top-6">
      <CardHeader>
        <CardTitle>Live Preview</CardTitle>
        <CardDescription>
          Preview typography and spacing before reading full articles.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <article class="reader-article-shell rounded-xl border p-4 md:p-5">
          <div class="reader-content">
            <h2>Morning Briefing: Markets Open Mixed</h2>
            <p>
              <strong>Highlights:</strong>
              Global indexes opened with mixed movement while energy stocks
              outperformed. Analysts expect volatility to remain elevated.
            </p>
            <p>
              This paragraph shows <em>italic emphasis</em>,
              <strong>bold segments</strong>, and normal body copy rhythm.
            </p>
            <blockquote>
              "Readers should be able to stay focused for long sessions without eye strain."
            </blockquote>
            <ul>
              <li>More consistent text hierarchy</li>
              <li>Improved spacing between sections</li>
              <li>Cleaner link visibility for source tracking</li>
            </ul>
            <p>
              <a href="#">Open source report</a>
            </p>
          </div>
        </article>
      </CardContent>
    </Card>
  </div>
</template>
