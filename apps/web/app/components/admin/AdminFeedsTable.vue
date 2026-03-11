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
import { useIntlLocale } from "@/composables/use-intl-locale";

type AdminFeedListItem = {
  id: string;
  url: string;
  normalizedUrl: string;
  siteUrl: string | null;
  title: string;
  description: string | null;
  iconUrl: string | null;
  language: string | null;
  inferredLanguage: string | null;
  inferredCountryCode: string | null;
  inferenceConfidence: number | null;
  inferenceSource: "LANG_DETECTION" | "MANUAL" | "DEFAULT" | null;
  inferredAt: Date | string | null;
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

const { t } = useI18n();
const intlLocale = useIntlLocale();

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
  return new Intl.DateTimeFormat(intlLocale.value, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const statusBadgeClass = (count: number) =>
  count > 0
    ? "border-destructive/30 bg-destructive/10 text-destructive"
    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";

const feedLabel = (item: AdminFeedListItem) => item.title || item.normalizedUrl;

const formatInferenceSource = (source: AdminFeedListItem["inferenceSource"]) => {
  if (source === "LANG_DETECTION") {
    return t("admin.feeds.table.inference.sourceLangDetection");
  }

  if (source === "MANUAL") {
    return t("admin.feeds.table.inference.sourceManual");
  }

  if (source === "DEFAULT") {
    return t("admin.feeds.table.inference.sourceDefault");
  }

  return t("admin.feeds.table.inference.sourceUnknown");
};

const confirmTitle = computed(() => {
  if (!confirmState.value) {
    return t("admin.feeds.table.confirm.defaultTitle");
  }

  if (confirmState.value.type === "retryFetch") {
    return t("admin.feeds.table.confirm.retryFetch.title");
  }

  if (confirmState.value.type === "retryExtraction") {
    return t("admin.feeds.table.confirm.retryExtraction.title");
  }

  return confirmState.value.isEnabled
    ? t("admin.feeds.table.confirm.enable.title")
    : t("admin.feeds.table.confirm.disable.title");
});

const confirmDescription = computed(() => {
  if (!confirmState.value) {
    return t("admin.feeds.table.confirm.defaultDescription");
  }

  const label = feedLabel(confirmState.value.item);

  if (confirmState.value.type === "retryFetch") {
    return t("admin.feeds.table.confirm.retryFetch.description", { label });
  }

  if (confirmState.value.type === "retryExtraction") {
    return t("admin.feeds.table.confirm.retryExtraction.description", { label });
  }

  if (confirmState.value.isEnabled) {
    return t("admin.feeds.table.confirm.enable.description", { label });
  }

  return t("admin.feeds.table.confirm.disable.description", { label });
});

const confirmLabel = computed(() => {
  if (!confirmState.value) {
    return t("admin.common.confirm");
  }

  if (confirmState.value.type === "retryFetch") {
    return t("admin.feeds.table.confirm.retryFetch.confirmLabel");
  }

  if (confirmState.value.type === "retryExtraction") {
    return t("admin.feeds.table.confirm.retryExtraction.confirmLabel");
  }

  return confirmState.value.isEnabled
    ? t("admin.feeds.table.confirm.enable.confirmLabel")
    : t("admin.feeds.table.confirm.disable.confirmLabel");
});

const confirmPendingLabel = computed(() => {
  if (!confirmState.value) {
    return t("common.actions.loading");
  }

  return confirmState.value.type === "toggle"
    ? t("admin.common.updating")
    : t("admin.common.queueing");
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
            <TableHead>{{ t("admin.feeds.table.columns.feed") }}</TableHead>
            <TableHead>{{ t("admin.feeds.table.columns.enabled") }}</TableHead>
            <TableHead>{{ t("admin.feeds.table.columns.health") }}</TableHead>
            <TableHead>{{ t("admin.feeds.table.columns.coverage") }}</TableHead>
            <TableHead>{{ t("admin.feeds.table.columns.lastFetched") }}</TableHead>
            <TableHead class="text-right">{{ t("admin.common.actions") }}</TableHead>
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
              {{ t("admin.feeds.table.empty") }}
            </TableCell>
          </TableRow>
          <TableRow v-for="item in items" v-else :key="item.id">
            <TableCell>
              <div class="min-w-0 space-y-1">
                <p class="truncate font-medium">{{ feedLabel(item) }}</p>
                <p class="truncate text-xs text-muted-foreground">{{ item.normalizedUrl }}</p>
                <div class="flex flex-wrap gap-1 pt-1">
                  <Badge variant="outline" class="text-[11px]">
                    {{
                      t("admin.feeds.table.inference.country", {
                        country: item.inferredCountryCode || "GLOBAL",
                      })
                    }}
                  </Badge>
                  <Badge variant="outline" class="text-[11px]">
                    {{
                      t("admin.feeds.table.inference.source", {
                        source: formatInferenceSource(item.inferenceSource),
                      })
                    }}
                  </Badge>
                </div>
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
                  {{ item.isEnabled ? t("common.states.enabled") : t("common.states.disabled") }}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <div class="space-y-2">
                <Badge variant="outline" :class="statusBadgeClass(item.errorCount)">
                  {{ t("admin.feeds.table.health.errors", { count: item.errorCount }) }}
                </Badge>
                <Badge variant="outline" :class="statusBadgeClass(item.extractionFailureCount)">
                  {{
                    t("admin.feeds.table.health.extractionFailures", {
                      count: item.extractionFailureCount,
                    })
                  }}
                </Badge>
              </div>
            </TableCell>
            <TableCell class="text-sm text-muted-foreground">
              <p>
                {{
                  t("admin.feeds.table.coverage.subscriptions", {
                    count: new Intl.NumberFormat(intlLocale).format(item.subscriptionCount),
                  })
                }}
              </p>
              <p>
                {{
                  t("admin.feeds.table.coverage.articles", {
                    count: new Intl.NumberFormat(intlLocale).format(item.articleCount),
                  })
                }}
              </p>
            </TableCell>
            <TableCell class="text-sm text-muted-foreground">
              <p>{{ formatDateTime(item.lastFetched) }}</p>
              <p>{{ t("admin.feeds.table.nextFetch") }}: {{ formatDateTime(item.nextFetchAt) }}</p>
            </TableCell>
            <TableCell class="text-right">
              <div class="flex justify-end gap-2">
                <Button variant="outline" size="sm" :disabled="isActionPending" @click="requestRetryFetch(item)">
                  {{ t("admin.feeds.table.actions.retryFetch") }}
                </Button>
                <Button variant="outline" size="sm" :disabled="isActionPending" @click="requestRetryExtraction(item)">
                  {{ t("admin.feeds.table.actions.retryExtraction") }}
                </Button>
                <Button size="sm" :disabled="isActionPending" @click="emit('open', item.id)">
                  {{ t("admin.common.open") }}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <p v-if="hasMore" class="text-xs text-muted-foreground">
      {{ t("admin.feeds.table.hasMore") }}
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
