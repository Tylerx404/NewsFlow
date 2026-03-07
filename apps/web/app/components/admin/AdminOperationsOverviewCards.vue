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
    title: "AI tokens (7d)",
    description: "Total token usage in the last 7 days.",
    value: props.metrics?.totalTokens ?? 0,
  },
  {
    title: "AI requests (7d)",
    description: "Total summarize requests in the last 7 days.",
    value: props.metrics?.totalRequests ?? 0,
  },
  {
    title: "AI failures (7d)",
    description: "Failed summarize attempts in the last 7 days.",
    value: props.metrics?.aiFailureCount ?? 0,
  },
  {
    title: "Failed queue jobs",
    description: "Current failed jobs across worker queues.",
    value: props.metrics?.failedJobCount ?? 0,
  },
  {
    title: "Stale feeds",
    description: "Enabled feeds waiting for fetch scheduling.",
    value: props.metrics?.staleFeedCount ?? 0,
  },
  {
    title: "Extraction backlog",
    description: "Articles waiting for content extraction.",
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
