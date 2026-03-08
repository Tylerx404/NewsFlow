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
import { useIntlLocale } from "@/composables/use-intl-locale";

type RuntimeNode = {
  state: "healthy" | "stale" | "offline" | "unknown";
  lastSeenAt: Date | string | null;
  ageMs: number | null;
};

const props = defineProps<{
  isLoading: boolean;
  errorMessage: string;
  runtime: {
    worker: RuntimeNode;
    rssScheduler: RuntimeNode;
    contentScheduler: RuntimeNode;
  } | null;
}>();

const { t } = useI18n();
const intlLocale = useIntlLocale();

const healthRows = computed(() => [
  {
    label: t("admin.common.runtimeNodes.worker"),
    node: props.runtime?.worker ?? null,
  },
  {
    label: t("admin.common.runtimeNodes.rssScheduler"),
    node: props.runtime?.rssScheduler ?? null,
  },
  {
    label: t("admin.common.runtimeNodes.contentScheduler"),
    node: props.runtime?.contentScheduler ?? null,
  },
]);

const badgeClassByState = (state: RuntimeNode["state"]) => {
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

const formatState = (state: RuntimeNode["state"]) => t(`admin.common.runtimeStates.${state}`);

const formatLastSeen = (value: RuntimeNode["lastSeenAt"]) => {
  if (!value) {
    return t("admin.common.noHeartbeat");
  }

  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(intlLocale.value, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatAge = (ageMs: number | null) => {
  if (ageMs === null) {
    return t("admin.common.notAvailable");
  }

  const seconds = Math.floor(ageMs / 1000);
  if (seconds < 60) {
    return t("admin.common.age.secondsAgo", { value: seconds });
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return t("admin.common.age.minutesAgo", { value: minutes });
  }

  const hours = Math.floor(minutes / 60);
  return t("admin.common.age.hoursAgo", { value: hours });
};
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>{{ t("admin.operations.runtimeHealth.title") }}</CardTitle>
      <CardDescription>
        {{ t("admin.operations.runtimeHealth.description") }}
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-3">
      <p v-if="errorMessage" class="text-sm text-destructive">
        {{ errorMessage }}
      </p>

      <template v-if="isLoading">
        <div v-for="row in [1, 2, 3]" :key="row" class="rounded-md border p-3">
          <Skeleton class="h-4 w-24" />
          <Skeleton class="mt-2 h-4 w-40" />
        </div>
      </template>

      <template v-else>
        <div
          v-for="row in healthRows"
          :key="row.label"
          class="rounded-md border p-3"
        >
          <div class="flex items-center justify-between gap-3">
            <p class="text-sm font-medium">{{ row.label }}</p>
            <Badge
              v-if="row.node"
              variant="outline"
              :class="badgeClassByState(row.node.state)"
            >
              {{ formatState(row.node.state) }}
            </Badge>
            <Badge v-else variant="outline">{{ t("admin.common.runtimeStates.unknown") }}</Badge>
          </div>
          <p class="mt-2 text-xs text-muted-foreground">
            {{ t("admin.common.lastHeartbeat") }}:
            {{ row.node ? formatLastSeen(row.node.lastSeenAt) : t("admin.common.notAvailable") }}
          </p>
          <p class="text-xs text-muted-foreground">
            {{ t("admin.common.age.label") }}:
            {{ row.node ? formatAge(row.node.ageMs) : t("admin.common.notAvailable") }}
          </p>
        </div>
      </template>
    </CardContent>
  </Card>
</template>
