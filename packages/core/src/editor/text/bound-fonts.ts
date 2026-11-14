import type { SceneNode } from '@pairdraw/scene-graph'

import { createClipboardFontActions } from '#core/editor/clipboard/fonts'
import type { EditorContext } from '#core/editor/types'
import { fontManager } from '#core/text/font/manager'

/** The families a variable decides for a text layer, on the layer and on its characters. */
function boundFamilies(node: SceneNode): string[] {
  if (node.type !== 'TEXT') return []
  const families = node.boundVariables.fontFamily ? [node.fontFamily] : []
  for (const run of node.styleRuns) {
    const family = run.style.fontFamily
    if (run.style.boundVariables?.fontFamily && family) families.push(family)
  }
  return families
}

/**
 * Whether a face of a bound family that this layer draws with has not loaded yet. Faces are
 * checked one by one: another layer may have loaded the family's Regular while this one is Bold,
 * italic, or has a run in its own weight.
 */
function needsBoundFaces(ctx: EditorContext, id: string): boolean {
  const node = ctx.graph.getNode(id)
  if (!node) return false
  const families = new Set(boundFamilies(node))
  if (families.size === 0) return false
  return fontManager
    .collectFontKeys(ctx.graph, [id])
    .some(([family, style]) => families.has(family) && !fontManager.isStyleLoaded(family, style))
}

/**
 * Loads the fonts that font family bindings name after a reconcile changed these layers, such as
 * a mode switch from a brand's font to another's. Resolving a binding only names the family; the
 * text draws in a fallback until its faces arrive, then lays out and draws again.
 */
export function loadBoundFonts(ctx: EditorContext, nodeIds: readonly string[]): void {
  const pending = nodeIds.filter((id) => needsBoundFaces(ctx, id))
  if (pending.length === 0) return
  createClipboardFontActions(ctx)
    .loadFontsForNodes(pending)
    .catch((error: unknown) => {
      console.warn(
        'Loading a bound font family failed:',
        error instanceof Error ? error.message : String(error)
      )
    })
}
