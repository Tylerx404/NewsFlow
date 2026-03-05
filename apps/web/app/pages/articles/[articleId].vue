<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, ref, watch } from "vue";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatArticleContent } from "@/lib/article-content";
import { dashboardQueryKeys } from "@/lib/dashboard-query-keys";

definePageMeta({
  layout: "dashboard",
  middleware: "dashboard-auth",
  title: "Reader",
});

const route = useRoute();
const { $orpc } = useNuxtApp();
const queryClient = useQueryClient();

const articleId = computed(() => {
  const raw = route.params.articleId;
  return typeof raw === "string" ? raw : "";
});

const selectedAiConfigId = ref<string>("");
const summaryText = ref("");
const summaryTokens = ref<number | null>(null);
const summaryError = ref("");
const hasMarkedRead = ref(false);

const articleQuery = useQuery(
  computed(() =>
    $orpc.article.get.queryOptions({
      input: { id: articleId.value },
      queryKey: dashboardQueryKeys.articles.detail(articleId.value),
      enabled: articleId.value.length > 0,
    })
  )
);

const aiConfigQuery = useQuery(
  $orpc.aiConfig.list.queryOptions({
    queryKey: dashboardQueryKeys.ai.configs(),
  })
);

const markReadMutation = useMutation(
  $orpc.article.markRead.mutationOptions({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root() });
    },
  })
);

const summarizeMutation = useMutation(
  $orpc.ai.summarize.mutationOptions({
    onSuccess: (result) => {
      summaryText.value = result.summary;
      summaryTokens.value = result.tokens;
      summaryError.value = "";
    },
    onError: (error) => {
      summaryError.value =
        error instanceof Error
          ? error.message
          : "Unable to summarize this article right now.";
    },
  })
);

watch(
  () => articleQuery.data.value,
  async (article) => {
    if (!article || hasMarkedRead.value || article.read) {
      return;
    }

    hasMarkedRead.value = true;
    await markReadMutation.mutateAsync({ id: article.id });
  }
);

watch(
  () => aiConfigQuery.data.value,
  (configs) => {
    if (!configs?.length) {
      selectedAiConfigId.value = "";
      return;
    }

    const defaultConfig = configs.find((item) => item.isDefault);
    selectedAiConfigId.value = defaultConfig?.id ?? configs[0]?.id ?? "";
  },
  { immediate: true }
);

const handleSummarize = async () => {
  summaryError.value = "";
  summaryText.value = "";
  summaryTokens.value = null;

  await summarizeMutation.mutateAsync({
    articleId: articleId.value,
    ...(selectedAiConfigId.value ? { aiConfigId: selectedAiConfigId.value } : {}),
  });
};

const formattedArticleContent = computed(() =>
  formatArticleContent(articleQuery.data.value?.content ?? null)
);

const publishedAtLabel = computed(() => {
  const dateValue = articleQuery.data.value?.pubDate;
  if (!dateValue) {
    return "";
  }

  return new Date(dateValue).toLocaleString();
});
</script>

<template>
  <div class="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
    <Card class="overflow-hidden">
      <CardHeader v-if="articleQuery.data.value" class="space-y-4 border-b bg-muted/20 px-4 py-5 md:px-6">
        <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <Badge variant="secondary">
            {{ articleQuery.data.value.feed.title }}
          </Badge>
          <span>{{ publishedAtLabel }}</span>
          <span v-if="articleQuery.data.value.author">
            • {{ articleQuery.data.value.author }}
          </span>
        </div>
        <CardTitle class="text-balance text-2xl leading-tight md:text-3xl">
          {{ articleQuery.data.value.title }}
        </CardTitle>
      </CardHeader>
      <CardContent class="p-0">
        <p v-if="articleQuery.isLoading.value" class="p-6 text-sm text-muted-foreground">
          Loading article...
        </p>
        <p v-else-if="articleQuery.error.value" class="p-6 text-sm text-destructive">
          {{ articleQuery.error.value.message }}
        </p>
        <div v-else-if="articleQuery.data.value" class="space-y-6 p-4 md:p-6">
          <article class="reader-article-shell rounded-xl border p-4 md:p-8">
            <div
              v-if="formattedArticleContent"
              class="reader-content"
              v-html="formattedArticleContent"
            />
            <div v-else class="space-y-2 text-sm">
              <p class="font-medium">Full content unavailable</p>
              <p class="text-muted-foreground">
                {{ articleQuery.data.value.excerpt || "No excerpt available for this article." }}
              </p>
            </div>
          </article>
          <div class="flex flex-wrap items-center gap-3">
            <Button as-child variant="outline">
              <a :href="articleQuery.data.value.link" target="_blank" rel="noreferrer">
                Open original article
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card class="h-fit">
      <CardHeader>
        <CardTitle>AI Summary</CardTitle>
        <CardDescription>
          Use your configured AI profile to summarize this article.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <template v-if="(aiConfigQuery.data.value?.length ?? 0) > 0">
          <label class="text-sm font-medium" for="ai-config">
            AI Profile
          </label>
          <select
            id="ai-config"
            v-model="selectedAiConfigId"
            class="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option
              v-for="config in aiConfigQuery.data.value"
              :key="config.id"
              :value="config.id"
            >
              {{ config.name }} ({{ config.provider }} / {{ config.model }})
            </option>
          </select>
          <Button
            class="w-full"
            :disabled="summarizeMutation.isPending.value || articleQuery.isLoading.value"
            @click="handleSummarize"
          >
            {{ summarizeMutation.isPending.value ? "Summarizing..." : "Summarize" }}
          </Button>
          <div v-if="summaryError" class="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
            {{ summaryError }}
          </div>
          <div v-else-if="summaryText" class="space-y-2 rounded-md border p-3">
            <p class="text-xs text-muted-foreground">
              Tokens used: {{ summaryTokens ?? 0 }}
            </p>
            <pre class="whitespace-pre-wrap text-sm leading-relaxed">{{ summaryText }}</pre>
          </div>
        </template>
        <template v-else>
          <div class="space-y-3 rounded-md border border-dashed p-4 text-sm">
            <p class="font-medium">No AI profile configured</p>
            <p class="text-muted-foreground">
              Add an AI profile to enable summarization.
            </p>
            <Button as-child size="sm">
              <NuxtLink to="/settings/ai">
                Go to AI settings
              </NuxtLink>
            </Button>
          </div>
        </template>
      </CardContent>
    </Card>
  </div>
</template>
