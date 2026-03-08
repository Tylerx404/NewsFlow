<script setup lang="ts">
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIntlLocale } from "@/composables/use-intl-locale";

type QueueJobRow = {
  jobId: string;
  queueName: "rss-fetch" | "content-extract";
  name: string;
  state: "waiting" | "active" | "failed" | "delayed" | "completed";
  attemptsMade: number;
  maxAttempts: number | null;
  failedReason: string | null;
  timestamp: Date | string;
};

const props = defineProps<{
  isLoading: boolean;
  errorMessage: string;
  isActionPending: boolean;
  items: QueueJobRow[];
}>();

const { t } = useI18n();
const intlLocale = useIntlLocale();

const emit = defineEmits<{
  retry: [payload: { queueName: QueueJobRow["queueName"]; jobId: string }];
}>();

const loadingRowKeys = [1, 2, 3, 4, 5];

const queueLabel = (queueName: QueueJobRow["queueName"]) =>
  queueName === "rss-fetch"
    ? t("admin.common.queueName.rssFetch")
    : t("admin.common.queueName.contentExtract");

const formatDateTime = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(intlLocale.value, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const stateBadgeClass = (state: QueueJobRow["state"]) => {
  if (state === "failed") {
    return "border-destructive/30 bg-destructive/10 text-destructive";
  }

  if (state === "active") {
    return "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300";
  }

  if (state === "waiting" || state === "delayed") {
    return "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300";
  }

  return "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
};

const stateLabel = (state: QueueJobRow["state"]) => t(`admin.common.queueState.${state}`);
</script>

<template>
  <div class="overflow-hidden rounded-lg border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{{ t("admin.systemOps.queueJobs.columns.queue") }}</TableHead>
          <TableHead>{{ t("admin.systemOps.queueJobs.columns.job") }}</TableHead>
          <TableHead>{{ t("admin.systemOps.queueJobs.columns.state") }}</TableHead>
          <TableHead>{{ t("admin.systemOps.queueJobs.columns.attempts") }}</TableHead>
          <TableHead>{{ t("admin.systemOps.queueJobs.columns.failure") }}</TableHead>
          <TableHead>{{ t("admin.systemOps.queueJobs.columns.created") }}</TableHead>
          <TableHead class="text-right">{{ t("admin.common.actions") }}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <template v-if="isLoading">
          <TableRow v-for="row in loadingRowKeys" :key="row">
            <TableCell><Skeleton class="h-5 w-24 rounded-full" /></TableCell>
            <TableCell>
              <div class="space-y-2">
                <Skeleton class="h-4 w-28" />
                <Skeleton class="h-3 w-36" />
              </div>
            </TableCell>
            <TableCell><Skeleton class="h-5 w-20 rounded-full" /></TableCell>
            <TableCell><Skeleton class="h-4 w-12" /></TableCell>
            <TableCell><Skeleton class="h-4 w-48" /></TableCell>
            <TableCell><Skeleton class="h-4 w-36" /></TableCell>
            <TableCell class="text-right"><Skeleton class="ml-auto h-8 w-16" /></TableCell>
          </TableRow>
        </template>

        <TableRow v-else-if="errorMessage">
          <TableCell :colspan="7" class="py-8 text-center text-sm text-destructive">
            {{ errorMessage }}
          </TableCell>
        </TableRow>

        <TableRow v-else-if="items.length === 0">
          <TableCell :colspan="7" class="py-8 text-center text-sm text-muted-foreground">
            {{ t("admin.systemOps.queueJobs.empty") }}
          </TableCell>
        </TableRow>

        <TableRow v-for="item in items" v-else :key="`${item.queueName}-${item.jobId}`">
          <TableCell>
            <Badge variant="outline">{{ queueLabel(item.queueName) }}</Badge>
          </TableCell>
          <TableCell>
            <p class="font-medium">{{ item.name }}</p>
            <p class="text-xs text-muted-foreground">
              {{ t("admin.common.id") }}: {{ item.jobId }}
            </p>
          </TableCell>
          <TableCell>
            <Badge variant="outline" :class="stateBadgeClass(item.state)">
              {{ stateLabel(item.state) }}
            </Badge>
          </TableCell>
          <TableCell class="text-sm text-muted-foreground">
            {{ item.attemptsMade }} / {{ item.maxAttempts ?? "—" }}
          </TableCell>
          <TableCell class="max-w-[320px] truncate text-sm text-muted-foreground">
            {{ item.failedReason || "—" }}
          </TableCell>
          <TableCell class="text-sm text-muted-foreground">
            {{ formatDateTime(item.timestamp) }}
          </TableCell>
          <TableCell class="text-right">
            <Button
              size="sm"
              variant="outline"
              :disabled="isActionPending || item.state !== 'failed'"
              @click="emit('retry', { queueName: item.queueName, jobId: item.jobId })"
            >
              {{ t("admin.systemOps.queueJobs.actions.retry") }}
            </Button>
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
