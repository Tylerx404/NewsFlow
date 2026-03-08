<script setup lang="ts">
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type AiUsageStatusFilter = "all" | "SUCCESS" | "FAILED";

const { t } = useI18n();

const props = defineProps<{
  provider: string;
  model: string;
  status: AiUsageStatusFilter;
  userQuery: string;
  startedAt: string;
  endedAt: string;
}>();

const emit = defineEmits<{
  "update:provider": [value: string];
  "update:model": [value: string];
  "update:status": [value: AiUsageStatusFilter];
  "update:userQuery": [value: string];
  "update:startedAt": [value: string];
  "update:endedAt": [value: string];
}>();
</script>

<template>
  <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
    <div class="space-y-2 xl:col-span-2">
      <p class="text-sm font-medium">{{ t("admin.aiUsage.filters.user.label") }}</p>
      <Input
        :model-value="props.userQuery"
        :placeholder="t('admin.aiUsage.filters.user.placeholder')"
        @update:model-value="(value) => emit('update:userQuery', String(value))"
      />
    </div>

    <div class="space-y-2">
      <p class="text-sm font-medium">{{ t("admin.aiUsage.filters.provider.label") }}</p>
      <Input
        :model-value="props.provider"
        :placeholder="t('admin.aiUsage.filters.provider.placeholder')"
        @update:model-value="(value) => emit('update:provider', String(value))"
      />
    </div>

    <div class="space-y-2">
      <p class="text-sm font-medium">{{ t("admin.aiUsage.filters.model.label") }}</p>
      <Input
        :model-value="props.model"
        :placeholder="t('admin.aiUsage.filters.model.placeholder')"
        @update:model-value="(value) => emit('update:model', String(value))"
      />
    </div>

    <div class="space-y-2">
      <p class="text-sm font-medium">{{ t("admin.aiUsage.filters.status.label") }}</p>
      <Select
        :model-value="props.status"
        @update:model-value="(value) => emit('update:status', String(value) as AiUsageStatusFilter)"
      >
        <SelectTrigger class="w-full">
          <SelectValue :placeholder="t('admin.aiUsage.filters.status.all')" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{{ t("admin.aiUsage.filters.status.all") }}</SelectItem>
          <SelectItem value="SUCCESS">{{ t("admin.common.eventStatus.success") }}</SelectItem>
          <SelectItem value="FAILED">{{ t("admin.common.eventStatus.failed") }}</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div class="space-y-2">
      <p class="text-sm font-medium">{{ t("admin.aiUsage.filters.from") }}</p>
      <Input
        type="datetime-local"
        :model-value="props.startedAt"
        @update:model-value="(value) => emit('update:startedAt', String(value))"
      />
    </div>

    <div class="space-y-2">
      <p class="text-sm font-medium">{{ t("admin.aiUsage.filters.to") }}</p>
      <Input
        type="datetime-local"
        :model-value="props.endedAt"
        @update:model-value="(value) => emit('update:endedAt', String(value))"
      />
    </div>
  </div>
</template>
