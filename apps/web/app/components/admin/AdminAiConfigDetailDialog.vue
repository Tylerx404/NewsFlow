<script setup lang="ts">
import { computed, ref, watch } from "vue";

import AdminActionConfirmDialog from "@/components/admin/AdminActionConfirmDialog.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";

type AdminAiConfigListItem = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  name: string;
  provider: string;
  model: string;
  baseUrl: string | null;
  isDefault: boolean;
  isEnabled: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
};

const props = defineProps<{
  open: boolean;
  isLoading: boolean;
  loadError: string;
  actionPending: boolean;
  actionError: string;
  configs: AdminAiConfigListItem[];
}>();

const emit = defineEmits<{
  "update:open": [open: boolean];
  toggleEnabled: [payload: { aiConfigId: string; isEnabled: boolean }];
}>();

const selectedConfigId = ref("");
const confirmOpen = ref(false);

watch(
  () => [props.open, props.configs],
  () => {
    if (!props.open) {
      return;
    }

    if (
      selectedConfigId.value &&
      props.configs.some((config) => config.id === selectedConfigId.value)
    ) {
      return;
    }

    selectedConfigId.value = props.configs[0]?.id ?? "";
  },
  { immediate: true, deep: true }
);

const selectedConfig = computed(
  () => props.configs.find((config) => config.id === selectedConfigId.value) ?? null
);

const formatDateTime = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString();
};

const requestToggle = () => {
  if (!selectedConfig.value) {
    return;
  }

  confirmOpen.value = true;
};

const handleConfirmToggle = () => {
  confirmOpen.value = false;

  if (!selectedConfig.value) {
    return;
  }

  emit("toggleEnabled", {
    aiConfigId: selectedConfig.value.id,
    isEnabled: !selectedConfig.value.isEnabled,
  });
};
</script>

<template>
  <Sheet :open="open" @update:open="(value) => emit('update:open', value)">
    <SheetContent class="sm:max-w-xl">
      <SheetHeader>
        <SheetTitle>AI config controls</SheetTitle>
        <SheetDescription>
          Review config ownership and toggle individual configs.
        </SheetDescription>
      </SheetHeader>

      <div class="flex h-full flex-col gap-4 overflow-y-auto pr-1">
        <p v-if="loadError" class="text-sm text-destructive">
          {{ loadError }}
        </p>

        <template v-if="isLoading">
          <Card>
            <CardHeader>
              <Skeleton class="h-5 w-32" />
              <Skeleton class="h-4 w-56" />
            </CardHeader>
            <CardContent class="space-y-3">
              <Skeleton class="h-10 rounded-md" />
              <Skeleton class="h-24 rounded-md" />
              <Skeleton class="h-9 w-32 rounded-md" />
            </CardContent>
          </Card>
        </template>

        <div v-else-if="configs.length === 0" class="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
          No AI configs match the current filters.
        </div>

        <template v-else>
          <Card>
            <CardHeader>
              <CardTitle>Select config</CardTitle>
              <CardDescription>
                Choose a config to inspect and toggle.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                :model-value="selectedConfigId"
                @update:model-value="(value) => selectedConfigId = String(value)"
              >
                <SelectTrigger class="w-full">
                  <SelectValue placeholder="Select an AI config" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="config in configs"
                    :key="config.id"
                    :value="config.id"
                  >
                    {{ config.name }} · {{ config.provider }} / {{ config.model }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card v-if="selectedConfig">
            <CardHeader>
              <CardTitle>{{ selectedConfig.name }}</CardTitle>
              <CardDescription>{{ selectedConfig.provider }} / {{ selectedConfig.model }}</CardDescription>
            </CardHeader>
            <CardContent class="space-y-3">
              <div class="flex flex-wrap gap-2">
                <Badge variant="outline">
                  {{ selectedConfig.isEnabled ? "Enabled" : "Disabled" }}
                </Badge>
                <Badge v-if="selectedConfig.isDefault" variant="secondary">
                  Default
                </Badge>
              </div>

              <div class="rounded-md border p-3 text-sm">
                <p><span class="text-muted-foreground">Owner:</span> {{ selectedConfig.userName }} ({{ selectedConfig.userEmail }})</p>
                <p><span class="text-muted-foreground">Base URL:</span> {{ selectedConfig.baseUrl || "Default provider URL" }}</p>
                <p><span class="text-muted-foreground">Updated:</span> {{ formatDateTime(selectedConfig.updatedAt) }}</p>
              </div>

              <Button
                :variant="selectedConfig.isEnabled ? 'destructive' : 'default'"
                :disabled="actionPending"
                @click="requestToggle"
              >
                {{
                  actionPending
                    ? "Updating..."
                    : selectedConfig.isEnabled
                      ? "Disable config"
                      : "Enable config"
                }}
              </Button>

              <p v-if="actionError" class="text-sm text-destructive">
                {{ actionError }}
              </p>
            </CardContent>
          </Card>
        </template>
      </div>
    </SheetContent>
  </Sheet>

  <AdminActionConfirmDialog
    :open="confirmOpen"
    :title="selectedConfig?.isEnabled ? 'Disable this AI config?' : 'Enable this AI config?'"
    :description="
      selectedConfig?.isEnabled
        ? `Disable ${selectedConfig.name}. Summarize requests using this config will be blocked.`
        : `Enable ${selectedConfig?.name}. Summarize requests can use this config again.`
    "
    :confirm-label="selectedConfig?.isEnabled ? 'Disable config' : 'Enable config'"
    :confirm-pending-label="'Updating...'"
    :confirm-variant="selectedConfig?.isEnabled ? 'destructive' : 'default'"
    :is-pending="actionPending"
    @update:open="(open) => { confirmOpen = open; }"
    @confirm="handleConfirmToggle"
  />
</template>
