<script setup lang="ts">
import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { AsYouTypeFormatter, PhoneNumberUtil } from "google-libphonenumber";
import { computed, reactive, ref, watch } from "vue";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { buildAuthAvatarSrc, isSessionAvatarUrl } from "@/lib/auth-avatar";
import { dashboardQueryKeys } from "@/lib/dashboard-query-keys";
import { useIntlLocale } from "@/composables/use-intl-locale";

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

const { $authClient } = useNuxtApp();
const intlLocale = useIntlLocale();
const phoneNumberUtil = PhoneNumberUtil.getInstance();
const queryClient = useQueryClient();

const profileForm = reactive({
  name: "",
  image: "",
  phoneNumber: "",
});
const profileError = ref("");
const profileSuccess = ref("");
const avatarUploadError = ref("");
const avatarInputRef = ref<HTMLInputElement | null>(null);
const isAvatarRemoved = ref(false);

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

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
const sessionToRevokeToken = ref<string | null>(null);
const isRevokeSessionDialogOpen = ref(false);
const isRevokeOtherDialogOpen = ref(false);

const errorBannerClass =
  "rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive";
const successBannerClass =
  "rounded-md border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300";

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

const normalizePhoneNumberForStorage = (phoneNumber: string | null | undefined) => {
  if (typeof phoneNumber !== "string") {
    return "";
  }

  const trimmed = phoneNumber.trim();

  if (!trimmed) {
    return "";
  }

  const hasLeadingPlus = trimmed.startsWith("+");
  const digitsOnly = trimmed.replace(/\D/g, "");

  if (!digitsOnly) {
    return "";
  }

  return `${hasLeadingPlus ? "+" : ""}${digitsOnly}`;
};

const formatPhoneNumberForDisplay = (phoneNumber: string | null | undefined) => {
  if (typeof phoneNumber !== "string") {
    return "";
  }

  const normalized = normalizePhoneNumberForStorage(phoneNumber);

  if (!normalized.startsWith("+")) {
    return phoneNumber.trim();
  }

  const formatter = new AsYouTypeFormatter("ZZ");
  let formatted = "";

  for (const char of normalized) {
    formatted = formatter.inputDigit(char);
  }

  return formatted.replace(/-/g, " ");
};

const resolvePhoneCountryPreview = (phoneNumber: string | null | undefined) => {
  const normalized = normalizePhoneNumberForStorage(phoneNumber);

  if (!normalized || !normalized.startsWith("+")) {
    return null;
  }

  try {
    const parsed = phoneNumberUtil.parse(normalized);

    if (!phoneNumberUtil.isValidNumber(parsed)) {
      return null;
    }

    const regionCode = phoneNumberUtil.getRegionCodeForNumber(parsed);
    return regionCode ? regionCode.toUpperCase() : null;
  } catch {
    return null;
  }
};

const profileCountryPreview = computed(() =>
  resolvePhoneCountryPreview(profileForm.phoneNumber)
);

const profileCountryCode = computed(() => {
  return (
    profileCountryPreview.value ||
    (sessionQuery.data.value?.user as { countryCode?: string | null } | undefined)?.countryCode ||
    "GLOBAL"
  );
});

watch(
  () => sessionQuery.data.value?.user,
  (user) => {
    if (!user) {
      return;
    }

    profileForm.name = user.name ?? "";
    profileForm.image = isSessionAvatarUrl(user.image) ? "" : (user.image ?? "");
    profileForm.phoneNumber = formatPhoneNumberForDisplay(
      (user as { phoneNumber?: string | null }).phoneNumber ?? ""
    );
    isAvatarRemoved.value = false;
  },
  { immediate: true }
);

watch(
  () => profileForm.phoneNumber,
  (value) => {
    const formatted = formatPhoneNumberForDisplay(value);

    if (formatted !== value) {
      profileForm.phoneNumber = formatted;
    }
  }
);

const currentSessionToken = computed(
  () => sessionQuery.data.value?.session?.token ?? ""
);

const activeSessions = computed(() => sessionsQuery.data.value ?? []);

const hasCurrentSessionInList = computed(() =>
  activeSessions.value.some((session) => session.token === currentSessionToken.value)
);

const otherSessionCount = computed(() =>
  Math.max(activeSessions.value.length - (hasCurrentSessionInList.value ? 1 : 0), 0)
);

const currentSession = computed(() =>
  activeSessions.value.find((session) => session.token === currentSessionToken.value) ?? null
);

const selectedSessionForRevoke = computed(() =>
  activeSessions.value.find((session) => session.token === sessionToRevokeToken.value) ?? null
);

const profileAvatarSrc = computed(() => {
  if (isAvatarRemoved.value) {
    return null;
  }

  return buildAuthAvatarSrc(
    (profileForm.image || sessionQuery.data.value?.user?.image) ?? null,
    sessionQuery.data.value?.user?.updatedAt ?? null
  );
});

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
      queryKey: dashboardQueryKeys.auth.sessionSummary(),
    }),
    queryClient.invalidateQueries({
      queryKey: dashboardQueryKeys.auth.sessions(),
    }),
  ]);
};

const toErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error &&
    "data" in error &&
    typeof (error as { data?: { message?: string } }).data?.message === "string"
  ) {
    return (error as { data: { message: string } }).data.message;
  }

  return fallback;
};

const profileMutation = useMutation({
  mutationFn: async () => {
    const name = profileForm.name.trim();
    const image = profileForm.image.trim();
    const phoneNumber = normalizePhoneNumberForStorage(profileForm.phoneNumber);

    if (!name) {
      throw new Error("Name is required.");
    }

    const imagePayload = isAvatarRemoved.value ? null : (image || undefined);

    const { error } = await $authClient.updateUser({
      name,
      phoneNumber: phoneNumber || null,
      ...(imagePayload !== undefined ? { image: imagePayload } : {}),
    });

    if (error) {
      throw new Error(error.message || "Unable to update profile.");
    }
  },
  onSuccess: async () => {
    profileError.value = "";
    profileSuccess.value = "Profile updated successfully.";
    avatarUploadError.value = "";
    isAvatarRemoved.value = false;
    await invalidateAuthQueries();
  },
  onError: (error) => {
    profileSuccess.value = "";
    profileError.value =
      error instanceof Error ? error.message : "Unable to update profile.";
  },
});

const handleAvatarPick = () => {
  avatarInputRef.value?.click();
};

const handleAvatarUpload = async (event: Event) => {
  avatarUploadError.value = "";

  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    avatarUploadError.value = "Please choose an image file.";
    input.value = "";
    return;
  }

  if (file.size > MAX_AVATAR_BYTES) {
    avatarUploadError.value = "Image size must be 2MB or smaller.";
    input.value = "";
    return;
  }

  const reader = new FileReader();
  const dataUrl = await new Promise<string>((resolve, reject) => {
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
        return;
      }
      reject(new Error("Unable to read image."));
    };
    reader.onerror = () => reject(new Error("Unable to read image."));
    reader.readAsDataURL(file);
  }).catch((error) => {
    avatarUploadError.value =
      error instanceof Error ? error.message : "Unable to read image.";
    return "";
  });

  if (dataUrl) {
    profileForm.image = dataUrl;
    isAvatarRemoved.value = false;
  }

  input.value = "";
};

const clearAvatar = () => {
  avatarUploadError.value = "";
  profileForm.image = "";
  isAvatarRemoved.value = true;
};

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
    return false;
  }

  try {
    await revokeSessionMutation.mutateAsync(token);
    return true;
  } catch {
    // Error is already mapped in mutation onError.
    return false;
  }
};

const handleRevokeOtherSessions = async () => {
  sessionActionError.value = "";
  sessionActionSuccess.value = "";

  try {
    await revokeOtherSessionsMutation.mutateAsync();
    return true;
  } catch {
    // Error is already mapped in mutation onError.
    return false;
  }
};

const openRevokeSessionDialog = (token: string) => {
  if (token === currentSessionToken.value) {
    return;
  }

  sessionToRevokeToken.value = token;
  isRevokeSessionDialogOpen.value = true;
};

const handleRevokeSessionDialogToggle = (open: boolean) => {
  isRevokeSessionDialogOpen.value = open;

  if (!open) {
    sessionToRevokeToken.value = null;
  }
};

const confirmRevokeSession = async () => {
  if (!sessionToRevokeToken.value) {
    return;
  }

  const success = await handleRevokeSession(sessionToRevokeToken.value);
  if (!success) {
    return;
  }

  handleRevokeSessionDialogToggle(false);
};

const confirmRevokeOtherSessions = async () => {
  const success = await handleRevokeOtherSessions();
  if (success) {
    isRevokeOtherDialogOpen.value = false;
  }
};

const formatDate = (value: Date | string | null | undefined) => {
  if (!value) {
    return "No expiration";
  }

  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat(intlLocale.value, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const formatSessionToken = (token: string) => {
  if (token.length < 16) {
    return token;
  }

  return `${token.slice(0, 8)}...${token.slice(-6)}`;
};
</script>

<template>
  <div class="grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div class="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Profile</CardTitle>
            <CardDescription>
              Keep your public identity up to date. Name and avatar are used across the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <p v-if="sessionQuery.isLoading.value" class="text-sm text-muted-foreground">
              Loading profile...
            </p>
            <p v-else-if="sessionQuery.error.value" :class="errorBannerClass">
              {{
                sessionQuery.error.value instanceof Error
                  ? sessionQuery.error.value.message
                  : "Unable to load profile."
              }}
            </p>

            <div v-else-if="sessionQuery.data.value?.user" class="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
              <div class="rounded-lg border bg-muted/20 p-4">
                <input
                  ref="avatarInputRef"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleAvatarUpload"
                >

                <div class="flex flex-col items-center gap-4 text-center">
                  <button
                    type="button"
                    class="group relative inline-flex size-28 items-center justify-center rounded-full border-2 border-dashed border-border/70 bg-background p-2 transition hover:border-primary/70"
                    aria-label="Change profile photo"
                    @click="handleAvatarPick"
                  >
                    <Avatar class="size-full border bg-card shadow-sm">
                      <AvatarImage v-if="profileAvatarSrc" :src="profileAvatarSrc" alt="Avatar preview" />
                      <AvatarFallback class="text-lg font-semibold">
                        {{ avatarFallback }}
                      </AvatarFallback>
                    </Avatar>
                    <span class="pointer-events-none absolute -bottom-1 rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition group-hover:text-foreground">
                      Change
                    </span>
                  </button>

                  <p class="text-sm font-medium">
                    Upload profile photo
                  </p>

                  <div class="grid w-full gap-2">
                    <Button type="button" variant="secondary" class="w-full" @click="handleAvatarPick">
                      {{ profileForm.image ? "Replace photo" : "Choose photo" }}
                    </Button>
                    <Button
                      v-if="profileForm.image"
                      type="button"
                      variant="ghost"
                      class="w-full text-muted-foreground hover:text-foreground"
                      @click="clearAvatar"
                    >
                      Remove current photo
                    </Button>
                  </div>

                  <p v-if="avatarUploadError" aria-live="polite" class="w-full rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-left text-xs text-destructive">
                    {{ avatarUploadError }}
                  </p>
                </div>
              </div>

              <div class="space-y-4">
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
                  <label class="text-sm font-medium" for="profile-phone">Phone number</label>
                  <Input
                    id="profile-phone"
                    v-model="profileForm.phoneNumber"
                    placeholder="+84987654321"
                    autocomplete="tel"
                  />
                  <p class="text-xs text-muted-foreground">
                    Country preview: {{ profileCountryCode }}
                  </p>
                </div>

                <p v-if="profileError" aria-live="polite" :class="errorBannerClass">
                  {{ profileError }}
                </p>
                <p v-else-if="profileSuccess" aria-live="polite" :class="successBannerClass">
                  {{ profileSuccess }}
                </p>

                <div class="flex justify-end">
                  <Button
                    :disabled="profileMutation.isPending.value"
                    @click="handleSaveProfile"
                  >
                    {{ profileMutation.isPending.value ? "Saving..." : "Save profile" }}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Password & Access</CardTitle>
            <CardDescription>
              Update your password regularly to keep your account secure.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2">
              <label class="text-sm font-medium" for="current-password">Current password</label>
              <Input
                id="current-password"
                v-model="passwordForm.currentPassword"
                type="password"
                autocomplete="current-password"
              />
            </div>

            <div class="grid gap-4 md:grid-cols-2">
              <div class="space-y-2">
                <label class="text-sm font-medium" for="new-password">New password</label>
                <Input
                  id="new-password"
                  v-model="passwordForm.newPassword"
                  type="password"
                  autocomplete="new-password"
                />
              </div>

              <div class="space-y-2">
                <label class="text-sm font-medium" for="confirm-password">Confirm new password</label>
                <Input
                  id="confirm-password"
                  v-model="passwordForm.confirmPassword"
                  type="password"
                  autocomplete="new-password"
                />
              </div>
            </div>

            <label
              for="revoke-other-sessions-on-password-change"
              class="flex items-start gap-3 rounded-md border p-3 text-sm"
            >
              <Checkbox
                id="revoke-other-sessions-on-password-change"
                v-model="passwordForm.revokeOtherSessions"
                class="mt-0.5"
              />
              <span>Revoke other active sessions after password change</span>
            </label>

            <p v-if="passwordError" aria-live="polite" :class="errorBannerClass">
              {{ passwordError }}
            </p>
            <p v-else-if="passwordSuccess" aria-live="polite" :class="successBannerClass">
              {{ passwordSuccess }}
            </p>

            <div class="flex justify-end">
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Sessions</CardTitle>
            <CardDescription>
              Review devices signed in to your account and revoke any session you do not trust.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <p v-if="sessionsQuery.isLoading.value" class="text-sm text-muted-foreground">
              Loading sessions...
            </p>
            <p v-else-if="sessionsQuery.error.value" :class="errorBannerClass">
              {{
                sessionsQuery.error.value instanceof Error
                  ? sessionsQuery.error.value.message
                  : "Unable to load sessions."
              }}
            </p>

            <div v-else-if="activeSessions.length > 0" class="space-y-3">
              <div
                v-for="session in activeSessions"
                :key="session.token"
                class="space-y-3 rounded-md border p-3"
              >
                <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div class="space-y-1">
                    <p class="break-all text-sm font-medium sm:break-normal">
                      {{ formatSessionToken(session.token) }}
                    </p>

                    <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Badge
                        v-if="session.token === currentSessionToken"
                        variant="outline"
                      >
                        Current device
                      </Badge>
                      <span>Created: {{ formatDate(session.createdAt) }}</span>
                      <span>Expires: {{ formatDate(session.expiresAt) }}</span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    :disabled="session.token === currentSessionToken || revokeSessionMutation.isPending.value"
                    :aria-label="`Revoke session ${formatSessionToken(session.token)}`"
                    @click="openRevokeSessionDialog(session.token)"
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

            <p v-if="sessionActionError" aria-live="polite" :class="errorBannerClass">
              {{ sessionActionError }}
            </p>
            <p v-else-if="sessionActionSuccess" aria-live="polite" :class="successBannerClass">
              {{ sessionActionSuccess }}
            </p>
          </CardContent>
        </Card>
      </div>

      <div class="space-y-6 xl:sticky xl:top-6 xl:self-start">
        <Card>
          <CardHeader>
            <CardTitle>Security Summary</CardTitle>
            <CardDescription>
              Quick checks and actions for account safety.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="space-y-2 rounded-md border p-3 text-sm">
              <div class="flex items-center justify-between gap-3">
                <span class="text-muted-foreground">Active sessions</span>
                <span class="font-medium">{{ activeSessions.length }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-muted-foreground">Other sessions</span>
                <span class="font-medium">{{ otherSessionCount }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-muted-foreground">Current expires</span>
                <span class="font-medium">
                  {{ formatDate(currentSession?.expiresAt) }}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              class="w-full"
              :disabled="otherSessionCount === 0 || revokeOtherSessionsMutation.isPending.value"
              @click="isRevokeOtherDialogOpen = true"
            >
              {{
                revokeOtherSessionsMutation.isPending.value
                  ? "Revoking..."
                  : "Revoke other sessions"
              }}
            </Button>

            <p class="text-xs text-muted-foreground">
              Revoke all sessions except the one currently in use.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>

    <AlertDialog
      :open="isRevokeSessionDialogOpen"
      @update:open="handleRevokeSessionDialogToggle"
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke this session?</AlertDialogTitle>
          <AlertDialogDescription>
            This device will be signed out immediately.
            <span v-if="selectedSessionForRevoke">
              Token: {{ formatSessionToken(selectedSessionForRevoke.token) }}.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="revokeSessionMutation.isPending.value">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            :disabled="revokeSessionMutation.isPending.value"
            @click="confirmRevokeSession"
          >
            {{ revokeSessionMutation.isPending.value ? "Revoking..." : "Revoke session" }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>

    <AlertDialog
      :open="isRevokeOtherDialogOpen"
      @update:open="(open) => (isRevokeOtherDialogOpen = open)"
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Revoke all other sessions?</AlertDialogTitle>
          <AlertDialogDescription>
            This keeps only your current device signed in.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel :disabled="revokeOtherSessionsMutation.isPending.value">
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            :disabled="revokeOtherSessionsMutation.isPending.value"
            @click="confirmRevokeOtherSessions"
          >
            {{
              revokeOtherSessionsMutation.isPending.value
                ? "Revoking..."
                : "Revoke other sessions"
            }}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
</template>
