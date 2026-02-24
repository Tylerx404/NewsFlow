<script setup lang="ts">
import type { SelectGroupProps } from "reka-ui"
import { SelectGroup, useForwardProps } from "reka-ui"

const props = defineProps<SelectGroupProps>()
const forwarded = useForwardProps(props)
</script>

<template>
  <SelectGroup data-slot="select-group" v-bind="forwarded">
    <slot />
  </SelectGroup>
</template>
