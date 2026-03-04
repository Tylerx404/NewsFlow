<script setup lang="ts">
const { $authClient } = useNuxtApp();

onMounted(async () => {
  const { data } = await $authClient.getSession();
  if (data?.session) {
    await navigateTo("/dashboard");
  }
});
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background p-6">
    <div class="w-full max-w-xl space-y-4 rounded-xl border bg-card p-8 text-center">
      <h1 class="text-3xl font-semibold">NewsFlow</h1>
      <p class="text-muted-foreground">
        Personalized AI-powered RSS reader.
      </p>
      <div class="flex justify-center gap-3">
        <NuxtLink to="/login" class="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground">
          Login
        </NuxtLink>
        <NuxtLink to="/signup" class="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium">
          Sign up
        </NuxtLink>
        <NuxtLink to="/pricing" class="inline-flex h-9 items-center rounded-md border px-4 text-sm font-medium">
          Pricing
        </NuxtLink>
      </div>
    </div>
  </div>
</template>
