<script setup lang="ts">
import { computed, ref } from "vue";

import AdminActionConfirmDialog from "@/components/admin/AdminActionConfirmDialog.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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

type FeedConfirmState =
  | { type: "toggle"; item: AdminFeedListItem; isEnabled: boolean }
  | { type: "retryFetch"; item: AdminFeedListItem }
  | { type: "retryExtraction"; item: AdminFeedListItem }
  | null;

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

const loadingRowKeys = [1, 2, 3];
const confirmState = ref<FeedConfirmState>(null);

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

const feedLabel = (item: AdminFeedListItem) => item.title || item.normalizedUrl;

const confirmTitle = computed(() => {
  if (!confirmState.value) {
    return "Confirm admin action";
  }

  if (confirmState.value.type === "retryFetch") {
    return "Retry RSS fetch?";
  }

  if (confirmState.value.type === "retryExtraction") {
    return "Retry feed extraction?";
  }

  return confirmState.value.isEnabled ? "Enable this feed?" : "Disable this feed?";
});

const confirmDescription = computed(() => {
  if (!confirmState.value) {
    return "Confirm this admin action.";
  }

  const label = feedLabel(confirmState.value.item);

  if (confirmState.value.type === "retryFetch") {
    return `Queue an RSS fetch retry for ${label} immediately.`;
  }

  if (confirmState.value.type === "retryExtraction") {
    return `Queue extraction retries for eligible articles from ${label}.`;
  }

  if (confirmState.value.isEnabled) {
    return `Enable ${label} so scheduled fetches can resume.`;
  }

  return `Disable ${label}. Scheduled fetches stop until an admin enables it again or forces a retry.`;
});

const confirmLabel = computed(() => {
  if (!confirmState.value) {
    return "Confirm";
  }

  if (confirmState.value.type === "retryFetch") {
    return "Queue RSS retry";
  }

  if (confirmState.value.type === "retryExtraction") {
    return "Queue extraction retry";
  }

  return confirmState.value.isEnabled ? "Enable feed" : "Disable feed";
});

const confirmPendingLabel = computed(() => {
  if (!confirmState.value) {
    return "Processing...";
  }

  return confirmState.value.type === "toggle" ? "Updating..." : "Queuing...";
});

const confirmVariant = computed(() =>
  confirmState.value?.type === "toggle" && !confirmState.value.isEnabled
    ? "destructive"
    : "default"
);

const requestToggleEnabled = (item: AdminFeedListItem, isEnabled: boolean) => {
  confirmState.value = {
    type: "toggle",
    item,
    isEnabled,
  };
};

const requestRetryFetch = (item: AdminFeedListItem) => {
  confirmState.value = {
    type: "retryFetch",
    item,
  };
};

const requestRetryExtraction = (item: AdminFeedListItem) => {
  confirmState.value = {
    type: "retryExtraction",
    item,
  };
};

const handleConfirmAction = () => {
  const nextAction = confirmState.value;
  confirmState.value = null;

  if (!nextAction) {
    return;
  }

  if (nextAction.type === "toggle") {
    emit("toggleEnabled", {
      feedSourceId: nextAction.item.id,
      isEnabled: nextAction.isEnabled,
    });
    return;
  }

  if (nextAction.type === "retryFetch") {
    emit("retryFetch", nextAction.item.id);
    return;
  }

  emit("retryExtraction", nextAction.item.id);
};
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
          <template v-if="isLoading">
            <TableRow v-for="row in loadingRowKeys" :key="row">
              <TableCell>
                <div class="space-y-2">
                  <Skeleton class="h-4 w-32" />
                  <Skeleton class="h-3 w-48" />
                </div>
              </TableCell>
              <TableCell>
                <div class="flex items-center gap-3">
                  <Skeleton class="h-6 w-10 rounded-full" />
                  <Skeleton class="h-4 w-16" />
                </div>
              </TableCell>
              <TableCell>
                <div class="space-y-2">
                  <Skeleton class="h-5 w-24 rounded-full" />
                  <Skeleton class="h-5 w-36 rounded-full" />
                </div>
              </TableCell>
              <TableCell>
                <div class="space-y-2">
                  <Skeleton class="h-4 w-28" />
                  <Skeleton class="h-4 w-24" />
                </div>
              </TableCell>
              <TableCell>
                <div class="space-y-2">
                  <Skeleton class="h-4 w-28" />
                  <Skeleton class="h-4 w-32" />
                </div>
              </TableCell>
              <TableCell class="text-right">
                <div class="flex justify-end gap-2">
                  <Skeleton class="h-8 w-20" />
                  <Skeleton class="h-8 w-24" />
                  <Skeleton class="h-8 w-14" />
                </div>
              </TableCell>
            </TableRow>
          </template>
          <TableRow v-else-if="errorMessage">
            <TableCell :colspan="6" class="py-8 text-center text-sm text-destructive">
              {{ errorMessage }}
            </TableCell>
          </TableRow>
          <TableRow v-else-if="items.length === 0">
            <TableCell :colspan="6" class="py-8 text-center text-sm text-muted-foreground">
              No feed sources match the current filters. Widen the health or enabled filters to inspect more sources.
            </TableCell>
          </TableRow>
          <TableRow v-for="item in items" v-else :key="item.id">
            <TableCell>
              <div class="min-w-0 space-y-1">
                <p class="truncate font-medium">{{ feedLabel(item) }}</p>
                <p class="truncate text-xs text-muted-foreground">{{ item.normalizedUrl }}</p>
              </div>
            </TableCell>
            <TableCell>
              <div class="flex items-center gap-3">
                <Switch
                  :model-value="item.isEnabled"
                  :disabled="isActionPending"
                  @update:model-value="(value) => requestToggleEnabled(item, Boolean(value))"
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
                <Button variant="outline" size="sm" :disabled="isActionPending" @click="requestRetryFetch(item)">
                  Retry fetch
                </Button>
                <Button variant="outline" size="sm" :disabled="isActionPending" @click="requestRetryExtraction(item)">
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

  <AdminActionConfirmDialog
    :open="Boolean(confirmState)"
    :title="confirmTitle"
    :description="confirmDescription"
    :confirm-label="confirmLabel"
    :confirm-pending-label="confirmPendingLabel"
    :confirm-variant="confirmVariant"
    :is-pending="isActionPending"
    @update:open="(open) => { if (!open) confirmState = null; }"
    @confirm="handleConfirmAction"
  />
</template>
