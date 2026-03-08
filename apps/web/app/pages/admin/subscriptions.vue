<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, ref } from "vue";

import AdminSubscriptionEditDialog from "@/components/admin/AdminSubscriptionEditDialog.vue";
import AdminSubscriptionsTable from "@/components/admin/AdminSubscriptionsTable.vue";
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
  titleKey: "admin.subscriptions.metaTitle",
});

type SubscriptionTierFilter = "all" | "free" | "basic" | "pro" | "max";
type BillingIntervalFilter = "all" | "monthly" | "yearly";
type CancelAtPeriodEndFilter = "all" | "true" | "false";

type AdminSubscriptionRow = {
  userId: string;
  subscriptionId: string | null;
  name: string;
  email: string;
  tier: "free" | "basic" | "pro" | "max";
  status: string;
  billingInterval: "monthly" | "yearly" | null;
  cancelAtPeriodEnd: boolean;
  expiresAt: Date | string | null;
  currentPeriodStart: Date | string | null;
  currentPeriodEnd: Date | string | null;
  stripePriceId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string | null;
};

const { $orpc } = useNuxtApp();
const { t } = useI18n();
const queryClient = useQueryClient();

const searchQuery = ref("");
const tierFilter = ref<SubscriptionTierFilter>("all");
const statusFilter = ref("all");
const billingIntervalFilter = ref<BillingIntervalFilter>("all");
const cancelAtPeriodEndFilter = ref<CancelAtPeriodEndFilter>("all");
const selectedUserId = ref<string | null>(null);
const isEditOpen = ref(false);
const editError = ref("");

const subscriptionListInput = computed(() => ({
  query: searchQuery.value.trim() || undefined,
  tier: tierFilter.value === "all" ? undefined : tierFilter.value,
  status: statusFilter.value === "all" ? undefined : statusFilter.value,
  billingInterval:
    billingIntervalFilter.value === "all" ? undefined : billingIntervalFilter.value,
  cancelAtPeriodEnd:
    cancelAtPeriodEndFilter.value === "all"
      ? undefined
      : cancelAtPeriodEndFilter.value === "true",
  limit: 20,
}));

const subscriptionsQuery = useQuery(
  computed(() =>
    $orpc.admin.subscription.list.queryOptions({
      input: subscriptionListInput.value,
      queryKey: dashboardQueryKeys.admin.subscriptions.list(
        searchQuery.value.trim(),
        tierFilter.value,
        statusFilter.value,
        billingIntervalFilter.value,
        cancelAtPeriodEndFilter.value
      ),
    })
  )
);

const updateTierMutation = useMutation(
  $orpc.admin.subscription.updateTier.mutationOptions({
    onSuccess: async () => {
      editError.value = "";
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root() });
    },
  })
);

const updateExpiresAtMutation = useMutation(
  $orpc.admin.subscription.updateExpiresAt.mutationOptions({
    onSuccess: async () => {
      editError.value = "";
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root() });
    },
  })
);

const updateCancelAtPeriodEndMutation = useMutation(
  $orpc.admin.subscription.updateCancelAtPeriodEnd.mutationOptions({
    onSuccess: async () => {
      editError.value = "";
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root() });
    },
  })
);

const selectedSubscription = computed(() =>
  (subscriptionsQuery.data.value?.items ?? []).find((item) => item.userId === selectedUserId.value) ?? null
);

const subscriptionsErrorMessage = computed(() => {
  if (!subscriptionsQuery.error.value) {
    return "";
  }

  return subscriptionsQuery.error.value instanceof Error
    ? subscriptionsQuery.error.value.message
    : t("admin.subscriptions.errors.list");
});

const hasMoreSubscriptions = computed(() => Boolean(subscriptionsQuery.data.value?.nextCursor));
const isEditPending = computed(
  () =>
    updateTierMutation.isPending.value
    || updateExpiresAtMutation.isPending.value
    || updateCancelAtPeriodEndMutation.isPending.value
);

const handleTierFilterChange = (value: string) => {
  tierFilter.value = value as SubscriptionTierFilter;
};

const handleBillingIntervalFilterChange = (value: string) => {
  billingIntervalFilter.value = value as BillingIntervalFilter;
};

const handleCancelAtPeriodEndFilterChange = (value: string) => {
  cancelAtPeriodEndFilter.value = value as CancelAtPeriodEndFilter;
};

const openSubscriptionEditor = (userId: string) => {
  selectedUserId.value = userId;
  isEditOpen.value = true;
  editError.value = "";
};

const handleEditOpenChange = (open: boolean) => {
  isEditOpen.value = open;

  if (!open) {
    selectedUserId.value = null;
    editError.value = "";
  }
};

const normalizeToIsoString = (value: Date | string | null) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString();
};

const handleSaveSubscription = async (draft: {
  tier: AdminSubscriptionRow["tier"];
  expiresAt: string;
  cancelAtPeriodEnd: boolean;
}) => {
  if (!selectedSubscription.value) {
    return;
  }

  editError.value = "";

  try {
    if (draft.tier !== selectedSubscription.value.tier) {
      await updateTierMutation.mutateAsync({
        userId: selectedSubscription.value.userId,
        tier: draft.tier,
      });
    }

    const currentExpiresAt = normalizeToIsoString(selectedSubscription.value.expiresAt);
    const nextExpiresAt = draft.expiresAt ? new Date(draft.expiresAt).toISOString() : null;

    if (currentExpiresAt !== nextExpiresAt) {
      await updateExpiresAtMutation.mutateAsync({
        userId: selectedSubscription.value.userId,
        expiresAt: nextExpiresAt,
      });
    }

    if (draft.cancelAtPeriodEnd !== selectedSubscription.value.cancelAtPeriodEnd) {
      await updateCancelAtPeriodEndMutation.mutateAsync({
        userId: selectedSubscription.value.userId,
        cancelAtPeriodEnd: draft.cancelAtPeriodEnd,
      });
    }
  } catch (error) {
    editError.value =
      error instanceof Error ? error.message : t("admin.subscriptions.errors.update");
  }
};
</script>

<template>
  <div class="space-y-6">
    <section class="space-y-1">
      <h1 class="text-2xl font-semibold">{{ t("admin.subscriptions.page.title") }}</h1>
      <p class="text-sm text-muted-foreground">
        {{ t("admin.subscriptions.page.description") }}
      </p>
    </section>

    <Card>
      <CardHeader>
        <CardTitle>{{ t("admin.subscriptions.filters.title") }}</CardTitle>
        <CardDescription>
          {{ t("admin.subscriptions.filters.description") }}
        </CardDescription>
      </CardHeader>
      <CardContent class="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div class="space-y-2 xl:col-span-2">
          <p class="text-sm font-medium">{{ t("admin.subscriptions.filters.search.label") }}</p>
          <Input v-model="searchQuery" :placeholder="t('admin.subscriptions.filters.search.placeholder')" />
        </div>

        <div class="space-y-2">
          <p class="text-sm font-medium">{{ t("admin.subscriptions.filters.tier.label") }}</p>
          <Select :model-value="tierFilter" @update:model-value="(value) => handleTierFilterChange(String(value))">
            <SelectTrigger class="w-full">
              <SelectValue :placeholder="t('admin.subscriptions.filters.tier.all')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{{ t("admin.subscriptions.filters.tier.all") }}</SelectItem>
              <SelectItem value="free">{{ t("admin.common.subscriptionTier.free") }}</SelectItem>
              <SelectItem value="basic">{{ t("admin.common.subscriptionTier.basic") }}</SelectItem>
              <SelectItem value="pro">{{ t("admin.common.subscriptionTier.pro") }}</SelectItem>
              <SelectItem value="max">{{ t("admin.common.subscriptionTier.max") }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <p class="text-sm font-medium">{{ t("admin.subscriptions.filters.billing.label") }}</p>
          <Select :model-value="billingIntervalFilter" @update:model-value="(value) => handleBillingIntervalFilterChange(String(value))">
            <SelectTrigger class="w-full">
              <SelectValue :placeholder="t('admin.subscriptions.filters.billing.all')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{{ t("admin.subscriptions.filters.billing.all") }}</SelectItem>
              <SelectItem value="monthly">{{ t("admin.common.billingInterval.monthly") }}</SelectItem>
              <SelectItem value="yearly">{{ t("admin.common.billingInterval.yearly") }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <p class="text-sm font-medium">{{ t("admin.subscriptions.filters.cancelFlag.label") }}</p>
          <Select :model-value="cancelAtPeriodEndFilter" @update:model-value="(value) => handleCancelAtPeriodEndFilterChange(String(value))">
            <SelectTrigger class="w-full">
              <SelectValue :placeholder="t('admin.subscriptions.filters.cancelFlag.all')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{{ t("admin.subscriptions.filters.cancelFlag.all") }}</SelectItem>
              <SelectItem value="true">{{ t("admin.subscriptions.filters.cancelFlag.canceling") }}</SelectItem>
              <SelectItem value="false">{{ t("admin.subscriptions.filters.cancelFlag.continuing") }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>{{ t("admin.subscriptions.directory.title") }}</CardTitle>
        <CardDescription>
          {{ t("admin.subscriptions.directory.description") }}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AdminSubscriptionsTable
          :items="subscriptionsQuery.data.value?.items ?? []"
          :is-loading="subscriptionsQuery.isLoading.value"
          :error-message="subscriptionsErrorMessage"
          :has-more="hasMoreSubscriptions"
          :selected-user-id="selectedUserId"
          @select="openSubscriptionEditor"
        />
      </CardContent>
    </Card>

    <AdminSubscriptionEditDialog
      :open="isEditOpen"
      :subscription="selectedSubscription"
      :is-pending="isEditPending"
      :error-message="editError"
      @update:open="handleEditOpenChange"
      @save="handleSaveSubscription"
    />
  </div>
</template>
