<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, reactive, ref, watch } from "vue";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { dashboardQueryKeys } from "@/lib/dashboard-query-keys";

definePageMeta({
  layout: "dashboard",
  middleware: "dashboard-auth",
  title: "AI Profiles",
});

const { $orpc } = useNuxtApp();
const queryClient = useQueryClient();

type Provider = "openai" | "anthropic" | "google" | "deepseek" | "groq" | "ollama";

const providerConfigs: Record<
  Provider,
  {
    label: string;
    defaultBaseUrl: string;
    supportsByokBaseUrl: boolean;
    apiKeyRequired: boolean;
  }
> = {
  openai: {
    label: "OpenAI",
    defaultBaseUrl: "https://api.openai.com",
    supportsByokBaseUrl: true,
    apiKeyRequired: true,
  },
  anthropic: {
    label: "Anthropic",
    defaultBaseUrl: "https://api.anthropic.com",
    supportsByokBaseUrl: true,
    apiKeyRequired: true,
  },
  google: {
    label: "Google Gemini",
    defaultBaseUrl: "https://generativelanguage.googleapis.com",
    supportsByokBaseUrl: true,
    apiKeyRequired: true,
  },
  deepseek: {
    label: "DeepSeek",
    defaultBaseUrl: "https://api.deepseek.com",
    supportsByokBaseUrl: false,
    apiKeyRequired: true,
  },
  groq: {
    label: "Groq",
    defaultBaseUrl: "https://api.groq.com",
    supportsByokBaseUrl: false,
    apiKeyRequired: true,
  },
  ollama: {
    label: "Ollama",
    defaultBaseUrl: "http://localhost:11434",
    supportsByokBaseUrl: false,
    apiKeyRequired: false,
  },
};

const providers = Object.keys(providerConfigs) as Provider[];
const getProviderConfig = (provider: Provider) => providerConfigs[provider];

const createForm = reactive({
  name: "",
  provider: "openai" as Provider,
  model: "",
  apiKey: "",
  baseUrl: getProviderConfig("openai").defaultBaseUrl,
});
const createError = ref("");
const fetchCreateModelsError = ref("");
const modelOptionsForCreate = ref<string[]>([]);
const isLoadingCreateModels = ref(false);
const createModelFetchKey = ref("");
const actionError = ref("");
const modelDraftByConfigId = reactive<Record<string, string>>({});
const modelOptionsByConfigId = reactive<Record<string, string[]>>({});
const isLoadingModelOptionsByConfigId = reactive<Record<string, boolean>>({});
const rowErrorByConfigId = reactive<Record<string, string>>({});
const currentProviderConfig = computed(() => getProviderConfig(createForm.provider));
const canCustomizeBaseUrl = computed(
  () => currentProviderConfig.value.supportsByokBaseUrl
);
const isApiKeyRequired = computed(
  () => currentProviderConfig.value.apiKeyRequired
);

const aiConfigsQuery = useQuery(
  $orpc.aiConfig.list.queryOptions({
    queryKey: dashboardQueryKeys.ai.configs(),
  })
);

const createMutation = useMutation(
  $orpc.aiConfig.create.mutationOptions({
    onSuccess: async () => {
      createForm.name = "";
      createForm.model = "";
      createForm.apiKey = "";
      createForm.baseUrl = getProviderConfig(createForm.provider).defaultBaseUrl;
      createError.value = "";
      fetchCreateModelsError.value = "";
      modelOptionsForCreate.value = [];
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root() });
    },
    onError: (error) => {
      createError.value =
        error instanceof Error ? error.message : "Unable to create AI profile.";
    },
  })
);

const updateMutation = useMutation(
  $orpc.aiConfig.update.mutationOptions({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root() });
    },
  })
);

const deleteMutation = useMutation(
  $orpc.aiConfig.delete.mutationOptions({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root() });
    },
  })
);

watch(
  () => aiConfigsQuery.data.value,
  (configs) => {
    for (const config of configs ?? []) {
      if (!modelDraftByConfigId[config.id]) {
        modelDraftByConfigId[config.id] = config.model;
      }
    }
  },
  { immediate: true }
);

const handleCreate = async () => {
  createError.value = "";
  try {
    await createMutation.mutateAsync({
      name: createForm.name.trim(),
      provider: createForm.provider,
      model: createForm.model.trim(),
      apiKey: createForm.apiKey.trim(),
      ...(createForm.baseUrl.trim() ? { baseUrl: createForm.baseUrl.trim() } : {}),
    });
  } catch {
    // Error already mapped to createError by mutation onError.
  }
};

const handleSetDefault = async (id: string) => {
  actionError.value = "";
  try {
    await updateMutation.mutateAsync({
      id,
      isDefault: true,
    });
  } catch (error) {
    actionError.value =
      error instanceof Error ? error.message : "Unable to update profile.";
  }
};

const handleDelete = async (id: string) => {
  actionError.value = "";
  try {
    await deleteMutation.mutateAsync({ id });
  } catch (error) {
    actionError.value =
      error instanceof Error ? error.message : "Unable to delete profile.";
  }
};

const handleSaveModel = async (id: string) => {
  rowErrorByConfigId[id] = "";
  const model = modelDraftByConfigId[id]?.trim();
  if (!model) {
    rowErrorByConfigId[id] = "Model is required.";
    return;
  }

  try {
    await updateMutation.mutateAsync({
      id,
      model,
    });
  } catch (error) {
    rowErrorByConfigId[id] =
      error instanceof Error ? error.message : "Unable to update model.";
  }
};

const getModelOptionsForConfig = (id: string): string[] => {
  const fetched = modelOptionsByConfigId[id] ?? [];
  if (fetched.length > 0) {
    return fetched;
  }

  const current = modelDraftByConfigId[id];
  return current ? [current] : [];
};

const getCreateModelFetchKey = () => {
  const apiKey = createForm.apiKey.trim();
  const baseUrl =
    createForm.baseUrl.trim() || getProviderConfig(createForm.provider).defaultBaseUrl;
  return [createForm.provider, apiKey, baseUrl].join("::");
};

const loadCreateModels = async () => {
  fetchCreateModelsError.value = "";
  const apiKey = createForm.apiKey.trim();
  const baseUrl =
    createForm.baseUrl.trim() || getProviderConfig(createForm.provider).defaultBaseUrl;

  if (isApiKeyRequired.value && !apiKey) {
    modelOptionsForCreate.value = [];
    createForm.model = "";
    return;
  }

  isLoadingCreateModels.value = true;
  try {
    const result = await $orpc.aiConfig.fetchModels.call({
      provider: createForm.provider,
      ...(apiKey ? { apiKey } : {}),
      ...(baseUrl ? { baseUrl } : {}),
    });

    modelOptionsForCreate.value = result.models;
    if (!result.models.includes(createForm.model)) {
      createForm.model = result.models[0] ?? "";
    }
  } catch (error) {
    modelOptionsForCreate.value = [];
    createForm.model = "";
    fetchCreateModelsError.value =
      error instanceof Error ? error.message : "Unable to fetch models.";
  } finally {
    isLoadingCreateModels.value = false;
  }
};

const handleCreateModelSelectFocus = async () => {
  const nextFetchKey = getCreateModelFetchKey();
  const hasLoadedCurrentKey =
    createModelFetchKey.value === nextFetchKey && modelOptionsForCreate.value.length > 0;

  if (isLoadingCreateModels.value || hasLoadedCurrentKey) {
    return;
  }

  createModelFetchKey.value = nextFetchKey;
  await loadCreateModels();
};

const loadModelsForConfig = async (id: string) => {
  if (isLoadingModelOptionsByConfigId[id]) {
    return;
  }

  const hasLoadedModels = (modelOptionsByConfigId[id]?.length ?? 0) > 0;
  if (hasLoadedModels && !rowErrorByConfigId[id]) {
    return;
  }

  isLoadingModelOptionsByConfigId[id] = true;
  rowErrorByConfigId[id] = "";

  try {
    const result = await $orpc.aiConfig.fetchModels.call({
      aiConfigId: id,
    });
    modelOptionsByConfigId[id] = result.models;
    const currentModel = modelDraftByConfigId[id];
    if (!result.models.includes(currentModel ?? "")) {
      modelDraftByConfigId[id] = result.models[0] ?? currentModel ?? "";
    }
  } catch (error) {
    rowErrorByConfigId[id] =
      error instanceof Error ? error.message : "Unable to load models.";
  } finally {
    isLoadingModelOptionsByConfigId[id] = false;
  }
};

const handleConfigModelSelectFocus = async (id: string) => {
  await loadModelsForConfig(id);
};

watch(
  () => createForm.provider,
  (provider) => {
    createForm.baseUrl = getProviderConfig(provider).defaultBaseUrl;
  },
  { immediate: true }
);

watch(
  () => [createForm.provider, createForm.apiKey, createForm.baseUrl],
  () => {
    createModelFetchKey.value = "";
    modelOptionsForCreate.value = [];
    fetchCreateModelsError.value = "";
    createForm.model = "";
  }
);
</script>

<template>
  <div class="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
    <Card>
      <CardHeader>
        <CardTitle>Create profile</CardTitle>
        <CardDescription>
          Configure your provider and model. API key is encrypted on server.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <div class="space-y-1">
          <label class="text-sm font-medium" for="name">Name</label>
          <Input id="name" v-model="createForm.name" placeholder="Main OpenAI" />
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium" for="provider">Provider</label>
          <select
            id="provider"
            v-model="createForm.provider"
            class="w-full rounded-md border bg-background px-3 py-2 text-sm"
          >
            <option v-for="provider in providers" :key="provider" :value="provider">
              {{ getProviderConfig(provider).label }}
            </option>
          </select>
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium" for="model">Model</label>
          <select
            id="model"
            v-model="createForm.model"
            class="w-full rounded-md border bg-background px-3 py-2 text-sm"
            @focus="handleCreateModelSelectFocus"
          >
            <option value="">
              {{
                isLoadingCreateModels
                  ? "Loading models..."
                  : "Select to load models"
              }}
            </option>
            <option
              v-for="model in modelOptionsForCreate"
              :key="model"
              :value="model"
            >
              {{ model }}
            </option>
          </select>
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium" for="api-key">
            API key
            <span v-if="!isApiKeyRequired" class="text-muted-foreground">(optional)</span>
          </label>
          <Input id="api-key" v-model="createForm.apiKey" type="password" placeholder="sk-..." />
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium" for="base-url">Base URL</label>
          <Input
            id="base-url"
            v-model="createForm.baseUrl"
            :disabled="!canCustomizeBaseUrl"
            :placeholder="currentProviderConfig.defaultBaseUrl"
          />
          <p class="text-xs text-muted-foreground">
            Default: {{ currentProviderConfig.defaultBaseUrl }}
            <span v-if="canCustomizeBaseUrl">
              (can customize for BYOK)
            </span>
            <span v-else>
              (managed automatically)
            </span>
          </p>
        </div>
        <p v-if="fetchCreateModelsError" class="text-xs text-destructive">
          {{ fetchCreateModelsError }}
        </p>
        <p v-if="createError" class="text-sm text-destructive">{{ createError }}</p>
        <Button class="w-full" :disabled="createMutation.isPending.value" @click="handleCreate">
          {{ createMutation.isPending.value ? "Creating..." : "Create profile" }}
        </Button>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>AI profiles</CardTitle>
        <CardDescription>
          Manage default profile for reader summarize action.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <p v-if="aiConfigsQuery.isLoading.value" class="text-sm text-muted-foreground">
          Loading profiles...
        </p>
        <p v-if="actionError" class="text-sm text-destructive">
          {{ actionError }}
        </p>
        <p v-else-if="(aiConfigsQuery.data.value?.length ?? 0) === 0" class="text-sm text-muted-foreground">
          No profiles yet. Create one to enable AI summarize.
        </p>
        <div
          v-for="config in aiConfigsQuery.data.value ?? []"
          :key="config.id"
          class="space-y-3 rounded-lg border p-4"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-medium">
                {{ config.name }}
                <span
                  v-if="config.isDefault"
                  class="ml-2 rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                >
                  Default
                </span>
              </p>
              <p class="text-sm text-muted-foreground">
                {{ config.provider }} / {{ config.model }}
              </p>
              <p class="text-xs text-muted-foreground">
                Key: {{ config.apiKey }}
              </p>
              <p class="text-xs text-muted-foreground">
                Base URL: {{ config.baseUrl || "Default provider URL" }}
              </p>
            </div>
            <div class="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                :disabled="config.isDefault || updateMutation.isPending.value"
                @click="handleSetDefault(config.id)"
              >
                Set default
              </Button>
              <Button
                size="sm"
                variant="outline"
                :disabled="deleteMutation.isPending.value"
                @click="handleDelete(config.id)"
              >
                Delete
              </Button>
            </div>
          </div>
          <div class="space-y-2 border-t pt-3">
            <p class="text-xs font-medium text-muted-foreground">
              Change model for this profile
            </p>
            <div class="flex items-center gap-2">
              <select
                :id="`model-select-${config.id}`"
                v-model="modelDraftByConfigId[config.id]"
                class="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                @focus="handleConfigModelSelectFocus(config.id)"
              >
                <option
                  v-for="model in getModelOptionsForConfig(config.id)"
                  :key="model"
                  :value="model"
                >
                  {{ model }}
                </option>
              </select>
              <Button
                size="sm"
                type="button"
                :disabled="updateMutation.isPending.value"
                @click="handleSaveModel(config.id)"
              >
                Save model
              </Button>
            </div>
            <p v-if="rowErrorByConfigId[config.id]" class="text-xs text-destructive">
              {{ rowErrorByConfigId[config.id] }}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
