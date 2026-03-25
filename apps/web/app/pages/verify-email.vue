<script setup lang="ts">
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const route = useRoute();
const { t } = useI18n();

const getSafeRedirectPath = () => {
  const rawRedirect = route.query.redirect;
  const redirect = Array.isArray(rawRedirect) ? rawRedirect[0] : rawRedirect;

  if (typeof redirect !== "string" || redirect.length === 0) {
    return "";
  }

  if (!redirect.startsWith("/") || redirect.startsWith("//")) {
    return "";
  }

  return redirect;
};

const errorCode = computed(() => {
  const rawError = route.query.error;
  const error = Array.isArray(rawError) ? rawError[0] : rawError;

  return typeof error === "string" ? error : "";
});

const hasError = computed(() => errorCode.value.length > 0);

const errorMessageKey = computed(() => {
  switch (errorCode.value) {
    case "TOKEN_EXPIRED":
      return "auth.verifyPage.errors.tokenExpired";
    case "INVALID_TOKEN":
      return "auth.verifyPage.errors.invalidToken";
    case "USER_NOT_FOUND":
      return "auth.verifyPage.errors.userNotFound";
    case "EMAIL_ALREADY_VERIFIED":
      return "auth.verifyPage.errors.alreadyVerified";
    default:
      return "auth.verifyPage.errors.generic";
  }
});

const loginTarget = computed(() => {
  const redirect = getSafeRedirectPath();

  return redirect
    ? {
        path: "/login",
        query: { redirect },
      }
    : { path: "/login" };
});
</script>

<template>
  <div class="bg-muted flex min-h-svh items-center justify-center p-6 md:p-10">
    <div class="w-full max-w-xl">
      <Card class="overflow-hidden border bg-card">
        <CardHeader class="space-y-3 text-center">
          <p class="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {{ t("app.name") }}
          </p>
          <CardTitle class="text-3xl font-semibold">
            {{
              hasError
                ? t("auth.verifyPage.errorTitle")
                : t("auth.verifyPage.successTitle")
            }}
          </CardTitle>
          <CardDescription class="mx-auto max-w-lg text-sm text-muted-foreground">
            {{
              hasError
                ? t(errorMessageKey)
                : t("auth.verifyPage.successDescription")
            }}
          </CardDescription>
        </CardHeader>

        <CardContent class="space-y-6">
          <div class="rounded-2xl border bg-muted/40 p-5 text-center">
            <p class="text-sm font-medium">
              {{
                hasError
                  ? t("auth.verifyPage.errorHint")
                  : t("auth.verifyPage.successHint")
              }}
            </p>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button @click="navigateTo(loginTarget)">
              {{ t("auth.verifyPage.actions.login") }}
            </Button>
            <Button
              variant="outline"
              @click="navigateTo('/')"
            >
              {{ t("auth.verifyPage.actions.home") }}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
