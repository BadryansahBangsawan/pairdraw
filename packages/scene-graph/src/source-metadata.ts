import type { SceneNode } from './types'

/** Values a peer computes for itself; recording one as an edit would differ between replicas. */
const DERIVED_FIELDS: ReadonlySet<string> = new Set(['textPicture'])

/** Told each field an edit marked for the first time, so a step can take the mark back. */
export type SourceMarkObserver = (nodeId: string, field: string) => void

export function markSourceFieldsEdited(
  node: SceneNode,
  changeKeys: string[],
  observe?: SourceMarkObserver
): void {
  const edited = changeKeys.filter((key) => !DERIVED_FIELDS.has(key))
  if (edited.length === 0) return
  const editedFields = new Set(node.source.editedFields)
  for (const key of edited) {
    if (editedFields.has(key)) continue
    observe?.(node.id, key)
    editedFields.add(key)
  }
  node.source.editedFields = [...editedFields]
}
