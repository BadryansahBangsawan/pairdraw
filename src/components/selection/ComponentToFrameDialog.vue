<script setup lang="ts">
import { computed, ref } from 'vue'

import { useEditorEvent } from '@pairdraw/vue/editor/events'
import { useCommandMessages, useCommonMessages, usePanelMessages } from '@pairdraw/vue/i18n'

import { useEditorStore } from '@/app/editor/active-store'
import { AppConfirmationDialog } from '@/components/ui/dialog'

/**
 * Asks before a main component turns back into a frame, which detaches its instances, wherever
 * that was asked for: its shortcut, the canvas menu, or the layer type menu.
 */
const store = useEditorStore()
const commands = useCommandMessages()
const panels = usePanelMessages()
const common = useCommonMessages()

// The dialog closes itself before it confirms, so it keeps which component it was asked about.
const open = ref(false)
const target = ref<string | null>(null)
const instanceCount = ref(0)

useEditorEvent('component:to-frame-requested', (componentId) => {
  target.value = componentId
  instanceCount.value = store.componentInstanceCount(componentId)
  open.value = true
})

const description = computed(() =>
  instanceCount.value > 0
    ? panels.value.convertToFrameInstancesDescription({ count: String(instanceCount.value) })
    : panels.value.convertToFrameDescription
)

function confirm() {
  if (!target.value) return
  store.convertComponentToFrame(target.value)
  target.value = null
}
</script>

<template>
  <AppConfirmationDialog
    v-model:open="open"
    :heading="panels.convertToFrameHeading"
    :description="description"
    :cancel-label="common.cancel"
    :confirm-label="commands.convertToFrame"
    :tone="instanceCount > 0 ? 'warning' : 'primary'"
    @confirm="confirm"
  />
</template>
