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
  return date.toLocaleString();
};

const healthBadgeClass = (count: number) =>
  count > 0
    ? "border-destructive/30 bg-destructive/10 text-destructive"
    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";

const feedLabel = computed(() => props.feed?.title || props.feed?.normalizedUrl || "this feed");

const confirmTitle = computed(() => {
  if (!confirmState.value) {
    return "Confirm admin action";
  }

  if (confirmState.value.type === "retryFetch") {
    return "Retry RSS fetch?";
  }

  if (confirmState.value.type === "retryFeedExtraction") {
    return "Retry feed extraction?";
  }

  if (confirmState.value.type === "retryArticleExtraction") {
    return "Retry article extraction?";
  }

  return confirmState.value.isEnabled ? "Enable this feed?" : "Disable this feed?";
});

const confirmDescription = computed(() => {
  if (!confirmState.value) {
    return "Confirm this admin action.";
  }

  if (confirmState.value.type === "retryFetch") {
    return `Queue an RSS fetch retry for ${feedLabel.value} immediately.`;
  }

  if (confirmState.value.type === "retryFeedExtraction") {
    return `Queue extraction retries for eligible articles from ${feedLabel.value}.`;
  }

  if (confirmState.value.type === "retryArticleExtraction") {
    return `Queue a fresh extraction attempt for ${confirmState.value.articleTitle}.`;
  }

  if (confirmState.value.isEnabled) {
    return `Enable ${feedLabel.value} so scheduled fetches can resume.`;
  }

  return `Disable ${feedLabel.value}. Scheduled fetches stop until an admin enables it again or forces a retry.`;
});

const confirmLabel = computed(() => {
  if (!confirmState.value) {
    return "Confirm";
  }

  if (confirmState.value.type === "retryFetch") {
    return "Queue RSS retry";
  }

  if (confirmState.value.type === "retryFeedExtraction") {
    return "Queue extraction retry";
  }

  if (confirmState.value.type === "retryArticleExtraction") {
    return "Queue article retry";
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
      Feed details are unavailable.
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
                <p class="text-xs text-muted-foreground">Last fetched</p>
                <p class="mt-1 text-sm font-medium">{{ formatDateTime(feed.lastFetched) }}</p>
              </div>
              <div class="rounded-md border p-3">
                <p class="text-xs text-muted-foreground">Next fetch</p>
                <p class="mt-1 text-sm font-medium">{{ formatDateTime(feed.nextFetchAt) }}</p>
              </div>
              <div class="rounded-md border p-3">
                <p class="text-xs text-muted-foreground">Subscriptions</p>
                <p class="mt-1 text-sm font-medium">{{ feed.subscriptionCount }}</p>
              </div>
              <div class="rounded-md border p-3">
                <p class="text-xs text-muted-foreground">Articles</p>
                <p class="mt-1 text-sm font-medium">{{ feed.articleCount }}</p>
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <Badge variant="outline" :class="healthBadgeClass(feed.errorCount)">
                RSS errors: {{ feed.errorCount }}
              </Badge>
              <Badge variant="outline" :class="healthBadgeClass(feed.extractionFailureCount)">
                Extraction failures: {{ feed.extractionFailureCount }}
              </Badge>
            </div>

            <div class="rounded-md border p-3 text-sm">
              <p class="text-xs text-muted-foreground">Last error</p>
              <p class="mt-1 font-medium">{{ feed.lastError || "No recent RSS errors." }}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Operations</CardTitle>
            <CardDescription>
              Toggle source state and trigger queue retries.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="flex items-center justify-between rounded-md border p-3">
              <div>
                <p class="text-sm font-medium">Feed enabled</p>
                <p class="text-xs text-muted-foreground">
                  Disabled feeds are skipped by the scheduler unless forced.
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
                Retry RSS fetch
              </Button>
              <Button variant="outline" :disabled="isActionPending" @click="requestRetryFeedExtraction">
                Retry feed extraction queue
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
          <CardTitle>Recent articles</CardTitle>
          <CardDescription>
            Latest source articles and extraction status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Article</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead class="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-if="feed.recentArticles.length === 0">
                  <TableCell :colspan="4" class="py-6 text-center text-sm text-muted-foreground">
                    No recent articles found for this feed source.
                  </TableCell>
                </TableRow>
                <TableRow v-for="article in feed.recentArticles" v-else :key="article.id">
                  <TableCell>
                    <div class="space-y-1">
                      <a :href="article.link" target="_blank" rel="noreferrer" class="font-medium hover:underline">
                        {{ article.title }}
                      </a>
                      <p class="text-xs text-muted-foreground">
                        Attempts: {{ article.extractionAttempts }}
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
                      {{ article.lastExtractionError ? "Needs attention" : article.contentExtracted ? "Extracted" : "Pending" }}
                    </Badge>
                  </TableCell>
                  <TableCell class="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      :disabled="isActionPending"
                      @click="requestRetryArticleExtraction(article.id, article.title)"
                    >
                      Retry article
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
          <CardTitle>Recent extraction failures</CardTitle>
          <CardDescription>
            Articles that most recently failed extraction.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Article</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead class="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-if="feed.recentFailures.length === 0">
                  <TableCell :colspan="4" class="py-6 text-center text-sm text-muted-foreground">
                    No recent extraction failures.
                  </TableCell>
                </TableRow>
                <TableRow v-for="failure in feed.recentFailures" v-else :key="failure.sourceArticleId">
                  <TableCell>
                    <div class="space-y-1">
                      <p class="font-medium">{{ failure.title }}</p>
                      <p class="text-xs text-muted-foreground">
                        Attempts: {{ failure.extractionAttempts }}
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
                      Retry
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
