<script setup lang="ts">
import { computed, ref, watch } from "vue";

import AdminActionConfirmDialog from "@/components/admin/AdminActionConfirmDialog.vue";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { useIntlLocale } from "@/composables/use-intl-locale";

type SubscriptionTier = "free" | "basic" | "pro" | "max";

type AdminSubscriptionRow = {
  userId: string;
  subscriptionId: string | null;
  name: string;
  email: string;
  tier: SubscriptionTier;
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

const props = defineProps<{
  open: boolean;
  subscription: AdminSubscriptionRow | null;
  isPending: boolean;
  errorMessage: string;
}>();

const { t } = useI18n();
const intlLocale = useIntlLocale();

const emit = defineEmits<{
  "update:open": [open: boolean];
  save: [draft: { tier: SubscriptionTier; expiresAt: string; cancelAtPeriodEnd: boolean }];
}>();

const draftTier = ref<SubscriptionTier>("free");
const draftExpiresAt = ref("");
const draftCancelAtPeriodEnd = ref(false);
const isConfirmOpen = ref(false);

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

const toDateTimeLocal = (value: Date | string | null) => {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

watch(
  () => props.subscription,
  (subscription) => {
    draftTier.value = subscription?.tier ?? "free";
    draftExpiresAt.value = toDateTimeLocal(subscription?.expiresAt ?? null);
    draftCancelAtPeriodEnd.value = subscription?.cancelAtPeriodEnd ?? false;
    isConfirmOpen.value = false;
  },
  { immediate: true }
);

const handleTierChange = (value: string) => {
  draftTier.value = value as SubscriptionTier;
};

const planLabel = computed(() => {
  if (!props.subscription) {
    return "—";
  }

  const tier = t(`admin.common.subscriptionTier.${props.subscription.tier}`);

  if (props.subscription.billingInterval) {
    return `${tier} · ${t(`admin.common.billingInterval.${props.subscription.billingInterval}`)}`;
  }

  return tier;
});

const hasPendingChanges = computed(() => {
  if (!props.subscription) {
    return false;
  }

  return (
    draftTier.value !== props.subscription.tier
    || draftExpiresAt.value !== toDateTimeLocal(props.subscription.expiresAt)
    || draftCancelAtPeriodEnd.value !== props.subscription.cancelAtPeriodEnd
  );
});

const changedFieldsLabel = computed(() => {
  if (!props.subscription) {
    return t("admin.subscriptions.edit.confirm.theseChanges");
  }

  const changedFields: string[] = [];

  if (draftTier.value !== props.subscription.tier) {
    changedFields.push(t("admin.subscriptions.edit.fields.tier"));
  }

  if (draftExpiresAt.value !== toDateTimeLocal(props.subscription.expiresAt)) {
    changedFields.push(t("admin.subscriptions.edit.fields.expiry"));
  }

  if (draftCancelAtPeriodEnd.value !== props.subscription.cancelAtPeriodEnd) {
    changedFields.push(t("admin.subscriptions.edit.fields.cancellation"));
  }

  return changedFields.join(", ") || t("admin.subscriptions.edit.confirm.theseChanges");
});

const handleSave = () => {
  if (!hasPendingChanges.value || props.isPending) {
    return;
  }

  isConfirmOpen.value = true;
};

const handleConfirmSave = () => {
  isConfirmOpen.value = false;
  emit("save", {
    tier: draftTier.value,
    expiresAt: draftExpiresAt.value,
    cancelAtPeriodEnd: draftCancelAtPeriodEnd.value,
  });
};
</script>

<template>
  <Sheet :open="open" @update:open="(value) => emit('update:open', value)">
    <SheetContent class="sm:max-w-xl">
      <SheetHeader>
        <SheetTitle>{{ t("admin.subscriptions.edit.title") }}</SheetTitle>
        <SheetDescription>
          {{ t("admin.subscriptions.edit.description") }}
        </SheetDescription>
      </SheetHeader>

      <div class="flex h-full flex-col gap-4 overflow-y-auto pr-1">
        <div
          v-if="!subscription"
          class="rounded-lg border border-dashed p-6 text-sm text-muted-foreground"
        >
          {{ t("admin.subscriptions.edit.empty") }}
        </div>
        <template v-else>
          <Card>
            <CardHeader>
              <CardTitle>{{ subscription.name }}</CardTitle>
              <CardDescription>{{ subscription.email }}</CardDescription>
            </CardHeader>
            <CardContent class="space-y-2 text-sm">
              <div class="flex flex-wrap gap-2">
                <Badge>{{ planLabel }}</Badge>
                <Badge variant="outline">{{ subscription.status }}</Badge>
              </div>
              <p class="text-muted-foreground">
                {{ t("admin.subscriptions.edit.currentExpiry") }}: {{ formatDateTime(subscription.expiresAt) }}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{{ t("admin.subscriptions.edit.controls.title") }}</CardTitle>
              <CardDescription>
                {{ t("admin.subscriptions.edit.controls.description") }}
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="space-y-2">
                <p class="text-sm font-medium">{{ t("admin.subscriptions.edit.fields.tier") }}</p>
                <Select :model-value="draftTier" @update:model-value="(value) => handleTierChange(String(value))">
                  <SelectTrigger class="w-full">
                    <SelectValue :placeholder="t('admin.subscriptions.edit.controls.tierPlaceholder')" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">{{ t("admin.common.subscriptionTier.free") }}</SelectItem>
                    <SelectItem value="basic">{{ t("admin.common.subscriptionTier.basic") }}</SelectItem>
                    <SelectItem value="pro">{{ t("admin.common.subscriptionTier.pro") }}</SelectItem>
                    <SelectItem value="max">{{ t("admin.common.subscriptionTier.max") }}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-2">
                <p class="text-sm font-medium">{{ t("admin.subscriptions.edit.fields.expiry") }}</p>
                <Input v-model="draftExpiresAt" type="datetime-local" />
              </div>

              <div class="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p class="text-sm font-medium">
                    {{ t("admin.subscriptions.edit.fields.cancellation") }}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    {{ t("admin.subscriptions.edit.controls.cancelAtPeriodEndHint") }}
                  </p>
                </div>
                <Switch v-model="draftCancelAtPeriodEnd" />
              </div>

              <div class="space-y-1 rounded-md border p-3 text-xs text-muted-foreground">
                <p>{{ t("admin.common.stripe.customer") }}: {{ subscription.stripeCustomerId || "—" }}</p>
                <p>{{ t("admin.common.stripe.subscription") }}: {{ subscription.stripeSubscriptionId || "—" }}</p>
                <p>{{ t("admin.common.stripe.price") }}: {{ subscription.stripePriceId || "—" }}</p>
              </div>

              <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button class="w-full sm:w-auto" :disabled="isPending || !hasPendingChanges" @click="handleSave">
                  {{
                    isPending
                      ? t("admin.subscriptions.edit.controls.saving")
                      : t("admin.subscriptions.edit.controls.save")
                  }}
                </Button>
                <p class="text-xs text-muted-foreground">
                  {{
                    hasPendingChanges
                      ? t("admin.subscriptions.edit.controls.pendingFields", { fields: changedFieldsLabel })
                      : t("admin.subscriptions.edit.controls.noPendingChanges")
                  }}
                </p>
              </div>

              <p v-if="errorMessage" class="text-sm text-destructive">
                {{ errorMessage }}
              </p>
            </CardContent>
          </Card>
        </template>
      </div>
    </SheetContent>
  </Sheet>

  <AdminActionConfirmDialog
    :open="isConfirmOpen"
    :title="t('admin.subscriptions.edit.confirm.title')"
    :description="subscription
      ? t('admin.subscriptions.edit.confirm.description', { fields: changedFieldsLabel, name: subscription.name })
      : t('admin.subscriptions.edit.confirm.descriptionFallback')"
    :confirm-label="t('admin.subscriptions.edit.confirm.confirmLabel')"
    :confirm-pending-label="t('admin.subscriptions.edit.controls.saving')"
    :is-pending="isPending"
    @update:open="(open) => { isConfirmOpen = open; }"
    @confirm="handleConfirmSave"
  />
</template>
