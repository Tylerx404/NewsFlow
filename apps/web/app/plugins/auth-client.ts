import { createAuthClient } from "better-auth/vue";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const requestHeaders = import.meta.server ? useRequestHeaders(["cookie"]) : undefined;

  const authClient = createAuthClient({
    baseURL: config.public.serverUrl,
    fetchOptions: requestHeaders
      ? {
          headers: requestHeaders,
        }
      : undefined,
  });

  return {
    provide: {
      authClient: authClient,
    },
  };
});
