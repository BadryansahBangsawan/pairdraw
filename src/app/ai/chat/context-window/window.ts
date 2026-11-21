import type { Ref } from 'vue'

import { resolveModelContextWindow } from '@/app/ai/models/catalog'
import { useDesignModelCatalog } from '@/app/ai/models/catalog/design'

/**
 * The context window of the chat's current model, from the model catalog, which the context
 * meter measures a conversation against; null while it loads or when the catalog does not list
 * the model.
 */
export function useDesignContextWindow(
  resolve: typeof resolveModelContextWindow = resolveModelContextWindow
): Readonly<Ref<number | null>> {
  return useDesignModelCatalog((providerID, modelID) => resolve(providerID, modelID))
}
