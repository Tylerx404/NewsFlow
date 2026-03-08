<script setup lang="ts">
const { t } = useI18n();

definePageMeta({
  layout: "dashboard",
  middleware: "dashboard-auth",
  titleKey: "layout.titles.settings",
});

await navigateTo("/settings/appearance", { replace: true });
</script>

<template>
  <p class="text-sm text-muted-foreground">
    {{ t("settings.index.redirecting") }}
  </p>
</template>
