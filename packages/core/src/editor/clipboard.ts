import { uniq } from 'es-toolkit'

import { parseFigmaClipboard } from '@pairdraw/fig/clipboard'
import { CommittedGraphEventError, type SceneNode } from '@pairdraw/scene-graph'
import { attachedConnectors } from '@pairdraw/scene-graph/connectors'
import { getAxisAlignedBoundsInParent, getNodeLocalMatrix } from '@pairdraw/scene-graph/coordinate'
import { cycleSafeParent, recordInstanceOverride } from '@pairdraw/scene-graph/instances'
import type { Rect, Vector } from '@pairdraw/scene-graph/primitives'
import { slotPropertyId } from '@pairdraw/scene-graph/slots'
import { keepPastedBoundPaints, type AppliedBoundPaints } from '@pairdraw/scene-graph/variables'

import { parsePairdrawClipboard } from '#core/clipboard'
import { prepareClipboardImport } from '#core/clipboard/fig-import'
import { computeAllLayouts, layoutAuthoredNodes } from '#core/layout'
import { reconcileVariableLayouts } from '#core/layout/variables'

import { createClipboardAssetActions } from './clipboard/assets'
import type { ClipboardImportChoice } from './clipboard/conflicts'
import type { ClipboardSnapshot } from './clipboard/copy'
import { createClipboardCopyActions } from './clipboard/copy'
import { importClipboardDependenciesWithUndo } from './clipboard/dependencies'
import { createClipboardExportActions } from './clipboard/export'
import { createClipboardFontActions } from './clipboard/fonts'
import { deleteIds, recreateSnapshots, restoreDeletedEntries } from './clipboard/history'
import type { PasteHistoryOperation } from './clipboard/paste/replace'
import { replaceTargetsWithCreated, selectedReplacementTargets } from './clipboard/paste/replace'
import {
  pastedComponentIds,
  requestedPasteTarget,
  resolvePasteTarget
} from './clipboard/paste/target'
import {
  clipboardPlacement,
  createClipboardPlacementActions,
  type ClipboardPlacement
} from './clipboard/placement'
import { createStyledPasteActions } from './clipboard/styled'
import { replaceableInstanceLayers, replaceInstanceLayersWith } from './components/replace'
import { acceptsChildren, prepareSlotEdits } from './components/slots'
import { collectSubtrees, restoreSubtree, snapshotSubtree } from './history/subtree'
import { newLayerDefaults } from './shapes/defaults'
import { fitEnclosingGroupsWithUndo } from './structure/group/bounds'
import { loadBoundFonts } from './text/bound-fonts'
import type { EditorContext } from './types'

type PasteOptions = {
  replaceSelection?: boolean
  /**
   * Put the pasted layer in place of each selected layer inside an instance, as an override of
   * that instance (pen.dev's Replace inside instance), in the same undo step as the paste.
   */
  replaceInInstance?: boolean
  /** How a copy from another document brings its variables and styles (`planClipboardImport`). */
  dependencies?: ClipboardImportChoice
}

type PasteNodesOptions = PasteOptions & {
  /** Resolve the pasted layers' variable bindings where they land, before history records them. */
  resolveBindings?: boolean
}

/**
 * A copy of the layer under the same parent, keeping its name as Figma does. A main component
 * outside a component set duplicates as an instance of itself.
 */
export function duplicateNode(
  ctx: Pick<EditorContext, 'graph'>,
  node: SceneNode,
  parentId: string,
  position: Vector
): SceneNode | null {
  const parent = ctx.graph.getNode(parentId)
  if (node.type === 'COMPONENT' && parent?.type !== 'COMPONENT_SET') {
    return ctx.graph.createInstance(node.id, parentId, { name: node.name, ...position })
  }
  return ctx.graph.cloneTree(node.id, parentId, { name: node.name, ...position })
}

export function createClipboardActions(ctx: EditorContext) {
  function duplicateSelected(selectedNodes: SceneNode[]) {
    // One undo step for the copies and any slot they claim.
    ctx.undo.runBatch('Duplicate', () => duplicateLayers(selectedNodes))
  }

  function duplicateLayers(selectedNodes: SceneNode[]) {
    const prevSelection = new Set(ctx.state.selectedIds)
    const selectedSet = new Set(selectedNodes.map((n) => n.id))
    const stackIndex = (node: SceneNode) =>
      ctx.graph.getNode(node.parentId ?? ctx.state.currentPageId)?.childIds.indexOf(node.id) ?? -1
    // Copy in stacking order, not selection order, so the copies stack as their originals do.
    const topLevel = selectedNodes
      .filter((n) => !n.parentId || !selectedSet.has(n.parentId))
      .sort((a, b) => stackIndex(a) - stackIndex(b))
    const parents = topLevel.map((node) => node.parentId ?? ctx.state.currentPageId)
    if (!prepareSlotEdits(ctx, parents)) return

    const newRootIds: string[] = []
    const allSnapshots = new Map<string, SceneNode>()
    // The topmost layer each parent's copies came from.
    const topSource = new Map<string, number>()

    const placed: Rect[] = []
    for (const node of topLevel) {
      const parentId = node.parentId ?? ctx.state.currentPageId
      const position =
        topLevel.length === 1
          ? placementActions.duplicatePosition(node, placed)
          : { x: node.x, y: node.y }
      const sourceIndex = ctx.graph.getNode(parentId)?.childIds.indexOf(node.id) ?? -1
      const clone = duplicateNode(ctx, node, parentId, position)
      if (!clone) continue
      topSource.set(parentId, Math.max(topSource.get(parentId) ?? -1, sourceIndex))
      placed.push(getAxisAlignedBoundsInParent([clone], parentId, ctx.graph))
      newRootIds.push(clone.id)
      const subtree = snapshotSubtree(ctx.graph, clone.id)
      for (const [id, snap] of subtree) allSnapshots.set(id, snap)
    }

    // Figma stacks the copies directly above the topmost layer they copy, in their own order,
    // not on top of everything in the parent.
    const stacked = new Map<string, number>()
    const stacking = newRootIds.flatMap((id) => {
      const parentId = ctx.graph.getNode(id)?.parentId
      const top = parentId ? topSource.get(parentId) : undefined
      if (!parentId || top === undefined || top < 0) return []
      const offset = stacked.get(parentId) ?? 0
      stacked.set(parentId, offset + 1)
      return [{ id, parentId, index: top + 1 + offset }]
    })
    const stack = () => {
      for (const { id, parentId, index } of stacking) ctx.graph.insertChildAt(id, parentId, index)
    }
    // A copy joins its parent's flow and a hugging parent resizes, on undo and redo too, since
    // neither stores the parent's layout.
    const relayoutParents = () => ctx.runLayoutForParents(parents)
    stack()

    if (newRootIds.length > 0) {
      relayoutParents()
      ctx.setSelectedIds(new Set(newRootIds))
      ctx.undo.push({
        label: 'Duplicate',
        forward: () => {
          for (const rootId of newRootIds) {
            const snapshot = allSnapshots.get(rootId)
            if (!snapshot) continue
            const parentId = snapshot.parentId ?? ctx.state.currentPageId
            restoreSubtree(ctx.graph, snapshot, parentId, allSnapshots)
          }
          stack()
          relayoutParents()
          ctx.setSelectedIds(new Set(newRootIds))
        },
        inverse: () => {
          for (const id of newRootIds.slice().reverse()) ctx.graph.deleteNode(id)
          relayoutParents()
          ctx.setSelectedIds(prevSelection)
        }
      })
    }
  }

  /** The selected layers a paste replaces inside their instances, read before it selects others. */
  function instanceReplacementTargets(options: PasteOptions): string[] {
    return options.replaceInInstance ? replaceableInstanceLayers(ctx, ctx.state.selectedIds) : []
  }

  function pushCreatedNodesUndo(
    created: string[],
    prevSelection: Set<string>,
    label = 'Paste',
    operation?: PasteHistoryOperation
  ) {
    const allNodes = collectSubtrees(ctx.graph, created)
    const pageId = ctx.state.currentPageId
    operation?.capture()
    ctx.undo.push({
      label,
      forward: () => {
        if (operation) operation.redo()
        else recreateSnapshots(ctx, allNodes, pageId)
        computeAllLayouts(ctx.graph, pageId)
        ctx.setSelectedIds(new Set(created))
      },
      inverse: () => {
        if (operation) operation.undo()
        else deleteIds(ctx, created)
        computeAllLayouts(ctx.graph, pageId)
        ctx.setSelectedIds(prevSelection)
      }
    })
  }

  async function pasteSnapshot(
    snapshot: ClipboardSnapshot,
    cursorPos?: Vector,
    options: PasteOptions = {}
  ) {
    // Copy properties writes layers for Paste properties only, as in Figma.
    if (snapshot.properties) return
    let created: string[] = []
    ctx.undo.runBatch('Paste', () => {
      const dependencies = importClipboardDependenciesWithUndo(ctx, snapshot, options.dependencies)
      created = pastePairdrawNodes(
        dependencies.nodes,
        snapshot.placement,
        snapshot.images,
        // Records from another document name its variables and modes, not the pasted ones.
        snapshot.sourceRootId === ctx.graph.rootId ? snapshot.appliedBoundPaints : new Map(),
        dependencies.componentDependencies,
        cursorPos,
        { ...options, resolveBindings: dependencies.resolveBindings }
      )
    })
    await fontActions.loadFontsForNodes(created)
  }

  async function pasteFromHTML(html: string, cursorPos?: Vector, options: PasteOptions = {}) {
    const pairdraw = parsePairdrawClipboard(html)
    if (pairdraw) {
      // One undo step for the paste and any slot it claims.
      const created = ctx.undo.runBatch('Paste', () =>
        pastePairdrawNodes(
          pairdraw.nodes,
          clipboardPlacement(ctx.graph, pairdraw.nodes),
          pairdraw.images,
          new Map(),
          [],
          cursorPos,
          options
        )
      )
      await fontActions.loadFontsForNodes(created)
      return
    }

    const figma = await parseFigmaClipboard(html)
    if (figma?.assetType === 'STYLE_PROPERTIES') return
    if (figma) {
      // One undo step for the paste and any slot it claims.
      const pasted = ctx.undo.runBatch('Paste', () => {
        const prevSelection = new Set(ctx.state.selectedIds)
        const replacementTargets = options.replaceSelection ? selectedReplacementTargets(ctx) : []
        const instanceTargets = instanceReplacementTargets(options)
        const pasteTarget = replacementTargets[0]?.parentId ?? resolvePasteTarget(ctx)
        if (!prepareSlotEdits(ctx, [pasteTarget])) return null
        const operation = prepareClipboardImport(figma.nodes, ctx.graph, pasteTarget, figma.blobs)
        let deliveryError: CommittedGraphEventError | undefined
        try {
          operation.commit()
        } catch (error) {
          if (!(error instanceof CommittedGraphEventError)) throw error
          deliveryError = error
        }
        const created = operation.plan.rootIds
        if (created.length === 0) return null

        if (replacementTargets.length > 0) {
          // The clipboard holds each layer as drawn on its canvas, and the import keeps that as
          // the layer's transform in the target's frame: turn it back, as the in-app paste does.
          const copied = created.flatMap((id) => {
            const node = ctx.graph.getNode(id)
            return node ? [getNodeLocalMatrix(node)] : []
          })
          placementActions.keepCanvasTransforms(created, copied)
          replaceTargetsWithCreated(ctx, created, replacementTargets, prevSelection, operation)
        } else {
          placementActions.placeForeignPaste(created, pasteTarget, cursorPos)
          computeAllLayouts(ctx.graph, ctx.state.currentPageId)
          ctx.setSelectedIds(new Set(created))
          pushCreatedNodesUndo(created, prevSelection, 'Paste', operation)
          replaceInstanceLayersWith(ctx, instanceTargets, created)
        }
        return { created, deliveryError }
      })
      if (!pasted) return
      const { created, deliveryError } = pasted

      if (deliveryError) throw deliveryError
      await Promise.all([
        hydrateFigmaClipboardImages(figma.meta.fileKey, created),
        fontActions.loadFontsForNodes(created)
      ])
      ctx.requestRender()
    }
  }

  /** The name Figma gives pasted text: its first line, as the layer lists it. */
  const textLayerName = (text: string) => {
    const firstLine = text.split('\n')[0]?.trim() ?? ''
    return firstLine.length > 64 ? `${firstLine.slice(0, 63)}…` : firstLine
  }

  /**
   * Paste plain text from another app as a text layer holding it, centred on the point and inside
   * the selected frame, in one undo step; false when the text has nothing to show.
   */
  async function pastePlainText(text: string, cx?: number, cy?: number): Promise<boolean> {
    const content = text.replace(/\r\n?/g, '\n')
    const name = textLayerName(content)
    if (!name) return false
    const previousSelection = new Set(ctx.state.selectedIds)
    const parentId = resolvePasteTarget(ctx)
    if (!prepareSlotEdits(ctx, [parentId])) return false
    const node = ctx.graph.createNode('TEXT', parentId, {
      ...newLayerDefaults('TEXT', ctx.state.theme),
      name,
      text: content,
      textAutoResize: 'WIDTH_AND_HEIGHT',
      x: 0,
      y: 0
    })
    // Measured with its font loaded, so it takes its content's size and centres on that.
    await fontActions.loadFontsForNodes([node.id])
    layoutAuthoredNodes(ctx.graph, [node.id])
    const cursorPos = cx !== undefined && cy !== undefined ? { x: cx, y: cy } : undefined
    placementActions.placeForeignPaste([node.id], parentId, cursorPos)
    if (ctx.state.snappingPreferences.pixelGrid) {
      const placed = ctx.graph.getNode(node.id)
      if (placed)
        ctx.graph.updateNode(node.id, { x: Math.round(placed.x), y: Math.round(placed.y) })
    }
    ctx.setSelectedIds(new Set([node.id]))
    pushCreatedNodesUndo([node.id], previousSelection, 'Paste text')
    ctx.requestRender()
    return true
  }

  function pastePairdrawNodes(
    nodes: Array<SceneNode & { children?: SceneNode[] }>,
    placement: ClipboardPlacement,
    images: Map<string, Uint8Array>,
    applied: AppliedBoundPaints,
    dependencies: Array<SceneNode & { children?: SceneNode[] }> = [],
    cursorPos?: Vector,
    options: PasteNodesOptions = {}
  ) {
    const prevSelection = new Set(ctx.state.selectedIds)
    const replacementTargets = options.replaceSelection ? selectedReplacementTargets(ctx) : []
    const instanceTargets = instanceReplacementTargets(options)
    for (const [hash, bytes] of images) ctx.graph.images.set(hash, bytes)

    const created: string[] = []
    const copiedIds = new Map<string, string>()
    const createNodeTree = (source: SceneNode & { children?: SceneNode[] }, parentId: string) => {
      const { id: _id, childIds: _childIds, children = [], parentId: _parentId, ...rest } = source
      const node = ctx.graph.createNode(source.type, parentId, {
        ...structuredClone(rest),
        childIds: []
      })
      copiedIds.set(source.id, node.id)
      for (const child of children) createNodeTree(child, node.id)
      return node.id
    }

    const { requestedTarget, returningTo } = requestedPasteTarget(
      ctx,
      placement.sources.map((source) => source?.id ?? null),
      replacementTargets[0]?.parentId ?? null,
      !!cursorPos
    )
    const pasteTarget = cycleSafeParent(
      ctx.graph,
      requestedTarget,
      pastedComponentIds(ctx.graph, [...nodes, ...dependencies])
    )
    if (!prepareSlotEdits(ctx, [pasteTarget])) return created
    const dependencyRootIds: string[] = []
    for (const dependency of dependencies)
      dependencyRootIds.push(createNodeTree(dependency, ctx.state.currentPageId))
    for (const node of nodes) created.push(createNodeTree(node, pasteTarget))
    for (const id of copiedIds.values()) {
      const node = ctx.graph.getNode(id)
      if (!node) continue
      const componentId = node.componentId ? copiedIds.get(node.componentId) : undefined
      const instanceOverrides = {
        self: node.instanceOverrides.self,
        descendants: new Map(
          [...node.instanceOverrides.descendants].map(([target, fields]) => [
            copiedIds.get(target) ?? target,
            fields
          ])
        )
      }
      ctx.graph.updateNode(id, { componentId: componentId ?? node.componentId, instanceOverrides })
    }
    keepPastedBoundPaints(ctx.graph, copiedIds, applied)
    // Variables of this document can give the layers other values than the copied ones.
    if (options.resolveBindings) {
      const subtrees = [...dependencyRootIds, ...created]
      loadBoundFonts(ctx, reconcileVariableLayouts(ctx.graph, { subtrees }))
    }
    if (dependencyRootIds.length > 0) {
      const snapshots = collectSubtrees(ctx.graph, dependencyRootIds)
      ctx.undo.push({
        label: 'Import component dependencies',
        forward: () => recreateSnapshots(ctx, snapshots, ctx.state.currentPageId),
        inverse: () => deleteIds(ctx, dependencyRootIds)
      })
    }
    if (created.length === 0) return created
    placementActions.keepCanvasTransforms(created, placement.transforms)

    if (replacementTargets.length > 0) {
      replaceTargetsWithCreated(ctx, created, replacementTargets, prevSelection)
      return created
    }

    if (cursorPos) placementActions.centerNodesAtCanvasPoint(created, cursorPos)
    else if (returningTo === pasteTarget) placementActions.placeReturned(created)
    else placementActions.placePasted(created, placement, pasteTarget, requestedTarget)
    computeAllLayouts(ctx.graph, ctx.state.currentPageId)
    ctx.setSelectedIds(new Set(created))

    pushCreatedNodesUndo(created, prevSelection)
    replaceInstanceLayersWith(ctx, instanceTargets, created)
    return created
  }

  function missingImageHashes(nodeIds: string[]) {
    const hashes = new Set<string>()
    for (const node of collectSubtrees(ctx.graph, nodeIds)) {
      for (const fill of node.fills) {
        if (fill.type === 'IMAGE' && fill.imageHash && !ctx.graph.images.has(fill.imageHash)) {
          hashes.add(fill.imageHash)
        }
      }
    }
    return [...hashes]
  }

  async function hydrateFigmaClipboardImages(fileKey: string, nodeIds: string[]) {
    const hashes = missingImageHashes(nodeIds)
    if (hashes.length === 0) return

    const resolver = ctx.resolveFigmaClipboardImages
    if (resolver) {
      try {
        const images = await resolver(fileKey, hashes)
        for (const hash of hashes) {
          const bytes = images.get(hash)
          if (bytes) ctx.graph.images.set(hash, bytes)
        }
      } catch (error) {
        console.warn('Failed to fetch Figma clipboard images', error)
      }
    }

    const missing = missingImageHashes(nodeIds).length
    if (missing > 0) {
      ctx.emitEditorEvent('clipboard:images-missing', {
        total: hashes.length,
        missing,
        fetchAttempted: Boolean(resolver)
      })
    }
  }

  function warnMissingImages(nodeIds: string[]) {
    return missingImageHashes(nodeIds).length > 0
  }

  /**
   * Deletes layers with their children as one undo step, skipping locked ones and, as in Figma,
   * layers of an instance outside its slots. Deleted layers leave the selection, and undo
   * restores the selection from before.
   */
  function deleteNodes(nodeIds: Iterable<string>, nextSelection?: ReadonlySet<string>) {
    // One undo step for the delete and any slot it claims.
    ctx.undo.runBatch('Delete', () => deleteLayers(nodeIds, nextSelection))
  }

  /** Whether a delete removes this layer: one that is unlocked and may leave its parent. */
  function deletable(id: string): boolean {
    const node = ctx.graph.getNode(id)
    if (!node || node.locked) return false
    return acceptsChildren(ctx, node.parentId ?? ctx.state.currentPageId)
  }

  /**
   * Whether the layer is one an instance mirrors from its component. A slot's contents are the
   * document's own, placed in the instance, so they delete like any other layer.
   */
  function insideInstance(id: string): boolean {
    let parentId = ctx.graph.getNode(id)?.parentId ?? null
    while (parentId) {
      const parent = ctx.graph.getNode(parentId)
      if (!parent) return false
      if (parent.type === 'INSTANCE') return true
      if (slotPropertyId(parent)) return false
      parentId = parent.parentId
    }
    return false
  }

  function deleteLayers(nodeIds: Iterable<string>, nextSelection?: ReadonlySet<string>) {
    // Deleting a component child would take it out of every instance, so inside an instance it
    // is a hide instead, recorded as an override: Figma reopens the file with it still hidden.
    const requested: string[] = []
    const hidden: Array<{ id: string; visible: boolean }> = []
    for (const id of nodeIds) {
      const node = ctx.graph.getNode(id)
      if (!node || node.locked) continue
      // No parent takes children inside an instance, but hiding one is the delete Figma offers.
      if (insideInstance(id)) {
        if (node.visible) hidden.push({ id, visible: node.visible })
      } else if (deletable(id)) requested.push(id)
    }
    const hideLayers = () => {
      for (const { id } of hidden) {
        ctx.graph.updateNode(id, { visible: false })
        recordInstanceOverride(ctx.graph, id, ['visible'])
      }
    }
    // Connectors go with a layer they attach to, as in FigJam; one that stays keeps them.
    const attached = attachedConnectors(ctx.graph, requested).map((node) => node.id)
    const targets: Array<{ id: string; parentId: string; index: number }> = []
    for (const id of uniq([...requested, ...attached])) {
      const node = ctx.graph.getNode(id)
      if (!node || !deletable(id)) continue
      const parentId = node.parentId ?? ctx.state.currentPageId
      const parent = ctx.graph.getNode(parentId)
      const index = parent?.childIds.indexOf(id) ?? -1
      targets.push({ id, parentId, index })
    }
    if (targets.length === 0 && hidden.length === 0) return
    prepareSlotEdits(
      ctx,
      targets.map((entry) => entry.parentId)
    )
    // The slot edits above may change what a layer's subtree holds, so it is captured once, after.
    const entries = targets.map((entry) => ({
      ...entry,
      subtree: snapshotSubtree(ctx.graph, entry.id)
    }))

    const relayoutParents = () => ctx.runLayoutForParents(entries.map((entry) => entry.parentId))
    hideLayers()

    const prevSelection = new Set(ctx.state.selectedIds)
    for (const { id } of entries) ctx.graph.deleteNode(id)
    relayoutParents()
    const selectionAfter =
      nextSelection ?? new Set([...prevSelection].filter((id) => ctx.graph.getNode(id)))

    ctx.undo.push({
      label: 'Delete',
      forward: () => {
        for (const { id } of entries) ctx.graph.deleteNode(id)
        hideLayers()
        relayoutParents()
        ctx.setSelectedIds(new Set(selectionAfter))
      },
      inverse: () => {
        restoreDeletedEntries(ctx, entries)
        for (const { id, visible } of hidden) {
          ctx.graph.updateNode(id, { visible })
          recordInstanceOverride(ctx.graph, id, ['visible'])
        }
        relayoutParents()
        ctx.setSelectedIds(prevSelection)
      }
    })
    // Groups shrink to the layers left in them, and one left empty goes, in the same undo step,
    // which `deleteNodes` batches.
    fitEnclosingGroupsWithUndo(
      ctx,
      entries.map((entry) => entry.parentId)
    )
    ctx.setSelectedIds(new Set(selectionAfter))
  }

  function deleteSelected() {
    deleteNodes(ctx.state.selectedIds, new Set())
  }

  const copyActions = createClipboardCopyActions(ctx)
  const exportActions = createClipboardExportActions(ctx)
  const fontActions = createClipboardFontActions(ctx)
  const assetActions = createClipboardAssetActions(ctx, pushCreatedNodesUndo)
  const placementActions = createClipboardPlacementActions(ctx)
  const styledActions = createStyledPasteActions(ctx, {
    pushCreatedNodesUndo,
    placeForeignPaste: placementActions.placeForeignPaste,
    loadFontsForNodes: fontActions.loadFontsForNodes
  })

  return {
    collectSubtrees,
    ...placementActions,
    ...fontActions,
    duplicateSelected,
    duplicateNode: (node: SceneNode, parentId: string, position: Vector) =>
      duplicateNode(ctx, node, parentId, position),
    ...copyActions,
    pasteSnapshot,
    pasteFromHTML,
    pastePlainText,
    warnMissingImages,
    deleteNodes,
    deleteSelected,
    ...assetActions,
    ...styledActions,
    ...exportActions
  }
}
