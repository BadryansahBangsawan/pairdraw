<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import { useI18n } from '@open-pencil/vue/i18n'

import { isOutdatedCompanion } from '@/app/ai/agents/setup/companions'
import {
  COMPANION_COMMAND,
  companion,
  type CompanionState
} from '@/app/automation/companion/connection'
import { parseUserAgent } from '@/app/shell/support/detect'
import SettingsLink from '@/components/settings/layout/SettingsLink.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppStatus from '@/components/ui/feedback/AppStatus.vue'
import AppCopyField from '@/components/ui/input/AppCopyField.vue'
import { DESKTOP_DOWNLOAD_URL } from '@/constants'
import theme from '@/theme/settings/agents'

/**
 * In the web app, coding agents run on the person's computer through the companion. Shows the
 * command that starts it, whether this tab is paired, and why not when pairing failed.
 */
const { state: shownState } = defineProps<{
  /** Defaults to this tab's connection; stories pass their own. */
  state?: CompanionState
}>()
const emit = defineEmits<{ disconnect: [] }>()
const state = computed(() => shownState ?? companion.state)
/** Safari keeps websites from reaching programs on this computer. */
const safari = isSafari()
const { ai, common } = useI18n()
const styles = tv(theme)()

function isSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  return parseUserAgent(navigator.userAgent, navigator.maxTouchPoints).browser === 'safari'
}

const failureMessage = computed(() => {
  const { failure } = state.value
  if (failure === 'rejected') return ai.value.aiSetupCompanionRejected
  if (failure === 'rate-limited') return ai.value.aiSetupCompanionRateLimited
  if (failure === 'expired') return ai.value.aiSetupCompanionExpired
  if (failure === 'unreachable') return ai.value.aiSetupCompanionUnreachable
  return null
})
const outdated = computed(
  () => state.value.status === 'connected' && isOutdatedCompanion(state.value.version)
)

function disconnect() {
  emit('disconnect')
  companion.disconnect()
}
</script>

<template>
  <div :class="styles.signIn()" data-slot="agent-companion">
    <template v-if="state.status === 'connected'">
      <div :class="styles.actions()">
        <AppStatus tone="success">
          {{ ai.aiSetupCompanionConnected({ version: state.version ?? '' }) }}
        </AppStatus>
        <AppButton size="xs" variant="outline" @click="disconnect">
          {{ ai.aiSetupCompanionDisconnect }}
        </AppButton>
      </div>
      <AppAlert v-if="outdated" tone="warning" :heading="ai.aiSetupCompanionOutdated">
        <template #details>
          <AppCopyField
            :value="COMPANION_COMMAND"
            :copy-label="common.copy"
            :copied-label="common.copied"
          />
        </template>
      </AppAlert>
    </template>
    <template v-else>
      <p :class="styles.help()">{{ ai.aiSetupCompanionDescription }}</p>
      <AppCopyField
        :value="COMPANION_COMMAND"
        :copy-label="common.copy"
        :copied-label="common.copied"
      />
      <AppStatus v-if="state.status === 'pairing'" tone="pending">
        {{ ai.aiSetupCompanionPairing }}
      </AppStatus>
      <AppAlert v-if="safari" tone="warning" :heading="ai.aiSetupCompanionSafari">
        <template #actions>
          <SettingsLink :href="DESKTOP_DOWNLOAD_URL">{{ ai.aiSetupGetDesktop }}</SettingsLink>
        </template>
      </AppAlert>
      <AppAlert v-else-if="failureMessage" tone="warning" :heading="failureMessage" />
    </template>
  </div>
</template>
