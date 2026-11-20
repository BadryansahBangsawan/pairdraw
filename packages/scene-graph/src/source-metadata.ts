import type { SceneNode } from './types'

/** Values a peer computes for itself; recording one as an edit would differ between replicas. */
const DERIVED_FIELDS: ReadonlySet<string> = new Set(['textPicture'])

export function markSourceFieldsEdited(node: SceneNode, changeKeys: string[]): void {
  const edited = changeKeys.filter((key) => !DERIVED_FIELDS.has(key))
  if (edited.length === 0) return
  const editedFields = new Set(node.source.editedFields)
  for (const key of edited) editedFields.add(key)
  node.source.editedFields = [...editedFields]
}
