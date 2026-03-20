import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, onMounted, ref, watch } from "vue";

import { useIntlLocale } from "@/composables/use-intl-locale";
import { dashboardQueryKeys } from "@/lib/dashboard-query-keys";

type SubscriptionPlanKey = "basic" | "pro" | "max";
type SubscriptionBillingInterval = "monthly" | "yearly";

type StripeSessionRedirectResponse = {
  url?: string;
  redirect?: boolean;
  id?: string;
  object?: string;
  client_secret?: string | null;
};

type BillingPromotionPreviewResponse = {
  valid: boolean;
  code: string | null;
  baseAmount: number;
  finalAmount: number;
  currency: string;
  discountPercent: number | null;
  amountOff: number | null;
  reason: string | null;
};

type SubscriptionPlanOption = {
  key: SubscriptionPlanKey;
  label: string;
  monthlyLabel: string;
  yearlyLabel: string;
  monthlyAmount: number;
  yearlyAmount: number;
  note: string;
};

const subscriptionPlanOptions: SubscriptionPlanOption[] = [
  {
    key: "basic",
    label: "Basic",
    monthlyLabel: "$5.99 / month",
    yearlyLabel: "$59.99 / year",
    monthlyAmount: 5.99,
    yearlyAmount: 59.99,
    note: "Entry-level for personal testing.",
  },
  {
    key: "pro",
    label: "Pro",
    monthlyLabel: "$9.99 / month",
    yearlyLabel: "$99.00 / year",
    monthlyAmount: 9.99,
    yearlyAmount: 99.0,
    note: "Best fit for regular AI summarization.",
  },
  {
    key: "max",
    label: "Max",
    monthlyLabel: "$19.99 / month",
    yearlyLabel: "$199.00 / year",
    monthlyAmount: 19.99,
    yearlyAmount: 199.0,
    note: "Advanced usage with highest quota.",
  },
];

const defaultSubscriptionPlanOption =
  subscriptionPlanOptions.find((plan) => plan.key === "pro") ??
  subscriptionPlanOptions[0];

if (!defaultSubscriptionPlanOption) {
  throw new Error("Subscription plan options must not be empty.");
}

export const useUserBilling = () => {
  const { $orpc } = useNuxtApp();
  const intlLocale = useIntlLocale();
  const config = useRuntimeConfig();
  const route = useRoute();
  const queryClient = useQueryClient();
  const authRequestHeaders = import.meta.server
    ? useRequestHeaders(["cookie"])
    : undefined;

  const billingError = ref("");
  const billingSuccess = ref("");
  const billingInterval = ref<SubscriptionBillingInterval>("monthly");
  const selectedPlan = ref<SubscriptionPlanKey>("pro");
  const promotionCodeInput = ref("");
  const appliedPromotionCode = ref<string | null>(null);
  const promotionError = ref("");
  const promotionSuccess = ref("");
  const promotionPreview = ref<BillingPromotionPreviewResponse | null>(null);

  const subscriptionQuery = useQuery(
    $orpc.subscription.getCurrent.queryOptions({
      queryKey: dashboardQueryKeys.subscription.current(),
    })
  );

  const subscriptionRecord = computed(() => subscriptionQuery.data.value ?? null);
  const hasPaidSubscription = computed(() =>
    ["basic", "pro", "max"].includes(subscriptionRecord.value?.tier ?? "")
  );
  const hasPendingCancellation = computed(
    () =>
      Boolean(subscriptionRecord.value?.cancelAtPeriodEnd) ||
      Boolean(subscriptionRecord.value?.cancelAt)
  );

  const selectedPlanDetails = computed(
    () =>
      subscriptionPlanOptions.find((plan) => plan.key === selectedPlan.value) ??
      defaultSubscriptionPlanOption
  );

  const selectedPlanBaseAmount = computed(() =>
    billingInterval.value === "yearly"
      ? Math.round(selectedPlanDetails.value.yearlyAmount * 100)
      : Math.round(selectedPlanDetails.value.monthlyAmount * 100)
  );
  const selectedPlanCurrency = computed(
    () => promotionPreview.value?.currency.toUpperCase() ?? "USD"
  );
  const selectedPlanFinalAmount = computed(
    () => promotionPreview.value?.finalAmount ?? selectedPlanBaseAmount.value
  );
  const hasDiscountedPlanPrice = computed(
    () => selectedPlanFinalAmount.value < selectedPlanBaseAmount.value
  );

  const invalidateSubscriptionQueries = async () => {
    await queryClient.invalidateQueries({
      queryKey: dashboardQueryKeys.subscription.current(),
    });
  };

  const getBillingReturnUrl = () =>
    import.meta.client
      ? `${window.location.origin}/billing`
      : `${config.public.serverUrl}/billing`;

  const toErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error) {
      return error.message;
    }

    if (
      typeof error === "object" &&
      error &&
      "data" in error &&
      typeof (error as { data?: { message?: string } }).data?.message === "string"
    ) {
      return (error as { data: { message: string } }).data.message;
    }

    return fallback;
  };

  const normalizePromotionCode = (value: string) => value.trim().toUpperCase();

  const formatCurrencyAmount = (amountInMinor: number, currency: string) =>
    new Intl.NumberFormat(intlLocale.value, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(amountInMinor / 100);

  const formatDate = (value: Date | string | null | undefined) => {
    if (!value) {
      return "No expiration";
    }

    const date = value instanceof Date ? value : new Date(value);
    return new Intl.DateTimeFormat(intlLocale.value, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(date);
  };

  const clearPromotionState = () => {
    appliedPromotionCode.value = null;
    promotionPreview.value = null;
    promotionError.value = "";
    promotionSuccess.value = "";
  };

  const callBillingApi = async <T>(
    path: string,
    body: Record<string, unknown>,
    options?: {
      promotionCode?: string | null;
    }
  ) => {
    const requestHeaders: Record<string, string> = {
      ...(authRequestHeaders ?? {}),
    };

    if (options?.promotionCode) {
      requestHeaders["X-NewsFlow-Promo-Code"] = options.promotionCode;
    }

    return $fetch<T>(`${config.public.serverUrl}/api/auth${path}`, {
      method: "POST",
      body,
      credentials: "include",
      headers: requestHeaders,
    });
  };

  const callBillingPreviewApi = async (body: Record<string, unknown>) => {
    return $fetch<BillingPromotionPreviewResponse>(
      `${config.public.serverUrl}/api/billing/promotion/preview`,
      {
        method: "POST",
        body,
        credentials: "include",
        headers: authRequestHeaders,
      }
    );
  };

  const applyPromotionCodeMutation = useMutation({
    mutationFn: async (code: string) => {
      return callBillingPreviewApi({
        plan: selectedPlan.value,
        annual: billingInterval.value === "yearly",
        code,
      });
    },
    onSuccess: (result, code) => {
      if (!result.valid || !result.code) {
        clearPromotionState();
        promotionCodeInput.value = normalizePromotionCode(code);
        promotionError.value = result.reason ?? "Voucher code is not valid.";
        return;
      }

      appliedPromotionCode.value = result.code;
      promotionPreview.value = result;
      promotionError.value = "";
      promotionSuccess.value = `Voucher ${result.code} applied successfully.`;
    },
    onError: (error) => {
      clearPromotionState();
      promotionError.value = toErrorMessage(
        error,
        "Unable to validate voucher code."
      );
    },
  });

  const handleApplyPromotionCode = async () => {
    const code = normalizePromotionCode(promotionCodeInput.value);

    promotionError.value = "";
    promotionSuccess.value = "";

    if (!code) {
      clearPromotionState();
      return;
    }

    promotionCodeInput.value = code;

    try {
      await applyPromotionCodeMutation.mutateAsync(code);
    } catch {
      // Error is already mapped in mutation onError.
    }
  };

  const handleClearPromotionCode = () => {
    promotionCodeInput.value = "";
    clearPromotionState();
  };

  const refreshAppliedPromotionCode = async () => {
    const code = appliedPromotionCode.value;
    if (!code) {
      return;
    }

    try {
      await applyPromotionCodeMutation.mutateAsync(code);
    } catch {
      // Error is already mapped in mutation onError.
    }
  };

  watch([selectedPlan, billingInterval], () => {
    void refreshAppliedPromotionCode();
  });

  watch(promotionCodeInput, (value) => {
    const normalizedCode = normalizePromotionCode(value);
    if (!appliedPromotionCode.value) {
      return;
    }

    if (normalizedCode === appliedPromotionCode.value) {
      return;
    }

    clearPromotionState();
    if (!normalizedCode) {
      promotionError.value = "";
    }
  });

  watch(appliedPromotionCode, (value) => {
    if (value) {
      return;
    }

    promotionPreview.value = null;
  });

  watch(selectedPlanBaseAmount, (amount) => {
    if (promotionPreview.value && promotionPreview.value.baseAmount !== amount) {
      promotionPreview.value = null;
    }
  });

  const openBillingUrl = async (url?: string) => {
    if (!url) {
      return;
    }

    await navigateTo(url, { external: true });
  };

  const upgradeSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const returnUrl = getBillingReturnUrl();
      return callBillingApi<StripeSessionRedirectResponse>(
        "/subscription/upgrade",
        {
          plan: selectedPlan.value,
          annual: billingInterval.value === "yearly",
          successUrl: returnUrl,
          cancelUrl: returnUrl,
          returnUrl,
          disableRedirect: true,
        },
        {
          promotionCode: appliedPromotionCode.value,
        }
      );
    },
    onSuccess: async (data) => {
      billingError.value = "";
      billingSuccess.value = "Checkout session created. Redirecting to Stripe...";
      await invalidateSubscriptionQueries();
      await openBillingUrl(data.url);
    },
    onError: (error) => {
      billingSuccess.value = "";
      billingError.value = toErrorMessage(
        error,
        "Unable to create checkout session."
      );
    },
  });

  const billingPortalMutation = useMutation({
    mutationFn: async () => {
      return callBillingApi<StripeSessionRedirectResponse>(
        "/subscription/billing-portal",
        {
          returnUrl: getBillingReturnUrl(),
          disableRedirect: true,
        }
      );
    },
    onSuccess: async (data) => {
      billingError.value = "";
      billingSuccess.value = "Opening Stripe billing portal...";
      await openBillingUrl(data.url);
    },
    onError: (error) => {
      billingSuccess.value = "";
      billingError.value = toErrorMessage(error, "Unable to open billing portal.");
    },
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return callBillingApi<StripeSessionRedirectResponse>("/subscription/cancel", {
        returnUrl: getBillingReturnUrl(),
        disableRedirect: true,
      });
    },
    onSuccess: async () => {
      billingError.value = "";
      billingSuccess.value =
        "Subscription will cancel at the end of the current billing period.";
      await invalidateSubscriptionQueries();
    },
    onError: (error) => {
      billingSuccess.value = "";
      billingError.value = toErrorMessage(
        error,
        "Unable to open cancellation flow."
      );
    },
  });

  const restoreSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return callBillingApi("/subscription/restore", {});
    },
    onSuccess: async () => {
      billingError.value = "";
      billingSuccess.value = "Subscription cancellation has been removed.";
      await invalidateSubscriptionQueries();
    },
    onError: (error) => {
      billingSuccess.value = "";
      billingError.value = toErrorMessage(error, "Unable to restore subscription.");
    },
  });

  const isBillingActionPending = computed(
    () =>
      upgradeSubscriptionMutation.isPending.value ||
      applyPromotionCodeMutation.isPending.value ||
      billingPortalMutation.isPending.value ||
      cancelSubscriptionMutation.isPending.value ||
      restoreSubscriptionMutation.isPending.value
  );

  const handleStartCheckout = async () => {
    billingError.value = "";
    billingSuccess.value = "";

    const normalizedCode = normalizePromotionCode(promotionCodeInput.value);
    if (normalizedCode && normalizedCode !== appliedPromotionCode.value) {
      billingError.value = "Apply a valid voucher code before checkout.";
      return;
    }

    try {
      await upgradeSubscriptionMutation.mutateAsync();
    } catch {
      // Error is already mapped in mutation onError.
    }
  };

  const handleOpenBillingPortal = async () => {
    billingError.value = "";
    billingSuccess.value = "";
    try {
      await billingPortalMutation.mutateAsync();
    } catch {
      // Error is already mapped in mutation onError.
    }
  };

  const handleCancelSubscription = async () => {
    billingError.value = "";
    billingSuccess.value = "";
    try {
      await cancelSubscriptionMutation.mutateAsync();
    } catch {
      // Error is already mapped in mutation onError.
    }
  };

  const handleRestoreSubscription = async () => {
    billingError.value = "";
    billingSuccess.value = "";
    try {
      await restoreSubscriptionMutation.mutateAsync();
    } catch {
      // Error is already mapped in mutation onError.
    }
  };

  onMounted(() => {
    const queryPlan = String(route.query.plan ?? "").toLowerCase();
    const queryInterval = String(route.query.interval ?? "").toLowerCase();

    if (queryPlan === "basic" || queryPlan === "pro" || queryPlan === "max") {
      selectedPlan.value = queryPlan;
    }

    if (queryInterval === "monthly" || queryInterval === "yearly") {
      billingInterval.value = queryInterval;
    }
  });

  watch(
    () => subscriptionRecord.value?.tier,
    (tier) => {
      if (tier === "basic" || tier === "pro" || tier === "max") {
        selectedPlan.value = tier;
      }
    }
  );

  return {
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
  };
};
