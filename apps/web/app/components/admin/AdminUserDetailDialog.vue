<script setup lang="ts">
import { computed, ref, watch } from "vue";

import AdminActionConfirmDialog from "@/components/admin/AdminActionConfirmDialog.vue";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useIntlLocale } from "@/composables/use-intl-locale";

type AdminUserDetail = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED";
  suspendedAt: Date | string | null;
  suspendedReason: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  feedCount: number;
  subscription: {
    tier: "free" | "basic" | "pro" | "max";
    status: string;
    billingInterval: "monthly" | "yearly" | null;
    expiresAt: Date | string | null;
  };
};

const props = defineProps<{
  open: boolean;
  user: AdminUserDetail | null;
  isLoading: boolean;
  actionPending: boolean;
  actionError: string;
}>();

const { t } = useI18n();
const intlLocale = useIntlLocale();

const emit = defineEmits<{
  "update:open": [open: boolean];
  suspend: [reason: string | undefined];
  reactivate: [];
}>();

const suspendReason = ref("");
const confirmAction = ref<"suspend" | "reactivate" | null>(null);

watch(
  () => [props.open, props.user?.id, props.user?.suspendedReason],
  () => {
    suspendReason.value = props.user?.status === "SUSPENDED"
      ? props.user.suspendedReason ?? ""
      : "";
    confirmAction.value = null;
  },
  { immediate: true }
);

const isSuspended = computed(() => props.user?.status === "SUSPENDED");

const formatDateTime = (value: Date | string | null) => {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(intlLocale.value, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatSubscription = (user: AdminUserDetail) => {
  const tier = t(`admin.common.subscriptionTier.${user.subscription.tier}`);

  if (user.subscription.billingInterval) {
    return `${tier} · ${t(`admin.common.billingInterval.${user.subscription.billingInterval}`)}`;
  }

  return tier;
};

const statusBadgeClass = (status: AdminUserDetail["status"]) =>
  status === "SUSPENDED"
    ? "border-destructive/30 bg-destructive/10 text-destructive"
    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";

const avatarFallback = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

const confirmTitle = computed(() => {
  if (confirmAction.value === "reactivate") {
    return t("admin.users.detail.confirm.reactivate.title");
  }

  return t("admin.users.detail.confirm.suspend.title");
});

const confirmDescription = computed(() => {
  const userName = props.user?.name || t("admin.users.detail.confirm.thisUser");

  if (confirmAction.value === "reactivate") {
    return t("admin.users.detail.confirm.reactivate.description", { name: userName });
  }

  const reason = suspendReason.value.trim();

  if (reason.length > 0) {
    return t("admin.users.detail.confirm.suspend.descriptionWithReason", {
      name: userName,
      reason,
    });
  }

  return t("admin.users.detail.confirm.suspend.description", { name: userName });
});

const confirmLabel = computed(() =>
  confirmAction.value === "reactivate"
    ? t("admin.users.detail.actions.reactivate")
    : t("admin.users.detail.actions.suspend")
);

const confirmPendingLabel = computed(() =>
  confirmAction.value === "reactivate"
    ? t("admin.users.detail.actions.reactivating")
    : t("admin.users.detail.actions.suspending")
);

const confirmVariant = computed(() =>
  confirmAction.value === "reactivate" ? "secondary" : "destructive"
);

const requestSuspendConfirmation = () => {
  confirmAction.value = "suspend";
};

const requestReactivateConfirmation = () => {
  confirmAction.value = "reactivate";
};

const handleConfirmAction = () => {
  const nextAction = confirmAction.value;
  confirmAction.value = null;

  if (nextAction === "reactivate") {
    emit("reactivate");
    return;
  }

  emit("suspend", suspendReason.value.trim() || undefined);
};

const formatRole = (role: AdminUserDetail["role"]) =>
  role === "ADMIN" ? t("admin.common.roles.admin") : t("admin.common.roles.user");

const formatAccountStatus = (status: AdminUserDetail["status"]) =>
  status === "SUSPENDED"
    ? t("admin.common.accountStatus.suspended")
    : t("admin.common.accountStatus.active");
</script>

<template>
  <Sheet :open="open" @update:open="(value) => emit('update:open', value)">
    <SheetContent class="sm:max-w-xl">
      <SheetHeader>
        <SheetTitle>{{ t("admin.users.detail.title") }}</SheetTitle>
        <SheetDescription>
          {{ t("admin.users.detail.description") }}
        </SheetDescription>
      </SheetHeader>

      <div class="flex h-full flex-col gap-4 overflow-y-auto pr-1">
        <template v-if="isLoading">
          <div class="flex items-start gap-3 rounded-lg border p-4">
            <Skeleton class="size-12 rounded-full" />
            <div class="min-w-0 flex-1 space-y-2">
              <Skeleton class="h-5 w-32" />
              <Skeleton class="h-4 w-48" />
              <div class="flex gap-2">
                <Skeleton class="h-5 w-16 rounded-full" />
                <Skeleton class="h-5 w-20 rounded-full" />
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <Skeleton class="h-5 w-32" />
              <Skeleton class="h-4 w-48" />
            </CardHeader>
            <CardContent class="grid gap-3 sm:grid-cols-2">
              <Skeleton class="h-20 rounded-md" />
              <Skeleton class="h-20 rounded-md" />
              <Skeleton class="h-20 rounded-md" />
              <Skeleton class="h-20 rounded-md" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Skeleton class="h-5 w-28" />
              <Skeleton class="h-4 w-44" />
            </CardHeader>
            <CardContent class="space-y-3">
              <Skeleton class="h-9 rounded-md" />
              <Skeleton class="h-9 w-32 rounded-md" />
            </CardContent>
          </Card>
        </template>
        <div
          v-else-if="!user"
          class="rounded-lg border border-dashed p-6 text-sm text-muted-foreground"
        >
          {{ t("admin.users.detail.empty") }}
        </div>
        <template v-else>
          <div class="flex items-start gap-3 rounded-lg border p-4">
            <Avatar class="size-12 border">
              <AvatarImage v-if="user.image" :src="user.image" :alt="user.name" />
              <AvatarFallback>{{ avatarFallback(user.name) }}</AvatarFallback>
            </Avatar>
            <div class="min-w-0 flex-1 space-y-2">
              <div>
                <h2 class="truncate text-lg font-semibold">{{ user.name }}</h2>
                <p class="truncate text-sm text-muted-foreground">{{ user.email }}</p>
              </div>
              <div class="flex flex-wrap gap-2">
                <Badge :variant="user.role === 'ADMIN' ? 'default' : 'secondary'">
                  {{ formatRole(user.role) }}
                </Badge>
                <Badge variant="outline" :class="statusBadgeClass(user.status)">
                  {{ formatAccountStatus(user.status) }}
                </Badge>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{{ t("admin.users.detail.accountSummary.title") }}</CardTitle>
              <CardDescription>
                {{ t("admin.users.detail.accountSummary.description") }}
              </CardDescription>
            </CardHeader>
            <CardContent class="grid gap-3 sm:grid-cols-2">
              <div class="rounded-md border p-3">
                <p class="text-xs text-muted-foreground">{{ t("admin.users.detail.accountSummary.created") }}</p>
                <p class="mt-1 text-sm font-medium">{{ formatDateTime(user.createdAt) }}</p>
              </div>
              <div class="rounded-md border p-3">
                <p class="text-xs text-muted-foreground">{{ t("admin.users.detail.accountSummary.updated") }}</p>
                <p class="mt-1 text-sm font-medium">{{ formatDateTime(user.updatedAt) }}</p>
              </div>
              <div class="rounded-md border p-3">
                <p class="text-xs text-muted-foreground">{{ t("admin.users.detail.accountSummary.feeds") }}</p>
                <p class="mt-1 text-sm font-medium">{{ user.feedCount }}</p>
              </div>
              <div class="rounded-md border p-3">
                <p class="text-xs text-muted-foreground">{{ t("admin.users.detail.accountSummary.suspendedAt") }}</p>
                <p class="mt-1 text-sm font-medium">{{ formatDateTime(user.suspendedAt) }}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{{ t("admin.users.detail.subscription.title") }}</CardTitle>
              <CardDescription>
                {{ t("admin.users.detail.subscription.description") }}
              </CardDescription>
            </CardHeader>
            <CardContent class="grid gap-3 sm:grid-cols-2">
              <div class="rounded-md border p-3">
                <p class="text-xs text-muted-foreground">{{ t("admin.users.detail.subscription.plan") }}</p>
                <p class="mt-1 text-sm font-medium">{{ formatSubscription(user) }}</p>
              </div>
              <div class="rounded-md border p-3">
                <p class="text-xs text-muted-foreground">
                  {{ t("admin.users.detail.subscription.status") }}
                </p>
                <p class="mt-1 text-sm font-medium">{{ user.subscription.status }}</p>
              </div>
              <div class="rounded-md border p-3 sm:col-span-2">
                <p class="text-xs text-muted-foreground">{{ t("admin.users.detail.subscription.expires") }}</p>
                <p class="mt-1 text-sm font-medium">{{ formatDateTime(user.subscription.expiresAt) }}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{{ t("admin.users.detail.actions.title") }}</CardTitle>
              <CardDescription>
                {{ t("admin.users.detail.actions.description") }}
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-3">
              <template v-if="!isSuspended">
                <div class="space-y-2">
                  <Input
                    v-model="suspendReason"
                    :placeholder="t('admin.users.detail.actions.suspendReasonPlaceholder')"
                    :disabled="actionPending"
                  />
                  <p class="text-xs text-muted-foreground">
                    {{ t("admin.users.detail.actions.suspendReasonHint") }}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  class="w-full sm:w-auto"
                  :disabled="actionPending"
                  @click="requestSuspendConfirmation"
                >
                  {{
                    actionPending
                      ? t("admin.users.detail.actions.suspending")
                      : t("admin.users.detail.actions.suspend")
                  }}
                </Button>
              </template>
              <template v-else>
                <div class="rounded-md border p-3 text-sm">
                  <p class="text-xs text-muted-foreground">
                    {{ t("admin.users.detail.actions.suspensionReason") }}
                  </p>
                  <p class="mt-1 font-medium">
                    {{ user.suspendedReason || t("admin.users.detail.actions.noReason") }}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  class="w-full sm:w-auto"
                  :disabled="actionPending"
                  @click="requestReactivateConfirmation"
                >
                  {{
                    actionPending
                      ? t("admin.users.detail.actions.reactivating")
                      : t("admin.users.detail.actions.reactivate")
                  }}
                </Button>
              </template>

              <p v-if="actionError" class="text-sm text-destructive">
                {{ actionError }}
              </p>
            </CardContent>
          </Card>
        </template>
      </div>
    </SheetContent>
  </Sheet>

  <AdminActionConfirmDialog
    :open="Boolean(confirmAction)"
    :title="confirmTitle"
    :description="confirmDescription"
    :confirm-label="confirmLabel"
    :confirm-pending-label="confirmPendingLabel"
    :confirm-variant="confirmVariant"
    :is-pending="actionPending"
    @update:open="(open) => { if (!open) confirmAction = null; }"
    @confirm="handleConfirmAction"
  />
</template>
