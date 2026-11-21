import type { Ref } from 'vue'

import { resolveModelPricing } from '@/app/ai/models/catalog'
import { useDesignModelCatalog } from '@/app/ai/models/catalog/design'

import type { ModelPricing } from './schema'

/**
 * The list price of the chat's current model, from the model catalog; null while it loads, when
 * the catalog lists no price, or for a coding agent whose tokens carry no dollar price.
 */
export function useDesignModelPricing(
  resolve: typeof resolveModelPricing = resolveModelPricing
): Readonly<Ref<ModelPricing | null>> {
  return useDesignModelCatalog<ModelPricing>(
    async (providerID, modelID) => (await resolve(providerID, modelID)) ?? null
  )
}
