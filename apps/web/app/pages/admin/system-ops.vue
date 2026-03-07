<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, ref } from "vue";

import AdminOpsActionConfirmDialog from "@/components/admin/AdminOpsActionConfirmDialog.vue";
import AdminQueueJobsTable from "@/components/admin/AdminQueueJobsTable.vue";
import AdminSystemOpsOverviewCards from "@/components/admin/AdminSystemOpsOverviewCards.vue";
import { Button } from "@/components/ui/button";
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
  title: "Admin System Ops",
});

type QueueNameFilter = "all" | "rss-fetch" | "content-extract";
type QueueStateFilter =
  | "all"
  | "waiting"
  | "active"
  | "failed"
  | "delayed"
  | "completed";

type QueueName = "rss-fetch" | "content-extract";
type QueueJobState = "waiting" | "active" | "failed" | "delayed" | "completed";

type ConfirmState =
  | { type: "retryJob"; queueName: QueueName; jobId: string }
  | { type: "triggerFeedFetch"; feedSourceId: string }
  | { type: "triggerContentExtract"; sourceArticleId: string }
  | null;

const ALL_QUEUE_STATES: QueueJobState[] = [
  "waiting",
  "active",
  "failed",
  "delayed",
  "completed",
];

const { $orpc } = useNuxtApp();
const queryClient = useQueryClient();

const queueFilter = ref<QueueNameFilter>("all");
const queueStateFilter = ref<QueueStateFilter>("failed");

const feedSourceIdInput = ref("");
const sourceArticleIdInput = ref("");
const actionError = ref("");

const confirmState = ref<ConfirmState>(null);

const selectedStates = computed(() => {
  if (queueStateFilter.value === "all") {
    return [...ALL_QUEUE_STATES] as QueueJobState[];
  }

  return [queueStateFilter.value as QueueJobState];
});

const queueJobsInput = computed(() => ({
  queueName: queueFilter.value === "all" ? undefined : queueFilter.value,
  states: selectedStates.value,
  limit: 50,
}));

const overviewQuery = useQuery(
  $orpc.admin.systemOps.overview.queryOptions({
    input: {},
    queryKey: dashboardQueryKeys.admin.systemOps.overview(),
  })
);

const queueJobsQuery = useQuery(
  computed(() =>
    $orpc.admin.systemOps.listQueueJobs.queryOptions({
      input: queueJobsInput.value,
      queryKey: dashboardQueryKeys.admin.systemOps.queueJobs(
        queueFilter.value,
        selectedStates.value,
        50
      ),
    })
  )
);

const retryJobMutation = useMutation(
  $orpc.admin.systemOps.retryJob.mutationOptions({
    onSuccess: async () => {
      actionError.value = "";
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root() });
    },
  })
);

const triggerFeedFetchMutation = useMutation(
  $orpc.admin.systemOps.triggerFeedFetch.mutationOptions({
    onSuccess: async () => {
      actionError.value = "";
      feedSourceIdInput.value = "";
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root() });
    },
  })
);

const triggerContentExtractMutation = useMutation(
  $orpc.admin.systemOps.triggerContentExtract.mutationOptions({
    onSuccess: async () => {
      actionError.value = "";
      sourceArticleIdInput.value = "";
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root() });
    },
  })
);

const isActionPending = computed(
  () =>
    retryJobMutation.isPending.value
    || triggerFeedFetchMutation.isPending.value
    || triggerContentExtractMutation.isPending.value
);

const overviewErrorMessage = computed(() => {
  if (!overviewQuery.error.value) {
    return "";
  }

  return overviewQuery.error.value instanceof Error
    ? overviewQuery.error.value.message
    : "Could not load system runtime summary.";
});

const queueJobsErrorMessage = computed(() => {
  if (!queueJobsQuery.error.value) {
    return "";
  }

  return queueJobsQuery.error.value instanceof Error
    ? queueJobsQuery.error.value.message
    : "Could not load queue jobs.";
});

const requestRetryJob = (payload: { queueName: QueueName; jobId: string }) => {
  confirmState.value = {
    type: "retryJob",
    queueName: payload.queueName,
    jobId: payload.jobId,
  };
};

const requestTriggerFeedFetch = () => {
  const feedSourceId = feedSourceIdInput.value.trim();

  if (!feedSourceId) {
    actionError.value = "Feed source ID is required.";
    return;
  }

  confirmState.value = {
    type: "triggerFeedFetch",
    feedSourceId,
  };
};

const requestTriggerContentExtract = () => {
  const sourceArticleId = sourceArticleIdInput.value.trim();

  if (!sourceArticleId) {
    actionError.value = "Source article ID is required.";
    return;
  }

  confirmState.value = {
    type: "triggerContentExtract",
    sourceArticleId,
  };
};

const confirmTitle = computed(() => {
  if (!confirmState.value) {
    return "Confirm action";
  }

  if (confirmState.value.type === "retryJob") {
    return "Retry this failed job?";
  }

  if (confirmState.value.type === "triggerFeedFetch") {
    return "Trigger feed fetch now?";
  }

  return "Trigger content extraction now?";
});

const confirmDescription = computed(() => {
  if (!confirmState.value) {
    return "Confirm this operation.";
  }

  if (confirmState.value.type === "retryJob") {
    return `Queue retry for job ${confirmState.value.jobId} in ${confirmState.value.queueName}.`;
  }

  if (confirmState.value.type === "triggerFeedFetch") {
    return `Queue one immediate RSS fetch for feed source ${confirmState.value.feedSourceId}.`;
  }

  return `Queue one content extraction job for source article ${confirmState.value.sourceArticleId}.`;
});

const confirmLabel = computed(() => {
  if (!confirmState.value) {
    return "Confirm";
  }

  if (confirmState.value.type === "retryJob") {
    return "Retry job";
  }

  if (confirmState.value.type === "triggerFeedFetch") {
    return "Trigger feed fetch";
  }

  return "Trigger extraction";
});

const handleConfirmAction = async () => {
  const nextAction = confirmState.value;
  confirmState.value = null;
  actionError.value = "";

  if (!nextAction) {
    return;
  }

  try {
    if (nextAction.type === "retryJob") {
      await retryJobMutation.mutateAsync({
        queueName: nextAction.queueName,
        jobId: nextAction.jobId,
      });
      return;
    }

    if (nextAction.type === "triggerFeedFetch") {
      await triggerFeedFetchMutation.mutateAsync({
        feedSourceId: nextAction.feedSourceId,
      });
      return;
    }

    await triggerContentExtractMutation.mutateAsync({
      sourceArticleId: nextAction.sourceArticleId,
    });
  } catch (error) {
    actionError.value =
      error instanceof Error ? error.message : "Could not execute this system operation.";
  }
};
</script>

<template>
  <div class="space-y-6">
    <section class="space-y-1">
      <h1 class="text-2xl font-semibold">System ops</h1>
      <p class="text-sm text-muted-foreground">
        Inspect queue health and run single-item operational actions safely.
      </p>
    </section>

    <AdminSystemOpsOverviewCards
      :is-loading="overviewQuery.isLoading.value"
      :error-message="overviewErrorMessage"
      :overview="overviewQuery.data.value ?? null"
    />

    <Card>
      <CardHeader>
        <CardTitle>Manual actions</CardTitle>
        <CardDescription>
          Trigger one feed fetch or one content extraction by ID.
        </CardDescription>
      </CardHeader>
      <CardContent class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <p class="text-sm font-medium">Feed source ID</p>
          <div class="flex gap-2">
            <Input v-model="feedSourceIdInput" placeholder="feedSourceId" />
            <Button variant="outline" :disabled="isActionPending" @click="requestTriggerFeedFetch">
              Trigger fetch
            </Button>
          </div>
        </div>
        <div class="space-y-2">
          <p class="text-sm font-medium">Source article ID</p>
          <div class="flex gap-2">
            <Input v-model="sourceArticleIdInput" placeholder="sourceArticleId" />
            <Button variant="outline" :disabled="isActionPending" @click="requestTriggerContentExtract">
              Trigger extract
            </Button>
          </div>
        </div>
        <p v-if="actionError" class="text-sm text-destructive md:col-span-2">
          {{ actionError }}
        </p>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Queue jobs</CardTitle>
        <CardDescription>
          Review queue states and retry failed jobs one at a time.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-2">
            <p class="text-sm font-medium">Queue</p>
            <Select
              :model-value="queueFilter"
              @update:model-value="(value) => queueFilter = String(value) as QueueNameFilter"
            >
              <SelectTrigger class="w-full">
                <SelectValue placeholder="All queues" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All queues</SelectItem>
                <SelectItem value="rss-fetch">RSS fetch</SelectItem>
                <SelectItem value="content-extract">Content extract</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <p class="text-sm font-medium">State</p>
            <Select
              :model-value="queueStateFilter"
              @update:model-value="(value) => queueStateFilter = String(value) as QueueStateFilter"
            >
              <SelectTrigger class="w-full">
                <SelectValue placeholder="Failed" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All states</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="waiting">Waiting</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="delayed">Delayed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <AdminQueueJobsTable
          :is-loading="queueJobsQuery.isLoading.value"
          :error-message="queueJobsErrorMessage"
          :is-action-pending="isActionPending"
          :items="queueJobsQuery.data.value?.items ?? []"
          @retry="requestRetryJob"
        />
      </CardContent>
    </Card>

    <AdminOpsActionConfirmDialog
      :open="Boolean(confirmState)"
      :title="confirmTitle"
      :description="confirmDescription"
      :confirm-label="confirmLabel"
      :confirm-pending-label="'Processing...'"
      :is-pending="isActionPending"
      @update:open="(open) => { if (!open) confirmState = null; }"
      @confirm="handleConfirmAction"
    />
  </div>
</template>
