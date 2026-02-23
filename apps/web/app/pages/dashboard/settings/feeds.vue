<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { reactive } from "vue";
import { watch } from "vue";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { dashboardQueryKeys } from "@/lib/dashboard-query-keys";

definePageMeta({
  layout: "dashboard",
  middleware: "dashboard-auth",
  title: "Feed Management",
});

const { $orpc } = useNuxtApp();
const queryClient = useQueryClient();

const draftByFeedId = reactive<Record<string, { title: string; category: string; isActive: boolean }>>({});

const feedListQuery = useQuery(
  $orpc.feed.listSidebar.queryOptions({
    input: { includeInactive: true },
    queryKey: dashboardQueryKeys.feeds.sidebar(true),
  })
);

watch(
  () => feedListQuery.data.value,
  (feeds) => {
    for (const feed of feeds ?? []) {
      if (!draftByFeedId[feed.id]) {
        draftByFeedId[feed.id] = {
          title: feed.title,
          category: feed.category ?? "",
          isActive: feed.isActive,
        };
      }
    }
  },
  { immediate: true }
);

const updateMutation = useMutation(
  $orpc.feed.update.mutationOptions({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root() });
    },
  })
);

const refreshMutation = useMutation(
  $orpc.feed.refresh.mutationOptions({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root() });
    },
  })
);

const deleteMutation = useMutation(
  $orpc.feed.delete.mutationOptions({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root() });
    },
  })
);

const handleUpdate = async (id: string) => {
  const draft = draftByFeedId[id];
  if (!draft) return;

  await updateMutation.mutateAsync({
    id,
    title: draft.title.trim(),
    category: draft.category.trim() || null,
    isActive: draft.isActive,
  });
};

const handleRefresh = async (id: string) => {
  await refreshMutation.mutateAsync({ id });
};

const handleDelete = async (id: string) => {
  await deleteMutation.mutateAsync({ id });
};

const formatDate = (value: Date | string | null) => {
  if (!value) return "Never";
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString();
};
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Feed Management</CardTitle>
      <CardDescription>
        Update feed metadata, toggle activity, refresh, or remove feeds.
      </CardDescription>
    </CardHeader>
    <CardContent>
      <p v-if="feedListQuery.isLoading.value" class="text-sm text-muted-foreground">
        Loading feeds...
      </p>
      <p v-else-if="(feedListQuery.data.value?.length ?? 0) === 0" class="text-sm text-muted-foreground">
        No feeds available.
      </p>

      <div v-else class="space-y-4">
        <div class="overflow-x-auto rounded-md border">
          <table class="w-full min-w-[900px] text-sm">
            <thead class="bg-muted/60 text-left">
              <tr>
                <th class="px-3 py-2 font-medium">Title</th>
                <th class="px-3 py-2 font-medium">Category</th>
                <th class="px-3 py-2 font-medium">Unread</th>
                <th class="px-3 py-2 font-medium">Last fetched</th>
                <th class="px-3 py-2 font-medium">Errors</th>
                <th class="px-3 py-2 font-medium">Active</th>
                <th class="px-3 py-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="feed in feedListQuery.data.value"
                :key="feed.id"
                class="border-t align-top"
              >
                <td class="px-3 py-3">
                  <div class="space-y-2">
                    <Input v-model="draftByFeedId[feed.id].title" />
                    <p class="text-xs text-muted-foreground">
                      {{ feed.url }}
                    </p>
                  </div>
                </td>
                <td class="px-3 py-3">
                  <Input v-model="draftByFeedId[feed.id].category" placeholder="Category" />
                </td>
                <td class="px-3 py-3">{{ feed.unreadCount }}</td>
                <td class="px-3 py-3">{{ formatDate(feed.lastFetched) }}</td>
                <td class="px-3 py-3">
                  <span v-if="feed.errorCount > 0">{{ feed.errorCount }}</span>
                  <span v-else>0</span>
                  <p v-if="feed.lastError" class="mt-1 max-w-56 text-xs text-destructive">
                    {{ feed.lastError }}
                  </p>
                </td>
                <td class="px-3 py-3">
                  <label class="flex items-center gap-2 text-xs">
                    <input v-model="draftByFeedId[feed.id].isActive" type="checkbox" />
                    Active
                  </label>
                </td>
                <td class="px-3 py-3">
                  <div class="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      :disabled="updateMutation.isPending.value"
                      @click="handleUpdate(feed.id)"
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      :disabled="refreshMutation.isPending.value"
                      @click="handleRefresh(feed.id)"
                    >
                      Refresh
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      :disabled="deleteMutation.isPending.value"
                      @click="handleDelete(feed.id)"
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
