<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, ref } from "vue";

import AdminAiConfigDetailDialog from "@/components/admin/AdminAiConfigDetailDialog.vue";
import AdminAiUsageFilters from "@/components/admin/AdminAiUsageFilters.vue";
import AdminAiUsageTable from "@/components/admin/AdminAiUsageTable.vue";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dashboardQueryKeys } from "@/lib/dashboard-query-keys";

definePageMeta({
  layout: "dashboard",
  middleware: "admin-auth",
  title: "Admin AI Usage",
});

type AiUsageStatusFilter = "all" | "SUCCESS" | "FAILED";

const { $orpc } = useNuxtApp();
const queryClient = useQueryClient();

const providerFilter = ref("");
const modelFilter = ref("");
const statusFilter = ref<AiUsageStatusFilter>("all");
const userFilter = ref("");
const startedAtFilter = ref("");
const endedAtFilter = ref("");

const isConfigDialogOpen = ref(false);
const configActionError = ref("");

const toIsoDateTime = (value: string) => {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
};

const eventsInput = computed(() => ({
  provider: providerFilter.value.trim() || undefined,
  model: modelFilter.value.trim() || undefined,
  status: statusFilter.value === "all" ? undefined : statusFilter.value,
  userQuery: userFilter.value.trim() || undefined,
  startedAt: toIsoDateTime(startedAtFilter.value),
  endedAt: toIsoDateTime(endedAtFilter.value),
  limit: 50,
}));

const eventsQuery = useQuery(
  computed(() =>
    $orpc.admin.aiUsage.listEvents.queryOptions({
      input: eventsInput.value,
      queryKey: dashboardQueryKeys.admin.aiUsage.listEvents(
        providerFilter.value.trim(),
        modelFilter.value.trim(),
        statusFilter.value,
        userFilter.value.trim(),
        eventsInput.value.startedAt ?? "",
        eventsInput.value.endedAt ?? "",
        50
      ),
    })
  )
);

const overviewDays = 7;

const overviewQuery = useQuery(
  $orpc.admin.aiUsage.overview.queryOptions({
    input: { days: overviewDays },
    queryKey: dashboardQueryKeys.admin.aiUsage.overview(overviewDays),
  })
);

const configsInput = computed(() => ({
  provider: providerFilter.value.trim() || undefined,
  model: modelFilter.value.trim() || undefined,
  userQuery: userFilter.value.trim() || undefined,
  limit: 100,
}));

const configsQuery = useQuery(
  computed(() =>
    $orpc.admin.aiUsage.listConfigs.queryOptions({
      input: configsInput.value,
      queryKey: dashboardQueryKeys.admin.aiUsage.configs(
        providerFilter.value.trim(),
        modelFilter.value.trim(),
        userFilter.value.trim(),
        "all"
      ),
      enabled: isConfigDialogOpen.value,
    })
  )
);

const updateConfigMutation = useMutation(
  $orpc.admin.aiUsage.updateConfigEnabled.mutationOptions({
    onSuccess: async () => {
      configActionError.value = "";
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root() });
    },
  })
);

const isConfigActionPending = computed(() => updateConfigMutation.isPending.value);

const eventsErrorMessage = computed(() => {
  if (!eventsQuery.error.value) {
    return "";
  }

  return eventsQuery.error.value instanceof Error
    ? eventsQuery.error.value.message
    : "Could not load AI usage events.";
});

const summaryErrorMessage = computed(() => {
  if (!overviewQuery.error.value) {
    return "";
  }

  return overviewQuery.error.value instanceof Error
    ? overviewQuery.error.value.message
    : "Could not load AI usage summary.";
});

const handleToggleConfigEnabled = async (payload: {
  aiConfigId: string;
  isEnabled: boolean;
}) => {
  configActionError.value = "";

  try {
    await updateConfigMutation.mutateAsync(payload);
  } catch (error) {
    configActionError.value =
      error instanceof Error ? error.message : "Could not update this AI config.";
  }
};
</script>

<template>
  <div class="space-y-6">
    <section class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div class="space-y-1">
        <h1 class="text-2xl font-semibold">AI usage</h1>
        <p class="text-sm text-muted-foreground">
          Inspect usage events, recent failures, and AI config state.
        </p>
      </div>
      <Button variant="outline" @click="isConfigDialogOpen = true">
        Manage AI configs
      </Button>
    </section>

    <Card>
      <CardHeader>
        <CardTitle>Summary (7 days)</CardTitle>
        <CardDescription>
          Token usage and failure trends for admin support visibility.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <p v-if="summaryErrorMessage" class="text-sm text-destructive">
          {{ summaryErrorMessage }}
        </p>
        <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div class="rounded-md border p-3">
            <p class="text-xs text-muted-foreground">Total tokens</p>
            <p class="mt-1 text-lg font-semibold">
              {{ overviewQuery.data.value?.totalTokens?.toLocaleString() ?? "0" }}
            </p>
          </div>
          <div class="rounded-md border p-3">
            <p class="text-xs text-muted-foreground">Total requests</p>
            <p class="mt-1 text-lg font-semibold">
              {{ overviewQuery.data.value?.totalRequests?.toLocaleString() ?? "0" }}
            </p>
          </div>
          <div class="rounded-md border p-3">
            <p class="text-xs text-muted-foreground">Failures</p>
            <p class="mt-1 text-lg font-semibold">
              {{ overviewQuery.data.value?.failureCount?.toLocaleString() ?? "0" }}
            </p>
          </div>
          <div class="rounded-md border p-3">
            <p class="text-xs text-muted-foreground">Top user</p>
            <p class="mt-1 text-sm font-semibold">
              {{ overviewQuery.data.value?.topUsers?.[0]?.userEmail ?? "N/A" }}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
        <CardDescription>
          Filter by user, provider, model, status, and time range.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AdminAiUsageFilters
          :provider="providerFilter"
          :model="modelFilter"
          :status="statusFilter"
          :user-query="userFilter"
          :started-at="startedAtFilter"
          :ended-at="endedAtFilter"
          @update:provider="providerFilter = $event"
          @update:model="modelFilter = $event"
          @update:status="statusFilter = $event"
          @update:user-query="userFilter = $event"
          @update:started-at="startedAtFilter = $event"
          @update:ended-at="endedAtFilter = $event"
        />
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>AI events</CardTitle>
        <CardDescription>
          Recent summarize activity with success/failure status and safe error summaries.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AdminAiUsageTable
          :is-loading="eventsQuery.isLoading.value"
          :error-message="eventsErrorMessage"
          :items="eventsQuery.data.value?.items ?? []"
        />
      </CardContent>
    </Card>

    <AdminAiConfigDetailDialog
      :open="isConfigDialogOpen"
      :is-loading="configsQuery.isLoading.value"
      :action-pending="isConfigActionPending"
      :action-error="configActionError"
      :configs="configsQuery.data.value?.items ?? []"
      @update:open="(open) => { isConfigDialogOpen = open; }"
      @toggle-enabled="handleToggleConfigEnabled"
    />
  </div>
</template>
