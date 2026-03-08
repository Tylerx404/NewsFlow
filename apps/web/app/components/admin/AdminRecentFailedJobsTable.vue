<script setup lang="ts">
import { Badge } from "@/components/ui/badge";
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

type FailedJobItem = {
  jobId: string;
  queueName: "rss-fetch" | "content-extract";
  name: string;
  state: "waiting" | "active" | "failed" | "delayed" | "completed";
  failedReason: string | null;
  timestamp: Date | string;
};

const props = defineProps<{
  isLoading: boolean;
  errorMessage: string;
  items: FailedJobItem[];
}>();

const { t } = useI18n();
const intlLocale = useIntlLocale();

const loadingRowKeys = [1, 2, 3, 4];

const formatDateTime = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(intlLocale.value, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const queueLabel = (queueName: FailedJobItem["queueName"]) => {
  if (queueName === "rss-fetch") {
    return t("admin.common.queueName.rssFetch");
  }

  return t("admin.common.queueName.contentExtract");
};
</script>

<template>
  <div class="overflow-hidden rounded-lg border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{{ t("admin.operations.recentFailedJobs.columns.queue") }}</TableHead>
          <TableHead>{{ t("admin.operations.recentFailedJobs.columns.job") }}</TableHead>
          <TableHead>{{ t("admin.operations.recentFailedJobs.columns.failure") }}</TableHead>
          <TableHead>{{ t("admin.operations.recentFailedJobs.columns.time") }}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <template v-if="isLoading">
          <TableRow v-for="row in loadingRowKeys" :key="row">
            <TableCell><Skeleton class="h-5 w-24 rounded-full" /></TableCell>
            <TableCell>
              <div class="space-y-2">
                <Skeleton class="h-4 w-44" />
                <Skeleton class="h-3 w-28" />
              </div>
            </TableCell>
            <TableCell><Skeleton class="h-4 w-64" /></TableCell>
            <TableCell><Skeleton class="h-4 w-36" /></TableCell>
          </TableRow>
        </template>

        <TableRow v-else-if="errorMessage">
          <TableCell :colspan="4" class="py-8 text-center text-sm text-destructive">
            {{ errorMessage }}
          </TableCell>
        </TableRow>

        <TableRow v-else-if="items.length === 0">
          <TableCell :colspan="4" class="py-8 text-center text-sm text-muted-foreground">
            {{ t("admin.operations.recentFailedJobs.empty") }}
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
          <TableCell class="text-sm text-muted-foreground">
            {{ item.failedReason || t("admin.operations.recentFailedJobs.noFailureReason") }}
          </TableCell>
          <TableCell class="text-sm text-muted-foreground">
            {{ formatDateTime(item.timestamp) }}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
