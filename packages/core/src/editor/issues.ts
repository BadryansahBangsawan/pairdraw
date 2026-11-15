import type { DesignIssueHighlight } from '#core/canvas/issues/types'

import type { EditorContext } from './types'

/**
 * Canvas presentation of design check results. The check itself runs outside the editor; this
 * only publishes the layer the canvas highlights for a hovered issue.
 */
function sameHighlight(a: DesignIssueHighlight | null, b: DesignIssueHighlight | null): boolean {
  if (!a || !b) return a === b
  return (
    a.nodeId === b.nodeId &&
    a.severity === b.severity &&
    a.minSize?.width === b.minSize?.width &&
    a.minSize?.height === b.minSize?.height
  )
}

export function createDesignIssueActions(ctx: EditorContext) {
  function setDesignIssueHighlight(highlight: DesignIssueHighlight | null) {
    if (sameHighlight(ctx.state.designIssueHighlight, highlight)) return
    ctx.state.designIssueHighlight = highlight
    ctx.requestRepaint()
  }

  return { setDesignIssueHighlight }
}
