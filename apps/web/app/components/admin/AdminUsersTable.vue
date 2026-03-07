<script setup lang="ts">
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AdminUserListItem = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: "USER" | "ADMIN";
  status: "ACTIVE" | "SUSPENDED";
  createdAt: Date | string;
  feedCount: number;
  subscription: {
    tier: "free" | "basic" | "pro" | "max";
    status: string;
    billingInterval: "monthly" | "yearly" | null;
    expiresAt: Date | string | null;
  };
};

const props = defineProps<{
  items: AdminUserListItem[];
  isLoading: boolean;
  errorMessage: string;
  hasMore: boolean;
  selectedUserId: string | null;
}>();

const emit = defineEmits<{
  select: [userId: string];
}>();

const loadingRowKeys = [1, 2, 3];

const formatDateTime = (value: Date | string | null) => {
  if (!value) {
    return "—";
  }

  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString();
};

const formatSubscription = (item: AdminUserListItem) => {
  const tier = item.subscription.tier.toUpperCase();

  if (item.subscription.billingInterval) {
    return `${tier} · ${item.subscription.billingInterval}`;
  }

  return tier;
};

const roleBadgeVariant = (role: AdminUserListItem["role"]) =>
  role === "ADMIN" ? "default" : "secondary";

const statusBadgeClass = (status: AdminUserListItem["status"]) =>
  status === "SUSPENDED"
    ? "border-destructive/30 bg-destructive/10 text-destructive"
    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300";

const avatarFallback = (name: string) =>
  name
    .split(" ")
    .map((part) => part[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
</script>

<template>
  <div class="space-y-3">
    <div class="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Subscription</TableHead>
            <TableHead>Feeds</TableHead>
            <TableHead>Created</TableHead>
            <TableHead class="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="isLoading">
            <TableRow v-for="row in loadingRowKeys" :key="row">
              <TableCell>
                <div class="flex min-w-0 items-center gap-3">
                  <Skeleton class="size-9 rounded-full" />
                  <div class="min-w-0 space-y-2">
                    <Skeleton class="h-4 w-28" />
                    <Skeleton class="h-3 w-40" />
                  </div>
                </div>
              </TableCell>
              <TableCell><Skeleton class="h-5 w-16 rounded-full" /></TableCell>
              <TableCell><Skeleton class="h-5 w-20 rounded-full" /></TableCell>
              <TableCell>
                <div class="space-y-2">
                  <Skeleton class="h-4 w-24" />
                  <Skeleton class="h-3 w-32" />
                </div>
              </TableCell>
              <TableCell><Skeleton class="h-4 w-10" /></TableCell>
              <TableCell><Skeleton class="h-4 w-32" /></TableCell>
              <TableCell class="text-right"><Skeleton class="ml-auto h-8 w-16" /></TableCell>
            </TableRow>
          </template>
          <TableRow v-else-if="errorMessage">
            <TableCell :colspan="7" class="py-8 text-center text-sm text-destructive">
              {{ errorMessage }}
            </TableCell>
          </TableRow>
          <TableRow v-else-if="items.length === 0">
            <TableCell :colspan="7" class="py-8 text-center text-sm text-muted-foreground">
              No users match the current filters. Adjust role, status, or plan filters to widen the result.
            </TableCell>
          </TableRow>
          <TableRow
            v-for="item in items"
            v-else
            :key="item.id"
            :class="selectedUserId === item.id ? 'bg-muted/40' : undefined"
          >
            <TableCell>
              <div class="flex min-w-0 items-center gap-3">
                <Avatar class="size-9 border">
                  <AvatarImage v-if="item.image" :src="item.image" :alt="item.name" />
                  <AvatarFallback>{{ avatarFallback(item.name) }}</AvatarFallback>
                </Avatar>
                <div class="min-w-0">
                  <p class="truncate font-medium">{{ item.name }}</p>
                  <p class="truncate text-xs text-muted-foreground">{{ item.email }}</p>
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge :variant="roleBadgeVariant(item.role)">{{ item.role }}</Badge>
            </TableCell>
            <TableCell>
              <Badge variant="outline" :class="statusBadgeClass(item.status)">{{ item.status }}</Badge>
            </TableCell>
            <TableCell>
              <div class="space-y-1">
                <p class="text-sm font-medium">{{ formatSubscription(item) }}</p>
                <p class="text-xs text-muted-foreground">
                  {{ item.subscription.status }} · expires {{ formatDateTime(item.subscription.expiresAt) }}
                </p>
              </div>
            </TableCell>
            <TableCell class="text-sm text-muted-foreground">{{ item.feedCount }}</TableCell>
            <TableCell class="text-sm text-muted-foreground">
              {{ formatDateTime(item.createdAt) }}
            </TableCell>
            <TableCell class="text-right">
              <Button variant="outline" size="sm" @click="emit('select', item.id)">
                Details
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <p v-if="hasMore" class="text-xs text-muted-foreground">
      More users are available. Refine filters to narrow the result set.
    </p>
  </div>
</template>
