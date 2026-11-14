<script setup lang="ts">
import { refAutoReset, useClipboard } from '@vueuse/core'
import { computed } from 'vue'

import { useI18n } from '@pairdraw/vue/i18n'

import { turnEdits } from '@/app/ai/reply/turns'
import { chatMessageTheme } from '@/components/chat/ui'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'

/**
 * The row under a reply: Copy, and what the reply's edits allow. It renders only when it has
 * something to show, so a reply without one keeps the usual gap to the next message.
 */
const {
  messageId,
  text = '',
  streaming = false,
  canRegenerate = false,
  empty = false,
  reverted = false,
  stopped = false,
  undone = 0,
  edits = 0
} = defineProps<{
  messageId: string
  /** The reply's text, copied whole whatever parts it came in. */
  text?: string
  /** The reply is still coming in: only Copy shows, for the text so far. */
  streaming?: boolean
  canRegenerate?: boolean
  /** The reply failed before any content, so asking again is a retry. */
  empty?: boolean
  /** Every edit of the reply was undone, by Undo or Revert; it stays in the chat, marked. */
  reverted?: boolean
  /** How many of the reply's edits are undone, and how many it made. */
  undone?: number
  edits?: number
  /** The user stopped the reply before it finished. */
  stopped?: boolean
}>()
const emit = defineEmits<{ regenerate: []; revert: []; restore: [] }>()
const { ai } = useI18n()
const ui = chatMessageTheme()

const copied = refAutoReset(false, 1500)
const { copy, isSupported: clipboardSupported } = useClipboard()
const copyable = computed(() => !!text && clipboardSupported.value)

async function copyResponse(): Promise<void> {
  if (!copyable.value) return
  await copy(text)
  copied.value = true
}

const turn = computed(() => turnEdits(messageId))
const revertable = computed(() => turn.value?.revertable === true)
const restorable = computed(() => turn.value?.restorable === true)
const partlyUndone = computed(() => undone > 0 && undone < edits)
/** Turn state and actions wait until the reply has finished. */
const turnActions = computed(
  () =>
    !streaming && (stopped || partlyUndone.value || revertable.value || reverted || canRegenerate)
)
</script>

<template>
  <div v-if="turnActions || copyable" :class="ui.footer()" data-slot="chat-turn-actions">
    <template v-if="turnActions">
      <span
        v-if="stopped"
        class="inline-flex items-center gap-1 px-2 text-[11px] text-muted"
        data-slot="chat-turn-stopped"
      >
        <icon-lucide-circle-stop class="size-3" aria-hidden="true" />
        {{ ai.turnStopped }}
      </span>
      <!-- What is undone shows whether or not Redo can still bring it back. -->
      <span
        v-if="partlyUndone"
        class="inline-flex items-center gap-1 px-2 text-[11px] text-muted"
        data-slot="chat-turn-undone"
      >
        <icon-lucide-undo-2 class="size-3" aria-hidden="true" />
        {{ ai.turnPartlyUndone({ undone, total: edits }) }}
      </span>
      <span
        v-else-if="reverted"
        class="inline-flex items-center gap-1 px-2 text-[11px] text-muted"
        data-slot="chat-turn-reverted"
      >
        <icon-lucide-undo-2 class="size-3" aria-hidden="true" />
        {{ ai.turnReverted }}
      </span>
      <AppButton
        v-if="restorable"
        size="xs"
        variant="ghost"
        data-test-id="chat-restore-turn"
        @click="emit('restore')"
      >
        <template #leading><icon-lucide-redo-2 aria-hidden="true" /></template>
        {{ ai.restoreTurn }}
      </AppButton>
      <AppButton
        v-if="revertable"
        size="xs"
        variant="ghost"
        data-test-id="chat-revert-turn"
        @click="emit('revert')"
      >
        <template #leading><icon-lucide-undo-2 aria-hidden="true" /></template>
        {{ ai.revertTurn }}
      </AppButton>
      <AppButton
        v-if="canRegenerate"
        size="xs"
        variant="ghost"
        data-test-id="chat-regenerate"
        @click="emit('regenerate')"
      >
        <template #leading><icon-lucide-refresh-cw aria-hidden="true" /></template>
        {{ empty ? ai.retryRequest : revertable ? ai.revertAndRegenerate : ai.regenerate }}
      </AppButton>
    </template>
    <IconButton
      v-if="copyable"
      :label="copied ? ai.responseCopied : ai.copyResponse"
      size="xs"
      data-slot="chat-copy-response"
      :class="ui.copy()"
      @click="copyResponse"
    >
      <icon-lucide-check v-if="copied" :class="ui.copied()" />
      <icon-lucide-copy v-else :class="ui.copyIcon()" />
    </IconButton>
  </div>
</template>
