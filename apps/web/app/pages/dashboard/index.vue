<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import { computed } from "vue";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardQueryKeys } from "@/lib/dashboard-query-keys";

definePageMeta({
  layout: "dashboard",
  middleware: "dashboard-auth",
  titleKey: "layout.titles.dashboard",
});

const { $orpc } = useNuxtApp();
const { t } = useI18n();
const intlLocale = useIntlLocale();

const STALE_FEED_HOURS = 24;

const articleStatsQuery = useQuery(
  $orpc.article.stats.queryOptions({
    input: {},
    queryKey: dashboardQueryKeys.feedSubscriptions.stats(),
  })
);

const feedListQuery = useQuery(
  $orpc.feedSubscription.listSidebar.queryOptions({
    input: { includeInactive: true },
    queryKey: dashboardQueryKeys.feedSubscriptions.sidebar(true),
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
    return t("dashboard.overview.neverFetched");
  }

  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString(intlLocale.value);
};
</script>

<template>
  <div class="space-y-6">
    <section class="space-y-1">
      <h1 class="text-2xl font-semibold">{{ t("dashboard.overview.title") }}</h1>
      <p class="text-sm text-muted-foreground">
        {{ t("dashboard.overview.subtitle") }}
      </p>
    </section>

    <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card>
        <CardHeader class="pb-2">
          <CardDescription>{{ t("dashboard.stats.totalArticles") }}</CardDescription>
          <CardTitle class="text-2xl">
            {{ articleStatsQuery.data.value?.all ?? 0 }}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader class="pb-2">
          <CardDescription>{{ t("dashboard.stats.unread") }}</CardDescription>
          <CardTitle class="text-2xl">
            {{ articleStatsQuery.data.value?.unread ?? 0 }}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader class="pb-2">
          <CardDescription>{{ t("dashboard.stats.saved") }}</CardDescription>
          <CardTitle class="text-2xl">
            {{ articleStatsQuery.data.value?.saved ?? 0 }}
          </CardTitle>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader class="pb-2">
          <CardDescription>{{ t("dashboard.stats.activeFeeds") }}</CardDescription>
          <CardTitle class="text-2xl">
            {{ activeFeeds.length }}
          </CardTitle>
        </CardHeader>
      </Card>
    </section>

    <section class="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle>{{ t("dashboard.feedHealth.title") }}</CardTitle>
          <CardDescription>
            {{ t("dashboard.feedHealth.description") }}
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <p v-if="feedListQuery.isLoading.value" class="text-sm text-muted-foreground">
            {{ t("dashboard.feedHealth.loading") }}
          </p>
          <template v-else>
            <div class="grid gap-3 sm:grid-cols-3">
              <div class="rounded-md border p-3">
                <p class="text-xs text-muted-foreground">{{ t("dashboard.feedHealth.cards.errors") }}</p>
                <p class="mt-1 text-xl font-semibold">{{ feedsWithErrors.length }}</p>
              </div>
              <div class="rounded-md border p-3">
                <p class="text-xs text-muted-foreground">{{ t("dashboard.feedHealth.cards.inactive") }}</p>
                <p class="mt-1 text-xl font-semibold">{{ inactiveFeeds.length }}</p>
              </div>
              <div class="rounded-md border p-3">
                <p class="text-xs text-muted-foreground">{{ t("dashboard.feedHealth.cards.stale", { hours: STALE_FEED_HOURS }) }}</p>
                <p class="mt-1 text-xl font-semibold">{{ staleFeeds.length }}</p>
              </div>
            </div>

            <div class="space-y-2">
              <p class="text-sm font-medium">{{ t("dashboard.feedHealth.topUnread.title") }}</p>
              <div
                v-if="topUnreadFeeds.length === 0"
                class="rounded-md border border-dashed p-3 text-sm text-muted-foreground"
              >
                {{ t("dashboard.feedHealth.topUnread.empty") }}
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
                      {{ t("dashboard.feedHealth.topUnread.lastFetched", { value: formatDateTime(feed.lastFetched) }) }}
                    </p>
                  </div>
                  <span class="rounded-md bg-secondary px-2 py-1 text-xs font-medium">
                    {{ t("dashboard.feedHealth.topUnread.unreadCount", { count: feed.unreadCount }) }}
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
            <CardTitle>{{ t("dashboard.quickActions.title") }}</CardTitle>
            <CardDescription>
              {{ t("dashboard.quickActions.description") }}
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-2">
            <Button as-child class="w-full justify-start">
              <NuxtLink to="/articles">{{ t("dashboard.quickActions.openArticles") }}</NuxtLink>
            </Button>
            <Button as-child variant="outline" class="w-full justify-start">
              <NuxtLink to="/settings/feeds">{{ t("dashboard.quickActions.manageFeeds") }}</NuxtLink>
            </Button>
            <Button as-child variant="outline" class="w-full justify-start">
              <NuxtLink to="/settings/ai">{{ t("dashboard.quickActions.manageAiProfiles") }}</NuxtLink>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{{ t("dashboard.queueWatch.title") }}</CardTitle>
            <CardDescription>
              {{ t("dashboard.queueWatch.description") }}
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-2 text-sm">
            <div class="flex items-center justify-between rounded-md border p-3">
              <span class="text-muted-foreground">{{ t("dashboard.queueWatch.feedsWithErrors") }}</span>
              <span class="font-medium">{{ feedsWithErrors.length }}</span>
            </div>
            <div class="flex items-center justify-between rounded-md border p-3">
              <span class="text-muted-foreground">{{ t("dashboard.queueWatch.staleActiveFeeds") }}</span>
              <span class="font-medium">{{ staleFeeds.length }}</span>
            </div>
            <div class="flex items-center justify-between rounded-md border p-3">
              <span class="text-muted-foreground">{{ t("dashboard.queueWatch.totalConfiguredFeeds") }}</span>
              <span class="font-medium">{{ feeds.length }}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  </div>
</template>
