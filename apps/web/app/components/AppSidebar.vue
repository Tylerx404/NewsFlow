<script setup lang="ts">
import {
  Compass,
  LayoutDashboard,
  Plus,
  Rss,
  Settings,
  Sparkles,
  UserCircle,
} from "lucide-vue-next";
import { computed, ref } from "vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { dashboardQueryKeys } from "@/lib/dashboard-query-keys";

const { $authClient, $orpc } = useNuxtApp();
const route = useRoute();
const queryClient = useQueryClient();

const addFeedUrl = ref("");
const addFeedError = ref("");

const sessionQuery = useQuery({
  queryKey: dashboardQueryKeys.auth.sessionSummary(),
  queryFn: async () => {
    const { data } = await $authClient.getSession();
    if (!data?.user) {
      return null;
    }

    return {
      name: data.user.name,
      email: data.user.email,
    };
  },
});

const user = computed(() => sessionQuery.data.value ?? null);

const sidebarFeedsQuery = useQuery(
  computed(() =>
    $orpc.feed.listSidebar.queryOptions({
      input: { includeInactive: true },
      queryKey: dashboardQueryKeys.feeds.sidebar(true),
    })
  )
);

const discoverFeedsQuery = useQuery(
  $orpc.feed.discover.queryOptions({
    input: {},
    queryKey: dashboardQueryKeys.feeds.discover(),
  })
);

const normalizeFeedUrl = (url: string) =>
  url.trim().replace(/\/+$/, "").toLowerCase();

const activeSidebarFeeds = computed(() =>
  (sidebarFeedsQuery.data.value ?? []).filter((feed) => feed.isActive)
);

const discoverFeeds = computed(() => {
  const existingFeedUrls = new Set(
    (sidebarFeedsQuery.data.value ?? []).map((feed) => normalizeFeedUrl(feed.url))
  );

  return (discoverFeedsQuery.data.value ?? [])
    .filter((item) => !existingFeedUrls.has(normalizeFeedUrl(item.url)))
    .slice(0, 6);
});

const addFeedMutation = useMutation(
  $orpc.feed.create.mutationOptions({
    onSuccess: async () => {
      addFeedUrl.value = "";
      addFeedError.value = "";
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root() }),
      ]);
    },
    onError: (error) => {
      addFeedError.value =
        error instanceof Error ? error.message : "Unable to add feed.";
    },
  })
);

const isRouteActive = (path: string) => {
  if (path === "/dashboard") {
    return route.path === "/dashboard";
  }
  return route.path.startsWith(path);
};

const handleAddFeed = async () => {
  addFeedError.value = "";
  const trimmedUrl = addFeedUrl.value.trim();
  if (!trimmedUrl) {
    return;
  }
  await addFeedMutation.mutateAsync({ url: trimmedUrl });
};

const handleSubscribeDiscover = async (url: string) => {
  addFeedError.value = "";
  await addFeedMutation.mutateAsync({ url });
};

const handleSignOut = async () => {
  await $authClient.signOut();
  await navigateTo("/login");
};
</script>

<template>
  <Sidebar variant="inset">
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton as-child size="lg">
            <NuxtLink to="/dashboard">
              <div class="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <Rss class="size-4" />
              </div>
              <div class="grid flex-1 text-left text-sm leading-tight">
                <span class="truncate font-medium">NewsFlow</span>
                <span class="truncate text-xs">Personal AI RSS</span>
              </div>
            </NuxtLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <form class="space-y-2 p-2" @submit.prevent="handleAddFeed">
        <Input
          v-model="addFeedUrl"
          type="url"
          placeholder="https://example.com/rss.xml"
          :disabled="addFeedMutation.isPending.value"
        />
        <Button
          type="submit"
          size="sm"
          class="w-full justify-start gap-2"
          :disabled="addFeedMutation.isPending.value"
        >
          <Plus class="size-4" />
          Add feed
        </Button>
        <p v-if="addFeedError" class="text-xs text-destructive">
          {{ addFeedError }}
        </p>
      </form>
    </SidebarHeader>

    <SidebarContent>
      <SidebarGroup>
        <SidebarGroupLabel>Navigation</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton as-child :data-active="isRouteActive('/dashboard')">
                <NuxtLink to="/dashboard">
                  <LayoutDashboard />
                  <span>Dashboard</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton as-child :data-active="isRouteActive('/dashboard/settings')">
                <NuxtLink to="/dashboard/settings/personal">
                  <Settings />
                  <span>Settings</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Your feeds</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu v-if="activeSidebarFeeds.length">
            <SidebarMenuItem
              v-for="feed in activeSidebarFeeds"
              :key="feed.id"
            >
              <SidebarMenuButton as-child>
                <NuxtLink :to="`/dashboard/feed/${feed.id}`">
                  <Rss />
                  <span>{{ feed.title }}</span>
                </NuxtLink>
              </SidebarMenuButton>
              <SidebarMenuBadge v-if="feed.unreadCount > 0">
                {{ feed.unreadCount }}
              </SidebarMenuBadge>
            </SidebarMenuItem>
          </SidebarMenu>
          <p
            v-else-if="sidebarFeedsQuery.isLoading.value"
            class="px-2 py-1 text-xs text-muted-foreground"
          >
            Loading feeds...
          </p>
          <p v-else class="px-2 py-1 text-xs text-muted-foreground">
            No feeds yet. Add your first RSS feed above.
          </p>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup>
        <SidebarGroupLabel>Discover</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu v-if="discoverFeeds.length">
            <SidebarMenuItem
              v-for="item in discoverFeeds"
              :key="item.url"
            >
              <SidebarMenuButton
                class="justify-between"
                @click.prevent="handleSubscribeDiscover(item.url)"
              >
                <div class="flex items-center gap-2 truncate">
                  <Compass />
                  <span class="truncate">{{ item.title }}</span>
                </div>
                <Plus class="size-4 shrink-0" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
          <p v-else class="px-2 py-1 text-xs text-muted-foreground">
            All suggested feeds are already added.
          </p>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarGroup class="mt-auto">
        <SidebarGroupLabel>Settings</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton as-child>
                <NuxtLink to="/dashboard/settings/personal">
                  <UserCircle />
                  <span>Personal</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton as-child>
                <NuxtLink to="/dashboard/settings/ai">
                  <Sparkles />
                  <span>AI Profiles</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton as-child>
                <NuxtLink to="/dashboard/settings/feeds">
                  <Rss />
                  <span>Feed Management</span>
                </NuxtLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </SidebarContent>

    <SidebarFooter>
      <div class="space-y-2 rounded-lg border p-3 text-sm">
        <p class="font-medium">{{ user?.name ?? "NewsFlow User" }}</p>
        <p class="truncate text-xs text-muted-foreground">
          {{ user?.email ?? "Loading..." }}
        </p>
        <Button
          variant="outline"
          size="sm"
          class="w-full"
          @click="handleSignOut"
        >
          Log out
        </Button>
      </div>
    </SidebarFooter>
  </Sidebar>
</template>
