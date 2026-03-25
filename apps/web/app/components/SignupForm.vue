<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { computed, reactive, ref } from "vue"
import { useQuery } from "@tanstack/vue-query"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const props = defineProps<{
  class?: HTMLAttributes["class"]
}>()

const { $authClient, $orpc } = useNuxtApp()
const route = useRoute()
const { t } = useI18n()

const form = reactive({
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
})
const isSubmitting = ref(false)
const isSocialSubmitting = ref(false)
const submitError = ref("")
const pendingVerificationEmail = ref("")
const DEFAULT_REDIRECT_PATH = "/dashboard"

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return t("auth.signup.errors.generic")
}

const getSafeRedirectPath = () => {
  const rawRedirect = route.query.redirect
  const redirect = Array.isArray(rawRedirect) ? rawRedirect[0] : rawRedirect

  if (typeof redirect !== "string" || redirect.length === 0) {
    return ""
  }

  if (!redirect.startsWith("/") || redirect.startsWith("//")) {
    return ""
  }

  return redirect
}

const authSwitchQuery = computed(() => {
  const redirect = getSafeRedirectPath()
  return redirect ? { redirect } : {}
})
const postAuthRedirectPath = computed(
  () => getSafeRedirectPath() || DEFAULT_REDIRECT_PATH
)

const authConfigQuery = useQuery(
  $orpc.authConfig.get.queryOptions({
    queryKey: ["public", "auth-config"],
  })
)

const isAppleEnabled = computed(
  () => authConfigQuery.data.value?.appleEnabled ?? false
)
const isGoogleEnabled = computed(
  () => authConfigQuery.data.value?.googleEnabled ?? false
)
const hasSocialProviders = computed(
  () => isAppleEnabled.value || isGoogleEnabled.value
)
const emailVerificationRequired = computed(() => {
  if (!authConfigQuery.data.value) {
    return null
  }

  return authConfigQuery.data.value.emailVerificationRequired
})
const emailVerificationConfigured = computed(() => {
  if (!authConfigQuery.data.value) {
    return null
  }

  return authConfigQuery.data.value.emailVerificationConfigured
})

const getVerificationCallbackUrl = () => {
  const params = new URLSearchParams({
    verified: "1",
  })
  const redirect = getSafeRedirectPath()

  if (redirect) {
    params.set("redirect", redirect)
  }

  const callbackPath = `/login?${params.toString()}`

  if (import.meta.client) {
    return `${window.location.origin}${callbackPath}`
  }

  return callbackPath
}

const handleSubmit = async () => {
  submitError.value = ""

  if (
    authConfigQuery.isLoading.value
    || emailVerificationRequired.value === null
    || emailVerificationConfigured.value === null
  ) {
    submitError.value = authConfigQuery.isLoading.value
      ? t("auth.verification.loading")
      : t("auth.verification.unavailable")
    return
  }

  if (
    emailVerificationRequired.value
    && emailVerificationConfigured.value !== true
  ) {
    submitError.value = t("auth.verification.unavailable")
    return
  }

  if (form.password !== form.confirmPassword) {
    submitError.value = t("auth.signup.errors.passwordConfirmationMismatch")
    return
  }

  isSubmitting.value = true

  try {
    const email = form.email.trim()
    const { error } = await $authClient.signUp.email({
      name: form.name.trim(),
      email,
      password: form.password,
      callbackURL: getVerificationCallbackUrl(),
    })

    if (error) {
      submitError.value = error.message ?? t("auth.signup.errors.createFailed")
      return
    }

    if (emailVerificationRequired.value) {
      try {
        await $authClient.signOut()
      } catch {}

      pendingVerificationEmail.value = email
      form.password = ""
      form.confirmPassword = ""
      return
    }

    await navigateTo(postAuthRedirectPath.value)
  } catch (error) {
    submitError.value = getErrorMessage(error)
  } finally {
    isSubmitting.value = false
  }
}

const handleSocialSignIn = async (provider: "apple" | "google") => {
  submitError.value = ""
  isSocialSubmitting.value = true

  try {
    const { error } = await $authClient.signIn.social({ provider })

    if (error) {
      submitError.value = error.message ?? getErrorMessage(error)
    }
  } catch (error) {
    submitError.value = getErrorMessage(error)
  } finally {
    isSocialSubmitting.value = false
  }
}
</script>

<template>
  <div :class="cn('flex flex-col gap-6', props.class)">
    <Card class="overflow-hidden p-0">
      <CardContent class="grid p-0 md:grid-cols-2">
        <form class="p-6 md:p-8" @submit.prevent="handleSubmit">
          <FieldGroup v-if="pendingVerificationEmail">
            <div class="flex flex-col items-center gap-2 text-center">
              <h1 class="text-2xl font-bold">
                {{ t("auth.signup.verifyEmail.title") }}
              </h1>
              <p class="text-muted-foreground text-sm text-balance">
                {{ t("auth.signup.verifyEmail.description", { email: pendingVerificationEmail }) }}
              </p>
            </div>
            <FieldDescription class="text-center">
              {{ t("auth.signup.verifyEmail.hint") }}
            </FieldDescription>
            <FieldDescription class="text-center">
              {{ t("auth.signup.verifyEmail.loginPrompt") }}
              <NuxtLink :to="{ path: '/login', query: authSwitchQuery }">
                {{ t("auth.signup.signIn") }}
              </NuxtLink>
            </FieldDescription>
          </FieldGroup>

          <FieldGroup v-else>
            <div class="flex flex-col items-center gap-2 text-center">
              <h1 class="text-2xl font-bold">
                {{ t("auth.signup.title") }}
              </h1>
              <p class="text-muted-foreground text-sm text-balance">
                {{ t("auth.signup.subtitle") }}
              </p>
            </div>
            <Field>
              <FieldLabel for="name">
                {{ t("auth.common.name") }}
              </FieldLabel>
              <Input
                id="name"
                v-model="form.name"
                type="text"
                autocomplete="name"
                :placeholder="t('auth.common.namePlaceholder')"
                required
              />
            </Field>
            <Field>
              <FieldLabel for="email">
                {{ t("auth.common.email") }}
              </FieldLabel>
              <Input
                id="email"
                v-model="form.email"
                type="email"
                :placeholder="t('auth.common.emailPlaceholder')"
                autocomplete="email"
                required
              />
              <FieldDescription>
                {{ t("auth.signup.emailDescription") }}
              </FieldDescription>
            </Field>
            <Field>
              <Field class="grid grid-cols-2 gap-4">
                <Field>
                  <FieldLabel for="password">
                    {{ t("auth.common.password") }}
                  </FieldLabel>
                  <Input
                    id="password"
                    v-model="form.password"
                    type="password"
                    autocomplete="new-password"
                    required
                  />
                </Field>
                <Field>
                  <FieldLabel for="confirm-password">
                    {{ t("auth.signup.confirmPassword") }}
                  </FieldLabel>
                  <Input
                    id="confirm-password"
                    v-model="form.confirmPassword"
                    type="password"
                    autocomplete="new-password"
                    required
                  />
                </Field>
              </Field>
              <FieldDescription>
                {{ t("auth.signup.passwordHint") }}
              </FieldDescription>
            </Field>
            <Field
              v-if="
                emailVerificationRequired === true
                  && emailVerificationConfigured === false
              "
            >
              <FieldDescription class="text-destructive">
                {{ t("auth.verification.unavailable") }}
              </FieldDescription>
            </Field>
            <Field v-if="submitError">
              <FieldError :errors="[submitError]" />
            </Field>
            <Field>
              <Button
                type="submit"
                :disabled="
                  isSubmitting
                    || authConfigQuery.isLoading.value
                    || (
                      emailVerificationRequired === true
                        && emailVerificationConfigured !== true
                    )
                "
              >
                {{ isSubmitting ? t("auth.signup.submitting") : t("auth.signup.submit") }}
              </Button>
            </Field>
            <FieldSeparator
              v-if="hasSocialProviders"
              class="*:data-[slot=field-separator-content]:bg-card"
            >
              {{ t("auth.common.orContinueWith") }}
            </FieldSeparator>
            <Field v-if="hasSocialProviders" class="grid grid-cols-2 gap-4">
              <Button
                v-if="isAppleEnabled"
                variant="outline"
                type="button"
                :disabled="isSocialSubmitting"
                @click="handleSocialSignIn('apple')"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path
                    d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"
                    fill="currentColor"
                  />
                </svg>
                <span class="sr-only">{{ t("auth.signup.sso.apple") }}</span>
              </Button>
              <Button
                v-if="isGoogleEnabled"
                variant="outline"
                type="button"
                :disabled="isSocialSubmitting"
                @click="handleSocialSignIn('google')"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path
                    d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"
                    fill="currentColor"
                  />
                </svg>
                <span class="sr-only">{{ t("auth.signup.sso.google") }}</span>
              </Button>
            </Field>
            <FieldDescription class="text-center">
              {{ t("auth.signup.haveAccount") }}
              <NuxtLink :to="{ path: '/login', query: authSwitchQuery }">
                {{ t("auth.signup.signIn") }}
              </NuxtLink>
            </FieldDescription>
          </FieldGroup>
        </form>
        <div class="bg-muted relative hidden md:block">
          <img
            src="/placeholder.svg"
            :alt="t('auth.common.heroImageAlt')"
            class="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
          >
        </div>
      </CardContent>
    </Card>
    <FieldDescription class="px-6 text-center">
      {{ t("auth.common.termsPrefix") }} <a href="#">{{ t("auth.common.termsOfService") }}</a>
      {{ t("auth.common.termsAnd") }} <a href="#">{{ t("auth.common.privacyPolicy") }}</a>.
    </FieldDescription>
  </div>
</template>
