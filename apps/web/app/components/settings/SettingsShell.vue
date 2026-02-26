<script setup lang="ts">
import type { SettingsSectionId } from "@/lib/settings-sections";

defineProps<{
  section: SettingsSectionId;
}>();
</script>

<template>
  <div class="w-full">
    <section class="min-w-0">
      <slot />
    </section>
  </div>
</template>
