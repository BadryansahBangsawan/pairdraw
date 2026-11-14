<script setup lang="ts">
import { computed } from 'vue'

import { useAutomationMessages, useCommonMessages } from '@pairdraw/vue/i18n'

import {
  MCP_CLIENT_COMMAND,
  MCP_CLIENT_ENTRY,
  MCP_CLIENTS
} from '@/app/automation/mcp/clients/catalog'
import type { MCPClientID } from '@/app/automation/mcp/clients/catalog'
import type { MCPClientChangeFailure, MCPClientStatus } from '@/app/automation/mcp/clients/service'
import type { MCPClientChangeNotice } from '@/app/automation/mcp/clients/settings/use'
import SettingsGroup from '@/components/settings/layout/SettingsGroup.vue'
import SettingsLink from '@/components/settings/layout/SettingsLink.vue'
import SettingsRow from '@/components/settings/layout/SettingsRow.vue'
import SettingsSection from '@/components/settings/layout/SettingsSection.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import AppSkeleton from '@/components/ui/feedback/AppSkeleton.vue'
import AppSwitch from '@/components/ui/toggle/AppSwitch.vue'
import { MCP_CLIENT_SETUP_DOCS_URL } from '@/constants'

/**
 * Switches that add the local server to agents and editors run outside the app, one per client,
 * with the outcome of the last switch flipped as the section's closing alert.
 */
const {
  statuses,
  loading = false,
  pending = null,
  notice = null
} = defineProps<{
  /** What each client's file holds; a client not listed yet is still being read. */
  statuses: readonly MCPClientStatus[]
  loading?: boolean
  /** The client whose file is being changed. */
  pending?: MCPClientID | null
  notice?: MCPClientChangeNotice | null
}>()
const emit = defineEmits<{ toggle: [client: MCPClientID, enabled: boolean]; refresh: [] }>()
const automation = useAutomationMessages()
const common = useCommonMessages()

const rows = computed(() => {
  const byID = new Map(statuses.map((status) => [status.id, status]))
  return MCP_CLIENTS.map((client) => ({ client, status: byID.get(client.id) }))
})

function isOn(status: MCPClientStatus): boolean {
  return status.state === 'added' || status.state === 'custom' || status.state === 'manual'
}

/** Only a client set up on this computer, with a file Pairdraw can change, can be switched. */
function isLocked(status: MCPClientStatus): boolean {
  return (
    pending !== null ||
    !status.installed ||
    status.state === 'manual' ||
    status.state === 'invalid' ||
    status.state === 'unreadable'
  )
}

function note(status: MCPClientStatus): string | undefined {
  if (status.state === 'unreadable') return automation.value.mcpClientUnreadable
  if (!status.installed) return automation.value.mcpClientNotInstalled
  return {
    absent: undefined,
    added: undefined,
    custom: automation.value.mcpClientCustom,
    manual: automation.value.mcpClientManual,
    invalid: automation.value.mcpClientInvalid
  }[status.state]
}

const failures = computed<Record<MCPClientChangeFailure, string>>(() => ({
  changed: automation.value.mcpClientFailedChanged,
  invalid: automation.value.mcpClientFailedInvalid,
  manual: automation.value.mcpClientFailedManual,
  'too-large': automation.value.mcpClientFailedTooLarge,
  'not-installed': automation.value.mcpClientNotInstalled,
  unreadable: automation.value.mcpClientUnreadable,
  refused: automation.value.mcpClientFailedWrite,
  'write-failed': automation.value.mcpClientFailedWrite
}))

const alert = computed(() => {
  if (!notice) return null
  const client = notice.name
  const { change } = notice
  if (change.outcome === 'failed') {
    return {
      tone: 'error' as const,
      heading: automation.value.mcpClientFailed({ client }),
      description: failures.value[change.reason]
    }
  }
  const restart = automation.value.mcpClientRestartHint({ client })
  return {
    tone: 'success' as const,
    heading: change.enabled
      ? automation.value.mcpClientAdded({ client })
      : automation.value.mcpClientRemoved({ client }),
    description: change.backup
      ? `${restart} ${automation.value.mcpClientBackup({ path: change.backup })}`
      : restart
  }
})
</script>

<template>
  <SettingsSection :aria-busy="loading || pending !== null" data-slot="mcp-clients">
    <template #title>{{ automation.mcpClientsTitle }}</template>
    <template #description>
      {{
        automation.mcpClientsDescription({ server: MCP_CLIENT_ENTRY, command: MCP_CLIENT_COMMAND })
      }}
      <SettingsLink :href="MCP_CLIENT_SETUP_DOCS_URL">{{ common.learnMore }}</SettingsLink>
    </template>
    <template #actions>
      <AppButton
        variant="outline"
        :loading="loading"
        :disabled="pending !== null"
        @click="emit('refresh')"
      >
        <template #leading><icon-lucide-refresh-cw class="size-3.5" /></template>
        {{ automation.mcpClientsRefresh }}
      </AppButton>
    </template>
    <SettingsGroup>
      <SettingsRow
        v-for="{ client, status } in rows"
        :key="client.id"
        :label="client.name"
        :data-client="client.id"
      >
        <template #description>
          <template v-if="status">
            <code v-if="status.displayPath" class="mt-1 block text-[11px] break-all text-muted">{{
              status.displayPath
            }}</code>
            <span v-if="note(status)" class="mt-1 block text-[11px] text-muted">{{
              note(status)
            }}</span>
          </template>
          <AppSkeleton v-else class="mt-1.5 w-40 max-w-full" />
        </template>
        <AppSwitch
          v-if="status"
          :model-value="isOn(status)"
          :label="automation.mcpClientToggle({ client: client.name })"
          :disabled="isLocked(status)"
          @update:model-value="emit('toggle', client.id, $event)"
        />
        <AppSkeleton v-else class="w-7" />
      </SettingsRow>
    </SettingsGroup>
    <AppAlert
      v-if="alert"
      :tone="alert.tone"
      :heading="alert.heading"
      :description="alert.description"
    />
  </SettingsSection>
</template>
