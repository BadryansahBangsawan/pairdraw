import type { DesignDocument } from '@pairdraw/dom-css'
import type { Vector } from '@pairdraw/scene-graph/primitives'
import {
  applyGraphTransfer,
  captureTransferredState,
  prepareGraphTransfer,
  removeGraphTransfer
} from '@pairdraw/scene-graph/transfer'

import { resolvePasteTarget } from '#core/editor/clipboard/paste/target'
import { prepareSlotEdits } from '#core/editor/components/slots'
import type { EditorContext } from '#core/editor/types'
import { sceneGraphFromStyledHTML } from '#core/io/formats/html/layers'
import { computeAllLayouts, layoutAuthoredNodes } from '#core/layout'

import type { PasteHistoryOperation } from './paste/replace'

export interface StyledPasteOptions {
  /** The name of the pasted layer when the content is one box, such as a captured page's title. */
  name?: string
}

type PushCreatedNodesUndo = (
  created: string[],
  previousSelection: Set<string>,
  label?: string,
  operation?: PasteHistoryOperation
) => void

interface StyledPasteDependencies {
  pushCreatedNodesUndo: PushCreatedNodesUndo
  placeForeignPaste: (nodeIds: string[], parentId: string, cursor?: Vector) => void
  loadFontsForNodes: (nodeIds: string[]) => Promise<unknown>
}

/**
 * Paste of a styled DOM, such as web HTML the app styled or a web capture: layers built by
 * `sceneGraphFromStyledHTML`, placed as a paste from another application is, in one undo step.
 */
export function createStyledPasteActions(ctx: EditorContext, deps: StyledPasteDependencies) {
  /** Pastes the styled DOM as layers and returns their ids; none when it draws nothing. */
  async function pasteStyledDocument(
    styled: DesignDocument,
    cursorPos?: Vector,
    options: StyledPasteOptions = {}
  ): Promise<string[]> {
    const source = sceneGraphFromStyledHTML(styled)
    const page = source.getPages().at(0)
    const rootIds = page?.childIds ?? []
    if (rootIds.length === 0) return []
    const [onlyRoot] = rootIds
    if (options.name && rootIds.length === 1 && onlyRoot) {
      source.updateNode(onlyRoot, { name: options.name })
    }

    const created = ctx.undo.runBatch('Paste', () => {
      const previousSelection = new Set(ctx.state.selectedIds)
      const parentId = resolvePasteTarget(ctx)
      if (!prepareSlotEdits(ctx, [parentId])) return []
      const plan = prepareGraphTransfer({
        source,
        rootIds,
        dependencyPageIds: [],
        target: ctx.graph,
        parentId
      })
      let snapshot = plan
      const operation: PasteHistoryOperation = {
        capture: () => {
          snapshot = captureTransferredState(ctx.graph, plan)
        },
        undo: () => removeGraphTransfer(ctx.graph, snapshot),
        redo: () => applyGraphTransfer(ctx.graph, snapshot)
      }
      applyGraphTransfer(ctx.graph, plan)
      const ids = plan.rootIds
      layoutAuthoredNodes(ctx.graph, ids)
      deps.placeForeignPaste(ids, parentId, cursorPos)
      computeAllLayouts(ctx.graph, ctx.state.currentPageId)
      ctx.setSelectedIds(new Set(ids))
      deps.pushCreatedNodesUndo(ids, previousSelection, 'Paste', operation)
      return ids
    })
    if (created.length === 0) return created
    await deps.loadFontsForNodes(created)
    ctx.requestRender()
    return created
  }

  return { pasteStyledDocument }
}
