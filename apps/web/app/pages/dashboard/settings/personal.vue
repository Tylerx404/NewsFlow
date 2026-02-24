<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, reactive, ref, watch } from "vue";

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

type UserSession = {
  token: string;
  createdAt: Date | string;
  expiresAt: Date | string;
  userAgent?: string | null;
  ipAddress?: string | null;
};

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

const sessionActionError = ref("");
const sessionActionSuccess = ref("");

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

const sessionsQuery = useQuery({
  queryKey: dashboardQueryKeys.auth.sessions(),
  queryFn: async () => {
    const { data, error } = await $authClient.listSessions();
    if (error) {
      throw new Error(error.message || "Unable to load sessions.");
    }

    return (data ?? []) as UserSession[];
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

const currentSessionToken = computed(
  () => sessionQuery.data.value?.session?.token ?? ""
);

const avatarFallback = computed(() => {
  const trimmed = profileForm.name.trim();
  if (!trimmed) {
    return "U";
  }

  const parts = trimmed.split(/\s+/);
  const initials = parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return initials || "U";
});

const invalidateAuthQueries = async () => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: dashboardQueryKeys.auth.session(),
    }),
    queryClient.invalidateQueries({
      queryKey: dashboardQueryKeys.auth.sessions(),
    }),
  ]);
};

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
    await invalidateAuthQueries();
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
  onSuccess: async () => {
    passwordError.value = "";
    passwordSuccess.value = "Password updated successfully.";
    passwordForm.currentPassword = "";
    passwordForm.newPassword = "";
    passwordForm.confirmPassword = "";
    await invalidateAuthQueries();
  },
  onError: (error) => {
    passwordSuccess.value = "";
    passwordError.value =
      error instanceof Error ? error.message : "Unable to update password.";
  },
});

const revokeSessionMutation = useMutation({
  mutationFn: async (token: string) => {
    const { error } = await $authClient.revokeSession({ token });

    if (error) {
      throw new Error(error.message || "Unable to revoke session.");
    }
  },
  onSuccess: async () => {
    sessionActionError.value = "";
    sessionActionSuccess.value = "Session revoked successfully.";
    await invalidateAuthQueries();
  },
  onError: (error) => {
    sessionActionSuccess.value = "";
    sessionActionError.value =
      error instanceof Error ? error.message : "Unable to revoke session.";
  },
});

const revokeOtherSessionsMutation = useMutation({
  mutationFn: async () => {
    const { error } = await $authClient.revokeOtherSessions();

    if (error) {
      throw new Error(error.message || "Unable to revoke other sessions.");
    }
  },
  onSuccess: async () => {
    sessionActionError.value = "";
    sessionActionSuccess.value = "Other sessions revoked successfully.";
    await invalidateAuthQueries();
  },
  onError: (error) => {
    sessionActionSuccess.value = "";
    sessionActionError.value =
      error instanceof Error
        ? error.message
        : "Unable to revoke other sessions.";
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

const handleRevokeSession = async (token: string) => {
  sessionActionError.value = "";
  sessionActionSuccess.value = "";

  if (token === currentSessionToken.value) {
    return;
  }

  try {
    await revokeSessionMutation.mutateAsync(token);
  } catch {
    // Error is already mapped in mutation onError.
  }
};

const handleRevokeOtherSessions = async () => {
  sessionActionError.value = "";
  sessionActionSuccess.value = "";

  try {
    await revokeOtherSessionsMutation.mutateAsync();
  } catch {
    // Error is already mapped in mutation onError.
  }
};

const formatDate = (value: Date | string | null | undefined) => {
  if (!value) {
    return "No expiration";
  }

  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleString();
};

const formatSessionToken = (token: string) => {
  if (token.length < 16) {
    return token;
  }

  return `${token.slice(0, 8)}...${token.slice(-6)}`;
};
</script>

<template>
  <div class="mx-auto w-full max-w-3xl space-y-6">
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

    <Card>
      <CardHeader>
        <CardTitle>Basic Profile</CardTitle>
        <CardDescription>
          Update your basic account information like name and avatar.
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
          <div class="flex items-center gap-3 rounded-md border p-3">
            <div class="flex size-12 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-semibold">
              <img
                v-if="profileForm.image"
                :src="profileForm.image"
                alt="Avatar preview"
                class="size-full object-cover"
              />
              <span v-else>{{ avatarFallback }}</span>
            </div>
            <div>
              <p class="text-sm font-medium">Avatar preview</p>
              <p class="text-xs text-muted-foreground">
                Update the URL below to change your avatar.
              </p>
            </div>
          </div>

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
      <CardHeader class="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle>Session Management</CardTitle>
          <CardDescription>
            Review active sessions and revoke any session you do not trust.
          </CardDescription>
        </div>
        <Button
          variant="outline"
          :disabled="revokeOtherSessionsMutation.isPending.value"
          @click="handleRevokeOtherSessions"
        >
          {{
            revokeOtherSessionsMutation.isPending.value
              ? "Revoking..."
              : "Revoke other sessions"
          }}
        </Button>
      </CardHeader>
      <CardContent class="space-y-4">
        <p v-if="sessionsQuery.isLoading.value" class="text-sm text-muted-foreground">
          Loading sessions...
        </p>
        <p v-else-if="sessionsQuery.error.value" class="text-sm text-destructive">
          {{
            sessionsQuery.error.value instanceof Error
              ? sessionsQuery.error.value.message
              : "Unable to load sessions."
          }}
        </p>
        <div v-else-if="(sessionsQuery.data.value?.length ?? 0) > 0" class="space-y-3">
          <div
            v-for="session in sessionsQuery.data.value"
            :key="session.token"
            class="space-y-3 rounded-md border p-3"
          >
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm font-medium">
                  {{ formatSessionToken(session.token) }}
                </p>
                <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge
                    v-if="session.token === currentSessionToken"
                    variant="outline"
                  >
                    Current
                  </Badge>
                  <span>Created: {{ formatDate(session.createdAt) }}</span>
                  <span>Expires: {{ formatDate(session.expiresAt) }}</span>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                :disabled="session.token === currentSessionToken || revokeSessionMutation.isPending.value"
                @click="handleRevokeSession(session.token)"
              >
                Revoke
              </Button>
            </div>

            <div class="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
              <p>User agent: {{ session.userAgent || "Unknown" }}</p>
              <p>IP address: {{ session.ipAddress || "Unknown" }}</p>
            </div>
          </div>
        </div>
        <p v-else class="text-sm text-muted-foreground">
          No active sessions found.
        </p>

        <p v-if="sessionActionError" class="text-sm text-destructive">
          {{ sessionActionError }}
        </p>
        <p v-else-if="sessionActionSuccess" class="text-sm text-emerald-600">
          {{ sessionActionSuccess }}
        </p>
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
  </div>
</template>
