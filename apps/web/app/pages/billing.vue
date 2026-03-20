<script setup lang="ts">
import UserBillingPanel from "@/components/billing/UserBillingPanel.vue";

definePageMeta({
  layout: "dashboard",
  middleware: "dashboard-auth",
  titleKey: "layout.titles.billing",
});

const { t } = useI18n();
</script>

<template>
  <div class="mx-auto flex w-full max-w-4xl flex-col gap-6">
    <section class="space-y-2">
      <h1 class="text-2xl font-semibold tracking-tight">
        {{ t("billingPage.title") }}
      </h1>
      <p class="text-sm text-muted-foreground">
        {{ t("billingPage.description") }}
      </p>
    </section>

    <UserBillingPanel />
  </div>
</template>
