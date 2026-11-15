<script setup lang="ts">
import { useOpenedOnce } from './opened'
import { provideOverlayPortalled } from './portal'

/**
 * Holds the place of a dialog whose code loads with its first opening.
 *
 * The dialog mounts the first time `open` is true and then stays mounted, so it still closes with
 * its exit animation. It renders into a portal this component opens when it mounts, which is where
 * an eagerly mounted dialog's portal would sit. Reka takes a layer that comes later in the page
 * than an open popover for one nested in that popover, so a dialog appended on its first opening
 * would leave the popover it was opened from floating above it.
 */
const { open } = defineProps<{ open: boolean }>()
const opened = useOpenedOnce(() => open)
provideOverlayPortalled()
</script>

<template>
  <Teleport to="body"><slot v-if="opened" /></Teleport>
</template>
