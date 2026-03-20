<script setup lang="ts">
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
import { useUserBilling } from "@/composables/use-user-billing";

const errorBannerClass =
  "rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive";
const successBannerClass =
  "rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300";

const {
  applyPromotionCodeMutation,
  appliedPromotionCode,
  billingError,
  billingInterval,
  billingPortalMutation,
  billingSuccess,
  cancelSubscriptionMutation,
  formatCurrencyAmount,
  formatDate,
  handleApplyPromotionCode,
  handleCancelSubscription,
  handleClearPromotionCode,
  handleOpenBillingPortal,
  handleRestoreSubscription,
  handleStartCheckout,
  hasDiscountedPlanPrice,
  hasPaidSubscription,
  hasPendingCancellation,
  isBillingActionPending,
  promotionCodeInput,
  promotionError,
  promotionSuccess,
  restoreSubscriptionMutation,
  selectedPlan,
  selectedPlanBaseAmount,
  selectedPlanCurrency,
  selectedPlanDetails,
  selectedPlanFinalAmount,
  subscriptionPlanOptions,
  subscriptionQuery,
  upgradeSubscriptionMutation,
} = useUserBilling();
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Subscription</CardTitle>
      <CardDescription>
        Manage checkout, billing portal, and subscription lifecycle for your account.
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <p v-if="subscriptionQuery.isLoading.value" class="text-sm text-muted-foreground">
        Loading subscription...
      </p>
      <p v-else-if="subscriptionQuery.error.value" :class="errorBannerClass">
        {{
          subscriptionQuery.error.value instanceof Error
            ? subscriptionQuery.error.value.message
            : "Unable to load subscription."
        }}
      </p>

      <div v-else-if="subscriptionQuery.data.value" class="space-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            Tier: {{ subscriptionQuery.data.value.tier }}
          </Badge>
          <Badge variant="outline">
            Status: {{ subscriptionQuery.data.value.status }}
          </Badge>
          <Badge v-if="subscriptionQuery.data.value.billingInterval" variant="outline">
            Interval: {{ subscriptionQuery.data.value.billingInterval }}
          </Badge>
          <Badge
            v-if="subscriptionQuery.data.value.status === 'trialing'"
            variant="secondary"
          >
            Trial active
          </Badge>
        </div>

        <div class="space-y-3 rounded-md border p-3">
          <div>
            <p class="text-xs text-muted-foreground">Expires at</p>
            <p class="text-sm font-medium">
              {{ formatDate(subscriptionQuery.data.value.expiresAt) }}
            </p>
          </div>

          <div>
            <p class="text-xs text-muted-foreground">Updated at</p>
            <p class="text-sm font-medium">
              {{ formatDate(subscriptionQuery.data.value.updatedAt) }}
            </p>
          </div>
        </div>

        <div class="space-y-4 rounded-xl border bg-card/60 p-4">
          <div class="flex items-center justify-between gap-3">
            <p class="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              Choose plan
            </p>
            <p class="text-xs text-muted-foreground">
              {{ billingInterval === "yearly" ? "Yearly billing" : "Monthly billing" }}
            </p>
          </div>

          <div class="grid gap-2 sm:grid-cols-3">
            <button
              v-for="plan in subscriptionPlanOptions"
              :key="plan.key"
              type="button"
              class="rounded-lg border p-3 text-left transition duration-150"
              :class="
                selectedPlan === plan.key
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border/80 bg-background hover:border-primary/50'
              "
              @click="selectedPlan = plan.key"
            >
              <p class="text-sm font-semibold">{{ plan.label }}</p>
              <p class="mt-1 text-xs text-muted-foreground">
                {{ billingInterval === "yearly" ? plan.yearlyLabel : plan.monthlyLabel }}
              </p>
            </button>
          </div>

          <div class="inline-flex w-fit rounded-lg border bg-muted/40 p-1">
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-xs font-medium transition"
              :class="
                billingInterval === 'monthly'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground'
              "
              @click="billingInterval = 'monthly'"
            >
              Monthly
            </button>
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-xs font-medium transition"
              :class="
                billingInterval === 'yearly'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground'
              "
              @click="billingInterval = 'yearly'"
            >
              Yearly
            </button>
          </div>

          <div class="rounded-lg border bg-background p-4 shadow-sm">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-base font-semibold">{{ selectedPlanDetails.label }}</p>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ selectedPlanDetails.note }}
                </p>
              </div>
              <div class="text-right">
                <p class="flex flex-wrap items-center justify-end gap-2 text-lg font-semibold">
                  <span
                    v-if="hasDiscountedPlanPrice"
                    class="text-sm font-medium text-muted-foreground line-through"
                  >
                    {{ formatCurrencyAmount(selectedPlanBaseAmount, selectedPlanCurrency) }}
                  </span>
                  <span>
                    {{ formatCurrencyAmount(selectedPlanFinalAmount, selectedPlanCurrency) }}
                  </span>
                </p>
                <p class="text-xs text-muted-foreground">
                  / {{ billingInterval === "yearly" ? "year" : "month" }}
                </p>
              </div>
            </div>
            <p
              v-if="hasDiscountedPlanPrice && appliedPromotionCode"
              class="mt-3 text-xs font-medium text-emerald-600 dark:text-emerald-400"
            >
              Voucher {{ appliedPromotionCode }} applied.
            </p>
          </div>
        </div>

        <div class="space-y-3 rounded-xl border bg-card/60 p-4">
          <p class="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Voucher code
          </p>

          <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              v-model="promotionCodeInput"
              placeholder="Enter voucher code"
              autocomplete="off"
              class="h-10 sm:flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              class="h-10 px-5 sm:w-auto"
              :disabled="applyPromotionCodeMutation.isPending.value"
              @click="handleApplyPromotionCode"
            >
              {{
                applyPromotionCodeMutation.isPending.value
                  ? "Applying..."
                  : "Apply"
              }}
            </Button>
          </div>

          <button
            v-if="promotionCodeInput"
            type="button"
            class="w-fit text-xs font-medium text-muted-foreground transition hover:text-foreground"
            :disabled="applyPromotionCodeMutation.isPending.value"
            @click="handleClearPromotionCode"
          >
            Clear
          </button>

          <p v-if="promotionError" aria-live="polite" :class="errorBannerClass">
            {{ promotionError }}
          </p>
          <p
            v-else-if="promotionSuccess"
            aria-live="polite"
            :class="successBannerClass"
          >
            {{ promotionSuccess }}
          </p>
        </div>

        <div class="grid gap-2">
          <Button
            :disabled="isBillingActionPending"
            @click="handleStartCheckout"
          >
            {{
              upgradeSubscriptionMutation.isPending.value
                ? "Creating checkout..."
                : `Checkout ${selectedPlanDetails.label} (${billingInterval})`
            }}
          </Button>

          <Button
            variant="outline"
            :disabled="isBillingActionPending"
            @click="handleOpenBillingPortal"
          >
            {{
              billingPortalMutation.isPending.value
                ? "Opening portal..."
                : "Open billing portal"
            }}
          </Button>

          <Button
            v-if="hasPaidSubscription && !hasPendingCancellation"
            variant="outline"
            :disabled="isBillingActionPending"
            @click="handleCancelSubscription"
          >
            {{
              cancelSubscriptionMutation.isPending.value
                ? "Opening cancellation..."
                : "Cancel at period end"
            }}
          </Button>

          <Button
            v-if="hasPaidSubscription && hasPendingCancellation"
            variant="outline"
            :disabled="isBillingActionPending"
            @click="handleRestoreSubscription"
          >
            {{
              restoreSubscriptionMutation.isPending.value
                ? "Restoring..."
                : "Restore subscription"
            }}
          </Button>

          <Button variant="ghost" as-child>
            <NuxtLink to="/pricing">
              View full pricing page
            </NuxtLink>
          </Button>
        </div>

        <p class="text-xs text-muted-foreground">
          Voucher codes entered above are applied automatically when creating Stripe Checkout.
        </p>

        <p v-if="billingError" aria-live="polite" :class="errorBannerClass">
          {{ billingError }}
        </p>
        <p v-else-if="billingSuccess" aria-live="polite" :class="successBannerClass">
          {{ billingSuccess }}
        </p>
      </div>
    </CardContent>
  </Card>
</template>
