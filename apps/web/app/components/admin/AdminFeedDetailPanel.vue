<script setup lang="ts">
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
</script>

<template>
  <div class="space-y-6">
    <p v-if="isLoading" class="text-sm text-muted-foreground">
      Loading feed details...
    </p>
    <p v-else-if="errorMessage" class="text-sm text-destructive">
      {{ errorMessage }}
    </p>
    <p v-else-if="!feed" class="text-sm text-muted-foreground">
      Feed details are unavailable.
    </p>
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
                @update:model-value="(value) => emit('toggleEnabled', { feedSourceId: feed.id, isEnabled: Boolean(value) })"
              />
            </div>

            <div class="grid gap-2">
              <Button :disabled="isActionPending" @click="emit('retryFetch', feed.id)">
                Retry RSS fetch
              </Button>
              <Button variant="outline" :disabled="isActionPending" @click="emit('retryFeedExtraction', feed.id)">
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
                      @click="emit('retryArticleExtraction', article.id)"
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
                      @click="emit('retryArticleExtraction', failure.sourceArticleId)"
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
</template>
