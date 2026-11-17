<script setup lang="ts">
import { tv } from 'tailwind-variants'
import { computed } from 'vue'

import { useEditorStore } from '@/app/editor/active-store'
import { useNotificationMessages } from '@/app/i18n/notifications'
import { openSettingsDialog } from '@/app/settings/dialog'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import saveFailureTheme from '@/theme/editor/save-failure'

const store = useEditorStore()
const notifications = useNotificationMessages()
const styles = tv(saveFailureTheme)()
const failure = computed(() => store.state.saveFailure)
const heading = computed(() => {
  const current = failure.value
  if (!current) return ''
  return notifications.value.saveFailed({
    name: store.state.documentName || 'Untitled',
    error: current.error
  })
})
</script>

<template>
  <div v-if="failure" :class="styles.root()">
    <AppAlert tone="error" :heading="heading" :ui="{ root: styles.alert() }">
      <template #actions>
        <AppButton size="xs" variant="outline" @click="openSettingsDialog('diagnostics')">
          {{ notifications.viewDiagnostics }}
        </AppButton>
      </template>
    </AppAlert>
  </div>
</template>
