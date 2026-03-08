<script setup lang="ts">
import AppSidebar from "@/components/AppSidebar.vue";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const route = useRoute();
const { t } = useI18n();

const pageTitle = computed(() => {
  if (typeof route.meta.titleKey === "string" && route.meta.titleKey.length > 0) {
    return t(route.meta.titleKey);
  }

  if (typeof route.meta.title === "string" && route.meta.title.length > 0) {
    return route.meta.title;
  }

  if (route.path.startsWith("/settings")) {
    return t("layout.titles.settings");
  }

  if (route.path.startsWith("/articles")) {
    return t("layout.titles.articles");
  }

  if (route.path.startsWith("/feeds")) {
    return t("layout.titles.reader");
  }

  return t("layout.titles.dashboard");
});
</script>

<template>
  <SidebarProvider>
    <AppSidebar />
    <SidebarInset>
      <header class="flex h-16 shrink-0 items-center gap-2 border-b">
        <div class="flex items-center gap-2 px-4">
          <SidebarTrigger class="-ml-1" />
          <Separator
            orientation="vertical"
            class="mr-2 data-[orientation=vertical]:h-4"
          />
          <p class="text-sm font-medium">
            {{ pageTitle }}
          </p>
        </div>
      </header>
      <main class="flex flex-1 flex-col p-4 md:p-6">
        <slot />
      </main>
    </SidebarInset>
  </SidebarProvider>
</template>
