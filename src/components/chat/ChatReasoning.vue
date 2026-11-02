<script setup lang="ts">
import { useTimeoutFn } from '@vueuse/core'
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui'
import { computed, ref, watch } from 'vue'

import type { ReasoningDisplay } from '@/app/settings/preferences/store'
import ChatMarkdown from '@/components/chat/ChatMarkdown.vue'
import { chatReasoningTheme } from '@/components/chat/ui'
import { collapsibleContentMotion } from '@/theme/collapsible/collapsible'

const {
  display = 'collapsed',
  text,
  streaming = false,
  thinkingLabel,
  reasoningLabel,
  durationLabel
} = defineProps<{
  display?: ReasoningDisplay
  text: string
  streaming?: boolean
  thinkingLabel: string
  reasoningLabel: string
  /** Formats the duration measured while this block streamed; restored history has none. */
  durationLabel?: (seconds: number) => string
}>()

const ui = chatReasoningTheme()
const open = ref(display === 'expanded' || (display === 'while-thinking' && streaming))
const userChangedOpen = ref(false)
const markdownMode = computed(() => (streaming ? 'streaming' : 'static'))
const startedAt = ref(streaming ? performance.now() : null)
const durationSeconds = ref<number | null>(null)
const finishedLabel = computed(() =>
  durationSeconds.value !== null && durationLabel
    ? durationLabel(durationSeconds.value)
    : reasoningLabel
)
const { start: scheduleClose, stop: cancelClose } = useTimeoutFn(
  () => {
    if (display === 'while-thinking' && !streaming && !userChangedOpen.value) open.value = false
  },
  1000,
  { immediate: false }
)

watch(
  () => streaming,
  (isStreaming, wasStreaming) => {
    if (isStreaming) startedAt.value ??= performance.now()
    else if (wasStreaming && startedAt.value !== null)
      durationSeconds.value = Math.max(1, Math.round((performance.now() - startedAt.value) / 1000))
    cancelClose()
    if (userChangedOpen.value) return
    if (isStreaming) {
      open.value = display !== 'collapsed'
    } else if (wasStreaming && display === 'while-thinking') {
      scheduleClose()
    }
  }
)

watch(
  () => display,
  () => {
    cancelClose()
    if (!userChangedOpen.value)
      open.value = display === 'expanded' || (display === 'while-thinking' && streaming)
  }
)

function updateOpen(value: boolean): void {
  open.value = value
  userChangedOpen.value = true
  cancelClose()
}
</script>

<template>
  <CollapsibleRoot
    :open="open"
    :unmount-on-hide="false"
    :class="ui.root()"
    @update:open="updateOpen"
  >
    <CollapsibleTrigger
      data-slot="chat-reasoning-trigger"
      :data-streaming="streaming || undefined"
      :class="ui.trigger()"
    >
      <icon-lucide-brain :class="ui.icon()" aria-hidden="true" />
      <span :class="ui.label()">{{ streaming ? thinkingLabel : finishedLabel }}</span>
      <icon-lucide-loader-circle v-if="streaming" :class="ui.spinner()" aria-hidden="true" />
      <icon-lucide-chevron-down v-else :class="ui.chevron()" aria-hidden="true" />
    </CollapsibleTrigger>
    <CollapsibleContent data-slot="chat-reasoning-content" :class="collapsibleContentMotion">
      <div :class="ui.body()">
        <ChatMarkdown :content="text" :mode="markdownMode" surface="reasoning" />
      </div>
    </CollapsibleContent>
  </CollapsibleRoot>
</template>
