<script setup lang="ts">
const { $authClient } = useNuxtApp();
const { t } = useI18n();

definePageMeta({ layout: "public" });

const benefitItems = [
  {
    titleKey: "public.home.benefits.items.personalized.title",
    descriptionKey: "public.home.benefits.items.personalized.description"
  },
  {
    titleKey: "public.home.benefits.items.clear.title",
    descriptionKey: "public.home.benefits.items.clear.description"
  },
  {
    titleKey: "public.home.benefits.items.focus.title",
    descriptionKey: "public.home.benefits.items.focus.description"
  }
];

const howSteps = [
  {
    titleKey: "public.home.howItWorks.steps.add.title",
    descriptionKey: "public.home.howItWorks.steps.add.description"
  },
  {
    titleKey: "public.home.howItWorks.steps.summarize.title",
    descriptionKey: "public.home.howItWorks.steps.summarize.description"
  },
  {
    titleKey: "public.home.howItWorks.steps.read.title",
    descriptionKey: "public.home.howItWorks.steps.read.description"
  }
];

const useCases = [
  "public.home.useCases.items.morning",
  "public.home.useCases.items.industry",
  "public.home.useCases.items.evening"
];

const faqItems = [
  {
    questionKey: "public.home.faq.items.rss.q",
    answerKey: "public.home.faq.items.rss.a"
  },
  {
    questionKey: "public.home.faq.items.accuracy.q",
    answerKey: "public.home.faq.items.accuracy.a"
  },
  {
    questionKey: "public.home.faq.items.privacy.q",
    answerKey: "public.home.faq.items.privacy.a"
  }
];

onMounted(async () => {
  const { data } = await $authClient.getSession();
  if (data?.session) {
    await navigateTo("/dashboard");
  }
});
</script>

<template>
  <div class="min-h-screen bg-background text-foreground">
    <section class="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 pb-12 pt-16">
      <div class="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div class="space-y-6">
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {{ t("app.name") }}
          </p>
          <h1 class="landing-title text-4xl font-semibold leading-tight sm:text-5xl">
            {{ t("public.home.hero.title") }}
          </h1>
          <p class="text-lg text-muted-foreground">
            {{ t("public.home.hero.subtitle") }}
          </p>
          <div class="flex flex-wrap gap-3">
            <NuxtLink
              to="/signup"
              class="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground"
            >
              {{ t("public.home.hero.ctaPrimary") }}
            </NuxtLink>
            <a
              href="#demo"
              class="inline-flex h-11 items-center rounded-md border px-6 text-sm font-semibold"
            >
              {{ t("public.home.hero.ctaSecondary") }}
            </a>
          </div>
          <div class="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span class="rounded-full border px-3 py-1">{{ t("public.home.trust.privacy") }}</span>
            <span class="rounded-full border px-3 py-1">{{ t("public.home.trust.noSpam") }}</span>
            <span class="rounded-full border px-3 py-1">{{ t("public.home.trust.rssOpen") }}</span>
          </div>
        </div>
        <div class="rounded-2xl border bg-card p-6 shadow-sm">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div class="text-sm font-semibold">{{ t("public.home.demo.cardTitle") }}</div>
              <div class="text-xs text-muted-foreground">{{ t("public.home.demo.cardSource") }}</div>
            </div>
            <div class="space-y-3 rounded-xl border bg-background p-4">
              <p class="text-xs uppercase tracking-widest text-muted-foreground">
                {{ t("public.home.demo.summaryLabel") }}
              </p>
              <ul class="space-y-2 text-sm">
                <li>• {{ t("public.home.demo.bullets.one") }}</li>
                <li>• {{ t("public.home.demo.bullets.two") }}</li>
                <li>• {{ t("public.home.demo.bullets.three") }}</li>
              </ul>
            </div>
            <div class="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div class="rounded-lg border bg-background px-3 py-2">
                {{ t("public.home.demo.chips.topReads") }}
              </div>
              <div class="rounded-lg border bg-background px-3 py-2">
                {{ t("public.home.demo.chips.aiHighlights") }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto w-full max-w-6xl px-6 pb-12">
      <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div v-for="item in benefitItems" :key="item.titleKey" class="rounded-2xl border bg-card p-6">
          <h3 class="text-lg font-semibold">{{ t(item.titleKey) }}</h3>
          <p class="mt-2 text-sm text-muted-foreground">{{ t(item.descriptionKey) }}</p>
        </div>
      </div>
    </section>

    <section class="mx-auto w-full max-w-6xl px-6 pb-12">
      <div class="rounded-2xl border bg-card p-6">
        <h2 class="landing-title text-2xl font-semibold">{{ t("public.home.howItWorks.title") }}</h2>
        <div class="mt-6 grid gap-6 md:grid-cols-3">
          <div v-for="step in howSteps" :key="step.titleKey" class="space-y-2">
            <div class="text-sm font-semibold">{{ t(step.titleKey) }}</div>
            <p class="text-sm text-muted-foreground">{{ t(step.descriptionKey) }}</p>
          </div>
        </div>
      </div>
    </section>

    <section id="demo" class="mx-auto w-full max-w-6xl px-6 pb-12">
      <div class="grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div class="space-y-3">
          <h2 class="landing-title text-2xl font-semibold">{{ t("public.home.demo.title") }}</h2>
          <p class="text-sm text-muted-foreground">{{ t("public.home.demo.subtitle") }}</p>
        </div>
        <div class="rounded-2xl border bg-card p-6">
          <div class="space-y-3">
            <p class="text-xs uppercase tracking-widest text-muted-foreground">
              {{ t("public.home.demo.highlightsLabel") }}
            </p>
            <ul class="space-y-2 text-sm">
              <li>• {{ t("public.home.demo.bullets.one") }}</li>
              <li>• {{ t("public.home.demo.bullets.two") }}</li>
              <li>• {{ t("public.home.demo.bullets.three") }}</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto w-full max-w-6xl px-6 pb-12">
      <div class="rounded-2xl border bg-card p-6">
        <h2 class="landing-title text-2xl font-semibold">{{ t("public.home.useCases.title") }}</h2>
        <ul class="mt-4 grid gap-3 text-sm text-muted-foreground md:grid-cols-3">
          <li v-for="item in useCases" :key="item" class="rounded-xl border bg-background px-4 py-3">
            {{ t(item) }}
          </li>
        </ul>
      </div>
    </section>

    <section class="mx-auto w-full max-w-6xl px-6 pb-12">
      <div class="rounded-2xl border bg-card p-6">
        <h2 class="landing-title text-2xl font-semibold">{{ t("public.home.faq.title") }}</h2>
        <div class="mt-4 space-y-4">
          <div v-for="item in faqItems" :key="item.questionKey" class="rounded-xl border bg-background p-4">
            <p class="text-sm font-semibold">{{ t(item.questionKey) }}</p>
            <p class="mt-2 text-sm text-muted-foreground">{{ t(item.answerKey) }}</p>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto w-full max-w-6xl px-6 pb-16">
      <div class="rounded-2xl border bg-card p-8 text-center">
        <h2 class="landing-title text-2xl font-semibold">{{ t("public.home.finalCta.title") }}</h2>
        <p class="mt-2 text-sm text-muted-foreground">{{ t("public.home.finalCta.subtitle") }}</p>
        <NuxtLink
          to="/signup"
          class="mt-6 inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground"
        >
          {{ t("public.home.finalCta.cta") }}
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
