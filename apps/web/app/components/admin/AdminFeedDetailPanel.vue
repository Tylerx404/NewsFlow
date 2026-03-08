<script setup lang="ts">
import { computed, ref } from "vue";

import AdminActionConfirmDialog from "@/components/admin/AdminActionConfirmDialog.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

type AdminFeedDetail = {
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
  recentArticles: {
    id: string;
    title: string;
    link: string;
    pubDate: Date | string;
    contentExtracted: boolean;
    extractionAttempts: number;
    lastExtractionError: string | null;
    createdAt: Date | string;
    updatedAt: Date | string;
  }[];
  recentFailures: {
    sourceArticleId: string;
    title: string;
    extractionAttempts: number;
    lastExtractionError: string;
    updatedAt: Date | string;
  }[];
};

type FeedConfirmState =
  | { type: "toggle"; isEnabled: boolean }
  | { type: "retryFetch" }
  | { type: "retryFeedExtraction" }
  | { type: "retryArticleExtraction"; sourceArticleId: string; articleTitle: string }
  | null;

const props = defineProps<{
  feed: AdminFeedDetail | null;
  isLoading: boolean;
  errorMessage: string;
  isActionPending: boolean;
  actionError: string;
}>();

const { t } = useI18n();
const intlLocale = useIntlLocale();

const emit = defineEmits<{
  toggleEnabled: [payload: { feedSourceId: string; isEnabled: boolean }];
  retryFetch: [feedSourceId: string];
  retryFeedExtraction: [feedSourceId: string];
  retryArticleExtraction: [sourceArticleId: string];
}>();

const confirmState = ref<FeedConfirmState>(null);
const loadingRowKeys = [1, 2, 3];

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

const healthBadgeClass = (count: number) =>
  count > 0
    ? "border-destructive/30 bg-destructive/10 text-destructive"
    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";

const feedLabel = computed(
  () => props.feed?.title || props.feed?.normalizedUrl || t("admin.feeds.detail.confirm.thisFeed")
);

const confirmTitle = computed(() => {
  if (!confirmState.value) {
    return t("admin.feeds.detail.confirm.defaultTitle");
  }

  if (confirmState.value.type === "retryFetch") {
    return t("admin.feeds.detail.confirm.retryFetch.title");
  }

  if (confirmState.value.type === "retryFeedExtraction") {
    return t("admin.feeds.detail.confirm.retryFeedExtraction.title");
  }

  if (confirmState.value.type === "retryArticleExtraction") {
    return t("admin.feeds.detail.confirm.retryArticleExtraction.title");
  }

  return confirmState.value.isEnabled
    ? t("admin.feeds.detail.confirm.enable.title")
    : t("admin.feeds.detail.confirm.disable.title");
});

const confirmDescription = computed(() => {
  if (!confirmState.value) {
    return t("admin.feeds.detail.confirm.defaultDescription");
  }

  if (confirmState.value.type === "retryFetch") {
    return t("admin.feeds.detail.confirm.retryFetch.description", { label: feedLabel.value });
  }

  if (confirmState.value.type === "retryFeedExtraction") {
    return t("admin.feeds.detail.confirm.retryFeedExtraction.description", { label: feedLabel.value });
  }

  if (confirmState.value.type === "retryArticleExtraction") {
    return t("admin.feeds.detail.confirm.retryArticleExtraction.description", {
      title: confirmState.value.articleTitle,
    });
  }

  if (confirmState.value.isEnabled) {
    return t("admin.feeds.detail.confirm.enable.description", { label: feedLabel.value });
  }

  return t("admin.feeds.detail.confirm.disable.description", { label: feedLabel.value });
});

const confirmLabel = computed(() => {
  if (!confirmState.value) {
    return t("admin.common.confirm");
  }

  if (confirmState.value.type === "retryFetch") {
    return t("admin.feeds.detail.confirm.retryFetch.confirmLabel");
  }

  if (confirmState.value.type === "retryFeedExtraction") {
    return t("admin.feeds.detail.confirm.retryFeedExtraction.confirmLabel");
  }

  if (confirmState.value.type === "retryArticleExtraction") {
    return t("admin.feeds.detail.confirm.retryArticleExtraction.confirmLabel");
  }

  return confirmState.value.isEnabled
    ? t("admin.feeds.detail.confirm.enable.confirmLabel")
    : t("admin.feeds.detail.confirm.disable.confirmLabel");
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

const requestToggleEnabled = (isEnabled: boolean) => {
  confirmState.value = {
    type: "toggle",
    isEnabled,
  };
};

const requestRetryFetch = () => {
  confirmState.value = { type: "retryFetch" };
};

const requestRetryFeedExtraction = () => {
  confirmState.value = { type: "retryFeedExtraction" };
};

const requestRetryArticleExtraction = (sourceArticleId: string, articleTitle: string) => {
  confirmState.value = {
    type: "retryArticleExtraction",
    sourceArticleId,
    articleTitle,
  };
};

const handleConfirmAction = () => {
  const nextAction = confirmState.value;
  confirmState.value = null;

  if (!nextAction || !props.feed) {
    return;
  }

  if (nextAction.type === "toggle") {
    emit("toggleEnabled", {
      feedSourceId: props.feed.id,
      isEnabled: nextAction.isEnabled,
    });
    return;
  }

  if (nextAction.type === "retryFetch") {
    emit("retryFetch", props.feed.id);
    return;
  }

  if (nextAction.type === "retryFeedExtraction") {
    emit("retryFeedExtraction", props.feed.id);
    return;
  }

  emit("retryArticleExtraction", nextAction.sourceArticleId);
};
</script>

<template>
  <div class="space-y-6">
    <template v-if="isLoading">
      <section class="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <Skeleton class="h-6 w-48" />
            <Skeleton class="h-4 w-64" />
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="grid gap-3 sm:grid-cols-2">
              <Skeleton class="h-20 rounded-md" />
              <Skeleton class="h-20 rounded-md" />
              <Skeleton class="h-20 rounded-md" />
              <Skeleton class="h-20 rounded-md" />
            </div>
            <div class="flex gap-2">
              <Skeleton class="h-5 w-28 rounded-full" />
              <Skeleton class="h-5 w-40 rounded-full" />
            </div>
            <Skeleton class="h-16 rounded-md" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Skeleton class="h-6 w-28" />
            <Skeleton class="h-4 w-52" />
          </CardHeader>
          <CardContent class="space-y-4">
            <Skeleton class="h-20 rounded-md" />
            <Skeleton class="h-9 rounded-md" />
            <Skeleton class="h-9 rounded-md" />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <Skeleton class="h-6 w-32" />
          <Skeleton class="h-4 w-56" />
        </CardHeader>
        <CardContent class="space-y-3">
          <Skeleton v-for="row in loadingRowKeys" :key="`articles-${row}`" class="h-14 rounded-md" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton class="h-6 w-44" />
          <Skeleton class="h-4 w-56" />
        </CardHeader>
        <CardContent class="space-y-3">
          <Skeleton v-for="row in loadingRowKeys" :key="`failures-${row}`" class="h-14 rounded-md" />
        </CardContent>
      </Card>
    </template>
    <p v-else-if="errorMessage" class="text-sm text-destructive">
      {{ errorMessage }}
    </p>
    <div v-else-if="!feed" class="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
      {{ t("admin.feeds.detail.empty") }}
    </div>
    <template v-else>
      <section class="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{{ feed.title }}</CardTitle>
            <CardDescription>{{ feed.normalizedUrl }}</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="grid gap-3 sm:grid-cols-2">
              <div class="rounded-md border p-3">
                <p class="text-xs text-muted-foreground">
                  {{ t("admin.feeds.detail.summary.lastFetched") }}
                </p>
                <p class="mt-1 text-sm font-medium">{{ formatDateTime(feed.lastFetched) }}</p>
              </div>
              <div class="rounded-md border p-3">
                <p class="text-xs text-muted-foreground">
                  {{ t("admin.feeds.detail.summary.nextFetch") }}
                </p>
                <p class="mt-1 text-sm font-medium">{{ formatDateTime(feed.nextFetchAt) }}</p>
              </div>
              <div class="rounded-md border p-3">
                <p class="text-xs text-muted-foreground">
                  {{ t("admin.feeds.detail.summary.subscriptions") }}
                </p>
                <p class="mt-1 text-sm font-medium">
                  {{ new Intl.NumberFormat(intlLocale).format(feed.subscriptionCount) }}
                </p>
              </div>
              <div class="rounded-md border p-3">
                <p class="text-xs text-muted-foreground">{{ t("admin.feeds.detail.summary.articles") }}</p>
                <p class="mt-1 text-sm font-medium">
                  {{ new Intl.NumberFormat(intlLocale).format(feed.articleCount) }}
                </p>
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <Badge variant="outline" :class="healthBadgeClass(feed.errorCount)">
                {{ t("admin.feeds.detail.summary.rssErrors", { count: feed.errorCount }) }}
              </Badge>
              <Badge variant="outline" :class="healthBadgeClass(feed.extractionFailureCount)">
                {{
                  t("admin.feeds.detail.summary.extractionFailures", {
                    count: feed.extractionFailureCount,
                  })
                }}
              </Badge>
            </div>

            <div class="rounded-md border p-3 text-sm">
              <p class="text-xs text-muted-foreground">{{ t("admin.feeds.detail.summary.lastError") }}</p>
              <p class="mt-1 font-medium">{{ feed.lastError || t("admin.feeds.detail.summary.noRecentErrors") }}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{{ t("admin.feeds.detail.operations.title") }}</CardTitle>
            <CardDescription>
              {{ t("admin.feeds.detail.operations.description") }}
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="flex items-center justify-between rounded-md border p-3">
              <div>
                <p class="text-sm font-medium">{{ t("admin.feeds.detail.operations.feedEnabled") }}</p>
                <p class="text-xs text-muted-foreground">
                  {{ t("admin.feeds.detail.operations.feedEnabledHint") }}
                </p>
              </div>
              <Switch
                :model-value="feed.isEnabled"
                :disabled="isActionPending"
                @update:model-value="(value) => requestToggleEnabled(Boolean(value))"
              />
            </div>

            <div class="grid gap-2">
              <Button :disabled="isActionPending" @click="requestRetryFetch">
                {{ t("admin.feeds.detail.operations.retryFetch") }}
              </Button>
              <Button variant="outline" :disabled="isActionPending" @click="requestRetryFeedExtraction">
                {{ t("admin.feeds.detail.operations.retryFeedExtractionQueue") }}
              </Button>
            </div>

            <p v-if="actionError" class="text-sm text-destructive">
              {{ actionError }}
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{{ t("admin.feeds.detail.recentArticles.title") }}</CardTitle>
          <CardDescription>
            {{ t("admin.feeds.detail.recentArticles.description") }}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{{ t("admin.feeds.detail.recentArticles.columns.article") }}</TableHead>
                  <TableHead>{{ t("admin.feeds.detail.recentArticles.columns.published") }}</TableHead>
                  <TableHead>{{ t("admin.feeds.detail.recentArticles.columns.status") }}</TableHead>
                  <TableHead class="text-right">{{ t("admin.common.action") }}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-if="feed.recentArticles.length === 0">
                  <TableCell :colspan="4" class="py-6 text-center text-sm text-muted-foreground">
                    {{ t("admin.feeds.detail.recentArticles.empty") }}
                  </TableCell>
                </TableRow>
                <TableRow v-for="article in feed.recentArticles" v-else :key="article.id">
                  <TableCell>
                    <div class="space-y-1">
                      <a :href="article.link" target="_blank" rel="noreferrer" class="font-medium hover:underline">
                        {{ article.title }}
                      </a>
                      <p class="text-xs text-muted-foreground">
                        {{ t("admin.feeds.detail.recentArticles.attempts", { count: article.extractionAttempts }) }}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell class="text-sm text-muted-foreground">
                    {{ formatDateTime(article.pubDate) }}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      :class="article.lastExtractionError ? healthBadgeClass(1) : healthBadgeClass(0)"
                    >
                      {{
                        article.lastExtractionError
                          ? t("admin.feeds.detail.recentArticles.status.needsAttention")
                          : article.contentExtracted
                            ? t("admin.feeds.detail.recentArticles.status.extracted")
                            : t("admin.feeds.detail.recentArticles.status.pending")
                      }}
                    </Badge>
                  </TableCell>
                  <TableCell class="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      :disabled="isActionPending"
                      @click="requestRetryArticleExtraction(article.id, article.title)"
                    >
                      {{ t("admin.feeds.detail.recentArticles.retryArticle") }}
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{{ t("admin.feeds.detail.recentFailures.title") }}</CardTitle>
          <CardDescription>
            {{ t("admin.feeds.detail.recentFailures.description") }}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{{ t("admin.feeds.detail.recentFailures.columns.article") }}</TableHead>
                  <TableHead>{{ t("admin.feeds.detail.recentFailures.columns.error") }}</TableHead>
                  <TableHead>{{ t("admin.feeds.detail.recentFailures.columns.updated") }}</TableHead>
                  <TableHead class="text-right">{{ t("admin.common.action") }}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-if="feed.recentFailures.length === 0">
                  <TableCell :colspan="4" class="py-6 text-center text-sm text-muted-foreground">
                    {{ t("admin.feeds.detail.recentFailures.empty") }}
                  </TableCell>
                </TableRow>
                <TableRow v-for="failure in feed.recentFailures" v-else :key="failure.sourceArticleId">
                  <TableCell>
                    <div class="space-y-1">
                      <p class="font-medium">{{ failure.title }}</p>
                      <p class="text-xs text-muted-foreground">
                        {{ t("admin.feeds.detail.recentFailures.attempts", { count: failure.extractionAttempts }) }}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell class="text-sm text-destructive">
                    {{ failure.lastExtractionError }}
                  </TableCell>
                  <TableCell class="text-sm text-muted-foreground">
                    {{ formatDateTime(failure.updatedAt) }}
                  </TableCell>
                  <TableCell class="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      :disabled="isActionPending"
                      @click="requestRetryArticleExtraction(failure.sourceArticleId, failure.title)"
                    >
                      {{ t("admin.feeds.detail.recentFailures.retry") }}
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </template>
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
