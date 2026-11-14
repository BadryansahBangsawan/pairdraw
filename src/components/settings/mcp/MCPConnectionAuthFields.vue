<script setup lang="ts">
import { computed } from 'vue'

import {
  useAutomationMessages,
  useCommonMessages,
  useCredentialMessages,
  useSettingsMessages
} from '@pairdraw/vue/i18n'

import type { MCPConnectionDraft } from '@/app/integrations/mcp'
import type { MCPSignInStatus } from '@/app/integrations/mcp/settings/access'
import type {
  MCPConnectionField,
  MCPConnectionFieldErrors
} from '@/app/integrations/mcp/settings/form'
import type { CredentialStatus } from '@/app/settings/credentials/types'
import ProviderSettingsKeyField from '@/components/settings/provider/ProviderSettingsKeyField.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppAlert from '@/components/ui/feedback/AppAlert.vue'
import SegmentedControl from '@/components/ui/select/SegmentedControl.vue'

const draft = defineModel<MCPConnectionDraft>('draft', { required: true })
const token = defineModel<string>('token', { required: true })
const {
  tokenStatus,
  busy,
  fieldErrors = {},
  signedIn = false,
  signInStatus = 'idle',
  canSignIn = false
} = defineProps<{
  tokenStatus: CredentialStatus
  busy: boolean
  fieldErrors?: MCPConnectionFieldErrors
  signedIn?: boolean
  signInStatus?: MCPSignInStatus
  /** Whether the connection is saved as shown, which sign-in needs. */
  canSignIn?: boolean
}>()
const emit = defineEmits<{
  clear: []
  blurField: [field: MCPConnectionField]
  signIn: []
  reopen: []
  cancelSignIn: []
  signOut: []
}>()
const automation = useAutomationMessages()
const common = useCommonMessages()
const credentials = useCredentialMessages()
const settings = useSettingsMessages()

const authenticationOptions = computed(() => [
  { value: 'none', label: automation.value.authenticationNone },
  { value: 'bearer', label: automation.value.authenticationBearer },
  { value: 'oauth', label: automation.value.authenticationOAuth }
])
function setAuthentication(value: string): void {
  if (value === 'none' || value === 'bearer' || value === 'oauth') {
    draft.value.authenticationType = value
  }
}
const failure = computed(() => {
  switch (signInStatus) {
    case 'cancelled':
      return automation.value.oauthCancelled
    case 'expired':
      return automation.value.oauthExpired
    case 'blocked':
      return automation.value.oauthBlocked
    case 'failed':
      return automation.value.oauthFailed
    default:
      return null
  }
})
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span class="text-xs text-surface">{{ automation.authenticationType }}</span>
    <SegmentedControl
      :model-value="draft.authenticationType"
      :options="authenticationOptions"
      :label="automation.authenticationType"
      @update:model-value="setAuthentication"
    />
  </div>
  <ProviderSettingsKeyField
    v-if="draft.authenticationType === 'bearer'"
    v-model="token"
    :label="automation.bearerToken"
    input-id="mcp-bearer-token"
    :saved="tokenStatus === 'configured'"
    kind="api"
    :placeholder="
      tokenStatus === 'configured' ? credentials.savedReplace : automation.bearerTokenPlaceholder
    "
    :hint="
      tokenStatus === 'configured' ? settings.savedCredentialHint : automation.bearerTokenRequired
    "
    :error="fieldErrors.credential"
    @clear="emit('clear')"
    @blur="emit('blurField', 'credential')"
  />
  <div v-else-if="draft.authenticationType === 'oauth'" class="flex flex-col gap-2" data-mcp-oauth>
    <p class="text-[11px] leading-relaxed text-muted">{{ automation.oauthHint }}</p>
    <div v-if="signInStatus === 'waiting'" class="flex flex-wrap items-center gap-2">
      <p role="status" class="flex items-center gap-1.5 text-[11px] text-muted">
        <icon-lucide-loader-2 class="size-3.5 animate-spin" aria-hidden="true" />
        {{ automation.oauthWaiting }}
      </p>
      <AppButton class="ml-auto" size="xs" variant="outline" @click="emit('reopen')">
        {{ automation.oauthReopen }}
      </AppButton>
      <AppButton size="xs" @click="emit('cancelSignIn')">{{ common.cancel }}</AppButton>
    </div>
    <div v-else-if="signedIn" class="flex flex-wrap items-center gap-2">
      <p role="status" class="flex items-center gap-1.5 text-[11px] text-surface">
        <icon-lucide-circle-check class="size-3.5 text-success" aria-hidden="true" />
        {{ automation.oauthSignedIn }}
      </p>
      <AppButton class="ml-auto" size="xs" :disabled="busy || !canSignIn" @click="emit('signIn')">
        {{ automation.oauthSignInAgain }}
      </AppButton>
      <AppButton size="xs" :disabled="busy" @click="emit('signOut')">
        {{ automation.oauthSignOut }}
      </AppButton>
    </div>
    <template v-else>
      <p role="status" class="text-[11px] text-muted">{{ automation.oauthNotSignedIn }}</p>
      <AppButton
        class="self-start"
        color="primary"
        variant="solid"
        :disabled="busy || !canSignIn"
        @click="emit('signIn')"
      >
        {{ automation.oauthSignIn }}
      </AppButton>
      <p v-if="!canSignIn" class="text-[11px] leading-relaxed text-muted">
        {{ automation.oauthSaveFirst }}
      </p>
    </template>
    <AppAlert v-if="failure" tone="warning" :heading="failure" />
  </div>
</template>
