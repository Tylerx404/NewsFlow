<script setup lang="ts">
import { computed } from "vue";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const { t } = useI18n();

const props = defineProps<{
  isLoading: boolean;
  errorMessage: string;
  metrics: {
    totalTokens: number;
    totalRequests: number;
    aiFailureCount: number;
    failedJobCount: number;
    staleFeedCount: number;
    extractionBacklogCount: number;
  } | null;
}>();

const cards = computed(() => [
  {
    title: t("admin.operations.overview.metrics.aiTokens7d.title"),
    description: t("admin.operations.overview.metrics.aiTokens7d.description"),
    value: props.metrics?.totalTokens ?? 0,
  },
  {
    title: t("admin.operations.overview.metrics.aiRequests7d.title"),
    description: t("admin.operations.overview.metrics.aiRequests7d.description"),
    value: props.metrics?.totalRequests ?? 0,
  },
  {
    title: t("admin.operations.overview.metrics.aiFailures7d.title"),
    description: t("admin.operations.overview.metrics.aiFailures7d.description"),
    value: props.metrics?.aiFailureCount ?? 0,
  },
  {
    title: t("admin.operations.overview.metrics.failedQueueJobs.title"),
    description: t("admin.operations.overview.metrics.failedQueueJobs.description"),
    value: props.metrics?.failedJobCount ?? 0,
  },
  {
    title: t("admin.operations.overview.metrics.staleFeeds.title"),
    description: t("admin.operations.overview.metrics.staleFeeds.description"),
    value: props.metrics?.staleFeedCount ?? 0,
  },
  {
    title: t("admin.operations.overview.metrics.extractionBacklog.title"),
    description: t("admin.operations.overview.metrics.extractionBacklog.description"),
    value: props.metrics?.extractionBacklogCount ?? 0,
  },
]);

const formatNumber = (value: number) => value.toLocaleString();
</script>

<template>
  <div class="space-y-3">
    <p v-if="errorMessage" class="text-sm text-destructive">
      {{ errorMessage }}
    </p>

    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <Card v-for="card in cards" :key="card.title">
        <CardHeader class="space-y-1">
          <CardTitle class="text-sm font-medium">{{ card.title }}</CardTitle>
          <CardDescription>{{ card.description }}</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton v-if="isLoading" class="h-8 w-20" />
          <p v-else class="text-2xl font-semibold">{{ formatNumber(card.value) }}</p>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
