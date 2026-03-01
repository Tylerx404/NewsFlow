<script setup lang="ts">
import { useIntersectionObserver } from "@vueuse/core";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, ref, watch } from "vue";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { dashboardQueryKeys } from "@/lib/dashboard-query-keys";

type FilterValue = "all" | "unread" | "saved";
type Cursor = {
  id: string;
  pubDate: string;
};

const props = defineProps<{
  feedSubscriptionId?: string;
  title?: string;
}>();

const { $orpc } = useNuxtApp();
const queryClient = useQueryClient();

const filter = ref<FilterValue>("all");
const searchInput = ref("");
const query = ref("");
const loadMoreSentinel = ref<HTMLElement | null>(null);

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
watch(searchInput, (value) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    query.value = value.trim();
  }, 300);
});

const articleStatsQuery = useQuery(
  computed(() =>
    $orpc.article.stats.queryOptions({
      input: props.feedSubscriptionId
        ? { feedSubscriptionId: props.feedSubscriptionId }
        : {},
      queryKey: dashboardQueryKeys.feedSubscriptions.stats(
        props.feedSubscriptionId
      ),
    })
  )
);

const articleListQuery = useInfiniteQuery(
  computed(() =>
    $orpc.article.list.infiniteOptions({
      queryKey: dashboardQueryKeys.articles.list(
        props.feedSubscriptionId,
        filter.value,
        query.value
      ),
      input: (cursor: Cursor | undefined) => ({
        feedSubscriptionId: props.feedSubscriptionId,
        limit: 20,
        cursor,
        ...(query.value ? { query: query.value } : {}),
        ...(filter.value === "unread" ? { read: false } : {}),
        ...(filter.value === "saved" ? { saved: true } : {}),
      }),
      initialPageParam: undefined as Cursor | undefined,
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    })
  )
);

const markReadMutation = useMutation(
  $orpc.article.markRead.mutationOptions({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root() });
    },
  })
);

const toggleSavedMutation = useMutation(
  $orpc.article.toggleSaved.mutationOptions({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root() });
    },
  })
);

const allArticles = computed(() =>
  (articleListQuery.data.value?.pages ?? []).flatMap((page) => page.items)
);

useIntersectionObserver(loadMoreSentinel, ([entry]) => {
  if (
    entry?.isIntersecting &&
    articleListQuery.hasNextPage.value &&
    !articleListQuery.isFetchingNextPage.value
  ) {
    articleListQuery.fetchNextPage();
  }
});

const formatDate = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 class="text-2xl font-semibold">{{ title ?? "Latest articles" }}</h1>
        <p class="text-sm text-muted-foreground">
          Read, save, and summarize your feed with AI.
        </p>
      </div>
      <Input
        v-model="searchInput"
        type="search"
        placeholder="Search by title, excerpt, link"
        class="w-full md:max-w-sm"
      />
    </div>

    <div class="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader class="pb-2">
          <CardDescription>Total</CardDescription>
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
    </div>

    <div class="flex flex-wrap gap-2">
      <Button
        :variant="filter === 'all' ? 'default' : 'outline'"
        size="sm"
        @click="filter = 'all'"
      >
        All
      </Button>
      <Button
        :variant="filter === 'unread' ? 'default' : 'outline'"
        size="sm"
        @click="filter = 'unread'"
      >
        Unread
      </Button>
      <Button
        :variant="filter === 'saved' ? 'default' : 'outline'"
        size="sm"
        @click="filter = 'saved'"
      >
        Saved
      </Button>
    </div>

    <div v-if="articleListQuery.isLoading.value" class="space-y-3">
      <Card v-for="item in 3" :key="item">
        <CardContent class="p-6 text-sm text-muted-foreground">
          Loading article...
        </CardContent>
      </Card>
    </div>

    <div v-else-if="allArticles.length === 0" class="rounded-lg border p-8 text-center">
      <p class="text-sm text-muted-foreground">
        No articles found for this filter.
      </p>
    </div>

    <div v-else class="space-y-3">
      <Card v-for="article in allArticles" :key="article.id">
        <CardContent class="space-y-4 p-5">
          <div class="space-y-2">
            <NuxtLink
              :to="`/articles/${article.id}`"
              class="text-lg font-medium leading-tight hover:underline"
            >
              {{ article.title }}
            </NuxtLink>
            <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{{ article.feed.title }}</span>
              <span>•</span>
              <span>{{ formatDate(article.pubDate) }}</span>
              <span v-if="article.saved" class="rounded bg-secondary px-2 py-0.5">Saved</span>
              <span v-if="!article.read" class="rounded bg-secondary px-2 py-0.5">Unread</span>
            </div>
            <p class="text-sm text-muted-foreground">
              {{ article.excerpt || "No excerpt available." }}
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              :disabled="article.read || markReadMutation.isPending.value"
              @click="markReadMutation.mutate({ id: article.id })"
            >
              Mark read
            </Button>
            <Button
              variant="outline"
              size="sm"
              :disabled="toggleSavedMutation.isPending.value"
              @click="toggleSavedMutation.mutate({ id: article.id })"
            >
              {{ article.saved ? "Unsave" : "Save" }}
            </Button>
            <Button as-child size="sm">
              <NuxtLink :to="`/articles/${article.id}`">
                Open reader
              </NuxtLink>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>

    <div ref="loadMoreSentinel" class="h-6" />
    <p
      v-if="articleListQuery.isFetchingNextPage.value"
      class="text-center text-xs text-muted-foreground"
    >
      Loading more...
    </p>
  </div>
</template>
