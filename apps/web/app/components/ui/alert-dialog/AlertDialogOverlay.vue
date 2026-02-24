<script setup lang="ts">
import type { AlertDialogOverlayProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { AlertDialogOverlay, useForwardProps } from "reka-ui"

import { cn } from "@/lib/utils"

const props = defineProps<AlertDialogOverlayProps & { class?: HTMLAttributes["class"] }>()
const forwarded = useForwardProps(props)
</script>

<template>
  <AlertDialogOverlay
    data-slot="alert-dialog-overlay"
    v-bind="forwarded"
    :class="cn('data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50', props.class)"
  />
</template>
