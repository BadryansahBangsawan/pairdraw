import type { Canvas } from 'canvaskit-wasm'

import type { SceneGraph } from '@pairdraw/scene-graph'

import { drawGuides } from '#core/canvas/guides/draw'
import { drawIssueHighlight } from '#core/canvas/issues/draw'
import { drawComponentSetBorders } from '#core/canvas/overlays/component-sets'
import { drawConnectorTarget } from '#core/canvas/overlays/connectors'
import { drawDropTarget, drawEditingText } from '#core/canvas/overlays/feedback'
import { drawGradientHandles } from '#core/canvas/overlays/gradient-handles'
import { drawImageCrop } from '#core/canvas/overlays/image-crop'
import { drawLayoutOutlines } from '#core/canvas/overlays/layout-outlines'
import { drawMeasurementSegment } from '#core/canvas/overlays/measurement'
import { drawPixelGrid } from '#core/canvas/overlays/pixel-grid'
import { drawPrototypeConnections } from '#core/canvas/overlays/prototype'
import { drawCodeFocus } from '#core/canvas/overlays/selection'
import { drawShapeHandles } from '#core/canvas/overlays/shape-handles'
import { drawSlotOutlines } from '#core/canvas/overlays/slots'
import type { RenderOverlays, SkiaRenderer } from '#core/canvas/renderer'
import { editedGradient } from '#core/editor/gradient-edit'
import { editedImage } from '#core/editor/image-edit'

function measurementVisible(overlays: RenderOverlays): boolean {
  return (
    overlays.measurementMode !== undefined &&
    overlays.measurementMode !== 'off' &&
    !overlays.editingTextId &&
    !overlays.nodeEditState &&
    !overlays.penState
  )
}

export function drawLabelPass(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  selectedIds: ReadonlySet<string>,
  overlays?: RenderOverlays
): void {
  const profiler = r.profiler
  profiler.beginPhase('render:frameTitles')
  r.drawFrameTitles(canvas, graph, selectedIds, overlays)
  profiler.endPhase('render:frameTitles')
  profiler.beginPhase('render:sectionTitles')
  r.drawSectionTitles(canvas, graph, overlays)
  profiler.endPhase('render:sectionTitles')
  profiler.beginPhase('render:componentLabels')
  r.drawComponentLabels(canvas, graph, overlays)
  profiler.endPhase('render:componentLabels')
}

/**
 * While a gradient is edited, Figma shows its handles instead of the layer's selection, and an
 * image being cropped shows itself whole with its crop handles; a previewing canvas shows neither.
 */
function drawPaintEditHandles(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  overlays: RenderOverlays
): boolean {
  if (overlays.playing) return false
  if (editedGradient(graph, overlays.gradientEdit)) {
    drawGradientHandles(r, canvas, graph, overlays.gradientEdit, overlays.rotationPreview)
    return true
  }
  if (editedImage(graph, overlays.imageEdit)) {
    drawImageCrop(r, canvas, graph, overlays.imageEdit, overlays.rotationPreview)
    return true
  }
  return false
}

export function drawOverlayPass(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  selectedIds: Set<string>,
  overlays: RenderOverlays
): void {
  const measuring = measurementVisible(overlays)
  const hoveredNodeId =
    measuring || overlays.hoveredNodeId === overlays.nodeEditState?.nodeId
      ? null
      : overlays.hoveredNodeId
  // Over the design and under every editing outline, as in Figma.
  if (overlays.showPixelGrid) drawPixelGrid(r, canvas)
  drawComponentSetBorders(r, canvas, graph, overlays.rotationPreview)
  drawCodeFocus(r, canvas, graph, overlays.codeFocusNodeId, overlays.rotationPreview)
  if (!measuring)
    drawSlotOutlines(r, canvas, graph, selectedIds, hoveredNodeId, overlays.rotationPreview)
  if (!measuring) drawLayoutOutlines(r, canvas, graph, selectedIds, hoveredNodeId, overlays)
  if (!measuring) drawPrototypeConnections(r, canvas, graph, selectedIds, overlays.rotationPreview)
  r.drawHoverHighlight(canvas, graph, hoveredNodeId, overlays.rotationPreview)
  drawIssueHighlight(r, canvas, graph, overlays.designIssueHighlight, overlays.rotationPreview)
  drawDropTarget(r, canvas, graph, overlays.dropTargetId, overlays.rotationPreview)
  drawConnectorTarget(r, canvas, graph, overlays.connectorTarget, overlays.rotationPreview)
  drawEditingText(r, canvas, graph, overlays)
  r.profiler.beginPhase('render:selection')
  if (!drawPaintEditHandles(r, canvas, graph, overlays)) {
    r.drawSelection(canvas, graph, selectedIds, overlays)
    if (!overlays.transforming && r.editHandles)
      drawShapeHandles(
        r,
        canvas,
        graph,
        selectedIds,
        overlays.shapeHandleHover,
        overlays.rotationPreview
      )
  }
  if (measuring) r.drawMeasurements(canvas, graph, selectedIds, overlays.hoveredNodeId)
  r.profiler.endPhase('render:selection')

  r.drawFlashes(canvas, graph)
  if (overlays.guides?.redline) drawMeasurementSegment(r, canvas, overlays.guides.redline.segment)
  drawGuides(r, canvas, graph, overlays.guides)
  r.drawSnapGuides(canvas, overlays.snapGuides)
  r.drawMarquee(canvas, overlays.marquee)
  r.drawLayoutInsertIndicator(canvas, overlays.layoutInsertIndicator)
  if (!measuring && !overlays.transforming && r.editHandles) {
    r.drawAutoLayoutHover(canvas, graph, overlays.autoLayoutHover)
  }
  r.drawNodeEditOverlay(canvas, graph, overlays.nodeEditState)
  r.drawPenOverlay(canvas, overlays.penState)
  r.drawPencilOverlay(canvas, overlays.pencilState)
  r.drawSnapMarks(canvas, overlays.snapGuides)
  r.drawPresenceCursors(canvas, graph, overlays.presenceCursors)
}

export function drawChromePass(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  selectedIds: Set<string>,
  overlays: RenderOverlays
): void {
  r.profiler.beginPhase('render:rulers')
  if (r.showRulers) r.drawRulers(canvas, graph, selectedIds, overlays.guides)
  r.profiler.endPhase('render:rulers')
  r.profiler.drawHUD(canvas, r.showRulers)
}
