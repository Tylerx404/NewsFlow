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
import { useIntlLocale } from "@/composables/use-intl-locale";

definePageMeta({
  layout: "dashboard",
  middleware: "admin-auth",
  titleKey: "admin.systemOps.metaTitle",
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
const { t } = useI18n();
const intlLocale = useIntlLocale();
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
      stripeConfigSuccess.value = t("admin.systemOps.stripe.successSaved");
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
    : t("admin.systemOps.errors.runtimeSummary");
});

const queueJobsErrorMessage = computed(() => {
  if (!queueJobsQuery.error.value) {
    return "";
  }

  return queueJobsQuery.error.value instanceof Error
    ? queueJobsQuery.error.value.message
    : t("admin.systemOps.errors.queueJobs");
});

const stripeConfigLoadError = computed(() => {
  if (!stripeConfigQuery.error.value) {
    return "";
  }

  return stripeConfigQuery.error.value instanceof Error
    ? stripeConfigQuery.error.value.message
    : t("admin.systemOps.errors.stripeLoad");
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
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(intlLocale.value, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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
    actionError.value = t("admin.systemOps.manualActions.errors.feedSourceIdRequired");
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
    actionError.value = t("admin.systemOps.manualActions.errors.sourceArticleIdRequired");
    return;
  }

  confirmState.value = {
    type: "triggerContentExtract",
    sourceArticleId,
  };
};

const confirmTitle = computed(() => {
  if (!confirmState.value) {
    return t("admin.systemOps.confirm.defaultTitle");
  }

  if (confirmState.value.type === "retryJob") {
    return t("admin.systemOps.confirm.retryJob.title");
  }

  if (confirmState.value.type === "triggerFeedFetch") {
    return t("admin.systemOps.confirm.triggerFeedFetch.title");
  }

  return t("admin.systemOps.confirm.triggerContentExtract.title");
});

const confirmDescription = computed(() => {
  if (!confirmState.value) {
    return t("admin.systemOps.confirm.defaultDescription");
  }

  if (confirmState.value.type === "retryJob") {
    const queueLabel =
      confirmState.value.queueName === "rss-fetch"
        ? t("admin.common.queueName.rssFetch")
        : t("admin.common.queueName.contentExtract");

    return t("admin.systemOps.confirm.retryJob.description", {
      jobId: confirmState.value.jobId,
      queueName: queueLabel,
    });
  }

  if (confirmState.value.type === "triggerFeedFetch") {
    return t("admin.systemOps.confirm.triggerFeedFetch.description", {
      feedSourceId: confirmState.value.feedSourceId,
    });
  }

  return t("admin.systemOps.confirm.triggerContentExtract.description", {
    sourceArticleId: confirmState.value.sourceArticleId,
  });
});

const confirmLabel = computed(() => {
  if (!confirmState.value) {
    return t("admin.common.confirm");
  }

  if (confirmState.value.type === "retryJob") {
    return t("admin.systemOps.confirm.retryJob.confirmLabel");
  }

  if (confirmState.value.type === "triggerFeedFetch") {
    return t("admin.systemOps.confirm.triggerFeedFetch.confirmLabel");
  }

  return t("admin.systemOps.confirm.triggerContentExtract.confirmLabel");
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
      error instanceof Error ? error.message : t("admin.systemOps.errors.executeOperation");
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
      error instanceof Error ? error.message : t("admin.systemOps.errors.stripeSave");
  }
};
</script>

<template>
  <div class="space-y-6">
    <section class="space-y-1">
      <h1 class="text-2xl font-semibold">{{ t("admin.systemOps.page.title") }}</h1>
      <p class="text-sm text-muted-foreground">
        {{ t("admin.systemOps.page.description") }}
      </p>
    </section>

    <AdminSystemOpsOverviewCards
      :is-loading="overviewQuery.isLoading.value"
      :error-message="overviewErrorMessage"
      :overview="overviewQuery.data.value ?? null"
    />

    <Card>
      <CardHeader>
        <CardTitle>{{ t("admin.systemOps.stripe.title") }}</CardTitle>
        <CardDescription>
          {{ t("admin.systemOps.stripe.description") }}
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div class="rounded-md border p-3">
            <p class="text-xs text-muted-foreground">{{ t("admin.systemOps.stripe.status.label") }}</p>
            <p class="mt-1 text-sm font-medium">
              {{
                currentStripeConfig?.isConfigured
                  ? t("admin.systemOps.stripe.status.configured")
                  : t("admin.systemOps.stripe.status.incomplete")
              }}
            </p>
          </div>
          <div class="rounded-md border p-3">
            <p class="text-xs text-muted-foreground">{{ t("admin.systemOps.stripe.status.secretKey") }}</p>
            <p class="mt-1 text-sm font-medium">
              {{ currentStripeConfig?.secretKeyMasked || t("admin.systemOps.stripe.status.missing") }}
            </p>
          </div>
          <div class="rounded-md border p-3">
            <p class="text-xs text-muted-foreground">{{ t("admin.systemOps.stripe.status.webhookSecret") }}</p>
            <p class="mt-1 text-sm font-medium">
              {{ currentStripeConfig?.webhookSecretMasked || t("admin.systemOps.stripe.status.missing") }}
            </p>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("admin.systemOps.stripe.form.publishableKey") }}</p>
            <Input v-model="stripeConfigForm.publishableKey" :placeholder="t('admin.systemOps.stripe.form.publishablePlaceholder')" />
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("admin.systemOps.stripe.form.secretKey") }}</p>
            <Input
              v-model="stripeConfigForm.secretKey"
              type="password"
              :placeholder="t('admin.systemOps.stripe.form.secretPlaceholder')"
            />
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("admin.systemOps.stripe.form.webhookSecret") }}</p>
            <Input
              v-model="stripeConfigForm.webhookSecret"
              type="password"
              :placeholder="t('admin.systemOps.stripe.form.webhookPlaceholder')"
            />
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("admin.systemOps.stripe.form.basicMonthly") }}</p>
            <Input v-model="stripeConfigForm.priceBasicMonthly" placeholder="price_..." />
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("admin.systemOps.stripe.form.basicYearly") }}</p>
            <Input v-model="stripeConfigForm.priceBasicYearly" placeholder="price_..." />
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("admin.systemOps.stripe.form.proMonthly") }}</p>
            <Input v-model="stripeConfigForm.priceProMonthly" placeholder="price_..." />
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("admin.systemOps.stripe.form.proYearly") }}</p>
            <Input v-model="stripeConfigForm.priceProYearly" placeholder="price_..." />
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("admin.systemOps.stripe.form.maxMonthly") }}</p>
            <Input v-model="stripeConfigForm.priceMaxMonthly" placeholder="price_..." />
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("admin.systemOps.stripe.form.maxYearly") }}</p>
            <Input v-model="stripeConfigForm.priceMaxYearly" placeholder="price_..." />
          </div>
        </div>

        <div class="rounded-md border p-3 text-xs text-muted-foreground">
          <p>
            {{ t("admin.systemOps.stripe.lastUpdated") }}:
            {{ formatDateTime(currentStripeConfig?.updatedAt ?? null) }}
          </p>
          <p>{{ t("admin.systemOps.stripe.webhookEndpoint") }}: `http://localhost:3000/api/auth/stripe/webhook`</p>
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
            {{
              updateStripeConfigMutation.isPending.value
                ? t("admin.systemOps.stripe.saving")
                : t("admin.systemOps.stripe.save")
            }}
          </Button>
          <p class="text-xs text-muted-foreground">
            {{ t("admin.systemOps.stripe.secretHint") }}
          </p>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>{{ t("admin.systemOps.manualActions.title") }}</CardTitle>
        <CardDescription>
          {{ t("admin.systemOps.manualActions.description") }}
        </CardDescription>
      </CardHeader>
      <CardContent class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <p class="text-sm font-medium">{{ t("admin.systemOps.manualActions.feedSourceId") }}</p>
          <div class="flex gap-2">
            <Input
              v-model="feedSourceIdInput"
              :placeholder="t('admin.systemOps.manualActions.feedSourceIdPlaceholder')"
            />
            <Button variant="outline" :disabled="isActionPending" @click="requestTriggerFeedFetch">
              {{ t("admin.systemOps.manualActions.triggerFetch") }}
            </Button>
          </div>
        </div>
        <div class="space-y-2">
          <p class="text-sm font-medium">{{ t("admin.systemOps.manualActions.sourceArticleId") }}</p>
          <div class="flex gap-2">
            <Input
              v-model="sourceArticleIdInput"
              :placeholder="t('admin.systemOps.manualActions.sourceArticleIdPlaceholder')"
            />
            <Button variant="outline" :disabled="isActionPending" @click="requestTriggerContentExtract">
              {{ t("admin.systemOps.manualActions.triggerExtract") }}
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
        <CardTitle>{{ t("admin.systemOps.queueJobs.title") }}</CardTitle>
        <CardDescription>
          {{ t("admin.systemOps.queueJobs.description") }}
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("admin.systemOps.queueJobs.filters.queue") }}</p>
            <Select
              :model-value="queueFilter"
              @update:model-value="(value) => queueFilter = String(value) as QueueNameFilter"
            >
              <SelectTrigger class="w-full">
                <SelectValue :placeholder="t('admin.systemOps.queueJobs.filters.allQueues')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{{ t("admin.systemOps.queueJobs.filters.allQueues") }}</SelectItem>
                <SelectItem value="rss-fetch">{{ t("admin.common.queueName.rssFetch") }}</SelectItem>
                <SelectItem value="content-extract">{{ t("admin.common.queueName.contentExtract") }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("admin.systemOps.queueJobs.filters.state") }}</p>
            <Select
              :model-value="queueStateFilter"
              @update:model-value="(value) => queueStateFilter = String(value) as QueueStateFilter"
            >
              <SelectTrigger class="w-full">
                <SelectValue :placeholder="t('admin.common.queueState.failed')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{{ t("admin.systemOps.queueJobs.filters.allStates") }}</SelectItem>
                <SelectItem value="failed">{{ t("admin.common.queueState.failed") }}</SelectItem>
                <SelectItem value="waiting">{{ t("admin.common.queueState.waiting") }}</SelectItem>
                <SelectItem value="active">{{ t("admin.common.queueState.active") }}</SelectItem>
                <SelectItem value="delayed">{{ t("admin.common.queueState.delayed") }}</SelectItem>
                <SelectItem value="completed">{{ t("admin.common.queueState.completed") }}</SelectItem>
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
      :confirm-pending-label="t('common.actions.loading')"
      :is-pending="isActionPending"
      @update:open="(open) => { if (!open) confirmState = null; }"
      @confirm="handleConfirmAction"
    />
  </div>
</template>
