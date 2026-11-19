import type { HyperlinkTarget, SceneNode } from '@pairdraw/scene-graph'
import { textVerticalOffset } from '@pairdraw/scene-graph/text'

import { withTextParagraph } from '#core/canvas/text'
import { LAYER_HIT_PAD } from '#core/constants'
import type { EditorContext } from '#core/editor/types'
import { resolveEditorProfile } from '#core/editor/views'
import { createSceneGeometry } from '#core/geometry/scene'
import {
  hyperlinkInRange,
  hyperlinkSpanAt,
  hyperlinkSpans,
  isOpenableLinkURL,
  normalizeLinkURL,
  styleRunsWithHyperlink,
  type HyperlinkSpan
} from '#core/text/hyperlink'

type NodeUpdate = (id: string, changes: Partial<SceneNode>, label?: string) => void

export interface TextHyperlinkActionDeps {
  updateNodeWithUndo: NodeUpdate
  runTextEditStep: (change: () => void) => void
  switchPage: (pageId: string) => Promise<void>
  revealNodes: (nodeIds: readonly string[]) => void
}

/**
 * The link a text's link controls act on: the characters `text[start, end)` and where they link,
 * `null` when nowhere and `'mixed'` when they link to different places.
 */
export interface TextHyperlinkState {
  nodeId: string
  start: number
  end: number
  link: HyperlinkTarget | null | 'mixed'
}

/** A linked stretch of a text under a canvas point. */
export interface HyperlinkHit {
  nodeId: string
  span: HyperlinkSpan
}

/**
 * Links on text, as Figma has them: a stretch of characters links to a web or mail address, set
 * and removed as one undo step, and followed from the canvas.
 */
export function createTextHyperlinkActions(ctx: EditorContext, deps: TextHyperlinkActionDeps) {
  function textNode(nodeId: string): SceneNode | null {
    const node = ctx.graph.getNode(nodeId)
    return node?.type === 'TEXT' ? node : null
  }

  /**
   * The characters a link change applies to: the selected ones while the text is edited, or the
   * link the caret stands in, and otherwise the whole text, as a layer's link is set in Figma.
   */
  function linkRange(node: SceneNode): [number, number] {
    const editor = ctx.state.editingTextId === node.id ? ctx.getTextEditor() : null
    if (editor?.isActive) {
      const selected = editor.getSelectionRange()
      if (selected) return selected
      const caret = editor.caretIndex
      const span = caret === null ? null : hyperlinkSpanAt(node, caret)
      if (span) return [span.start, span.end]
    }
    return [0, node.text.length]
  }

  /** The link the text's link controls show and change, or null for a layer that is not text. */
  function getTextHyperlink(nodeId: string): TextHyperlinkState | null {
    const node = textNode(nodeId)
    if (!node) return null
    const [start, end] = linkRange(node)
    return { nodeId, start, end, link: hyperlinkInRange(node, start, end) }
  }

  /**
   * Links `text[start, end)` to the address typed, or removes its link when `url` is null; the
   * range defaults to what `getTextHyperlink` reports. Characters that linked nowhere before
   * are underlined, as Figma marks a new link. Returns false, changing nothing, for an address
   * the editor does not link to (anything but `http:`, `https:`, and `mailto:`) or an empty range.
   */
  function setTextHyperlink(
    nodeId: string,
    url: string | null,
    range?: readonly [number, number]
  ): boolean {
    const node = textNode(nodeId)
    if (!node) return false
    const value = url === null ? null : normalizeLinkURL(url)
    if (url !== null && value === null) return false
    const link: HyperlinkTarget | null = value === null ? null : { type: 'URL', value }
    const [start, end] = range ?? linkRange(node)
    if (end <= start) return false
    const apply = () => {
      // Read again: what was typed before the step is recorded before the change.
      const current = textNode(nodeId)
      if (!current) return
      const styleRuns = styleRunsWithHyperlink(current, start, end, link, { underline: true })
      deps.updateNodeWithUndo(nodeId, { styleRuns }, link ? 'Set link' : 'Remove link')
    }
    if (ctx.state.editingTextId === nodeId) deps.runTextEditStep(apply)
    else apply()
    ctx.requestRender()
    return true
  }

  /**
   * The linked stretch of text under a canvas point, found on the laid-out glyphs rather than the
   * layer's box, so a point beside a link or between lines finds none.
   */
  function hyperlinkAtPoint(cx: number, cy: number): HyperlinkHit | null {
    const renderer = ctx.getRenderer()
    if (!renderer) return null
    const pad = LAYER_HIT_PAD / ctx.state.zoom
    const hit = ctx.graph.hitTestDeep(cx, cy, ctx.state.currentPageId, pad)
    // Text on a path follows its glyphs, not a paragraph; its links are not found here.
    if (hit?.type !== 'TEXT' || hit.textPathData) return null
    const spans = hyperlinkSpans(hit)
    if (spans.length === 0) return null
    const local = createSceneGeometry(ctx.graph).toLocal(hit, { x: cx, y: cy })
    if (!local) return null
    const { ck } = renderer
    const span = withTextParagraph(renderer, hit, ck.BLACK, { halfLeading: true }, (layout) => {
      const y = local.y - textVerticalOffset(hit, layout.getHeight())
      return spans.find((candidate) =>
        layout
          .getRectsForRange(
            candidate.start,
            candidate.end,
            ck.RectHeightStyle.Max,
            ck.RectWidthStyle.Tight
          )
          .some(
            ({ rect }) => local.x >= rect[0] && local.x <= rect[2] && y >= rect[1] && y <= rect[3]
          )
      )
    })
    return span ? { nodeId: hit.id, span } : null
  }

  /**
   * Follows a link: a web or mail address is handed to the front end through `hyperlink:open`,
   * which opens it outside the editor, and a link to a layer or page shows it, selecting the
   * layer where the canvas edits. Returns false for a link it cannot follow, such as a `tel:`
   * address from a `.fig` file or a layer that is gone.
   */
  async function followHyperlink(link: HyperlinkTarget): Promise<boolean> {
    if (link.type === 'URL') {
      if (!isOpenableLinkURL(link.value)) return false
      ctx.emitEditorEvent('hyperlink:open', link.value)
      return true
    }
    const target = ctx.graph.getNode(link.value)
    const pageId = target ? ctx.graph.pageOf(target.id) : null
    if (!target || !pageId) return false
    if (pageId !== ctx.state.currentPageId) await deps.switchPage(pageId)
    if (target.type === 'CANVAS') return true
    if (resolveEditorProfile(ctx.state).pointer === 'tools')
      ctx.setSelectedIds(new Set([target.id]))
    deps.revealNodes([target.id])
    return true
  }

  return { getTextHyperlink, setTextHyperlink, hyperlinkAtPoint, followHyperlink }
}
