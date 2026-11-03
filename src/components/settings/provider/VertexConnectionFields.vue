<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'

import { useCredentialMessages, useSettingsMessages } from '@open-pencil/vue/i18n'

import type { AIModelProfileDraft } from '@/app/ai/models'
import { vertexNeedsProject } from '@/app/ai/models/settings/profile-editor/platform'
import {
  isVertexProject,
  parseVertexBaseURL,
  VERTEX_LOCATIONS,
  vertexBaseURL
} from '@/app/ai/providers/vertex/endpoint'
import ProviderSettingsField from '@/components/settings/provider/ProviderSettingsField.vue'
import ProviderSettingsInput from '@/components/settings/provider/ProviderSettingsInput.vue'
import ProviderSettingsKeyField from '@/components/settings/provider/ProviderSettingsKeyField.vue'
import AppSelect from '@/components/ui/select/AppSelect.vue'

/**
 * Where a Vertex AI model runs and how it signs in: a project and location, kept together as
 * the connection's base URL, and an access token or API key. The project is also a model of its
 * own, so the form can refuse to save one that is mistyped instead of dropping it.
 */
const baseURL = defineModel<string>('baseUrl', { required: true })
const credential = defineModel<string>('credential', { required: true })
const project = defineModel<string>('project', { required: true })
const { draft, saved, error, projectError, keyPlaceholder, keyURL } = defineProps<{
  draft: AIModelProfileDraft
  saved: boolean
  error?: string
  projectError?: string
  keyPlaceholder: string
  keyURL: string
}>()
const emit = defineEmits<{ clear: []; blur: []; projectBlur: [] }>()
const settings = useSettingsMessages()
const credentials = useCredentialMessages()

// The base URL holds a location only beside a project, so the choice is kept here until then.
const initial = parseVertexBaseURL(baseURL.value)
// The project is the parent's model, so it is handed up once the parent listens; set during
// setup, a saved model's project would be lost and the field would open empty.
onMounted(() => {
  project.value = initial.project
})
const location = ref<string>(initial.location)
const locationOptions = VERTEX_LOCATIONS.map((value) => ({ value, label: value }))
const hasProject = computed(() => isVertexProject(project.value.trim()))

watch([project, location], () => {
  baseURL.value = vertexBaseURL({ project: project.value.trim(), location: location.value })
})

const projectHint = computed(() =>
  vertexNeedsProject(draft)
    ? settings.value.vertexProjectRequired
    : settings.value.vertexProjectHint
)
</script>

<template>
  <ProviderSettingsField
    v-slot="{ control }"
    :label="settings.vertexProject"
    :hint="projectHint"
    :error="projectError"
    @blur="emit('projectBlur')"
  >
    <ProviderSettingsInput
      v-bind="control"
      v-model="project"
      :aria-label="settings.vertexProject"
      placeholder="my-project"
      autocomplete="off"
      autocapitalize="off"
      :spellcheck="false"
      data-test-id="provider-settings-vertex-project"
    />
  </ProviderSettingsField>

  <ProviderSettingsField
    v-slot="{ control }"
    :label="settings.vertexLocation"
    :hint="hasProject ? settings.vertexLocationHint : settings.vertexLocationExpress"
  >
    <AppSelect
      v-bind="control"
      v-model="location"
      :disabled="!hasProject"
      :label="settings.vertexLocation"
      :options="locationOptions"
      data-test-id="provider-settings-vertex-location"
    />
  </ProviderSettingsField>

  <ProviderSettingsKeyField
    v-model="credential"
    :label="settings.vertexCredential"
    :saved="saved"
    :hint="saved ? settings.savedCredentialHint : settings.vertexCredentialHint"
    :error="error"
    kind="api"
    :placeholder="saved ? credentials.savedReplace : keyPlaceholder"
    :key-u-r-l="keyURL"
    :key-u-r-l-label="credentials.getAPIKey"
    @clear="emit('clear')"
    @blur="emit('blur')"
  />
</template>
