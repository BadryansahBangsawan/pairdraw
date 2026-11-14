<script setup lang="ts">
import { useI18n } from '@pairdraw/vue/i18n'

import { chatAgentTheme } from '@/components/chat/ui'
import AppButton from '@/components/ui/button/AppButton.vue'
import IconButton from '@/components/ui/button/IconButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppCopyField from '@/components/ui/input/AppCopyField.vue'

/**
 * Names the coding agent the chat switched to on its own, with a way to pick another model. It
 * stays until the person dismisses it or writes their next message; the chat announces it from
 * a status region that stays mounted. `signedOut` says instead, as an alert, that the agent
 * refused a message because nobody is signed in to it, with the command that signs in to it and
 * a way to send the message again.
 */
const {
  agent,
  signedOut = false,
  signInCommand = null
} = defineProps<{
  agent: string
  /** The agent refused the last message: nobody is signed in to it. */
  signedOut?: boolean
  /** What to run in a terminal to sign in to the agent. */
  signInCommand?: string | null
}>()
const emit = defineEmits<{ change: []; dismiss: []; retry: [] }>()
const { ai, common } = useI18n()
const styles = chatAgentTheme()
</script>

<template>
  <div v-if="signedOut" :class="styles.failure()" data-test-id="chat-agent-signed-out">
    <AppAlert tone="warning" :heading="ai.chatAgentSignInNeeded({ agent })">
      <template v-if="signInCommand">{{ ai.aiSetupConnectSignInCommand }}</template>
      <template v-if="signInCommand" #details>
        <AppCopyField
          :value="signInCommand"
          :copy-label="common.copy"
          :copied-label="common.copied"
        />
      </template>
      <template #actions>
        <AppButton size="xs" color="primary" variant="solid" @click="emit('retry')">
          {{ ai.retryRequest }}
        </AppButton>
        <AppButton size="xs" variant="outline" @click="emit('change')">
          {{ ai.chatAgentChange }}
        </AppButton>
        <AppButton size="xs" variant="ghost" @click="emit('dismiss')">
          {{ common.dismiss }}
        </AppButton>
      </template>
    </AppAlert>
  </div>
  <div v-else :class="styles.notice()" data-test-id="chat-agent-notice">
    <icon-lucide-bot :class="styles.noticeIcon()" aria-hidden="true" />
    <span :class="styles.noticeText()">{{ ai.chatAgentUsing({ agent }) }}</span>
    <AppButton size="xs" color="primary" variant="link" @click="emit('change')">
      {{ ai.chatAgentChange }}
    </AppButton>
    <IconButton :label="common.dismiss" size="xs" @click="emit('dismiss')">
      <icon-lucide-x class="size-3" />
    </IconButton>
  </div>
</template>
