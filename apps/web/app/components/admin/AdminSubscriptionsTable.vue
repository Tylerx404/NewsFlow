<script setup lang="ts">
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

type AdminSubscriptionRow = {
  userId: string;
  subscriptionId: string | null;
  name: string;
  email: string;
  tier: "free" | "basic" | "pro" | "max";
  status: string;
  billingInterval: "monthly" | "yearly" | null;
  cancelAtPeriodEnd: boolean;
  expiresAt: Date | string | null;
  currentPeriodStart: Date | string | null;
  currentPeriodEnd: Date | string | null;
  stripePriceId: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: Date | string;
  updatedAt: Date | string | null;
};

const props = defineProps<{
  items: AdminSubscriptionRow[];
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

const formatPlan = (item: AdminSubscriptionRow) => {
  const tier = item.tier.toUpperCase();

  if (item.billingInterval) {
    return `${tier} · ${item.billingInterval}`;
  }

  return tier;
};
</script>

<template>
  <div class="space-y-3">
    <div class="overflow-hidden rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Expires</TableHead>
            <TableHead>Stripe IDs</TableHead>
            <TableHead class="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <template v-if="isLoading">
            <TableRow v-for="row in loadingRowKeys" :key="row">
              <TableCell>
                <div class="space-y-2">
                  <Skeleton class="h-4 w-28" />
                  <Skeleton class="h-3 w-40" />
                </div>
              </TableCell>
              <TableCell>
                <div class="space-y-2">
                  <Skeleton class="h-4 w-24" />
                  <Skeleton class="h-3 w-28" />
                </div>
              </TableCell>
              <TableCell><Skeleton class="h-5 w-20 rounded-full" /></TableCell>
              <TableCell><Skeleton class="h-4 w-28" /></TableCell>
              <TableCell>
                <div class="space-y-2">
                  <Skeleton class="h-3 w-32" />
                  <Skeleton class="h-3 w-36" />
                </div>
              </TableCell>
              <TableCell class="text-right"><Skeleton class="ml-auto h-8 w-16" /></TableCell>
            </TableRow>
          </template>
          <TableRow v-else-if="errorMessage">
            <TableCell :colspan="6" class="py-8 text-center text-sm text-destructive">
              {{ errorMessage }}
            </TableCell>
          </TableRow>
          <TableRow v-else-if="items.length === 0">
            <TableCell :colspan="6" class="py-8 text-center text-sm text-muted-foreground">
              No subscriptions match the current filters. Adjust the billing filters to inspect a wider slice.
            </TableCell>
          </TableRow>
          <TableRow
            v-for="item in items"
            v-else
            :key="item.userId"
            :class="selectedUserId === item.userId ? 'bg-muted/40' : undefined"
          >
            <TableCell>
              <div class="min-w-0">
                <p class="truncate font-medium">{{ item.name }}</p>
                <p class="truncate text-xs text-muted-foreground">{{ item.email }}</p>
              </div>
            </TableCell>
            <TableCell>
              <div class="space-y-1">
                <p class="text-sm font-medium">{{ formatPlan(item) }}</p>
                <p class="text-xs text-muted-foreground">
                  Cancel at period end: {{ item.cancelAtPeriodEnd ? "Yes" : "No" }}
                </p>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{{ item.status }}</Badge>
            </TableCell>
            <TableCell class="text-sm text-muted-foreground">
              {{ formatDateTime(item.expiresAt) }}
            </TableCell>
            <TableCell>
              <div class="space-y-1 text-xs text-muted-foreground">
                <p>Customer: {{ item.stripeCustomerId || "—" }}</p>
                <p>Subscription: {{ item.stripeSubscriptionId || "—" }}</p>
              </div>
            </TableCell>
            <TableCell class="text-right">
              <Button variant="outline" size="sm" @click="emit('select', item.userId)">
                Edit
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <p v-if="hasMore" class="text-xs text-muted-foreground">
      More subscriptions are available. Narrow the filters to inspect a smaller slice.
    </p>
  </div>
</template>
