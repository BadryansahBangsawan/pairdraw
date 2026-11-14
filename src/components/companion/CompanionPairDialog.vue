<script setup lang="ts">
import { computed } from 'vue'

import { AUTOMATION_HTTP_PORT } from '@pairdraw/core/constants'
import { useI18n } from '@pairdraw/vue/i18n'

import { companion } from '@/app/automation/companion/connection'
import AppConfirmationDialog from '@/components/ui/dialog/AppConfirmationDialog.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import { useHeldContent } from '@/components/ui/overlay/held'

/**
 * Asks before a tab opened from a companion link pairs with it. Any page can open such a link,
 * so the person confirms the port and the characters the companion's terminal printed.
 */
const { ai, common } = useI18n()
const pending = useHeldContent(() => companion.state.pending)
const open = computed({
  get: () => companion.state.pending !== null,
  set: (value) => {
    if (!value && companion.state.pending) companion.dismiss()
  }
})
</script>

<template>
  <AppConfirmationDialog
    v-model:open="open"
    data-test-id="companion-pair-dialog"
    :heading="ai.companionPairTitle"
    :description="ai.companionPairDescription({ fingerprint: pending?.fingerprint ?? '' })"
    :cancel-label="common.cancel"
    :confirm-label="ai.companionPairConfirm"
    @confirm="void companion.confirm()"
  >
    <AppAlert
      v-if="pending && pending.port !== AUTOMATION_HTTP_PORT"
      tone="warning"
      :heading="ai.companionPairPortWarning({ port: String(pending.port) })"
    />
  </AppConfirmationDialog>
</template>
