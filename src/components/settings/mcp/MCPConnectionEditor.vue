<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'

import { IS_TAURI } from '@open-pencil/core/constants'
import { useAutomationMessages, useCommonMessages } from '@open-pencil/vue/i18n'

import type { MCPConnectionDraft } from '@/app/integrations/mcp'
import type { MCPConnectionTestResult } from '@/app/integrations/mcp/client/test'
import type { MCPSignInStatus, MCPTestStatus } from '@/app/integrations/mcp/settings/access'
import type {
  MCPConnectionField,
  MCPConnectionFieldErrors
} from '@/app/integrations/mcp/settings/form'
import type { CredentialStatus } from '@/app/settings/credentials/types'
import type { SettingsSaveResult } from '@/app/settings/save-result'
import { focusInvalidField } from '@/components/settings/layout/focus'
import SettingsGroup from '@/components/settings/layout/SettingsGroup.vue'
import SettingsPage from '@/components/settings/layout/SettingsPage.vue'
import SettingsRow from '@/components/settings/layout/SettingsRow.vue'
import SettingsSaveFeedback from '@/components/settings/layout/SettingsSaveFeedback.vue'
import ProviderConnectionTestButton from '@/components/settings/provider/ProviderConnectionTestButton.vue'
import ProviderSettingsField from '@/components/settings/provider/ProviderSettingsField.vue'
import ProviderSettingsInput from '@/components/settings/provider/ProviderSettingsInput.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppSwitch from '@/components/ui/toggle/AppSwitch.vue'

import MCPConnectionAuthFields from './MCPConnectionAuthFields.vue'
import MCPConnectionTransportFields from './MCPConnectionTransportFields.vue'

const draft = defineModel<MCPConnectionDraft>('draft', { required: true })
const token = defineModel<string>('token', { required: true })
const env = defineModel<string>('env', { default: '' })
const {
  tokenStatus,
  envStatus = 'missing',
  busy,
  error,
  saveResult,
  fieldErrors = {},
  desktop = IS_TAURI,
  signedIn = false,
  signInStatus = 'idle',
  canSignIn = false,
  canTest = false,
  testStatus = 'idle',
  testResult = null
} = defineProps<{
  tokenStatus: CredentialStatus
  envStatus?: CredentialStatus
  busy: boolean
  error: string
  saveResult?: SettingsSaveResult | null
  fieldErrors?: MCPConnectionFieldErrors
  desktop?: boolean
  signedIn?: boolean
  signInStatus?: MCPSignInStatus
  canSignIn?: boolean
  /** Whether the connection is saved as shown, which the test needs. */
  canTest?: boolean
  testStatus?: MCPTestStatus
  testResult?: MCPConnectionTestResult | null
}>()
const emit = defineEmits<{
  cancel: []
  save: []
  remove: []
  clear: []
  clearEnv: []
  blurField: [field: MCPConnectionField]
  signIn: []
  reopen: []
  cancelSignIn: []
  signOut: []
  test: []
}>()
const automation = useAutomationMessages()
const common = useCommonMessages()
const formElement = useTemplateRef<HTMLFormElement>('formElement')
defineExpose({ focusInvalid: () => focusInvalidField(formElement.value) })

const testButtonStatus = computed(() => {
  if (testStatus === 'testing') return 'testing'
  if (!testResult) return 'idle'
  return testResult.ok ? 'success' : 'error'
})
const testMessage = computed(() => {
  if (!testResult) return undefined
  if (testResult.ok) return automation.value.connectionTestSuccess({ count: testResult.tools })
  switch (testResult.reason) {
    case 'sign-in':
      return automation.value.connectionTestSignIn
    case 'credential':
      return automation.value.connectionTestCredential
    case 'desktop-only':
      return automation.value.transportStdioDesktopOnly
    case 'declined':
      return automation.value.connectionTestDeclined
    default:
      return automation.value.connectionTestFailed
  }
})
</script>

<template>
  <form
    ref="formElement"
    class="flex min-h-0 min-w-0 flex-1 flex-col"
    :aria-busy="busy"
    novalidate
    @submit.prevent="emit('save')"
  >
    <SettingsPage>
      <div class="flex flex-col gap-3">
        <fieldset :disabled="busy" class="flex min-w-0 flex-col gap-3">
          <ProviderSettingsField
            v-slot="{ control }"
            :label="automation.connectionName"
            :hint="automation.connectionNameHint"
            :error="fieldErrors.name"
            @blur="emit('blurField', 'name')"
          >
            <ProviderSettingsInput
              v-bind="control"
              v-model="draft.name"
              :aria-label="automation.connectionName"
              autocomplete="off"
            />
          </ProviderSettingsField>
          <MCPConnectionTransportFields
            v-model:draft="draft"
            v-model:env="env"
            :env-status="envStatus"
            :busy="busy"
            :field-errors="fieldErrors"
            :desktop="desktop"
            @blur-field="emit('blurField', $event)"
            @clear-env="emit('clearEnv')"
          />
          <SettingsGroup>
            <SettingsRow :label="automation.enableConnection">
              <AppSwitch
                v-model="draft.enabled"
                :label="automation.enableConnection"
                :disabled="busy"
              />
            </SettingsRow>
          </SettingsGroup>
          <MCPConnectionAuthFields
            v-if="draft.transportType === 'streamable-http'"
            v-model:draft="draft"
            v-model:token="token"
            :token-status="tokenStatus"
            :busy="busy"
            :field-errors="fieldErrors"
            :signed-in="signedIn"
            :sign-in-status="signInStatus"
            :can-sign-in="canSignIn"
            @clear="emit('clear')"
            @blur-field="emit('blurField', $event)"
            @sign-in="emit('signIn')"
            @reopen="emit('reopen')"
            @cancel-sign-in="emit('cancelSignIn')"
            @sign-out="emit('signOut')"
          />
        </fieldset>
        <div v-if="draft.id" class="flex flex-col gap-1">
          <ProviderConnectionTestButton
            :status="testButtonStatus"
            :message="testMessage"
            :disabled="busy || !canTest"
            @test="emit('test')"
          />
          <p v-if="!canTest" class="text-[11px] leading-relaxed text-muted">
            {{ automation.connectionTestSaveFirst }}
          </p>
        </div>
        <SettingsSaveFeedback :error="error" :result="saveResult" />
      </div>
      <template #footer>
        <AppButton
          v-if="draft.id"
          class="mr-auto"
          color="error"
          variant="link"
          :disabled="busy"
          @click="emit('remove')"
          >{{ automation.deleteConnection }}</AppButton
        >
        <AppButton :disabled="busy" @click="emit('cancel')">{{ common.cancel }}</AppButton>
        <AppButton type="submit" color="primary" variant="solid" :loading="busy">{{
          common.save
        }}</AppButton>
      </template>
    </SettingsPage>
  </form>
</template>
