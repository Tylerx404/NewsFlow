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
      <p class="text-sm font-medium">User</p>
      <Input
        :model-value="props.userQuery"
        placeholder="Search name or email"
        @update:model-value="(value) => emit('update:userQuery', String(value))"
      />
    </div>

    <div class="space-y-2">
      <p class="text-sm font-medium">Provider</p>
      <Input
        :model-value="props.provider"
        placeholder="openai, anthropic..."
        @update:model-value="(value) => emit('update:provider', String(value))"
      />
    </div>

    <div class="space-y-2">
      <p class="text-sm font-medium">Model</p>
      <Input
        :model-value="props.model"
        placeholder="gpt-4.1..."
        @update:model-value="(value) => emit('update:model', String(value))"
      />
    </div>

    <div class="space-y-2">
      <p class="text-sm font-medium">Status</p>
      <Select
        :model-value="props.status"
        @update:model-value="(value) => emit('update:status', String(value) as AiUsageStatusFilter)"
      >
        <SelectTrigger class="w-full">
          <SelectValue placeholder="All statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          <SelectItem value="SUCCESS">Success</SelectItem>
          <SelectItem value="FAILED">Failed</SelectItem>
        </SelectContent>
      </Select>
    </div>

    <div class="space-y-2">
      <p class="text-sm font-medium">From</p>
      <Input
        type="datetime-local"
        :model-value="props.startedAt"
        @update:model-value="(value) => emit('update:startedAt', String(value))"
      />
    </div>

    <div class="space-y-2">
      <p class="text-sm font-medium">To</p>
      <Input
        type="datetime-local"
        :model-value="props.endedAt"
        @update:model-value="(value) => emit('update:endedAt', String(value))"
      />
    </div>
  </div>
</template>
