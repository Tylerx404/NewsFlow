<script setup lang="ts">
import ArticleListPanel from "@/components/articles/ArticleListPanel.vue";

definePageMeta({
  layout: "dashboard",
  middleware: "dashboard-auth",
  title: "Feed Articles",
});

const route = useRoute();

const feedSubscriptionId = computed(() => {
  const raw = route.params.feedId;
  return typeof raw === "string" ? raw : "";
});
</script>

<template>
  <ArticleListPanel
    :feed-subscription-id="feedSubscriptionId"
    title="Feed articles"
  />
</template>
