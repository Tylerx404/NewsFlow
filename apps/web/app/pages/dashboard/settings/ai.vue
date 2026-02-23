<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { reactive, ref, watch } from "vue";

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

const providers = ["openai", "anthropic", "google", "deepseek", "groq", "ollama"] as const;

const createForm = reactive({
  name: "",
  provider: "openai",
  model: "",
  apiKey: "",
  baseUrl: "",
});
const createError = ref("");
const fetchCreateModelsError = ref("");
const modelOptionsForCreate = ref<string[]>([]);
const isLoadingCreateModels = ref(false);
const actionError = ref("");
const modelDraftByConfigId = reactive<Record<string, string>>({});
const modelOptionsByConfigId = reactive<Record<string, string[]>>({});
const rowErrorByConfigId = reactive<Record<string, string>>({});

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
      createForm.baseUrl = "";
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
  async (configs) => {
    for (const config of configs ?? []) {
      if (!modelDraftByConfigId[config.id]) {
        modelDraftByConfigId[config.id] = config.model;
      }

      if ((modelOptionsByConfigId[config.id]?.length ?? 0) === 0) {
        rowErrorByConfigId[config.id] = "";
        try {
          const result = await $orpc.aiConfig.fetchModels.call({
            aiConfigId: config.id,
          });
          modelOptionsByConfigId[config.id] = result.models;
          if (!result.models.includes(modelDraftByConfigId[config.id] ?? "")) {
            modelDraftByConfigId[config.id] = result.models[0] ?? config.model;
          }
        } catch (error) {
          rowErrorByConfigId[config.id] =
            error instanceof Error ? error.message : "Unable to load models.";
          modelOptionsByConfigId[config.id] = [config.model];
        }
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

const loadCreateModels = async () => {
  fetchCreateModelsError.value = "";
  const apiKey = createForm.apiKey.trim();
  const baseUrl = createForm.baseUrl.trim();

  if (createForm.provider !== "ollama" && !apiKey) {
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

let createModelFetchTimer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => [createForm.provider, createForm.apiKey, createForm.baseUrl],
  () => {
    clearTimeout(createModelFetchTimer);
    createModelFetchTimer = setTimeout(() => {
      void loadCreateModels();
    }, 350);
  },
  { immediate: true }
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
              {{ provider }}
            </option>
          </select>
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium" for="model">Model</label>
          <select
            id="model"
            v-model="createForm.model"
            class="w-full rounded-md border bg-background px-3 py-2 text-sm"
            :disabled="isLoadingCreateModels || modelOptionsForCreate.length === 0"
          >
            <option value="">
              {{
                isLoadingCreateModels
                  ? "Loading models..."
                  : "No models available"
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
          <label class="text-sm font-medium" for="api-key">API key</label>
          <Input id="api-key" v-model="createForm.apiKey" type="password" placeholder="sk-..." />
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium" for="base-url">Base URL (optional)</label>
          <Input id="base-url" v-model="createForm.baseUrl" placeholder="https://api.openai.com/v1" />
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
