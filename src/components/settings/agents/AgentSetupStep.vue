<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import { useI18n } from '@open-pencil/vue/i18n'

import type { AgentConnectStepStatus } from '@/app/ai/agents/setup/view'
import theme from '@/theme/settings/agents'

/** One step of connecting a coding agent, with its progress. */
const { status } = defineProps<{ status: AgentConnectStepStatus }>()
const { ai } = useI18n()
const styles = tv(theme)()

const statusLabel = computed(() => {
  if (status === 'done') return ai.value.aiSetupConnectStepDone
  if (status === 'running') return ai.value.aiSetupConnectStepRunning
  if (status === 'failed') return ai.value.aiSetupConnectStepFailed
  if (status === 'manual') return ai.value.aiSetupConnectStepManual
  return ai.value.aiSetupConnectStepPending
})
</script>

<template>
  <li
    :class="styles.item()"
    :data-status="status"
    :aria-current="status === 'running' ? 'step' : undefined"
  >
    <icon-lucide-circle-check
      v-if="status === 'done'"
      :class="styles.readyIcon()"
      aria-hidden="true"
    />
    <icon-lucide-loader-2
      v-else-if="status === 'running'"
      :class="styles.spinner()"
      aria-hidden="true"
    />
    <icon-lucide-circle-alert
      v-else-if="status === 'failed'"
      :class="styles.failedIcon()"
      aria-hidden="true"
    />
    <icon-lucide-terminal
      v-else-if="status === 'manual'"
      :class="styles.missingIcon()"
      aria-hidden="true"
    />
    <icon-lucide-circle-dashed v-else :class="styles.missingIcon()" aria-hidden="true" />
    <span class="flex-1">
      <slot />
      <span class="sr-only"> · {{ statusLabel }}</span>
    </span>
  </li>
</template>
