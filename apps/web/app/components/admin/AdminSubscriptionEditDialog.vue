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
  return date.toLocaleString();
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

  const tier = props.subscription.tier.toUpperCase();

  if (props.subscription.billingInterval) {
    return `${tier} · ${props.subscription.billingInterval}`;
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
    return "these changes";
  }

  const changedFields: string[] = [];

  if (draftTier.value !== props.subscription.tier) {
    changedFields.push("tier");
  }

  if (draftExpiresAt.value !== toDateTimeLocal(props.subscription.expiresAt)) {
    changedFields.push("expiry");
  }

  if (draftCancelAtPeriodEnd.value !== props.subscription.cancelAtPeriodEnd) {
    changedFields.push("cancellation");
  }

  return changedFields.join(", ") || "these changes";
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
        <SheetTitle>Edit subscription</SheetTitle>
        <SheetDescription>
          Support plan changes, expiry adjustments, and cancellation flags.
        </SheetDescription>
      </SheetHeader>

      <div class="flex h-full flex-col gap-4 overflow-y-auto pr-1">
        <div v-if="!subscription" class="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          Select a subscription row to edit support settings.
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
                Current expiry: {{ formatDateTime(subscription.expiresAt) }}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Support controls</CardTitle>
              <CardDescription>
                Adjust billing and support flags for this user.
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="space-y-2">
                <p class="text-sm font-medium">Tier</p>
                <Select :model-value="draftTier" @update:model-value="(value) => handleTierChange(String(value))">
                  <SelectTrigger class="w-full">
                    <SelectValue placeholder="Select tier" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="max">Max</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-2">
                <p class="text-sm font-medium">Expires at</p>
                <Input v-model="draftExpiresAt" type="datetime-local" />
              </div>

              <div class="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p class="text-sm font-medium">Cancel at period end</p>
                  <p class="text-xs text-muted-foreground">
                    Preserve subscription until the current paid period ends.
                  </p>
                </div>
                <Switch v-model="draftCancelAtPeriodEnd" />
              </div>

              <div class="space-y-1 rounded-md border p-3 text-xs text-muted-foreground">
                <p>Stripe customer: {{ subscription.stripeCustomerId || "—" }}</p>
                <p>Stripe subscription: {{ subscription.stripeSubscriptionId || "—" }}</p>
                <p>Stripe price: {{ subscription.stripePriceId || "—" }}</p>
              </div>

              <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Button class="w-full sm:w-auto" :disabled="isPending || !hasPendingChanges" @click="handleSave">
                  {{ isPending ? "Saving..." : "Save changes" }}
                </Button>
                <p class="text-xs text-muted-foreground">
                  {{ hasPendingChanges ? `Pending fields: ${changedFieldsLabel}.` : "No pending changes to save." }}
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
    title="Save subscription changes?"
    :description="subscription
      ? `Apply ${changedFieldsLabel} for ${subscription.name}. These updates are recorded in the admin audit log.`
      : 'Apply the pending subscription changes.'"
    confirm-label="Save subscription changes"
    confirm-pending-label="Saving..."
    :is-pending="isPending"
    @update:open="(open) => { isConfirmOpen = open; }"
    @confirm="handleConfirmSave"
  />
</template>
