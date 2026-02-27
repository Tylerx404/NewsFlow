<script setup lang="ts">
import ArticleListPanel from "@/components/articles/ArticleListPanel.vue";

definePageMeta({
  layout: "dashboard",
  middleware: "dashboard-auth",
  title: "Articles",
});
</script>

<template>
  <ArticleListPanel title="All feeds" />
</template>
