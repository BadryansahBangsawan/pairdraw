import { useRafFn, watchThrottled } from '@vueuse/core'
import type { createRendererFromJSON } from 'shaders/core'
import { onScopeDispose, watch } from 'vue'

import {
  resolveEditorProfile,
  type Editor,
  type EditorProfileInputs,
  type EditorState
} from '@pairdraw/core'
import type { SkiaRenderer } from '@pairdraw/core/canvas'
import {
  presetAnimates,
  type ShaderEffectMotion,
  type ShaderPreset
} from '@pairdraw/scene-graph/shaders'

import { shaderFrames } from '#vue/canvas/surface/shader/frames'
import { onScreen, shadersOnPage, type PageShader } from '#vue/canvas/surface/shader/plan'
import { canDrawShaders } from '#vue/canvas/surface/shader/rasterizer'

/** The longest side a playing shader is drawn at, however large it is on screen. */
const MAX_PLAY_EDGE = 1024
/**
 * How long a frame may spend drawing shaders and handing them to the canvas. A browser where
 * that is slow, such as Safari, which copies each WebGPU canvas into WebGL synchronously, draws
 * as many as fit and the rest on the next frames, in turn, rather than stalling every frame.
 */
const FRAME_BUDGET_MS = 8
/** The least time between frames where each frame is copied. */
const COPY_FRAME_MS = 1000 / 30
/** How often what is on screen is checked while the view moves. */
const VIEW_CHECK_MS = 200
/** How much a shader's size on screen may change before it is drawn at the new size. */
const RESIZE_FACTOR = 1.5
/**
 * The most shaders a page plays at once. Each player is a WebGPU canvas, so a document of
 * hundreds of shader layers plays the ones on screen and stays within what a GPU can hold.
 */
const MAX_PLAYERS = 16

/** Whether this is a development build, read without tying the package to Vite's types. */
const DEVELOPMENT = (Reflect.get(import.meta, 'env') as { DEV?: boolean } | undefined)?.DEV === true

/** What a canvas is playing, for tests and diagnostics that read it from the page. */
export interface ShaderPlaybackStats {
  /** Players that exist: one per shader image, on screen or kept for when it scrolls back. */
  players: number
  /** Players on screen after the last sync, which are the ones the frame loop draws. */
  visible: number
  /** Whether the frame loop runs at all. */
  running: boolean
  /** Shader frames drawn so far, one per player per step, which stops when nothing is visible. */
  frames: number
}

const playbackStats = new WeakMap<Editor, ShaderPlaybackStats>()

/** What `editor`'s canvas is playing, or null while it plays no shaders. */
export function shaderPlaybackStats(editor: Editor): ShaderPlaybackStats | null {
  return playbackStats.get(editor) ?? null
}

/** A shader playing on its own WebGPU canvas, shown wherever its image is painted. */
interface Player {
  preset: string
  nodeIds: Set<string>
  canvas: HTMLCanvasElement
  renderer: ReturnType<typeof createRendererFromJSON> | null
  /** Whether it is on screen, the only time it draws. */
  visible: boolean
  disposed: boolean
  /** The copy of its last frame shown, where frames are copied, closed when the next replaces it. */
  copied: ImageBitmap | null
  /** When it last drew, so its clock advances by the time since then however often it draws. */
  drawnAt: number
  /** How far its animation has run, in seconds, so a player that replaces it goes on from there. */
  elapsed: number
}

/**
 * Plays the shader paints on screen while the editor previews a page: each runs on a WebGPU
 * canvas at about its size on screen, and its frames replace the still frame wherever the canvas
 * paints that image, so the layers above, masks, and clipping draw as usual. A shader scrolled
 * out of view pauses; leaving preview shows the still frames again. Without WebGPU the still
 * frames stay.
 */
export function useShaderPlayback(options: {
  editor: Editor
  getRenderer: () => SkiaRenderer | null
  /** The view this canvas draws: its pan, zoom, page, and whether it previews. */
  getView: () => Pick<EditorState, 'panX' | 'panY' | 'zoom' | 'currentPageId'> & EditorProfileInputs
  getViewport: () => { width: number; height: number }
  markDirty: () => void
  /**
   * Whether the person allows motion. Without it, a page's shaders keep their still frames, and
   * playing them is a choice they can turn off.
   */
  getAnimations?: () => boolean
  /**
   * The device pixels the canvas draws per CSS pixel, which may be capped below the display's;
   * shaders play at that density too. The display's ratio by default.
   */
  getPixelRatio?: () => number
}) {
  const { editor, getRenderer, getView, getViewport, markDirty } = options
  const pixelRatio = options.getPixelRatio ?? (() => window.devicePixelRatio || 1)
  const frames = shaderFrames(editor)
  const players = new Map<string, Player>()
  /** Players starting at a new size beside the ones they replace, by image. */
  const replacing = new Map<string, Player>()
  /**
   * Sizes a replacement failed to start at, by image, with the preset it was for. The player it
   * would have replaced plays on, and no replacement is tried again near that size until the
   * preset changes or the view moves well away from it.
   */
  const failedSizes = new Map<string, { preset: string; size: { width: number; height: number } }>()
  /** Shaders that failed to start, by the preset that failed, which are not tried again. */
  const failed = new Map<string, string>()
  /** Renderers to let go of once the frame being drawn is done with them. */
  const retired: Player[] = []
  /**
   * What the library says of each effect's motion, by name. Loading it is deferred until a page
   * draws a shader; until then a preset is played, as it always was.
   */
  let motions: Map<string, ShaderEffectMotion> | null = null
  let last = 0
  let stepping = false
  /** Where the next frame starts drawing, when the last one ran out of time. */
  let turn = 0
  /** Whether this browser needs each frame copied before the canvas can show it. */
  let copyFrames = false
  /** Shader frames drawn since the canvas started, which the stats report. */
  let framesDrawn = 0
  /** Players the last sync left on screen. */
  let shownPlayers = 0
  /** Whether the page was told once that it plays the most shaders it may. */
  let warnedFull = false

  /** Records what this canvas is playing, which tests and diagnostics read from the page. */
  function report() {
    playbackStats.set(editor, {
      players: players.size,
      visible: shownPlayers,
      running: shownPlayers > 0,
      frames: framesDrawn
    })
  }

  let loadingMotions = false

  /**
   * Reads the library's motion metadata, once, the first time a page draws a preset shader: a
   * document with no shaders never downloads it.
   */
  function loadMotions() {
    if (motions !== null || loadingMotions) return
    loadingMotions = true
    void import('shaders/registry')
      .then(({ getAllShaders }) => {
        const known = new Map<string, ShaderEffectMotion>()
        for (const entry of getAllShaders()) {
          const { name, definition } = entry as {
            name?: unknown
            definition?: { animatedTime?: unknown; props?: Record<string, unknown> }
          }
          if (typeof name !== 'string') continue
          known.set(name, {
            animates: definition?.animatedTime !== undefined,
            speed: definition?.props?.speed !== undefined
          })
        }
        motions = known
        sync()
        return undefined
      })
      .catch(() => {
        loadingMotions = false
      })
  }

  /** Whether `preset` draws a new picture from one frame to the next. */
  function animates(preset: ShaderPreset): boolean {
    if (motions === null) return true
    return presetAnimates(preset, (type) => motions?.get(type))
  }


  function release() {
    for (const player of retired.splice(0)) {
      player.renderer?.dispose()
      player.copied?.close()
    }
  }

  function stop(hash: string) {
    failedSizes.delete(hash)
    const replacement = replacing.get(hash)
    if (replacement) {
      replacement.disposed = true
      replacing.delete(hash)
    }
    const player = players.get(hash)
    if (!player) return
    player.disposed = true
    players.delete(hash)
    getRenderer()?.setLiveImage(hash, null, player.nodeIds)
    retired.push(player)
    if (!stepping) release()
  }

  /** How many pixels a shader painted over `bounds` covers on screen, at most. */
  function screenSize(bounds: Rect[]): { width: number; height: number } {
    const scale = getView().zoom * pixelRatio()
    const width = Math.max(...bounds.map((rect) => rect.width)) * scale
    const height = Math.max(...bounds.map((rect) => rect.height)) * scale
    const fit = Math.min(1, MAX_PLAY_EDGE / Math.max(width, height, 1))
    return {
      width: Math.max(1, Math.round(width * fit)),
      height: Math.max(1, Math.round(height * fit))
    }
  }

  /** Whether any layer painting a shader is in view, so it is worth drawing. */
  function shown(bounds: Rect[]): boolean {
    return onScreen(bounds, getView(), getViewport())
  }

  /**
   * Makes room for one more player, by letting go of one that is off screen. False when the page
   * already plays the most it may.
   */
  function makeRoom() {
    if (players.size < MAX_PLAYERS) return true
    for (const [hash, player] of players) {
      if (!player.visible) {
        stop(hash)
        return true
      }
    }
    if (DEVELOPMENT && !warnedFull) {
      warnedFull = true
      console.warn(`A page plays at most ${MAX_PLAYERS} shaders; the rest keep their still frames.`)
    }
    return false
  }

  /**
   * Starts playing `hash`'s shader at `size`. A player that `replaces` one already playing, at
   * another size, starts beside it: the old one keeps drawing until the new one is ready, and the
   * new one takes over at the same point in the animation, so a zoom neither flashes the still
   * frame nor starts the animation over.
   */
  async function start(
    hash: string,
    preset: ShaderPreset,
    size: { width: number; height: number },
    replaces?: Player
  ) {
    const canvas = document.createElement('canvas')
    // The renderer sizes its buffer at the device pixel ratio itself.
    const ratio = window.devicePixelRatio || 1
    canvas.width = Math.max(1, Math.round(size.width / ratio))
    canvas.height = Math.max(1, Math.round(size.height / ratio))
    const player: Player = {
      preset: JSON.stringify(preset),
      nodeIds: new Set(),
      canvas,
      renderer: null,
      visible: true,
      disposed: false,
      copied: null,
      drawnAt: 0,
      elapsed: 0
    }
    if (replaces) replacing.set(hash, player)
    else players.set(hash, player)
    // Read through a call: the player may be stopped while the library loads.
    const stopped = () => player.disposed
    let renderer: Player['renderer'] = null
    try {
      const shaders = await import('shaders/core')
      if (stopped()) return
      renderer = shaders.createRendererFromJSON(structuredClone(preset))
      await renderer.initialize(canvas)
    } catch (error) {
      // A shader that cannot play keeps its still frame until its preset changes. A newer
      // player that replaced this one while it started is left alone.
      console.warn('Could not play a shader', error)
      renderer?.dispose()
      // A replacement that fails leaves the player it would have replaced playing.
      if (replacing.get(hash) === player) {
        replacing.delete(hash)
        failedSizes.set(hash, { preset: player.preset, size })
      } else if (players.get(hash) === player) {
        stop(hash)
        failed.set(hash, player.preset)
      }
      return
    }
    if (stopped()) {
      renderer.dispose()
      return
    }
    player.renderer = renderer
    if (replacing.get(hash) !== player) return
    replacing.delete(hash)
    const previous = players.get(hash)
    // The one it replaces may have stopped meanwhile, as when preview ended; then so does this.
    if (!previous || previous !== replaces) {
      player.disposed = true
      retired.push(player)
      if (!stepping) release()
      return
    }
    player.nodeIds = previous.nodeIds
    player.visible = previous.visible
    // The old player kept drawing while this one started, so it takes over from there.
    player.elapsed = previous.elapsed
    players.set(hash, player)
    // Its frame replaces the old one's at the next draw, so the canvas never shows the still.
    previous.disposed = true
    retired.push(previous)
    if (!stepping) release()
  }

  /** Whether a player drawing at `canvas`'s size should be redrawn at `size` instead. */
  /** Whether `size` is far enough from `from`, in pixels, to draw at again. */
  function differs(from: number, size: { width: number; height: number }) {
    const factor = size.width / Math.max(1, from)
    return factor > RESIZE_FACTOR || factor < 1 / RESIZE_FACTOR
  }

  function resized(canvas: HTMLCanvasElement, size: { width: number; height: number }) {
    // The library scales the canvas by the display's ratio, so this is the buffer `start` asked for.
    return differs(canvas.width * (window.devicePixelRatio || 1), size)
  }

  /** Whether a replacement for `hash` failed at about `size`, for the preset it plays now. */
  function failedNear(hash: string, preset: string, size: { width: number; height: number }) {
    const failure = failedSizes.get(hash)
    if (!failure) return false
    if (failure.preset === preset && !differs(failure.size.width, size)) return true
    failedSizes.delete(hash)
    return false
  }

  /** The shaders a page should play: the ones in preview that draw a new picture each frame. */
  function wantedShaders(playing: boolean, pageId: string): Map<string, PageShader> {
    if (!playing) return new Map()
    const wanted = shadersOnPage(editor.graph, pageId)
    if (wanted.size > 0) loadMotions()
    for (const [hash, shader] of wanted) {
      // A shader that draws one picture forever keeps its still frame, which is that picture.
      if (!animates(shader.preset)) wanted.delete(hash)
    }
    return wanted
  }

  /** Starts, resizes, or retires the players that draw `wanted`, and marks the ones on screen. */
  function placePlayers(wanted: Map<string, PageShader>) {
    for (const [hash, player] of players) {
      const shader = wanted.get(hash)
      if (!shader || JSON.stringify(shader.preset) !== player.preset) stop(hash)
    }
    for (const [hash, shader] of wanted) {
      if (failed.get(hash) !== JSON.stringify(shader.preset)) failed.delete(hash)
      const visible = shown(shader.bounds)
      const size = screenSize(shader.bounds)
      const existing = players.get(hash)
      if (
        existing &&
        visible &&
        !replacing.has(hash) &&
        resized(existing.canvas, size) &&
        !failedNear(hash, existing.preset, size)
      ) {
        void start(hash, shader.preset, size, existing)
      }
      if (!players.has(hash) && visible && !failed.has(hash) && makeRoom()) {
        void start(hash, shader.preset, size)
      }
      const player = players.get(hash)
      if (!player) continue
      player.nodeIds = shader.nodeIds
      player.visible = visible
    }
  }

  function sync() {
    const view = getView()
    const playing =
      (options.getAnimations?.() ?? true) &&
      resolveEditorProfile(view).live !== null &&
      canDrawShaders()
    placePlayers(wantedShaders(playing, view.currentPageId))
    // Only a player on screen draws, so none on screen is nothing to animate.
    shownPlayers = [...players.values()].filter((player) => player.visible).length
    if (shownPlayers > 0) resume()
    else {
      pause()
      last = 0
    }
    report()
  }

  const { pause, resume } = useRafFn(
    ({ timestamp }) => {
      if (stepping || (copyFrames && last !== 0 && timestamp - last < COPY_FRAME_MS)) return
      last = timestamp
      stepping = true
      void step(timestamp).finally(() => {
        stepping = false
        release()
      })
    },
    { immediate: false }
  )

  /**
   * Draws every visible shader and shows its frame. The WebGPU canvas itself is uploaded right
   * after drawing, in the same task, since it keeps its frame only until that task ends. A
   * browser that cannot upload a WebGPU canvas gets a copy of each frame instead, which costs a
   * readback, so frames then come at most every `COPY_FRAME_MS`.
   */
  async function step(now: number) {
    const renderer = getRenderer()
    if (!renderer) return
    const copies: Promise<{ hash: string; player: Player; frame: ImageBitmap }>[] = []
    let drew = false
    const drawing = [...players].filter(([, player]) => player.visible && player.renderer)
    const started = performance.now()
    for (let index = 0; index < drawing.length; index++) {
      const [hash, player] = drawing[(turn + index) % drawing.length]
      // A player's first frame jumps to where the one it replaced had got to.
      const delta = player.drawnAt === 0 ? player.elapsed : (now - player.drawnAt) / 1000
      if (player.drawnAt !== 0) player.elapsed += delta
      player.drawnAt = now
      await player.renderer?.renderFrame({ deltaSeconds: delta, waitForGpu: false })
      if (player.disposed) continue
      framesDrawn += 1
      report()
      // Preview's islands draw their shader layers from this frame, in this same task.
      frames.publish(hash, player.canvas)
      if (!copyFrames && uploads(renderer, hash, player)) drew = true
      else {
        copyFrames = true
        copies.push(createImageBitmap(player.canvas).then((frame) => ({ hash, player, frame })))
      }
      // The next frame starts with the shaders this one had no time for.
      if (performance.now() - started > FRAME_BUDGET_MS) {
        turn = (turn + index + 1) % drawing.length
        break
      }
    }
    for (const { hash, player, frame } of await Promise.all(copies)) {
      if (player.disposed) {
        frame.close()
        continue
      }
      renderer.setLiveImage(hash, frame, player.nodeIds)
      player.copied?.close()
      player.copied = frame
      drew = true
    }
    if (drew) markDirty()
  }

  /** Whether the canvas shows `player`'s WebGPU canvas uploaded as it is. */
  function uploads(renderer: SkiaRenderer, hash: string, player: Player): boolean {
    try {
      return renderer.setLiveImage(hash, player.canvas, player.nodeIds)
    } catch {
      return false
    }
  }

  watch(
    () => [
      resolveEditorProfile(getView()).live !== null,
      getView().currentPageId,
      editor.state.sceneVersion,
      options.getAnimations?.() ?? true
    ],
    sync,
    {
      immediate: true
    }
  )
  // The view moving or the canvas resizing, as it does when preview hides the panels, changes
  // what is on screen.
  watchThrottled(
    () => [
      getView().panX,
      getView().panY,
      getView().zoom,
      getViewport().width,
      getViewport().height
    ],
    sync,
    { throttle: VIEW_CHECK_MS }
  )

  /**
   * A hidden tab draws nothing, so its players are let go of rather than left running; coming
   * back starts them again. A browser already stops animation frames for a hidden tab; stopping
   * the players too gives the GPU and their memory back.
   */
  function onVisibilityChange() {
    if (document.visibilityState === 'hidden') {
      for (const hash of Array.from(players.keys())) stop(hash)
    } else {
      sync()
    }
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibilityChange)
  }

  onScopeDispose(() => {
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
    pause()
    for (const hash of Array.from(players.keys())) stop(hash)
    release()
  })
}
