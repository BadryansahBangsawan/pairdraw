import { selectionToJSX } from '@pairdraw/design-jsx'

import type { EditorContext } from '#core/editor/types'
import type { BooleanPathResolver } from '#core/io/formats/boolean-path'
import { renderNodesToLaidOutSVG } from '#core/io/formats/svg/text/layout'

export function createClipboardExportActions(ctx: EditorContext) {
  /**
   * The copies compute an authored boolean's result with the app's own renderer, as an export
   * does, so copying never loads a second CanvasKit; a headless editor falls back to one. The
   * module is imported on copy rather than statically because it carries the raster renderer,
   * which the editor would otherwise load for a feature most copies never use.
   */
  async function booleanPath(): Promise<BooleanPathResolver | undefined> {
    const { booleanPathResolver, needsBooleanPaths } = await import('#core/io/formats/boolean-path')
    if (!needsBooleanPaths(ctx.graph)) return undefined
    return booleanPathResolver(ctx.getCk() ?? undefined, ctx.getRenderer() ?? undefined)
  }

  function copySelectionAsText(ids: string[]): string {
    return ids.map((id) => ctx.graph.getNode(id)?.name ?? id).join('\n')
  }

  async function copySelectionAsSVG(ids: string[]): Promise<string | null> {
    const nodeIds =
      ids.length > 0 ? ids : ctx.graph.getChildren(ctx.state.currentPageId).map((n) => n.id)
    return renderNodesToLaidOutSVG(ctx.graph, ctx.state.currentPageId, nodeIds, {
      booleanPath: await booleanPath()
    })
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
    const { html } = await renderNodesToHTML(
      ctx.graph,
      ids,
      { html: 'fragment', style: 'inline', assets: 'inline' },
      undefined,
      { canvasKit: ctx.getCk() ?? undefined, renderer: ctx.getRenderer() ?? undefined }
    )
    return html || null
  }

  return { copySelectionAsText, copySelectionAsSVG, copySelectionAsJSX, copySelectionAsHTML }
}
