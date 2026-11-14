<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'

import { IS_TAURI } from '@pairdraw/core/constants'
import { useCommonMessages, useCredentialMessages, useSettingsMessages } from '@pairdraw/vue/i18n'

import type { AIModelProfileDraft } from '@/app/ai/models'
import { savedBedrockAuthKind } from '@/app/ai/models/settings/profile-editor/platform'
import {
  serializeAWSCredentials,
  type BedrockAuthKind
} from '@/app/ai/providers/bedrock/credential'
import {
  BEDROCK_REGIONS,
  bedrockConnectionBaseURL,
  bedrockRegion
} from '@/app/ai/providers/bedrock/endpoint'
import ProviderSettingsField from '@/components/settings/provider/ProviderSettingsField.vue'
import ProviderSettingsInput from '@/components/settings/provider/ProviderSettingsInput.vue'
import ProviderSettingsKeyField from '@/components/settings/provider/ProviderSettingsKeyField.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'
import SegmentedControl from '@/components/ui/select/SegmentedControl.vue'

/**
 * Where a Bedrock model runs and how it signs in: a region, then a Bedrock API key or AWS access
 * keys. The access keys are saved together as one credential.
 */
const baseURL = defineModel<string>('baseUrl', { required: true })
const credential = defineModel<string>('credential', { required: true })
const {
  draft,
  saved,
  error,
  keyPlaceholder,
  keyURL,
  desktop = IS_TAURI
} = defineProps<{
  draft: AIModelProfileDraft
  saved: boolean
  error?: string
  keyPlaceholder: string
  keyURL: string
  /** Whether requests can be signed here; browsers block the signature header. */
  desktop?: boolean
}>()
const emit = defineEmits<{ clear: []; blur: [] }>()
const settings = useSettingsMessages()
const credentials = useCredentialMessages()
const common = useCommonMessages()

const region = computed({
  get: () => bedrockRegion(baseURL.value),
  set: (value: string) => {
    baseURL.value = bedrockConnectionBaseURL(value)
  }
})
const regionOptions = BEDROCK_REGIONS.map((value) => ({ value, label: value }))

const authKind = ref<BedrockAuthKind>('api-key')
const authTouched = ref(false)
const authOptions = computed(() => [
  { value: 'api-key', label: settings.value.bedrockAPIKey },
  // Saved access keys stay selectable, so the browser still shows how the model signs in.
  {
    value: 'aws',
    label: settings.value.bedrockAccessKeys,
    disabled: !desktop && authKind.value !== 'aws'
  }
])
const keys = reactive({ accessKeyId: '', secretAccessKey: '', sessionToken: '' })

onMounted(async () => {
  const kind = await savedBedrockAuthKind(draft).catch(() => null)
  if (kind && !authTouched.value) authKind.value = kind
})

function resetKeys(): void {
  keys.accessKeyId = ''
  keys.secretAccessKey = ''
  keys.sessionToken = ''
}

function setAuthKind(value: string): void {
  if (value !== 'api-key' && value !== 'aws') return
  authTouched.value = true
  authKind.value = value
  resetKeys()
  credential.value = ''
}

watch(keys, () => {
  if (authKind.value === 'aws') credential.value = serializeAWSCredentials(keys)
})

function clear(): void {
  resetKeys()
  emit('clear')
}

const keysHint = computed(() =>
  saved ? settings.value.awsAccessKeysSavedHint : settings.value.awsAccessKeysHint
)
</script>

<template>
  <ProviderSettingsField v-slot="{ control }" :label="settings.platformRegion">
    <AppSelect
      v-bind="control"
      v-model="region"
      :label="settings.platformRegion"
      :options="regionOptions"
      data-test-id="provider-settings-bedrock-region"
    />
  </ProviderSettingsField>

  <div class="flex flex-col gap-1.5">
    <span class="text-xs text-surface">{{ settings.platformAuthentication }}</span>
    <SegmentedControl
      :model-value="authKind"
      :options="authOptions"
      :label="settings.platformAuthentication"
      data-test-id="provider-settings-bedrock-auth"
      @update:model-value="setAuthKind"
    />
    <p v-if="!desktop" class="text-[11px] leading-relaxed text-muted">
      {{ settings.bedrockAccessKeysDesktop }}
    </p>
  </div>

  <ProviderSettingsKeyField
    v-if="authKind === 'api-key'"
    v-model="credential"
    :label="settings.bedrockAPIKey"
    :saved="saved"
    :hint="saved ? settings.savedCredentialHint : undefined"
    :error="error"
    kind="api"
    :placeholder="saved ? credentials.savedReplace : keyPlaceholder"
    :key-u-r-l="keyURL"
    :key-u-r-l-label="credentials.getAPIKey"
    @clear="clear"
    @blur="emit('blur')"
  />
  <template v-else>
    <ProviderSettingsField
      v-slot="{ control }"
      :label="settings.awsAccessKeyID"
      :hint="keysHint"
      :error="error"
      :clear-label="saved ? common.clear : undefined"
      data-test-id="provider-settings-clear-key"
      @clear="clear"
      @blur="emit('blur')"
    >
      <ProviderSettingsInput
        v-bind="control"
        v-model="keys.accessKeyId"
        :aria-label="settings.awsAccessKeyID"
        :placeholder="saved ? credentials.savedReplace : 'AKIA…'"
        autocomplete="off"
        autocapitalize="off"
        :spellcheck="false"
        data-test-id="provider-settings-aws-access-key-id"
      />
    </ProviderSettingsField>
    <ProviderSettingsField v-slot="{ control }" :label="settings.awsSecretAccessKey">
      <ProviderSettingsInput
        v-bind="control"
        v-model="keys.secretAccessKey"
        type="password"
        :aria-label="settings.awsSecretAccessKey"
        autocomplete="off"
        data-test-id="provider-settings-aws-secret-access-key"
      />
    </ProviderSettingsField>
    <ProviderSettingsField
      v-slot="{ control }"
      :label="settings.awsSessionToken"
      :hint="settings.awsSessionTokenHint"
    >
      <ProviderSettingsInput
        v-bind="control"
        v-model="keys.sessionToken"
        type="password"
        :aria-label="settings.awsSessionToken"
        autocomplete="off"
        data-test-id="provider-settings-aws-session-token"
      />
    </ProviderSettingsField>
  </template>
</template>
