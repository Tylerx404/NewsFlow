<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";

import AdminOperationsOverviewCards from "@/components/admin/AdminOperationsOverviewCards.vue";
import AdminRecentFailedJobsTable from "@/components/admin/AdminRecentFailedJobsTable.vue";
import AdminRuntimeHealthPanel from "@/components/admin/AdminRuntimeHealthPanel.vue";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dashboardQueryKeys } from "@/lib/dashboard-query-keys";

definePageMeta({
  layout: "dashboard",
  middleware: "admin-auth",
  titleKey: "admin.operations.metaTitle",
});

const { $orpc } = useNuxtApp();
const { t } = useI18n();

const aiOverviewDays = 7;

const aiOverviewQuery = useQuery(
  $orpc.admin.aiUsage.overview.queryOptions({
    input: { days: aiOverviewDays },
    queryKey: dashboardQueryKeys.admin.aiUsage.overview(aiOverviewDays),
  })
);

const systemOverviewQuery = useQuery(
  $orpc.admin.systemOps.overview.queryOptions({
    input: {},
    queryKey: dashboardQueryKeys.admin.operations.overview(),
  })
);

const isOverviewLoading = computed(
  () => aiOverviewQuery.isLoading.value || systemOverviewQuery.isLoading.value
);

const overviewErrorMessage = computed(() => {
  const aiError = aiOverviewQuery.error.value;
  if (aiError) {
    return aiError instanceof Error
      ? aiError.message
      : t("admin.operations.errors.aiUsageSummary");
  }

  const systemError = systemOverviewQuery.error.value;
  if (systemError) {
    return systemError instanceof Error
      ? systemError.message
      : t("admin.operations.errors.systemOverview");
  }

  return "";
});

const overviewMetrics = computed(() => {
  if (!aiOverviewQuery.data.value || !systemOverviewQuery.data.value) {
    return null;
  }

  return {
    totalTokens: aiOverviewQuery.data.value.totalTokens,
    totalRequests: aiOverviewQuery.data.value.totalRequests,
    aiFailureCount: aiOverviewQuery.data.value.failureCount,
    failedJobCount: systemOverviewQuery.data.value.failedJobCount,
    staleFeedCount: systemOverviewQuery.data.value.staleFeedCount,
    extractionBacklogCount: systemOverviewQuery.data.value.extractionBacklogCount,
  };
});

const runtimeErrorMessage = computed(() => {
  if (!systemOverviewQuery.error.value) {
    return "";
  }

  return systemOverviewQuery.error.value instanceof Error
    ? systemOverviewQuery.error.value.message
    : t("admin.operations.errors.runtimeHealth");
});

const recentJobsErrorMessage = computed(() => {
  if (!systemOverviewQuery.error.value) {
    return "";
  }

  return systemOverviewQuery.error.value instanceof Error
    ? systemOverviewQuery.error.value.message
    : t("admin.operations.errors.recentQueueFailures");
});
</script>

<template>
  <div class="space-y-6">
    <section class="space-y-1">
      <h1 class="text-2xl font-semibold">{{ t("admin.operations.overview.title") }}</h1>
      <p class="text-sm text-muted-foreground">
        {{ t("admin.operations.overview.description") }}
      </p>
    </section>

    <AdminOperationsOverviewCards
      :is-loading="isOverviewLoading"
      :error-message="overviewErrorMessage"
      :metrics="overviewMetrics"
    />

    <section class="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <AdminRuntimeHealthPanel
        :is-loading="systemOverviewQuery.isLoading.value"
        :error-message="runtimeErrorMessage"
        :runtime="systemOverviewQuery.data.value?.runtime ?? null"
      />

      <Card>
        <CardHeader>
          <CardTitle>{{ t("admin.operations.drillDown.title") }}</CardTitle>
          <CardDescription>
            {{ t("admin.operations.drillDown.description") }}
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <Button class="w-full" variant="outline" @click="navigateTo('/admin/ai-usage')">
            {{ t("admin.operations.drillDown.openAiUsage") }}
          </Button>
          <Button class="w-full" variant="outline" @click="navigateTo('/admin/system-ops')">
            {{ t("admin.operations.drillDown.openSystemOps") }}
          </Button>
        </CardContent>
      </Card>
    </section>

    <Card>
      <CardHeader>
        <CardTitle>{{ t("admin.operations.recentFailedJobs.title") }}</CardTitle>
        <CardDescription>
          {{ t("admin.operations.recentFailedJobs.description") }}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AdminRecentFailedJobsTable
          :is-loading="systemOverviewQuery.isLoading.value"
          :error-message="recentJobsErrorMessage"
          :items="systemOverviewQuery.data.value?.recentFailedJobs ?? []"
        />
      </CardContent>
    </Card>
  </div>
</template>
