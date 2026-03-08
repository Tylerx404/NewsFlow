<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, ref } from "vue";

import AdminUserDetailDialog from "@/components/admin/AdminUserDetailDialog.vue";
import AdminUsersTable from "@/components/admin/AdminUsersTable.vue";
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
  titleKey: "admin.users.metaTitle",
});

type UserRoleFilter = "all" | "USER" | "ADMIN";
type UserStatusFilter = "all" | "ACTIVE" | "SUSPENDED";
type SubscriptionTierFilter = "all" | "free" | "basic" | "pro" | "max";

const { $orpc } = useNuxtApp();
const { t } = useI18n();
const queryClient = useQueryClient();

const searchQuery = ref("");
const roleFilter = ref<UserRoleFilter>("all");
const statusFilter = ref<UserStatusFilter>("all");
const tierFilter = ref<SubscriptionTierFilter>("all");
const selectedUserId = ref<string | null>(null);
const isDetailOpen = ref(false);
const detailActionError = ref("");

const userListInput = computed(() => ({
  query: searchQuery.value.trim() || undefined,
  role: roleFilter.value === "all" ? undefined : roleFilter.value,
  status: statusFilter.value === "all" ? undefined : statusFilter.value,
  tier: tierFilter.value === "all" ? undefined : tierFilter.value,
  limit: 20,
}));

const usersQuery = useQuery(
  computed(() =>
    $orpc.admin.user.list.queryOptions({
      input: userListInput.value,
      queryKey: dashboardQueryKeys.admin.users.list(
        searchQuery.value.trim(),
        roleFilter.value,
        statusFilter.value,
        tierFilter.value
      ),
    })
  )
);

const userDetailQuery = useQuery(
  computed(() =>
    $orpc.admin.user.detail.queryOptions({
      input: { userId: selectedUserId.value ?? "" },
      queryKey: dashboardQueryKeys.admin.users.detail(selectedUserId.value ?? "none"),
      enabled: Boolean(selectedUserId.value && isDetailOpen.value),
    })
  )
);

const suspendUserMutation = useMutation(
  $orpc.admin.user.suspend.mutationOptions({
    onSuccess: async () => {
      detailActionError.value = "";
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root() });
    },
  })
);

const reactivateUserMutation = useMutation(
  $orpc.admin.user.reactivate.mutationOptions({
    onSuccess: async () => {
      detailActionError.value = "";
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root() });
    },
  })
);

const usersErrorMessage = computed(() => {
  if (!usersQuery.error.value) {
    return "";
  }

  return usersQuery.error.value instanceof Error
    ? usersQuery.error.value.message
    : t("admin.users.errors.list");
});

const hasMoreUsers = computed(() => Boolean(usersQuery.data.value?.nextCursor));
const isDetailActionPending = computed(
  () => suspendUserMutation.isPending.value || reactivateUserMutation.isPending.value
);

const handleRoleFilterChange = (value: string) => {
  roleFilter.value = value as UserRoleFilter;
};

const handleStatusFilterChange = (value: string) => {
  statusFilter.value = value as UserStatusFilter;
};

const handleTierFilterChange = (value: string) => {
  tierFilter.value = value as SubscriptionTierFilter;
};

const openUserDetail = (userId: string) => {
  selectedUserId.value = userId;
  isDetailOpen.value = true;
  detailActionError.value = "";
};

const handleDetailOpenChange = (open: boolean) => {
  isDetailOpen.value = open;

  if (!open) {
    selectedUserId.value = null;
    detailActionError.value = "";
  }
};

const handleSuspendUser = async (reason?: string) => {
  if (!selectedUserId.value) {
    return;
  }

  detailActionError.value = "";

  try {
    await suspendUserMutation.mutateAsync({
      userId: selectedUserId.value,
      reason,
    });
  } catch (error) {
    detailActionError.value =
      error instanceof Error ? error.message : t("admin.users.errors.suspend");
  }
};

const handleReactivateUser = async () => {
  if (!selectedUserId.value) {
    return;
  }

  detailActionError.value = "";

  try {
    await reactivateUserMutation.mutateAsync({
      userId: selectedUserId.value,
    });
  } catch (error) {
    detailActionError.value =
      error instanceof Error ? error.message : t("admin.users.errors.reactivate");
  }
};
</script>

<template>
  <div class="space-y-6">
    <section class="space-y-1">
      <h1 class="text-2xl font-semibold">{{ t("admin.users.page.title") }}</h1>
      <p class="text-sm text-muted-foreground">
        {{ t("admin.users.page.description") }}
      </p>
    </section>

    <Card>
      <CardHeader>
        <CardTitle>{{ t("admin.users.filters.title") }}</CardTitle>
        <CardDescription>
          {{ t("admin.users.filters.description") }}
        </CardDescription>
      </CardHeader>
      <CardContent class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div class="space-y-2 xl:col-span-2">
          <p class="text-sm font-medium">{{ t("admin.users.filters.search.label") }}</p>
          <Input v-model="searchQuery" :placeholder="t('admin.users.filters.search.placeholder')" />
        </div>

        <div class="space-y-2">
          <p class="text-sm font-medium">{{ t("admin.users.filters.role.label") }}</p>
          <Select :model-value="roleFilter" @update:model-value="(value) => handleRoleFilterChange(String(value))">
            <SelectTrigger class="w-full">
              <SelectValue :placeholder="t('admin.users.filters.role.all')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{{ t("admin.users.filters.role.all") }}</SelectItem>
              <SelectItem value="USER">{{ t("admin.common.roles.user") }}</SelectItem>
              <SelectItem value="ADMIN">{{ t("admin.common.roles.admin") }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <p class="text-sm font-medium">{{ t("admin.users.filters.status.label") }}</p>
          <Select :model-value="statusFilter" @update:model-value="(value) => handleStatusFilterChange(String(value))">
            <SelectTrigger class="w-full">
              <SelectValue :placeholder="t('admin.users.filters.status.all')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{{ t("admin.users.filters.status.all") }}</SelectItem>
              <SelectItem value="ACTIVE">{{ t("admin.common.accountStatus.active") }}</SelectItem>
              <SelectItem value="SUSPENDED">{{ t("admin.common.accountStatus.suspended") }}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <p class="text-sm font-medium">{{ t("admin.users.filters.tier.label") }}</p>
          <Select :model-value="tierFilter" @update:model-value="(value) => handleTierFilterChange(String(value))">
            <SelectTrigger class="w-full">
              <SelectValue :placeholder="t('admin.users.filters.tier.all')" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{{ t("admin.users.filters.tier.all") }}</SelectItem>
              <SelectItem value="free">{{ t("admin.common.subscriptionTier.free") }}</SelectItem>
              <SelectItem value="basic">{{ t("admin.common.subscriptionTier.basic") }}</SelectItem>
              <SelectItem value="pro">{{ t("admin.common.subscriptionTier.pro") }}</SelectItem>
              <SelectItem value="max">{{ t("admin.common.subscriptionTier.max") }}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>{{ t("admin.users.directory.title") }}</CardTitle>
        <CardDescription>
          {{ t("admin.users.directory.description") }}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <AdminUsersTable
          :items="usersQuery.data.value?.items ?? []"
          :is-loading="usersQuery.isLoading.value"
          :error-message="usersErrorMessage"
          :has-more="hasMoreUsers"
          :selected-user-id="selectedUserId"
          @select="openUserDetail"
        />
      </CardContent>
    </Card>

    <AdminUserDetailDialog
      :open="isDetailOpen"
      :user="userDetailQuery.data.value ?? null"
      :is-loading="userDetailQuery.isLoading.value"
      :action-pending="isDetailActionPending"
      :action-error="detailActionError"
      @update:open="handleDetailOpenChange"
      @suspend="handleSuspendUser"
      @reactivate="handleReactivateUser"
    />
  </div>
</template>
