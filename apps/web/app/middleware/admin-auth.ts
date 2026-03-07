type AdminCapableUser = {
  role?: string | null;
};

export default defineNuxtRouteMiddleware(async (to) => {
  const { $authClient } = useNuxtApp();

  try {
    const { data } = await $authClient.getSession();

    if (!data?.session || !data.user) {
      return navigateTo({
        path: "/login",
        query: { redirect: to.fullPath },
      });
    }

    const user = data.user as typeof data.user & AdminCapableUser;

    if (user.role !== "ADMIN") {
      return navigateTo("/dashboard");
    }
  } catch {
    return navigateTo({
      path: "/login",
      query: { redirect: to.fullPath },
    });
  }
});
