<script setup lang="ts">
import type { LucideIcon } from "lucide-vue-next"
import { Plus } from "lucide-vue-next"

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

type NavProjectsItem = {
  id: string
  title: string
  icon?: LucideIcon
  to?: string
  badge?: number
}

const props = withDefaults(defineProps<{
  groupLabel: string
  items: NavProjectsItem[]
  mode?: "link" | "action"
}>(), {
  mode: "link",
})

const emit = defineEmits<{
  select: [item: NavProjectsItem]
}>()

const handleSelect = (item: NavProjectsItem) => {
  if (props.mode !== "action") {
    return
  }
  emit("select", item)
}
</script>

<template>
  <SidebarGroup>
    <SidebarGroupLabel>{{ groupLabel }}</SidebarGroupLabel>
    <SidebarMenu>
      <SidebarMenuItem v-for="item in items" :key="item.id">
        <SidebarMenuButton
          v-if="mode === 'action'"
          class="justify-between"
          @click.prevent="handleSelect(item)"
        >
          <div class="flex min-w-0 items-center gap-2">
            <component :is="item.icon ?? Plus" />
            <span class="truncate">{{ item.title }}</span>
          </div>
          <Plus class="size-4 shrink-0" />
        </SidebarMenuButton>
        <SidebarMenuButton v-else as-child>
          <NuxtLink :to="item.to ?? '#'">
            <component :is="item.icon ?? Plus" />
            <span>{{ item.title }}</span>
          </NuxtLink>
        </SidebarMenuButton>
        <SidebarMenuBadge v-if="typeof item.badge === 'number' && item.badge > 0">
          {{ item.badge }}
        </SidebarMenuBadge>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarGroup>
</template>
