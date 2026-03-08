<script setup lang="ts">
import {
  Activity,
  Bot,
  Cog,
  Compass,
  CreditCard,
  LayoutDashboard,
  Newspaper,
  Plus,
  RefreshCw,
  Rss,
  Settings,
  SlidersHorizontal,
  Users,
  Trash2,
} from "lucide-vue-next";
import { computed, ref } from "vue";
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";

import NavMain from "@/components/NavMain.vue";
import NavProjects from "@/components/NavProjects.vue";
import NavUser from "@/components/NavUser.vue";
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
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { dashboardQueryKeys } from "@/lib/dashboard-query-keys";
import { getSettingsSections } from "@/lib/settings-sections";

type AdminCapableUser = {
  role?: string | null;
};

const { $authClient, $orpc } = useNuxtApp();
const route = useRoute();
const queryClient = useQueryClient();
const { t } = useI18n();

const addFeedUrl = ref("");
const addFeedError = ref("");
const feedActionError = ref("");

const sessionQuery = useQuery({
  queryKey: dashboardQueryKeys.auth.sessionSummary(),
  queryFn: async () => {
    const { data } = await $authClient.getSession();
    if (!data?.user) {
      return null;
    }

    const authUser = data.user as typeof data.user & AdminCapableUser;

    return {
      name: authUser.name,
      email: authUser.email,
      avatar: authUser.image,
      role: authUser.role ?? "USER",
    };
  },
});

const user = computed(() => sessionQuery.data.value ?? null);
const isAdmin = computed(() => user.value?.role === "ADMIN");
const sidebarUser = computed(() => ({
  name: user.value?.name ?? t("shell.user.defaultName"),
  email: user.value?.email ?? t("common.actions.loading"),
  avatar: user.value?.avatar ?? null,
  plan: sidebarPlan.value,
}));

const sidebarFeedsQuery = useQuery(
  computed(() =>
    $orpc.feedSubscription.listSidebar.queryOptions({
      input: { includeInactive: true },
      queryKey: dashboardQueryKeys.feedSubscriptions.sidebar(true),
    })
  )
);
const subscriptionQuery = useQuery(
  $orpc.subscription.getCurrent.queryOptions({
    queryKey: dashboardQueryKeys.subscription.current(),
  })
);

const sidebarPlan = computed(() => {
  if (subscriptionQuery.isLoading.value) {
    return "LOADING";
  }

  const tier = subscriptionQuery.data.value?.tier;
  if (tier === "basic" || tier === "pro" || tier === "max" || tier === "free") {
    return tier.toUpperCase();
  }

  return "FREE";
});

const discoverFeedsQuery = useQuery(
  $orpc.feedSubscription.discover.queryOptions({
    input: {},
    queryKey: dashboardQueryKeys.feedSubscriptions.discover(),
  })
);

const normalizeFeedUrl = (url: string) =>
  url.trim().replace(/\/+$/, "").toLowerCase();

const activeSidebarFeeds = computed(() =>
  (sidebarFeedsQuery.data.value ?? []).filter((feed) => feed.isActive)
);

const discoverFeeds = computed(() => {
  const existingFeedUrls = new Set(
    (sidebarFeedsQuery.data.value ?? []).map((feed) => feed.normalizedUrl)
  );

  return (discoverFeedsQuery.data.value ?? [])
    .filter((item) => !existingFeedUrls.has(normalizeFeedUrl(item.url)))
    .slice(0, 6);
});

const settingsSections = computed(() => getSettingsSections(t));

const defaultSettingsHref = computed(
  () => settingsSections.value[0]?.href ?? "/settings/personal"
);

const navigationItems = computed(() => [
  {
    title: t("shell.navigation.dashboard"),
    to: "/dashboard",
    icon: LayoutDashboard,
    isActive: isRouteActive("/dashboard"),
  },
  {
    title: t("shell.navigation.articles"),
    to: "/articles",
    icon: Newspaper,
    isActive: isRouteActive("/articles"),
  },
  {
    title: t("shell.navigation.settings"),
    to: defaultSettingsHref.value,
    icon: Settings,
    isActive: isRouteActive("/settings"),
    items: settingsSections.value.map((section) => ({
      title: section.label,
      to: section.href,
      isActive: isRouteActive(section.href),
    })),
  },
]);

const adminNavigationItems = computed(() => [
  {
    title: t("shell.navigation.operations"),
    to: "/admin/operations",
    icon: Activity,
    isActive: isRouteActive("/admin/operations"),
  },
  {
    title: t("shell.navigation.aiUsage"),
    to: "/admin/ai-usage",
    icon: Bot,
    isActive: isRouteActive("/admin/ai-usage"),
  },
  {
    title: t("shell.navigation.systemOps"),
    to: "/admin/system-ops",
    icon: Cog,
    isActive: isRouteActive("/admin/system-ops"),
  },
  {
    title: t("shell.navigation.users"),
    to: "/admin/users",
    icon: Users,
    isActive: isRouteActive("/admin/users"),
  },
  {
    title: t("shell.navigation.subscriptions"),
    to: "/admin/subscriptions",
    icon: CreditCard,
    isActive: isRouteActive("/admin/subscriptions"),
  },
  {
    title: t("shell.navigation.feeds"),
    to: "/admin/feeds",
    icon: Rss,
    isActive: isRouteActive("/admin/feeds"),
  },
]);

const discoverNavItems = computed(() =>
  discoverFeeds.value.map((item) => ({
    id: item.url,
    title: item.title,
    icon: Compass,
  }))
);

const addFeedMutation = useMutation(
  $orpc.feedSubscription.create.mutationOptions({
    onSuccess: async () => {
      addFeedUrl.value = "";
      addFeedError.value = "";
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root() }),
      ]);
    },
    onError: (error) => {
      addFeedError.value =
        error instanceof Error ? error.message : t("shell.errors.addFeed");
    },
  })
);

const refreshFeedMutation = useMutation(
  $orpc.feedSubscription.refresh.mutationOptions({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root() });
    },
  })
);

const deleteFeedMutation = useMutation(
  $orpc.feedSubscription.delete.mutationOptions({
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardQueryKeys.root() });
    },
  })
);

const isFeedActionPending = computed(
  () => refreshFeedMutation.isPending.value || deleteFeedMutation.isPending.value
);

const feedNavItems = computed(() =>
  activeSidebarFeeds.value.map((feed) => ({
    id: feed.id,
    title: feed.title,
    to: `/feeds/${feed.id}`,
    icon: Rss,
    badge: feed.unreadCount,
    actions: [
      {
        id: "refresh",
        label: t("shell.feed.actions.refreshNow"),
        icon: RefreshCw,
        disabled: isFeedActionPending.value,
      },
      {
        id: "manage",
        label: t("shell.feed.actions.manageFeeds"),
        icon: SlidersHorizontal,
      },
      {
        id: "remove",
        label: t("shell.feed.actions.removeFeed"),
        icon: Trash2,
        variant: "destructive" as const,
        disabled: isFeedActionPending.value,
      },
    ],
  }))
);

const isRouteActive = (path: string) => {
  if (path === "/dashboard") {
    return route.path === "/dashboard";
  }

  return route.path === path || route.path.startsWith(`${path}/`);
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

const handleFeedItemAction = async (payload: {
  item: { id: string; title: string };
  actionId: string;
}) => {
  feedActionError.value = "";

  if (payload.actionId === "manage") {
    await navigateTo("/settings/feeds");
    return;
  }

  if (payload.actionId === "refresh") {
    try {
      await refreshFeedMutation.mutateAsync({ id: payload.item.id });
    } catch (error) {
      feedActionError.value =
        error instanceof Error ? error.message : t("shell.errors.refreshFeed");
    }
    return;
  }

  if (payload.actionId === "remove") {
    if (import.meta.client) {
      const shouldRemove = window.confirm(
        t("shell.feed.confirm.remove", { title: payload.item.title })
      );
      if (!shouldRemove) {
        return;
      }
    }

    try {
      await deleteFeedMutation.mutateAsync({ id: payload.item.id });
    } catch (error) {
      feedActionError.value =
        error instanceof Error ? error.message : t("shell.errors.removeFeed");
    }
  }
};

const handleDiscoverSelect = async (item: { id: string }) => {
  await handleSubscribeDiscover(item.id);
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
                <span class="truncate font-medium">{{ t("app.name") }}</span>
                <span class="truncate text-xs">{{ t("app.tagline") }}</span>
              </div>
            </NuxtLink>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
      <form class="space-y-2 p-2" @submit.prevent="handleAddFeed">
        <Input
          v-model="addFeedUrl"
          type="url"
          :placeholder="t('shell.feed.inputPlaceholder')"
          :disabled="addFeedMutation.isPending.value"
        />
        <Button
          type="submit"
          size="sm"
          class="w-full justify-start gap-2"
          :disabled="addFeedMutation.isPending.value"
        >
          <Plus class="size-4" />
          {{ t("shell.feed.add") }}
        </Button>
        <p v-if="addFeedError" class="text-xs text-destructive">
          {{ addFeedError }}
        </p>
      </form>
    </SidebarHeader>

    <SidebarContent>
      <NavMain :label="t('shell.groups.navigation')" :items="navigationItems" />
      <NavMain v-if="isAdmin" :label="t('shell.groups.admin')" :items="adminNavigationItems" />

      <template v-if="feedNavItems.length">
        <NavProjects
          :group-label="t('shell.groups.yourFeeds')"
          mode="link"
          :items="feedNavItems"
          @item-action="handleFeedItemAction"
        />
        <p v-if="feedActionError" class="px-2 py-1 text-xs text-destructive">
          {{ feedActionError }}
        </p>
      </template>
      <SidebarGroup v-else>
        <SidebarGroupLabel>{{ t("shell.groups.yourFeeds") }}</SidebarGroupLabel>
        <SidebarGroupContent>
          <p
            v-if="sidebarFeedsQuery.isLoading.value"
            class="px-2 py-1 text-xs text-muted-foreground"
          >
            {{ t("shell.feed.loading") }}
          </p>
          <p v-else class="px-2 py-1 text-xs text-muted-foreground">
            {{ t("shell.feed.empty") }}
          </p>
        </SidebarGroupContent>
      </SidebarGroup>

      <NavProjects
        v-if="discoverNavItems.length"
        :group-label="t('shell.groups.discover')"
        mode="action"
        :items="discoverNavItems"
        @select="handleDiscoverSelect"
      />
      <SidebarGroup v-else>
        <SidebarGroupLabel>{{ t("shell.groups.discover") }}</SidebarGroupLabel>
        <SidebarGroupContent>
          <p class="px-2 py-1 text-xs text-muted-foreground">
            {{ t("shell.discover.empty") }}
          </p>
        </SidebarGroupContent>
      </SidebarGroup>

    </SidebarContent>

    <SidebarFooter>
      <NavUser :user="sidebarUser" @sign-out="handleSignOut" />
    </SidebarFooter>
  </Sidebar>
</template>
