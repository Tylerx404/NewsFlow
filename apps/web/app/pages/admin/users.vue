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
  title: "Admin Users",
});

type UserRoleFilter = "all" | "USER" | "ADMIN";
type UserStatusFilter = "all" | "ACTIVE" | "SUSPENDED";
type SubscriptionTierFilter = "all" | "free" | "basic" | "pro" | "max";

const { $orpc } = useNuxtApp();
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
    : "Could not load admin users. Refresh and try again.";
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
      error instanceof Error ? error.message : "Could not suspend this user. Try again.";
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
      error instanceof Error ? error.message : "Could not reactivate this user. Try again.";
  }
};
</script>

<template>
  <div class="space-y-6">
    <section class="space-y-1">
      <h1 class="text-2xl font-semibold">Admin users</h1>
      <p class="text-sm text-muted-foreground">
        Review user accounts, subscription state, and account status actions.
      </p>
    </section>

    <Card>
      <CardHeader>
        <CardTitle>Filters</CardTitle>
        <CardDescription>
          Search users and narrow results by role, account status, or subscription tier.
        </CardDescription>
      </CardHeader>
      <CardContent class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div class="space-y-2 xl:col-span-2">
          <p class="text-sm font-medium">Search</p>
          <Input v-model="searchQuery" placeholder="Name or email" />
        </div>

        <div class="space-y-2">
          <p class="text-sm font-medium">Role</p>
          <Select :model-value="roleFilter" @update:model-value="(value) => handleRoleFilterChange(String(value))">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="USER">User</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <p class="text-sm font-medium">Status</p>
          <Select :model-value="statusFilter" @update:model-value="(value) => handleStatusFilterChange(String(value))">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="SUSPENDED">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <p class="text-sm font-medium">Tier</p>
          <Select :model-value="tierFilter" @update:model-value="(value) => handleTierFilterChange(String(value))">
            <SelectTrigger class="w-full">
              <SelectValue placeholder="All tiers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tiers</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="basic">Basic</SelectItem>
              <SelectItem value="pro">Pro</SelectItem>
              <SelectItem value="max">Max</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>User directory</CardTitle>
        <CardDescription>
          Open a user row to review details and update account status.
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
