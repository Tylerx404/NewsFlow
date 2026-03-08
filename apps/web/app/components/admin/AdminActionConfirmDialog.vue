<script setup lang="ts">
import type { ButtonVariants } from "@/components/ui/button";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    confirmPendingLabel?: string;
    cancelLabel?: string;
    confirmVariant?: ButtonVariants["variant"];
    isPending?: boolean;
  }>(),
  {
    confirmPendingLabel: undefined,
    cancelLabel: undefined,
    confirmVariant: "default",
    isPending: false,
  }
);

const emit = defineEmits<{
  "update:open": [open: boolean];
  confirm: [];
}>();
</script>

<template>
  <AlertDialog :open="open" @update:open="(value) => emit('update:open', value)">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{{ props.title }}</AlertDialogTitle>
        <AlertDialogDescription>{{ props.description }}</AlertDialogDescription>
      </AlertDialogHeader>

      <AlertDialogFooter>
        <AlertDialogCancel :disabled="props.isPending">
          {{ props.cancelLabel ?? t("common.actions.cancel") }}
        </AlertDialogCancel>
        <Button
          type="button"
          :variant="props.confirmVariant"
          :disabled="props.isPending"
          @click="emit('confirm')"
        >
          {{
            props.isPending
              ? (props.confirmPendingLabel ?? t("common.actions.loading"))
              : props.confirmLabel
          }}
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
