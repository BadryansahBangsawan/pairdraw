import { computed, ref, watch, type Ref } from 'vue'

import type { AIProviderID } from '@pairdraw/core/constants'

import { designModelConnection, designModelProfile } from '@/app/ai/models'
import { resolveModelPricing } from '@/app/ai/models/catalog'
import { resolveLanguageModelID } from '@/app/ai/models/language-model'

import type { ModelPricing } from './schema'

/** The model the next built-in request goes to, or null for a coding agent, which prices its own. */
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
 * The list price of the chat's current model, from the model catalog; null while it loads, when
 * the catalog lists no price, or for a coding agent whose tokens carry no dollar price.
 */
export function useDesignModelPricing(
  resolve: typeof resolveModelPricing = resolveModelPricing
): Readonly<Ref<ModelPricing | null>> {
  const pricing = ref<ModelPricing | null>(null)
  const model = computed(designModel)
  const key = computed(() =>
    model.value ? `${model.value.providerID}\0${model.value.modelID}` : null
  )
  watch(
    key,
    async (requested) => {
      pricing.value = null
      const target = model.value
      if (!requested || !target) return
      const resolved = await resolve(target.providerID, target.modelID).catch(() => null)
      // A model switched meanwhile has its own price.
      if (key.value === requested) pricing.value = resolved ?? null
    },
    { immediate: true }
  )
  return pricing
}
