export default defineNuxtRouteMiddleware(async (to) => {
  const { $authClient } = useNuxtApp();

  try {
    const { data } = await $authClient.getSession();
    if (!data?.session) {
      return navigateTo({
        path: "/login",
        query: { redirect: to.fullPath },
      });
    }
  } catch {
    return navigateTo({
      path: "/login",
      query: { redirect: to.fullPath },
    });
  }
});
