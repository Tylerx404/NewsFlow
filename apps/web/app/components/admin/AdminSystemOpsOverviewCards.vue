<script setup lang="ts">
import { computed } from "vue";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type RuntimeNode = {
  state: "healthy" | "stale" | "offline" | "unknown";
  lastSeenAt: Date | string | null;
  ageMs: number | null;
};

type QueueCountItem = {
  queueName: "rss-fetch" | "content-extract";
  waiting: number;
  active: number;
  failed: number;
  delayed: number;
  completed: number;
};

const props = defineProps<{
  isLoading: boolean;
  overview: {
    runtime: {
      worker: RuntimeNode;
      rssScheduler: RuntimeNode;
      contentScheduler: RuntimeNode;
    };
    queues: QueueCountItem[];
    failedJobCount: number;
    staleFeedCount: number;
    extractionBacklogCount: number;
  } | null;
}>();

const queueMap = computed(() => {
  const map = new Map<string, QueueCountItem>();

  for (const queue of props.overview?.queues ?? []) {
    map.set(queue.queueName, queue);
  }

  return map;
});

const cards = computed(() => [
  {
    title: "Failed jobs",
    description: "Current failed jobs across queues.",
    value: props.overview?.failedJobCount ?? 0,
  },
  {
    title: "Stale feeds",
    description: "Enabled feeds waiting for refresh.",
    value: props.overview?.staleFeedCount ?? 0,
  },
  {
    title: "Extraction backlog",
    description: "Articles waiting for extraction.",
    value: props.overview?.extractionBacklogCount ?? 0,
  },
  {
    title: "RSS waiting jobs",
    description: "Pending RSS fetch jobs.",
    value: queueMap.value.get("rss-fetch")?.waiting ?? 0,
  },
  {
    title: "Content waiting jobs",
    description: "Pending content extraction jobs.",
    value: queueMap.value.get("content-extract")?.waiting ?? 0,
  },
]);

const runtimeRows = computed(() => [
  {
    label: "Worker",
    node: props.overview?.runtime.worker ?? null,
  },
  {
    label: "RSS scheduler",
    node: props.overview?.runtime.rssScheduler ?? null,
  },
  {
    label: "Content scheduler",
    node: props.overview?.runtime.contentScheduler ?? null,
  },
]);

const formatAge = (ageMs: number | null) => {
  if (ageMs === null) {
    return "N/A";
  }

  const seconds = Math.floor(ageMs / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m`;
  }

  return `${Math.floor(minutes / 60)}h`;
};

const runtimeBadgeClass = (state: RuntimeNode["state"]) => {
  if (state === "healthy") {
    return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
  }

  if (state === "stale") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  if (state === "offline") {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }

  return "border-muted bg-muted/30 text-muted-foreground";
};

const formatState = (state: RuntimeNode["state"]) =>
  state.charAt(0).toUpperCase() + state.slice(1);
</script>

<template>
  <div class="space-y-4">
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <Card v-for="card in cards" :key="card.title">
        <CardHeader class="space-y-1">
          <CardTitle class="text-sm font-medium">{{ card.title }}</CardTitle>
          <CardDescription>{{ card.description }}</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton v-if="isLoading" class="h-8 w-16" />
          <p v-else class="text-2xl font-semibold">{{ card.value.toLocaleString() }}</p>
        </CardContent>
      </Card>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Runtime heartbeat</CardTitle>
        <CardDescription>
          Worker and scheduler liveness from Redis heartbeat keys.
        </CardDescription>
      </CardHeader>
      <CardContent class="grid gap-3 md:grid-cols-3">
        <template v-if="isLoading">
          <div v-for="row in [1, 2, 3]" :key="row" class="rounded-md border p-3">
            <Skeleton class="h-4 w-20" />
            <Skeleton class="mt-2 h-5 w-24 rounded-full" />
            <Skeleton class="mt-2 h-4 w-24" />
          </div>
        </template>
        <div
          v-for="row in runtimeRows"
          v-else
          :key="row.label"
          class="rounded-md border p-3"
        >
          <p class="text-sm font-medium">{{ row.label }}</p>
          <Badge
            v-if="row.node"
            variant="outline"
            class="mt-2"
            :class="runtimeBadgeClass(row.node.state)"
          >
            {{ formatState(row.node.state) }}
          </Badge>
          <Badge v-else variant="outline" class="mt-2">Unknown</Badge>
          <p class="mt-2 text-xs text-muted-foreground">
            Age: {{ row.node ? formatAge(row.node.ageMs) : "N/A" }}
          </p>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
