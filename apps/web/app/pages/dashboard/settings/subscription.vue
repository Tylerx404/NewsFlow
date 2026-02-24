<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
  middleware: "dashboard-auth",
  title: "Personal Settings",
});

await navigateTo("/dashboard/settings/personal", { replace: true });
</script>

<template>
  <p class="text-sm text-muted-foreground">
    Redirecting to personal settings...
  </p>
</template>
