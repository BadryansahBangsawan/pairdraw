import type { Canvas, Surface } from 'canvaskit-wasm'

import type { SceneGraph } from '@pairdraw/scene-graph'
import { getAxisAlignedWorldBounds } from '@pairdraw/scene-graph/coordinate'
import { computeDescendantVisualBounds } from '@pairdraw/scene-graph/geometry'

import { needsImagePreviews } from '#core/canvas/images/previews'
import type { RenderOverlays, SkiaRenderer } from '#core/canvas/renderer'
import { renderChildIds } from '#core/canvas/scene'
import { playIslandRoots } from '#core/editor/play/islands'
import type { EditorState } from '#core/editor/types'
import { resolveEditorProfile } from '#core/editor/views/profile'
import { emitNavigationTrace } from '#core/profiler'

import { documentSurfaceFor, presentDocumentSurface } from './document-surface'
import { drawChromePass, drawLabelPass, drawOverlayPass } from './overlay-pass'
import { renderSceneBacking, updateSceneBackingPreviewState } from './retained-backing'
import { hasTransientPreviews, renderPageWithPreviews } from './transient-previews'

export function renderSceneToCanvas(
  r: Pick<
    SkiaRenderer,
    'worldViewport' | 'viewportImageRendering' | 'drawingFullEffects' | 'renderNode' | 'nodePaths'
  >,
  canvas: Canvas,
  graph: SceneGraph,
  pageId: string
): void {
  r.nodePaths.releaseUncached()
  const prevViewport = r.worldViewport
  const previewMode = r.viewportImageRendering
  const previousFullEffects = r.drawingFullEffects
  r.viewportImageRendering = false
  // An export matches the document even when the canvas draws effects cheaply.
  r.drawingFullEffects = true
  r.worldViewport = { x: -1e9, y: -1e9, w: 2e9, h: 2e9 }
  try {
    const pageNode = graph.getNode(pageId)
    if (pageNode) {
      for (const childId of pageNode.childIds) r.renderNode(canvas, graph, childId, {})
    }
  } finally {
    r.worldViewport = prevViewport
    r.viewportImageRendering = previewMode
    r.drawingFullEffects = previousFullEffects
  }
}

export type RenderLayer = 'full' | 'scene' | 'overlays'

/**
 * What a canvas that runs play leaves to its live islands, and the frames a playing prototype
 * draws from its play scenes or scrolled; an editing canvas has none of them.
 */
function playOverlays(
  r: SkiaRenderer,
  graph: SceneGraph,
  pageId: string,
  live: boolean
): Pick<RenderOverlays, 'playIslands' | 'playScenes' | 'playScroll'> {
  if (!live) return {}
  return {
    playIslands: new Set(playIslandRoots(graph, pageId)),
    playScenes: r.playScenes ?? undefined,
    playScroll: r.playScroll ?? undefined
  }
}

export function renderFromEditorState(
  r: SkiaRenderer,
  state: EditorState,
  graph: SceneGraph,
  textEditor: unknown,
  viewportWidth: number,
  viewportHeight: number,
  showRulers = true,
  dpr = 1,
  layer: RenderLayer = 'full',
  interactive = false
): void {
  const previewMode = r.imagePreviews.enabled && needsImagePreviews(graph)
  if (
    r.imageMemoryGraph !== graph ||
    r.viewportImageRendering !== previewMode ||
    (previewMode && r.imageMemoryPage !== state.currentPageId)
  ) {
    r.invalidateAllPictures()
    r.imageCache.clear()
    // Previews of another document hold its encoded images, which a document without
    // previews would otherwise keep alive.
    if (r.imageMemoryGraph !== graph) r.imagePreviews.release()
    r.imageMemoryGraph = graph
    r.imageMemoryPage = state.currentPageId
  }
  r.viewportImageRendering = previewMode
  r.dpr = dpr
  r.panX = state.panX
  r.panY = state.panY
  r.zoom = state.zoom
  r.viewportWidth = viewportWidth
  r.viewportHeight = viewportHeight
  r.showRulers = showRulers
  r.pageColor = state.pageColor
  r.rulerTheme = state.rulerTheme ?? null
  r.setSelectionTheme(state.selectionTheme)
  r.pageId = state.currentPageId
  r.navigationPhase = state.navigation.phase
  r.navigationGeneration = state.navigation.generation
  const { editChrome, live, edits } = resolveEditorProfile(state)
  r.editHandles = edits
  render(
    r,
    graph,
    editChrome ? state.selectedIds : new Set<string>(),
    {
      playing: !editChrome,
      ...playOverlays(r, graph, state.currentPageId, live !== null),
      hoveredNodeId: editChrome ? state.hoveredNodeId : null,
      showPixelGrid: editChrome && state.showPixelGrid !== false,
      gradientEdit: state.gradientEdit,
      imageEdit: state.imageEdit,
      transforming: state.transforming,
      measurementMode: state.measurementMode,
      editingTextId: state.editingTextId,
      renamingLabelId: state.renamingLabelId,
      textEditor: textEditor as RenderOverlays['textEditor'],
      marquee: state.marquee,
      snapGuides: state.snapGuides,
      guides: state.guides,
      rotationPreview: state.rotationPreview,
      dropTargetId: state.dropTargetId,
      layoutInsertIndicator: state.layoutInsertIndicator,
      penState: state.penState
        ? {
            ...state.penState,
            cursorX: state.penCursorX ?? undefined,
            cursorY: state.penCursorY ?? undefined
          }
        : null,
      pencilState: state.pencilState,
      nodeEditState: state.nodeEditState
        ? { ...state.nodeEditState, pointsTransformable: state.activeTool === 'SELECT' }
        : null,
      presenceCursors: state.presenceCursors,
      designIssueHighlight: state.designIssueHighlight,
      codeFocusNodeId: state.codeFocusNodeId,
      autoLayoutHover: state.autoLayoutHover,
      shapeHandleHover: state.shapeHandleHover,
      connectorTarget: state.connectorTarget
    },
    // Recorded pictures follow what the canvas draws, not every document change.
    state.canvasVersion,
    layer,
    interactive
  )
}

function sceneContentDependsOnOverlay(overlays: RenderOverlays): boolean {
  return (
    overlays.rotationPreview != null || overlays.nodeEditState != null || overlays.playing === true
  )
}

function scenePictureMissReason(
  r: SkiaRenderer,
  graph: SceneGraph,
  overlays: RenderOverlays,
  sceneVersion: number,
  hasPositionPreview: boolean
): string {
  if (hasPositionPreview) return 'position-preview'
  if (hasTransientPreviews(r, graph)) return 'transient-preview'
  if (sceneContentDependsOnOverlay(overlays)) return 'volatile-overlay'
  if (!r.scenePicture) return 'missing-picture'
  if (graph.positionPreviewVersion !== r.scenePicturePositionPreviewVersion)
    return 'position-preview-version'
  if (sceneVersion !== r.scenePictureVersion) return 'scene-version'
  if (r.fontGeneration !== r.scenePictureFontGeneration) return 'font-generation'
  if (r.pageId !== r.scenePicturePageId) return 'page'
  return 'unknown'
}

function canUseScenePicture(
  r: SkiaRenderer,
  graph: SceneGraph,
  sceneVersion: number,
  requiresUncachedSceneRender: boolean
): boolean {
  return (
    !requiresUncachedSceneRender &&
    !!r.scenePicture &&
    graph.positionPreviewVersion === r.scenePicturePositionPreviewVersion &&
    sceneVersion === r.scenePictureVersion &&
    r.fontGeneration === r.scenePictureFontGeneration &&
    r.pageId === r.scenePicturePageId
  )
}

/** Whether the page has a visible mask among its own children, as a Figma file can. */
function pageHasMask(r: SkiaRenderer, graph: SceneGraph): boolean {
  const page = graph.getNode(r.pageId ?? graph.rootId)
  return (
    page?.childIds.some((childId) => {
      const child = graph.getNode(childId)
      return child?.visible === true && child.isMask
    }) ?? false
  )
}

function getSceneRenderPolicy(
  r: SkiaRenderer,
  graph: SceneGraph,
  overlays: RenderOverlays,
  sceneVersion: number,
  interactive: boolean
) {
  const hasPositionPreview =
    graph.positionPreviewVersion !== r.scenePicturePositionPreviewVersion &&
    sceneVersion === r.scenePictureVersion
  const requiresUncachedSceneRender =
    r.sceneScopeId !== null ||
    pageHasMask(r, graph) ||
    r.viewportImageRendering ||
    interactive ||
    hasPositionPreview ||
    sceneContentDependsOnOverlay(overlays) ||
    hasTransientPreviews(r, graph)
  return {
    requiresUncachedSceneRender,
    canUsePicture: canUseScenePicture(r, graph, sceneVersion, requiresUncachedSceneRender),
    cacheMissReason: interactive
      ? 'active-edit'
      : scenePictureMissReason(r, graph, overlays, sceneVersion, hasPositionPreview)
  }
}

const now = typeof performance !== 'undefined' ? () => performance.now() : () => 0

function measure<T>(fn: () => T): { value: T; duration: number } {
  const start = now()
  const value = fn()
  return { value, duration: now() - start }
}

/** Labels, editing overlays, and rulers; a previewing canvas keeps only the rulers' chrome pass. */
function drawAboveScene(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  selectedIds: Set<string>,
  overlays: RenderOverlays,
  sceneVersion: number
): void {
  canvas.save()
  canvas.scale(r.dpr, r.dpr)
  r.labelCache.update(graph, r.pageId, sceneVersion, graph.positionPreviewVersion)
  r.statusLabels = []
  if (!overlays.playing) drawLabelPass(r, canvas, graph, selectedIds, overlays)
  canvas.restore()

  canvas.save()
  canvas.scale(r.dpr, r.dpr)
  if (!overlays.playing) drawOverlayPass(r, canvas, graph, selectedIds, overlays)
  drawChromePass(r, canvas, graph, selectedIds, overlays)
  canvas.restore()
}

/** The canvas the scene draws on this frame, and the surface it presents through when it differs. */
function sceneSurfaceFor(
  r: SkiaRenderer,
  layer: RenderLayer
): { canvas: Canvas; documentSurface: Surface | null; screen: Canvas } {
  const screen = r.surface.getCanvas()
  if (layer === 'overlays') return { canvas: screen, documentSurface: null, screen }
  const documentSurface = documentSurfaceFor(r)
  return { canvas: documentSurface?.getCanvas() ?? screen, documentSurface, screen }
}

export function render(
  r: SkiaRenderer,
  graph: SceneGraph,
  selectedIds: Set<string>,
  overlays: RenderOverlays = {},
  sceneVersion = -1,
  layer: RenderLayer = 'full',
  interactive = false
): void {
  emitNavigationTrace('render:start', {
    layer,
    sceneVersion,
    panX: r.panX,
    panY: r.panY,
    zoom: r.zoom
  })
  r.syncFontGeneration()
  r.nodePaths.releaseUncached()
  const p = r.profiler
  p.beginFrame()
  p.setScenePictureDrawTime(0)
  p.setScenePictureRecordTime(0)
  p.setFlushTime(0)

  graph.clearAbsPosCache()

  r.useDocumentColorSpace(graph.documentColorSpace)
  const { canvas, documentSurface, screen } = sceneSurfaceFor(r, layer)
  if (layer === 'overlays') {
    canvas.clear(r.ck.Color4f(0, 0, 0, 0))
  } else {
    canvas.clear(r.ck.Color4f(r.pageColor.r, r.pageColor.g, r.pageColor.b, 1))
  }

  r.worldViewport = {
    x: -r.panX / r.zoom,
    y: -r.panY / r.zoom,
    w: r.viewportWidth / r.zoom,
    h: r.viewportHeight / r.zoom
  }
  updateSceneBackingPreviewState(r, layer)

  const { requiresUncachedSceneRender, canUsePicture, cacheMissReason } = getSceneRenderPolicy(
    r,
    graph,
    overlays,
    sceneVersion,
    interactive
  )

  if (layer !== 'overlays') {
    if (requiresUncachedSceneRender) {
      r.sceneBackingNeedsCrispRender = false
      r.tiledScenePending = false
    }
    canvas.save()
    canvas.scale(r.dpr, r.dpr)

    p.beginPhase('render:scene')
    let renderedScene = false
    if (layer === 'scene' && !requiresUncachedSceneRender && r.tiledSceneEnabled) {
      const backingPresented = renderSceneBacking(r, canvas, graph, sceneVersion)
      if (!backingPresented) {
        canvas.save()
        canvas.translate(r.panX, r.panY)
        canvas.scale(r.zoom, r.zoom)
        renderSceneContent(
          r,
          canvas,
          graph,
          overlays,
          sceneVersion,
          canUsePicture,
          cacheMissReason,
          requiresUncachedSceneRender
        )
        canvas.restore()
      }
      const tiled = r.tiledScene.renderFrame(r, canvas, graph, sceneVersion, r.navigationGeneration)
      r.tiledScenePending = tiled.pending
      r.tiledSceneCovered = tiled.covered
      renderedScene = true
      p.setScenePictureMode('hit', tiled.covered ? 'tiled' : 'tiled-fallback')
    }
    if (!renderedScene && layer === 'scene' && !requiresUncachedSceneRender) {
      const presentation = renderSceneBacking(r, canvas, graph, sceneVersion)
      if (presentation) {
        renderedScene = true
        p.setScenePictureMode('hit', presentation)
      }
    }
    if (!renderedScene) {
      canvas.translate(r.panX, r.panY)
      canvas.scale(r.zoom, r.zoom)
      renderSceneContent(
        r,
        canvas,
        graph,
        overlays,
        sceneVersion,
        canUsePicture,
        cacheMissReason,
        requiresUncachedSceneRender
      )
    }
    p.endPhase('render:scene')

    canvas.restore()
  }

  if (documentSurface) {
    documentSurface.flush()
    presentDocumentSurface(screen, documentSurface)
  }

  if (layer !== 'scene') drawAboveScene(r, screen, graph, selectedIds, overlays, sceneVersion)

  p.beginPhase('render:flush')
  const { duration: flushDuration } = measure(() => r.surface.flush())
  p.setFlushTime(flushDuration)
  p.endPhase('render:flush')

  p.setNodeCounts(r._nodeCount, r._culledCount)
  p.endFrame()
  emitNavigationTrace('render:end', {
    layer,
    sceneVersion,
    panX: r.panX,
    panY: r.panY,
    zoom: r.zoom,
    flushMs: flushDuration,
    nodes: r._nodeCount,
    culledNodes: r._culledCount,
    backingCrisp: !r.sceneBackingNeedsCrispRender
  })
}

function renderSceneContent(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  overlays: RenderOverlays,
  sceneVersion: number,
  canUsePicture: boolean,
  cacheMissReason: string,
  requiresUncachedSceneRender: boolean
): void {
  const p = r.profiler
  if (canUsePicture) {
    p.setScenePictureMode('hit')
    p.beginPhase('render:drawPicture')
    if (r.scenePicture) {
      const picture = r.scenePicture
      const { duration } = measure(() => canvas.drawPicture(picture))
      p.setScenePictureDrawTime(duration)
    }
    p.endPhase('render:drawPicture')
  } else if (requiresUncachedSceneRender) {
    p.setScenePictureMode('volatile', cacheMissReason)
    r._nodeCount = 0
    r._culledCount = 0
    p.beginPhase('render:volatile')
    renderPageChildren(r, canvas, graph, overlays)
    p.endPhase('render:volatile')
  } else {
    p.setScenePictureMode('record', cacheMissReason)
    r._nodeCount = 0
    r._culledCount = 0
    p.beginPhase('render:recordPicture')
    const { duration } = measure(() => recordScenePicture(r, canvas, graph, sceneVersion))
    p.setScenePictureRecordTime(duration)
    p.endPhase('render:recordPicture')
  }
}

function renderPageChildren(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  overlays: RenderOverlays
): void {
  const scope = r.sceneScopeId ? graph.getNode(r.sceneScopeId) : undefined
  if (scope) {
    const bounds = getAxisAlignedWorldBounds(scope, graph)
    canvas.save()
    canvas.clipRect(
      r.ck.LTRBRect(bounds.x, bounds.y, bounds.x + bounds.width, bounds.y + bounds.height),
      r.ck.ClipOp.Intersect,
      true
    )
    r.renderNode(canvas, graph, scope.id, overlays)
    canvas.restore()
    return
  }
  if (renderPageWithPreviews(r, canvas, graph, overlays)) return
  const pageNode = graph.getNode(r.pageId ?? graph.rootId)
  if (!pageNode) return
  renderChildIds(r, canvas, graph, pageNode.childIds, overlays, 0, 0, false)
}

function recordScenePicture(
  r: SkiaRenderer,
  canvas: Canvas,
  graph: SceneGraph,
  sceneVersion: number
): void {
  r.scenePicture?.delete()
  r.scenePicture = null
  const prevViewport = r.worldViewport
  r.worldViewport = { x: -1e6, y: -1e6, w: 2e6, h: 2e6 }
  const recorder = new r.ck.PictureRecorder()
  try {
    const pageNode = graph.getNode(r.pageId ?? graph.rootId)
    const sceneContentBounds = pageNode
      ? computeDescendantVisualBounds(
          pageNode.childIds,
          (id) => graph.getNode(id),
          (id) => graph.getAbsolutePosition(id)
        )
      : null
    const sceneBounds = sceneContentBounds
      ? {
          x: sceneContentBounds.minX,
          y: sceneContentBounds.minY,
          width: sceneContentBounds.maxX - sceneContentBounds.minX,
          height: sceneContentBounds.maxY - sceneContentBounds.minY
        }
      : { x: 0, y: 0, width: 1, height: 1 }
    const padding = 1024
    const bounds = r.ck.LTRBRect(
      sceneBounds.x - padding,
      sceneBounds.y - padding,
      sceneBounds.x + sceneBounds.width + padding,
      sceneBounds.y + sceneBounds.height + padding
    )
    const recCanvas = recorder.beginRecording(bounds)
    if (pageNode) {
      for (const childId of pageNode.childIds) {
        r.renderNode(recCanvas, graph, childId, {})
      }
    }
    r.scenePicture = recorder.finishRecordingAsPicture()
    r.scenePictureVersion = sceneVersion
    r.scenePictureFontGeneration = r.fontGeneration
    r.scenePicturePositionPreviewVersion = graph.positionPreviewVersion
    r.scenePicturePageId = r.pageId
    canvas.drawPicture(r.scenePicture)
  } finally {
    recorder.delete()
    r.worldViewport = prevViewport
  }
}
