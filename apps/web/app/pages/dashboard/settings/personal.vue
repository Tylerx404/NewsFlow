<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { reactive, ref, watch } from "vue";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { dashboardQueryKeys } from "@/lib/dashboard-query-keys";

definePageMeta({
  layout: "dashboard",
  middleware: "dashboard-auth",
  title: "Personal Settings",
});

const { $authClient, $orpc } = useNuxtApp();
const queryClient = useQueryClient();

const profileForm = reactive({
  name: "",
  image: "",
});
const profileError = ref("");
const profileSuccess = ref("");

const passwordForm = reactive({
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
  revokeOtherSessions: true,
});
const passwordError = ref("");
const passwordSuccess = ref("");

const sessionQuery = useQuery({
  queryKey: dashboardQueryKeys.auth.session(),
  queryFn: async () => {
    const { data, error } = await $authClient.getSession();
    if (error) {
      throw new Error(error.message || "Unable to load session.");
    }
    return data;
  },
});

const subscriptionQuery = useQuery(
  $orpc.subscription.getCurrent.queryOptions({
    queryKey: dashboardQueryKeys.subscription.current(),
  })
);

watch(
  () => sessionQuery.data.value?.user,
  (user) => {
    if (!user) {
      return;
    }

    profileForm.name = user.name ?? "";
    profileForm.image = user.image ?? "";
  },
  { immediate: true }
);

const profileMutation = useMutation({
  mutationFn: async () => {
    const name = profileForm.name.trim();
    const image = profileForm.image.trim();

    if (!name) {
      throw new Error("Name is required.");
    }

    const { error } = await $authClient.updateUser({
      name,
      image: image || null,
    });

    if (error) {
      throw new Error(error.message || "Unable to update profile.");
    }
  },
  onSuccess: async () => {
    profileError.value = "";
    profileSuccess.value = "Profile updated successfully.";
    await queryClient.invalidateQueries({
      queryKey: dashboardQueryKeys.auth.session(),
    });
  },
  onError: (error) => {
    profileSuccess.value = "";
    profileError.value =
      error instanceof Error ? error.message : "Unable to update profile.";
  },
});

const passwordMutation = useMutation({
  mutationFn: async () => {
    const currentPassword = passwordForm.currentPassword.trim();
    const newPassword = passwordForm.newPassword.trim();
    const confirmPassword = passwordForm.confirmPassword.trim();

    if (!currentPassword || !newPassword) {
      throw new Error("Current password and new password are required.");
    }

    if (newPassword !== confirmPassword) {
      throw new Error("New password and confirm password must match.");
    }

    const { error } = await $authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: passwordForm.revokeOtherSessions,
    });

    if (error) {
      throw new Error(error.message || "Unable to update password.");
    }
  },
  onSuccess: () => {
    passwordError.value = "";
    passwordSuccess.value = "Password updated successfully.";
    passwordForm.currentPassword = "";
    passwordForm.newPassword = "";
    passwordForm.confirmPassword = "";
  },
  onError: (error) => {
    passwordSuccess.value = "";
    passwordError.value =
      error instanceof Error ? error.message : "Unable to update password.";
  },
});

const handleSaveProfile = async () => {
  profileError.value = "";
  profileSuccess.value = "";

  try {
    await profileMutation.mutateAsync();
  } catch {
    // Error is already mapped in mutation onError.
  }
};

const handleChangePassword = async () => {
  passwordError.value = "";
  passwordSuccess.value = "";

  try {
    await passwordMutation.mutateAsync();
  } catch {
    // Error is already mapped in mutation onError.
  }
};

const formatDate = (value: Date | string | null) => {
  if (!value) {
    return "No expiration";
  }

  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString();
};
</script>

<template>
  <div class="mx-auto w-full max-w-3xl space-y-6">
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Update your public profile fields used in the dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <p v-if="sessionQuery.isLoading.value" class="text-sm text-muted-foreground">
          Loading profile...
        </p>
        <p v-else-if="sessionQuery.error.value" class="text-sm text-destructive">
          {{
            sessionQuery.error.value instanceof Error
              ? sessionQuery.error.value.message
              : "Unable to load profile."
          }}
        </p>
        <div v-else-if="sessionQuery.data.value?.user" class="space-y-4">
          <div class="space-y-2">
            <label class="text-sm font-medium" for="profile-email">Email</label>
            <Input
              id="profile-email"
              :model-value="sessionQuery.data.value.user.email"
              readonly
              disabled
            />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium" for="profile-name">Name</label>
            <Input id="profile-name" v-model="profileForm.name" />
          </div>

          <div class="space-y-2">
            <label class="text-sm font-medium" for="profile-image">Avatar URL</label>
            <Input
              id="profile-image"
              v-model="profileForm.image"
              placeholder="https://example.com/avatar.png"
            />
          </div>

          <p v-if="profileError" class="text-sm text-destructive">
            {{ profileError }}
          </p>
          <p v-else-if="profileSuccess" class="text-sm text-emerald-600">
            {{ profileSuccess }}
          </p>

          <Button
            :disabled="profileMutation.isPending.value"
            @click="handleSaveProfile"
          >
            {{ profileMutation.isPending.value ? "Saving..." : "Save profile" }}
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          Change your account password securely.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <label class="text-sm font-medium" for="current-password">Current password</label>
          <Input
            id="current-password"
            v-model="passwordForm.currentPassword"
            type="password"
          />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium" for="new-password">New password</label>
          <Input
            id="new-password"
            v-model="passwordForm.newPassword"
            type="password"
          />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-medium" for="confirm-password">Confirm new password</label>
          <Input
            id="confirm-password"
            v-model="passwordForm.confirmPassword"
            type="password"
          />
        </div>

        <label class="flex items-center gap-2 text-sm">
          <input
            v-model="passwordForm.revokeOtherSessions"
            type="checkbox"
          />
          Revoke other active sessions
        </label>

        <p v-if="passwordError" class="text-sm text-destructive">
          {{ passwordError }}
        </p>
        <p v-else-if="passwordSuccess" class="text-sm text-emerald-600">
          {{ passwordSuccess }}
        </p>

        <Button
          :disabled="passwordMutation.isPending.value"
          @click="handleChangePassword"
        >
          {{
            passwordMutation.isPending.value
              ? "Updating..."
              : "Update password"
          }}
        </Button>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle>Subscription</CardTitle>
        <CardDescription>
          Billing integration is not enabled yet. This section is read-only.
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
                {{ formatDate(subscriptionQuery.data.value.expiresAt) }}
              </p>
            </div>
            <div class="rounded-md border p-3">
              <p class="text-xs text-muted-foreground">Updated at</p>
              <p class="text-sm font-medium">
                {{ formatDate(subscriptionQuery.data.value.updatedAt) }}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
