<script setup lang="ts">
import { isReasoningUIPart, isTextUIPart } from 'ai'
import type { UIMessage } from 'ai'
import { computed, ref } from 'vue'

import { useI18n } from '@pairdraw/vue/i18n'
import { vTestId } from '@pairdraw/vue/testing'

import { attachmentsForMessage } from '@/app/ai/attachment/presentation/store'
import type { AttachmentPresentation } from '@/app/ai/attachment/presentation/types'
import { undoOf, wasStopped } from '@/app/ai/chat/metadata'
import { reasoningDisplay as preferredReasoningDisplay } from '@/app/ai/chat/preferences'
import { visibleUserMessageText } from '@/app/ai/chat/presentation'
import { groupMessageParts, type MessagePartGroup } from '@/app/ai/chat/tool-calls/display'
import { estimatedCostUsd, turnUsageOf } from '@/app/ai/chat/usage/aggregate'
import { useDesignModelPricing } from '@/app/ai/chat/usage/pricing'
import type { ReasoningDisplay } from '@/app/settings/preferences/store'
import ChatAttachmentList from '@/components/chat/attachment/ChatAttachmentList.vue'
import ChatMarkdown from '@/components/chat/ChatMarkdown.vue'
import ChatReasoning from '@/components/chat/ChatReasoning.vue'
import ChatReferenceText from '@/components/chat/reference/ChatReferenceText.vue'
import ChatToolCallGroup from '@/components/chat/tool/ChatToolCallGroup.vue'
import ChatMessageEditor from '@/components/chat/turn/ChatMessageEditor.vue'
import ChatTurnActions from '@/components/chat/turn/ChatTurnActions.vue'
import { chatMessageTheme } from '@/components/chat/ui'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'

const {
  message,
  streaming = false,
  presentation,
  canRegenerate = false,
  canRetry = false,
  canEdit = false,
  reasoningDisplay
} = defineProps<{
  message: UIMessage
  streaming?: boolean
  presentation?: { text?: string; attachments?: AttachmentPresentation[] }
  /** The last reply, when the chat is idle. */
  canRegenerate?: boolean
  /** The last message, a request that got no reply, when the chat is idle. */
  canRetry?: boolean
  /** The last user message without attachments, when the chat is idle. */
  canEdit?: boolean
  /** Overrides the reasoning display preference, for a surface that always shows it. */
  reasoningDisplay?: ReasoningDisplay
}>()
const emit = defineEmits<{ regenerate: []; revert: []; restore: []; edit: [text: string] }>()
const editing = ref(false)
const { ai } = useI18n()
const ui = chatMessageTheme()
const markdownMode = computed(() => (streaming ? 'streaming' : 'static'))
const turnUsage = computed(() => turnUsageOf(message))
const modelPricing = useDesignModelPricing()
const turnCostUsd = computed(() =>
  turnUsage.value ? estimatedCostUsd(turnUsage.value, modelPricing.value) : null
)
const storedAttachments = attachmentsForMessage(message.id)
const attachments = computed(() => presentation?.attachments ?? storedAttachments.value)
const assistantText = computed(() =>
  message.parts
    .filter(isTextUIPart)
    .map((part) => part.text)
    .join('')
)
const userText = computed(
  () =>
    presentation?.text ??
    visibleUserMessageText(
      message.id,
      message.parts
        .filter(isTextUIPart)
        .map((p) => p.text)
        .join('')
    )
)

function saveEdit(text: string): void {
  editing.value = false
  emit('edit', text)
}

// The AI SDK updates parts in place and replaces only the message, so copy each part for
// the cards' computed state to see the new values.
const undo = computed(() => undoOf(message))
const undoneCalls = computed(() => new Set(undo.value?.undone))
const reverted = computed(
  () =>
    !!undo.value &&
    undo.value.edits.length > 0 &&
    undoneCalls.value.size === undo.value.edits.length
)
const stopped = computed(() => wasStopped(message))
// A request that failed once its reply had started leaves the reply without content.
const empty = computed(() => message.parts.every((part) => part.type === 'step-start'))
const groups = computed(() => groupMessageParts(message.parts.map((part) => ({ ...part }))))

function groupKey(group: MessagePartGroup): string {
  return group.kind === 'tools' ? `tools-${group.parts[0]?.index}` : `part-${group.index}`
}
</script>

<template>
  <div v-test-id="`chat-message-${message.role}`" :class="ui.root()" :data-role="message.role">
    <div :class="ui.column()">
      <template v-if="message.role === 'assistant'">
        <div data-slot="chat-reply-content" :data-reverted="reverted" :class="ui.reply()">
          <template v-for="group in groups" :key="groupKey(group)">
            <ChatToolCallGroup
              v-if="group.kind === 'tools'"
              :parts="group.parts.map(({ part }) => part)"
              :undone="undoneCalls"
            />

            <!-- Reasoning -->
            <ChatReasoning
              v-else-if="isReasoningUIPart(group.part) && group.part.text"
              :text="group.part.text"
              :display="reasoningDisplay ?? preferredReasoningDisplay"
              :streaming="streaming && group.part.state === 'streaming'"
              :thinking-label="ai.thinking"
              :reasoning-label="ai.reasoning"
              :duration-label="(seconds) => ai.thoughtFor({ seconds })"
            />

            <!-- Text: the reply reads as plain text on the panel. -->
            <div
              v-else-if="isTextUIPart(group.part) && group.part.text"
              data-test-id="chat-text-bubble"
              :class="ui.text()"
            >
              <ChatMarkdown :content="group.part.text" :mode="markdownMode" />
            </div>
          </template>
        </div>
        <ChatTurnActions
          :message-id="message.id"
          :text="assistantText"
          :streaming="streaming"
          :can-regenerate="canRegenerate"
          :empty="empty"
          :reverted="reverted"
          :stopped="stopped"
          :undone="undoneCalls.size"
          :edits="undo?.edits.length ?? 0"
          :usage="turnUsage"
          :usage-cost-usd="turnCostUsd"
          @regenerate="emit('regenerate')"
          @revert="emit('revert')"
          @restore="emit('restore')"
        />
      </template>

      <!-- User message -->
      <template v-else-if="message.role === 'user'">
        <ChatAttachmentList v-if="attachments.length" :attachments="attachments" />
        <ChatMessageEditor
          v-if="editing"
          :text="userText"
          @save="saveEdit"
          @cancel="editing = false"
        />
        <div v-else :class="ui.request()">
          <div data-test-id="chat-text-bubble" data-slot="chat-user-bubble" :class="ui.bubble()">
            <ChatReferenceText :text="userText" tone="ink" />
          </div>
          <IconButton
            v-if="canEdit"
            :label="ai.editMessage"
            size="xs"
            data-slot="chat-edit-message"
            :class="ui.edit()"
            @click="editing = true"
          >
            <icon-lucide-pencil class="size-3" />
          </IconButton>
        </div>
        <div v-if="canRetry && !editing" :class="ui.retry()">
          <AppButton
            size="xs"
            variant="ghost"
            data-test-id="chat-retry"
            @click="emit('regenerate')"
          >
            <template #leading><icon-lucide-refresh-cw aria-hidden="true" /></template>
            {{ ai.retryRequest }}
          </AppButton>
        </div>
      </template>
    </div>
  </div>
</template>
