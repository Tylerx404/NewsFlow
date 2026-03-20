import { useInfiniteQuery } from "@tanstack/vue-query";
import { computed, ref } from "vue";

import { dashboardQueryKeys } from "@/lib/dashboard-query-keys";

const invoicePageSizeOptions = [10, 20, 50] as const;

type InvoicePageSize = (typeof invoicePageSizeOptions)[number];

export const useUserBillingHistory = () => {
  const { $orpc } = useNuxtApp();
  const historyPageSize = ref<InvoicePageSize>(10);

  const billingHistoryQuery = useInfiniteQuery(
    computed(() =>
      $orpc.subscription.listBillingHistory.infiniteOptions({
        queryKey: dashboardQueryKeys.subscription.billingHistory(
          historyPageSize.value
        ),
        input: (cursor: string | undefined) => ({
          limit: historyPageSize.value,
          cursor,
        }),
        initialPageParam: undefined as string | undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      })
    )
  );

  const billingHistoryItems = computed(() =>
    (billingHistoryQuery.data.value?.pages ?? []).flatMap((page) => page.items)
  );

  const isStripeConfiguredForBillingHistory = computed(
    () => billingHistoryQuery.data.value?.pages[0]?.isStripeConfigured ?? true
  );

  const updateHistoryPageSize = (value: unknown) => {
    if (typeof value !== "string") {
      return;
    }

    const parsed = Number.parseInt(value, 10) as InvoicePageSize;

    if (!invoicePageSizeOptions.includes(parsed)) {
      return;
    }

    historyPageSize.value = parsed;
  };

  return {
    billingHistoryItems,
    billingHistoryQuery,
    historyPageSize,
    isStripeConfiguredForBillingHistory,
    invoicePageSizeOptions,
    updateHistoryPageSize,
  };
};
