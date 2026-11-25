<script setup lang="ts">
import { computed, useAttrs } from 'vue'

import type { ColorProfile } from '@pairdraw/scene-graph'
import type { Color } from '@pairdraw/scene-graph/primitives'
import type { OkHCLControls } from '@pairdraw/vue/controls/color-model'
import { ColorInputRoot } from '@pairdraw/vue/primitives/ColorPicker'
import { inputValue } from '@pairdraw/vue/shared/dom-events'

import { useEditorStore } from '@/app/editor/active-store'
import ColorPicker from '@/components/ColorPicker/ColorPicker.vue'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()

const {
  editable = false,
  color,
  okhcl = null,
  colorProfile
} = defineProps<{
  color: Color
  editable?: boolean
  okhcl?: OkHCLControls | null
  /** The profile the color is stored in; the open document's unless one is given. */
  colorProfile?: ColorProfile
}>()
const emit = defineEmits<{ update: [color: Color]; openChange: [open: boolean] }>()
// A design's colors are stored in its document's profile, so its hex reads as sRGB.
const store = useEditorStore()
const profile = computed(() => colorProfile ?? store.graph.documentColorSpace)
</script>

<template>
  <ColorInputRoot
    :color="color"
    :editable="editable"
    :okhcl="okhcl"
    :color-profile="profile"
    @update="emit('update', $event)"
  >
    <template #default="{ editable: isEditable, hex, actions, okhcl: okhclControls }">
      <div v-bind="attrs" class="flex items-center gap-1.5">
        <ColorPicker
          :color="color"
          :okhcl="okhclControls"
          :color-profile="profile"
          @update="actions.updateColor($event)"
          @open-change="emit('openChange', $event)"
        />
        <input
          v-if="isEditable"
          data-test-id="color-hex-input"
          class="min-w-0 flex-1 border-none bg-transparent font-mono text-xs text-surface outline-none"
          :value="hex"
          maxlength="6"
          @change="actions.updateFromHex(inputValue($event))"
        />
        <span v-else class="min-w-0 flex-1 truncate font-mono text-xs text-muted">
          {{ hex }}
        </span>
      </div>
    </template>
  </ColorInputRoot>
</template>
