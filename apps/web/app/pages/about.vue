<script setup lang="ts">
const { t } = useI18n();

definePageMeta({ layout: "public" });

const valueItems = [
  "clarity",
  "trust",
  "privacy",
  "craft",
];
</script>

<template>
  <div class="mx-auto w-full max-w-7xl px-6 pb-16">
    <section class="space-y-5 pt-12">
      <p class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        {{ t("app.name") }}
      </p>
      <h1 class="landing-title text-4xl font-semibold leading-tight sm:text-5xl">
        {{ t("public.about.hero.title") }}
      </h1>
      <p class="text-lg text-muted-foreground">
        {{ t("public.about.hero.subtitle") }}
      </p>
    </section>

    <section class="mt-12 grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div class="rounded-2xl border bg-card p-6">
        <h2 class="landing-title text-2xl font-semibold">
          {{ t("public.about.mission.title") }}
        </h2>
        <p class="mt-3 text-sm text-muted-foreground">
          {{ t("public.about.mission.body") }}
        </p>
      </div>
      <div class="rounded-2xl border bg-card p-6">
        <h2 class="landing-title text-2xl font-semibold">
          {{ t("public.about.story.title") }}
        </h2>
        <p class="mt-3 text-sm text-muted-foreground">
          {{ t("public.about.story.body") }}
        </p>
      </div>
    </section>

    <section class="mt-12">
      <h2 class="landing-title text-2xl font-semibold">
        {{ t("public.about.values.title") }}
      </h2>
      <div class="mt-6 grid gap-6 sm:grid-cols-2">
        <div
          v-for="item in valueItems"
          :key="item"
          class="rounded-2xl border bg-card p-6"
        >
          <h3 class="text-lg font-semibold">
            {{ t(`public.about.values.items.${item}.title`) }}
          </h3>
          <p class="mt-2 text-sm text-muted-foreground">
            {{ t(`public.about.values.items.${item}.description`) }}
          </p>
        </div>
      </div>
    </section>

    <section class="mt-12">
      <div class="rounded-2xl border bg-card p-6">
        <h2 class="landing-title text-2xl font-semibold">
          {{ t("public.about.trust.title") }}
        </h2>
        <p class="mt-3 text-sm text-muted-foreground">
          {{ t("public.about.trust.body") }}
        </p>
      </div>
    </section>

    <section class="mt-12">
      <div class="rounded-2xl border bg-card p-8 text-center">
        <h2 class="landing-title text-2xl font-semibold">
          {{ t("public.about.finalCta.title") }}
        </h2>
        <p class="mt-2 text-sm text-muted-foreground">
          {{ t("public.about.finalCta.subtitle") }}
        </p>
        <NuxtLink
          to="/signup"
          class="mt-6 inline-flex h-11 items-center rounded-md bg-primary px-6 text-sm font-semibold text-primary-foreground"
        >
          {{ t("public.about.finalCta.cta") }}
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
