import type { AppRouterClient } from "@NewsFlow/api/routers/index";

import { defineNuxtPlugin } from "#app";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const rpcUrl = `${config.public.serverUrl}/rpc`;
  const requestHeaders = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;

  const rpcLink = new RPCLink({
    url: rpcUrl,
    fetch(url, options) {
      const headers = new Headers(options?.headers ?? undefined);

      if (requestHeaders?.cookie) {
        headers.set("cookie", requestHeaders.cookie);
      }

      return fetch(url, {
        ...options,
        headers,
        credentials: "include",
      });
    },
  });

  const client: AppRouterClient = createORPCClient(rpcLink);
  const orpcUtils = createTanstackQueryUtils(client);

  return {
    provide: {
      orpc: orpcUtils,
    },
  };
});
