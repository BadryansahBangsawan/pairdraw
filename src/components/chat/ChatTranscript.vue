<script setup lang="ts">
import type { ChatStatus, UIMessage } from 'ai'
import { ScrollAreaRoot, ScrollAreaScrollbar, ScrollAreaThumb, ScrollAreaViewport } from 'reka-ui'
import { computed, provide, ref } from 'vue'

import { useI18n } from '@pairdraw/vue/i18n'

import { attachmentsForMessage } from '@/app/ai/attachment/presentation/store'
import type { AttachmentPresentation } from '@/app/ai/attachment/presentation/types'
import { compactionOf } from '@/app/ai/chat/compaction/marker'
import { contextUsageOf } from '@/app/ai/chat/context-window/usage'
import type { QueuedMessage } from '@/app/ai/chat/queue'
import { reviewOf } from '@/app/ai/review/message'
import type { ReasoningDisplay } from '@/app/settings/preferences/store'
import { CHAT_NODES_LIVE } from '@/components/chat/tool/context'
import { chatTranscriptTheme } from '@/components/chat/ui'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppPlaceholder from '@/components/ui/feedback/AppPlaceholder.vue'

import ChatMessage from './ChatMessage.vue'
import { useScrollFollowing } from './transcript/useScrollFollowing'
import ChatCompactionDivider from './turn/ChatCompactionDivider.vue'
import ChatMessageQueued from './turn/ChatMessageQueued.vue'
import ChatReviewCard from './turn/ChatReviewCard.vue'

/** The typing indicator's dots, each bouncing a beat after the one before. */
const DOT_STEPS = [0, 1, 2] as const

const {
  messages,
  status,
  showContinue = false,
  presentations,
  interactive = false,
  nodesLive = true,
  reasoningDisplay,
  queued = [],
  steers = false,
  compacting = false,
  reviewing = false,
  reviewsActionable = false
} = defineProps<{
  messages: UIMessage[]
  status: ChatStatus
  showContinue?: boolean
  presentations?: Record<string, { text?: string; attachments?: AttachmentPresentation[] }>
  /** Offers regenerating the last reply, retrying an unanswered request, and editing the last request. */
  interactive?: boolean
  /** False for a conversation from another document: its layer IDs are not this document's. */
  nodesLive?: boolean
  /** Overrides the reasoning display preference, for a surface that always shows it. */
  reasoningDisplay?: ReasoningDisplay
  /** Messages written while the agent works, shown after its reply until it takes them in. */
  queued?: readonly QueuedMessage[]
  /** Whether the agent takes a waiting message mid-turn. */
  steers?: boolean
  /** The conversation is being compacted, from a `/compact` or before a message goes. */
  compacting?: boolean
  /** The Review model is reviewing the design, from a `/review`. */
  reviewing?: boolean
  /** Whether a review's findings can be sent on now, which needs no live chat. */
  reviewsActionable?: boolean
}>()
const emit = defineEmits<{
  continue: []
  regenerate: []
  revert: [messageId: string]
  restore: [messageId: string]
  edit: [messageId: string, text: string]
  removeQueued: [id: string]
  fixReview: [messageId: string]
}>()
const { ai } = useI18n()
const ui = chatTranscriptTheme()
provide(
  CHAT_NODES_LIVE,
  computed(() => nodesLive)
)
const running = computed(() => status === 'submitted' || status === 'streaming')
const isThinking = computed(() => {
  if (compacting || reviewing) return true
  if (!running.value) return false
  const last = messages.at(-1)
  if (!last || last.role !== 'assistant') return true
  const part = last.parts.at(-1)
  if (!part || part.type === 'step-start') return true
  if ('toolCallId' in part && (part.state === 'output-available' || part.state === 'output-error'))
    return true
  return status === 'submitted'
})
const idle = computed(() => interactive && (status === 'ready' || status === 'error'))
// A request that failed before any reply is the last message; it is retried, not an older reply.
const lastMessage = computed(() => messages.at(-1))
/**
 * The newest message the person wrote. A compaction's summary is not one, and a request before
 * it is no longer the model's to answer, so neither is edited or retried.
 */
const lastRequest = computed(() => {
  const last = messages.findLast((m) => m.role === 'user')
  return last && compactionOf(last) === null ? last : undefined
})
/**
 * Each message with the compaction it marks, which the transcript draws as a divider, and what
 * the first reply after that compaction reported its request held, or the design review it is.
 */
const entries = computed(() =>
  messages.map((message, index) => {
    // A compaction within a reply is drawn by the reply, at the step where it ran.
    const compaction = message.role === 'user' ? compactionOf(message) : null
    const review = compaction ? null : reviewOf(message)
    return { message, compaction, review, tokensAfter: compaction ? tokensAfter(index) : null }
  })
)
/** What the first reply after the compaction at `index` reported, before the next one. */
function tokensAfter(index: number): number | null {
  for (const message of messages.slice(index + 1)) {
    if (compactionOf(message)) return null
    const usage = contextUsageOf(message)
    if (usage) return usage.usedTokens
  }
  return null
}
/** Messages with attachments carry context a plain text edit would drop. */
const editableRequestId = computed(() => {
  const request = lastRequest.value
  if (!request) return undefined
  // Images would be lost when the text is sent again; layer previews follow the edited text,
  // and files go with it.
  const attachments = [
    ...(presentations?.[request.id]?.attachments ?? []),
    ...attachmentsForMessage(request.id).value
  ]
  return attachments.some((attachment) => attachment.kind === 'image') ? undefined : request.id
})
const transcriptContent = ref<HTMLDivElement>()
const viewportComponent = ref<{ viewportElement?: HTMLElement }>()
const viewport = computed(() => viewportComponent.value?.viewportElement)
const { arrivedState, resumeFollowing } = useScrollFollowing(
  viewport,
  transcriptContent,
  computed(() => status === 'submitted')
)
</script>

<template>
  <ScrollAreaRoot :class="ui.root()">
    <ScrollAreaViewport ref="viewportComponent" :class="ui.viewport()">
      <AppPlaceholder
        v-if="messages.length === 0 && !reviewing"
        data-test-id="chat-empty-state"
        :label="ai.describeCreateOrChange"
        :ui="{ root: 'h-full' }"
      >
        <template #icon>
          <icon-lucide-message-circle class="size-5" />
        </template>
      </AppPlaceholder>

      <!-- Messages -->
      <!-- Live region so screen readers announce new assistant replies incrementally.
           role="log" + aria-live="polite" follows APG chat pattern; aria-busy mirrors the streaming state. -->
      <div
        v-else
        role="log"
        aria-live="polite"
        aria-atomic="false"
        :aria-busy="running"
        :class="ui.liveRegion()"
      >
        <div ref="transcriptContent" data-test-id="chat-messages" :class="ui.list()">
          <template v-for="({ message: msg, compaction, review, tokensAfter }, index) in entries">
            <ChatCompactionDivider
              v-if="compaction"
              :key="msg.id"
              :compaction="compaction"
              :tokens-after="tokensAfter"
            />
            <ChatReviewCard
              v-else-if="review"
              :key="msg.id"
              :review="review"
              :can-fix="reviewsActionable"
              @fix="emit('fixReview', msg.id)"
            />
            <ChatMessage
              v-else
              :key="msg.id"
              :message="msg"
              :presentation="presentations?.[msg.id]"
              :streaming="running && msg.role === 'assistant' && index === messages.length - 1"
              :can-regenerate="idle && msg.id === lastMessage?.id && msg.role === 'assistant'"
              :can-retry="idle && msg.id === lastMessage?.id && msg.role === 'user'"
              :can-edit="idle && msg.id === editableRequestId"
              :reasoning-display="reasoningDisplay"
              @regenerate="emit('regenerate')"
              @revert="emit('revert', msg.id)"
              @restore="emit('restore', msg.id)"
              @edit="(text) => emit('edit', msg.id, text)"
            />
          </template>

          <!-- Thinking indicator: shown when AI is working but no visible activity -->
          <div v-if="isThinking" data-test-id="chat-typing-indicator" :class="ui.typing()">
            <span :class="ui.typingAvatar()" aria-hidden="true">
              <icon-lucide-sparkle :class="ui.typingIcon()" />
            </span>
            <span :class="ui.dots()">
              <span v-for="step in DOT_STEPS" :key="step" :class="ui.dot()" :data-step="step" />
            </span>
          </div>

          <p
            v-if="reviewing"
            role="status"
            class="flex items-center justify-center gap-1.5 py-1 text-xs text-muted"
            data-test-id="chat-reviewing"
          >
            <icon-lucide-loader-circle
              class="size-3 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
            {{ ai.reviewing }}
          </p>

          <ChatMessageQueued
            v-for="item in queued"
            :key="item.id"
            :message="item"
            :steers="steers"
            @remove="emit('removeQueued', item.id)"
          />

          <!-- Continue button when step limit reached -->
          <div v-if="showContinue" :class="ui.continue()">
            <AppButton color="primary" variant="soft" shape="pill" @click="emit('continue')">
              <template #leading><icon-lucide-play class="size-3" /></template>
              {{ ai.continueChat }}
            </AppButton>
          </div>
        </div>
      </div>
    </ScrollAreaViewport>
    <ScrollAreaScrollbar orientation="vertical" :class="ui.scrollbar()">
      <ScrollAreaThumb :class="ui.thumb()" />
    </ScrollAreaScrollbar>
    <IconButton
      v-if="messages.length && !arrivedState.bottom"
      :label="ai.jumpToLatest"
      :class="ui.jump()"
      @click="resumeFollowing"
      ><icon-lucide-arrow-down class="size-4"
    /></IconButton>
  </ScrollAreaRoot>
</template>
