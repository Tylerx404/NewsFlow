<script setup lang="ts">
import UserBillingHistoryPanel from "@/components/billing/UserBillingHistoryPanel.vue";
import UserBillingPanel from "@/components/billing/UserBillingPanel.vue";

definePageMeta({
  layout: "dashboard",
  middleware: "dashboard-auth",
  titleKey: "layout.titles.billing",
});

const { t } = useI18n();
</script>

<template>
  <div class="flex w-full flex-col gap-6">
    <section class="space-y-2">
      <h1 class="text-2xl font-semibold tracking-tight">
        {{ t("billingPage.title") }}
      </h1>
      <p class="text-sm text-muted-foreground">
        {{ t("billingPage.description") }}
      </p>
    </section>

    <div class="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,3fr)]">
      <div class="order-2 xl:order-1">
        <UserBillingHistoryPanel />
      </div>
      <div class="order-1 xl:order-2">
        <UserBillingPanel />
      </div>
    </div>
  </div>
</template>
