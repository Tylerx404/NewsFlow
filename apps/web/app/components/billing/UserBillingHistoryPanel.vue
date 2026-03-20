<script setup lang="ts">
import { ExternalLink, FileDown } from "lucide-vue-next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useIntlLocale } from "@/composables/use-intl-locale";
import { useUserBillingHistory } from "@/composables/use-user-billing-history";

const errorBannerClass =
  "rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive";

const { t } = useI18n();
const intlLocale = useIntlLocale();
const {
  billingHistoryItems,
  billingHistoryQuery,
  historyPageSize,
  isStripeConfiguredForBillingHistory,
  invoicePageSizeOptions,
  updateHistoryPageSize,
} = useUserBillingHistory();

const formatInvoiceDate = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(intlLocale.value, {
    dateStyle: "medium",
  }).format(date);
};

const formatPeriodDate = (value: Date | string) => {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(intlLocale.value, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(date);
};

const formatInvoiceAmount = (amountInMinor: number, currency: string) =>
  new Intl.NumberFormat(intlLocale.value, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amountInMinor / 100);

const formatStatusLabel = (status: string) =>
  status
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const resolveBillingReasonLabel = (reason: string | null) => {
  switch (reason) {
    case "manual":
      return t("billingHistory.periods.manual");
    case "subscription":
      return t("billingHistory.periods.subscription");
    case "subscription_create":
      return t("billingHistory.periods.subscriptionCreate");
    case "subscription_cycle":
      return t("billingHistory.periods.subscriptionCycle");
    case "subscription_threshold":
      return t("billingHistory.periods.subscriptionThreshold");
    case "subscription_update":
      return t("billingHistory.periods.subscriptionUpdate");
    case "upcoming":
      return t("billingHistory.periods.upcoming");
    default:
      return t("billingHistory.periods.default");
  }
};

const formatBillingPeriod = (item: {
  periodStart: Date | string | null;
  periodEnd: Date | string | null;
  billingReason: string | null;
}) => {
  if (item.periodStart && item.periodEnd) {
    return `${formatPeriodDate(item.periodStart)} - ${formatPeriodDate(item.periodEnd)}`;
  }

  return resolveBillingReasonLabel(item.billingReason);
};
</script>

<template>
  <Card>
    <CardHeader class="gap-4 md:flex-row md:items-start md:justify-between">
      <div class="space-y-1.5">
        <CardTitle>{{ t("billingHistory.title") }}</CardTitle>
        <CardDescription>
          {{ t("billingHistory.description") }}
        </CardDescription>
      </div>

      <div class="w-full md:w-40">
        <p class="mb-2 text-xs font-medium text-muted-foreground">
          {{ t("billingHistory.limitLabel") }}
        </p>
        <Select
          :model-value="String(historyPageSize)"
          @update:model-value="updateHistoryPageSize"
        >
          <SelectTrigger class="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="option in invoicePageSizeOptions"
              :key="option"
              :value="String(option)"
            >
              {{ t("billingHistory.limitOption", { count: option }) }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </CardHeader>

    <CardContent class="space-y-4">
      <p
        v-if="billingHistoryQuery.isLoading.value"
        class="text-sm text-muted-foreground"
      >
        {{ t("billingHistory.loading") }}
      </p>
      <p
        v-else-if="billingHistoryQuery.error.value"
        :class="errorBannerClass"
      >
        {{
          billingHistoryQuery.error.value instanceof Error
            ? billingHistoryQuery.error.value.message
            : t("billingHistory.errorFallback")
        }}
      </p>
      <div v-else-if="billingHistoryItems.length > 0" class="space-y-4">
        <div class="overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{{ t("billingHistory.columns.date") }}</TableHead>
                <TableHead>{{ t("billingHistory.columns.amount") }}</TableHead>
                <TableHead>{{ t("billingHistory.columns.status") }}</TableHead>
                <TableHead>{{ t("billingHistory.columns.period") }}</TableHead>
                <TableHead>{{ t("billingHistory.columns.invoice") }}</TableHead>
                <TableHead class="text-right">
                  {{ t("billingHistory.columns.actions") }}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow
                v-for="item in billingHistoryItems"
                :key="item.invoiceId"
              >
                <TableCell class="whitespace-nowrap">
                  {{ formatInvoiceDate(item.createdAt) }}
                </TableCell>
                <TableCell class="whitespace-nowrap font-medium">
                  {{ formatInvoiceAmount(item.displayAmount, item.currency) }}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {{ formatStatusLabel(item.status) }}
                  </Badge>
                </TableCell>
                <TableCell class="min-w-52 text-muted-foreground">
                  {{ formatBillingPeriod(item) }}
                </TableCell>
                <TableCell class="font-mono text-xs">
                  {{ item.invoiceNumber ?? item.invoiceId }}
                </TableCell>
                <TableCell>
                  <div class="flex justify-end gap-2">
                    <Button
                      v-if="item.hostedInvoiceUrl"
                      variant="outline"
                      size="sm"
                      as-child
                    >
                      <a
                        :href="item.hostedInvoiceUrl"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <ExternalLink />
                        {{ t("billingHistory.actions.viewStripe") }}
                      </a>
                    </Button>
                    <Button
                      v-if="item.invoicePdfUrl"
                      variant="outline"
                      size="sm"
                      as-child
                    >
                      <a
                        :href="item.invoicePdfUrl"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <FileDown />
                        {{ t("billingHistory.actions.downloadPdf") }}
                      </a>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div class="flex justify-center">
          <Button
            v-if="billingHistoryQuery.hasNextPage.value"
            variant="outline"
            :disabled="billingHistoryQuery.isFetchingNextPage.value"
            @click="billingHistoryQuery.fetchNextPage()"
          >
            {{
              billingHistoryQuery.isFetchingNextPage.value
                ? t("billingHistory.loadingMore")
                : t("billingHistory.actions.loadMore")
            }}
          </Button>
        </div>
      </div>
      <p v-else class="text-sm text-muted-foreground">
        {{
          isStripeConfiguredForBillingHistory
            ? t("billingHistory.empty")
            : t("billingHistory.unavailable")
        }}
      </p>
    </CardContent>
  </Card>
</template>
