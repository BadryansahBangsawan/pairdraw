import { parseEmbedParams, type EmbedParams } from '@/app/embed/params'
import { appPreferences, type CanvasRenderingMode } from '@/app/settings/preferences/store'
import { IS_BROWSER } from '@/constants'

export type SceneRendererMode = CanvasRenderingMode
type CollaborationTransportMode = 'default' | 'test'

/** Ultralight mode draws at most one device pixel per CSS pixel. */
const ULTRALIGHT_MAX_PIXEL_RATIO = 1

export interface AppRuntimeConfig {
  test: boolean
  navigationBenchmark: boolean
  recentFiles: boolean
  showChrome: boolean
  showRulers: boolean
  sceneRenderer: SceneRendererMode
  sceneRendererOverride: boolean
  /** Ultralight mode as this session started; changing it applies after a reload. */
  ultralight: boolean
  /** The most device pixels the canvas draws per CSS pixel, or none to follow the display. */
  maxPixelRatio: number | undefined
  /** The canvas draws background blurs, noise, and zoomed shadows cheaply. */
  reducedEffects: boolean
  collaborationTransport: CollaborationTransportMode
  collaborationRelayURL: string | null
  /**
   * Viewport changes such as zoom to fit glide, where animations play; a test run keeps them
   * instant unless its URL asks for `viewport-motion`.
   */
  viewportMotion: boolean
  /**
   * New documents keep their changes as drafts on this device; a test run starts without them,
   * so a new document stays unsaved, unless its URL asks for `drafts`.
   */
  drafts: boolean
  /**
   * The window is embedded in a host page through `?embed`: chrome hides unless the URL asks for
   * `chrome`, and nothing is kept as a draft, since the host owns the document.
   */
  embed: EmbedParams | null
}

/**
 * Reads the session's flags from the URL over the saved preferences. Ultralight mode renders in
 * tiles, at most one device pixel per CSS pixel, with cheaper effects; a `renderer` URL override
 * still picks the renderer.
 */
export function parseAppRuntimeConfig(
  search: string,
  preferredRenderer: SceneRendererMode = 'retained',
  ultralight = false
): AppRuntimeConfig {
  const params = new URLSearchParams(search)
  const renderer = params.get('renderer')
  const preferred: SceneRendererMode = ultralight ? 'tiled' : preferredRenderer
  const sceneRenderer = renderer === 'tiled' || renderer === 'retained' ? renderer : preferred
  const embed = parseEmbedParams(search)
  return {
    test: params.has('test'),
    navigationBenchmark: params.has('navigation-benchmark'),
    recentFiles: params.has('recent-files'),
    showChrome: embed ? embed.chrome : !params.has('no-chrome'),
    showRulers: !params.has('no-rulers'),
    sceneRenderer,
    sceneRendererOverride: renderer === 'tiled' || renderer === 'retained',
    ultralight,
    maxPixelRatio: ultralight ? ULTRALIGHT_MAX_PIXEL_RATIO : undefined,
    reducedEffects: ultralight,
    collaborationTransport: params.get('collabTransport') === 'test' ? 'test' : 'default',
    collaborationRelayURL: params.get('collabRelay'),
    viewportMotion: !params.has('test') || params.has('viewport-motion'),
    drafts: !embed && (!params.has('test') || params.has('drafts')),
    embed
  }
}

export const appRuntimeConfig = parseAppRuntimeConfig(
  IS_BROWSER ? window.location.search : '',
  appPreferences.value.rendering.canvasMode,
  appPreferences.value.rendering.ultralight
)
