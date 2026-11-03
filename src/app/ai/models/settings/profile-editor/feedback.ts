import { computed, ref, type Ref } from 'vue'

import { aiModelSettings } from '@/app/ai/models'
import { useSettingsValidation } from '@/app/settings/validation/use'

import { isVertexClaudeDraft, useVertexCredentialKind } from './platform'
import { modelProfileSchema, type ModelProfileValidationMessages } from './schema'
import type { useModelProfileEditor } from './use'

/** Connection details a cloud platform's fields keep outside the draft until they are valid. */
export interface PlatformFieldInput {
  /** The Vertex AI project as typed; the draft's base URL holds it only once it is valid. */
  vertexProject: Readonly<Ref<string>>
}

export function useModelProfileFeedback(
  profile: ReturnType<typeof useModelProfileEditor>,
  keyInput: Readonly<Ref<string>>,
  messages: Readonly<Ref<ModelProfileValidationMessages>>,
  platform: PlatformFieldInput
) {
  const testing = ref(false)
  const vertexCredentialKind = useVertexCredentialKind(
    profile.draft,
    keyInput,
    profile.hasExistingKey
  )
  const providerKind = computed(() => {
    if (profile.isACP.value) return 'acp'
    if (profile.isCloud.value) return 'cloud'
    return profile.isHarness.value ? 'harness' : 'api'
  })
  const values = computed(() => ({
    name: profile.draft.name,
    modelID: profile.draft.modelID,
    customModelID: profile.draft.customModelID,
    baseURL: profile.draft.customBaseURL,
    credential: Boolean(keyInput.value.trim() || profile.hasExistingKey.value),
    cloudWorkspace: profile.draft.cloudWorkspaceId ?? '',
    vertexProject: platform.vertexProject.value,
    vertexCredentialKind: vertexCredentialKind.value,
    tools: (profile.knownModel.value
      ? profile.knownCapabilities.value
      : profile.draft.capabilities
    ).includes('tools')
  }))
  const schema = computed(() =>
    modelProfileSchema(
      {
        customModel: profile.customModelSelected.value,
        intent: testing.value ? 'test' : 'save',
        providerKind: providerKind.value,
        supportsCustomBaseURL: Boolean(profile.providerDef.value.supportsCustomBaseURL),
        design: profile.draft.profileId === aiModelSettings.value.assignments.design,
        vertex:
          profile.draft.providerID === 'google-vertex'
            ? { claude: isVertexClaudeDraft(profile.draft) }
            : undefined
      },
      messages.value
    )
  )
  const validation = useSettingsValidation(values, schema)
  return {
    ...validation,
    async validate(intent: 'save' | 'test') {
      testing.value = intent === 'test'
      return validation.validate()
    }
  }
}
