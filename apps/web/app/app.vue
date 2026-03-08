<script setup lang="ts">
import { VueQueryDevtools } from "@tanstack/vue-query-devtools";

const localeHead = useLocaleHead();

useHead(() => ({
  htmlAttrs: {
    lang: localeHead.value.htmlAttrs?.lang ?? "en",
    dir: localeHead.value.htmlAttrs?.dir,
  },
  script: [
    {
      key: "theme-preference-init",
      tagPosition: "head",
      innerHTML:
        "(() => { try { const raw = localStorage.getItem('newsflow:reader-preferences'); const parsed = raw ? JSON.parse(raw) : null; const mode = parsed?.themeMode; const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches; const useDark = mode === 'dark' || (mode !== 'light' && prefersDark); document.documentElement.classList.toggle('dark', useDark); } catch {} })();",
    },
  ],
}));
</script>

<template>
  <NuxtLoadingIndicator />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <VueQueryDevtools />
</template>
