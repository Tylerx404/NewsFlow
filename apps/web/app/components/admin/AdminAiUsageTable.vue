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

const loadingRowKeys = [1, 2, 3, 4, 5];

const formatDateTime = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString();
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
</script>

<template>
  <div class="overflow-hidden rounded-lg border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>User</TableHead>
          <TableHead>Provider / model</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Tokens</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Error summary</TableHead>
          <TableHead>Created</TableHead>
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
            No AI usage events match the current filters.
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
              {{ item.status }}
            </Badge>
          </TableCell>
          <TableCell>{{ item.tokens.toLocaleString() }}</TableCell>
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
