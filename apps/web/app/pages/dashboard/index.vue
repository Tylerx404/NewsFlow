<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardQueryKeys } from "@/lib/dashboard-query-keys";

definePageMeta({
  layout: "dashboard",
  middleware: "dashboard-auth",
  title: "Dashboard",
});

const { $orpc } = useNuxtApp();

const STALE_FEED_HOURS = 24;

const articleStatsQuery = useQuery(
  $orpc.article.stats.queryOptions({
    input: {},
    queryKey: dashboardQueryKeys.feeds.stats(),
  })
);

const feedListQuery = useQuery(
  $orpc.feed.listSidebar.queryOptions({
    input: { includeInactive: true },
    queryKey: dashboardQueryKeys.feeds.sidebar(true),
  })
);

const feeds = computed(() => feedListQuery.data.value ?? []);

const activeFeeds = computed(() => feeds.value.filter((feed) => feed.isActive));
const inactiveFeeds = computed(() => feeds.value.filter((feed) => !feed.isActive));
const feedsWithErrors = computed(() => feeds.value.filter((feed) => feed.errorCount > 0));

const staleCutoffMs = computed(() => Date.now() - STALE_FEED_HOURS * 60 * 60 * 1000);
const staleFeeds = computed(() =>
  activeFeeds.value.filter((feed) => {
    if (!feed.lastFetched) {
      return true;
    }

    return new Date(feed.lastFetched).getTime() < staleCutoffMs.value;
  })
);

const topUnreadFeeds = computed(() =>
  [...activeFeeds.value]
    .sort((left, right) => right.unreadCount - left.unreadCount)
    .slice(0, 5)
);

const formatDateTime = (value: Date | string | null) => {
  if (!value) {
    return "Never fetched";
  }

  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString();
};
</script>

<template>
  <div class="space-y-6">
    <section class="space-y-1">
      <h1 class="text-2xl font-semibold">News Overview</h1>
      <p class="text-sm text-muted-foreground">
        Monitor reading volume, feed health, and jump directly to your core workflows.
      </p>
    </section>

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader class="pb-2">
          <CardDescription>Total articles</CardDescription>
          <CardTitle class="text-2xl">
            {{ articleStatsQuery.data.value?.all ?? 0 }}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader class="pb-2">
          <CardDescription>Unread</CardDescription>
          <CardTitle class="text-2xl">
            {{ articleStatsQuery.data.value?.unread ?? 0 }}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader class="pb-2">
          <CardDescription>Saved</CardDescription>
          <CardTitle class="text-2xl">
            {{ articleStatsQuery.data.value?.saved ?? 0 }}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader class="pb-2">
          <CardDescription>Active feeds</CardDescription>
          <CardTitle class="text-2xl">
            {{ activeFeeds.length }}
          </CardTitle>
        </CardHeader>
      </Card>
    </section>

    <section class="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>Feed health</CardTitle>
          <CardDescription>
            Active status, delivery issues, and stale sources based on last fetch.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <p v-if="feedListQuery.isLoading.value" class="text-sm text-muted-foreground">
            Loading feed health...
          </p>
          <template v-else>
            <div class="grid gap-3 sm:grid-cols-3">
              <div class="rounded-md border p-3">
                <p class="text-xs text-muted-foreground">Feeds with errors</p>
                <p class="mt-1 text-xl font-semibold">{{ feedsWithErrors.length }}</p>
              </div>
              <div class="rounded-md border p-3">
                <p class="text-xs text-muted-foreground">Inactive feeds</p>
                <p class="mt-1 text-xl font-semibold">{{ inactiveFeeds.length }}</p>
              </div>
              <div class="rounded-md border p-3">
                <p class="text-xs text-muted-foreground">Stale feeds (&gt; {{ STALE_FEED_HOURS }}h)</p>
                <p class="mt-1 text-xl font-semibold">{{ staleFeeds.length }}</p>
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-sm font-medium">Top unread feeds</p>
              <div
                v-if="topUnreadFeeds.length === 0"
                class="rounded-md border border-dashed p-3 text-sm text-muted-foreground"
              >
                No active feeds with unread articles.
              </div>
              <div v-else class="space-y-2">
                <div
                  v-for="feed in topUnreadFeeds"
                  :key="feed.id"
                  class="flex items-center justify-between gap-3 rounded-md border p-3"
                >
                  <div class="min-w-0">
                    <NuxtLink :to="`/feeds/${feed.id}`" class="truncate text-sm font-medium hover:underline">
                      {{ feed.title }}
                    </NuxtLink>
                    <p class="truncate text-xs text-muted-foreground">
                      Last fetched: {{ formatDateTime(feed.lastFetched) }}
                    </p>
                  </div>
                  <span class="rounded-md bg-secondary px-2 py-1 text-xs font-medium">
                    {{ feed.unreadCount }} unread
                  </span>
                </div>
              </div>
            </div>
          </template>
        </CardContent>
      </Card>

      <div class="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Quick actions</CardTitle>
            <CardDescription>
              Jump to your most common tasks.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-2">
            <Button as-child class="w-full justify-start">
              <NuxtLink to="/articles">Open article list</NuxtLink>
            </Button>
            <Button as-child variant="outline" class="w-full justify-start">
              <NuxtLink to="/settings/feeds">Manage feeds</NuxtLink>
            </Button>
            <Button as-child variant="outline" class="w-full justify-start">
              <NuxtLink to="/settings/ai">Manage AI profiles</NuxtLink>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Queue watch</CardTitle>
            <CardDescription>
              Feeds requiring attention right now.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-2 text-sm">
            <div class="flex items-center justify-between rounded-md border p-3">
              <span class="text-muted-foreground">Feeds with errors</span>
              <span class="font-medium">{{ feedsWithErrors.length }}</span>
            </div>
            <div class="flex items-center justify-between rounded-md border p-3">
              <span class="text-muted-foreground">Stale active feeds</span>
              <span class="font-medium">{{ staleFeeds.length }}</span>
            </div>
            <div class="flex items-center justify-between rounded-md border p-3">
              <span class="text-muted-foreground">Total configured feeds</span>
              <span class="font-medium">{{ feeds.length }}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  </div>
</template>
