<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, onBeforeUnmount, ref, watch } from "vue";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReadingPreferences } from "@/composables/use-reading-preferences";
import { formatArticleContent } from "@/lib/article-content";
import { dashboardQueryKeys } from "@/lib/dashboard-query-keys";
import {
  isReaderContentWidth,
  isReaderFontFamily,
  isReaderFontSize,
  isReaderLineHeight,
  readerContentWidthOptions,
  readerFontFamilyOptions,
  readerFontSizeOptions,
  readerLineHeightOptions,
} from "@/lib/reader-preferences";
import { formatSummaryMarkdown } from "@/lib/summary-markdown";

definePageMeta({
  layout: "dashboard",
  middleware: "dashboard-auth",
  title: "Reader",
});

const route = useRoute();
const { $orpc } = useNuxtApp();
const queryClient = useQueryClient();
const readingPreferences = useReadingPreferences();

const articleId = computed(() => {
  const raw = route.params.articleId;
  return typeof raw === "string" ? raw : "";
});

const selectedAiConfigId = ref<string>("");
const summaryText = ref("");
const streamedSummaryText = ref("");
const summaryTokens = ref<number | null>(null);
const summaryError = ref("");
const hasMarkedRead = ref(false);
const isStreamingSummary = ref(false);
const summaryStreamInterval = ref<ReturnType<typeof setInterval> | null>(null);

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

const stopSummaryStream = () => {
  if (summaryStreamInterval.value) {
    clearInterval(summaryStreamInterval.value);
    summaryStreamInterval.value = null;
  }

  isStreamingSummary.value = false;
};

const startSummaryStream = (value: string) => {
  stopSummaryStream();
  streamedSummaryText.value = "";

  const normalized = value.trim();
  if (!normalized) {
    return;
  }

  const segments = normalized.match(/\S+\s*/g) ?? [normalized];
  let index = 0;
  isStreamingSummary.value = true;

  summaryStreamInterval.value = setInterval(() => {
    const remaining = segments.length - index;
    if (remaining <= 0) {
      stopSummaryStream();
      return;
    }

    const chunkSize = Math.min(remaining, Math.floor(Math.random() * 2) + 1);
    streamedSummaryText.value += segments.slice(index, index + chunkSize).join("");
    index += chunkSize;

    if (index >= segments.length) {
      stopSummaryStream();
    }
  }, 45);
};

const summarizeMutation = useMutation(
  $orpc.ai.summarize.mutationOptions({
    onSuccess: (result) => {
      summaryText.value = result.summary;
      summaryTokens.value = result.tokens;
      summaryError.value = "";
      startSummaryStream(result.summary);
    },
    onError: (error) => {
      summaryError.value =
        error instanceof Error
          ? error.message
          : "Unable to summarize this article right now.";
      stopSummaryStream();
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
  stopSummaryStream();
  summaryError.value = "";
  summaryText.value = "";
  streamedSummaryText.value = "";
  summaryTokens.value = null;

  await summarizeMutation.mutateAsync({
    articleId: articleId.value,
    ...(selectedAiConfigId.value ? { aiConfigId: selectedAiConfigId.value } : {}),
  });
};

const formattedArticleContent = computed(() =>
  formatArticleContent(articleQuery.data.value?.content ?? null)
);
const formattedSummaryContent = computed(() =>
  formatSummaryMarkdown(streamedSummaryText.value)
);
const isSummaryBusy = computed(() =>
  summarizeMutation.isPending.value || isStreamingSummary.value
);
const summarizeButtonLabel = computed(() => {
  if (summarizeMutation.isPending.value) {
    return "Generating...";
  }

  if (isStreamingSummary.value) {
    return "Streaming...";
  }

  return "Summarize";
});

const updateFontFamily = (value: unknown) => {
  if (typeof value !== "string" || !isReaderFontFamily(value)) {
    return;
  }

  readingPreferences.value.fontFamily = value;
};

const updateFontSize = (value: unknown) => {
  if (typeof value !== "string" || !isReaderFontSize(value)) {
    return;
  }

  readingPreferences.value.fontSize = value;
};

const updateLineHeight = (value: unknown) => {
  if (typeof value !== "string" || !isReaderLineHeight(value)) {
    return;
  }

  readingPreferences.value.lineHeight = value;
};

const updateContentWidth = (value: unknown) => {
  if (typeof value !== "string" || !isReaderContentWidth(value)) {
    return;
  }

  readingPreferences.value.contentWidth = value;
};

const publishedAtLabel = computed(() => {
  const dateValue = articleQuery.data.value?.pubDate;
  if (!dateValue) {
    return "";
  }

  return new Date(dateValue).toLocaleString();
});

onBeforeUnmount(() => {
  stopSummaryStream();
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

          <section class="space-y-4 rounded-xl border bg-muted/20 p-4 md:p-5">
            <div class="space-y-1">
              <h3 class="text-base font-semibold">AI Summary</h3>
              <p class="text-sm text-muted-foreground">
                Use your configured AI profile to summarize this article.
              </p>
            </div>
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
                class="w-full sm:w-auto"
                :disabled="isSummaryBusy || articleQuery.isLoading.value"
                @click="handleSummarize"
              >
                {{ summarizeButtonLabel }}
              </Button>
              <div
                v-if="summaryError"
                class="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
              >
                {{ summaryError }}
              </div>
              <div
                v-else-if="summarizeMutation.isPending.value"
                class="space-y-3 rounded-md border bg-background p-4"
              >
                <div class="flex items-center gap-2 text-sm font-medium">
                  <span class="size-2 animate-pulse rounded-full bg-primary" />
                  Generating summary...
                </div>
                <div class="space-y-2">
                  <div class="h-2 rounded bg-muted/80 animate-pulse" />
                  <div class="h-2 rounded bg-muted/70 animate-pulse" />
                  <div class="h-2 w-3/4 rounded bg-muted/60 animate-pulse" />
                </div>
              </div>
              <div
                v-else-if="isStreamingSummary || streamedSummaryText"
                class="space-y-2 rounded-md border bg-background p-4"
              >
                <p class="text-xs text-muted-foreground">
                  Tokens used: {{ summaryTokens ?? 0 }}
                </p>
                <p v-if="isStreamingSummary" class="text-xs text-muted-foreground animate-pulse">
                  Streaming response...
                </p>
                <div
                  class="reader-content max-w-none"
                  v-html="formattedSummaryContent"
                />
              </div>
            </template>
            <template v-else>
              <div class="space-y-3 rounded-md border border-dashed bg-background/60 p-4 text-sm">
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
          </section>
        </div>
      </CardContent>
    </Card>

    <Card class="h-fit xl:sticky xl:top-6">
      <CardHeader class="space-y-2">
        <CardTitle class="text-base">Reading Appearance</CardTitle>
        <p class="text-sm text-muted-foreground">
          Adjust typography and spacing while reading.
        </p>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <p class="text-sm font-medium">Font family</p>
          <Select
            :model-value="readingPreferences.fontFamily"
            @update:model-value="updateFontFamily"
          >
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="fontOption in readerFontFamilyOptions"
                :key="fontOption.value"
                :value="fontOption.value"
              >
                {{ fontOption.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <p class="text-sm font-medium">Font size</p>
          <Select
            :model-value="readingPreferences.fontSize"
            @update:model-value="updateFontSize"
          >
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="fontSizeOption in readerFontSizeOptions"
                :key="fontSizeOption.value"
                :value="fontSizeOption.value"
              >
                {{ fontSizeOption.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <p class="text-sm font-medium">Line height</p>
          <Select
            :model-value="readingPreferences.lineHeight"
            @update:model-value="updateLineHeight"
          >
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="lineHeightOption in readerLineHeightOptions"
                :key="lineHeightOption.value"
                :value="lineHeightOption.value"
              >
                {{ lineHeightOption.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <p class="text-sm font-medium">Reading width</p>
          <Select
            :model-value="readingPreferences.contentWidth"
            @update:model-value="updateContentWidth"
          >
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="contentWidthOption in readerContentWidthOptions"
                :key="contentWidthOption.value"
                :value="contentWidthOption.value"
              >
                {{ contentWidthOption.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="rounded-lg border bg-muted/20 p-3">
          <p class="text-xs text-muted-foreground">
            Need full controls for theme and color presets?
          </p>
          <Button as-child class="mt-3 w-full" size="sm" variant="outline">
            <NuxtLink to="/settings/appearance">
              Open appearance settings
            </NuxtLink>
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
