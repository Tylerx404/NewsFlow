<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, onMounted, reactive, ref, watch } from "vue";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { dashboardQueryKeys } from "@/lib/dashboard-query-keys";
import { useIntlLocale } from "@/composables/use-intl-locale";

definePageMeta({
  layout: "dashboard",
  middleware: "dashboard-auth",
  title: "Personal Settings",
});

type UserSession = {
  token: string;
  createdAt: Date | string;
  expiresAt: Date | string;
  userAgent?: string | null;
  ipAddress?: string | null;
};

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

const { $authClient, $orpc } = useNuxtApp();
const intlLocale = useIntlLocale();
const config = useRuntimeConfig();
const route = useRoute();
const authRequestHeaders = import.meta.server
  ? useRequestHeaders(["cookie"])
  : undefined;
const queryClient = useQueryClient();

const profileForm = reactive({
  name: "",
  image: "",
});
const profileError = ref("");
const profileSuccess = ref("");
const avatarUploadError = ref("");
const avatarInputRef = ref<HTMLInputElement | null>(null);

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

const passwordForm = reactive({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
  revokeOtherSessions: true,
});
const passwordError = ref("");
const passwordSuccess = ref("");

const sessionActionError = ref("");
const sessionActionSuccess = ref("");
const sessionToRevokeToken = ref<string | null>(null);
const isRevokeSessionDialogOpen = ref(false);
const isRevokeOtherDialogOpen = ref(false);
const billingError = ref("");
const billingSuccess = ref("");
const billingInterval = ref<SubscriptionBillingInterval>("monthly");
const selectedPlan = ref<SubscriptionPlanKey>("pro");
const promotionCodeInput = ref("");
const appliedPromotionCode = ref<string | null>(null);
const promotionError = ref("");
const promotionSuccess = ref("");
const promotionPreview = ref<BillingPromotionPreviewResponse | null>(null);

const errorBannerClass =
  "rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive";
const successBannerClass =
  "rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300";

const sessionQuery = useQuery({
  queryKey: dashboardQueryKeys.auth.session(),
  queryFn: async () => {
    const { data, error } = await $authClient.getSession();
    if (error) {
      throw new Error(error.message || "Unable to load session.");
    }
    return data;
  },
});

const sessionsQuery = useQuery({
  queryKey: dashboardQueryKeys.auth.sessions(),
  queryFn: async () => {
    const { data, error } = await $authClient.listSessions();
    if (error) {
      throw new Error(error.message || "Unable to load sessions.");
    }

    return (data ?? []) as UserSession[];
  },
});

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

watch(
  () => sessionQuery.data.value?.user,
  (user) => {
    if (!user) {
      return;
    }

    profileForm.name = user.name ?? "";
    profileForm.image = user.image ?? "";
  },
  { immediate: true }
);

const currentSessionToken = computed(
  () => sessionQuery.data.value?.session?.token ?? ""
);

const activeSessions = computed(() => sessionsQuery.data.value ?? []);

const hasCurrentSessionInList = computed(() =>
  activeSessions.value.some((session) => session.token === currentSessionToken.value)
);

const otherSessionCount = computed(() =>
  Math.max(activeSessions.value.length - (hasCurrentSessionInList.value ? 1 : 0), 0)
);

const currentSession = computed(() =>
  activeSessions.value.find((session) => session.token === currentSessionToken.value) ?? null
);

const selectedSessionForRevoke = computed(() =>
  activeSessions.value.find((session) => session.token === sessionToRevokeToken.value) ?? null
);

const avatarFallback = computed(() => {
  const trimmed = profileForm.name.trim();
  if (!trimmed) {
    return "U";
  }

  const parts = trimmed.split(/\s+/);
  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "U";
});

const invalidateAuthQueries = async () => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: dashboardQueryKeys.auth.session(),
    }),
    queryClient.invalidateQueries({
      queryKey: dashboardQueryKeys.auth.sessionSummary(),
    }),
    queryClient.invalidateQueries({
      queryKey: dashboardQueryKeys.auth.sessions(),
    }),
  ]);
};

const invalidateSubscriptionQueries = async () => {
  await queryClient.invalidateQueries({
    queryKey: dashboardQueryKeys.subscription.current(),
  });
};

const getBillingReturnUrl = () =>
  import.meta.client
    ? `${window.location.origin}/settings/personal`
    : `${config.public.serverUrl}/settings/personal`;

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

const callBillingPreviewApi = async (
  body: Record<string, unknown>
) => {
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
    billingError.value = toErrorMessage(error, "Unable to create checkout session.");
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
    billingSuccess.value = "Subscription will cancel at the end of the current billing period.";
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

const profileMutation = useMutation({
  mutationFn: async () => {
    const name = profileForm.name.trim();
    const image = profileForm.image.trim();

    if (!name) {
      throw new Error("Name is required.");
    }

    const { error } = await $authClient.updateUser({
      name,
      image: image || null,
    });

    if (error) {
      throw new Error(error.message || "Unable to update profile.");
    }
  },
  onSuccess: async () => {
    profileError.value = "";
    profileSuccess.value = "Profile updated successfully.";
    avatarUploadError.value = "";
    await invalidateAuthQueries();
  },
  onError: (error) => {
    profileSuccess.value = "";
    profileError.value =
      error instanceof Error ? error.message : "Unable to update profile.";
  },
});

const handleAvatarPick = () => {
  avatarInputRef.value?.click();
};

const handleAvatarUpload = async (event: Event) => {
  avatarUploadError.value = "";

  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    avatarUploadError.value = "Please choose an image file.";
    input.value = "";
    return;
  }

  if (file.size > MAX_AVATAR_BYTES) {
    avatarUploadError.value = "Image size must be 2MB or smaller.";
    input.value = "";
    return;
  }

  const reader = new FileReader();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Unable to read image."));
    };
    reader.onerror = () => reject(new Error("Unable to read image."));
    reader.readAsDataURL(file);
  }).catch((error) => {
    avatarUploadError.value =
      error instanceof Error ? error.message : "Unable to read image.";
    return "";
  });

  if (dataUrl) {
    profileForm.image = dataUrl;
  }

  input.value = "";
};

const clearAvatar = () => {
  avatarUploadError.value = "";
  profileForm.image = "";
};

const passwordMutation = useMutation({
  mutationFn: async () => {
    const currentPassword = passwordForm.currentPassword.trim();
    const newPassword = passwordForm.newPassword.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();

    if (!currentPassword || !newPassword) {
      throw new Error("Current password and new password are required.");
    }

    if (newPassword !== confirmPassword) {
      throw new Error("New password and confirm password must match.");
    }

    const { error } = await $authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: passwordForm.revokeOtherSessions,
    });

    if (error) {
      throw new Error(error.message || "Unable to update password.");
    }
  },
  onSuccess: async () => {
    passwordError.value = "";
    passwordSuccess.value = "Password updated successfully.";
    passwordForm.currentPassword = "";
    passwordForm.newPassword = "";
    passwordForm.confirmPassword = "";
    await invalidateAuthQueries();
  },
  onError: (error) => {
    passwordSuccess.value = "";
    passwordError.value =
      error instanceof Error ? error.message : "Unable to update password.";
  },
});

const revokeSessionMutation = useMutation({
  mutationFn: async (token: string) => {
    const { error } = await $authClient.revokeSession({ token });

    if (error) {
      throw new Error(error.message || "Unable to revoke session.");
    }
  },
  onSuccess: async () => {
    sessionActionError.value = "";
    sessionActionSuccess.value = "Session revoked successfully.";
    await invalidateAuthQueries();
  },
  onError: (error) => {
    sessionActionSuccess.value = "";
    sessionActionError.value =
      error instanceof Error ? error.message : "Unable to revoke session.";
  },
});

const revokeOtherSessionsMutation = useMutation({
  mutationFn: async () => {
    const { error } = await $authClient.revokeOtherSessions();

    if (error) {
      throw new Error(error.message || "Unable to revoke other sessions.");
    }
  },
  onSuccess: async () => {
    sessionActionError.value = "";
    sessionActionSuccess.value = "Other sessions revoked successfully.";
    await invalidateAuthQueries();
  },
  onError: (error) => {
    sessionActionSuccess.value = "";
    sessionActionError.value =
      error instanceof Error
        ? error.message
        : "Unable to revoke other sessions.";
  },
});

const handleSaveProfile = async () => {
  profileError.value = "";
  profileSuccess.value = "";

  try {
    await profileMutation.mutateAsync();
  } catch {
    // Error is already mapped in mutation onError.
  }
};

const handleChangePassword = async () => {
  passwordError.value = "";
  passwordSuccess.value = "";

  try {
    await passwordMutation.mutateAsync();
  } catch {
    // Error is already mapped in mutation onError.
  }
};

const handleRevokeSession = async (token: string) => {
  sessionActionError.value = "";
  sessionActionSuccess.value = "";

  if (token === currentSessionToken.value) {
    return false;
  }

  try {
    await revokeSessionMutation.mutateAsync(token);
    return true;
  } catch {
    // Error is already mapped in mutation onError.
    return false;
  }
};

const handleRevokeOtherSessions = async () => {
  sessionActionError.value = "";
  sessionActionSuccess.value = "";

  try {
    await revokeOtherSessionsMutation.mutateAsync();
    return true;
  } catch {
    // Error is already mapped in mutation onError.
    return false;
  }
};

const openRevokeSessionDialog = (token: string) => {
  if (token === currentSessionToken.value) {
    return;
  }

  sessionToRevokeToken.value = token;
  isRevokeSessionDialogOpen.value = true;
};

const handleRevokeSessionDialogToggle = (open: boolean) => {
  isRevokeSessionDialogOpen.value = open;

  if (!open) {
    sessionToRevokeToken.value = null;
  }
};

const confirmRevokeSession = async () => {
  if (!sessionToRevokeToken.value) {
    return;
  }

  const success = await handleRevokeSession(sessionToRevokeToken.value);
  if (!success) {
    return;
  }

  handleRevokeSessionDialogToggle(false);
};

const confirmRevokeOtherSessions = async () => {
  const success = await handleRevokeOtherSessions();
  if (success) {
    isRevokeOtherDialogOpen.value = false;
  }
};

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

const formatSessionToken = (token: string) => {
  if (token.length < 16) {
    return token;
  }

  return `${token.slice(0, 8)}...${token.slice(-6)}`;
};

onMounted(() => {
  const queryPlan = String(route.query.plan ?? "").toLowerCase();
  const queryInterval = String(route.query.interval ?? "").toLowerCase();

  if (
    queryPlan === "basic" ||
    queryPlan === "pro" ||
    queryPlan === "max"
  ) {
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
</script>

<template>
  <div class="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div class="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Profile</CardTitle>
            <CardDescription>
              Keep your public identity up to date. Name and avatar are used across the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <p v-if="sessionQuery.isLoading.value" class="text-sm text-muted-foreground">
              Loading profile...
            </p>
            <p v-else-if="sessionQuery.error.value" :class="errorBannerClass">
              {{
                sessionQuery.error.value instanceof Error
                  ? sessionQuery.error.value.message
                  : "Unable to load profile."
              }}
            </p>

            <div v-else-if="sessionQuery.data.value?.user" class="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
              <div class="rounded-lg border bg-muted/20 p-4">
                <input
                  ref="avatarInputRef"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleAvatarUpload"
                >

                <div class="flex flex-col items-center gap-4 text-center">
                  <button
                    type="button"
                    class="group relative inline-flex size-28 items-center justify-center rounded-full border-2 border-dashed border-border/70 bg-background p-2 transition hover:border-primary/70"
                    aria-label="Change profile photo"
                    @click="handleAvatarPick"
                  >
                    <Avatar class="size-full border bg-card shadow-sm">
                      <AvatarImage v-if="profileForm.image" :src="profileForm.image" alt="Avatar preview" />
                      <AvatarFallback class="text-lg font-semibold">
                        {{ avatarFallback }}
                      </AvatarFallback>
                    </Avatar>
                    <span class="pointer-events-none absolute -bottom-1 rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition group-hover:text-foreground">
                      Change
                    </span>
                  </button>

                  <p class="text-sm font-medium">
                    Upload profile photo
                  </p>

                  <div class="grid w-full gap-2">
                    <Button type="button" variant="secondary" class="w-full" @click="handleAvatarPick">
                      {{ profileForm.image ? "Replace photo" : "Choose photo" }}
                    </Button>
                    <Button
                      v-if="profileForm.image"
                      type="button"
                      variant="ghost"
                      class="w-full text-muted-foreground hover:text-foreground"
                      @click="clearAvatar"
                    >
                      Remove current photo
                    </Button>
                  </div>

                  <p v-if="avatarUploadError" aria-live="polite" class="w-full rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-left text-xs text-destructive">
                    {{ avatarUploadError }}
                  </p>
                </div>
              </div>

              <div class="space-y-4">
                <div class="space-y-2">
                  <label class="text-sm font-medium" for="profile-email">Email</label>
                  <Input
                    id="profile-email"
                    :model-value="sessionQuery.data.value.user.email"
                    readonly
                    disabled
                  />
                </div>

                <div class="space-y-2">
                  <label class="text-sm font-medium" for="profile-name">Name</label>
                  <Input id="profile-name" v-model="profileForm.name" />
                </div>

                <p v-if="profileError" aria-live="polite" :class="errorBannerClass">
                  {{ profileError }}
                </p>
                <p v-else-if="profileSuccess" aria-live="polite" :class="successBannerClass">
                  {{ profileSuccess }}
                </p>

                <div class="flex justify-end">
                  <Button
                    :disabled="profileMutation.isPending.value"
                    @click="handleSaveProfile"
                  >
                    {{ profileMutation.isPending.value ? "Saving..." : "Save profile" }}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Password & Access</CardTitle>
            <CardDescription>
              Update your password regularly to keep your account secure.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <label class="text-sm font-medium" for="current-password">Current password</label>
              <Input
                id="current-password"
                v-model="passwordForm.currentPassword"
                type="password"
                autocomplete="current-password"
              />
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div class="space-y-2">
                <label class="text-sm font-medium" for="new-password">New password</label>
                <Input
                  id="new-password"
                  v-model="passwordForm.newPassword"
                  type="password"
                  autocomplete="new-password"
                />
              </div>

              <div class="space-y-2">
                <label class="text-sm font-medium" for="confirm-password">Confirm new password</label>
                <Input
                  id="confirm-password"
                  v-model="passwordForm.confirmPassword"
                  type="password"
                  autocomplete="new-password"
                />
              </div>
            </div>

            <label
              for="revoke-other-sessions-on-password-change"
              class="flex items-start gap-3 rounded-md border p-3 text-sm"
            >
              <Checkbox
                id="revoke-other-sessions-on-password-change"
                v-model="passwordForm.revokeOtherSessions"
                class="mt-0.5"
              />
              <span>Revoke other active sessions after password change</span>
            </label>

            <p v-if="passwordError" aria-live="polite" :class="errorBannerClass">
              {{ passwordError }}
            </p>
            <p v-else-if="passwordSuccess" aria-live="polite" :class="successBannerClass">
              {{ passwordSuccess }}
            </p>

            <div class="flex justify-end">
              <Button
                :disabled="passwordMutation.isPending.value"
                @click="handleChangePassword"
              >
                {{
                  passwordMutation.isPending.value
                    ? "Updating..."
                    : "Update password"
                }}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Sessions</CardTitle>
            <CardDescription>
              Review devices signed in to your account and revoke any session you do not trust.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <p v-if="sessionsQuery.isLoading.value" class="text-sm text-muted-foreground">
              Loading sessions...
            </p>
            <p v-else-if="sessionsQuery.error.value" :class="errorBannerClass">
              {{
                sessionsQuery.error.value instanceof Error
                  ? sessionsQuery.error.value.message
                  : "Unable to load sessions."
              }}
            </p>

            <div v-else-if="activeSessions.length > 0" class="space-y-3">
              <div
                v-for="session in activeSessions"
                :key="session.token"
                class="space-y-3 rounded-md border p-3"
              >
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div class="space-y-1">
                    <p class="break-all text-sm font-medium sm:break-normal">
                      {{ formatSessionToken(session.token) }}
                    </p>

                    <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge
                        v-if="session.token === currentSessionToken"
                        variant="outline"
                      >
                        Current device
                      </Badge>
                      <span>Created: {{ formatDate(session.createdAt) }}</span>
                      <span>Expires: {{ formatDate(session.expiresAt) }}</span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    :disabled="session.token === currentSessionToken || revokeSessionMutation.isPending.value"
                    :aria-label="`Revoke session ${formatSessionToken(session.token)}`"
                    @click="openRevokeSessionDialog(session.token)"
                  >
                    Revoke
                  </Button>
                </div>

                <div class="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                  <p>User agent: {{ session.userAgent || "Unknown" }}</p>
                  <p>IP address: {{ session.ipAddress || "Unknown" }}</p>
                </div>
              </div>
            </div>
            <p v-else class="text-sm text-muted-foreground">
              No active sessions found.
            </p>

            <p v-if="sessionActionError" aria-live="polite" :class="errorBannerClass">
              {{ sessionActionError }}
            </p>
            <p v-else-if="sessionActionSuccess" aria-live="polite" :class="successBannerClass">
              {{ sessionActionSuccess }}
            </p>
          </CardContent>
        </Card>
      </div>

      <div class="space-y-6 xl:sticky xl:top-6 xl:self-start">
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

        <Card>
          <CardHeader>
            <CardTitle>Security Summary</CardTitle>
            <CardDescription>
              Quick checks and actions for account safety.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2 rounded-md border p-3 text-sm">
              <div class="flex items-center justify-between gap-3">
                <span class="text-muted-foreground">Active sessions</span>
                <span class="font-medium">{{ activeSessions.length }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-muted-foreground">Other sessions</span>
                <span class="font-medium">{{ otherSessionCount }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-muted-foreground">Current expires</span>
                <span class="font-medium">
                  {{ formatDate(currentSession?.expiresAt) }}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              class="w-full"
              :disabled="otherSessionCount === 0 || revokeOtherSessionsMutation.isPending.value"
              @click="isRevokeOtherDialogOpen = true"
            >
              {{
                revokeOtherSessionsMutation.isPending.value
                  ? "Revoking..."
                  : "Revoke other sessions"
              }}
            </Button>

            <p class="text-xs text-muted-foreground">
              Revoke all sessions except the one currently in use.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>

    <AlertDialog
      :open="isRevokeSessionDialogOpen"
      @update:open="handleRevokeSessionDialogToggle"
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke this session?</AlertDialogTitle>
          <AlertDialogDescription>
            This device will be signed out immediately.
            <span v-if="selectedSessionForRevoke">
              Token: {{ formatSessionToken(selectedSessionForRevoke.token) }}.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="revokeSessionMutation.isPending.value">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            :disabled="revokeSessionMutation.isPending.value"
            @click="confirmRevokeSession"
          >
            {{ revokeSessionMutation.isPending.value ? "Revoking..." : "Revoke session" }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog
      :open="isRevokeOtherDialogOpen"
      @update:open="(open) => (isRevokeOtherDialogOpen = open)"
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke all other sessions?</AlertDialogTitle>
          <AlertDialogDescription>
            This keeps only your current device signed in.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="revokeOtherSessionsMutation.isPending.value">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            :disabled="revokeOtherSessionsMutation.isPending.value"
            @click="confirmRevokeOtherSessions"
          >
            {{
              revokeOtherSessionsMutation.isPending.value
                ? "Revoking..."
                : "Revoke other sessions"
            }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
</template>
