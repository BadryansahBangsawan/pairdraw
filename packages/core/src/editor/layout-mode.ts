import type { LayoutMode, SceneNode } from '@pairdraw/scene-graph'

import type { NodePreview } from './node-preview'
import type { EditorContext } from './types'

export function createLayoutModeActions(
  ctx: EditorContext,
  beginNodePreview: (label: string) => NodePreview
) {
  /**
   * Adding, switching, or removing auto layout moves and resizes children, nested layouts, and
   * Hug ancestors. A node preview records every layer it changes, so one undo puts them all back
   * where they were; setting the mode a frame already has records nothing.
   */
  function setLayoutMode(id: string, mode: LayoutMode) {
    const node = ctx.graph.getNode(id)
    if (!node || node.layoutMode === mode) return
    const preview = beginNodePreview(mode === 'NONE' ? 'Remove auto layout' : 'Add auto layout')
    // A group is only its children's bounds; a flow needs a frame to own it, as Figma converts.
    if (node.type === 'GROUP' && mode !== 'NONE') preview.update(id, { type: 'FRAME' })
    preview.update(id, layoutModeUpdates(ctx, node, id, mode))
    preview.commit()
  }

  /**
   * Takes layers out of their parent's auto layout or puts them back, as Figma's Ignore auto
   * layout toggle does. A layer taken out stays where it is and keeps its sizing, which applies
   * again when it returns; its siblings close the gap in the same undo step.
   */
  function setLayoutPositioning(ids: string[], positioning: SceneNode['layoutPositioning']) {
    // Read every place first: taking one layer out moves the siblings after it.
    const targets = ids.flatMap((id) => {
      const node = ctx.graph.getNode(id)
      const parent = node?.parentId ? ctx.graph.getNode(node.parentId) : undefined
      if (!node || !parent || parent.layoutMode === 'NONE') return []
      if (node.layoutPositioning === positioning) return []
      return [{ id, x: node.x, y: node.y }]
    })
    if (targets.length === 0) return
    const preview = beginNodePreview(
      positioning === 'ABSOLUTE' ? 'Ignore auto layout' : 'Use auto layout'
    )
    for (const { id, x, y } of targets) {
      preview.update(
        id,
        positioning === 'ABSOLUTE'
          ? { layoutPositioning: positioning, x, y }
          : { layoutPositioning: positioning }
      )
    }
    preview.commit()
  }

  return { setLayoutMode, setLayoutPositioning }
}

function layoutModeUpdates(
  ctx: EditorContext,
  node: SceneNode,
  id: string,
  mode: LayoutMode
): Partial<SceneNode> {
  const updates: Partial<SceneNode> = { layoutMode: mode }
  if (mode === 'GRID' && node.layoutMode !== 'GRID') {
    applyGridDefaults(ctx, node, id, updates)
  } else if (mode === 'NONE') {
    // Figma keeps the spacing and padding for when auto layout comes back, and drops the rest:
    // a frame with no flow cannot wrap or align one.
    Object.assign(updates, {
      primaryAxisSizing: 'FIXED',
      counterAxisSizing: 'FIXED',
      layoutWrap: 'NO_WRAP',
      primaryAxisAlign: 'MIN',
      counterAxisAlign: 'MIN',
      counterAxisSpacing: 0,
      layoutDirection: 'AUTO'
    })
  } else if (node.layoutMode === 'NONE') {
    Object.assign(updates, autoLayoutDefaults())
  }
  return updates
}

function applyGridDefaults(
  ctx: EditorContext,
  node: SceneNode,
  id: string,
  updates: Partial<SceneNode>
) {
  const children = ctx.graph.getChildren(id)
  const cols = Math.max(2, Math.ceil(Math.sqrt(children.length)))
  const rows = Math.max(1, Math.ceil(children.length / cols))
  updates.gridTemplateColumns = Array.from({ length: cols }, () => ({
    sizing: 'FR' as const,
    value: 1
  }))
  updates.gridTemplateRows = Array.from({ length: rows }, () => ({
    sizing: 'FR' as const,
    value: 1
  }))
  updates.gridColumnGap = 0
  updates.gridRowGap = 0
  updates.primaryAxisSizing = 'FIXED'
  updates.counterAxisSizing = 'FIXED'
  if (node.primaryAxisSizing === 'HUG' || node.counterAxisSizing === 'HUG') {
    const maxChildW = Math.max(...children.map((child) => child.width), 100)
    const maxChildH = Math.max(...children.map((child) => child.height), 100)
    updates.width = maxChildW * cols
    updates.height = maxChildH * rows
  }
  updates.paddingTop = 0
  updates.paddingRight = 0
  updates.paddingBottom = 0
  updates.paddingLeft = 0
}

function autoLayoutDefaults(): Partial<SceneNode> {
  return {
    itemSpacing: 0,
    paddingTop: 0,
    paddingRight: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    primaryAxisSizing: 'HUG',
    counterAxisSizing: 'HUG',
    primaryAxisAlign: 'MIN',
    counterAxisAlign: 'MIN'
  }
}
