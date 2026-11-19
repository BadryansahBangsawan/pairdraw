import type { Editor } from '@pairdraw/core'
import { layerResizes } from '@pairdraw/scene-graph/generated'
import { takesOwnSize } from '@pairdraw/scene-graph/instances'
import { enforcedAspectRatio } from '@pairdraw/scene-graph/layout'
import { collectResizeDescendants, createResizeSnapshot } from '@pairdraw/scene-graph/resize'

import { getHitHandleByMatrix } from '#vue/shared/input/geometry'
import type { DragResize } from '#vue/shared/input/types'

export function tryStartResize(cx: number, cy: number, editor: Editor): DragResize | null {
  for (const id of editor.state.selectedIds) {
    const node = editor.graph.getNode(id)
    // A sticky note only scales, from its corners; see `tryStartStickyScale`. A connector is
    // shaped by its ends. A layer inside an instance takes its component's size, as in Figma.
    if (!node || node.locked || !layerResizes(node) || !takesOwnSize(editor.graph, node)) continue
    const handleResult = getHitHandleByMatrix(
      cx,
      cy,
      node,
      editor.graph,
      editor.renderer?.zoom,
      editor.state.rotationPreview
    )
    if (handleResult) {
      const snap = createResizeSnapshot(node)
      return {
        type: 'resize',
        handle: handleResult.handle,
        startX: cx,
        startY: cy,
        origRect: { x: node.x, y: node.y, width: node.width, height: node.height },
        nodeId: id,
        origVectorNetwork: snap.vectorNetwork,
        origFillGeometry: snap.fillGeometry,
        origStrokeGeometry: snap.strokeGeometry,
        origDerivedTextGlyphs: snap.derivedTextGlyphs,
        origStrokes: snap.strokes,
        origTextPathData: snap.textPathData,
        origTextPathBox: snap.textPathBox,
        origChildren: collectResizeDescendants(editor.graph, id),
        lockedAspectRatio: enforcedAspectRatio(node),
        appliedRect: { x: node.x, y: node.y, width: node.width, height: node.height }
      }
    }
  }
  return null
}
