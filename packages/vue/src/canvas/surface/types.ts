import type { EditorState } from '@pairdraw/core'
import type { RenderedPlayScene } from '@pairdraw/core/canvas'
import type { ViewportTransform } from '@pairdraw/core/geometry'
import type { Vector } from '@pairdraw/scene-graph/primitives'

import type { PresentationColorSpace } from '#vue/canvas/surface/color-space'

/**
 * Options for {@link useCanvas}.
 */
export type CanvasRenderLayer = 'full' | 'scene' | 'overlays'

export interface UseCanvasOptions {
  shouldSuspendRender?: () => boolean
  onPresented?: (versions: { renderVersion: number; sceneVersion: number }) => void
  /**
   * Selects which render layer this canvas owns.
   */
  layer?: CanvasRenderLayer
  /**
   * Enables the experimental tiled scene renderer for this surface.
   */
  sceneRenderer?: 'retained' | 'tiled'
  /**
   * The most device pixels this canvas draws per CSS pixel, read when the surface is created and
   * resized. A low-power canvas passes 1 so a high-density display draws a quarter of the pixels.
   */
  maxPixelRatio?: number
  /**
   * Draws expensive effects cheaply: background blurs and noise are left out, and cached
   * shadows keep one pixel per unit at any zoom.
   */
  reducedEffects?: boolean
  /**
   * Whether the person allows motion, which shader playback in a preview follows: without it a
   * shader keeps its still frame. Defaults to true.
   */
  animations?: () => boolean
  /**
   * Told once when a preview already plays the most shaders a page may. The app passes a warning
   * in development builds, so a release stays quiet.
   */
  warnShaderLimit?: (message: string) => void
  /**
   * Forces ruler visibility on or off for this canvas.
   *
   * When omitted, the composable falls back to viewport and URL-param logic.
   */
  showRulers?: boolean
  /**
   * Keeps the drawing buffer after presenting frames.
   *
   * Useful for screenshot or pixel-readback workflows, but may increase memory
   * usage depending on the browser and GPU backend.
   */
  preserveDrawingBuffer?: boolean
  /**
   * Called once the rendering surface is ready.
   */
  onReady?: () => void
  /**
   * Called instead of `onReady` when the surface cannot start, as when CanvasKit fails to
   * load. Without it the failure is left unhandled.
   */
  onFailed?: (error: unknown) => void
  /**
   * Reports the color space the canvas actually presents, including fallbacks, or null
   * when no surface could be configured.
   */
  onPresentation?: (colorSpace: PresentationColorSpace | null) => void
  /**
   * Supplies the view state rendered by this canvas. Defaults to `editor.state`.
   *
   * Multiple canvas surfaces can use independent view state while sharing one
   * document graph, history, and editor event bus.
   */
  getRenderState?: () => EditorState
  /**
   * The page layer this canvas shows on its own, with its descendants, clipped to it, as a
   * presentation shows only its slide. Null draws every layer of the page.
   */
  getSceneScope?: () => string | null
  /**
   * The top-level frames a playing prototype changed, which this canvas draws from their play
   * scenes instead of the document, by frame id. Null or absent draws the document.
   */
  getPlayScenes?: () => ReadonlyMap<string, RenderedPlayScene> | null
  /** How far a playing prototype scrolled each frame's content, by frame id. */
  getPlayScroll?: () => ReadonlyMap<string, Vector> | null
  /**
   * Called after each frame this canvas draws, with the pan and zoom it was drawn at. DOM laid
   * over the canvas, such as preview islands, follows these to stay in step with the drawing
   * instead of running ahead of it while the canvas is still catching up.
   */
  onFrame?: (view: ViewportTransform) => void
  /**
   * Receives this canvas surface's CSS viewport size after creation and resize.
   */
  onViewportResize?: (width: number, height: number) => void
  /**
   * Receives how far this canvas moved in the browser viewport when it was resized, as when a
   * panel beside it hides. Pan the view by as much the other way to keep the drawing still on
   * screen. Not called by default; on a page that scrolls, a move measured here includes scroll.
   */
  onViewportMove?: (dx: number, dy: number) => void
  /**
   * Runs when the browser takes this canvas's WebGL context away. A browser may never give a lost
   * context back, and drawing into the lost one leaves the canvas blank, so the host replaces the
   * canvas element and the surface is made again on the new one.
   */
  onContextLost?: () => void
  /**
   * A layer this canvas could not draw. The host records it; the renderer calls it once per
   * layer and error message.
   */
  onNodeDrawFailure?: (nodeId: string, error: unknown) => void
}
