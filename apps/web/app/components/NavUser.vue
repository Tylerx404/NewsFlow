<script setup lang="ts">
import {
  ChevronsUpDown,
  LogOut,
  MonitorCog,
  Moon,
  Sun,
  UserCircle,
} from "lucide-vue-next"
import { computed } from "vue"

import { useReadingPreferences } from "@/composables/use-reading-preferences"
import {
  isThemeMode,
  themeModeOptions,
} from "@/lib/reader-preferences"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'

const props = defineProps<{
  user: {
    name: string
    email: string
    avatar?: string | null
    plan?: string
  }
}>()

const emit = defineEmits<{
  signOut: []
}>()

const { isMobile } = useSidebar()
const readingPreferences = useReadingPreferences()

const avatarSrc = computed(() => {
  const raw = props.user.avatar
  if (typeof raw !== "string") {
    return null
  }

  const normalized = raw.trim()
  return normalized.length > 0 ? normalized : null
})

const avatarFallback = computed(() => {
  const trimmedName = props.user.name.trim()
  if (!trimmedName) {
    return "U"
  }

  return trimmedName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("")
})

const currentPlanLabel = computed(() => {
  const rawPlan = props.user.plan?.trim()
  if (!rawPlan) {
    return "FREE"
  }

  return rawPlan.toUpperCase()
})

const handleSignOut = () => {
  emit("signOut")
}

const handleThemeModeChange = (value: unknown) => {
  if (typeof value !== "string") {
    return
  }

  if (!isThemeMode(value)) {
    return
  }

  readingPreferences.value.themeMode = value
}
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <SidebarMenuButton
            size="lg"
            class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
          >
            <Avatar class="h-8 w-8 rounded-lg">
              <AvatarImage v-if="avatarSrc" :src="avatarSrc" :alt="user.name" />
              <AvatarFallback class="rounded-lg">
                {{ avatarFallback }}
              </AvatarFallback>
            </Avatar>
            <div class="grid flex-1 text-left text-sm leading-tight">
              <span class="truncate font-medium">{{ user.name }}</span>
              <span class="truncate text-xs">{{ user.email }}</span>
              <div class="mt-1">
                <span class="inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-none tracking-wide">
                  {{ currentPlanLabel }}
                </span>
              </div>
            </div>
            <ChevronsUpDown class="ml-auto size-4" />
          </SidebarMenuButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          class="w-[--reka-dropdown-menu-trigger-width] min-w-56 rounded-lg"
          :side="isMobile ? 'bottom' : 'right'"
          align="end"
          :side-offset="4"
        >
          <DropdownMenuLabel class="p-0 font-normal">
            <div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar class="h-8 w-8 rounded-lg">
                <AvatarImage v-if="avatarSrc" :src="avatarSrc" :alt="user.name" />
                <AvatarFallback class="rounded-lg">
                  {{ avatarFallback }}
                </AvatarFallback>
              </Avatar>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-semibold">{{ user.name }}</span>
                <span class="truncate text-xs">{{ user.email }}</span>
                <div class="mt-1">
                  <span class="inline-flex rounded-md border px-1.5 py-0.5 text-[10px] font-semibold leading-none tracking-wide">
                    {{ currentPlanLabel }}
                  </span>
                </div>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem as-child>
              <NuxtLink to="/settings/personal">
                <UserCircle />
                Personal Settings
              </NuxtLink>
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuLabel class="px-2 py-1 text-xs text-muted-foreground">
              Appearance
            </DropdownMenuLabel>
            <DropdownMenuRadioGroup
              :model-value="readingPreferences.themeMode"
              @update:model-value="handleThemeModeChange"
            >
              <DropdownMenuRadioItem
                v-for="modeOption in themeModeOptions"
                :key="modeOption.value"
                :value="modeOption.value"
                :title="modeOption.description"
              >
                <MonitorCog v-if="modeOption.value === 'system'" />
                <Sun v-else-if="modeOption.value === 'light'" />
                <Moon v-else />
                {{ modeOption.label }}
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem @select="handleSignOut">
            <LogOut />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  </SidebarMenu>
</template>
