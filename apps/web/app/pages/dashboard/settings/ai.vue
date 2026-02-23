<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { reactive, ref } from "vue";

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

const handleCreate = async () => {
  createError.value = "";
  await createMutation.mutateAsync({
    name: createForm.name.trim(),
    provider: createForm.provider,
    model: createForm.model.trim(),
    apiKey: createForm.apiKey.trim(),
    ...(createForm.baseUrl.trim() ? { baseUrl: createForm.baseUrl.trim() } : {}),
  });
};

const handleSetDefault = async (id: string) => {
  await updateMutation.mutateAsync({
    id,
    isDefault: true,
  });
};

const handleDelete = async (id: string) => {
  await deleteMutation.mutateAsync({ id });
};
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
          <Input id="model" v-model="createForm.model" placeholder="gpt-4.1-mini" />
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium" for="api-key">API key</label>
          <Input id="api-key" v-model="createForm.apiKey" type="password" placeholder="sk-..." />
        </div>
        <div class="space-y-1">
          <label class="text-sm font-medium" for="base-url">Base URL (optional)</label>
          <Input id="base-url" v-model="createForm.baseUrl" placeholder="https://api.openai.com/v1" />
        </div>
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
        </div>
      </CardContent>
    </Card>
  </div>
</template>
