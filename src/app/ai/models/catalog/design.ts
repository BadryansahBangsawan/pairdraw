import { computed, ref, watch, type Ref } from 'vue'

import type { AIProviderID } from '@pairdraw/core/constants'

import { designModelConnection, designModelProfile } from '@/app/ai/models'
import { resolveLanguageModelID } from '@/app/ai/models/language-model'

/** The model the next built-in request goes to, or null for a coding agent, which reports its own. */
function designModel(): { providerID: AIProviderID; modelID: string } | null {
  const profile = designModelProfile.value
  const providerID = designModelConnection.value?.providerID
  if (!profile || !providerID || providerID.startsWith('acp:') || providerID === 'harness:pi') {
    return null
  }
  const modelID = resolveLanguageModelID({
    providerID,
    modelID: profile.modelID,
    customModelID: profile.customModelID
  })
  return modelID ? { providerID, modelID } : null
}

/**
 * What the model catalog says about the chat's current model, such as its context window or its
 * price; null while it loads, when the catalog does not list it, or for a coding agent.
 */
export function useDesignModelCatalog<T>(
  resolve: (providerID: AIProviderID, modelID: string) => Promise<T | null>
): Readonly<Ref<T | null>> {
  const value = ref<T | null>(null) as Ref<T | null>
  const model = computed(designModel)
  const key = computed(() =>
    model.value ? `${model.value.providerID}\0${model.value.modelID}` : null
  )
  watch(
    key,
    async (requested) => {
      value.value = null
      const target = model.value
      if (!requested || !target) return
      const resolved = await resolve(target.providerID, target.modelID).catch(() => null)
      // A model switched meanwhile has its own entry.
      if (key.value === requested) value.value = resolved
    },
    { immediate: true }
  )
  return value
}
