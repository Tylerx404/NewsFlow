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
import { useIntlLocale } from "@/composables/use-intl-locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { dashboardQueryKeys } from "@/lib/dashboard-query-keys";

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

type AdminOAuthConfig = {
  googleClientId: string | null;
  googleClientSecretMasked: string | null;
  hasGoogleClientSecret: boolean;
  appleClientId: string | null;
  appleClientSecretMasked: string | null;
  hasAppleClientSecret: boolean;
  appleAppBundleIdentifier: string | null;
  isGoogleConfigured: boolean;
  isAppleConfigured: boolean;
  updatedByUserId: string | null;
  updatedAt: Date | string | null;
  createdAt: Date | string | null;
};

type AdminSmtpConfig = {
  host: string | null;
  port: number | null;
  secure: boolean;
  username: string | null;
  passwordMasked: string | null;
  hasPassword: boolean;
  fromEmail: string | null;
  fromName: string | null;
  isConfigured: boolean;
  updatedByUserId: string | null;
  updatedAt: Date | string | null;
  createdAt: Date | string | null;
};

type AdminAuthSigningKeyConfig = {
  algorithm: string;
  publicKeyPem: string | null;
  publicKeyFingerprint: string | null;
  privateKeyMasked: string | null;
  hasPrivateKey: boolean;
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
const runtimeConfig = useRuntimeConfig();
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
const oauthConfigError = ref("");
const oauthConfigSuccess = ref("");
const smtpConfigError = ref("");
const smtpConfigSuccess = ref("");
const smtpVerificationError = ref("");
const smtpVerificationSuccess = ref("");
const smtpTestEmail = ref("");
const smtpTestError = ref("");
const smtpTestSuccess = ref("");
const authSigningKeyConfigError = ref("");
const authSigningKeyConfigSuccess = ref("");

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

const oauthConfigForm = reactive({
  googleClientId: "",
  googleClientSecret: "",
  appleClientId: "",
  appleClientSecret: "",
  appleAppBundleIdentifier: "",
});

const smtpConfigForm = reactive({
  host: "",
  port: "",
  secure: false,
  username: "",
  password: "",
  fromEmail: "",
  fromName: "",
});

const authSigningKeyConfigForm = reactive({
  publicKeyPem: "",
  privateKeyPem: "",
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

const oauthConfigQuery = useQuery(
  $orpc.admin.systemOps.getOAuthConfig.queryOptions({
    queryKey: dashboardQueryKeys.admin.systemOps.oauthConfig(),
  })
);

const smtpConfigQuery = useQuery(
  $orpc.admin.systemOps.getSmtpConfig.queryOptions({
    queryKey: dashboardQueryKeys.admin.systemOps.smtpConfig(),
  })
);

const authSigningKeyConfigQuery = useQuery(
  $orpc.admin.systemOps.getAuthSigningKeyConfig.queryOptions({
    queryKey: dashboardQueryKeys.admin.systemOps.authSigningKeyConfig(),
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

const updateOAuthConfigMutation = useMutation(
  $orpc.admin.systemOps.updateOAuthConfig.mutationOptions({
    onSuccess: async () => {
      oauthConfigError.value = "";
      oauthConfigSuccess.value = t("admin.systemOps.oauth.successSaved");
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root() });
    },
  })
);

const updateSmtpConfigMutation = useMutation(
  $orpc.admin.systemOps.updateSmtpConfig.mutationOptions({
    onSuccess: async () => {
      smtpConfigError.value = "";
      smtpConfigSuccess.value = t("admin.systemOps.smtp.successSaved");
      smtpVerificationError.value = "";
      smtpVerificationSuccess.value = "";
      smtpTestError.value = "";
      smtpTestSuccess.value = "";
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root() });
    },
  })
);

const verifySmtpConnectionMutation = useMutation(
  $orpc.admin.systemOps.verifySmtpConnection.mutationOptions({
    onSuccess: async () => {
      smtpVerificationError.value = "";
      smtpVerificationSuccess.value = t("admin.systemOps.smtp.verify.success");
      await queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.admin.systemOps.smtpConfig(),
      });
    },
  })
);

const sendSmtpTestEmailMutation = useMutation(
  $orpc.admin.systemOps.sendSmtpTestEmail.mutationOptions({
    onSuccess: async (result) => {
      smtpVerificationError.value = "";
      smtpVerificationSuccess.value = t("admin.systemOps.smtp.verify.success");
      smtpTestError.value = "";
      smtpTestSuccess.value = t("admin.systemOps.smtp.test.success", {
        email: result.toEmail,
      });
      await queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.admin.systemOps.smtpConfig(),
      });
    },
  })
);

const updateAuthSigningKeyConfigMutation = useMutation(
  $orpc.admin.systemOps.updateAuthSigningKeyConfig.mutationOptions({
    onSuccess: async () => {
      authSigningKeyConfigError.value = "";
      authSigningKeyConfigSuccess.value = t(
        "admin.systemOps.authSigningKeys.successSaved"
      );
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

const isOAuthConfigPending = computed(
  () => updateOAuthConfigMutation.isPending.value || oauthConfigQuery.isLoading.value
);

const isSmtpConfigPending = computed(
  () => updateSmtpConfigMutation.isPending.value || smtpConfigQuery.isLoading.value
);

const isSmtpTestPending = computed(
  () => sendSmtpTestEmailMutation.isPending.value
);

const isSmtpVerificationPending = computed(
  () => verifySmtpConnectionMutation.isPending.value
);

const isAuthSigningKeyConfigPending = computed(
  () =>
    updateAuthSigningKeyConfigMutation.isPending.value
    || authSigningKeyConfigQuery.isLoading.value
);

const currentStripeConfig = computed<AdminStripeConfig | null>(
  () => stripeConfigQuery.data.value ?? null
);

const currentOAuthConfig = computed<AdminOAuthConfig | null>(
  () => oauthConfigQuery.data.value ?? null
);

const currentSmtpConfig = computed<AdminSmtpConfig | null>(
  () => smtpConfigQuery.data.value ?? null
);

const isSmtpReadyForTest = computed(
  () => currentSmtpConfig.value?.isConfigured ?? false
);

const smtpVerificationStatusKey = computed(() => {
  if (smtpVerificationSuccess.value) {
    return "admin.systemOps.smtp.status.verified";
  }

  if (smtpVerificationError.value) {
    return "admin.systemOps.smtp.status.failed";
  }

  return "admin.systemOps.smtp.status.notChecked";
});

const currentAuthSigningKeyConfig = computed<AdminAuthSigningKeyConfig | null>(
  () => authSigningKeyConfigQuery.data.value ?? null
);

const stripeWebhookEndpoint = computed(() => {
  const serverUrl =
    typeof runtimeConfig.public.serverUrl === "string"
      ? runtimeConfig.public.serverUrl.trim().replace(/\/$/, "")
      : "";

  return serverUrl
    ? `${serverUrl}/api/auth/stripe/webhook`
    : "/api/auth/stripe/webhook";
});

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

const oauthConfigLoadError = computed(() => {
  if (!oauthConfigQuery.error.value) {
    return "";
  }

  return oauthConfigQuery.error.value instanceof Error
    ? oauthConfigQuery.error.value.message
    : t("admin.systemOps.oauth.errors.load");
});

const smtpConfigLoadError = computed(() => {
  if (!smtpConfigQuery.error.value) {
    return "";
  }

  return smtpConfigQuery.error.value instanceof Error
    ? smtpConfigQuery.error.value.message
    : t("admin.systemOps.smtp.errors.load");
});

const authSigningKeyConfigLoadError = computed(() => {
  if (!authSigningKeyConfigQuery.error.value) {
    return "";
  }

  return authSigningKeyConfigQuery.error.value instanceof Error
    ? authSigningKeyConfigQuery.error.value.message
    : t("admin.systemOps.authSigningKeys.errors.load");
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

watch(
  () => oauthConfigQuery.data.value,
  (config) => {
    if (!config) {
      return;
    }

    oauthConfigForm.googleClientId = config.googleClientId ?? "";
    oauthConfigForm.googleClientSecret = "";
    oauthConfigForm.appleClientId = config.appleClientId ?? "";
    oauthConfigForm.appleClientSecret = "";
    oauthConfigForm.appleAppBundleIdentifier = config.appleAppBundleIdentifier ?? "";
  },
  { immediate: true }
);

watch(
  () => smtpConfigQuery.data.value,
  (config) => {
    if (!config) {
      return;
    }

    smtpConfigForm.host = config.host ?? "";
    smtpConfigForm.port = config.port === null ? "" : String(config.port);
    smtpConfigForm.secure = config.secure;
    smtpConfigForm.username = config.username ?? "";
    smtpConfigForm.password = "";
    smtpConfigForm.fromEmail = config.fromEmail ?? "";
    smtpConfigForm.fromName = config.fromName ?? "";
  },
  { immediate: true }
);

watch(
  () => authSigningKeyConfigQuery.data.value,
  (config) => {
    if (!config) {
      return;
    }

    authSigningKeyConfigForm.publicKeyPem = config.publicKeyPem ?? "";
    authSigningKeyConfigForm.privateKeyPem = "";
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

const handleSaveOAuthConfig = async () => {
  oauthConfigError.value = "";
  oauthConfigSuccess.value = "";

  try {
    await updateOAuthConfigMutation.mutateAsync({
      googleClientId: oauthConfigForm.googleClientId,
      googleClientSecret: oauthConfigForm.googleClientSecret,
      appleClientId: oauthConfigForm.appleClientId,
      appleClientSecret: oauthConfigForm.appleClientSecret,
      appleAppBundleIdentifier: oauthConfigForm.appleAppBundleIdentifier,
    });
  } catch (error) {
    oauthConfigError.value =
      error instanceof Error ? error.message : t("admin.systemOps.oauth.errors.save");
  }
};

const handleSaveSmtpConfig = async () => {
  smtpConfigError.value = "";
  smtpConfigSuccess.value = "";
  smtpTestSuccess.value = "";

  const portValue = smtpConfigForm.port.trim();
  let parsedPort: number | null = null;

  if (portValue.length > 0) {
    parsedPort = Number.parseInt(portValue, 10);

    if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      smtpConfigError.value = t("admin.systemOps.smtp.errors.invalidPort");
      return;
    }
  }

  try {
    await updateSmtpConfigMutation.mutateAsync({
      host: smtpConfigForm.host,
      port: parsedPort,
      secure: smtpConfigForm.secure,
      username: smtpConfigForm.username,
      password: smtpConfigForm.password,
      fromEmail: smtpConfigForm.fromEmail,
      fromName: smtpConfigForm.fromName,
    });
  } catch (error) {
    smtpConfigError.value =
      error instanceof Error ? error.message : t("admin.systemOps.smtp.errors.save");
  }
};

const handleSendSmtpTestEmail = async () => {
  smtpTestError.value = "";
  smtpTestSuccess.value = "";

  const toEmail = smtpTestEmail.value.trim();

  if (!toEmail) {
    smtpTestError.value = t("admin.systemOps.smtp.test.errors.emailRequired");
    return;
  }

  if (!isSmtpReadyForTest.value) {
    smtpTestError.value = t("admin.systemOps.smtp.test.errors.incomplete");
    return;
  }

  try {
    await sendSmtpTestEmailMutation.mutateAsync({
      toEmail,
    });
  } catch (error) {
    smtpTestError.value =
      error instanceof Error ? error.message : t("admin.systemOps.smtp.test.errors.send");
  }
};

const handleVerifySmtpConnection = async () => {
  smtpVerificationError.value = "";
  smtpVerificationSuccess.value = "";

  if (!isSmtpReadyForTest.value) {
    smtpVerificationError.value = t("admin.systemOps.smtp.verify.errors.incomplete");
    return;
  }

  try {
    await verifySmtpConnectionMutation.mutateAsync({});
  } catch (error) {
    smtpVerificationError.value =
      error instanceof Error
        ? error.message
        : t("admin.systemOps.smtp.verify.errors.verify");
  }
};

const handleSaveAuthSigningKeyConfig = async () => {
  authSigningKeyConfigError.value = "";
  authSigningKeyConfigSuccess.value = "";

  try {
    await updateAuthSigningKeyConfigMutation.mutateAsync({
      publicKeyPem: authSigningKeyConfigForm.publicKeyPem,
      privateKeyPem: authSigningKeyConfigForm.privateKeyPem,
    });
  } catch (error) {
    authSigningKeyConfigError.value =
      error instanceof Error
        ? error.message
        : t("admin.systemOps.authSigningKeys.errors.save");
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
          <p>{{ t("admin.systemOps.stripe.webhookEndpoint") }}: `{{ stripeWebhookEndpoint }}`</p>
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
        <CardTitle>{{ t("admin.systemOps.oauth.title") }}</CardTitle>
        <CardDescription>
          {{ t("admin.systemOps.oauth.description") }}
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid gap-3 md:grid-cols-2">
          <div class="rounded-md border p-3">
            <p class="text-xs text-muted-foreground">{{ t("admin.systemOps.oauth.status.apple") }}</p>
            <p class="mt-1 text-sm font-medium">
              {{
                currentOAuthConfig?.isAppleConfigured
                  ? t("admin.systemOps.oauth.status.configured")
                  : t("admin.systemOps.oauth.status.incomplete")
              }}
            </p>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ t("admin.systemOps.oauth.status.secret") }}:
              {{ currentOAuthConfig?.appleClientSecretMasked || t("admin.systemOps.oauth.status.missing") }}
            </p>
          </div>
          <div class="rounded-md border p-3">
            <p class="text-xs text-muted-foreground">{{ t("admin.systemOps.oauth.status.google") }}</p>
            <p class="mt-1 text-sm font-medium">
              {{
                currentOAuthConfig?.isGoogleConfigured
                  ? t("admin.systemOps.oauth.status.configured")
                  : t("admin.systemOps.oauth.status.incomplete")
              }}
            </p>
            <p class="mt-1 text-xs text-muted-foreground">
              {{ t("admin.systemOps.oauth.status.secret") }}:
              {{ currentOAuthConfig?.googleClientSecretMasked || t("admin.systemOps.oauth.status.missing") }}
            </p>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("admin.systemOps.oauth.form.googleClientId") }}</p>
            <Input
              v-model="oauthConfigForm.googleClientId"
              :placeholder="t('admin.systemOps.oauth.form.googleClientIdPlaceholder')"
            />
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("admin.systemOps.oauth.form.googleClientSecret") }}</p>
            <Input
              v-model="oauthConfigForm.googleClientSecret"
              type="password"
              :placeholder="t('admin.systemOps.oauth.form.secretPlaceholder')"
            />
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("admin.systemOps.oauth.form.appleClientId") }}</p>
            <Input
              v-model="oauthConfigForm.appleClientId"
              :placeholder="t('admin.systemOps.oauth.form.appleClientIdPlaceholder')"
            />
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("admin.systemOps.oauth.form.appleClientSecret") }}</p>
            <Input
              v-model="oauthConfigForm.appleClientSecret"
              type="password"
              :placeholder="t('admin.systemOps.oauth.form.secretPlaceholder')"
            />
          </div>
          <div class="space-y-2 md:col-span-2">
            <p class="text-sm font-medium">{{ t("admin.systemOps.oauth.form.appleAppBundleIdentifier") }}</p>
            <Input
              v-model="oauthConfigForm.appleAppBundleIdentifier"
              :placeholder="t('admin.systemOps.oauth.form.appleAppBundlePlaceholder')"
            />
          </div>
        </div>

        <div class="rounded-md border p-3 text-xs text-muted-foreground">
          <p>
            {{ t("admin.systemOps.oauth.lastUpdated") }}:
            {{ formatDateTime(currentOAuthConfig?.updatedAt ?? null) }}
          </p>
          <p>{{ t("admin.systemOps.oauth.restartHint") }}</p>
        </div>

        <p v-if="oauthConfigLoadError" class="text-sm text-destructive">
          {{ oauthConfigLoadError }}
        </p>
        <p v-else-if="oauthConfigError" class="text-sm text-destructive">
          {{ oauthConfigError }}
        </p>
        <p v-else-if="oauthConfigSuccess" class="text-sm text-emerald-600 dark:text-emerald-400">
          {{ oauthConfigSuccess }}
        </p>

        <div class="flex items-center gap-2">
          <Button :disabled="isOAuthConfigPending" @click="handleSaveOAuthConfig">
            {{
              updateOAuthConfigMutation.isPending.value
                ? t("admin.systemOps.oauth.saving")
                : t("admin.systemOps.oauth.save")
            }}
          </Button>
          <p class="text-xs text-muted-foreground">
            {{ t("admin.systemOps.oauth.secretHint") }}
          </p>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>{{ t("admin.systemOps.smtp.title") }}</CardTitle>
        <CardDescription>
          {{ t("admin.systemOps.smtp.description") }}
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div class="rounded-md border p-3">
            <p class="text-xs text-muted-foreground">{{ t("admin.systemOps.smtp.status.label") }}</p>
            <p class="mt-1 text-sm font-medium">
              {{
                currentSmtpConfig?.isConfigured
                  ? t("admin.systemOps.smtp.status.configured")
                  : t("admin.systemOps.smtp.status.incomplete")
              }}
            </p>
          </div>
          <div class="rounded-md border p-3">
            <p class="text-xs text-muted-foreground">{{ t("admin.systemOps.smtp.status.password") }}</p>
            <p class="mt-1 text-sm font-medium">
              {{ currentSmtpConfig?.passwordMasked || t("admin.systemOps.smtp.status.missing") }}
            </p>
          </div>
          <div class="rounded-md border p-3">
            <p class="text-xs text-muted-foreground">{{ t("admin.systemOps.smtp.status.secure") }}</p>
            <p class="mt-1 text-sm font-medium">
              {{
                currentSmtpConfig?.secure
                  ? t("common.states.enabled")
                  : t("common.states.disabled")
              }}
            </p>
          </div>
          <div class="rounded-md border p-3">
            <p class="text-xs text-muted-foreground">{{ t("admin.systemOps.smtp.status.connection") }}</p>
            <p class="mt-1 text-sm font-medium">
              {{ t(smtpVerificationStatusKey) }}
            </p>
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("admin.systemOps.smtp.form.host") }}</p>
            <Input
              v-model="smtpConfigForm.host"
              :placeholder="t('admin.systemOps.smtp.form.hostPlaceholder')"
            />
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("admin.systemOps.smtp.form.port") }}</p>
            <Input
              v-model="smtpConfigForm.port"
              inputmode="numeric"
              :placeholder="t('admin.systemOps.smtp.form.portPlaceholder')"
            />
          </div>
          <div class="space-y-2">
            <div class="flex items-center justify-between rounded-md border p-3">
              <div class="space-y-1">
                <p class="text-sm font-medium">{{ t("admin.systemOps.smtp.form.secure") }}</p>
                <p class="text-xs text-muted-foreground">
                  {{ t("admin.systemOps.smtp.form.secureHint") }}
                </p>
              </div>
              <Switch
                :model-value="smtpConfigForm.secure"
                :disabled="isSmtpConfigPending"
                @update:model-value="(value) => smtpConfigForm.secure = Boolean(value)"
              />
            </div>
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("admin.systemOps.smtp.form.username") }}</p>
            <Input
              v-model="smtpConfigForm.username"
              :placeholder="t('admin.systemOps.smtp.form.usernamePlaceholder')"
            />
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("admin.systemOps.smtp.form.password") }}</p>
            <Input
              v-model="smtpConfigForm.password"
              type="password"
              :placeholder="t('admin.systemOps.smtp.form.passwordPlaceholder')"
            />
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("admin.systemOps.smtp.form.fromEmail") }}</p>
            <Input
              v-model="smtpConfigForm.fromEmail"
              :placeholder="t('admin.systemOps.smtp.form.fromEmailPlaceholder')"
            />
          </div>
          <div class="space-y-2 md:col-span-2">
            <p class="text-sm font-medium">{{ t("admin.systemOps.smtp.form.fromName") }}</p>
            <Input
              v-model="smtpConfigForm.fromName"
              :placeholder="t('admin.systemOps.smtp.form.fromNamePlaceholder')"
            />
          </div>
        </div>

        <div class="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          <p class="font-medium text-foreground">
            {{ t("admin.systemOps.smtp.brevo.title") }}
          </p>
          <p>{{ t("admin.systemOps.smtp.brevo.host") }}</p>
          <p>{{ t("admin.systemOps.smtp.brevo.port") }}</p>
          <p>{{ t("admin.systemOps.smtp.brevo.secure") }}</p>
          <p>{{ t("admin.systemOps.smtp.brevo.username") }}</p>
          <p>{{ t("admin.systemOps.smtp.brevo.password") }}</p>
          <p>{{ t("admin.systemOps.smtp.brevo.fromEmail") }}</p>
        </div>

        <div class="rounded-md border p-3 text-xs text-muted-foreground">
          <p>
            {{ t("admin.systemOps.smtp.lastUpdated") }}:
            {{ formatDateTime(currentSmtpConfig?.updatedAt ?? null) }}
          </p>
          <p>{{ t("admin.systemOps.smtp.runtimeHint") }}</p>
        </div>

        <div class="grid gap-3 rounded-md border p-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("admin.systemOps.smtp.verify.label") }}</p>
            <p class="text-xs text-muted-foreground">
              {{
                isSmtpReadyForTest
                  ? t("admin.systemOps.smtp.verify.hintReady")
                  : t("admin.systemOps.smtp.verify.hintIncomplete")
              }}
            </p>
          </div>
          <div class="flex items-end">
            <Button
              variant="outline"
              :disabled="!isSmtpReadyForTest || isSmtpVerificationPending"
              @click="handleVerifySmtpConnection"
            >
              {{
                isSmtpVerificationPending
                  ? t("admin.systemOps.smtp.verify.verifying")
                  : t("admin.systemOps.smtp.verify.action")
              }}
            </Button>
          </div>
        </div>

        <div class="grid gap-3 rounded-md border p-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("admin.systemOps.smtp.test.label") }}</p>
            <Input
              v-model="smtpTestEmail"
              type="email"
              :placeholder="t('admin.systemOps.smtp.test.placeholder')"
            />
            <p class="text-xs text-muted-foreground">
              {{
                isSmtpReadyForTest
                  ? t("admin.systemOps.smtp.test.hintReady")
                  : t("admin.systemOps.smtp.test.hintIncomplete")
              }}
            </p>
          </div>
          <div class="flex items-end">
            <Button
              variant="outline"
              :disabled="!isSmtpReadyForTest || isSmtpTestPending"
              @click="handleSendSmtpTestEmail"
            >
              {{
                isSmtpTestPending
                  ? t("admin.systemOps.smtp.test.sending")
                  : t("admin.systemOps.smtp.test.send")
              }}
            </Button>
          </div>
        </div>

        <p v-if="smtpVerificationError" class="text-sm text-destructive">
          {{ smtpVerificationError }}
        </p>
        <p
          v-else-if="smtpVerificationSuccess"
          class="text-sm text-emerald-600 dark:text-emerald-400"
        >
          {{ smtpVerificationSuccess }}
        </p>

        <p v-if="smtpConfigLoadError" class="text-sm text-destructive">
          {{ smtpConfigLoadError }}
        </p>
        <p v-else-if="smtpConfigError" class="text-sm text-destructive">
          {{ smtpConfigError }}
        </p>
        <p v-else-if="smtpConfigSuccess" class="text-sm text-emerald-600 dark:text-emerald-400">
          {{ smtpConfigSuccess }}
        </p>

        <p v-if="smtpTestError" class="text-sm text-destructive">
          {{ smtpTestError }}
        </p>
        <p v-else-if="smtpTestSuccess" class="text-sm text-emerald-600 dark:text-emerald-400">
          {{ smtpTestSuccess }}
        </p>

        <div class="flex items-center gap-2">
          <Button :disabled="isSmtpConfigPending" @click="handleSaveSmtpConfig">
            {{
              updateSmtpConfigMutation.isPending.value
                ? t("admin.systemOps.smtp.saving")
                : t("admin.systemOps.smtp.save")
            }}
          </Button>
          <p class="text-xs text-muted-foreground">
            {{ t("admin.systemOps.smtp.passwordHint") }}
          </p>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>{{ t("admin.systemOps.authSigningKeys.title") }}</CardTitle>
        <CardDescription>
          {{ t("admin.systemOps.authSigningKeys.description") }}
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div class="rounded-md border p-3">
            <p class="text-xs text-muted-foreground">
              {{ t("admin.systemOps.authSigningKeys.status.label") }}
            </p>
            <p class="mt-1 text-sm font-medium">
              {{
                currentAuthSigningKeyConfig?.isConfigured
                  ? t("admin.systemOps.authSigningKeys.status.configured")
                  : t("admin.systemOps.authSigningKeys.status.incomplete")
              }}
            </p>
          </div>
          <div class="rounded-md border p-3">
            <p class="text-xs text-muted-foreground">
              {{ t("admin.systemOps.authSigningKeys.status.algorithm") }}
            </p>
            <p class="mt-1 text-sm font-medium">
              {{ currentAuthSigningKeyConfig?.algorithm || "RS256" }}
            </p>
          </div>
          <div class="rounded-md border p-3">
            <p class="text-xs text-muted-foreground">
              {{ t("admin.systemOps.authSigningKeys.status.privateKey") }}
            </p>
            <p class="mt-1 text-sm font-medium">
              {{
                currentAuthSigningKeyConfig?.privateKeyMasked
                  || t("admin.systemOps.authSigningKeys.status.missing")
              }}
            </p>
          </div>
          <div class="rounded-md border p-3">
            <p class="text-xs text-muted-foreground">
              {{ t("admin.systemOps.authSigningKeys.status.fingerprint") }}
            </p>
            <p class="mt-1 break-all text-sm font-medium">
              {{
                currentAuthSigningKeyConfig?.publicKeyFingerprint
                  || t("admin.systemOps.authSigningKeys.status.notAvailable")
              }}
            </p>
          </div>
        </div>

        <div class="grid gap-4">
          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("admin.systemOps.authSigningKeys.form.publicKeyPem") }}</p>
            <textarea
              v-model="authSigningKeyConfigForm.publicKeyPem"
              rows="8"
              class="min-h-40 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              :placeholder="t('admin.systemOps.authSigningKeys.form.publicKeyPlaceholder')"
            />
          </div>
          <div class="space-y-2">
            <p class="text-sm font-medium">{{ t("admin.systemOps.authSigningKeys.form.privateKeyPem") }}</p>
            <textarea
              v-model="authSigningKeyConfigForm.privateKeyPem"
              rows="10"
              class="min-h-48 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring"
              :placeholder="t('admin.systemOps.authSigningKeys.form.privateKeyPlaceholder')"
            />
          </div>
        </div>

        <div class="rounded-md border p-3 text-xs text-muted-foreground">
          <p>
            {{ t("admin.systemOps.authSigningKeys.lastUpdated") }}:
            {{ formatDateTime(currentAuthSigningKeyConfig?.updatedAt ?? null) }}
          </p>
          <p>{{ t("admin.systemOps.authSigningKeys.runtimeHint") }}</p>
        </div>

        <p v-if="authSigningKeyConfigLoadError" class="text-sm text-destructive">
          {{ authSigningKeyConfigLoadError }}
        </p>
        <p v-else-if="authSigningKeyConfigError" class="text-sm text-destructive">
          {{ authSigningKeyConfigError }}
        </p>
        <p
          v-else-if="authSigningKeyConfigSuccess"
          class="text-sm text-emerald-600 dark:text-emerald-400"
        >
          {{ authSigningKeyConfigSuccess }}
        </p>

        <div class="flex items-center gap-2">
          <Button
            :disabled="isAuthSigningKeyConfigPending"
            @click="handleSaveAuthSigningKeyConfig"
          >
            {{
              updateAuthSigningKeyConfigMutation.isPending.value
                ? t("admin.systemOps.authSigningKeys.saving")
                : t("admin.systemOps.authSigningKeys.save")
            }}
          </Button>
          <p class="text-xs text-muted-foreground">
            {{ t("admin.systemOps.authSigningKeys.privateKeyHint") }}
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
