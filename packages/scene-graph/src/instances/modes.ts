// How a copy's variable modes follow its component layer one collection at a time.
import { uniq } from 'es-toolkit/array'

import type { SceneNode, VariableModeMap } from '../types'
import { variableModeOverrideField } from './overrides'

/** Collections whose mode a layer sets otherwise than the layer it copies, a cleared one included. */
export function differingVariableModeCollections(
  node: Pick<SceneNode, 'variableModes'>,
  source: Pick<SceneNode, 'variableModes'>
): string[] {
  return uniq([...Object.keys(source.variableModes), ...Object.keys(node.variableModes)]).filter(
    (collectionId) => node.variableModes[collectionId] !== source.variableModes[collectionId]
  )
}

/**
 * The modes a copy shows after a sync: its component layer's, but in each collection the copy
 * overrides, the mode the copy set, or none where it cleared one. A copy that overrides its
 * whole map keeps it; null then, as nothing changes.
 */
export function syncedVariableModes(
  target: Pick<SceneNode, 'variableModes'>,
  source: Pick<SceneNode, 'variableModes'>,
  overridden: (field: string) => boolean
): VariableModeMap | null {
  if (overridden('variableModes')) return null
  const modes: VariableModeMap = { ...source.variableModes }
  for (const collectionId of uniq([
    ...Object.keys(source.variableModes),
    ...Object.keys(target.variableModes)
  ])) {
    if (!overridden(variableModeOverrideField(collectionId))) continue
    if (Object.hasOwn(target.variableModes, collectionId)) {
      modes[collectionId] = target.variableModes[collectionId]
    } else Reflect.deleteProperty(modes, collectionId)
  }
  return modes
}
