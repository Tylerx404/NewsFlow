<script setup lang="ts">
const { $authClient } = useNuxtApp();
const { t } = useI18n();

definePageMeta({ layout: "public" });

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
  </div>
</template>
