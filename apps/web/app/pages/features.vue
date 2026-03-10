<script setup lang="ts">
const { t } = useI18n();

definePageMeta({ layout: "public" });

const featureItems = [
  "personalized",
  "summaries",
  "priority",
  "openRss",
  "privacy",
  "speed",
];
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-6 pb-16">
    <section class="grid gap-8 pt-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
      <div class="space-y-5">
        <p class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          {{ t("app.name") }}
        </p>
        <h1 class="landing-title text-4xl font-semibold leading-tight sm:text-5xl">
          {{ t("public.features.hero.title") }}
        </h1>
        <p class="text-lg text-muted-foreground">
          {{ t("public.features.hero.subtitle") }}
        </p>
        <NuxtLink
          to="/signup"
          class="inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground"
        >
          {{ t("public.features.hero.cta") }}
        </NuxtLink>
      </div>
      <div class="rounded-2xl border bg-card p-6 shadow-sm">
        <div class="space-y-3">
          <p class="text-xs uppercase tracking-widest text-muted-foreground">
            {{ t("public.home.demo.summaryLabel") }}
          </p>
          <ul class="space-y-2 text-sm">
            <li>• {{ t("public.home.demo.bullets.one") }}</li>
            <li>• {{ t("public.home.demo.bullets.two") }}</li>
            <li>• {{ t("public.home.demo.bullets.three") }}</li>
          </ul>
        </div>
      </div>
    </section>

    <section class="mt-14">
      <div class="flex items-center justify-between">
        <h2 class="landing-title text-2xl font-semibold">
          {{ t("public.features.grid.title") }}
        </h2>
      </div>
      <div class="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="item in featureItems"
          :key="item"
          class="rounded-2xl border bg-card p-6"
        >
          <h3 class="text-lg font-semibold">
            {{ t(`public.features.grid.items.${item}.title`) }}
          </h3>
          <p class="mt-2 text-sm text-muted-foreground">
            {{ t(`public.features.grid.items.${item}.description`) }}
          </p>
        </div>
      </div>
    </section>

    <section class="mt-14 rounded-2xl border bg-card p-6">
      <h2 class="landing-title text-2xl font-semibold">
        {{ t("public.home.howItWorks.title") }}
      </h2>
      <div class="mt-6 grid gap-6 md:grid-cols-3">
        <div class="space-y-2">
          <div class="text-sm font-semibold">
            {{ t("public.home.howItWorks.steps.add.title") }}
          </div>
          <p class="text-sm text-muted-foreground">
            {{ t("public.home.howItWorks.steps.add.description") }}
          </p>
        </div>
        <div class="space-y-2">
          <div class="text-sm font-semibold">
            {{ t("public.home.howItWorks.steps.summarize.title") }}
          </div>
          <p class="text-sm text-muted-foreground">
            {{ t("public.home.howItWorks.steps.summarize.description") }}
          </p>
        </div>
        <div class="space-y-2">
          <div class="text-sm font-semibold">
            {{ t("public.home.howItWorks.steps.read.title") }}
          </div>
          <p class="text-sm text-muted-foreground">
            {{ t("public.home.howItWorks.steps.read.description") }}
          </p>
        </div>
      </div>
    </section>

    <section class="mt-14 grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-center">
      <div class="space-y-3">
        <h2 class="landing-title text-2xl font-semibold">
          {{ t("public.home.demo.title") }}
        </h2>
        <p class="text-sm text-muted-foreground">
          {{ t("public.home.demo.subtitle") }}
        </p>
      </div>
      <div class="rounded-2xl border bg-card p-6">
        <p class="text-xs uppercase tracking-widest text-muted-foreground">
          {{ t("public.home.demo.highlightsLabel") }}
        </p>
        <ul class="mt-3 space-y-2 text-sm">
          <li>• {{ t("public.home.demo.bullets.one") }}</li>
          <li>• {{ t("public.home.demo.bullets.two") }}</li>
          <li>• {{ t("public.home.demo.bullets.three") }}</li>
        </ul>
      </div>
    </section>

    <section class="mt-14">
      <div class="rounded-2xl border bg-card p-8 text-center">
        <h2 class="landing-title text-2xl font-semibold">
          {{ t("public.features.finalCta.title") }}
        </h2>
        <p class="mt-2 text-sm text-muted-foreground">
          {{ t("public.features.finalCta.subtitle") }}
        </p>
        <NuxtLink
          to="/signup"
          class="mt-6 inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground"
        >
          {{ t("public.features.finalCta.cta") }}
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
