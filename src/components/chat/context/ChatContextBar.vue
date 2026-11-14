<script setup lang="ts">
import type { UIMessage } from 'ai'
import { computed, ref, watch } from 'vue'

import { useChatContextMessages } from '@open-pencil/vue/i18n'

import { contextMeter, estimateTokens } from '@/app/ai/chat/context-window/meter'
import { latestContextUsage } from '@/app/ai/chat/context-window/usage'
import { useDesignContextWindow } from '@/app/ai/chat/context-window/window'
import { styleKitFromDocument } from '@/app/ai/chat/pins/document'
import { describePins } from '@/app/ai/chat/pins/note'
import { hasPendingStyleKit, takePendingStyleKit } from '@/app/ai/chat/pins/pending'
import { useConversationPins } from '@/app/ai/chat/pins/use'
import { useAIChat } from '@/app/ai/chat/use'
import { getActiveEditorStore } from '@/app/editor/active-store'
import { openSettingsDialog } from '@/app/settings/dialog'

import ChatContextMeter from './ChatContextMeter.vue'
import ChatContextPins from './ChatContextPins.vue'
import ChatContextStyleKitDialog from './ChatContextStyleKitDialog.vue'

/**
 * The chat header's view of the open conversation's context: how full the model's context
 * window is, and the style kit and reference images pinned to the conversation.
 */
const { messages } = defineProps<{ messages: readonly UIMessage[] }>()

const { history } = useAIChat()
const copy = useChatContextMessages()
const catalogWindow = useDesignContextWindow()
const pins = useConversationPins(history)
const pinsOpen = ref(false)
const kitOpen = ref(false)

const meter = computed(() =>
  contextMeter(
    latestContextUsage(messages),
    catalogWindow.value,
    estimateTokens(describePins(pins.pins.value))
  )
)

// A kit chosen outside the chat, such as in Goodies, is pinned once a conversation can take it.
watch(
  () => pins.editable.value && hasPendingStyleKit(getActiveEditorStore()),
  (ready) => {
    if (!ready) return
    const kit = takePendingStyleKit(getActiveEditorStore())
    if (!kit) return
    void pins.setStyleKit(kit)
  },
  { immediate: true }
)

// A failure explains the last attempt; reopening the popover starts fresh.
watch(pinsOpen, (open) => {
  if (!open) pins.dismissFailure()
})

function captureDocumentKit() {
  const store = getActiveEditorStore()
  return styleKitFromDocument(
    store.graph,
    copy.value.styleKitDocumentName({ document: store.state.documentName })
  )
}

function editStyleKit() {
  pinsOpen.value = false
  kitOpen.value = true
}

function openVisionSettings() {
  pinsOpen.value = false
  openSettingsDialog('ai')
}
</script>

<template>
  <ChatContextMeter :meter="meter" />
  <ChatContextPins
    v-model:open="pinsOpen"
    :pins="pins.pins.value"
    :pending="pins.pending.value"
    :remaining="pins.remaining.value"
    :editable="pins.editable.value"
    :failure="pins.failure.value"
    @edit-style-kit="editStyleKit"
    @remove-style-kit="pins.setStyleKit(null)"
    @add-references="pins.addReferences"
    @remove-reference="pins.removeReference"
    @open-settings="openVisionSettings"
  />
  <ChatContextStyleKitDialog
    v-model:open="kitOpen"
    :kit="pins.pins.value.styleKit"
    :document-kit="captureDocumentKit"
    @save="pins.setStyleKit"
  />
</template>
