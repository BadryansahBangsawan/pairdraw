<script setup lang="ts">
import { computed, type VNode } from 'vue'

import type { ColorProfile } from '@pairdraw/scene-graph'
import type { Color } from '@pairdraw/scene-graph/primitives'
import type { OkHCLControls } from '@pairdraw/vue/controls/color-model'
import { useI18n } from '@pairdraw/vue/i18n'
import { ColorPickerRoot, type PickerCancelCause } from '@pairdraw/vue/primitives/ColorPicker'

import { useEditorStore } from '@/app/editor/active-store'
import ColorPickerPanel from '@/components/color-picker-panel/ColorPickerPanel.vue'
import { useEyedropperKeepOpen } from '@/components/color-picker-panel/eyedropper'
import { usePopoverUI } from '@/components/ui/overlay/popover'

const { panels } = useI18n()
const {
  color,
  okhcl = null,
  escapeReverts = false,
  eyedropper = true,
  colorProfile
} = defineProps<{
  color: Color
  /** The profile the color is stored in; the open document's unless one is given. */
  colorProfile?: ColorProfile
  okhcl?: OkHCLControls | null
  /**
   * For a colour with no undo history, such as a preference: Escape closing the picker puts back
   * the colour it opened with. Forwarded explicitly rather than by attribute fallthrough, so the
   * wrapper's contract names it.
   */
  escapeReverts?: boolean
  /** Offers sampling the canvas; off where no document color is edited, as in Settings. */
  eyedropper?: boolean
}>()
defineSlots<{
  trigger?(props: { style: { background: string } }): VNode[]
}>()
const emit = defineEmits<{
  update: [color: Color]
  openChange: [open: boolean]
  commit: []
  cancel: [cause: PickerCancelCause]
}>()
const cls = usePopoverUI({ content: 'w-56 p-2' })
// A design's colors are stored in its document's profile; a preference picks its own, in sRGB.
const store = useEditorStore()
const profile = computed(() => colorProfile ?? store.graph.documentColorSpace)
// Settings has no document behind it to sample, nor always an editor to sample with.
const keepOpen = eyedropper ? useEyedropperKeepOpen() : undefined
</script>

<template>
  <ColorPickerRoot
    :color="color"
    :label="panels.editColor"
    :escape-reverts="escapeReverts"
    :keep-open="keepOpen"
    :color-profile="profile"
    :ui="{
      content: cls.content,
      swatch: 'size-5 shrink-0 cursor-pointer rounded border border-border p-0'
    }"
    @update="emit('update', $event)"
    @open-change="emit('openChange', $event)"
    @commit="emit('commit')"
    @cancel="emit('cancel', $event)"
  >
    <template v-if="$slots.trigger" #trigger="trigger">
      <slot name="trigger" v-bind="trigger" />
    </template>
    <template #default="{ color: currentColor, update }">
      <ColorPickerPanel
        :color="currentColor"
        :okhcl="okhcl"
        :eyedropper="eyedropper"
        :color-profile="profile"
        @update="update"
      />
    </template>
  </ColorPickerRoot>
</template>
