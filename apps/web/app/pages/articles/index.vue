<script setup lang="ts">
import ArticleListPanel from "@/components/articles/ArticleListPanel.vue";

const { t } = useI18n();

definePageMeta({
  layout: "dashboard",
  middleware: "dashboard-auth",
  titleKey: "layout.titles.articles",
});
</script>

<template>
  <ArticleListPanel :title="t('articles.list.allFeedsTitle')" />
</template>
