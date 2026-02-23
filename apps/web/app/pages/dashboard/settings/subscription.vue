<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { dashboardQueryKeys } from "@/lib/dashboard-query-keys";

definePageMeta({
  layout: "dashboard",
  middleware: "dashboard-auth",
  title: "Subscription",
});

const { $orpc } = useNuxtApp();

const subscriptionQuery = useQuery(
  $orpc.subscription.getCurrent.queryOptions({
    queryKey: dashboardQueryKeys.subscription.current(),
  })
);
</script>

<template>
  <div class="mx-auto w-full max-w-3xl space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Current plan</CardTitle>
        <CardDescription>
          Billing integration is not enabled yet. This page is read-only.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p v-if="subscriptionQuery.isLoading.value" class="text-sm text-muted-foreground">
          Loading subscription...
        </p>
        <div v-else-if="subscriptionQuery.data.value" class="space-y-4">
          <div class="flex flex-wrap items-center gap-3">
            <Badge variant="outline">Tier: {{ subscriptionQuery.data.value.tier }}</Badge>
            <Badge variant="outline">Status: {{ subscriptionQuery.data.value.status }}</Badge>
          </div>
          <div class="grid gap-3 md:grid-cols-2">
            <div class="rounded-md border p-3">
              <p class="text-xs text-muted-foreground">Expires at</p>
              <p class="text-sm font-medium">
                {{
                  subscriptionQuery.data.value.expiresAt
                    ? new Date(subscriptionQuery.data.value.expiresAt).toLocaleString()
                    : "No expiration"
                }}
              </p>
            </div>
            <div class="rounded-md border p-3">
              <p class="text-xs text-muted-foreground">Updated at</p>
              <p class="text-sm font-medium">
                {{ new Date(subscriptionQuery.data.value.updatedAt).toLocaleString() }}
              </p>
            </div>
          </div>
          <div class="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Billing and payment actions are coming soon.
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
