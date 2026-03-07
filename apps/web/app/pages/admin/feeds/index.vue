<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, ref } from "vue";

import AdminFeedsTable from "@/components/admin/AdminFeedsTable.vue";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dashboardQueryKeys } from "@/lib/dashboard-query-keys";

definePageMeta({
  layout: "dashboard",
  middleware: "admin-auth",
  title: "Admin Feeds",
});

type BooleanFilter = "all" | "true" | "false";

const { $orpc } = useNuxtApp();
const queryClient = useQueryClient();

const searchQuery = ref("");
const enabledFilter = ref<BooleanFilter>("all");
const errorsFilter = ref<BooleanFilter>("all");
const staleFilter = ref<BooleanFilter>("all");
const extractionFilter = ref<BooleanFilter>("all");
const actionError = ref("");

const feedListInput = computed(() => ({
  query: searchQuery.value.trim() || undefined,
  isEnabled: enabledFilter.value === "all" ? undefined : enabledFilter.value === "true",
  hasErrors: errorsFilter.value === "all" ? undefined : errorsFilter.value === "true",
  isStale: staleFilter.value === "all" ? undefined : staleFilter.value === "true",
  hasExtractionFailures:
    extractionFilter.value === "all" ? undefined : extractionFilter.value === "true",
  limit: 20,
}));

const feedsQuery = useQuery(
  computed(() =>
    $orpc.admin.feed.list.queryOptions({
      input: feedListInput.value,
      queryKey: dashboardQueryKeys.admin.feeds.list(
        searchQuery.value.trim(),
        enabledFilter.value,
        errorsFilter.value,
        staleFilter.value,
        extractionFilter.value
      ),
    })
  )
);

const updateEnabledMutation = useMutation(
  $orpc.admin.feed.updateEnabled.mutationOptions({
    onSuccess: async () => {
      actionError.value = "";
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root() });
    },
  })
);

const retryFetchMutation = useMutation(
  $orpc.admin.feed.retryFetch.mutationOptions({
    onSuccess: async () => {
      actionError.value = "";
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root() });
    },
  })
);

const retryFeedExtractionMutation = useMutation(
  $orpc.admin.feed.retryFeedExtraction.mutationOptions({
    onSuccess: async () => {
      actionError.value = "";
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root() });
    },
  })
);

const feedsErrorMessage = computed(() => {
  if (!feedsQuery.error.value) {
    return "";
  }

  return feedsQuery.error.value instanceof Error
    ? feedsQuery.error.value.message
    : "Could not load feed sources. Refresh and try again.";
});

const hasMoreFeeds = computed(() => Boolean(feedsQuery.data.value?.nextCursor));
const isActionPending = computed(
  () =>
    updateEnabledMutation.isPending.value
    || retryFetchMutation.isPending.value
    || retryFeedExtractionMutation.isPending.value
);

const handleBooleanFilterChange = (setter: typeof enabledFilter, value: string) => {
  setter.value = value as BooleanFilter;
};

const handleOpenFeed = async (feedSourceId: string) => {
  await navigateTo(`/admin/feeds/${feedSourceId}`);
};

const handleToggleEnabled = async (payload: { feedSourceId: string; isEnabled: boolean }) => {
  actionError.value = "";

  try {
    await updateEnabledMutation.mutateAsync(payload);
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : "Could not update this feed state. Try again.";
  }
};

const handleRetryFetch = async (feedSourceId: string) => {
  actionError.value = "";

  try {
    await retryFetchMutation.mutateAsync({ feedSourceId });
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : "Could not queue an RSS fetch retry. Try again.";
  }
};

const handleRetryExtraction = async (feedSourceId: string) => {
  actionError.value = "";

  try {
    await retryFeedExtractionMutation.mutateAsync({ feedSourceId });
  } catch (error) {
    actionError.value =
      error instanceof Error ? error.message : "Could not queue a feed extraction retry. Try again.";
  }
};
</script>

<template>
  <div class="space-y-6">
    <section class="space-y-1">
      <h1 class="text-2xl font-semibold">Admin feeds</h1>
      <p class="text-sm text-muted-foreground">
        Track system-wide feed health and trigger operational queue actions.
      </p>
    </section>

    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
        <CardDescription>
          Search feed sources and focus on enabled state, errors, stale schedules, or extraction failures.
        </CardDescription>
      </CardHeader>
      <CardContent class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div class="space-y-2 xl:col-span-2">
          <p class="text-sm font-medium">Search</p>
          <Input v-model="searchQuery" placeholder="Feed title or URL" />
        </div>

        <div class="space-y-2">
          <p class="text-sm font-medium">Enabled</p>
          <Select :model-value="enabledFilter" @update:model-value="(value) => handleBooleanFilterChange(enabledFilter, String(value))">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="All feeds" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All feeds</SelectItem>
              <SelectItem value="true">Enabled</SelectItem>
              <SelectItem value="false">Disabled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <p class="text-sm font-medium">Errors</p>
          <Select :model-value="errorsFilter" @update:model-value="(value) => handleBooleanFilterChange(errorsFilter, String(value))">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="All error states" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All error states</SelectItem>
              <SelectItem value="true">Has errors</SelectItem>
              <SelectItem value="false">Healthy</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <p class="text-sm font-medium">Stale</p>
          <Select :model-value="staleFilter" @update:model-value="(value) => handleBooleanFilterChange(staleFilter, String(value))">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="All freshness states" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All freshness states</SelectItem>
              <SelectItem value="true">Stale</SelectItem>
              <SelectItem value="false">Scheduled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <p class="text-sm font-medium">Extraction</p>
          <Select :model-value="extractionFilter" @update:model-value="(value) => handleBooleanFilterChange(extractionFilter, String(value))">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="All extraction states" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All extraction states</SelectItem>
              <SelectItem value="true">Has failures</SelectItem>
              <SelectItem value="false">Healthy</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Feed operations</CardTitle>
        <CardDescription>
          Use quick actions or open a feed for detailed operational context.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <p v-if="actionError" class="text-sm text-destructive">
          {{ actionError }}
        </p>
        <AdminFeedsTable
          :items="feedsQuery.data.value?.items ?? []"
          :is-loading="feedsQuery.isLoading.value"
          :error-message="feedsErrorMessage"
          :has-more="hasMoreFeeds"
          :is-action-pending="isActionPending"
          @open="handleOpenFeed"
          @toggle-enabled="handleToggleEnabled"
          @retry-fetch="handleRetryFetch"
          @retry-extraction="handleRetryExtraction"
        />
      </CardContent>
    </Card>
  </div>
</template>
