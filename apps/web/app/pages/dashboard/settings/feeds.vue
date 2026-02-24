<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, reactive, ref, watch } from "vue";

import SettingsShell from "@/components/settings/SettingsShell.vue";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { dashboardQueryKeys } from "@/lib/dashboard-query-keys";

definePageMeta({
  layout: "dashboard",
  middleware: "dashboard-auth",
  title: "Feed Management",
});

const { $orpc } = useNuxtApp();
const queryClient = useQueryClient();

type FeedDraft = {
  title: string;
  category: string;
  isActive: boolean;
};

const draftByFeedId = reactive<Record<string, FeedDraft>>({});
const rowErrorByFeedId = reactive<Record<string, string>>({});
const rowPendingUpdateByFeedId = reactive<Record<string, boolean>>({});
const rowPendingRefreshByFeedId = reactive<Record<string, boolean>>({});
const rowPendingDeleteByFeedId = reactive<Record<string, boolean>>({});

const deleteDialogFeedId = ref<string | null>(null);

const feedListQuery = useQuery(
  $orpc.feed.listSidebar.queryOptions({
    input: { includeInactive: true },
    queryKey: dashboardQueryKeys.feeds.sidebar(true),
  })
);

const feedList = computed(() => feedListQuery.data.value ?? []);

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

watch(
  () => feedListQuery.data.value,
  (feeds) => {
    const activeIds = new Set((feeds ?? []).map((feed) => feed.id));

    for (const feed of feeds ?? []) {
      const isBusy =
        rowPendingUpdateByFeedId[feed.id]
        || rowPendingRefreshByFeedId[feed.id]
        || rowPendingDeleteByFeedId[feed.id];

      if (!draftByFeedId[feed.id] || !isBusy) {
        draftByFeedId[feed.id] = {
          title: feed.title,
          category: feed.category ?? "",
          isActive: feed.isActive,
        };
      }
    }

    for (const id of Object.keys(draftByFeedId)) {
      if (!activeIds.has(id)) {
        delete draftByFeedId[id];
        delete rowErrorByFeedId[id];
        delete rowPendingUpdateByFeedId[id];
        delete rowPendingRefreshByFeedId[id];
        delete rowPendingDeleteByFeedId[id];
      }
    }
  },
  { immediate: true }
);

const isRowBusy = (id: string) =>
  Boolean(
    rowPendingUpdateByFeedId[id]
      || rowPendingRefreshByFeedId[id]
      || rowPendingDeleteByFeedId[id]
  );

const getFeedById = (id: string) => feedList.value.find((feed) => feed.id === id);

const selectedDeleteFeed = computed(() => {
  if (!deleteDialogFeedId.value) {
    return null;
  }

  return getFeedById(deleteDialogFeedId.value) ?? null;
});

const handleUpdate = async (id: string) => {
  const draft = draftByFeedId[id];
  if (!draft) {
    return;
  }

  rowErrorByFeedId[id] = "";

  const title = draft.title.trim();
  if (!title) {
    rowErrorByFeedId[id] = "Title is required.";
    return;
  }

  rowPendingUpdateByFeedId[id] = true;

  try {
    await updateMutation.mutateAsync({
      id,
      title,
      category: draft.category.trim() || null,
      isActive: draft.isActive,
    });
  } catch (error) {
    rowErrorByFeedId[id] =
      error instanceof Error ? error.message : "Unable to update feed.";
  } finally {
    rowPendingUpdateByFeedId[id] = false;
  }
};

const handleRefresh = async (id: string) => {
  rowErrorByFeedId[id] = "";
  rowPendingRefreshByFeedId[id] = true;

  try {
    await refreshMutation.mutateAsync({ id });
  } catch (error) {
    rowErrorByFeedId[id] =
      error instanceof Error ? error.message : "Unable to refresh feed.";
  } finally {
    rowPendingRefreshByFeedId[id] = false;
  }
};

const openDeleteDialog = (id: string) => {
  deleteDialogFeedId.value = id;
};

const handleDeleteDialogToggle = (open: boolean) => {
  if (!open) {
    deleteDialogFeedId.value = null;
  }
};

const confirmDeleteFeed = async () => {
  const id = deleteDialogFeedId.value;
  if (!id) {
    return;
  }

  rowErrorByFeedId[id] = "";
  rowPendingDeleteByFeedId[id] = true;

  try {
    await deleteMutation.mutateAsync({ id });
    deleteDialogFeedId.value = null;
  } catch (error) {
    rowErrorByFeedId[id] =
      error instanceof Error ? error.message : "Unable to delete feed.";
  } finally {
    rowPendingDeleteByFeedId[id] = false;
  }
};

const formatDate = (value: Date | string | null) => {
  if (!value) return "Never";
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString();
};
</script>

<template>
  <SettingsShell section="feeds">
    <Card>
      <CardHeader>
        <CardTitle>Feed Management</CardTitle>
        <CardDescription>
          Update feed metadata, toggle activity, refresh, or remove feeds.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <p v-if="feedListQuery.isLoading.value" class="text-sm text-muted-foreground">
          Loading feeds...
        </p>
        <p v-else-if="feedList.length === 0" class="text-sm text-muted-foreground">
          No feeds available.
        </p>

        <div v-else class="space-y-4">
          <div class="hidden overflow-x-auto rounded-md border md:block">
            <Table>
              <TableCaption class="sr-only">
                Feed management table with metadata and feed actions.
              </TableCaption>
              <TableHeader class="bg-muted/60 text-left">
                <TableRow>
                  <TableHead class="px-3 py-2">Title</TableHead>
                  <TableHead class="px-3 py-2">Category</TableHead>
                  <TableHead class="px-3 py-2">Unread</TableHead>
                  <TableHead class="px-3 py-2">Last fetched</TableHead>
                  <TableHead class="px-3 py-2">Errors</TableHead>
                  <TableHead class="px-3 py-2">Active</TableHead>
                  <TableHead class="px-3 py-2">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="feed in feedList"
                  :key="feed.id"
                  class="align-top"
                >
                  <TableCell class="px-3 py-3 align-top">
                    <div class="space-y-2">
                      <Input v-model="draftByFeedId[feed.id].title" />
                      <p class="break-all text-xs text-muted-foreground">
                        {{ feed.url }}
                      </p>
                    </div>
                  </TableCell>

                  <TableCell class="px-3 py-3 align-top">
                    <Input v-model="draftByFeedId[feed.id].category" placeholder="Category" />
                  </TableCell>

                  <TableCell class="px-3 py-3 align-top">{{ feed.unreadCount }}</TableCell>

                  <TableCell class="px-3 py-3 align-top">
                    {{ formatDate(feed.lastFetched) }}
                  </TableCell>

                  <TableCell class="px-3 py-3 align-top">
                    <span>{{ feed.errorCount }}</span>
                    <p v-if="feed.lastError" class="mt-1 max-w-56 text-xs text-destructive">
                      {{ feed.lastError }}
                    </p>
                  </TableCell>

                  <TableCell class="px-3 py-3 align-top">
                    <label class="flex items-center gap-2 text-xs">
                      <Switch v-model="draftByFeedId[feed.id].isActive" />
                      Active
                    </label>
                  </TableCell>

                  <TableCell class="px-3 py-3 align-top">
                    <div class="space-y-2">
                      <div class="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          :disabled="isRowBusy(feed.id)"
                          @click="handleUpdate(feed.id)"
                        >
                          {{ rowPendingUpdateByFeedId[feed.id] ? "Saving..." : "Save" }}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          :disabled="isRowBusy(feed.id)"
                          @click="handleRefresh(feed.id)"
                        >
                          {{ rowPendingRefreshByFeedId[feed.id] ? "Refreshing..." : "Refresh" }}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          :disabled="isRowBusy(feed.id)"
                          :aria-label="`Delete feed ${feed.title}`"
                          @click="openDeleteDialog(feed.id)"
                        >
                          Delete
                        </Button>
                      </div>
                      <p v-if="rowErrorByFeedId[feed.id]" aria-live="polite" class="text-xs text-destructive">
                        {{ rowErrorByFeedId[feed.id] }}
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>

          <div class="space-y-3 md:hidden">
            <div
              v-for="feed in feedList"
              :key="feed.id"
              class="space-y-4 rounded-lg border p-4"
            >
              <div class="space-y-2">
                <label class="text-sm font-medium" :for="`feed-title-${feed.id}`">Title</label>
                <Input :id="`feed-title-${feed.id}`" v-model="draftByFeedId[feed.id].title" />
                <p class="break-all text-xs text-muted-foreground">{{ feed.url }}</p>
              </div>

              <div class="space-y-2">
                <label class="text-sm font-medium" :for="`feed-category-${feed.id}`">Category</label>
                <Input
                  :id="`feed-category-${feed.id}`"
                  v-model="draftByFeedId[feed.id].category"
                  placeholder="Category"
                />
              </div>

              <div class="grid grid-cols-2 gap-3 rounded-md border p-3 text-xs">
                <div>
                  <p class="text-muted-foreground">Unread</p>
                  <p class="font-medium">{{ feed.unreadCount }}</p>
                </div>
                <div>
                  <p class="text-muted-foreground">Last fetched</p>
                  <p class="font-medium">{{ formatDate(feed.lastFetched) }}</p>
                </div>
                <div class="col-span-2">
                  <p class="text-muted-foreground">Errors</p>
                  <p class="font-medium">{{ feed.errorCount }}</p>
                  <p v-if="feed.lastError" class="mt-1 text-destructive">
                    {{ feed.lastError }}
                  </p>
                </div>
              </div>

              <label class="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
                <span>Active</span>
                <Switch v-model="draftByFeedId[feed.id].isActive" />
              </label>

              <div class="grid grid-cols-3 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  :disabled="isRowBusy(feed.id)"
                  @click="handleUpdate(feed.id)"
                >
                  {{ rowPendingUpdateByFeedId[feed.id] ? "Saving..." : "Save" }}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  :disabled="isRowBusy(feed.id)"
                  @click="handleRefresh(feed.id)"
                >
                  {{ rowPendingRefreshByFeedId[feed.id] ? "Refreshing..." : "Refresh" }}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  :disabled="isRowBusy(feed.id)"
                  :aria-label="`Delete feed ${feed.title}`"
                  @click="openDeleteDialog(feed.id)"
                >
                  Delete
                </Button>
              </div>

              <p v-if="rowErrorByFeedId[feed.id]" aria-live="polite" class="text-sm text-destructive">
                {{ rowErrorByFeedId[feed.id] }}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    <AlertDialog
      :open="Boolean(deleteDialogFeedId)"
      @update:open="handleDeleteDialogToggle"
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this feed?</AlertDialogTitle>
          <AlertDialogDescription>
            <span v-if="selectedDeleteFeed">
              Feed "{{ selectedDeleteFeed.title }}" will be removed.
            </span>
            <span v-else>
              This action cannot be undone.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel :disabled="deleteDialogFeedId ? rowPendingDeleteByFeedId[deleteDialogFeedId] : false">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            :disabled="deleteDialogFeedId ? rowPendingDeleteByFeedId[deleteDialogFeedId] : false"
            @click="confirmDeleteFeed"
          >
            {{
              deleteDialogFeedId && rowPendingDeleteByFeedId[deleteDialogFeedId]
                ? "Deleting..."
                : "Delete feed"
            }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </SettingsShell>
</template>
