import type { SceneGraph, SceneNode } from '@pairdraw/scene-graph'
import { BLACK } from '@pairdraw/scene-graph/constants'
import { readIcon, type IconOptions } from '@pairdraw/scene-graph/icons'
import type { Color } from '@pairdraw/scene-graph/primitives'
import {
  layersUsingVariables,
  resolvedIconBinding,
  type BindingScope
} from '@pairdraw/scene-graph/variables'

import { restoreSubtree, snapshotSubtree } from '#core/editor/history/subtree'
import type { EditorContext } from '#core/editor/types'
import { pushCreatedSubtreesUndo } from '#core/editor/undo'
import { parseIconName } from '#core/icons/provider'
import { detachIcon, placeIcon, recolorIcon, swapIcon } from '#core/icons/render'
import type { IconData } from '#core/icons/types'

/** The size a picked icon is placed at, as Iconify sets draw them. */
const ICON_SIZE = 24

/**
 * Icon commands: insert, swap, and recolor, each one undo step. An icon is a frame of paths,
 * so inserting and swapping record the frame's whole subtree and swap between the copies.
 */
export function createIconActions(ctx: EditorContext) {
  async function fetchIcon(name: string, size: number, options?: IconOptions): Promise<IconData> {
    const icon = (await ctx.icons.icons([name], size, options)).get(name)
    if (!icon || icon.paths.length === 0) throw new Error(`Icon "${name}" not found`)
    return icon
  }

  /** Runs `change` on the icon `frameId`, undoably, putting back the subtree it had before. */
  function changeIcon(label: string, frameId: string, change: () => void): void {
    const frame = ctx.graph.getNode(frameId)
    const parentId = frame?.parentId
    if (!frame || !parentId) return
    const index = ctx.graph.getNode(parentId)?.childIds.indexOf(frameId) ?? -1
    const before = snapshotSubtree(ctx.graph, frameId)
    change()
    const after = snapshotSubtree(ctx.graph, frameId)
    const show = (snapshot: Map<string, SceneNode>) => () => {
      const root = snapshot.get(frameId)
      if (!root) return
      if (ctx.graph.getNode(frameId)) ctx.graph.deleteNode(frameId)
      restoreSubtree(ctx.graph, root, parentId, snapshot)
      if (index !== -1) ctx.graph.insertChildAt(frameId, parentId, index)
      ctx.requestRender()
    }
    ctx.undo.push({ label, forward: show(after), inverse: show(before) })
    ctx.requestRender()
  }

  /**
   * Places the icon `name` at the middle of the view, in the container being edited or the
   * page, and selects it; null when the document was replaced while the icon loaded.
   */
  async function insertIcon(name: string, color: Color = BLACK): Promise<string | null> {
    const graph = ctx.graph
    const icon = await fetchIcon(name, ICON_SIZE)
    // Opening another document while the icon loaded leaves nothing to insert it into.
    if (ctx.graph !== graph) return null
    const { width, height } = ctx.getViewportSize()
    const parentId = ctx.state.enteredContainerId ?? ctx.state.currentPageId
    const origin =
      parentId === ctx.state.currentPageId
        ? { x: 0, y: 0 }
        : ctx.graph.getAbsolutePosition(parentId)
    const x = (width / 2 - ctx.state.panX) / ctx.state.zoom - origin.x - ICON_SIZE / 2
    const y = (height / 2 - ctx.state.panY) / ctx.state.zoom - origin.y - ICON_SIZE / 2
    const previousSelection = new Set(ctx.state.selectedIds)
    const frame = placeIcon(ctx.graph, parentId, icon, {
      size: ICON_SIZE,
      color,
      overrides: { x: Math.round(x), y: Math.round(y) }
    })
    pushCreatedSubtreesUndo(ctx, 'Insert icon', [frame.id], previousSelection)
    ctx.setSelectedIds(new Set([frame.id]))
    ctx.requestRender()
    return frame.id
  }

  /** Draws the icon `name` fresh in the icon `frameId`, as one step called `label`. */
  async function drawIcon(label: string, frameId: string, name: string, options?: IconOptions) {
    const graph = ctx.graph
    const frame = graph.getNode(frameId)
    if (!frame || !readIcon(frame)) return
    const icon = await fetchIcon(name, Math.min(frame.width, frame.height), options)
    // The document or the frame may have been replaced while the icon loaded.
    if (ctx.graph !== graph || graph.getNode(frameId) !== frame) return
    changeIcon(label, frameId, () => swapIcon(graph, frameId, icon))
  }

  /**
   * Draws the icon `name` in the icon `frameId`, keeping its size, position, and color, and how
   * it is drawn when the new icon is from the same set.
   */
  async function swapIconGlyph(frameId: string, name: string) {
    const frame = ctx.graph.getNode(frameId)
    const current = frame && readIcon(frame)
    const sameSet = current && parseIconName(current.name)?.prefix === parseIconName(name)?.prefix
    await drawIcon('Swap icon', frameId, name, sameSet ? current.options : undefined)
  }

  /** Draws the icon `frameId` was placed as afresh, undoing edits to its paths. */
  async function resetIcon(frameId: string) {
    const frame = ctx.graph.getNode(frameId)
    const icon = frame && readIcon(frame)
    if (icon) await drawIcon('Reset icon', frameId, icon.name, icon.options)
  }

  /**
   * Draws the icon `frameId` again with `options` set over the ones it was drawn with, such as a
   * Material Symbol's weight or fill, keeping its size, position, and color, as one step. Sets
   * without options ignore them; edits to its paths are discarded, as a reset does.
   */
  async function setIconOptions(frameId: string, options: IconOptions) {
    const frame = ctx.graph.getNode(frameId)
    const icon = frame && readIcon(frame)
    if (icon)
      await drawIcon('Change icon options', frameId, icon.name, { ...icon.options, ...options })
  }

  /** Makes the icon `frameId` plain artwork that keeps its paths; see `detachIcon`. */
  function detachIconFrame(frameId: string) {
    const frame = ctx.graph.getNode(frameId)
    if (!frame || !readIcon(frame)) return
    changeIcon('Detach icon', frameId, () => detachIcon(ctx.graph, frameId))
  }

  /**
   * Sets the color of the icon `frameId`'s tinted paths. Only their paints are recorded, so a
   * color drag batched into one step stays cheap.
   */
  function setIconColor(frameId: string, color: Color) {
    const paints = () =>
      ctx.graph.getChildren(frameId).map(({ id, fills, strokes }) => ({ id, fills, strokes }))
    const before = paints()
    recolorIcon(ctx.graph, frameId, color)
    const after = paints()
    const apply = (state: typeof before) => () => {
      for (const { id, ...rest } of state) ctx.graph.updateNode(id, rest)
      ctx.requestRender()
    }
    ctx.undo.push({ label: 'Change icon color', forward: apply(after), inverse: apply(before) })
    ctx.requestRender()
  }

  return {
    /** Where the editor's icons come from, for pickers to search and preview. */
    iconProvider: ctx.icons,
    insertIcon,
    swapIconGlyph,
    resetIcon,
    setIconOptions,
    detachIcon: detachIconFrame,
    setIconColor
  }
}

/**
 * The icon frames a change to `scope` can reach: those bound through the scope's variables, or
 * the icon frames in the scope's subtrees.
 */
function scopeIconFrames(graph: SceneGraph, scope: BindingScope): SceneNode[] {
  if ('variables' in scope) {
    return layersUsingVariables(graph, scope.variables).filter(
      (node) => node.type === 'FRAME' && readIcon(node) !== null
    )
  }
  const frames: SceneNode[] = []
  const visit = (id: string) => {
    const node = graph.getNode(id)
    if (!node) return
    if (node.type === 'FRAME' && readIcon(node) !== null) frames.push(node)
    for (const childId of node.childIds) visit(childId)
  }
  for (const id of scope.subtrees) visit(id)
  return frames
}

/**
 * Draws the icons the variables in `scope` name after a change they can reach, such as a mode
 * switch from one glyph to another. Redrawing is derived work, not another history entry: a
 * mode switch undoes as one step, the icons following it back. Failures keep the icon the frame
 * drew, as a font a binding names keeps its fallback until it loads.
 */
export async function loadBoundIcons(ctx: EditorContext, scope: BindingScope): Promise<void> {
  const graph = ctx.graph
  const redraws: Array<{ frame: SceneNode; name: string }> = []
  for (const frame of scopeIconFrames(graph, scope)) {
    const name = resolvedIconBinding(graph, frame)
    if (name) redraws.push({ frame, name })
  }
  if (redraws.length === 0) return
  await Promise.all(
    redraws.map(async ({ frame, name }) => {
      if (graph.getNode(frame.id) !== frame || resolvedIconBinding(graph, frame) !== name) return
      const size = Math.max(1, Math.min(frame.width, frame.height))
      const icon = (await ctx.icons.icons([name], size).catch(() => null))?.get(name)
      // The document or the frame may have been replaced while the icon loaded.
      if (!icon || icon.paths.length === 0 || ctx.graph !== graph || !graph.getNode(frame.id))
        return
      if (resolvedIconBinding(graph, graph.getNode(frame.id) ?? frame) !== name) return
      swapIcon(graph, frame.id, icon)
    })
  )
  ctx.requestRender()
}
