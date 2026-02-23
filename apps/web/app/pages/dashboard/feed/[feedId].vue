<script setup lang="ts">
import ArticleListPanel from "@/components/dashboard/ArticleListPanel.vue";

definePageMeta({
  layout: "dashboard",
  middleware: "dashboard-auth",
  title: "Feed",
});

const route = useRoute();

const feedId = computed(() => {
  const raw = route.params.feedId;
  return typeof raw === "string" ? raw : "";
});
</script>

<template>
  <ArticleListPanel :feed-id="feedId" title="Feed articles" />
</template>
