<script setup lang="ts">
import { computed } from 'vue'

import {
  useCommonMessages,
  useCredentialMessages,
  useMediaMessages,
  useSettingsMessages
} from '@pairdraw/vue/i18n'

import { DEFAULT_IMAGE_AI_MODEL, IMAGE_AI_PROVIDER_DEFINITIONS } from '@/app/editor/image-ai'
import type { ImageAIProviderID } from '@/app/editor/image-ai'
import { useImageAISettingsEditor } from '@/app/editor/image-ai/settings/use'
import { useSettingsFormGuard } from '@/app/settings/navigation/use'
import SettingsPage from '@/components/settings/layout/SettingsPage.vue'
import SettingsSaveFeedback from '@/components/settings/layout/SettingsSaveFeedback.vue'
import ProviderSettingsField from '@/components/settings/provider/ProviderSettingsField.vue'
import ProviderSettingsInput from '@/components/settings/provider/ProviderSettingsInput.vue'
import ProviderSettingsKeyField from '@/components/settings/provider/ProviderSettingsKeyField.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'

/** The AI images service: OpenAI, or an OpenAI-compatible server, its model and its key. */
const emit = defineEmits<{ done: [] }>()
const common = useCommonMessages()
const credentials = useCredentialMessages()
const media = useMediaMessages()
const settings = useSettingsMessages()
const validationMessages = computed(() => ({
  requiredField: settings.value.requiredField,
  invalidURL: settings.value.invalidURL,
  insecureBaseURL: media.value.imageAIBaseURLInsecure
}))
const editor = useImageAISettingsEditor(validationMessages)
const {
  key,
  providerID,
  baseURL,
  model,
  provider,
  compatible,
  keyStatus,
  error,
  errors,
  blur,
  dirty,
  busy,
  clearCredential
} = editor

useSettingsFormGuard({
  dirty,
  busy,
  cancel: () => emit('done'),
  crumb: { parent: () => settings.value.media, title: () => media.value.imageAI }
})

const providerOptions = computed(() =>
  IMAGE_AI_PROVIDER_DEFINITIONS.map((definition) => ({
    value: definition.id,
    label: definition.id === 'openai' ? definition.name : media.value.imageAIProviderCompatible
  }))
)
const providerModel = computed({
  get: () => providerID.value,
  set: (value: string) => {
    const match = IMAGE_AI_PROVIDER_DEFINITIONS.find((definition) => definition.id === value)
    if (match) providerID.value = match.id satisfies ImageAIProviderID
  }
})
const placeholder = computed(() =>
  keyStatus.value === 'configured'
    ? credentials.value.savedReplace
    : (provider.value?.keyPlaceholder ?? '')
)

async function save() {
  if (await editor.save()) emit('done')
}
</script>

<template>
  <form
    class="flex min-h-0 min-w-0 flex-1 flex-col"
    :aria-busy="busy"
    data-test-id="settings-image-ai-editor"
    @submit.prevent="save"
  >
    <SettingsPage>
      <div class="flex flex-col gap-5">
        <fieldset :disabled="busy" class="flex w-full min-w-0 flex-col gap-5">
          <ProviderSettingsField v-slot="{ control }" :label="media.imageAIProvider">
            <AppSelect
              v-bind="control"
              v-model="providerModel"
              :options="providerOptions"
              :label="media.imageAIProvider"
              :disabled="busy"
              data-test-id="settings-image-ai-provider"
            />
          </ProviderSettingsField>
          <ProviderSettingsField
            v-if="compatible"
            v-slot="{ control }"
            :label="media.imageAIBaseURL"
            :hint="media.imageAIBaseURLHint"
            :error="errors.baseURL"
            @blur="blur('baseURL')"
          >
            <ProviderSettingsInput
              v-bind="control"
              v-model="baseURL"
              type="url"
              autocomplete="off"
              placeholder="https://example.com/v1"
              data-test-id="settings-image-ai-base-url"
            />
          </ProviderSettingsField>
          <ProviderSettingsField
            v-slot="{ control }"
            :label="media.imageAIModel"
            :hint="media.imageAIModelHint({ model: DEFAULT_IMAGE_AI_MODEL })"
          >
            <ProviderSettingsInput
              v-bind="control"
              v-model="model"
              autocomplete="off"
              :placeholder="DEFAULT_IMAGE_AI_MODEL"
              data-test-id="settings-image-ai-model"
            />
          </ProviderSettingsField>
          <ProviderSettingsKeyField
            v-model="key"
            :label="credentials.apiKey"
            :saved="keyStatus === 'configured'"
            :hint="
              keyStatus === 'configured'
                ? settings.savedCredentialHint
                : settings.optionalCredentialHint
            "
            kind="api"
            :placeholder="placeholder"
            :key-u-r-l="provider?.keyURL"
            :key-u-r-l-label="credentials.getAPIKey"
            @clear="clearCredential"
          />
        </fieldset>
        <SettingsSaveFeedback :error="error" />
      </div>
      <template #footer>
        <AppButton :disabled="busy" @click="emit('done')">{{ common.cancel }}</AppButton>
        <AppButton type="submit" color="primary" variant="solid" :loading="busy">{{
          common.save
        }}</AppButton>
      </template>
    </SettingsPage>
  </form>
</template>
