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

type AdminAiUsageEvent = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  provider: string;
  model: string;
  tokens: number;
  action: string;
  status: "SUCCESS" | "FAILED";
  durationMs: number | null;
  errorSummary: string | null;
  createdAt: Date | string;
};

const props = defineProps<{
  isLoading: boolean;
  errorMessage: string;
  items: AdminAiUsageEvent[];
}>();

const { t } = useI18n();
const intlLocale = useIntlLocale();

const loadingRowKeys = [1, 2, 3, 4, 5];

const formatDateTime = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(intlLocale.value, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatDuration = (durationMs: number | null) => {
  if (durationMs === null) {
    return "—";
  }

  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  return `${(durationMs / 1000).toFixed(2)}s`;
};

const statusBadgeClass = (status: AdminAiUsageEvent["status"]) =>
  status === "FAILED"
    ? "border-destructive/30 bg-destructive/10 text-destructive"
    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";

const formatStatus = (status: AdminAiUsageEvent["status"]) =>
  status === "FAILED"
    ? t("admin.common.eventStatus.failed")
    : t("admin.common.eventStatus.success");
</script>

<template>
  <div class="overflow-hidden rounded-lg border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{{ t("admin.aiUsage.table.columns.user") }}</TableHead>
          <TableHead>{{ t("admin.aiUsage.table.columns.providerModel") }}</TableHead>
          <TableHead>{{ t("admin.aiUsage.table.columns.status") }}</TableHead>
          <TableHead>{{ t("admin.aiUsage.table.columns.tokens") }}</TableHead>
          <TableHead>{{ t("admin.aiUsage.table.columns.duration") }}</TableHead>
          <TableHead>{{ t("admin.aiUsage.table.columns.errorSummary") }}</TableHead>
          <TableHead>{{ t("admin.aiUsage.table.columns.created") }}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <template v-if="isLoading">
          <TableRow v-for="row in loadingRowKeys" :key="row">
            <TableCell>
              <div class="space-y-2">
                <Skeleton class="h-4 w-28" />
                <Skeleton class="h-3 w-40" />
              </div>
            </TableCell>
            <TableCell>
              <div class="space-y-2">
                <Skeleton class="h-4 w-20" />
                <Skeleton class="h-3 w-28" />
              </div>
            </TableCell>
            <TableCell><Skeleton class="h-5 w-20 rounded-full" /></TableCell>
            <TableCell><Skeleton class="h-4 w-12" /></TableCell>
            <TableCell><Skeleton class="h-4 w-16" /></TableCell>
            <TableCell><Skeleton class="h-4 w-48" /></TableCell>
            <TableCell><Skeleton class="h-4 w-32" /></TableCell>
          </TableRow>
        </template>

        <TableRow v-else-if="errorMessage">
          <TableCell :colspan="7" class="py-8 text-center text-sm text-destructive">
            {{ errorMessage }}
          </TableCell>
        </TableRow>

        <TableRow v-else-if="items.length === 0">
          <TableCell :colspan="7" class="py-8 text-center text-sm text-muted-foreground">
            {{ t("admin.aiUsage.table.empty") }}
          </TableCell>
        </TableRow>

        <TableRow v-for="item in items" v-else :key="item.id">
          <TableCell>
            <p class="font-medium">{{ item.userName }}</p>
            <p class="text-xs text-muted-foreground">{{ item.userEmail }}</p>
          </TableCell>
          <TableCell>
            <p class="font-medium">{{ item.provider }}</p>
            <p class="text-xs text-muted-foreground">{{ item.model }}</p>
          </TableCell>
          <TableCell>
            <Badge variant="outline" :class="statusBadgeClass(item.status)">
              {{ formatStatus(item.status) }}
            </Badge>
          </TableCell>
          <TableCell>{{ new Intl.NumberFormat(intlLocale).format(item.tokens) }}</TableCell>
          <TableCell>{{ formatDuration(item.durationMs) }}</TableCell>
          <TableCell class="max-w-[320px] truncate text-sm text-muted-foreground">
            {{ item.errorSummary || "—" }}
          </TableCell>
          <TableCell class="text-sm text-muted-foreground">
            {{ formatDateTime(item.createdAt) }}
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  </div>
</template>
