<script setup lang="ts">
import type { LucideIcon } from "lucide-vue-next"
import { MoreHorizontal, Plus } from "lucide-vue-next"
import { ref } from "vue"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenuAction,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

const { t } = useI18n()

type NavProjectsItemAction = {
  id: string
  label: string
  icon?: LucideIcon
  variant?: "default" | "destructive"
  disabled?: boolean
}

type NavProjectsItem = {
  id: string
  title: string
  icon?: LucideIcon
  to?: string
  badge?: number
  actions?: NavProjectsItemAction[]
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
  itemAction: [payload: { item: NavProjectsItem; actionId: string }]
}>()

const { isMobile } = useSidebar()
const openActionsByItemId = ref<Record<string, boolean>>({})

const handleSelect = (item: NavProjectsItem) => {
  if (props.mode !== "action") {
    return
  }
  emit("select", item)
}

const handleItemAction = (item: NavProjectsItem, actionId: string) => {
  emit("itemAction", { item, actionId })
}

const setItemActionsOpen = (itemId: string, open: boolean) => {
  openActionsByItemId.value[itemId] = open
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
        <SidebarMenuBadge
          v-if="typeof item.badge === 'number' && item.badge > 0 && !openActionsByItemId[item.id]"
        >
          {{ item.badge }}
        </SidebarMenuBadge>
        <DropdownMenu
          v-if="mode === 'link' && item.actions?.length"
          :open="openActionsByItemId[item.id]"
          @update:open="(open) => setItemActionsOpen(item.id, open)"
        >
          <DropdownMenuTrigger as-child>
            <SidebarMenuAction
              show-on-hover
              class="group-focus-within/menu-item:opacity-0 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100"
            >
              <MoreHorizontal />
              <span class="sr-only">{{ t("shell.nav.moreActions") }}</span>
            </SidebarMenuAction>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            class="w-44 rounded-lg"
            :side="isMobile ? 'bottom' : 'right'"
            :align="isMobile ? 'end' : 'start'"
          >
            <DropdownMenuItem
              v-for="action in item.actions"
              :key="action.id"
              :variant="action.variant ?? 'default'"
              :disabled="action.disabled"
              @select="handleItemAction(item, action.id)"
            >
              <component :is="action.icon ?? MoreHorizontal" />
              <span>{{ action.label }}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  </SidebarGroup>
</template>
