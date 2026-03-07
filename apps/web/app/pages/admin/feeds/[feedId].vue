<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, ref } from "vue";

import AdminFeedDetailPanel from "@/components/admin/AdminFeedDetailPanel.vue";
import { Button } from "@/components/ui/button";
import { dashboardQueryKeys } from "@/lib/dashboard-query-keys";

definePageMeta({
  layout: "dashboard",
  middleware: "admin-auth",
  title: "Admin Feed Detail",
});

const route = useRoute();
const { $orpc } = useNuxtApp();
const queryClient = useQueryClient();

const actionError = ref("");
const feedId = computed(() => String(route.params.feedId ?? ""));

const feedDetailQuery = useQuery(
  computed(() =>
    $orpc.admin.feed.detail.queryOptions({
      input: { feedSourceId: feedId.value },
      queryKey: dashboardQueryKeys.admin.feeds.detail(feedId.value),
      enabled: feedId.value.length > 0,
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

const retryArticleExtractionMutation = useMutation(
  $orpc.admin.feed.retryArticleExtraction.mutationOptions({
    onSuccess: async () => {
      actionError.value = "";
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root() });
    },
  })
);

const feedErrorMessage = computed(() => {
  if (!feedDetailQuery.error.value) {
    return "";
  }

  return feedDetailQuery.error.value instanceof Error
    ? feedDetailQuery.error.value.message
    : "Unable to load feed details.";
});

const isActionPending = computed(
  () =>
    updateEnabledMutation.isPending.value
    || retryFetchMutation.isPending.value
    || retryFeedExtractionMutation.isPending.value
    || retryArticleExtractionMutation.isPending.value
);

const handleToggleEnabled = async (payload: { feedSourceId: string; isEnabled: boolean }) => {
  actionError.value = "";

  try {
    await updateEnabledMutation.mutateAsync(payload);
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : "Unable to update feed state.";
  }
};

const handleRetryFetch = async (feedSourceId: string) => {
  actionError.value = "";

  try {
    await retryFetchMutation.mutateAsync({ feedSourceId });
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : "Unable to queue RSS retry.";
  }
};

const handleRetryFeedExtraction = async (feedSourceId: string) => {
  actionError.value = "";

  try {
    await retryFeedExtractionMutation.mutateAsync({ feedSourceId });
  } catch (error) {
    actionError.value =
      error instanceof Error ? error.message : "Unable to queue extraction retry.";
  }
};

const handleRetryArticleExtraction = async (sourceArticleId: string) => {
  actionError.value = "";

  try {
    await retryArticleExtractionMutation.mutateAsync({ sourceArticleId });
  } catch (error) {
    actionError.value =
      error instanceof Error ? error.message : "Unable to queue article extraction retry.";
  }
};
</script>

<template>
  <div class="space-y-6">
    <section class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-semibold">Feed operations detail</h1>
        <p class="text-sm text-muted-foreground">
          Inspect article health and trigger targeted retries for this feed source.
        </p>
      </div>
      <Button variant="outline" @click="navigateTo('/admin/feeds')">
        Back to feeds
      </Button>
    </section>

    <AdminFeedDetailPanel
      :feed="feedDetailQuery.data.value ?? null"
      :is-loading="feedDetailQuery.isLoading.value"
      :error-message="feedErrorMessage"
      :is-action-pending="isActionPending"
      :action-error="actionError"
      @toggle-enabled="handleToggleEnabled"
      @retry-fetch="handleRetryFetch"
      @retry-feed-extraction="handleRetryFeedExtraction"
      @retry-article-extraction="handleRetryArticleExtraction"
    />
  </div>
</template>
