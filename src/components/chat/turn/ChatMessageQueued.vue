<script setup lang="ts">
import { useAIMessages } from '@open-pencil/vue/i18n'

import type { QueuedMessage } from '@/app/ai/chat/queue'
import ChatReferenceText from '@/components/chat/reference/ChatReferenceText.vue'
import { chatMessageTheme } from '@/components/chat/ui'
import IconButton from '@/components/ui/button/IconButton.vue'

/** A message the person wrote while the agent works, dimmed until the agent takes it in. */
const { message, steers } = defineProps<{
  message: QueuedMessage
  /** Whether the agent takes a message mid-turn; ACP agents and Pi take it once the turn ends. */
  steers: boolean
}>()
const emit = defineEmits<{ remove: [] }>()
const ai = useAIMessages()
const ui = chatMessageTheme()
</script>

<template>
  <div data-test-id="chat-queued-message" :data-kind="message.kind" :class="ui.queued()">
    <div :class="ui.queuedBubble()">
      <ChatReferenceText :text="message.submission.displayText" />
    </div>
    <div :class="ui.queuedStatus()">
      <span>{{ message.kind === 'steer' && steers ? ai.queuedSteer : ai.queuedFollowUp }}</span>
      <IconButton :label="ai.removeQueuedMessage" size="xs" @click="emit('remove')">
        <icon-lucide-x class="size-3" />
      </IconButton>
    </div>
  </div>
</template>
