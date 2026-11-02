import { selectionToJSX } from '@open-pencil/design-jsx'

import type { EditorContext } from '#core/editor/types'
import { renderNodesToLaidOutSVG } from '#core/io/formats/svg/text/layout'

export function createClipboardExportActions(ctx: EditorContext) {
  function copySelectionAsText(ids: string[]): string {
    return ids.map((id) => ctx.graph.getNode(id)?.name ?? id).join('\n')
  }

  function copySelectionAsSVG(ids: string[]): Promise<string | null> {
    const nodeIds =
      ids.length > 0 ? ids : ctx.graph.getChildren(ctx.state.currentPageId).map((n) => n.id)
    return renderNodesToLaidOutSVG(ctx.graph, ctx.state.currentPageId, nodeIds)
  }

  function copySelectionAsJSX(ids: string[]): string | null {
    return ids.length > 0 ? selectionToJSX(ids, ctx.graph) : null
  }

  /**
   * The layers as one self-contained HTML fragment, as the HTML export writes them: inline
   * styles, and images inlined as data URLs so the markup works wherever it is pasted. Null for
   * no layers or none that draw.
   */
  async function copySelectionAsHTML(ids: string[]): Promise<string | null> {
    if (ids.length === 0) return null
    const { renderNodesToHTML } = await import('#core/io/formats/html')
    const { html } = await renderNodesToHTML(ctx.graph, ids, {
      html: 'fragment',
      style: 'inline',
      assets: 'inline'
    })
    return html || null
  }

  return { copySelectionAsText, copySelectionAsSVG, copySelectionAsJSX, copySelectionAsHTML }
}
