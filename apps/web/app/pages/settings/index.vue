<script setup lang="ts">
definePageMeta({
  layout: "dashboard",
  middleware: "dashboard-auth",
  title: "Settings",
});

await navigateTo("/settings/appearance", { replace: true });
</script>

<template>
  <p class="text-sm text-muted-foreground">
    Redirecting to settings...
  </p>
</template>
