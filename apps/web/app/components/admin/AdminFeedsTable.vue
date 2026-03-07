<script setup lang="ts">
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AdminFeedListItem = {
  id: string;
  url: string;
  normalizedUrl: string;
  siteUrl: string | null;
  title: string;
  description: string | null;
  iconUrl: string | null;
  language: string | null;
  isEnabled: boolean;
  errorCount: number;
  lastError: string | null;
  lastFetched: Date | string | null;
  nextFetchAt: Date | string | null;
  subscriptionCount: number;
  articleCount: number;
  extractionFailureCount: number;
  createdAt: Date | string;
  updatedAt: Date | string;
};

const props = defineProps<{
  items: AdminFeedListItem[];
  isLoading: boolean;
  errorMessage: string;
  hasMore: boolean;
  isActionPending: boolean;
}>();

const emit = defineEmits<{
  open: [feedSourceId: string];
  toggleEnabled: [payload: { feedSourceId: string; isEnabled: boolean }];
  retryFetch: [feedSourceId: string];
  retryExtraction: [feedSourceId: string];
}>();

const formatDateTime = (value: Date | string | null) => {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString();
};

const statusBadgeClass = (count: number) =>
  count > 0
    ? "border-destructive/30 bg-destructive/10 text-destructive"
    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";
</script>

<template>
  <div class="space-y-3">
    <div class="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Feed</TableHead>
            <TableHead>Enabled</TableHead>
            <TableHead>Health</TableHead>
            <TableHead>Coverage</TableHead>
            <TableHead>Last fetched</TableHead>
            <TableHead class="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-if="isLoading">
            <TableCell :colspan="6" class="py-8 text-center text-sm text-muted-foreground">
              Loading feeds...
            </TableCell>
          </TableRow>
          <TableRow v-else-if="errorMessage">
            <TableCell :colspan="6" class="py-8 text-center text-sm text-destructive">
              {{ errorMessage }}
            </TableCell>
          </TableRow>
          <TableRow v-else-if="items.length === 0">
            <TableCell :colspan="6" class="py-8 text-center text-sm text-muted-foreground">
              No feed sources match the current filters.
            </TableCell>
          </TableRow>
          <TableRow v-for="item in items" v-else :key="item.id">
            <TableCell>
              <div class="min-w-0 space-y-1">
                <p class="truncate font-medium">{{ item.title }}</p>
                <p class="truncate text-xs text-muted-foreground">{{ item.normalizedUrl }}</p>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-3">
                <Switch
                  :model-value="item.isEnabled"
                  :disabled="isActionPending"
                  @update:model-value="(value) => emit('toggleEnabled', { feedSourceId: item.id, isEnabled: Boolean(value) })"
                />
                <span class="text-xs text-muted-foreground">
                  {{ item.isEnabled ? "Enabled" : "Disabled" }}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <div class="space-y-2">
                <Badge variant="outline" :class="statusBadgeClass(item.errorCount)">
                  Errors: {{ item.errorCount }}
                </Badge>
                <Badge variant="outline" :class="statusBadgeClass(item.extractionFailureCount)">
                  Extraction failures: {{ item.extractionFailureCount }}
                </Badge>
              </div>
            </TableCell>
            <TableCell class="text-sm text-muted-foreground">
              <p>{{ item.subscriptionCount }} subscriptions</p>
              <p>{{ item.articleCount }} articles</p>
            </TableCell>
            <TableCell class="text-sm text-muted-foreground">
              <p>{{ formatDateTime(item.lastFetched) }}</p>
              <p>Next: {{ formatDateTime(item.nextFetchAt) }}</p>
            </TableCell>
            <TableCell class="text-right">
              <div class="flex justify-end gap-2">
                <Button variant="outline" size="sm" :disabled="isActionPending" @click="emit('retryFetch', item.id)">
                  Retry fetch
                </Button>
                <Button variant="outline" size="sm" :disabled="isActionPending" @click="emit('retryExtraction', item.id)">
                  Retry extraction
                </Button>
                <Button size="sm" :disabled="isActionPending" @click="emit('open', item.id)">
                  Open
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <p v-if="hasMore" class="text-xs text-muted-foreground">
      More feed sources are available. Refine filters to narrow the result set.
    </p>
  </div>
</template>
