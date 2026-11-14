import { computed, ref, watch, type Ref } from 'vue'

import type { AIProviderID } from '@pairdraw/core/constants'

import { designModelConnection, designModelProfile } from '@/app/ai/models'
import { resolveModelContextWindow } from '@/app/ai/models/catalog'
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
 * The context window of the chat's current model, from the model catalog, which the context
 * meter measures a conversation against; null while it loads or when the catalog does not list
 * the model.
 */
export function useDesignContextWindow(
  resolve: typeof resolveModelContextWindow = resolveModelContextWindow
): Readonly<Ref<number | null>> {
  const windowTokens = ref<number | null>(null)
  const model = computed(designModel)
  const key = computed(() =>
    model.value ? `${model.value.providerID}\0${model.value.modelID}` : null
  )
  watch(
    key,
    async (requested) => {
      windowTokens.value = null
      const target = model.value
      if (!requested || !target) return
      const resolved = await resolve(target.providerID, target.modelID).catch(() => null)
      // A model switched meanwhile has its own window.
      if (key.value === requested) windowTokens.value = resolved
    },
    { immediate: true }
  )
  return windowTokens
}
