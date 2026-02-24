<script setup lang="ts">
import { computed } from "vue";

import { settingsSections, type SettingsSectionId } from "@/lib/settings-sections";

const props = defineProps<{
  section: SettingsSectionId;
}>();

const activeSection = computed(
  () => settingsSections.find((section) => section.id === props.section) ?? settingsSections[0]
);
</script>

<template>
  <div class="w-full space-y-6">
    <div class="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside class="lg:sticky lg:top-6 lg:self-start">
        <nav
          aria-label="Settings sections"
          class="flex gap-2 overflow-x-auto rounded-lg border bg-card p-2 lg:flex-col lg:overflow-visible"
        >
          <NuxtLink
            v-for="item in settingsSections"
            :key="item.id"
            :to="item.href"
            class="rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors"
            :aria-current="item.id === section ? 'page' : undefined"
            :class="
              item.id === section
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
            "
          >
            {{ item.label }}
          </NuxtLink>
        </nav>
      </aside>

      <section class="min-w-0">
        <slot />
      </section>
    </div>
  </div>
</template>
