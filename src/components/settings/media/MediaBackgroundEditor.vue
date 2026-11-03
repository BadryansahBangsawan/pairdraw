<script setup lang="ts">
import { computed } from 'vue'

import {
  useCommonMessages,
  useCredentialMessages,
  useMediaMessages,
  useSettingsMessages
} from '@open-pencil/vue/i18n'

import { REMOVE_BG_KEY_URL, REMOVE_BG_NAME } from '@/app/editor/image-ai'
import { useBackgroundSettingsEditor } from '@/app/editor/image-ai/settings/background'
import { useSettingsFormGuard } from '@/app/settings/navigation/use'
import SettingsPage from '@/components/settings/layout/SettingsPage.vue'
import SettingsSaveFeedback from '@/components/settings/layout/SettingsSaveFeedback.vue'
import ProviderSettingsField from '@/components/settings/provider/ProviderSettingsField.vue'
import ProviderSettingsKeyField from '@/components/settings/provider/ProviderSettingsKeyField.vue'
import AppButton from '@/components/ui/button/AppButton.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'

/** Who removes backgrounds: the AI images service, or remove.bg with its own key. */
const emit = defineEmits<{ done: [] }>()
const common = useCommonMessages()
const credentials = useCredentialMessages()
const media = useMediaMessages()
const settings = useSettingsMessages()
const editor = useBackgroundSettingsEditor()
const { key, serviceID, usesRemoveBg, keyStatus, error, dirty, busy, clearCredential } = editor

useSettingsFormGuard({
  dirty,
  busy,
  cancel: () => emit('done'),
  crumb: { parent: () => settings.value.media, title: () => media.value.backgroundRemoval }
})

const serviceOptions = computed(() => [
  { value: 'image-ai', label: media.value.backgroundServiceImageAI },
  { value: 'remove-bg', label: REMOVE_BG_NAME }
])
const serviceModel = computed({
  get: () => serviceID.value,
  set: (value: string) => {
    if (value === 'image-ai' || value === 'remove-bg') serviceID.value = value
  }
})
const placeholder = computed(() =>
  keyStatus.value === 'configured' ? credentials.value.savedReplace : credentials.value.apiKey
)

async function save() {
  if (await editor.save()) emit('done')
}
</script>

<template>
  <form
    class="flex min-h-0 min-w-0 flex-1 flex-col"
    :aria-busy="busy"
    data-test-id="settings-background-editor"
    @submit.prevent="save"
  >
    <SettingsPage>
      <div class="flex flex-col gap-5">
        <fieldset :disabled="busy" class="flex w-full min-w-0 flex-col gap-5">
          <ProviderSettingsField v-slot="{ control }" :label="media.backgroundService">
            <AppSelect
              v-bind="control"
              v-model="serviceModel"
              :options="serviceOptions"
              :label="media.backgroundService"
              :disabled="busy"
              data-test-id="settings-background-service"
            />
          </ProviderSettingsField>
          <ProviderSettingsKeyField
            v-if="usesRemoveBg"
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
            :key-u-r-l="REMOVE_BG_KEY_URL"
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
