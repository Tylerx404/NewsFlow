export default defineNuxtRouteMiddleware(async () => {
  const { $authClient } = useNuxtApp();

  try {
    const { data } = await $authClient.getSession();
    if (!data?.session) {
      return navigateTo("/login");
    }
  } catch {
    return navigateTo("/login");
  }
});
