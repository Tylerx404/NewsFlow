<script setup lang="ts">
import ArticleListPanel from "@/components/articles/ArticleListPanel.vue";

const { t } = useI18n();

definePageMeta({
  layout: "dashboard",
  middleware: "dashboard-auth",
  titleKey: "feeds.page.title",
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
    :title="t('feeds.page.panelTitle')"
  />
</template>
