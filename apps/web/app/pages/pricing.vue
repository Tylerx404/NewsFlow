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

type BillingInterval = "monthly" | "yearly";
type PlanKey = "basic" | "pro" | "max";

type PricingPlan = {
  key: PlanKey;
  label: string;
  monthlyPrice: number;
  yearlyPrice: number;
  subtitle: string;
  highlight?: boolean;
  features: string[];
};

const plans: PricingPlan[] = [
  {
    key: "basic",
    label: "Basic",
    monthlyPrice: 5.99,
    yearlyPrice: 59.99,
    subtitle: "Entry-level plan for personal testing and discovery.",
    features: [
      "Core RSS reading workflow",
      "AI summarize for occasional usage",
      "Instant access after checkout",
    ],
  },
  {
    key: "pro",
    label: "Pro",
    monthlyPrice: 9.99,
    yearlyPrice: 99.0,
    subtitle: "Recommended for frequent AI summarization and daily reading.",
    highlight: true,
    features: [
      "Everything in Basic",
      "Higher AI usage limits",
      "Instant access after checkout",
    ],
  },
  {
    key: "max",
    label: "Max",
    monthlyPrice: 19.99,
    yearlyPrice: 199.0,
    subtitle: "Power users who want highest quota and priority support.",
    features: [
      "Everything in Pro",
      "Highest AI usage capacity",
      "Priority support lane",
    ],
  },
];

const { $authClient } = useNuxtApp();
const billingInterval = ref<BillingInterval>("monthly");
const hasSession = ref(false);

const formatPrice = (value: number) =>
  new Intl.NumberFormat("en-US", {
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
      activePrice,
      monthlyFromYearly,
      yearlyDiscount,
    };
  })
);

const resolvePlanHref = (planKey: PlanKey) =>
  hasSession.value
    ? `/settings/personal?plan=${planKey}&interval=${billingInterval.value}`
    : "/signup";

const resolvePlanActionLabel = () =>
  hasSession.value ? "Choose plan" : "Create account";

onMounted(async () => {
  const { data } = await $authClient.getSession();
  hasSession.value = Boolean(data?.session);
});
</script>

<template>
  <div class="min-h-screen bg-background">
    <div class="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12">
      <div class="space-y-4 text-center">
        <Badge variant="outline" class="rounded-full px-4 py-1">
          Pricing
        </Badge>
        <h1 class="text-3xl font-semibold tracking-tight md:text-5xl">
          Choose The Right NewsFlow Plan
        </h1>
        <p class="mx-auto max-w-2xl text-sm text-muted-foreground md:text-base">
          Pick a plan and get instant access after checkout. Upgrade when you need higher
          AI usage and more power for your reading workflow.
        </p>

        <div class="inline-flex rounded-lg border p-1">
          <button
            type="button"
            class="rounded-md px-4 py-2 text-sm font-medium transition"
            :class="
              billingInterval === 'monthly'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground'
            "
            @click="billingInterval = 'monthly'"
          >
            Monthly billing
          </button>
          <button
            type="button"
            class="rounded-md px-4 py-2 text-sm font-medium transition"
            :class="
              billingInterval === 'yearly'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground'
            "
            @click="billingInterval = 'yearly'"
          >
            Yearly billing
          </button>
        </div>
      </div>

      <div class="grid gap-6 md:grid-cols-3">
        <Card
          v-for="plan in displayedPlans"
          :key="plan.key"
          class="relative overflow-hidden border-border/70"
          :class="plan.highlight ? 'border-primary/40 shadow-md' : ''"
        >
          <div
            v-if="plan.highlight"
            class="absolute right-3 top-3 rounded-full bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground"
          >
            Most Popular
          </div>

          <CardHeader class="space-y-3">
            <CardTitle class="text-2xl">
              {{ plan.label }}
            </CardTitle>
            <CardDescription class="min-h-12">
              {{ plan.subtitle }}
            </CardDescription>
            <div>
              <p class="text-3xl font-semibold">
                {{ formatPrice(plan.activePrice) }}
              </p>
              <p class="text-xs text-muted-foreground">
                <span v-if="billingInterval === 'monthly'">per month</span>
                <span v-else>
                  per year ({{ formatPrice(plan.monthlyFromYearly) }}/month equivalent)
                </span>
              </p>
              <p v-if="billingInterval === 'yearly'" class="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                Save around {{ plan.yearlyDiscount }}% with yearly plan
              </p>
            </div>
          </CardHeader>

          <CardContent>
            <ul class="space-y-2 text-sm">
              <li
                v-for="feature in plan.features"
                :key="feature"
                class="flex items-start gap-2"
              >
                <Check class="mt-0.5 size-4 text-emerald-600 dark:text-emerald-400" />
                <span>{{ feature }}</span>
              </li>
            </ul>
          </CardContent>

          <CardFooter class="pt-0">
            <Button class="w-full" as-child>
              <NuxtLink :to="resolvePlanHref(plan.key)">
                {{ resolvePlanActionLabel() }}
              </NuxtLink>
            </Button>
          </CardFooter>
        </Card>
      </div>

      <div class="flex justify-center gap-3">
        <Button variant="outline" as-child>
          <NuxtLink to="/">
            Back to home
          </NuxtLink>
        </Button>
        <Button variant="outline" as-child>
          <NuxtLink to="/settings/personal">
            Go to subscription settings
          </NuxtLink>
        </Button>
      </div>
    </div>
  </div>
</template>
