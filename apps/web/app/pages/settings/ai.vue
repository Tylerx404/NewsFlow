<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, reactive, ref, watch } from "vue";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dashboardQueryKeys } from "@/lib/dashboard-query-keys";

definePageMeta({
  layout: "dashboard",
  middleware: "dashboard-auth",
  titleKey: "settings.ai.metaTitle",
});

const { $orpc } = useNuxtApp();
const { t } = useI18n();
const queryClient = useQueryClient();

type Provider = "openai" | "anthropic" | "google" | "deepseek" | "groq" | "ollama";

type ConfigDraft = {
  name: string;
  model: string;
  baseUrl: string;
  apiKey: string;
};

const providerConfigs: Record<
  Provider,
  {
    labelKey: string;
    defaultBaseUrl: string;
    supportsByokBaseUrl: boolean;
    apiKeyRequired: boolean;
  }
> = {
  openai: {
    labelKey: "settings.ai.providers.openai",
    defaultBaseUrl: "https://api.openai.com",
    supportsByokBaseUrl: true,
    apiKeyRequired: true,
  },
  anthropic: {
    labelKey: "settings.ai.providers.anthropic",
    defaultBaseUrl: "https://api.anthropic.com",
    supportsByokBaseUrl: true,
    apiKeyRequired: true,
  },
  google: {
    labelKey: "settings.ai.providers.google",
    defaultBaseUrl: "https://generativelanguage.googleapis.com",
    supportsByokBaseUrl: true,
    apiKeyRequired: true,
  },
  deepseek: {
    labelKey: "settings.ai.providers.deepseek",
    defaultBaseUrl: "https://api.deepseek.com",
    supportsByokBaseUrl: false,
    apiKeyRequired: true,
  },
  groq: {
    labelKey: "settings.ai.providers.groq",
    defaultBaseUrl: "https://api.groq.com",
    supportsByokBaseUrl: false,
    apiKeyRequired: true,
  },
  ollama: {
    labelKey: "settings.ai.providers.ollama",
    defaultBaseUrl: "http://localhost:11434",
    supportsByokBaseUrl: false,
    apiKeyRequired: false,
  },
};

const providers = Object.keys(providerConfigs) as Provider[];
const getProviderConfig = (provider: Provider) => providerConfigs[provider];
const isProvider = (value: string): value is Provider => value in providerConfigs;
const getProviderLabel = (provider: string) =>
  isProvider(provider) ? t(providerConfigs[provider].labelKey) : provider;
const DEFAULT_CREATE_PROVIDER: Provider = "openai";

const createForm = reactive({
  name: "",
  provider: DEFAULT_CREATE_PROVIDER,
  model: "",
  apiKey: "",
  baseUrl: getProviderConfig(DEFAULT_CREATE_PROVIDER).defaultBaseUrl,
});

const createError = ref("");
const fetchCreateModelsError = ref("");
const modelOptionsForCreate = ref<string[]>([]);
const isLoadingCreateModels = ref(false);
const createModelFetchKey = ref("");

const draftByConfigId = reactive<Record<string, ConfigDraft>>({});
const modelOptionsByConfigId = reactive<Record<string, string[]>>({});
const modelFetchKeyByConfigId = reactive<Record<string, string>>({});
const isLoadingModelOptionsByConfigId = reactive<Record<string, boolean>>({});
const rowErrorByConfigId = reactive<Record<string, string>>({});
const rowPendingByConfigId = reactive<Record<string, boolean>>({});
const rowDeletingByConfigId = reactive<Record<string, boolean>>({});
const rowSettingDefaultByConfigId = reactive<Record<string, boolean>>({});

const isCreateDialogOpen = ref(false);
const deleteDialogConfigId = ref<string | null>(null);

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

const resetCreateForm = () => {
  createForm.name = "";
  createForm.provider = DEFAULT_CREATE_PROVIDER;
  createForm.model = "";
  createForm.apiKey = "";
  createForm.baseUrl = getProviderConfig(DEFAULT_CREATE_PROVIDER).defaultBaseUrl;
  createError.value = "";
  fetchCreateModelsError.value = "";
  modelOptionsForCreate.value = [];
  createModelFetchKey.value = "";
};

const createMutation = useMutation(
  $orpc.aiConfig.create.mutationOptions({
    onSuccess: async () => {
      resetCreateForm();
      isCreateDialogOpen.value = false;
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root() });
    },
    onError: (error) => {
      createError.value =
        error instanceof Error ? error.message : t("settings.ai.errors.create");
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
    const activeIds = new Set((configs ?? []).map((config) => config.id));

    for (const config of configs ?? []) {
      const isBusy =
        rowPendingByConfigId[config.id]
        || rowSettingDefaultByConfigId[config.id]
        || rowDeletingByConfigId[config.id];

      if (!draftByConfigId[config.id] || !isBusy) {
        draftByConfigId[config.id] = {
          name: config.name,
          model: config.model,
          baseUrl: config.baseUrl ?? "",
          apiKey: "",
        };
      }
    }

    for (const id of Object.keys(draftByConfigId)) {
      if (!activeIds.has(id)) {
        delete draftByConfigId[id];
        delete modelOptionsByConfigId[id];
        delete modelFetchKeyByConfigId[id];
        delete isLoadingModelOptionsByConfigId[id];
        delete rowErrorByConfigId[id];
        delete rowPendingByConfigId[id];
        delete rowDeletingByConfigId[id];
        delete rowSettingDefaultByConfigId[id];
      }
    }
  },
  { immediate: true }
);

const getConfigById = (id: string) =>
  (aiConfigsQuery.data.value ?? []).find((config) => config.id === id);

const selectedDeleteConfig = computed(() => {
  if (!deleteDialogConfigId.value) {
    return null;
  }

  return getConfigById(deleteDialogConfigId.value) ?? null;
});

const isRowBusy = (id: string) =>
  Boolean(
    rowPendingByConfigId[id]
      || rowDeletingByConfigId[id]
      || rowSettingDefaultByConfigId[id]
  );

const getModelOptionsForConfig = (id: string): string[] => {
  const options = new Set<string>();
  const currentFetchKey = getConfigModelFetchKey(id);
  const hasFreshOptions = modelFetchKeyByConfigId[id] === currentFetchKey;

  if (hasFreshOptions) {
    for (const model of modelOptionsByConfigId[id] ?? []) {
      options.add(model);
    }
  }

  const draftModel = draftByConfigId[id]?.model?.trim();

  if (draftModel) {
    options.add(draftModel);
  }

  return [...options];
};

const getCreateModelFetchKey = () => {
  const apiKey = createForm.apiKey.trim();
  const baseUrl =
    createForm.baseUrl.trim() || getProviderConfig(createForm.provider).defaultBaseUrl;

  return [createForm.provider, apiKey, baseUrl].join("::");
};

const getConfigModelFetchKey = (id: string) => {
  const config = getConfigById(id);
  const draft = draftByConfigId[id];

  if (!config || !draft) {
    return "";
  }

  const apiKey = draft.apiKey.trim();
  const baseUrl = draft.baseUrl.trim();

  return [
    config.provider,
    baseUrl || "__provider_default__",
    apiKey || "__stored_key__",
  ].join("::");
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
      error instanceof Error ? error.message : t("settings.ai.errors.fetchModels");
  } finally {
    isLoadingCreateModels.value = false;
  }
};

const handleCreateModelSelectOpen = async (open: boolean) => {
  if (!open) {
    return;
  }

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

  const currentFetchKey = getConfigModelFetchKey(id);
  const hasLoadedCurrentKey =
    modelFetchKeyByConfigId[id] === currentFetchKey
    && (modelOptionsByConfigId[id]?.length ?? 0) > 0
    && !rowErrorByConfigId[id];

  if (hasLoadedCurrentKey) {
    return;
  }

  const draft = draftByConfigId[id];
  const nextApiKey = draft?.apiKey.trim() ?? "";
  const nextBaseUrl = draft?.baseUrl.trim() ?? "";

  isLoadingModelOptionsByConfigId[id] = true;
  rowErrorByConfigId[id] = "";

  try {
    const result = await $orpc.aiConfig.fetchModels.call({
      aiConfigId: id,
      ...(nextApiKey ? { apiKey: nextApiKey } : {}),
      baseUrl: nextBaseUrl || null,
    });

    modelOptionsByConfigId[id] = result.models;
    modelFetchKeyByConfigId[id] = currentFetchKey;

    const currentModel = draftByConfigId[id]?.model;
    if (currentModel && !result.models.includes(currentModel)) {
      draftByConfigId[id].model = result.models[0] ?? currentModel;
    }
  } catch (error) {
    // Prevent stale model list from previous credentials/base URL.
    modelOptionsByConfigId[id] = [];
    rowErrorByConfigId[id] =
      error instanceof Error ? error.message : t("settings.ai.errors.loadModels");
  } finally {
    isLoadingModelOptionsByConfigId[id] = false;
  }
};

const handleConfigModelSelectOpen = async (id: string, open: boolean) => {
  if (!open) {
    return;
  }

  await loadModelsForConfig(id);
};

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

const openCreateDialog = () => {
  createError.value = "";
  isCreateDialogOpen.value = true;
};

const handleCreateDialogToggle = (open: boolean) => {
  if (createMutation.isPending.value) {
    return;
  }

  isCreateDialogOpen.value = open;

  if (!open) {
    resetCreateForm();
  }
};

const handleSetDefault = async (id: string) => {
  rowErrorByConfigId[id] = "";
  rowSettingDefaultByConfigId[id] = true;

  try {
    await updateMutation.mutateAsync({
      id,
      isDefault: true,
    });
  } catch (error) {
    rowErrorByConfigId[id] =
      error instanceof Error ? error.message : t("settings.ai.errors.setDefault");
  } finally {
    rowSettingDefaultByConfigId[id] = false;
  }
};

const handleSaveConfig = async (id: string) => {
  const config = getConfigById(id);
  const draft = draftByConfigId[id];

  if (!config || !draft) {
    return;
  }

  rowErrorByConfigId[id] = "";

  const nextName = draft.name.trim();
  const nextModel = draft.model.trim();
  const nextBaseUrl = draft.baseUrl.trim();
  const nextApiKey = draft.apiKey.trim();

  if (!nextName) {
    rowErrorByConfigId[id] = t("settings.ai.errors.nameRequired");
    return;
  }

  if (!nextModel) {
    rowErrorByConfigId[id] = t("settings.ai.errors.modelRequired");
    return;
  }

  const payload: {
    id: string;
    name?: string;
    model?: string;
    baseUrl?: string | null;
    apiKey?: string;
  } = { id };

  if (nextName !== config.name) {
    payload.name = nextName;
  }

  if (nextModel !== config.model) {
    payload.model = nextModel;
  }

  const currentBaseUrl = config.baseUrl ?? "";
  if (nextBaseUrl !== currentBaseUrl) {
    payload.baseUrl = nextBaseUrl || null;
  }

  if (nextApiKey) {
    payload.apiKey = nextApiKey;
  }

  if (Object.keys(payload).length === 1) {
    return;
  }

  rowPendingByConfigId[id] = true;

  try {
    await updateMutation.mutateAsync(payload);
    draft.apiKey = "";
  } catch (error) {
    rowErrorByConfigId[id] =
      error instanceof Error ? error.message : t("settings.ai.errors.update");
  } finally {
    rowPendingByConfigId[id] = false;
  }
};

const handleDeleteDialogToggle = (open: boolean) => {
  if (!open) {
    deleteDialogConfigId.value = null;
  }
};

const openDeleteDialog = (id: string) => {
  deleteDialogConfigId.value = id;
};

const confirmDeleteConfig = async () => {
  const id = deleteDialogConfigId.value;
  if (!id) {
    return;
  }

  rowErrorByConfigId[id] = "";
  rowDeletingByConfigId[id] = true;

  try {
    await deleteMutation.mutateAsync({ id });
    deleteDialogConfigId.value = null;
  } catch (error) {
    rowErrorByConfigId[id] =
      error instanceof Error ? error.message : t("settings.ai.errors.delete");
  } finally {
    rowDeletingByConfigId[id] = false;
  }
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
  <div class="space-y-6">
    <Card>
        <CardHeader>
          <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div class="space-y-1">
              <CardTitle>{{ t("settings.ai.page.title") }}</CardTitle>
              <CardDescription>
                {{ t("settings.ai.page.description") }}
              </CardDescription>
            </div>

            <Button size="sm" class="w-full sm:w-auto" @click="openCreateDialog">
              {{ t("settings.ai.actions.createProfile") }}
            </Button>
          </div>
        </CardHeader>

        <CardContent class="space-y-4">
          <p v-if="aiConfigsQuery.isLoading.value" class="text-sm text-muted-foreground">
            {{ t("settings.ai.labels.loadingProfiles") }}
          </p>
          <p
            v-else-if="(aiConfigsQuery.data.value?.length ?? 0) === 0"
            class="text-sm text-muted-foreground"
          >
            {{ t("settings.ai.labels.noProfiles") }}
          </p>

          <div
            v-for="config in aiConfigsQuery.data.value ?? []"
            :key="config.id"
            class="space-y-4 rounded-lg border p-4"
          >
            <div class="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div class="space-y-1">
                <p class="font-medium">
                  {{ config.name }}
                  <span
                    v-if="config.isDefault"
                    class="ml-2 rounded bg-secondary px-2 py-0.5 text-xs text-secondary-foreground"
                  >
                    {{ t("settings.ai.labels.default") }}
                  </span>
                </p>
                <p class="text-sm text-muted-foreground">
                  {{ getProviderLabel(config.provider) }} / {{ config.model }}
                </p>
                <p class="text-xs text-muted-foreground">
                  {{ t("settings.ai.labels.currentKey") }}: {{ config.apiKey }}
                </p>
              </div>

              <div class="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  :disabled="config.isDefault || isRowBusy(config.id)"
                  @click="handleSetDefault(config.id)"
                >
                  {{ rowSettingDefaultByConfigId[config.id] ? t("settings.ai.actions.setting") : t("settings.ai.actions.setDefault") }}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  :disabled="isRowBusy(config.id)"
                  :aria-label="t('settings.ai.actions.deleteAria', { name: config.name })"
                  @click="openDeleteDialog(config.id)"
                >
                  {{ t("common.actions.delete") }}
                </Button>
              </div>
            </div>

            <div
              v-if="draftByConfigId[config.id]"
              class="grid gap-4 border-t pt-4 md:grid-cols-2"
            >
              <div class="space-y-2">
                <label class="text-sm font-medium" :for="`profile-name-${config.id}`">{{ t("auth.common.name") }}</label>
                <Input :id="`profile-name-${config.id}`" v-model="draftByConfigId[config.id].name" />
              </div>

              <div class="space-y-2">
                <label class="text-sm font-medium" :for="`profile-model-${config.id}`">{{ t("settings.ai.labels.model") }}</label>
                <Select
                  :model-value="draftByConfigId[config.id].model"
                  @update:model-value="(value) => (draftByConfigId[config.id].model = String(value ?? ''))"
                  @update:open="(open) => handleConfigModelSelectOpen(config.id, open)"
                >
                  <SelectTrigger :id="`profile-model-${config.id}`" class="w-full">
                    <SelectValue
                      :placeholder="
                        isLoadingModelOptionsByConfigId[config.id]
                          ? t('settings.ai.labels.loadingModels')
                          : t('settings.ai.labels.selectModel')
                      "
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="model in getModelOptionsForConfig(config.id)"
                      :key="model"
                      :value="model"
                    >
                      {{ model }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-2">
                <label class="text-sm font-medium" :for="`profile-base-url-${config.id}`">{{ t("settings.ai.labels.baseUrl") }}</label>
                <Input
                  :id="`profile-base-url-${config.id}`"
                  v-model="draftByConfigId[config.id].baseUrl"
                  :placeholder="t('settings.ai.labels.useProviderDefault')"
                />
              </div>

              <div class="space-y-2">
                <label class="text-sm font-medium" :for="`profile-api-key-${config.id}`">
                  {{ t("settings.ai.labels.newApiKey") }}
                </label>
                <Input
                  :id="`profile-api-key-${config.id}`"
                  v-model="draftByConfigId[config.id].apiKey"
                  type="password"
                  :placeholder="t('settings.ai.labels.keepCurrentKey')"
                />
              </div>
            </div>

            <p v-if="rowErrorByConfigId[config.id]" aria-live="polite" class="text-sm text-destructive">
              {{ rowErrorByConfigId[config.id] }}
            </p>

            <div class="flex justify-end border-t pt-3">
              <Button
                size="sm"
                :disabled="isRowBusy(config.id)"
                @click="handleSaveConfig(config.id)"
              >
                {{ rowPendingByConfigId[config.id] ? t("settings.ai.actions.saving") : t("settings.ai.actions.saveChanges") }}
              </Button>
            </div>
          </div>
        </CardContent>
    </Card>

    <AlertDialog
      :open="isCreateDialogOpen"
      @update:open="handleCreateDialogToggle"
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ t("settings.ai.dialogs.createTitle") }}</AlertDialogTitle>
          <AlertDialogDescription>
            {{ t("settings.ai.dialogs.createDescription") }}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium" for="create-profile-name">{{ t("auth.common.name") }}</label>
            <Input id="create-profile-name" v-model="createForm.name" :placeholder="t('settings.ai.labels.mainOpenAi')" />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium" for="create-profile-provider">{{ t("settings.ai.labels.provider") }}</label>
            <Select
              :model-value="createForm.provider"
              @update:model-value="(value) => (createForm.provider = String(value) as Provider)"
            >
              <SelectTrigger id="create-profile-provider" class="w-full">
                <SelectValue :placeholder="t('settings.ai.labels.selectProvider')" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="provider in providers"
                  :key="provider"
                  :value="provider"
                >
                  {{ t(getProviderConfig(provider).labelKey) }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium" for="create-profile-model">{{ t("settings.ai.labels.model") }}</label>
            <Select
              :model-value="createForm.model"
              @update:model-value="(value) => (createForm.model = String(value ?? ''))"
              @update:open="handleCreateModelSelectOpen"
            >
              <SelectTrigger id="create-profile-model" class="w-full">
                <SelectValue
                  :placeholder="isLoadingCreateModels ? t('settings.ai.labels.loadingModels') : t('settings.ai.labels.selectToLoadModels')"
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="model in modelOptionsForCreate"
                  :key="model"
                  :value="model"
                >
                  {{ model }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium" for="create-profile-api-key">
              {{ t("settings.ai.labels.apiKey") }}
              <span v-if="!isApiKeyRequired" class="text-muted-foreground">({{ t("settings.ai.labels.optional") }})</span>
            </label>
            <Input
              id="create-profile-api-key"
              v-model="createForm.apiKey"
              type="password"
              placeholder="sk-..."
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium" for="create-profile-base-url">{{ t("settings.ai.labels.baseUrl") }}</label>
            <Input
              id="create-profile-base-url"
              v-model="createForm.baseUrl"
              :disabled="!canCustomizeBaseUrl"
              :placeholder="currentProviderConfig.defaultBaseUrl"
            />
            <p class="text-xs text-muted-foreground">
              {{ t("settings.ai.labels.defaultPrefix") }}: {{ currentProviderConfig.defaultBaseUrl }}
              <span v-if="canCustomizeBaseUrl">({{ t("settings.ai.labels.canCustomizeByok") }})</span>
              <span v-else>({{ t("settings.ai.labels.managedAutomatically") }})</span>
            </p>
          </div>

          <p v-if="fetchCreateModelsError" aria-live="polite" class="text-xs text-destructive">
            {{ fetchCreateModelsError }}
          </p>
          <p v-if="createError" aria-live="polite" class="text-sm text-destructive">
            {{ createError }}
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel :disabled="createMutation.isPending.value">
            {{ t("common.actions.cancel") }}
          </AlertDialogCancel>
          <Button :disabled="createMutation.isPending.value" @click="handleCreate">
            {{ createMutation.isPending.value ? t("settings.ai.actions.creating") : t("settings.ai.actions.createProfile") }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog
      :open="Boolean(deleteDialogConfigId)"
      @update:open="handleDeleteDialogToggle"
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{{ t("settings.ai.dialogs.deleteTitle") }}</AlertDialogTitle>
          <AlertDialogDescription>
            <span v-if="selectedDeleteConfig">
              {{ t("settings.ai.dialogs.deleteDescriptionWithName", { name: selectedDeleteConfig.name }) }}
            </span>
            <span v-else>
              {{ t("settings.ai.dialogs.cannotUndo") }}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="deleteDialogConfigId ? rowDeletingByConfigId[deleteDialogConfigId] : false">
            {{ t("common.actions.cancel") }}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            :disabled="deleteDialogConfigId ? rowDeletingByConfigId[deleteDialogConfigId] : false"
            @click="confirmDeleteConfig"
          >
            {{
              deleteDialogConfigId && rowDeletingByConfigId[deleteDialogConfigId]
                ? t("settings.ai.actions.deleting")
                : t("settings.ai.actions.deleteProfile")
            }}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
</template>
