<script setup lang="ts">
import { computed } from 'vue'

import { IS_TAURI } from '@pairdraw/core/constants'
import { useAutomationMessages, useCommonMessages } from '@pairdraw/vue/i18n'

import type { MCPConnectionDraft } from '@/app/integrations/mcp'
import type {
  MCPConnectionField,
  MCPConnectionFieldErrors
} from '@/app/integrations/mcp/settings/form'
import type { CredentialStatus } from '@/app/settings/credentials/types'
import ProviderSettingsField from '@/components/settings/provider/ProviderSettingsField.vue'
import ProviderSettingsInput from '@/components/settings/provider/ProviderSettingsInput.vue'
import AppTextarea from '@/components/ui/input/AppTextarea.vue'
import SegmentedControl from '@/components/ui/select/SegmentedControl.vue'

const draft = defineModel<MCPConnectionDraft>('draft', { required: true })
const env = defineModel<string>('env', { required: true })
const {
  envStatus,
  busy,
  fieldErrors = {},
  desktop = IS_TAURI
} = defineProps<{
  envStatus: CredentialStatus
  busy: boolean
  fieldErrors?: MCPConnectionFieldErrors
  /** Whether local commands can run here; only the desktop app runs them. */
  desktop?: boolean
}>()
const emit = defineEmits<{ blurField: [field: MCPConnectionField]; clearEnv: [] }>()
const automation = useAutomationMessages()
const common = useCommonMessages()

const transportOptions = computed(() => [
  { value: 'streamable-http', label: automation.value.transportHTTP },
  // An existing local command stays selectable, so the browser can still show and change it.
  {
    value: 'stdio',
    label: automation.value.transportStdio,
    disabled: !desktop && draft.value.transportType !== 'stdio'
  }
])
function setTransport(value: string): void {
  if (value === 'streamable-http' || value === 'stdio') draft.value.transportType = value
}
const envSaved = computed(() => envStatus === 'configured')
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="text-xs text-surface">{{ automation.transportType }}</span>
    <SegmentedControl
      :model-value="draft.transportType"
      :options="transportOptions"
      :label="automation.transportType"
      @update:model-value="setTransport"
    />
    <p v-if="!desktop" class="text-[11px] leading-relaxed text-muted">
      {{ automation.transportStdioDesktopOnly }}
    </p>
  </div>
  <ProviderSettingsField
    v-if="draft.transportType === 'streamable-http'"
    v-slot="{ control }"
    :label="automation.serverURL"
    :hint="automation.serverURLHint"
    :error="fieldErrors.url"
    @blur="emit('blurField', 'url')"
  >
    <ProviderSettingsInput
      v-bind="control"
      v-model="draft.url"
      type="url"
      :aria-label="automation.serverURL"
      placeholder="https://example.com/mcp"
      autocomplete="off"
      autocapitalize="off"
      :spellcheck="false"
    />
  </ProviderSettingsField>
  <template v-else>
    <ProviderSettingsField
      v-slot="{ control }"
      :label="automation.command"
      :hint="automation.commandHint"
      :error="fieldErrors.command"
      @blur="emit('blurField', 'command')"
    >
      <ProviderSettingsInput
        v-bind="control"
        v-model="draft.command"
        :aria-label="automation.command"
        placeholder="npx"
        autocomplete="off"
        autocapitalize="off"
        :spellcheck="false"
        data-mcp-command
      />
    </ProviderSettingsField>
    <ProviderSettingsField
      v-slot="{ control }"
      :label="automation.commandArguments"
      :hint="automation.commandArgumentsHint"
      @blur="emit('blurField', 'command')"
    >
      <AppTextarea
        :id="control.id"
        v-model="draft.args"
        :rows="3"
        :disabled="busy"
        :aria-describedby="control['aria-describedby']"
        placeholder="-y
@modelcontextprotocol/server-everything"
        autocomplete="off"
        autocapitalize="off"
        :spellcheck="false"
        class="font-mono"
      />
    </ProviderSettingsField>
    <ProviderSettingsField
      v-slot="{ control }"
      :label="automation.environment"
      :hint="envSaved ? automation.environmentSavedHint : automation.environmentHint"
      :error="fieldErrors.environment"
      :clear-label="envSaved ? common.clear : undefined"
      @clear="emit('clearEnv')"
      @blur="emit('blurField', 'environment')"
    >
      <AppTextarea
        :id="control.id"
        v-model="env"
        :rows="3"
        :disabled="busy"
        :aria-invalid="control['aria-invalid']"
        :aria-describedby="control['aria-describedby']"
        placeholder="API_KEY=…"
        autocomplete="off"
        autocapitalize="off"
        :spellcheck="false"
        class="font-mono"
      />
    </ProviderSettingsField>
  </template>
</template>
