<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, reactive, ref, watch } from "vue";

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

type AdminStripeConfig = {
  publishableKey: string | null;
  secretKeyMasked: string | null;
  webhookSecretMasked: string | null;
  hasSecretKey: boolean;
  hasWebhookSecret: boolean;
  priceBasicMonthly: string | null;
  priceBasicYearly: string | null;
  priceProMonthly: string | null;
  priceProYearly: string | null;
  priceMaxMonthly: string | null;
  priceMaxYearly: string | null;
  isConfigured: boolean;
  updatedByUserId: string | null;
  updatedAt: Date | string | null;
  createdAt: Date | string | null;
};

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
const stripeConfigError = ref("");
const stripeConfigSuccess = ref("");

const stripeConfigForm = reactive({
  publishableKey: "",
  secretKey: "",
  webhookSecret: "",
  priceBasicMonthly: "",
  priceBasicYearly: "",
  priceProMonthly: "",
  priceProYearly: "",
  priceMaxMonthly: "",
  priceMaxYearly: "",
});

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

const stripeConfigQuery = useQuery(
  $orpc.admin.systemOps.getStripeConfig.queryOptions({
    queryKey: dashboardQueryKeys.admin.systemOps.stripeConfig(),
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

const updateStripeConfigMutation = useMutation(
  $orpc.admin.systemOps.updateStripeConfig.mutationOptions({
    onSuccess: async () => {
      stripeConfigError.value = "";
      stripeConfigSuccess.value = "Stripe config saved.";
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

const isStripeConfigPending = computed(
  () => updateStripeConfigMutation.isPending.value || stripeConfigQuery.isLoading.value
);

const currentStripeConfig = computed<AdminStripeConfig | null>(
  () => stripeConfigQuery.data.value ?? null
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

const stripeConfigLoadError = computed(() => {
  if (!stripeConfigQuery.error.value) {
    return "";
  }

  return stripeConfigQuery.error.value instanceof Error
    ? stripeConfigQuery.error.value.message
    : "Could not load Stripe config.";
});

watch(
  () => stripeConfigQuery.data.value,
  (config) => {
    if (!config) {
      return;
    }

    stripeConfigForm.publishableKey = config.publishableKey ?? "";
    stripeConfigForm.secretKey = "";
    stripeConfigForm.webhookSecret = "";
    stripeConfigForm.priceBasicMonthly = config.priceBasicMonthly ?? "";
    stripeConfigForm.priceBasicYearly = config.priceBasicYearly ?? "";
    stripeConfigForm.priceProMonthly = config.priceProMonthly ?? "";
    stripeConfigForm.priceProYearly = config.priceProYearly ?? "";
    stripeConfigForm.priceMaxMonthly = config.priceMaxMonthly ?? "";
    stripeConfigForm.priceMaxYearly = config.priceMaxYearly ?? "";
  },
  { immediate: true }
);

const formatDateTime = (value: Date | string | null) => {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
};

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

const handleSaveStripeConfig = async () => {
  stripeConfigError.value = "";
  stripeConfigSuccess.value = "";

  try {
    await updateStripeConfigMutation.mutateAsync({
      publishableKey: stripeConfigForm.publishableKey,
      secretKey: stripeConfigForm.secretKey,
      webhookSecret: stripeConfigForm.webhookSecret,
      priceBasicMonthly: stripeConfigForm.priceBasicMonthly,
      priceBasicYearly: stripeConfigForm.priceBasicYearly,
      priceProMonthly: stripeConfigForm.priceProMonthly,
      priceProYearly: stripeConfigForm.priceProYearly,
      priceMaxMonthly: stripeConfigForm.priceMaxMonthly,
      priceMaxYearly: stripeConfigForm.priceMaxYearly,
    });
  } catch (error) {
    stripeConfigError.value =
      error instanceof Error ? error.message : "Could not save Stripe config.";
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
        <CardTitle>Stripe config</CardTitle>
        <CardDescription>
          Manage Stripe keys and plan price IDs here instead of server environment variables.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div class="rounded-md border p-3">
            <p class="text-xs text-muted-foreground">Status</p>
            <p class="mt-1 text-sm font-medium">
              {{ currentStripeConfig?.isConfigured ? "Configured" : "Incomplete" }}
            </p>
          </div>
          <div class="rounded-md border p-3">
            <p class="text-xs text-muted-foreground">Secret key</p>
            <p class="mt-1 text-sm font-medium">
              {{ currentStripeConfig?.secretKeyMasked || "Missing" }}
            </p>
          </div>
          <div class="rounded-md border p-3">
            <p class="text-xs text-muted-foreground">Webhook secret</p>
            <p class="mt-1 text-sm font-medium">
              {{ currentStripeConfig?.webhookSecretMasked || "Missing" }}
            </p>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-2">
            <p class="text-sm font-medium">Publishable key</p>
            <Input v-model="stripeConfigForm.publishableKey" placeholder="pk_test_..." />
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium">Secret key</p>
            <Input
              v-model="stripeConfigForm.secretKey"
              type="password"
              placeholder="Leave blank to keep current sk_*"
            />
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium">Webhook secret</p>
            <Input
              v-model="stripeConfigForm.webhookSecret"
              type="password"
              placeholder="Leave blank to keep current whsec_*"
            />
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium">Basic monthly price</p>
            <Input v-model="stripeConfigForm.priceBasicMonthly" placeholder="price_..." />
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium">Basic yearly price</p>
            <Input v-model="stripeConfigForm.priceBasicYearly" placeholder="price_..." />
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium">Pro monthly price</p>
            <Input v-model="stripeConfigForm.priceProMonthly" placeholder="price_..." />
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium">Pro yearly price</p>
            <Input v-model="stripeConfigForm.priceProYearly" placeholder="price_..." />
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium">Max monthly price</p>
            <Input v-model="stripeConfigForm.priceMaxMonthly" placeholder="price_..." />
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium">Max yearly price</p>
            <Input v-model="stripeConfigForm.priceMaxYearly" placeholder="price_..." />
          </div>
        </div>

        <div class="rounded-md border p-3 text-xs text-muted-foreground">
          <p>Last updated: {{ formatDateTime(currentStripeConfig?.updatedAt ?? null) }}</p>
          <p>Webhook endpoint: `http://localhost:3000/api/auth/stripe/webhook`</p>
        </div>

        <p v-if="stripeConfigLoadError" class="text-sm text-destructive">
          {{ stripeConfigLoadError }}
        </p>
        <p v-else-if="stripeConfigError" class="text-sm text-destructive">
          {{ stripeConfigError }}
        </p>
        <p v-else-if="stripeConfigSuccess" class="text-sm text-emerald-600 dark:text-emerald-400">
          {{ stripeConfigSuccess }}
        </p>

        <div class="flex items-center gap-2">
          <Button :disabled="isStripeConfigPending" @click="handleSaveStripeConfig">
            {{ updateStripeConfigMutation.isPending.value ? "Saving..." : "Save Stripe config" }}
          </Button>
          <p class="text-xs text-muted-foreground">
            Secret inputs can stay empty if you only want to update price IDs.
          </p>
        </div>
      </CardContent>
    </Card>

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
