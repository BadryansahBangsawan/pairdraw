import type { CanvasKit } from 'canvaskit-wasm'
import { onScopeDispose, watch } from 'vue'
import type { Ref } from 'vue'

import type { Editor } from '@pairdraw/core'
import { SkiaRenderer } from '@pairdraw/core/canvas'

import {
  supportsWideGamutPresentation,
  type PresentationColorSpace
} from '#vue/canvas/surface/color-space'
import {
  makeGLSurface,
  releaseWebGLContext,
  sizeCanvas,
  type CanvasGLContext,
  type CanvasGLHandle
} from '#vue/canvas/surface/gl-surface'
import { createImagePreviewDecoder } from '#vue/canvas/surface/image-preview'
import { useCanvasKitLoader } from '#vue/canvas/surface/kit-loader'
import { createCanvasRenderLoop } from '#vue/canvas/surface/render-loop'
import { useCanvasResizeObserver } from '#vue/canvas/surface/resize-observer'
import { createShaderRasterizer } from '#vue/canvas/surface/shader/rasterizer'
import type { UseCanvasOptions } from '#vue/canvas/surface/types'
import { editorMessages } from '#vue/i18n/messages/editor'

type SurfaceManagerState = {
  renderer: SkiaRenderer | null
  glContext: CanvasGLContext | null
  glHandle: CanvasGLHandle | null
  /** The canvas the WebGL context belongs to, kept until the context is released. */
  glCanvas: HTMLCanvasElement | null
  presentation: PresentationColorSpace | null
}

/** What a canvas asks of its renderer: its layer, renderer mode, pixel density, and effects. */
function applyRenderOptions(renderer: SkiaRenderer, options: UseCanvasOptions | undefined) {
  renderer.tracksSceneSettlement = options?.layer !== 'overlays'
  renderer.tiledSceneEnabled = options?.sceneRenderer === 'tiled'
  // The canvas buffer is sized for this ratio, so the renderer must draw at the same one.
  renderer.maxPixelRatio = options?.maxPixelRatio ?? Number.POSITIVE_INFINITY
  renderer.reducedEffects = options?.reducedEffects ?? false
  renderer.onNodeDrawFailure = options?.onNodeDrawFailure ?? null
}

/**
 * Shows only the scope layer the canvas asks for, or the whole page when it asks for none, with
 * the frames a playing prototype changed drawn from their play scenes.
 */
function applySceneScope(renderer: SkiaRenderer, options: UseCanvasOptions | undefined) {
  renderer.sceneScopeId = options?.getSceneScope?.() ?? null
  renderer.playScenes = options?.getPlayScenes?.() ?? null
}

export function createCanvasSurfaceManager({
  editor,
  canvasRef,
  options,
  getCanvasKit,
  isDestroyed,
  shouldShowRulers
}: {
  editor: Editor
  canvasRef: { value: HTMLCanvasElement | null }
  options: UseCanvasOptions | undefined
  getCanvasKit: () => CanvasKit | null
  isDestroyed: () => boolean
  shouldShowRulers: () => boolean
}) {
  const state: SurfaceManagerState = {
    renderer: null,
    glContext: null,
    glHandle: null,
    glCanvas: null,
    presentation: null
  }
  let sceneBackingRenderTimer: ReturnType<typeof setTimeout> | null = null

  // The scene of an editing canvas shows an empty sticky note's placeholder, and every layer an
  // empty connector label's while it is typed into, as the overlays draw the text being edited,
  // in the interface language, and draws them again when the language changes.
  const showsStickyPlaceholder = options?.layer !== 'overlays'
  let stickyPlaceholder: string = editorMessages.get().stickyPlaceholder
  let connectorLabelPlaceholder: string = editorMessages.get().connectorLabelPlaceholder
  const stopPlaceholders = editorMessages.subscribe((messages) => {
    if (
      messages.stickyPlaceholder === stickyPlaceholder &&
      messages.connectorLabelPlaceholder === connectorLabelPlaceholder
    ) {
      return
    }
    ;({ stickyPlaceholder, connectorLabelPlaceholder } = messages)
    if (!state.renderer) return
    showPlaceholders(state.renderer)
    editor.requestRender()
  })

  function showPlaceholders(renderer: SkiaRenderer) {
    renderer.connectorLabelPlaceholder = connectorLabelPlaceholder
    if (showsStickyPlaceholder) renderer.stickyPlaceholder = stickyPlaceholder
  }

  function clearSceneBackingRenderTimer() {
    if (sceneBackingRenderTimer === null) return
    clearTimeout(sceneBackingRenderTimer)
    sceneBackingRenderTimer = null
  }

  /** Releases the Skia context and the WebGL context CanvasKit registered for this canvas. */
  function releaseGLContext() {
    state.glContext?.delete()
    state.glContext = null
    const ck = getCanvasKit()
    if (ck && state.glHandle !== null) releaseWebGLContext(ck, state.glHandle, state.glCanvas)
    state.glHandle = null
    state.glCanvas = null
  }

  function createSurface(
    canvas: HTMLCanvasElement,
    { reloadFonts = false }: { reloadFonts?: boolean } = {}
  ): boolean {
    const ck = getCanvasKit()
    if (!ck) return false

    if (state.renderer) editor.removeCanvasRenderer(state.renderer)
    state.renderer?.destroy()
    state.renderer = null
    releaseGLContext()

    sizeCanvas(canvas, editor, options?.onViewportResize, options?.maxPixelRatio)

    const result = makeGLSurface(
      ck,
      canvas,
      options,
      state.glContext,
      editor.graph.documentColorSpace
    )
    state.glContext = result.glContext
    state.glHandle = result.glHandle
    state.glCanvas = result.glHandle === null ? null : canvas
    state.presentation = result.presentation
    options?.onPresentation?.(result.presentation)
    const surface = result.surface
    if (!surface) {
      canvas.dataset.surfaceError = 'webgl'
      return false
    }

    const glCtx = canvas.getContext('webgl2') ?? null
    state.renderer = new SkiaRenderer(ck, surface, glCtx)
    state.renderer.onImagePreviewReady = () => renderLoop.markDirty()
    state.renderer.imagePreviews.setDecoder(createImagePreviewDecoder())
    state.renderer.presentationColorSpace = result.presentation ?? 'srgb'
    applyRenderOptions(state.renderer, options)
    showPlaceholders(state.renderer)
    editor.setCanvasKit(ck, state.renderer)
    // The scene surface draws shader frames; an overlay surface has none to draw.
    if (options?.layer !== 'overlays' && !editor.hasShaderRasterizer())
      editor.setShaderRasterizer(createShaderRasterizer())
    canvas.dataset.ready = '1'

    // When the surface is recreated after a resize fallback, destroyRenderer
    // has cleared the module-level fontProvider — the new renderer must reload.
    // On initial mount, kit-loader.init() handles loadFonts, so skip here.
    if (reloadFonts && !isDestroyed()) {
      void state.renderer.loadFonts(renderNow).then(() => {
        if (!isDestroyed()) renderNow()
        return undefined
      })
    }
    return true
  }

  function acknowledgePresentation() {
    const renderedState = options?.getRenderState?.() ?? editor.state
    options?.onPresented?.({
      renderVersion: renderedState.renderVersion,
      sceneVersion: renderedState.sceneVersion
    })
  }

  function renderNow() {
    if (!state.renderer || isDestroyed()) return
    const view = options?.getRenderState?.() ?? editor.state
    applySceneScope(state.renderer, options)
    state.renderer.renderFromEditorState(
      view,
      editor.graph,
      editor.textEditor,
      canvasRef.value?.clientWidth ?? 0,
      canvasRef.value?.clientHeight ?? 0,
      shouldShowRulers(),
      options?.layer ?? 'full',
      editor.isInteractiveEditing()
    )
    renderLoop.markRendered()
    options?.onFrame?.({ panX: view.panX, panY: view.panY, zoom: view.zoom })
    acknowledgePresentation()
    clearSceneBackingRenderTimer()
    if (options?.layer === 'scene' && state.renderer.tiledScenePending) {
      renderLoop.markDirty()
    }
    if (options?.layer === 'scene' && state.renderer.sceneBackingNeedsCrispRender) {
      const delay = Math.max(0, state.renderer.sceneBackingPreviewUntil - performance.now())
      sceneBackingRenderTimer = setTimeout(() => renderLoop.markDirty(), delay)
    }
  }

  const renderLoop = createCanvasRenderLoop(editor, renderNow, {
    layer: options?.layer,
    getRenderState: options?.getRenderState,
    shouldSuspendRender: options?.shouldSuspendRender
  })

  function resizeCanvas(canvas: HTMLCanvasElement) {
    const ck = getCanvasKit()
    if (!ck || !state.renderer) {
      createSurface(canvas)
      return
    }

    sizeCanvas(canvas, editor, options?.onViewportResize, options?.maxPixelRatio)

    const result = makeGLSurface(
      ck,
      canvas,
      options,
      state.glContext,
      editor.graph.documentColorSpace
    )
    state.glContext = result.glContext
    state.presentation = result.presentation
    options?.onPresentation?.(result.presentation)
    const surface = result.surface
    if (!surface) {
      console.warn('Falling back to full surface recreation after resize')
      createSurface(canvas, { reloadFonts: true })
      return
    }
    state.renderer.presentationColorSpace = result.presentation ?? 'srgb'
    state.renderer.replaceSurface(surface)
    renderNow()
  }

  const wantsWideGamut = () =>
    editor.graph.documentColorSpace === 'display-p3' && supportsWideGamutPresentation()

  /** A P3 document needs the P3 surface, and vice versa; documents arrive after mount. */
  function refreshPresentation() {
    if (isDestroyed()) return
    const canvas = canvasRef.value
    if (!canvas) return
    if (wantsWideGamut() === (state.presentation === 'display-p3')) return
    createSurface(canvas, { reloadFonts: true })
  }

  const stopPresentationRefresh = editor.onEditorEvent('graph:replaced', refreshPresentation)
  const stopColorSpaceRefresh = editor.onEditorEvent(
    'document:color-space-changed',
    refreshPresentation
  )

  function destroy() {
    stopPlaceholders()
    stopPresentationRefresh()
    stopColorSpaceRefresh()
    clearSceneBackingRenderTimer()
    renderLoop.pause()
    if (state.renderer) editor.removeCanvasRenderer(state.renderer)
    state.renderer?.destroy()
    releaseGLContext()
  }

  return {
    createSurface,
    resizeCanvas,
    renderNow,
    destroy,
    markDirty: () => renderLoop.markDirty(),
    getRenderer: () => state.renderer,
    getPresentation: () => state.presentation
  }
}

/**
 * A browser takes a canvas's WebGL context away on a GPU reset, a driver update, or a tab that
 * comes back from sleep. Ignoring the events leaves the canvas blank for good: the loss is
 * prevented so the context can be given back. The app replaces the element, which starts again.
 * An SDK canvas keeps its element, so the surface is made again on that same element once the
 * browser gives the context back.
 */
function connectContextRecovery(
  canvasRef: Ref<HTMLCanvasElement | null>,
  lifecycle: { destroyed: boolean },
  onContextLost: (() => void) | undefined,
  recreateSurface: (canvas: HTMLCanvasElement) => void
): void {
  watch(
    canvasRef,
    (canvas, _previous, onCleanup) => {
      if (!canvas) return
      const onLost = (event: Event) => {
        // The host may replace the canvas, because a context the browser keeps lost can never be
        // drawn into again; a fresh element gets a fresh context.
        event.preventDefault()
        if (lifecycle.destroyed) return
        onContextLost?.()
      }
      const onRestored = () => {
        if (lifecycle.destroyed) return
        // A host that already swapped in a new element must not have the old one's restore
        // rebuild a surface for a canvas that is no longer shown.
        if (canvasRef.value !== canvas) return
        recreateSurface(canvas)
      }
      canvas.addEventListener('webglcontextlost', onLost)
      canvas.addEventListener('webglcontextrestored', onRestored)
      onCleanup(() => {
        canvas.removeEventListener('webglcontextlost', onLost)
        canvas.removeEventListener('webglcontextrestored', onRestored)
      })
    },
    { flush: 'post' }
  )
}

export function useCanvasSurfaceLifecycle({
  canvasRef,
  surface,
  setCanvasKit,
  getCanvasKitValue,
  lifecycle,
  onReady,
  onFailed,
  onContextLost,
  loadCanvasKit
}: {
  canvasRef: Ref<HTMLCanvasElement | null>
  surface: ReturnType<typeof createCanvasSurfaceManager>
  setCanvasKit: (ck: CanvasKit | null) => void
  getCanvasKitValue: () => CanvasKit | null
  lifecycle: { destroyed: boolean }
  onReady?: () => void
  onFailed?: (error: unknown) => void
  onContextLost?: () => void
  /** Loads CanvasKit. The canvas uses the shared loader; a test can pass a stand-in. */
  loadCanvasKit?: () => Promise<CanvasKit>
}) {
  useCanvasKitLoader({
    canvasRef,
    lifecycle,
    setCanvasKit,
    createSurface: surface.createSurface,
    loadFonts: () => surface.getRenderer()?.loadFonts(surface.renderNow),
    renderNow: surface.renderNow,
    onReady,
    onFailed,
    loadCanvasKit
  })

  connectContextRecovery(canvasRef, lifecycle, onContextLost, (canvas) => {
    surface.createSurface(canvas, { reloadFonts: true })
  })

  const { cancelResize } = useCanvasResizeObserver({
    canvasRef,
    getCanvasKitValue,
    resizeCanvas: surface.resizeCanvas
  })

  onScopeDispose(() => {
    lifecycle.destroyed = true
    cancelResize()
    surface.destroy()
  })
}
