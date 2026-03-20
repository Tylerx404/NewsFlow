<script setup lang="ts">
import { Check } from "lucide-vue-next";
import { computed, onMounted, ref } from "vue";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

definePageMeta({ layout: "public" });

type BillingInterval = "monthly" | "yearly";
type PlanKey = "basic" | "pro" | "max";

type PricingPlan = {
  key: PlanKey;
  monthlyPrice: number;
  yearlyPrice: number;
  highlight?: boolean;
  featureKeys: string[];
};

const plans: PricingPlan[] = [
  {
    key: "basic",
    monthlyPrice: 5.99,
    yearlyPrice: 59.99,
    featureKeys: [
      "coreRss",
      "aiOccasional",
      "instantAccess",
    ],
  },
  {
    key: "pro",
    monthlyPrice: 9.99,
    yearlyPrice: 99.0,
    highlight: true,
    featureKeys: [
      "everythingBasic",
      "higherAiLimits",
      "instantAccess",
    ],
  },
  {
    key: "max",
    monthlyPrice: 19.99,
    yearlyPrice: 199.0,
    featureKeys: [
      "everythingPro",
      "highestAiCapacity",
      "prioritySupport",
    ],
  },
];

const { $authClient } = useNuxtApp();
const { t } = useI18n();
const intlLocale = useIntlLocale();
const billingInterval = ref<BillingInterval>("monthly");
const hasSession = ref(false);
const billingIntervalIndex = computed(() =>
  billingInterval.value === "monthly" ? 0 : 1
);

const formatPrice = (value: number) =>
  new Intl.NumberFormat(intlLocale.value, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);

const displayedPlans = computed(() =>
  plans.map((plan) => {
    const activePrice =
      billingInterval.value === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
    const monthlyFromYearly = plan.yearlyPrice / 12;
    const yearlyDiscount = Math.round(
      ((plan.monthlyPrice * 12 - plan.yearlyPrice) / (plan.monthlyPrice * 12)) * 100
    );

    return {
      ...plan,
      label: t(`public.pricing.plans.${plan.key}.label`),
      subtitle: t(`public.pricing.plans.${plan.key}.subtitle`),
      features: plan.featureKeys.map((featureKey) =>
        t(`public.pricing.plans.${plan.key}.features.${featureKey}`)
      ),
      activePrice,
      monthlyFromYearly,
      yearlyDiscount,
    };
  })
);

const resolvePlanHref = (planKey: PlanKey) =>
  hasSession.value
    ? `/billing?plan=${planKey}&interval=${billingInterval.value}`
    : "/signup";

const resolvePlanActionLabel = () =>
  hasSession.value
    ? t("public.pricing.actions.choosePlan")
    : t("public.pricing.actions.createAccount");

const setBillingInterval = (interval: BillingInterval) => {
  if (billingInterval.value === interval) {
    return;
  }
  billingInterval.value = interval;
};

onMounted(async () => {
  const { data } = await $authClient.getSession();
  hasSession.value = Boolean(data?.session);
});
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-background">
    <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,hsl(var(--primary)/0.12),transparent_28%),radial-gradient(circle_at_85%_10%,hsl(var(--muted-foreground)/0.08),transparent_24%)]" />

    <div class="relative mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-14">
      <section class="space-y-6 text-center">
        <Badge variant="outline" class="rounded-full px-4 py-1">
          {{ t("public.pricing.badge") }}
        </Badge>
        <div class="space-y-3">
          <h1 class="text-3xl font-semibold tracking-tight md:text-5xl">
            {{ t("public.pricing.title") }}
          </h1>
          <p class="mx-auto max-w-2xl text-sm text-muted-foreground md:text-base">
            {{ t("public.pricing.subtitle") }}
          </p>
        </div>

        <div class="mx-auto w-full max-w-sm">
          <div class="relative grid grid-cols-2 rounded-xl border bg-muted/40 p-1">
            <span
              class="pointer-events-none absolute bottom-1 top-1 w-[calc(50%-0.25rem)] rounded-lg bg-background shadow-sm transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              :style="{ transform: `translateX(${billingIntervalIndex * 100}%)` }"
            />
            <button
              type="button"
              class="relative z-10 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200"
              :class="billingInterval === 'monthly' ? 'text-foreground' : 'text-muted-foreground'"
              @click="setBillingInterval('monthly')"
            >
              {{ t("public.pricing.billing.monthly") }}
            </button>
            <button
              type="button"
              class="relative z-10 rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200"
              :class="billingInterval === 'yearly' ? 'text-foreground' : 'text-muted-foreground'"
              @click="setBillingInterval('yearly')"
            >
              {{ t("public.pricing.billing.yearly") }}
            </button>
          </div>
        </div>
      </section>

      <section class="grid gap-6 lg:grid-cols-3">
        <Card
          v-for="plan in displayedPlans"
          :key="plan.key"
          class="group relative flex h-full flex-col overflow-hidden border transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-lg"
          :class="
            plan.highlight
              ? 'border-primary/45 bg-card shadow-xl shadow-primary/10 lg:-translate-y-2'
              : 'border-border/70 bg-card/95'
          "
        >
          <div
            v-if="plan.highlight"
            class="absolute right-4 top-4 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-primary-foreground"
          >
            {{ t("public.pricing.bestValue") }}
          </div>

          <CardHeader class="space-y-4">
            <div class="space-y-2">
              <CardTitle class="text-2xl">
                {{ plan.label }}
              </CardTitle>
              <CardDescription class="min-h-12">
                {{ plan.subtitle }}
              </CardDescription>
            </div>

            <div class="rounded-lg border bg-muted/15 p-3">
              <Transition name="price-swap" mode="out-in">
                <p :key="`${plan.key}-${billingInterval}-price`" class="text-3xl font-semibold tracking-tight">
                  {{ formatPrice(plan.activePrice) }}
                  <span class="ml-1 text-base font-medium text-muted-foreground">
                    /{{ billingInterval === "yearly" ? t("public.pricing.suffix.year") : t("public.pricing.suffix.month") }}
                  </span>
                </p>
              </Transition>

              <Transition name="meta-swap" mode="out-in">
                <p
                  :key="`${plan.key}-${billingInterval}-meta`"
                  class="mt-1 text-xs text-muted-foreground"
                >
                  <span v-if="billingInterval === 'monthly'">{{ t("public.pricing.meta.monthly") }}</span>
                  <span v-else>{{ t("public.pricing.meta.yearly", { price: formatPrice(plan.monthlyFromYearly) }) }}</span>
                </p>
              </Transition>

              <Transition name="meta-swap" mode="out-in">
                <p
                  v-if="billingInterval === 'yearly'"
                  :key="`${plan.key}-yearly-discount`"
                  class="mt-2 text-xs font-medium text-emerald-600 dark:text-emerald-400"
                >
                  {{ t("public.pricing.meta.discount", { percent: plan.yearlyDiscount }) }}
                </p>
              </Transition>
            </div>
          </CardHeader>

          <CardContent class="flex-1">
            <ul class="space-y-2.5 text-sm">
              <li
                v-for="feature in plan.features"
                :key="feature"
                class="flex items-start gap-2.5"
              >
                <Check class="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span>{{ feature }}</span>
              </li>
            </ul>
          </CardContent>

          <CardFooter class="pt-0">
            <Button class="h-11 w-full" as-child>
              <NuxtLink :to="resolvePlanHref(plan.key)">
                {{ resolvePlanActionLabel() }}
              </NuxtLink>
            </Button>
          </CardFooter>
        </Card>
      </section>

      <section class="flex flex-wrap justify-center gap-3">
        <Button variant="outline" as-child>
          <NuxtLink to="/">
            {{ t("public.pricing.actions.backHome") }}
          </NuxtLink>
        </Button>
        <Button variant="outline" as-child>
          <NuxtLink to="/settings/personal">
            {{ t("public.pricing.actions.goSubscriptionSettings") }}
          </NuxtLink>
        </Button>
      </section>
    </div>
  </div>
</template>

<style scoped>
.price-swap-enter-active,
.price-swap-leave-active {
  transition: all 240ms cubic-bezier(0.22, 1, 0.36, 1);
}

.price-swap-enter-from {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}

.price-swap-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.98);
}

.meta-swap-enter-active,
.meta-swap-leave-active {
  transition: all 180ms ease;
}

.meta-swap-enter-from,
.meta-swap-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
